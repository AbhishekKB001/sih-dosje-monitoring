import app from './app';

const PORT = Number(process.env.PORT) || 4000;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log('================================================================');
  console.log(`👁️  DoSJE Central Monitoring Backend API running at http://${HOST}:${PORT}`);
  console.log(`📡 Canonical API Base: http://localhost:${PORT}/api`);
  console.log(`📱 Flutter Mobile Web: http://localhost:${PORT}/mobile`);
  console.log(`📊 Health Endpoint:    http://localhost:${PORT}/api/health`);
  console.log('================================================================');
});

const shutdown = () => {
  console.log('\nShutting down server gracefully...');
  server.close(() => {
    console.log('Server terminated cleanly.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default server;
