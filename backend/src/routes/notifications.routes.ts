import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { optionalAuthenticateToken } from '../middleware/auth';

const router = Router();

// GET /api/notifications
router.get('/', optionalAuthenticateToken, async (req, res) => {
  try {
    const { userId, type, unreadOnly } = req.query;
    const where: any = {};
    if (userId) where.userId = String(userId);
    if (type) where.type = String(type).toUpperCase();
    if (unreadOnly === 'true') where.isRead = false;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(
      notifications.map((n) => ({
        id: n.id,
        userId: n.userId,
        title: n.title,
        message: n.message,
        type: n.type.toLowerCase(),
        isRead: n.isRead,
        link: n.link,
        createdAt: n.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res): Promise<void> => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', async (req, res): Promise<void> => {
  try {
    const { userId } = req.body;
    const where: any = {};
    if (userId) where.userId = userId;

    await prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark notifications read' });
  }
});

export default router;
