const prisma = require("../config/database");

async function getNotifications(req, res, next) {
    try {
        const { isRead } = req.query;

        const where = {
            userId: req.user.userId,
        };

        // Admins can inspect other users if userId query param is provided
        if (req.user.role === "ADMIN" && req.query.userId) {
            where.userId = Number(req.query.userId);
        }

        if (isRead !== undefined) {
            where.isRead = isRead === "true" || isRead === "1";
        }

        const notifications = await prisma.notification.findMany({
            where,
            include: {
                project: {
                    select: { id: true, projectCode: true, name: true },
                },
                alert: {
                    select: { id: true, alertCode: true, riskLevel: true, status: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        const unreadCount = await prisma.notification.count({
            where: {
                userId: where.userId,
                isRead: false,
            },
        });

        return res.json({
            success: true,
            count: notifications.length,
            unreadCount,
            notifications,
        });
    } catch (error) {
        next(error);
    }
}

async function getNotificationById(req, res, next) {
    try {
        const notifId = Number(req.params.id);
        if (Number.isNaN(notifId)) {
            return res.status(400).json({ success: false, message: "Invalid notification ID" });
        }

        const notification = await prisma.notification.findUnique({
            where: { id: notifId },
            include: {
                project: true,
                alert: true,
            },
        });

        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        if (req.user.role !== "ADMIN" && notification.userId !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to view this notification",
            });
        }

        return res.json({
            success: true,
            notification,
        });
    } catch (error) {
        next(error);
    }
}

async function markNotificationAsRead(req, res, next) {
    try {
        const notifId = Number(req.params.id);
        if (Number.isNaN(notifId)) {
            return res.status(400).json({ success: false, message: "Invalid notification ID" });
        }

        const notification = await prisma.notification.findUnique({
            where: { id: notifId },
        });

        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        if (req.user.role !== "ADMIN" && notification.userId !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to modify this notification",
            });
        }

        const updated = await prisma.notification.update({
            where: { id: notifId },
            data: { isRead: true },
        });

        return res.json({
            success: true,
            message: "Notification marked as read",
            notification: updated,
        });
    } catch (error) {
        next(error);
    }
}

async function markAllNotificationsAsRead(req, res, next) {
    try {
        const result = await prisma.notification.updateMany({
            where: {
                userId: req.user.userId,
                isRead: false,
            },
            data: { isRead: true },
        });

        return res.json({
            success: true,
            message: `${result.count} notifications marked as read`,
            updatedCount: result.count,
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getNotifications,
    getNotificationById,
    markNotificationAsRead,
    markAllNotificationsAsRead,
};
