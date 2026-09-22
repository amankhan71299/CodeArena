import { Router } from 'express';
import { getUserProfile, updateProfile, getUserSubmissions } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.get('/:username', getUserProfile);
router.get('/:username/submissions', getUserSubmissions);

// Protected routes
router.put('/profile', authenticate, updateProfile);

export default router;
