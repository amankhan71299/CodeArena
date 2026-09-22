import fetch from 'node-fetch';

async function testPhase2() {
  const API = 'http://localhost:5000/api';
  
  console.log('1. Registering admin user...');
  let res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin_test', email: 'admin@test.com', password: 'password', role: 'admin' })
  });
  
  if (res.status === 400) {
    console.log('User might exist, trying to login...');
    res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@test.com', password: 'password' })
    });
  }
  
  const rawCookie = res.headers.raw()['set-cookie'];
  const cookie = rawCookie ? rawCookie[0].split(';')[0] : '';
  console.log('Admin cookie:', cookie ? 'Obtained' : 'Failed');

  console.log('\n2. Creating a problem as Admin...');
  const problemData = {
    title: 'Two Sum Phase 2 Test',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    difficulty: 'Easy',
    topics: ['Array', 'Hash Table'],
    constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9'],
    examples: [
      { input: '[2,7,11,15]\n9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' }
    ],
    testCases: [
      { input: '[3,2,4]\n6', expectedOutput: '[1,2]', hidden: false },
      { input: '[3,3]\n6', expectedOutput: '[0,1]', hidden: true } // THIS SHOULD BE HIDDEN
    ],
    timeLimit: 1000,
    memoryLimit: 256,
    supportedLanguages: ['javascript', 'python']
  };

  let createRes = await fetch(`${API}/admin/problems`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify(problemData)
  });
  
  const createdProblem = await createRes.json();
  console.log('Create Problem Status:', createRes.status);
  console.log('Created Problem Slug:', createdProblem.slug);

  console.log('\n3. Verifying normal user (no cookie) gets 403 on admin route...');
  let adminGetRes = await fetch(`${API}/admin/problems`);
  console.log('Unauthorized Admin GET Status:', adminGetRes.status, '(Expected 401/403)');

  console.log('\n4. Verifying Student API does NOT leak hidden test cases...');
  let studentGetRes = await fetch(`${API}/problems/${createdProblem.slug}`);
  const studentData = await studentGetRes.json();
  
  console.log('Student GET Status:', studentGetRes.status);
  console.log('Total Test Cases Received by Student:', studentData.testCases?.length);
  console.log('Student Test Cases Content:', JSON.stringify(studentData.testCases));
  
  const hasHidden = studentData.testCases?.some(tc => tc.hidden === true);
  console.log('Are there any hidden test cases leaked?', hasHidden ? 'YES (FAIL)' : 'NO (PASS)');
}

testPhase2().catch(console.error);
