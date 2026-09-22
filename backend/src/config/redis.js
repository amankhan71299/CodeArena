import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null, // Required by BullMQ
  // password: process.env.REDIS_PASSWORD || '',
};

export const connection = new Redis(redisOptions);

connection.on('error', (err) => {
  console.error('[Redis] Connection Error:', err.message);
});
connection.on('connect', () => {
  console.log('[Redis] Connected Successfully');
});
