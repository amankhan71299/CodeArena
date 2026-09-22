import User from '../models/User.js';
import { connection as redisClient } from '../config/redis.js';

const LEADERBOARD_CACHE_KEY = 'global_leaderboard';

export const getGlobalLeaderboard = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    
    // Only cache the first page since it's the most hit
    const useCache = page === 1 && limit === 50;
    
    if (useCache) {
      const cached = await redisClient.get(LEADERBOARD_CACHE_KEY);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    }

    const skip = (page - 1) * limit;

    const rankableFilter = { 
      $or: [
        { globalScore: { $gt: 0 } }, 
        { problemsSolvedCount: { $gt: 0 } }
      ] 
    };

    const totalUsers = await User.countDocuments(rankableFilter);
    
    // Sort by globalScore DESC, problemsSolvedCount DESC, createdAt ASC
    const users = await User.find(rankableFilter)
      .select('username globalScore problemsSolvedCount avatar')
      .sort({ globalScore: -1, problemsSolvedCount: -1, createdAt: 1 })
      .skip(skip)
      .limit(limit);

    const result = {
      users: users.map((u, index) => ({
        rank: skip + index + 1,
        username: u.username,
        globalScore: u.globalScore,
        problemsSolvedCount: u.problemsSolvedCount,
        avatar: u.avatar
      })),
      page,
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers
    };

    if (useCache) {
      // Cache for 5 minutes (300 seconds), also invalidated by submission job
      await redisClient.setex(LEADERBOARD_CACHE_KEY, 300, JSON.stringify(result));
    }

    res.json(result);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};
