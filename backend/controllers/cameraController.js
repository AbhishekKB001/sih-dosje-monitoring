const prisma = require("../config/database");
const { logAudit, ACTIONS } = require("../utils/auditLogger");

async function getCameras(req, res, next) {
    try {
        const { projectId, status, type, search } = req.query;

        const where = {};
        if (projectId) where.projectId = Number(projectId);
        if (status) where.status = status;
        if (type) where.type = type;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { cameraCode: { contains: search, mode: "insensitive" } },
                { location: { contains: search, mode: "insensitive" } },
            ];
        }

        const cameras = await prisma.camera.findMany({
            where,
            include: {
                project: {
                    select: { id: true, projectCode: true, name: true, district: true, state: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return res.json({
            success: true,
            count: cameras.length,
            cameras,
        });
    } catch (error) {
        next(error);
    }
}

async function getCameraById(req, res, next) {
    try {
        const cameraId = Number(req.params.id);
        if (Number.isNaN(cameraId)) {
            return res.status(400).json({ success: false, message: "Invalid camera ID" });
        }

        const camera = await prisma.camera.findUnique({
            where: { id: cameraId },
            include: {
                project: true,
                detections: {
                    take: 10,
                    orderBy: { detectedAt: "desc" },
                },
                alerts: {
                    take: 5,
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        if (!camera) {
            return res.status(404).json({ success: false, message: "Camera not found" });
        }

        return res.json({
            success: true,
            camera,
        });
    } catch (error) {
        next(error);
    }
}

async function createCamera(req, res, next) {
    try {
        const {
            cameraCode,
            projectId,
            name,
            location,
            streamUrl,
            streamId,
            type,
            status,
        } = req.body;

        // Check if project exists
        const project = await prisma.project.findUnique({
            where: { id: Number(projectId) },
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: `Project with ID ${projectId} not found`,
            });
        }

        // Check for duplicate cameraCode
        const existingCamera = await prisma.camera.findUnique({
            where: { cameraCode },
        });

        if (existingCamera) {
            return res.status(409).json({
                success: false,
                message: "Camera with this cameraCode already exists",
            });
        }

        const camera = await prisma.camera.create({
            data: {
                cameraCode,
                projectId: Number(projectId),
                name,
                location: location || null,
                streamUrl: streamUrl || null,
                streamId: streamId || null,
                type: type || "CCTV",
                status: status || "OFFLINE",
                lastActive: status === "ONLINE" ? new Date() : null,
            },
        });

        await logAudit({
            userId: req.user?.userId,
            projectId: camera.projectId,
            action: ACTIONS.CREATE_CAMERA,
            details: { cameraId: camera.id, cameraCode: camera.cameraCode, type: camera.type },
            req,
        });

        return res.status(201).json({
            success: true,
            message: "Camera created successfully",
            camera,
        });
    } catch (error) {
        next(error);
    }
}

async function updateCamera(req, res, next) {
    try {
        const cameraId = Number(req.params.id);
        if (Number.isNaN(cameraId)) {
            return res.status(400).json({ success: false, message: "Invalid camera ID" });
        }

        const existingCamera = await prisma.camera.findUnique({
            where: { id: cameraId },
        });

        if (!existingCamera) {
            return res.status(404).json({ success: false, message: "Camera not found" });
        }

        const {
            cameraCode,
            name,
            location,
            streamUrl,
            streamId,
            type,
            status,
            projectId,
        } = req.body;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (location !== undefined) updateData.location = location;
        if (streamUrl !== undefined) updateData.streamUrl = streamUrl;
        if (streamId !== undefined) updateData.streamId = streamId;
        if (type !== undefined) updateData.type = type;

        if (status !== undefined) {
            updateData.status = status;
            if (status === "ONLINE") {
                updateData.lastActive = new Date();
            }
        }

        if (projectId !== undefined) {
            const project = await prisma.project.findUnique({ where: { id: Number(projectId) } });
            if (!project) {
                return res.status(404).json({ success: false, message: "Target project not found" });
            }
            updateData.projectId = Number(projectId);
        }

        if (cameraCode && cameraCode !== existingCamera.cameraCode) {
            const codeTaken = await prisma.camera.findUnique({ where: { cameraCode } });
            if (codeTaken) {
                return res.status(409).json({
                    success: false,
                    message: "Camera code already in use by another camera",
                });
            }
            updateData.cameraCode = cameraCode;
        }

        const updatedCamera = await prisma.camera.update({
            where: { id: cameraId },
            data: updateData,
        });

        await logAudit({
            userId: req.user?.userId,
            projectId: updatedCamera.projectId,
            action: ACTIONS.UPDATE_CAMERA,
            details: { cameraId, updatedFields: Object.keys(updateData) },
            req,
        });

        return res.json({
            success: true,
            message: "Camera updated successfully",
            camera: updatedCamera,
        });
    } catch (error) {
        next(error);
    }
}

// Member 2 Integration API: POST /api/cameras/:camera_id/status
async function updateCameraStatus(req, res, next) {
    try {
        const cameraId = Number(req.params.camera_id);
        if (Number.isNaN(cameraId)) {
            return res.status(400).json({ success: false, message: "Invalid camera ID" });
        }

        const { status } = req.body;
        if (!status || !["ONLINE", "OFFLINE", "MAINTENANCE"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be ONLINE, OFFLINE, or MAINTENANCE",
            });
        }

        const existingCamera = await prisma.camera.findUnique({
            where: { id: cameraId },
        });

        if (!existingCamera) {
            return res.status(404).json({
                success: false,
                message: "Camera not found",
            });
        }

        const updatedCamera = await prisma.camera.update({
            where: { id: cameraId },
            data: {
                status,
                lastActive: status === "ONLINE" ? new Date() : existingCamera.lastActive,
            },
        });

        await logAudit({
            userId: req.user?.userId,
            projectId: updatedCamera.projectId,
            action: ACTIONS.CAMERA_STATUS_UPDATE,
            details: { cameraId, previousStatus: existingCamera.status, newStatus: status },
            req,
        });

        return res.json({
            success: true,
            message: `Camera status updated to ${status}`,
            camera: updatedCamera,
        });
    } catch (error) {
        next(error);
    }
}

// Member 2 Integration API: GET /api/projects/:project_id/cameras
async function getCamerasByProjectId(req, res, next) {
    try {
        const projectId = Number(req.params.project_id);
        if (Number.isNaN(projectId)) {
            return res.status(400).json({ success: false, message: "Invalid project ID" });
        }

        const project = await prisma.project.findUnique({
            where: { id: projectId },
        });

        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        const cameras = await prisma.camera.findMany({
            where: { projectId },
            orderBy: { createdAt: "desc" },
        });

        return res.json({
            success: true,
            projectId,
            projectName: project.name,
            count: cameras.length,
            cameras,
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getCameras,
    getCameraById,
    createCamera,
    updateCamera,
    updateCameraStatus,
    getCamerasByProjectId,
};
