const prisma = require("../config/database");
const { logAudit, ACTIONS } = require("../utils/auditLogger");

async function createVCSession(req, res, next) {
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

        const { meetingId, meetingUrl, status, startedAt } = req.body;

        const session = await prisma.vCSession.create({
            data: {
                inspectionId,
                meetingId: meetingId || null,
                meetingUrl: meetingUrl || null,
                status: status || "SCHEDULED",
                startedAt: startedAt ? new Date(startedAt) : (status === "ACTIVE" ? new Date() : null),
            },
        });

        await logAudit({
            userId: req.user?.userId,
            projectId: inspection.projectId,
            action: ACTIONS.CREATE_VC_SESSION,
            details: { vcSessionId: session.id, inspectionId, status: session.status },
            req,
        });

        return res.status(201).json({
            success: true,
            message: "VC session created successfully",
            session,
        });
    } catch (error) {
        next(error);
    }
}

async function getVCSessionsByInspection(req, res, next) {
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

        const sessions = await prisma.vCSession.findMany({
            where: { inspectionId },
            orderBy: { createdAt: "desc" },
        });

        return res.json({
            success: true,
            inspectionId,
            count: sessions.length,
            sessions,
        });
    } catch (error) {
        next(error);
    }
}

async function updateVCSession(req, res, next) {
    try {
        const sessionId = Number(req.params.id);
        if (Number.isNaN(sessionId)) {
            return res.status(400).json({ success: false, message: "Invalid session ID" });
        }

        const existingSession = await prisma.vCSession.findUnique({
            where: { id: sessionId },
            include: { inspection: true },
        });

        if (!existingSession) {
            return res.status(404).json({ success: false, message: "VC session not found" });
        }

        const { meetingId, meetingUrl, status, startedAt, endedAt } = req.body;
        const updateData = {};

        if (meetingId !== undefined) updateData.meetingId = meetingId;
        if (meetingUrl !== undefined) updateData.meetingUrl = meetingUrl;
        if (status !== undefined) {
            updateData.status = status;
            if (status === "ENDED" && !endedAt && !existingSession.endedAt) {
                updateData.endedAt = new Date();
            }
        }
        if (startedAt !== undefined) updateData.startedAt = startedAt ? new Date(startedAt) : null;
        if (endedAt !== undefined) updateData.endedAt = endedAt ? new Date(endedAt) : null;

        const updatedSession = await prisma.vCSession.update({
            where: { id: sessionId },
            data: updateData,
        });

        await logAudit({
            userId: req.user?.userId,
            projectId: existingSession.inspection.projectId,
            action: ACTIONS.UPDATE_VC_SESSION,
            details: { vcSessionId: sessionId, updatedFields: Object.keys(updateData) },
            req,
        });

        return res.json({
            success: true,
            message: "VC session updated successfully",
            session: updatedSession,
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createVCSession,
    getVCSessionsByInspection,
    updateVCSession,
};
