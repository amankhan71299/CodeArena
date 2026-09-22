import fetch from 'node-fetch';
import { execSync } from 'child_process';

const API_BASE = 'http://localhost:5000/api';
const MONGO_URI = 'mongodb://admin:secret@localhost:27017/codearena?authSource=admin';

async function loginUser(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  const cookies = res.headers.raw()['set-cookie'];
  if (!cookies) throw new Error('Login failed: ' + data.error);
  return cookies.map(c => c.split(';')[0]).join('; ');
}

async function runTests() {
  console.log('--- STARTING PHASE 8 TESTS ---');
  
  const rand = Math.floor(Math.random() * 100000);
  const username = `TestUser8_${rand}`;
  const email = `testuser8_${rand}@example.com`;
  const password = 'password123';

  // 1. Create User
  await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  
  execSync(`node make-admin.js "${email}"`, { cwd: './backend' });

  const cookies = await loginUser(email, password);

  // 2. Create Problem
  const probRes = await fetch(`${API_BASE}/admin/problems`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookies },
    body: JSON.stringify({
      title: `Phase 8 Test Problem ${rand}`,
      description: 'Test problem',
      difficulty: 'Medium', // Should give 30 points
      timeLimit: 1000,
      memoryLimit: 128,
      supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
      testCases: [
        { input: '[3,2,4]', expectedOutput: '[1,2]', hidden: false }
      ]
    })
  });
  const problem = await probRes.json();
  const problemId = problem._id;
  
  // 3. Test Profile API (before solve)
  let profRes = await fetch(`${API_BASE}/users/${username}`);
  let profile = await profRes.json();
  console.log(`Initial Profile -> Score: ${profile.globalScore}, Solved: ${profile.problemsSolvedCount}`);
  if (profile.globalScore !== 0) throw new Error('Initial score not 0');
  
  // 4. Update Profile Settings
  await fetch(`${API_BASE}/users/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookies },
    body: JSON.stringify({ bio: 'I am testing Phase 8', avatar: 'http://example.com/avatar.png' })
  });
  
  profRes = await fetch(`${API_BASE}/users/${username}`);
  profile = await profRes.json();
  if (profile.bio !== 'I am testing Phase 8') throw new Error('Bio not updated');
  console.log('Profile settings update: PASS ✅');

  // 5. Submit Wrong Answer
  await fetch(`${API_BASE}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookies },
    body: JSON.stringify({ problemId, sourceCode: 'console.log("wrong");', language: 'javascript' })
  });
  
  // Wait a bit for worker
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  profRes = await fetch(`${API_BASE}/users/${username}`);
  profile = await profRes.json();
  console.log(`Score after WRONG_ANSWER -> Score: ${profile.globalScore}`);
  if (profile.globalScore !== 0) throw new Error('Score incorrectly updated on WRONG_ANSWER');

  // 6. Submit Accepted
  await fetch(`${API_BASE}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookies },
    body: JSON.stringify({ problemId, sourceCode: 'console.log("[1,2]");', language: 'javascript' })
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  profRes = await fetch(`${API_BASE}/users/${username}`);
  profile = await profRes.json();
  console.log(`Score after ACCEPTED -> Score: ${profile.globalScore}, Solved: ${profile.problemsSolvedCount}`);
  if (profile.globalScore !== 30) throw new Error('Score not updated to 30 on ACCEPTED');
  if (profile.problemsSolvedCount !== 1) throw new Error('problemsSolvedCount not updated to 1 on ACCEPTED');

  // 7. Submit Duplicate Accepted (Idempotency)
  await fetch(`${API_BASE}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookies },
    body: JSON.stringify({ problemId, sourceCode: 'console.log("[1,2]");', language: 'javascript' })
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  profRes = await fetch(`${API_BASE}/users/${username}`);
  profile = await profRes.json();
  console.log(`Score after DUPLICATE ACCEPTED -> Score: ${profile.globalScore}`);
  if (profile.globalScore !== 30) throw new Error('Idempotency failed: score increased again');
  
  // 8. Test Submissions API
  const subRes = await fetch(`${API_BASE}/users/${username}/submissions`);
  const submissions = await subRes.json();
  if (submissions.length !== 3) throw new Error(`Expected 3 submissions, got ${submissions.length}`);
  if (submissions[0].sourceCode) throw new Error('Source code leaked in public profile endpoint');
  console.log('Submission History API: PASS ✅');

  // 9. Test Leaderboard Cache Invalidation
  const leadRes = await fetch(`${API_BASE}/leaderboard`);
  const leaderboard = await leadRes.json();
  const leaderUser = leaderboard.users.find(u => u.username === username);
  if (!leaderUser) throw new Error('User not found in leaderboard');
  if (leaderUser.globalScore !== 30) throw new Error('Leaderboard score stale');
  console.log('Leaderboard Cache & API: PASS ✅');

  console.log('--- ALL PHASE 8 TESTS PASSED ✅ ---');
  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
