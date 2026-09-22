import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis('redis://localhost:6379');
const queue = new Queue('submissionQueue', { connection });

async function flush() {
  await queue.obliterate({ force: true });
  console.log('Queue flushed.');
  process.exit(0);
}
flush();
