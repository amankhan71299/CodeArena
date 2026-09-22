import { Worker } from 'bullmq';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connection as redisConnection } from './config/redis.js';
import { processSubmissionJob } from './jobs/submission.job.js';

dotenv.config();

const QUEUE_NAME = 'submissionQueue';

// Environment Validation (Fail-Fast)
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = ['MONGO_URI', 'REDIS_URL'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.error(`[FATAL] Missing required environment variables in production worker: ${missingEnvVars.join(', ')}`);
    process.exit(1);
  }
}

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/codearena');
    console.log('[Worker] Connected to MongoDB');
  } catch (error) {
    console.error('[Worker] MongoDB Connection Error:', error);
    process.exit(1);
  }
}

async function startWorker() {
  await connectDB();

  console.log(`[Worker] Listening to queue: ${QUEUE_NAME}`);
  
  const worker = new Worker(
    QUEUE_NAME, 
    async (job) => {
      console.log(`[Worker] Processing job ${job.id} (Submission: ${job.data.submissionId || 'RUN'})`);
      return await processSubmissionJob(job);
    }, 
    { 
      connection: redisConnection,
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10)
    }
  );

  worker.on('completed', (job, returnvalue) => {
    console.log(`[Worker] Job ${job.id} completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n[Worker] Received ${signal}. Shutting down gracefully...`);
    try {
      await worker.close();
      console.log('[Worker] BullMQ worker closed.');
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close(false);
        console.log('[Worker] MongoDB connection closed.');
      }
      redisConnection.disconnect();
      console.log('[Worker] Redis connection closed.');
      process.exit(0);
    } catch (err) {
      console.error('[Worker] Shutdown error:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startWorker().catch(console.error);
