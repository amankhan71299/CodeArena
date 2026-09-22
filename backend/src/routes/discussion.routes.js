import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { rateLimit } from '../middleware/rateLimiter.js';
import {
  getDiscussionsByProblem,
  createDiscussion,
  getDiscussionById,
  updateDiscussion,
  deleteDiscussion,
  createReply,
  updateReply,
  deleteReply,
  toggleLike,
  reportContent
} from '../controllers/discussion.controller.js';

const router = Router();

// Publicly readable
router.get('/problem/:problemId', getDiscussionsByProblem);
router.get('/:id', getDiscussionById);

// Protected routes
router.use(authenticate);

// Limit discussion creation
router.post('/problem/:problemId', rateLimit('discussion:create', 5, 60), createDiscussion);

// Update/Delete discussion
router.put('/:id', updateDiscussion);
router.delete('/:id', deleteDiscussion);

// Reply creation
router.post('/:id/replies', rateLimit('reply:create', 10, 60), createReply);

// Update/Delete replies
router.put('/replies/:id', updateReply);
router.delete('/replies/:id', deleteReply);

// Likes
router.post('/:id/like', rateLimit('like', 30, 60), toggleLike);

// Reporting
router.post('/:id/report', rateLimit('report', 5, 60), reportContent('Discussion'));
router.post('/replies/:id/report', rateLimit('report', 5, 60), reportContent('DiscussionReply'));

export default router;
