import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';

import { cctvRouter } from './modules/cctv/cctv.routes.js';
import { vcRouter } from './modules/vc/vc.routes.js';
import { projectRouter } from './modules/projects/project.routes.js';
import { userRouter } from './modules/users/user.routes.js';
import { inspectionRouter } from './modules/inspections/inspection.routes.js';
import { SignalingServer } from './modules/vc/signaling.js';
import { CameraHealthMonitor } from './modules/cctv/health.monitor.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS configuration supporting frontend ports (5173, 3000)
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(
    cors({
        origin: corsOrigin,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    })
);

app.use(express.json());

// Attach Socket.IO for WebRTC Signaling
const io = new SocketIOServer(server, {
    cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Initialize WebRTC Signaling
new SignalingServer(io);

// Health Endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'SIH-Inspection-Member3-CCTV-VC-Platform',
    });
});

// Mount Subsystem Routers
app.use('/api', cctvRouter);
app.use('/api/vc', vcRouter);
app.use('/api/projects', projectRouter);
app.use('/api/users', userRouter);
app.use('/api/inspections', inspectionRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Unhandled Error]:', err);
    res.status(500).json({
        success: false,
        message: err.message || 'Internal Server Error',
    });
});

const PORT = parseInt(process.env.PORT || '5000', 10);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`SIH Inspection Platform — Member 3 Backend`);
    console.log(`HTTP & Socket.IO running on: http://localhost:${PORT}`);
    console.log(`CCTV Endpoints:        http://localhost:${PORT}/api/cameras`);
    console.log(`Video Call Endpoints:  http://localhost:${PORT}/api/vc/sessions`);
    console.log(`====================================================`);

    // Start background CCTV health monitor
    CameraHealthMonitor.start(8000);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    CameraHealthMonitor.stop();
    server.close();
});
