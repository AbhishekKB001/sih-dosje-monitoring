const prisma = require("../config/database");

const ACTIONS = {
    LOGIN: "LOGIN",
    REGISTER: "REGISTER",
    CREATE_USER: "CREATE_USER",
    UPDATE_USER: "UPDATE_USER",
    DELETE_USER: "DELETE_USER",
    CREATE_PROJECT: "CREATE_PROJECT",
    UPDATE_PROJECT: "UPDATE_PROJECT",
    DELETE_PROJECT: "DELETE_PROJECT",
    CREATE_CAMERA: "CREATE_CAMERA",
    UPDATE_CAMERA: "UPDATE_CAMERA",
    CAMERA_STATUS_UPDATE: "CAMERA_STATUS_UPDATE",
    CREATE_INSPECTION: "CREATE_INSPECTION",
    UPDATE_INSPECTION: "UPDATE_INSPECTION",
    COMPLETE_INSPECTION: "COMPLETE_INSPECTION",
    CREATE_INSPECTION_REPORT: "CREATE_INSPECTION_REPORT",
    UPDATE_INSPECTION_REPORT: "UPDATE_INSPECTION_REPORT",
    CREATE_VC_SESSION: "CREATE_VC_SESSION",
    UPDATE_VC_SESSION: "UPDATE_VC_SESSION",
    CREATE_ALERT: "CREATE_ALERT",
    UPDATE_ALERT: "UPDATE_ALERT",
    CREATE_AI_DETECTION: "CREATE_AI_DETECTION",
    UPLOAD_FILE: "UPLOAD_FILE",
    DELETE_FILE: "DELETE_FILE",
};

async function logAudit({ userId, projectId, action, details, req }) {
    try {
        let ipAddress = null;
        let userAgent = null;
        let effectiveUserId = userId;

        if (req) {
            if (!effectiveUserId && req.user && req.user.userId) {
                effectiveUserId = req.user.userId;
            }
            const forwarded = req.headers["x-forwarded-for"];
            ipAddress = forwarded ? forwarded.split(",")[0].trim() : req.socket?.remoteAddress || req.ip || null;
            userAgent = req.headers["user-agent"] || null;
        }

        const logEntry = await prisma.auditLog.create({
            data: {
                userId: effectiveUserId ? Number(effectiveUserId) : null,
                projectId: projectId ? Number(projectId) : null,
                action: String(action),
                details: details ? details : undefined,
                ipAddress: ipAddress ? String(ipAddress).slice(0, 100) : null,
                userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
            },
        });

        return logEntry;
    } catch (error) {
        console.error("Audit log creation error:", error.message);
        return null;
    }
}

module.exports = {
    logAudit,
    ACTIONS,
};
