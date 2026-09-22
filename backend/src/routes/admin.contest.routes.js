import { Router } from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth.middleware.js';
import {
  getContests,
  getContestById,
  createContest,
  updateContest,
  publishContest,
  archiveContest,
  addProblemToContest,
  removeProblemFromContest,
  finalizeContest
} from '../controllers/admin.contest.controller.js';

const router = Router();

// ALL admin contest routes require authentication AND admin authorization
router.use(authenticate, authorizeAdmin);

router.get('/', getContests);
router.post('/', createContest);
router.get('/:id', getContestById);
router.put('/:id', updateContest);
router.post('/:id/publish', publishContest);
router.post('/:id/archive', archiveContest);
router.post('/:id/finalize', finalizeContest);
router.post('/:id/problems', addProblemToContest);
router.delete('/:id/problems/:problemId', removeProblemFromContest);

export default router;
