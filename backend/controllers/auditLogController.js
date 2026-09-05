const prisma = require("../config/database");

async function getAuditLogs(req, res, next) {
    try {
        const { action, userId, projectId, limit = 50, page = 1 } = req.query;

        const where = {};
        if (action) where.action = action;
        if (userId) where.userId = Number(userId);
        if (projectId) where.projectId = Number(projectId);

        const take = Math.min(Number(limit) || 50, 100);
        const skip = ((Number(page) || 1) - 1) * take;

        const [total, logs] = await Promise.all([
            prisma.auditLog.count({ where }),
            prisma.auditLog.findMany({
                where,
                take,
                skip,
                orderBy: { createdAt: "desc" },
                include: {
                    user: {
                        select: { id: true, name: true, email: true, role: true },
                    },
                    project: {
                        select: { id: true, projectCode: true, name: true },
                    },
                },
            }),
        ]);

        return res.json({
            success: true,
            total,
            page: Number(page) || 1,
            limit: take,
            count: logs.length,
            logs,
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getAuditLogs,
};
