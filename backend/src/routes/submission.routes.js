import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { rateLimit } from '../middleware/rateLimiter.js';
import { 
  createSubmission, 
  getProblemSubmissions, 
  getSubmissionById,
  runSubmission,
  getMySolvedProblems
} from '../controllers/submission.controller.js';

const router = Router();

// ALL submission routes require authentication
router.use(authenticate);

const submissionRateLimit = rateLimit('submission', 10, 60);

router.post('/run', submissionRateLimit, runSubmission);
router.post('/', submissionRateLimit, createSubmission);
router.get('/me/solved', getMySolvedProblems);
router.get('/problem/:problemId', getProblemSubmissions);
router.get('/:id', getSubmissionById);

export default router;
