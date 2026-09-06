import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma.js';

export const projectRouter = Router();

projectRouter.get('/', async (req: Request, res: Response) => {
    try {
        const projects = await prisma.project.findMany({
            include: {
                _count: {
                    select: { cameras: true, users: true, inspections: true },
                },
            },
            orderBy: { name: 'asc' },
        });

        res.json({ success: true, count: projects.length, data: projects });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

projectRouter.get('/:id', async (req: Request, res: Response) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: req.params.id },
            include: {
                cameras: true,
                users: true,
                inspections: {
                    include: { sessions: true },
                },
            },
        });

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        res.json({ success: true, data: project });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});
