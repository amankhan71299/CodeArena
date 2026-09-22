# CodeArena Production Deployment Guide

This document outlines the step-by-step process required to deploy the CodeArena platform to a production environment.

## 1. Required Infrastructure

To run CodeArena in production, you will need the following infrastructure components:

- **Node.js**: Minimum v18+ for both frontend and backend.
- **MongoDB**: A dedicated MongoDB instance (v5+ recommended).
- **Redis**: A Redis instance for rate limiting, PubSub, and BullMQ task queues.
- **Docker**: The backend Code Execution Sandbox requires a Docker daemon.
- **Worker Environment**: The worker node *must* be running on a Linux-compatible Docker environment to support strict security profiles (resource limits, read-only filesystems, capacity dropping). Docker Desktop on Windows/macOS is strictly for development and cannot provide guaranteed production-grade sandbox security.

## 2. Environment Variables Checklist

### Backend Configuration (`backend/.env`)

```ini
NODE_ENV=production
PORT=5000

# Database Connections
MONGO_URI=mongodb://username:password@your-mongo-host:27017/codearena
REDIS_URL=redis://your-redis-host:6379

# Security & Integrations
JWT_SECRET=your_super_secret_jwt_key_here
CLIENT_URL=https://codearena.your-domain.com

# AI Features (Optional)
AI_API_KEY=your_gemini_api_key
```
*Note: The backend enforces fail-fast validation in production. If `MONGO_URI`, `REDIS_URL`, `JWT_SECRET`, or `CLIENT_URL` are missing, the server will crash safely on startup.*

### Frontend Configuration (`frontend/.env`)

```ini
NEXT_PUBLIC_API_URL=https://api.codearena.your-domain.com
```

## 3. Local Production-Like Setup

If you want to test the production configuration locally, you can use the following approach:

1. Copy `.env.example` to `.env` in both `frontend` and `backend`.
2. Ensure Docker Desktop is running (for Redis/MongoDB containers if you don't have them installed natively).
3. Follow the build steps below, but run `export NODE_ENV=production` first.

## 4. Backend Build & Start Commands

Navigate to the `backend/` directory:

```bash
cd backend
npm install --production

# Start the API server
NODE_ENV=production npm start
```

## 5. Worker Start Commands

The BullMQ execution worker processes sandboxed code submissions.

Navigate to the `backend/` directory:

```bash
cd backend

# Start the worker process
NODE_ENV=production npm run worker
```
*(Ensure the environment running this command has access to the `docker` CLI daemon).*

## 6. Frontend Build & Start Commands

Navigate to the `frontend/` directory:

```bash
cd frontend
npm install

# Compile the optimized production build
npm run build

# Start the Next.js server
npm start
```

## 7. Health-Check Verification

The backend exposes a health-check endpoint at `/health`.

You can verify the backend and database connection status via:
```bash
curl -i https://api.codearena.your-domain.com/health
```
If the database connection is lost, this endpoint will gracefully report a 503 HTTP status.

## 8. Docker Sandbox Requirements

The CodeArena code execution engine spawns isolated Docker containers. 
- Ensure that the images `node:22-alpine`, `python:3.12-alpine`, `gcc:14-bookworm`, and `eclipse-temurin:21-jdk-alpine` are pulled onto the worker node.
- The daemon should allow dropping kernel capabilities and mounting tmpfs.

## 9. Production Troubleshooting & Security

**Security Checklist:**
- Verify `.env` files are not publicly exposed.
- Verify the backend server is running behind a reverse proxy (e.g., NGINX) enforcing HTTPS/TLS.
- Verify `JWT_SECRET` is at least 64 random characters.
- Do NOT expose the Redis or MongoDB ports directly to the open internet; restrict access to internal application VPCs.
