import mongoose from 'mongoose';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import Submission from '../models/Submission.js';
import Problem from '../models/Problem.js';
import Contest from '../models/Contest.js';
import User from '../models/User.js';
import ContestParticipant from '../models/ContestParticipant.js';
import { executeInSandbox, compileInSandbox, getLanguageConfig } from '../sandbox/docker.js';
import { generateJavaWrapper } from '../sandbox/javaWrapper.js';
import Redis from 'ioredis';

const pubClient = new Redis(process.env.REDIS_URI || 'redis://localhost:6379');

const emitEvent = (submissionId, eventName, payload) => {
  if (!submissionId) return;
  pubClient.publish('submission-events', JSON.stringify({
    submissionId,
    event: eventName,
    payload
  })).catch(err => console.error('Error publishing event:', err));
};

export const processSubmissionJob = async (job) => {
  const { submissionId, problemId, sourceCode, language, isRun, visibleOnly } = job.data;
  
  let submission = null;
  
  if (!isRun) {
    submission = await Submission.findById(submissionId);
    if (!submission) throw new Error('Submission not found');
    if (submission.status !== 'QUEUED') return; // Idempotency check
    
    submission.status = 'RUNNING';
    await submission.save();
    emitEvent(submissionId, 'submission:running', {
      submissionId,
      status: 'RUNNING'
    });
  }
  
  const problem = await Problem.findById(problemId);
  if (!problem) throw new Error('Problem not found');
  
  // Decide which test cases to run
  let testCasesToRun = problem.testCases;
  if (isRun && visibleOnly) {
    testCasesToRun = problem.testCases.filter(tc => !tc.hidden);
  }

  // Setup temporary directory
  const uuid = uuidv4();
  const tmpDir = path.join(os.tmpdir(), 'codearena', uuid);
  await fs.mkdir(tmpDir, { recursive: true });
  
  const config = getLanguageConfig(language);
  const sourceFile = path.join(tmpDir, config.filename);
  
  let finalSourceCode = sourceCode;
  if (language === 'java' && problem.functionSignature && problem.functionSignature.functionName) {
    const wrapper = generateJavaWrapper(problem.functionSignature);
    finalSourceCode = sourceCode + '\n' + wrapper;
  }
  
  await fs.writeFile(sourceFile, finalSourceCode, 'utf8');
  
  let testCasesPassed = 0;
  let finalStatus = 'ACCEPTED';
  let totalTime = 0;
  let maxMemory = 0;
  let firstErrorMessage = null;
  let executionResults = [];

  try {
    // 1. Compilation Stage (if needed)
    if (config.compileCommand) {
      const compileResult = await compileInSandbox({
        codeDir: tmpDir,
        language,
        timeLimit: problem.timeLimit,
        memoryLimit: problem.memoryLimit
      });

      if (compileResult.status !== 'ACCEPTED') {
        finalStatus = 'COMPILATION_ERROR';
        firstErrorMessage = compileResult.stderr || 'Compilation failed';
        
        // Skip execution stage
        testCasesToRun = []; 
      }
    }

    // 2. Execution Stage
    for (const tc of testCasesToRun) {
      const startTime = Date.now();
      
      const result = await executeInSandbox({
        codeDir: tmpDir,
        language,
        input: tc.input,
        timeLimit: problem.timeLimit,
        memoryLimit: problem.memoryLimit
      });
      
      const execTime = Date.now() - startTime;
      totalTime += execTime;
      // Note: precise memory usage is hard to track without a separate daemon polling docker stats.
      // We will estimate or leave blank for now unless it exceeded limits.

      if (result.status !== 'ACCEPTED') {
        finalStatus = result.status;
        firstErrorMessage = result.stderr || 'Runtime error or timeout.';
        
        // Map Java's native OOM exception to MEMORY_LIMIT_EXCEEDED
        if (language === 'java' && firstErrorMessage.includes('java.lang.OutOfMemoryError')) {
          finalStatus = 'MEMORY_LIMIT_EXCEEDED';
        }
        
        break; // Stop at first failure
      }

      // Check Output Match
      const outTrimmed = result.stdout.trim();
      const expectedTrimmed = tc.expectedOutput.trim();
      
      if (outTrimmed !== expectedTrimmed) {
        finalStatus = 'WRONG_ANSWER';
        firstErrorMessage = `Expected: ${expectedTrimmed}\nGot: ${outTrimmed}`;
        
        if (isRun) {
          executionResults.push({
            input: tc.input,
            expectedOutput: expectedTrimmed,
            actualOutput: outTrimmed,
            passed: false
          });
        }
        break;
      }
      
      testCasesPassed++;
      if (isRun) {
        executionResults.push({
          input: tc.input,
          expectedOutput: expectedTrimmed,
          actualOutput: outTrimmed,
          passed: true
        });
      }

      if (!isRun && submissionId) {
        emitEvent(submissionId, 'submission:progress', {
          submissionId,
          status: 'RUNNING',
          testCasesPassed,
          totalTestCases: problem.testCases.length
        });
      }
    }
  } catch (error) {
    finalStatus = 'SYSTEM_ERROR';
    firstErrorMessage = error.message;
  } finally {
    // Clean up temporary workspace
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (e) {
      console.error('Failed to cleanup temp dir', e);
    }
  }

  // If this was a SUBMIT action, update the DB
  if (!isRun && submission) {
    submission.status = finalStatus;
    submission.testCasesPassed = testCasesPassed;
    submission.executionTime = totalTime;
    submission.errorMessage = firstErrorMessage;
    await submission.save();

    // PHASE 6.5: Contest Wrong Submission Tracking
    if (submission.contest && ['WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'RUNTIME_ERROR'].includes(finalStatus)) {
      try {
        const lockedWrongSub = await Submission.findOneAndUpdate(
          { _id: submission._id, countedAsWrong: { $ne: true } },
          { $set: { countedAsWrong: true } }
        );

        if (lockedWrongSub) {
          await ContestParticipant.findOneAndUpdate(
            { contest: submission.contest, user: submission.user },
            { $inc: { wrongSubmissionCount: 1 } },
            { upsert: true }
          );
        }
      } catch (err) {
        console.error('Failed to update wrong submission count:', err);
      }
    }
    
    // PHASE 7: Atomic Contest Scoring
    if (submission.contest && finalStatus === 'ACCEPTED') {
      try {
        const alreadySolved = await Submission.exists({
          contest: submission.contest,
          problem: submission.problem,
          user: submission.user,
          status: 'ACCEPTED',
          _id: { $ne: submission._id },
          submittedAt: { $lt: submission.submittedAt }
        });
        
        if (!alreadySolved) {
          // Atomically lock this submission to prevent double-counting on BullMQ retries
          const lockedSub = await Submission.findOneAndUpdate(
            { _id: submission._id, awardedContestPoints: { $ne: true } },
            { $set: { awardedContestPoints: true } }
          );

          if (lockedSub) {
            const contest = await Contest.findById(submission.contest);
            if (contest) {
              const contestProblem = contest.problems.find(p => p.problem.toString() === submission.problem.toString());
              const points = contestProblem ? contestProblem.points : 0;
              
              const minutesFromStart = Math.floor((submission.submittedAt.getTime() - contest.startTime.getTime()) / 60000);
              
              const wrongAttempts = await Submission.countDocuments({
                contest: submission.contest,
                problem: submission.problem,
                user: submission.user,
                status: { $in: ['WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILATION_ERROR'] },
                submittedAt: { $lt: submission.submittedAt }
              });
              
              const penalty = Math.max(0, minutesFromStart) + (wrongAttempts * 20);
              
              await ContestParticipant.findOneAndUpdate(
                { contest: submission.contest, user: submission.user },
                { $inc: { score: points, penalty: penalty, solvedCount: 1 } }
              );
            }
          }
        }
      } catch (err) {
        console.error('Failed to update contest score:', err);
      }
    }
    
    // PHASE 8: Atomic Global Scoring
    if (finalStatus === 'ACCEPTED' && !submission.contest) {
      try {
        const globalAlreadySolved = await Submission.exists({
          problem: submission.problem,
          user: submission.user,
          status: 'ACCEPTED',
          _id: { $ne: submission._id },
          submittedAt: { $lt: submission.submittedAt }
        });
        
        if (!globalAlreadySolved) {
          // Atomically lock this submission to prevent double-counting on BullMQ retries
          const lockedGlobalSub = await Submission.findOneAndUpdate(
            { _id: submission._id, awardedGlobalPoints: { $ne: true } },
            { $set: { awardedGlobalPoints: true } }
          );

          if (lockedGlobalSub) {
            let globalPoints = 10; // Default points
            const probDetails = await Problem.findById(submission.problem);
            if (probDetails) {
              if (probDetails.difficulty === 'Easy') globalPoints = 10;
              else if (probDetails.difficulty === 'Medium') globalPoints = 30;
              else if (probDetails.difficulty === 'Hard') globalPoints = 50;
            }
            
            await User.findByIdAndUpdate(
              submission.user,
              { $inc: { globalScore: globalPoints, problemsSolvedCount: 1 } }
            );
            
            // Invalidate Redis Leaderboard cache
            await pubClient.del('global_leaderboard').catch(err => console.error('Failed to invalidate cache:', err));
          }
        }
      } catch (err) {
        console.error('Failed to update global score:', err);
      }
    }
    
    if (finalStatus === 'SYSTEM_ERROR') {
      emitEvent(submissionId, 'submission:error', {
        submissionId,
        status: finalStatus,
        message: firstErrorMessage || 'Internal execution error'
      });
    } else {
      emitEvent(submissionId, 'submission:completed', {
        submissionId,
        status: finalStatus,
        testCasesPassed,
        totalTestCases: problem.testCases.length,
        executionTime: totalTime,
        memoryUsed: null // Not tracked precisely yet
      });
    }
    
    return submission;
  }
  
  // If this was a RUN action, return results directly (stored in BullMQ job result)
  if (isRun) {
    return {
      status: finalStatus,
      testCasesPassed,
      totalTestCases: testCasesToRun.length,
      executionTime: totalTime,
      errorMessage: firstErrorMessage,
      results: executionResults
    };
  }
};
