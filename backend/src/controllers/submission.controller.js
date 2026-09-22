import { Queue, QueueEvents } from 'bullmq';
import Submission from '../models/Submission.js';
import Problem from '../models/Problem.js';
import Contest from '../models/Contest.js';
import ContestParticipant from '../models/ContestParticipant.js';
import { connection as redisConnection } from '../config/redis.js';
import Redis from 'ioredis';

const pubClient = new Redis(process.env.REDIS_URI || 'redis://localhost:6379');
const submissionQueue = new Queue('submissionQueue', { connection: redisConnection });
const queueEvents = new QueueEvents('submissionQueue', { connection: redisConnection });

export const runSubmission = async (req, res) => {
  try {
    const { problemId, language, sourceCode } = req.body;
    
    if (!problemId || !language || !sourceCode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (sourceCode.length > 50000) {
      return res.status(400).json({ error: 'Source code exceeds maximum allowed size (50KB)' });
    }
    
    const problem = await Problem.findById(problemId);
    if (!problem || problem.archived) {
      return res.status(400).json({ error: 'Invalid or archived problem' });
    }
    
    if (!problem.supportedLanguages.includes(language)) {
      return res.status(400).json({ error: `Language '${language}' is not supported for this problem.` });
    }
    
    // For RUN, we want immediate results. We can enqueue it, wait for completion, and return it.
    // In a high traffic environment, WebSockets are better, but for Phase 4 we will block and wait for BullMQ.
    const job = await submissionQueue.add('run', {
      problemId,
      language,
      sourceCode,
      isRun: true,
      visibleOnly: true
    });
    
    // Wait for the job to complete (Timeout after 15s to be safe)
    try {
      const result = await job.waitUntilFinished(queueEvents, 15000);
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ error: 'Run timed out or failed in queue.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error processing run' });
  }
};

export const createSubmission = async (req, res) => {
  try {
    const { problemId, language, sourceCode, contestId } = req.body;
    const userId = req.user.id;

    if (!problemId || !language || !sourceCode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (sourceCode.length > 50000) {
      return res.status(400).json({ error: 'Source code exceeds maximum allowed size (50KB)' });
    }

    // 1. Validate the problem exists and is not archived
    const problem = await Problem.findById(problemId);
    if (!problem || problem.archived) {
      return res.status(400).json({ error: 'Invalid or archived problem' });
    }

    // 2. Validate the language against problem.supportedLanguages
    if (!problem.supportedLanguages.includes(language)) {
      return res.status(400).json({ error: `Language '${language}' is not supported for this problem.` });
    }

    // 2.5 Contest Validation
    let finalContestId = null;
    if (contestId) {
      const contest = await Contest.findById(contestId);
      if (!contest || !contest.published || contest.archived) {
        return res.status(400).json({ error: 'Invalid or unavailable contest' });
      }
      if (contest.status !== 'RUNNING') {
        return res.status(400).json({ error: 'Contest is not currently running' });
      }
      
      const participant = await ContestParticipant.findOne({ contest: contestId, user: userId });
      if (!participant) {
        return res.status(403).json({ error: 'You are not registered for this contest' });
      }

      const isProblemInContest = contest.problems.some(p => p.problem.toString() === problemId);
      if (!isProblemInContest) {
        return res.status(400).json({ error: 'Problem does not belong to this contest' });
      }
      
      finalContestId = contestId;
    }

    // 3. Create submission with QUEUED status
    const submission = new Submission({
      user: userId,
      problem: problemId,
      contest: finalContestId,
      language,
      sourceCode,
      status: 'QUEUED',
      totalTestCases: problem.testCases.length
    });

    await submission.save();

    // 4. Dispatch job to Redis Queue
    await submissionQueue.add('submit', {
      submissionId: submission._id,
      problemId: problem._id,
      language,
      sourceCode,
      isRun: false
    });

    pubClient.publish('submission-events', JSON.stringify({
      submissionId: submission._id,
      userId: userId,
      event: 'submission:queued',
      payload: {
        submissionId: submission._id,
        status: 'QUEUED'
      }
    })).catch(err => console.error('Error emitting queued event', err));

    res.status(201).json({
      id: submission._id,
      status: submission.status,
      message: 'Submission queued successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error creating submission' });
  }
};

export const getProblemSubmissions = async (req, res) => {
  try {
    const { problemId } = req.params;
    const userId = req.user.id;

    // Fetch submissions for this user and this problem, EXCLUDING sourceCode
    const submissions = await Submission.find({ problem: problemId, user: userId })
      .select('-sourceCode')
      .sort({ submittedAt: -1 })
      .limit(20);

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching submissions' });
  }
};

export const getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const submission = await Submission.findById(id);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Security: Enforce ownership
    if (submission.user.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied: You do not own this submission' });
    }

    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
};

export const getMySolvedProblems = async (req, res) => {
  try {
    const userId = req.user.id;
    const submissions = await Submission.find({ user: userId, status: 'ACCEPTED' }).select('problem').lean();
    
    // Extract unique problem IDs
    const solvedProblemIds = [...new Set(submissions.map(s => s.problem.toString()))];
    
    res.json(solvedProblemIds);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch solved problems' });
  }
};
