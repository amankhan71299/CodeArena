import express from 'express';
import { explain, hint, debug, review, adminGenerateEditorial, recommendations, chatController } from '../controllers/ai.controller.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.middleware.js';
import { rateLimit } from '../middleware/rateLimiter.js';

const router = express.Router();

// Rate limits: 20 requests per 60 seconds for AI endpoints to prevent abuse and API quota limits
const aiRateLimit = rateLimit('ai_endpoint', 20, 60);

// Student AI Endpoints
router.post('/explain', authenticate, aiRateLimit, explain);
router.post('/hint', authenticate, aiRateLimit, hint);
router.post('/debug', authenticate, aiRateLimit, debug);
router.post('/review', authenticate, aiRateLimit, review);
router.post('/chat', authenticate, aiRateLimit, chatController);
router.get('/recommendations', authenticate, rateLimit('ai_recommend', 10, 60), recommendations);

// Admin AI Endpoints
router.post('/admin/problems/:id/editorial/generate', authenticate, authorizeAdmin, aiRateLimit, adminGenerateEditorial);

export default router;
