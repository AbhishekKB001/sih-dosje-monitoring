const prisma = require("../config/database");
const { logAudit, ACTIONS } = require("../utils/auditLogger");

async function getInspections(req, res, next) {
    try {
        const { projectId, inspectorId, status, type } = req.query;

        const where = {};
        if (projectId) where.projectId = Number(projectId);
        if (status) where.status = status;
        if (type) where.type = type;

        // If user is INSPECTOR and not ADMIN/PROJECT_INCHARGE, only show their assigned inspections
        if (req.user.role === "INSPECTOR") {
            where.inspectorId = req.user.userId;
        } else if (inspectorId) {
            where.inspectorId = Number(inspectorId);
        }

        const inspections = await prisma.inspection.findMany({
            where,
            include: {
                project: {
                    select: { id: true, projectCode: true, name: true, district: true, state: true },
                },
                inspector: {
                    select: { id: true, name: true, email: true, phone: true },
                },
                report: {
                    select: { id: true, submittedAt: true },
                },
                _count: {
                    select: { files: true, vcSessions: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return res.json({
            success: true,
            count: inspections.length,
            inspections,
        });
    } catch (error) {
        next(error);
    }
}

async function getInspectionById(req, res, next) {
    try {
        const inspectionId = Number(req.params.id);
        if (Number.isNaN(inspectionId)) {
            return res.status(400).json({ success: false, message: "Invalid inspection ID" });
        }

        const inspection = await prisma.inspection.findUnique({
            where: { id: inspectionId },
            include: {
                project: true,
                inspector: {
                    select: { id: true, name: true, email: true, phone: true, role: true },
                },
                report: true,
                files: {
                    include: {
                        uploadedBy: {
                            select: { id: true, name: true, email: true },
                        },
                    },
                },
                vcSessions: {
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        if (!inspection) {
            return res.status(404).json({ success: false, message: "Inspection not found" });
        }

        return res.json({
            success: true,
            inspection,
        });
    } catch (error) {
        next(error);
    }
}

async function createInspection(req, res, next) {
    try {
        const { projectId, inspectorId, type, scheduledDate, remarks, status } = req.body;

        const project = await prisma.project.findUnique({
            where: { id: Number(projectId) },
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: `Project with ID ${projectId} not found`,
            });
        }

        const inspector = await prisma.user.findUnique({
            where: { id: Number(inspectorId) },
        });

        if (!inspector) {
            return res.status(404).json({
                success: false,
                message: `Inspector with ID ${inspectorId} not found`,
            });
        }

        if (inspector.role !== "INSPECTOR" && inspector.role !== "ADMIN") {
            return res.status(400).json({
                success: false,
                message: `Assigned user (ID: ${inspectorId}) does not have an INSPECTOR role (current role: ${inspector.role})`,
            });
        }

        const parsedScheduledDate = scheduledDate ? new Date(scheduledDate) : null;

        const inspection = await prisma.inspection.create({
            data: {
                projectId: Number(projectId),
                inspectorId: Number(inspectorId),
                type,
                scheduledDate: parsedScheduledDate,
                remarks: remarks || null,
                status: status || "ASSIGNED",
            },
            include: {
                project: { select: { id: true, projectCode: true, name: true } },
                inspector: { select: { id: true, name: true, email: true } },
            },
        });

        // Notify inspector
        try {
            await prisma.notification.create({
                data: {
                    userId: inspector.id,
                    title: "New Inspection Assigned",
                    message: `You have been assigned a ${inspection.type} inspection for project: ${project.name} (${project.projectCode})`,
                    type: "INSPECTION",
                    projectId: project.id,
                },
            });
        } catch (notifErr) {
            console.error("Inspector notification error:", notifErr.message);
        }

        await logAudit({
            userId: req.user?.userId,
            projectId: inspection.projectId,
            action: ACTIONS.CREATE_INSPECTION,
            details: { inspectionId: inspection.id, inspectorId: inspector.id, type: inspection.type },
            req,
        });

        return res.status(201).json({
            success: true,
            message: "Inspection created successfully",
            inspection,
        });
    } catch (error) {
        next(error);
    }
}

async function updateInspection(req, res, next) {
    try {
        const inspectionId = Number(req.params.id);
        if (Number.isNaN(inspectionId)) {
            return res.status(400).json({ success: false, message: "Invalid inspection ID" });
        }

        const existingInspection = await prisma.inspection.findUnique({
            where: { id: inspectionId },
        });

        if (!existingInspection) {
            return res.status(404).json({ success: false, message: "Inspection not found" });
        }

        const { projectId, inspectorId, type, scheduledDate, remarks } = req.body;
        const updateData = {};

        if (projectId !== undefined) updateData.projectId = Number(projectId);
        if (type !== undefined) updateData.type = type;
        if (scheduledDate !== undefined) updateData.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
        if (remarks !== undefined) updateData.remarks = remarks;

        if (inspectorId !== undefined) {
            const inspector = await prisma.user.findUnique({ where: { id: Number(inspectorId) } });
            if (!inspector) {
                return res.status(404).json({ success: false, message: "Inspector user not found" });
            }
            updateData.inspectorId = Number(inspectorId);
        }

        const updatedInspection = await prisma.inspection.update({
            where: { id: inspectionId },
            data: updateData,
            include: {
                project: { select: { id: true, projectCode: true, name: true } },
                inspector: { select: { id: true, name: true, email: true } },
            },
        });

        await logAudit({
            userId: req.user?.userId,
            projectId: updatedInspection.projectId,
            action: ACTIONS.UPDATE_INSPECTION,
            details: { inspectionId, updatedFields: Object.keys(updateData) },
            req,
        });

        return res.json({
            success: true,
            message: "Inspection updated successfully",
            inspection: updatedInspection,
        });
    } catch (error) {
        next(error);
    }
}

async function updateInspectionStatus(req, res, next) {
    try {
        const inspectionId = Number(req.params.id);
        if (Number.isNaN(inspectionId)) {
            return res.status(400).json({ success: false, message: "Invalid inspection ID" });
        }

        const { status } = req.body;
        if (!status || !["ASSIGNED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be ASSIGNED, SCHEDULED, IN_PROGRESS, COMPLETED, or CANCELLED",
            });
        }

        const existingInspection = await prisma.inspection.findUnique({
            where: { id: inspectionId },
        });

        if (!existingInspection) {
            return res.status(404).json({ success: false, message: "Inspection not found" });
        }

        // Calculate completedAt
        let completedAt = existingInspection.completedAt;
        if (status === "COMPLETED") {
            completedAt = new Date();
        } else if (existingInspection.status === "COMPLETED" && status !== "COMPLETED") {
            completedAt = null;
        }

        const updatedInspection = await prisma.inspection.update({
            where: { id: inspectionId },
            data: {
                status,
                completedAt,
            },
        });

        const action = status === "COMPLETED" ? ACTIONS.COMPLETE_INSPECTION : ACTIONS.UPDATE_INSPECTION;
        await logAudit({
            userId: req.user?.userId,
            projectId: updatedInspection.projectId,
            action,
            details: { inspectionId, previousStatus: existingInspection.status, newStatus: status },
            req,
        });

        return res.json({
            success: true,
            message: `Inspection status updated to ${status}`,
            inspection: updatedInspection,
        });
    } catch (error) {
        next(error);
    }
}

async function deleteInspection(req, res, next) {
    try {
        const inspectionId = Number(req.params.id);
        if (Number.isNaN(inspectionId)) {
            return res.status(400).json({ success: false, message: "Invalid inspection ID" });
        }

        const existingInspection = await prisma.inspection.findUnique({
            where: { id: inspectionId },
        });

        if (!existingInspection) {
            return res.status(404).json({ success: false, message: "Inspection not found" });
        }

        await prisma.inspection.delete({
            where: { id: inspectionId },
        });

        return res.json({
            success: true,
            message: "Inspection deleted successfully",
        });
    } catch (error) {
        next(error);
    }
}

// -------------------------------------------------------------
// Inspection Report Handlers
// -------------------------------------------------------------

async function getInspectionReport(req, res, next) {
    try {
        const inspectionId = Number(req.params.id);
        if (Number.isNaN(inspectionId)) {
            return res.status(400).json({ success: false, message: "Invalid inspection ID" });
        }

        const report = await prisma.inspectionReport.findUnique({
            where: { inspectionId },
            include: {
                inspection: {
                    select: { id: true, projectId: true, inspectorId: true, status: true },
                },
            },
        });

        if (!report) {
            return res.status(404).json({
                success: false,
                message: "No report found for this inspection",
            });
        }

        return res.json({
            success: true,
            report,
        });
    } catch (error) {
        next(error);
    }
}

async function createInspectionReport(req, res, next) {
    try {
        const inspectionId = Number(req.params.id);
        if (Number.isNaN(inspectionId)) {
            return res.status(400).json({ success: false, message: "Invalid inspection ID" });
        }

        const inspection = await prisma.inspection.findUnique({
            where: { id: inspectionId },
        });

        if (!inspection) {
            return res.status(404).json({ success: false, message: "Inspection not found" });
        }

        // Ensure inspector is authorized
        if (req.user.role === "INSPECTOR" && inspection.inspectorId !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: "You can only submit reports for inspections assigned to you",
            });
        }

        const existingReport = await prisma.inspectionReport.findUnique({
            where: { inspectionId },
        });

        if (existingReport) {
            return res.status(409).json({
                success: false,
                message: "A report already exists for this inspection. Use PUT to update it.",
            });
        }

        const { findings, recommendations } = req.body;

        const report = await prisma.inspectionReport.create({
            data: {
                inspectionId,
                findings: findings || null,
                recommendations: recommendations || null,
                submittedAt: new Date(),
            },
        });

        await logAudit({
            userId: req.user?.userId,
            projectId: inspection.projectId,
            action: ACTIONS.CREATE_INSPECTION_REPORT,
            details: { reportId: report.id, inspectionId },
            req,
        });

        return res.status(201).json({
            success: true,
            message: "Inspection report submitted successfully",
            report,
        });
    } catch (error) {
        next(error);
    }
}

async function updateInspectionReport(req, res, next) {
    try {
        const inspectionId = Number(req.params.id);
        if (Number.isNaN(inspectionId)) {
            return res.status(400).json({ success: false, message: "Invalid inspection ID" });
        }

        const existingReport = await prisma.inspectionReport.findUnique({
            where: { inspectionId },
            include: { inspection: true },
        });

        if (!existingReport) {
            return res.status(404).json({
                success: false,
                message: "Report not found for this inspection",
            });
        }

        if (req.user.role === "INSPECTOR" && existingReport.inspection.inspectorId !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: "You can only edit reports for inspections assigned to you",
            });
        }

        const { findings, recommendations } = req.body;
        const updateData = {};
        if (findings !== undefined) updateData.findings = findings;
        if (recommendations !== undefined) updateData.recommendations = recommendations;

        const updatedReport = await prisma.inspectionReport.update({
            where: { inspectionId },
            data: updateData,
        });

        await logAudit({
            userId: req.user?.userId,
            projectId: existingReport.inspection.projectId,
            action: ACTIONS.UPDATE_INSPECTION_REPORT,
            details: { reportId: existingReport.id, inspectionId, updatedFields: Object.keys(updateData) },
            req,
        });

        return res.json({
            success: true,
            message: "Inspection report updated successfully",
            report: updatedReport,
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getInspections,
    getInspectionById,
    createInspection,
    updateInspection,
    updateInspectionStatus,
    deleteInspection,
    getInspectionReport,
    createInspectionReport,
    updateInspectionReport,
};
