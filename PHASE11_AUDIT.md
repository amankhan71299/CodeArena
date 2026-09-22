# Phase 11: Security & Stability Audit

## 1. IDOR in User Registration (Privilege Escalation)
- **Severity:** Critical
- **File:** `backend/src/controllers/auth.controller.js`
- **Problem:** The `register` function allows the client to pass `{ "role": "admin" }` in the request body, which directly assigns the admin role to the newly created user.
- **Security/functional impact:** Any unauthenticated attacker can create an admin account and gain full control over the application (problems, contests, moderation, editorial generation).
- **Fix:** Strip the `role` field from `req.body` during registration and enforce `role: 'student'` exclusively for public registration.
- **Verification:** Attempt to register with `{ "role": "admin" }` and verify that the resulting user has `role: 'student'`.

## 2. Missing Rate Limiting on Code Execution
- **Severity:** High
- **File:** `backend/src/routes/submission.routes.js`
- **Problem:** The endpoints `POST /` (Submit) and `POST /run` (Run) do not have any rate limiters applied.
- **Security/functional impact:** An attacker can spam thousands of execution requests per second, overwhelming the BullMQ worker queue and exhausting the host's Docker daemon and CPU resources, causing a complete Denial of Service.
- **Fix:** Apply a strict Redis-based rate limit (e.g., 5 requests per 60 seconds) to the submission routes.
- **Verification:** Run a rapid loop of 10 requests to `/api/submissions/run` and verify that the server returns `429 Too Many Requests` after the 5th request.

## 3. Missing Index for Global Leaderboard
- **Severity:** Medium
- **File:** `backend/src/models/User.js`
- **Problem:** The global leaderboard sorts by `globalScore: -1, problemsSolvedCount: -1, createdAt: 1`, but there is no compound index covering these fields.
- **Security/functional impact:** As the userbase grows, loading the leaderboard will trigger a full collection scan (COLLSCAN) in MongoDB, leading to degraded performance and potential database exhaustion.
- **Fix:** Add a compound index `UserSchema.index({ globalScore: -1, problemsSolvedCount: -1, createdAt: 1 })` to the User schema.
- **Verification:** Check MongoDB explain plans or verify the index is created in the database schema.

## 4. Hardcoded API URL in Frontend Leaderboard
- **Severity:** Low
- **File:** `frontend/src/app/leaderboard/page.js`
- **Problem:** The leaderboard page fetches data from `http://localhost:5000/api/leaderboard` directly, bypassing the Next.js API proxy (`/api/leaderboard`).
- **Security/functional impact:** In a production environment where the backend is hosted elsewhere, this fetch will fail due to CORS or connection refused errors.
- **Fix:** Change the fetch URL to `/api/leaderboard`.
- **Verification:** Run `npm run build` and test the deployed frontend to ensure leaderboard data loads via relative path proxying.
