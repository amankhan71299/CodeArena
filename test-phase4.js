
const API_BASE = 'http://localhost:5000/api';

async function loginUser(email, password) {
  await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'TestUser_' + Date.now(), email, password, role: 'student' })
  });
  
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (!res.ok) throw new Error('Login failed for test user');
  return res.headers.get('set-cookie');
}

async function runCode(problemId, language, sourceCode, cookies) {
  const res = await fetch(`${API_BASE}/submissions/run`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookies 
    },
    body: JSON.stringify({ problemId, language, sourceCode })
  });
  return await res.json();
}

async function runAllTests() {
  console.log('--- STARTING PHASE 4 TESTS ---');
  try {
    const rand = Math.floor(Math.random() * 100000);
    const cookies = await loginUser(`testuser_${rand}@example.com`, 'password123');
    
    const probRes = await fetch(`${API_BASE}/problems`);
    const probs = await probRes.json();
    const problem = probs[0];
    const problemId = problem._id;
    console.log(`Using problem: ${problem.title}`);

    const cheatCode = `
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim();
if (!input) return;
const lines = input.split('\\n');
if (lines.length < 2) return;
const arr = JSON.parse(lines[0]);
const target = parseInt(lines[1]);
const map = new Map();
for (let i = 0; i < arr.length; i++) {
  const diff = target - arr[i];
  if (map.has(diff)) {
    console.log(JSON.stringify([map.get(diff), i]));
    return;
  }
  map.set(arr[i], i);
}
`;

    const TESTS = [
      {
        name: 'Normal Code (ACCEPTED)',
        code: cheatCode,
        expectedStatus: 'ACCEPTED'
      },
      {
        name: 'Infinite Loop (TIME_LIMIT_EXCEEDED)',
        code: `while(true) {}`,
        expectedStatus: 'TIME_LIMIT_EXCEEDED'
      },
      {
        name: 'Memory Exhaustion (MEMORY_LIMIT_EXCEEDED)',
        code: `const a = []; while(true) { a.push(new Array(1000000).fill(1)); }`,
        expectedStatus: 'MEMORY_LIMIT_EXCEEDED'
      },
      {
        name: 'Output Flooding (RUNTIME_ERROR - Output Limit)',
        code: `setInterval(() => console.log('A'.repeat(100000)), 1);`,
        expectedStatus: 'RUNTIME_ERROR', 
        checkOutput: (msg) => msg && msg.includes('Output Limit Exceeded')
      },
      {
        name: 'Network Attack (TIME_LIMIT_EXCEEDED or RUNTIME_ERROR)',
        code: `
fetch('http://google.com').then(()=>console.log('connected')).catch(()=>process.exit(1));
setInterval(()=>{}, 1000);
        `,
        expectedStatus: ['RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED']
      },
      {
        name: 'Host Filesystem Access (RUNTIME_ERROR)',
        code: `const fs = require('fs');
try {
  // Attempt to read the host backend server directory
  fs.readFileSync('/var/run/docker.sock', 'utf8');
  console.log('Success');
} catch(e) {
  process.exit(1);
}`,
        expectedStatus: 'RUNTIME_ERROR'
      },
      {
        name: 'Syntax Error (RUNTIME_ERROR)',
        code: `function() { syntax error }`,
        expectedStatus: 'RUNTIME_ERROR'
      },
      {
        name: 'Process/Fork Limit (RUNTIME_ERROR)',
        code: `const { spawn } = require('child_process');
for(let i=0; i<100; i++) {
  spawn('sleep', ['10']);
}`,
        expectedStatus: 'RUNTIME_ERROR'
      }
    ];

    let passed = 0;

    for (const test of TESTS) {
      console.log(`\nRunning: ${test.name}`);
      const result = await runCode(problemId, 'javascript', test.code, cookies);
      
      let testPassed = false;
      if (Array.isArray(test.expectedStatus)) {
        testPassed = test.expectedStatus.includes(result.status);
      } else {
        testPassed = (result.status === test.expectedStatus);
      }

      if (testPassed && test.checkOutput) {
        testPassed = test.checkOutput(result.errorMessage);
      }
      
      console.log(`Expected: ${test.expectedStatus}, Got: ${result.status}`);
      if (result.errorMessage) console.log(`Error Message: ${result.errorMessage.slice(0, 80).replace(/\\n/g, ' ')}...`);
      
      if (testPassed) {
        console.log(`Result: PASS ✅`);
        passed++;
      } else {
        console.log(`Result: FAIL ❌`);
      }
    }
    
    console.log(`\nFinal Score: ${passed}/${TESTS.length} Tests Passed`);
    
  } catch (err) {
    console.error('Test Suite Error:', err);
  }
}

runAllTests();
