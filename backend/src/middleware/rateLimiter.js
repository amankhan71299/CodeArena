import { connection } from '../config/redis.js';

/**
 * Creates a rate limiter middleware
 * @param {string} prefix - Redis key prefix
 * @param {number} limit - Max requests per window
 * @param {number} windowSec - Window size in seconds
 */
export const rateLimit = (prefix, limit = 10, windowSec = 60) => {
  return async (req, res, next) => {
    try {
      // Use user ID if authenticated, else IP address
      const identifier = req.user ? req.user.id : req.ip;
      const key = `ratelimit:${prefix}:${identifier}`;

      const current = await connection.incr(key);
      if (current === 1) {
        // Set expiry on first request in the window
        await connection.expire(key, windowSec);
      }

      if (current > limit) {
        return res.status(429).json({ error: 'Too many requests, please try again later.' });
      }

      next();
    } catch (error) {
      console.error('[RateLimiter Error]:', error);
      // Fail open if Redis fails, so we don't break normal browsing
      next();
    }
  };
};
