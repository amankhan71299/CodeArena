import fetch from 'node-fetch';

async function testPhase3() {
  const API = 'http://localhost:5000/api';
  
  // 1. Get problems to find one to submit to
  let probRes = await fetch(`${API}/problems`);
  const problems = await probRes.json();
  if (problems.length === 0) {
    console.error('No problems exist. Cannot test Phase 3.');
    return;
  }
  const problem = problems[0];
  console.log(`Using problem: ${problem.title} (${problem._id})`);
  
  // 2. Login as admin_test to create a submission
  console.log('\\n--- Logging in User A ---');
  let loginResA = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.com', password: 'password' })
  });
  let cookieA = loginResA.headers.raw()['set-cookie'][0].split(';')[0];
  
  // 3. Register & Login a second user (User B) for ownership tests
  console.log('\\n--- Registering & Logging in User B ---');
  await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'student_b', email: 'studentb@test.com', password: 'password' })
  });
  let loginResB = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'studentb@test.com', password: 'password' })
  });
  let cookieB = loginResB.headers.raw()['set-cookie'][0].split(';')[0];

  // 4. Test Validation: Invalid Language
  console.log('\\n--- Testing Validation: Unsupported Language ---');
  let invalidLangRes = await fetch(`${API}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookieA },
    body: JSON.stringify({
      problemId: problem._id,
      language: 'rust', // intentionally invalid
      sourceCode: 'fn main() {}'
    })
  });
  let invalidLangData = await invalidLangRes.json();
  console.log('Status (Expected 400):', invalidLangRes.status);
  console.log('Error Message:', invalidLangData.error);
  
  // 5. Test Submission Creation (Valid)
  console.log('\\n--- Testing Valid Submission ---');
  let validLang = problem.supportedLanguages[0];
  let submitRes = await fetch(`${API}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookieA },
    body: JSON.stringify({
      problemId: problem._id,
      language: validLang,
      sourceCode: 'function solve() { return true; }'
    })
  });
  let submitData = await submitRes.json();
  console.log('Status (Expected 201):', submitRes.status);
  console.log('Submission ID:', submitData.id);
  console.log('Submission Status:', submitData.status);
  const submissionId = submitData.id;

  // 6. Test Problem Submissions History (Should NOT contain sourceCode)
  console.log('\\n--- Testing History API (No Source Code) ---');
  let historyRes = await fetch(`${API}/submissions/problem/${problem._id}`, {
    headers: { 'Cookie': cookieA }
  });
  let historyData = await historyRes.json();
  console.log('Status (Expected 200):', historyRes.status);
  console.log('History count:', historyData.length);
  if (historyData.length > 0) {
    let hasSourceCode = historyData[0].sourceCode !== undefined;
    console.log('Does history object leak sourceCode? (Expected NO):', hasSourceCode ? 'YES (FAIL)' : 'NO (PASS)');
  }

  // 7. Test Ownership Security
  console.log('\\n--- Testing Ownership Security (User B trying to read User A submission) ---');
  let fetchBRes = await fetch(`${API}/submissions/${submissionId}`, {
    headers: { 'Cookie': cookieB }
  });
  let fetchBData = await fetchBRes.json();
  console.log('Status (Expected 403):', fetchBRes.status);
  console.log('Error Message:', fetchBData.error);

  console.log('\\n--- Testing Ownership Security (User A trying to read OWN submission) ---');
  let fetchARes = await fetch(`${API}/submissions/${submissionId}`, {
    headers: { 'Cookie': cookieA }
  });
  let fetchAData = await fetchARes.json();
  console.log('Status (Expected 200):', fetchARes.status);
  if (fetchAData.sourceCode) {
    console.log('Does owner get sourceCode? YES (PASS)');
  } else {
    console.log('Does owner get sourceCode? NO (FAIL)');
  }
}

testPhase3().catch(console.error);
