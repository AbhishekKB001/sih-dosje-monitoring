const prisma = require("../config/database");

async function getDashboardSummary(req, res, next) {
    try {
        const [
            totalProjects,
            activeProjects,
            totalCameras,
            onlineCameras,
            offlineCameras,
            maintenanceCameras,
            pendingInspections,
            completedInspections,
            activeAlerts,
            highRiskAlerts,
        ] = await Promise.all([
            prisma.project.count(),
            prisma.project.count({ where: { status: "ACTIVE" } }),
            prisma.camera.count(),
            prisma.camera.count({ where: { status: "ONLINE" } }),
            prisma.camera.count({ where: { status: "OFFLINE" } }),
            prisma.camera.count({ where: { status: "MAINTENANCE" } }),
            prisma.inspection.count({
                where: {
                    status: { in: ["ASSIGNED", "SCHEDULED", "IN_PROGRESS"] },
                },
            }),
            prisma.inspection.count({ where: { status: "COMPLETED" } }),
            prisma.alert.count({ where: { status: "ACTIVE" } }),
            prisma.alert.count({
                where: {
                    status: "ACTIVE",
                    riskLevel: { in: ["HIGH", "CRITICAL"] },
                },
            }),
        ]);

        return res.json({
            success: true,
            summary: {
                totalProjects,
                activeProjects,
                totalCameras,
                onlineCameras,
                offlineCameras,
                maintenanceCameras,
                pendingInspections,
                completedInspections,
                activeAlerts,
                highRiskAlerts,
            },
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getDashboardSummary,
};
