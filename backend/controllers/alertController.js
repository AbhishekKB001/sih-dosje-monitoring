const prisma = require("../config/database");
const { logAudit, ACTIONS } = require("../utils/auditLogger");

async function getAlerts(req, res, next) {
    try {
        const { projectId, cameraId, riskLevel, status, search } = req.query;

        const where = {};
        if (projectId) where.projectId = Number(projectId);
        if (cameraId) where.cameraId = Number(cameraId);
        if (riskLevel) where.riskLevel = riskLevel;
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { alertCode: { contains: search, mode: "insensitive" } },
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ];
        }

        const alerts = await prisma.alert.findMany({
            where,
            include: {
                project: {
                    select: { id: true, projectCode: true, name: true, district: true, state: true },
                },
                camera: {
                    select: { id: true, cameraCode: true, name: true, location: true },
                },
                detection: {
                    select: { id: true, detectedAt: true, objects: true, confidence: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return res.json({
            success: true,
            count: alerts.length,
            alerts,
        });
    } catch (error) {
        next(error);
    }
}

async function getAlertById(req, res, next) {
    try {
        const alertId = Number(req.params.id);
        if (Number.isNaN(alertId)) {
            return res.status(400).json({ success: false, message: "Invalid alert ID" });
        }

        const alert = await prisma.alert.findUnique({
            where: { id: alertId },
            include: {
                project: true,
                camera: true,
                detection: true,
                createdBy: {
                    select: { id: true, name: true, email: true, role: true },
                },
            },
        });

        if (!alert) {
            return res.status(404).json({ success: false, message: "Alert not found" });
        }

        return res.json({
            success: true,
            alert,
        });
    } catch (error) {
        next(error);
    }
}

async function createAlert(req, res, next) {
    try {
        const {
            alertCode,
            projectId,
            cameraId,
            aiDetectionId,
            title,
            description,
            riskLevel,
            status,
        } = req.body;

        // Check project exists
        const project = await prisma.project.findUnique({
            where: { id: Number(projectId) },
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: `Project with ID ${projectId} not found`,
            });
        }

        // Check camera exists if provided
        if (cameraId) {
            const camera = await prisma.camera.findUnique({
                where: { id: Number(cameraId) },
            });
            if (!camera) {
                return res.status(404).json({
                    success: false,
                    message: `Camera with ID ${cameraId} not found`,
                });
            }
        }

        // Check AI detection exists if provided
        if (aiDetectionId) {
            const detection = await prisma.aIDetection.findUnique({
                where: { id: Number(aiDetectionId) },
            });
            if (!detection) {
                return res.status(404).json({
                    success: false,
                    message: `AI detection with ID ${aiDetectionId} not found`,
                });
            }
        }

        // Duplicate alertCode check
        const existingAlert = await prisma.alert.findUnique({
            where: { alertCode },
        });

        if (existingAlert) {
            return res.status(409).json({
                success: false,
                message: "Alert with this alertCode already exists",
            });
        }

        const alert = await prisma.alert.create({
            data: {
                alertCode,
                projectId: Number(projectId),
                cameraId: cameraId ? Number(cameraId) : null,
                aiDetectionId: aiDetectionId ? Number(aiDetectionId) : null,
                title,
                description: description || null,
                riskLevel: riskLevel || "MEDIUM",
                status: status || "ACTIVE",
                createdById: req.user?.userId || null,
            },
        });

        // Trigger notifications for HIGH or CRITICAL alerts
        if (alert.riskLevel === "HIGH" || alert.riskLevel === "CRITICAL") {
            try {
                // Find users to notify (Admins or users associated with this project)
                const adminUsers = await prisma.user.findMany({
                    where: { role: "ADMIN", status: "ACTIVE" },
                    select: { id: true },
                });

                if (adminUsers.length > 0) {
                    await prisma.notification.createMany({
                        data: adminUsers.map((u) => ({
                            userId: u.id,
                            title: `[${alert.riskLevel}] ${alert.title}`,
                            message: `Alert ${alert.alertCode} triggered at ${project.name}: ${alert.description || alert.title}`,
                            type: "ALERT",
                            projectId: project.id,
                            alertId: alert.id,
                        })),
                    });
                }
            } catch (notifErr) {
                console.error("Auto-notification error:", notifErr.message);
            }
        }

        await logAudit({
            userId: req.user?.userId,
            projectId: alert.projectId,
            action: ACTIONS.CREATE_ALERT,
            details: { alertId: alert.id, alertCode: alert.alertCode, riskLevel: alert.riskLevel },
            req,
        });

        return res.status(201).json({
            success: true,
            message: "Alert created successfully",
            alert,
        });
    } catch (error) {
        next(error);
    }
}

async function updateAlertStatus(req, res, next) {
    try {
        const alertId = Number(req.params.id);
        if (Number.isNaN(alertId)) {
            return res.status(400).json({ success: false, message: "Invalid alert ID" });
        }

        const { status } = req.body;
        if (!status || !["ACTIVE", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be ACTIVE, ACKNOWLEDGED, RESOLVED, or DISMISSED",
            });
        }

        const existingAlert = await prisma.alert.findUnique({
            where: { id: alertId },
        });

        if (!existingAlert) {
            return res.status(404).json({ success: false, message: "Alert not found" });
        }

        const resolvedAt = status === "RESOLVED" ? new Date() : (existingAlert.status === "RESOLVED" && status !== "RESOLVED" ? null : existingAlert.resolvedAt);

        const updatedAlert = await prisma.alert.update({
            where: { id: alertId },
            data: {
                status,
                resolvedAt,
            },
        });

        await logAudit({
            userId: req.user?.userId,
            projectId: updatedAlert.projectId,
            action: ACTIONS.UPDATE_ALERT,
            details: { alertId, previousStatus: existingAlert.status, newStatus: status },
            req,
        });

        return res.json({
            success: true,
            message: `Alert status updated to ${status}`,
            alert: updatedAlert,
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getAlerts,
    getAlertById,
    createAlert,
    updateAlertStatus,
};
