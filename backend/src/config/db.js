const mongoose = require('mongoose');
const Redis = require('ioredis');
const logger = require('./logger');

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/task_platform';
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let redisClient;

const connectDB = async () => {
  try {
    await mongoose.connect(mongoUri);
    logger.info('Successfully connected to MongoDB');
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to connect to MongoDB');
    process.exit(1);
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    logger.info(`Initializing Redis client with URL: ${redisUrl}`);
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
      }
    });

    redisClient.on('connect', () => {
      logger.info('Successfully connected to Redis');
    });

    redisClient.on('error', (error) => {
      logger.error({ error: error.message }, 'Redis client error');
    });
  }
  return redisClient;
};

const closeConnections = async () => {
  logger.info('Closing database and cache connections...');
  try {
    await mongoose.disconnect();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error({ error: error.message }, 'Error closing MongoDB connection');
  }

  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error({ error: error.message }, 'Error closing Redis connection');
    }
  }
};

module.exports = {
  connectDB,
  getRedisClient,
  closeConnections
};
