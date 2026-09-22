import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getPublishedContests,
  getContestBySlug,
  joinContest,
  getParticipant,
  getContestRanking
} from '../controllers/contest.controller.js';

const router = Router();

// Public routes (none yet, all require auth in Phase 7 context)

// Authenticated routes
router.use(authenticate);

router.get('/', getPublishedContests);
router.get('/:slug', getContestBySlug);
router.post('/:id/join', joinContest);
router.get('/:id/participant', getParticipant);
router.get('/:id/ranking', getContestRanking);

export default router;
