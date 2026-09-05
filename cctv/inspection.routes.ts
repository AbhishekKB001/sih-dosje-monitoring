import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma.js';

export const inspectionRouter = Router();

inspectionRouter.get('/', async (req: Request, res: Response) => {
    try {
        const projectId = req.query.projectId as string | undefined;
        const inspections = await prisma.inspection.findMany({
            where: projectId ? { projectId } : undefined,
            include: {
                project: true,
                sessions: {
                    include: {
                        selectedParticipant: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ success: true, count: inspections.length, data: inspections });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

inspectionRouter.get('/:id', async (req: Request, res: Response) => {
    try {
        const inspection = await prisma.inspection.findUnique({
            where: { id: req.params.id },
            include: {
                project: {
                    include: { cameras: true, users: true },
                },
                sessions: {
                    include: {
                        initiatedBy: true,
                        selectedParticipant: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!inspection) {
            return res.status(404).json({ success: false, message: 'Inspection not found' });
        }

        res.json({ success: true, data: inspection });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});
