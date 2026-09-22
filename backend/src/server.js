import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import adminProblemRoutes from './routes/admin.problem.routes.js';
import adminContestRoutes from './routes/admin.contest.routes.js';
import contestRoutes from './routes/contest.routes.js';
import studentProblemRoutes from './routes/student.problem.routes.js';
import submissionRoutes from './routes/submission.routes.js';
import userRoutes from './routes/user.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import discussionRoutes from './routes/discussion.routes.js';
import adminModerationRoutes from './routes/admin.moderation.routes.js';
import aiRoutes from './routes/ai.routes.js';

import http from 'http';
import { initSocket } from './socket.js';

dotenv.config();

const app = express();

// 1. Environment Validation (Fail-Fast)
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = ['JWT_SECRET', 'MONGO_URI', 'REDIS_URL', 'CLIENT_URL'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.error(`[FATAL] Missing required environment variables in production: ${missingEnvVars.join(', ')}`);
    process.exit(1);
  }
}

// 2. CORS configuration
const corsOptions = {
  origin: [process.env.CLIENT_URL || 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/admin/problems', adminProblemRoutes);
app.use('/api/admin/contests', adminContestRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/problems', studentProblemRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/admin/reports', adminModerationRoutes);
app.use('/api/ai', aiRoutes);

import { connection as redisClient } from './config/redis.js';

app.get('/health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    if (dbState !== 1) {
      return res.status(503).json({ status: 'error', message: 'Database disconnected', dbState });
    }

    const redisStatus = redisClient.status;
    if (redisStatus !== 'ready') {
      return res.status(503).json({ status: 'error', message: 'Redis disconnected', redisStatus });
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    res.status(503).json({ status: 'error', message: 'Health check failed' });
  }
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/codearena';

const server = http.createServer(app);
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
initSocket(server);

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// 3. Graceful Shutdown
const shutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
  
  server.close(async (err) => {
    if (err) {
      console.error('[Server] HTTP server close error:', err);
      process.exit(1);
    }
    console.log('[Server] HTTP server closed.');
    
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close(false);
        console.log('[Server] MongoDB connection closed.');
      }
      process.exit(0);
    } catch (e) {
      console.error('[Server] Shutdown error:', e);
      process.exit(1);
    }
  });

  // Force close after 10s
  setTimeout(() => {
    console.error('[Server] Forcing shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
