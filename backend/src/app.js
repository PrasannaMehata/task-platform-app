const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const mongoose = require('mongoose');

const logger = require('./config/logger');
const { getRedisClient } = require('./config/db');
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const errorHandler = require('./middleware/error');

const app = express();

// Secure app with Helmet headers
app.use(helmet());

// CORS configuration restricted to FRONTEND_ORIGIN
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:8082',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8082'
];
const allowedOriginEnv = process.env.FRONTEND_ORIGIN;
if (allowedOriginEnv) {
  allowedOriginEnv.split(',').forEach(o => allowedOrigins.push(o.trim()));
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const isLocal = origin.startsWith('http://localhost') || 
                    origin.startsWith('http://127.0.0.1') ||
                    origin.startsWith('http://[::1]');
                    
    if (isLocal || allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
    return callback(new Error(msg), false);
  },
  optionsSuccessStatus: 200
}));

// Parse incoming JSON requests
app.use(express.json());

// Attach HTTP logger using pino
app.use(pinoHttp({
  logger,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url
    }),
    res: (res) => ({
      statusCode: res.statusCode
    })
  }
}));

// Liveness/Readiness probe endpoint checking MongoDB + Redis status
app.get('/healthz', async (req, res) => {
  let isMongoConnected = false;
  let isRedisConnected = false;

  try {
    isMongoConnected = mongoose.connection.readyState === 1;
  } catch (error) {
    logger.error({ error: error.message }, 'Health check MongoDB query error');
  }

  try {
    const redis = getRedisClient();
    const pong = await redis.ping();
    isRedisConnected = pong === 'PONG';
  } catch (error) {
    logger.error({ error: error.message }, 'Health check Redis ping error');
  }

  if (isMongoConnected && isRedisConnected) {
    return res.status(200).json({
      status: 'healthy',
      mongodb: 'connected',
      redis: 'connected'
    });
  } else {
    return res.status(503).json({
      status: 'unhealthy',
      mongodb: isMongoConnected ? 'connected' : 'disconnected',
      redis: isRedisConnected ? 'connected' : 'disconnected'
    });
  }
});

// Mount routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/tasks', apiLimiter, taskRoutes);

// Catch-all 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.url}`
  });
});

// Centralized error handler (must be registered last)
app.use(errorHandler);

module.exports = app;
