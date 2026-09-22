import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import * as cookie from 'cookie';
import Submission from './models/Submission.js';
import Redis from 'ioredis';

let io;
let subClient;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [process.env.CLIENT_URL || 'http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true
    }
  });

  // Authentication Middleware
  io.use((socket, next) => {
    try {
      const cookieHeader = socket.request.headers.cookie;
      if (!cookieHeader) {
        console.error('[Socket.IO] Authentication failed: No cookie header provided');
        return next(new Error('Authentication required'));
      }

      console.log('[Socket.IO] Socket handshake received');

      const cookies = cookie.parseCookie(cookieHeader);
      const token = cookies.token;

      if (!token) {
        console.error('[Socket.IO] Authentication failed: No token in cookie');
        return next(new Error('Authentication required'));
      }

      if (!process.env.JWT_SECRET) {
        console.error('[Socket.IO] Authentication failed: JWT_SECRET is missing');
        throw new Error('JWT_SECRET is missing from environment variables');
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // attach user to socket
      console.log('[Socket.IO] Socket authentication: success for user', socket.user.id);
      next();
    } catch (error) {
      console.error('[Socket.IO] Authentication failed (JWT Error):', error.message);
      return next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log('[Socket.IO] Client connected:', socket.id);
    // Automatically join user-specific room
    socket.join(`user:${socket.user.id}`);

    socket.on('join_submission', async ({ submissionId }, callback) => {
      try {
        if (!submissionId || typeof submissionId !== 'string') {
          return callback && callback({ error: 'Invalid submissionId' });
        }

        const submission = await Submission.findById(submissionId);
        
        if (!submission) {
          return callback && callback({ error: 'Submission not found' });
        }

        // Verify ownership
        if (submission.user.toString() !== socket.user.id) {
          return callback && callback({ error: 'Access denied' });
        }

        const room = `submission:${submissionId}`;
        socket.join(room);
        
        if (callback) callback({ success: true, joined: room });
      } catch (error) {
        if (callback) callback({ error: 'Server error joining room' });
      }
    });
  });

  // Setup Redis PubSub to listen to worker events
  subClient = new Redis(process.env.REDIS_URI || 'redis://localhost:6379');
  subClient.subscribe('submission-events', (err) => {
    if (err) {
      console.error('Redis PubSub subscription failed:', err);
    }
  });

  subClient.on('message', (channel, message) => {
    if (channel === 'submission-events') {
      try {
        const data = JSON.parse(message);
        if (data.event === 'submission:queued' && data.userId) {
          io.to(`user:${data.userId}`).emit(data.event, data.payload);
        } else if (data.submissionId && data.event) {
          // Broadcast only to the specific submission room
          io.to(`submission:${data.submissionId}`).emit(data.event, data.payload);
        }
      } catch (err) {
        console.error('Failed to parse socket event from redis', err);
      }
    }
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
