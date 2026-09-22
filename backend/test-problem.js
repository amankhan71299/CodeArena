import mongoose from 'mongoose';
import Problem from './src/models/Problem.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const p = new Problem({
    title: 'Test Func',
    slug: 'test-func',
    description: 'test',
    difficulty: 'Easy',
    testCases: [{ input: '1', expectedOutput: '1' }],
    timeLimit: 1000,
    memoryLimit: 256,
    supportedLanguages: ['java'],
    functionSignature: {
      functionName: 'testFunc',
      returnType: 'int',
      parameters: []
    }
  });

  await p.save();
  console.log('Saved problem', p);
  await mongoose.disconnect();
}

run().catch(console.error);
