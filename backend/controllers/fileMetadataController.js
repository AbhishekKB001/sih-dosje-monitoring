const prisma = require("../config/database");
const { logAudit, ACTIONS } = require("../utils/auditLogger");

async function getInspectionFiles(req, res, next) {
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

        const files = await prisma.fileMetadata.findMany({
            where: { inspectionId },
            include: {
                uploadedBy: {
                    select: { id: true, name: true, email: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return res.json({
            success: true,
            inspectionId,
            count: files.length,
            files,
        });
    } catch (error) {
        next(error);
    }
}

async function createFileMetadata(req, res, next) {
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

        const { fileName, fileType, filePath, storageId } = req.body;

        if (!fileName) {
            return res.status(400).json({
                success: false,
                message: "fileName is required",
            });
        }

        const fileRecord = await prisma.fileMetadata.create({
            data: {
                inspectionId,
                fileName,
                fileType: fileType || null,
                filePath: filePath || null,
                storageId: storageId || null,
                uploadedById: req.user?.userId || null,
            },
            include: {
                uploadedBy: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        await logAudit({
            userId: req.user?.userId,
            projectId: inspection.projectId,
            action: ACTIONS.UPLOAD_FILE,
            details: { fileId: fileRecord.id, inspectionId, fileName },
            req,
        });

        return res.status(201).json({
            success: true,
            message: "File metadata saved successfully",
            file: fileRecord,
        });
    } catch (error) {
        next(error);
    }
}

async function deleteFileMetadata(req, res, next) {
    try {
        const fileId = Number(req.params.id);
        if (Number.isNaN(fileId)) {
            return res.status(400).json({ success: false, message: "Invalid file ID" });
        }

        const existingFile = await prisma.fileMetadata.findUnique({
            where: { id: fileId },
            include: { inspection: true },
        });

        if (!existingFile) {
            return res.status(404).json({ success: false, message: "File metadata not found" });
        }

        // Only Admin or uploader can delete file metadata
        if (req.user.role !== "ADMIN" && req.user.userId !== existingFile.uploadedById) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to delete this file",
            });
        }

        await prisma.fileMetadata.delete({
            where: { id: fileId },
        });

        await logAudit({
            userId: req.user?.userId,
            projectId: existingFile.inspection.projectId,
            action: ACTIONS.DELETE_FILE,
            details: { fileId, fileName: existingFile.fileName },
            req,
        });

        return res.json({
            success: true,
            message: "File metadata deleted successfully",
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getInspectionFiles,
    createFileMetadata,
    deleteFileMetadata,
};
