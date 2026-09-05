const prisma = require("../config/database");
const { logAudit, ACTIONS } = require("../utils/auditLogger");

async function recordAIDetection(req, res, next) {
    try {
        const rawCameraId = req.body.cameraId || req.body.camera_id;
        const cameraId = Number(rawCameraId);

        if (!rawCameraId || Number.isNaN(cameraId)) {
            return res.status(400).json({
                success: false,
                message: "Valid cameraId is required",
            });
        }

        const { objects, confidence, detectedAt } = req.body;

        if (!objects) {
            return res.status(400).json({
                success: false,
                message: "objects payload is required",
            });
        }

        const camera = await prisma.camera.findUnique({
            where: { id: cameraId },
        });

        if (!camera) {
            return res.status(404).json({
                success: false,
                message: `Camera with ID ${cameraId} not found`,
            });
        }

        const parsedDetectedAt = detectedAt ? new Date(detectedAt) : new Date();
        const parsedConfidence = confidence !== undefined ? Number(confidence) : null;

        const detection = await prisma.aIDetection.create({
            data: {
                cameraId,
                detectedAt: isNaN(parsedDetectedAt.getTime()) ? new Date() : parsedDetectedAt,
                objects,
                confidence: parsedConfidence,
            },
        });

        // Update camera lastActive
        await prisma.camera.update({
            where: { id: cameraId },
            data: { lastActive: new Date() },
        });

        await logAudit({
            userId: req.user?.userId,
            projectId: camera.projectId,
            action: ACTIONS.CREATE_AI_DETECTION,
            details: { detectionId: detection.id, cameraId, confidence: parsedConfidence },
            req,
        });

        return res.status(201).json({
            success: true,
            message: "AI detection recorded successfully",
            detection,
        });
    } catch (error) {
        next(error);
    }
}

async function getAIDetections(req, res, next) {
    try {
        const { cameraId, limit = 50 } = req.query;

        const where = {};
        if (cameraId) where.cameraId = Number(cameraId);

        const detections = await prisma.aIDetection.findMany({
            where,
            take: Number(limit),
            orderBy: { detectedAt: "desc" },
            include: {
                camera: {
                    select: { id: true, cameraCode: true, name: true, projectId: true },
                },
            },
        });

        return res.json({
            success: true,
            count: detections.length,
            detections,
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    recordAIDetection,
    getAIDetections,
};
