import { io } from 'socket.io-client';

const BASE_URL = 'http://localhost:5000';

async function registerUser(username, email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  const data = await res.json();
  const cookies = res.headers.get('set-cookie');
  return { ...data, cookies };
}

async function loginUser(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  const cookies = res.headers.get('set-cookie');
  return { ...data, cookies };
}

async function getProblem() {
  const res = await fetch(`${BASE_URL}/api/problems`);
  const data = await res.json();
  return Array.isArray(data) ? data[0] : (data.problems ? data.problems[0] : null);
}

async function submitCode(problemId, language, sourceCode, cookies) {
  const cookieStr = cookies || '';
  const res = await fetch(`${BASE_URL}/api/submissions`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookieStr
    },
    body: JSON.stringify({ problemId, language, sourceCode })
  });
  return res.json();
}

function createSocket(cookies) {
  const cookieStr = cookies || '';
  return io(BASE_URL, {
    extraHeaders: {
      Cookie: cookieStr
    }
  });
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  console.log('--- STARTING PHASE 6 TESTS ---');

  // 1. Setup
  const u1Email = `u1_${Date.now()}@test.com`;
  const u2Email = `u2_${Date.now()}@test.com`;
  
  const user1 = await registerUser(`SocketUser1_${Date.now()}`, u1Email, 'password123');
  const user2 = await registerUser(`SocketUser2_${Date.now()}`, u2Email, 'password123');
  
  const problem = await getProblem();
  if (!problem) {
    console.error('No problems found. Cannot run test.');
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;
  
  const assert = (condition, message) => {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  };

  // 2. Unauthenticated Socket
  const unauthSocket = createSocket(null);
  let unauthRejected = false;
  unauthSocket.on('connect_error', (err) => { unauthRejected = true; console.log('Unauth Err:', err.message); });
  await sleep(1000);
  assert(unauthRejected, 'Unauthenticated socket connection is rejected');
  unauthSocket.disconnect();

  // 3. Authenticated Sockets
  const socket1 = createSocket(user1.cookies);
  const socket2 = createSocket(user2.cookies);
  
  let s1Connected = false;
  socket1.on('connect', () => { s1Connected = true; });
  socket1.on('connect_error', (err) => { console.log('S1 Err:', err.message); });
  await sleep(1000);
  assert(s1Connected, 'Authenticated socket connects successfully');

  // 4. Attach listeners to catch events that fire quickly (like QUEUED)
  const events = [];
  socket1.on('submission:queued', (d) => events.push('queued'));
  socket1.on('submission:running', (d) => events.push('running'));
  socket1.on('submission:progress', (d) => events.push('progress'));
  socket1.on('submission:completed', (d) => {
    events.push('completed');
    if (d.sourceCode !== undefined) events.push('sourceCode leaked');
  });
  
  let userBEventReceived = false;
  socket2.on('submission:running', () => { userBEventReceived = true; });

  // 5. Submit code
  const sourceCode = 'console.log("hello");';
  const subRes = await submitCode(problem._id, 'javascript', sourceCode, user1.cookies);
  console.log('Submission Response:', subRes);
  assert(subRes.id, 'Submission created successfully');

  // 6. Join Room & Ownership Verification
  let joinResult1, joinResult2;
  
  socket1.emit('join_submission', { submissionId: subRes.id }, (res) => { joinResult1 = res; });
  socket2.emit('join_submission', { submissionId: subRes.id }, (res) => { joinResult2 = res; });
  
  await sleep(1000);
  
  assert(joinResult1?.success, 'User A can join User A\'s submission room');
  assert(joinResult2?.error === 'Access denied', 'User B is denied joining User A\'s submission room');

  // Wait for submission to complete
  await sleep(6000); 
  
  assert(events.includes('queued'), 'QUEUED event received');
  assert(events.includes('running'), 'RUNNING event received');
  assert(events.includes('completed'), 'COMPLETED event received');
  assert(!events.includes('sourceCode leaked'), 'No source code leaked in socket event');
  assert(!userBEventReceived, 'User B did not receive User A\'s submission events');

  socket1.disconnect();
  socket2.disconnect();

  console.log(`\nFinal Score: ${passed}/${passed + failed} Tests Passed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Test Suite Error:', e);
  process.exit(1);
});
