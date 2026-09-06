import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { VcService } from './vc.service.js';

export const vcRouter = Router();

const initiateVcSchema = z.object({
    inspectionId: z.string().uuid('Valid Inspection ID required'),
    initiatedById: z.string().uuid('Valid Inspector ID required'),
    eligibleRoles: z.array(z.enum(['PROJECT_INCHARGE', 'STAFF', 'BENEFICIARY'])).optional(),
});

const submitResultSchema = z.object({
    result: z.enum(['VERIFIED', 'NOT_VERIFIED']),
    notes: z.string().optional(),
});

// GET /api/vc/ice-servers - Retrieve ICE servers (STUN/TURN)
vcRouter.get('/ice-servers', (req: Request, res: Response) => {
    try {
        const servers = VcService.getIceServers();
        res.json({ success: true, iceServers: servers });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/vc/sessions/random - Initiate Random Participant VC Session
vcRouter.post('/sessions/random', async (req: Request, res: Response) => {
    try {
        const parsed = initiateVcSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, errors: parsed.error.format() });
        }

        const result = await VcService.initiateRandomVcSession(parsed.data);
        res.status(201).json({ success: true, data: result });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// GET /api/vc/sessions/:id - Get session details
vcRouter.get('/sessions/:id', async (req: Request, res: Response) => {
    try {
        const session = await VcService.getSessionById(req.params.id);
        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }
        res.json({ success: true, data: session });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/vc/sessions/room/:roomId - Get session by room ID
vcRouter.get('/sessions/room/:roomId', async (req: Request, res: Response) => {
    try {
        const session = await VcService.getSessionByRoomId(req.params.roomId);
        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }
        res.json({ success: true, data: session });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/vc/sessions/inspection/:inspectionId - List sessions for an inspection
vcRouter.get('/sessions/inspection/:inspectionId', async (req: Request, res: Response) => {
    try {
        const sessions = await VcService.listSessionsForInspection(req.params.inspectionId);
        res.json({ success: true, count: sessions.length, data: sessions });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/vc/sessions/:id/status - Update call status
vcRouter.post('/sessions/:id/status', async (req: Request, res: Response) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ success: false, message: 'Status is required' });
        }

        const session = await VcService.updateSessionStatus(req.params.id, status);
        res.json({ success: true, data: session });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/vc/sessions/:id/result - Submit inspector verification result
vcRouter.post('/sessions/:id/result', async (req: Request, res: Response) => {
    try {
        const parsed = submitResultSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, errors: parsed.error.format() });
        }

        const session = await VcService.submitVerificationResult(
            req.params.id,
            parsed.data.result,
            parsed.data.notes
        );

        res.json({ success: true, data: session });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});
