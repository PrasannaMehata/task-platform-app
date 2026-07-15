require('dotenv').config();

const app = require('./app');
const { connectDB, getRedisClient, closeConnections } = require('./config/db');
const logger = require('./config/logger');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // 1. Establish DB Connections
  await connectDB();
  getRedisClient(); // Trigger lazy initialization and event binding

  // 2. Start HTTP server
  const server = app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });

  // 3. Graceful shutdown handler
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    server.close(async () => {
      logger.info('HTTP server closed');
      await closeConnections();
      logger.info('Graceful shutdown completed. Exiting.');
      process.exit(0);
    });

    // If graceful shutdown takes too long, force exit
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch((error) => {
  logger.fatal({ error: error.message }, 'Failed to start server');
  process.exit(1);
});
