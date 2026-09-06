import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma.js';
import { Role } from '@prisma/client';

export const userRouter = Router();

userRouter.get('/', async (req: Request, res: Response) => {
    try {
        const projectId = req.query.projectId as string | undefined;
        const role = req.query.role as Role | undefined;

        const users = await prisma.user.findMany({
            where: {
                ...(projectId ? { projectId } : {}),
                ...(role ? { role } : {}),
            },
            include: {
                project: { select: { id: true, name: true, code: true } },
            },
            orderBy: { name: 'asc' },
        });

        res.json({ success: true, count: users.length, data: users });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

userRouter.post('/:id/availability', async (req: Request, res: Response) => {
    try {
        const { isAvailable } = req.body;
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { isAvailable: Boolean(isAvailable) },
        });
        res.json({ success: true, data: user });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});
