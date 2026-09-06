import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import projectsRoutes from './routes/projects.routes';
import institutesRoutes from './routes/institutes.routes';
import cctvRoutes from './routes/cctv.routes';
import inspectionsRoutes from './routes/inspections.routes';
import alertsRoutes from './routes/alerts.routes';
import attendanceRoutes from './routes/attendance.routes';
import evidenceRoutes from './routes/evidence.routes';
import vcRoutes from './routes/vc.routes';
import reportsRoutes from './routes/reports.routes';
import analyticsRoutes from './routes/analytics.routes';
import usersRoutes from './routes/users.routes';
import auditLogsRoutes from './routes/auditLogs.routes';
import notificationsRoutes from './routes/notifications.routes';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// Security & Parsing Middleware
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('short'));
}
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static Assets: Evidence & Photos
const evidenceDir = path.resolve(__dirname, '../../data/evidence');
fs.mkdirSync(evidenceDir, { recursive: true });
app.use('/data/evidence', express.static(evidenceDir));
app.use('/evidence', express.static(evidenceDir));

// Static Mount for Precompiled Flutter Mobile Web Client
const flutterWebDir = path.resolve(__dirname, '../../build/web');
if (fs.existsSync(flutterWebDir)) {
  app.use('/sih-dosje-monitoring', express.static(flutterWebDir));
  app.use('/mobile', express.static(flutterWebDir));
  app.get(['/sih-dosje-monitoring/*', '/mobile/*'], (_req: Request, res: Response) => {
    res.sendFile(path.join(flutterWebDir, 'index.html'));
  });
}

// Health Check
app.get(['/', '/health', '/api/health'], (_req: Request, res: Response) => {
  res.json({
    status: 'UP',
    service: 'DoSJE Central Surveillance & Inspection Monitoring Backend',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      dashboard: '/api/dashboard',
      projects: '/api/projects',
      institutes: '/api/institutes',
      cctv: '/api/cctv',
      inspections: '/api/inspections',
      alerts: '/api/alerts',
      attendance: '/api/attendance',
      evidence: '/api/evidence',
      vc: '/api/vc',
      reports: '/api/reports',
      analytics: '/api/analytics',
      users: '/api/users',
      auditLogs: '/api/audit-logs',
      notifications: '/api/notifications',
      mobileWeb: '/mobile',
    },
  });
});

// Mount Canonical API Routes under /api
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/institutes', institutesRoutes);
app.use('/api/cctv', cctvRoutes);
app.use('/api/cameras', cctvRoutes); // alias
app.use('/api/inspections', inspectionsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/vc', vcRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Global 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Endpoint '${req.method} ${req.originalUrl}' not found on Central Backend`,
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error occurred',
  });
});

export default app;
