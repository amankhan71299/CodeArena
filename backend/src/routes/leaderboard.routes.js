import { Router } from 'express';
import { getGlobalLeaderboard } from '../controllers/leaderboard.controller.js';

const router = Router();

// Public route to view global leaderboard
router.get('/', getGlobalLeaderboard);

export default router;
