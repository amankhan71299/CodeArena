import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const BASE_URL = 'http://127.0.0.1:5000/api';

async function fetchAPI(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const mergedHeaders = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    ...options,
    headers: mergedHeaders,
  });
  const data = await res.json().catch(() => ({}));
  const cookies = res.headers.get('set-cookie');
  return { status: res.status, data, cookies };
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  console.log('--- PHASE 7: CONTEST SYSTEM TESTS ---');
  let adminCookies, student1Cookies, student2Cookies;
  let adminId, student1Id, student2Id;
  let problemId;
  let contestId, contestSlug;

  // 1. Setup Auth
  console.log('\nSetting up users and authentication...');
  
  const adminEmail = `admin7_${Date.now()}@test.com`;
  await fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify({ username: `admin7_${Date.now()}`, email: adminEmail, password: 'password' }) });
  
  execSync(`node make-admin.js "${adminEmail}"`, { cwd: './backend' });
  let loginAdmin = await fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify({ email: adminEmail, password: 'password' }) });
  adminCookies = loginAdmin.cookies;
  console.log('Admin cookies:', adminCookies);
  
  const s1Email = `s1_${Date.now()}@test.com`;
  await fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify({ username: `s1_${Date.now()}`, email: s1Email, password: 'password' }) });
  let login1 = await fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify({ email: s1Email, password: 'password' }) });
  student1Cookies = login1.cookies;

  const s2Email = `s2_${Date.now()}@test.com`;
  await fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify({ username: `s2_${Date.now()}`, email: s2Email, password: 'password' }) });
  let login2 = await fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify({ email: s2Email, password: 'password' }) });
  student2Cookies = login2.cookies;
  console.log('Users ready.');

  // 2. Setup Problem
  console.log('\nSetting up a test problem...');
  const probData = {
    title: 'Phase 7 Test Problem',
    slug: `p7-test-${Date.now()}`,
    description: 'Test problem',
    difficulty: 'Easy',
    topics: ['Arrays'],
    timeLimit: 1000,
    memoryLimit: 128,
    supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
    testCases: [
      { input: '1\n', expectedOutput: '1\n', isHidden: false },
      { input: '2\n', expectedOutput: '2\n', isHidden: true }
    ]
  };
  const probRes = await fetchAPI('/admin/problems', { method: 'POST', headers: { Cookie: adminCookies }, body: JSON.stringify(probData) });
  if (!probRes.data || !probRes.data._id) {
    console.error('Failed to create problem:', probRes);
  }
  problemId = probRes.data._id;
  const pSlug = probRes.data.slug;
  // await fetchAPI(`/admin/problems/${problemId}/publish`, { method: 'POST', headers: { Cookie: adminCookies } }); // REMOVED

  console.log(`Problem created: ${problemId}`);

  // Create Contest
  console.log('\nCreating contest...');
  const contestRes = await fetchAPI('/admin/contests', {
    method: 'POST',
    headers: { Cookie: adminCookies },
    body: JSON.stringify({
      title: 'Phase 7 Integration Contest',
      slug: `contest-${Date.now()}`,
      description: 'Testing contest system',
      startTime: new Date(Date.now() + 60000).toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      duration: 120
    })
  });
  
  if (!contestRes.data || !contestRes.data._id) {
    console.error('Failed to create contest:', contestRes);
  }
  contestId = contestRes.data._id;
  contestSlug = contestRes.data.slug;
  console.log(`Contest created: ${contestSlug} (Status: ${contestRes.status})`);

  // Add problem to contest
  await fetchAPI(`/admin/contests/${contestId}/problems`, {
    method: 'POST',
    headers: { Cookie: adminCookies },
    body: JSON.stringify({ problemId, order: 1, points: 100 })
  });

  // 4. Publish contest
  console.log('\nPublishing contest...');
  await fetchAPI(`/admin/contests/${contestId}/publish`, { method: 'POST', headers: { Cookie: adminCookies } });
  console.log('Published.');

  // 5. Student sees contest
  const studentContests = await fetchAPI('/contests', { headers: { Cookie: student1Cookies } });
  const isVisible = studentContests.data.some(c => c.slug === contestSlug);
  console.log(`Student sees published contest: ${isVisible ? 'PASSED' : 'FAILED'}`);

  // 6. Student 1 joins contest
  const joinRes1 = await fetchAPI(`/contests/${contestId}/join`, { method: 'POST', headers: { Cookie: student1Cookies } });
  console.log(`Student 1 joins contest: ${joinRes1.status === 201 ? 'PASSED' : 'FAILED'}`);

  // 7. Duplicate join handled safely
  const joinRes2 = await fetchAPI(`/contests/${contestId}/join`, { method: 'POST', headers: { Cookie: student1Cookies } });
  console.log(`Duplicate join prevented (Expected 400): ${joinRes2.status === 400 ? 'PASSED' : 'FAILED'}`);

  // 8. Submission before contest start is rejected
  const jsCode = `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim();\nconsole.log(input);`;
  const subResBefore = await fetchAPI('/submissions', {
    method: 'POST',
    headers: { Cookie: student1Cookies },
    body: JSON.stringify({ problemId, contestId, language: 'javascript', sourceCode: jsCode })
  });
  console.log(`Submission before start rejected (Expected 400): ${subResBefore.status === 400 ? 'PASSED' : 'FAILED'} - ${subResBefore.data.error}`);

  // 9. Unregistered user (Student 2) cannot submit
  console.log('\nChanging contest to RUNNING (start time in the past)...');
  const pastStartTime = new Date(Date.now() - 10 * 60000).toISOString();
  await fetchAPI(`/admin/contests/${contestId}`, {
    method: 'PUT',
    headers: { Cookie: adminCookies },
    body: JSON.stringify({ title: 'Test Contest', description: 'desc', startTime: pastStartTime, duration: 120 })
  });

  const subResUnreg = await fetchAPI('/submissions', {
    method: 'POST',
    headers: { Cookie: student2Cookies },
    body: JSON.stringify({ problemId, contestId, language: 'javascript', sourceCode: jsCode })
  });
  console.log(`Unregistered submission rejected (Expected 403): ${subResUnreg.status === 403 ? 'PASSED' : 'FAILED'}`);

  // 10. Submission during contest is accepted
  const subResDuring = await fetchAPI('/submissions', {
    method: 'POST',
    headers: { Cookie: student1Cookies },
    body: JSON.stringify({ problemId, contestId, language: 'javascript', sourceCode: jsCode })
  });
  console.log(`Submission during contest accepted: ${subResDuring.status === 201 ? 'PASSED' : 'FAILED'}`);
  const s1SubId = subResDuring.data.id;

  // Wait for submission evaluation
  console.log('Waiting for evaluation...');
  await sleep(4000);
  
  const s1Status = await fetchAPI(`/submissions/${s1SubId}`, { headers: { Cookie: student1Cookies } });
  console.log(`Submission evaluated: ${s1Status.data.status}`);

  // 11. Hidden tests never exposed
  const noHiddenDetails = !s1Status.data.results || !s1Status.data.results.some(r => r.isHidden === true);
  console.log(`Hidden tests properly hidden from student API: ${noHiddenDetails ? 'PASSED' : 'FAILED'}`);

  // 12. Check scoring
  const part1 = await fetchAPI(`/contests/${contestId}/participant`, { headers: { Cookie: student1Cookies } });
  console.log(`First ACCEPTED submission awards points: ${part1.data.score === 100 ? 'PASSED' : 'FAILED'} (Score: ${part1.data.score})`);

  // 13. Second ACCEPTED for same problem does not double score
  console.log('Submitting same correct code again...');
  await fetchAPI('/submissions', {
    method: 'POST',
    headers: { Cookie: student1Cookies },
    body: JSON.stringify({ problemId, contestId, language: 'javascript', sourceCode: jsCode })
  });
  await sleep(4000);
  const part1Again = await fetchAPI(`/contests/${contestId}/participant`, { headers: { Cookie: student1Cookies } });
  console.log(`Duplicate correct submission does not double score: ${part1Again.data.score === 100 ? 'PASSED' : 'FAILED'} (Score: ${part1Again.data.score})`);

  // 14. Wrong attempt increases penalty
  console.log('\nStudent 2 joins and makes WRONG attempt...');
  await fetchAPI(`/contests/${contestId}/join`, { method: 'POST', headers: { Cookie: student2Cookies } });
  const wrongCode = `console.log("wrong");`;
  await fetchAPI('/submissions', {
    method: 'POST',
    headers: { Cookie: student2Cookies },
    body: JSON.stringify({ problemId, contestId, language: 'javascript', sourceCode: wrongCode })
  });
  await sleep(4000);
  const part2a = await fetchAPI(`/contests/${contestId}/participant`, { headers: { Cookie: student2Cookies } });
  console.log(`Wrong attempt alone does not apply penalty yet: ${part2a.data.penalty === 0 ? 'PASSED' : 'FAILED'} (Penalty: ${part2a.data.penalty})`);

  console.log('Student 2 makes CORRECT attempt...');
  await fetchAPI('/submissions', {
    method: 'POST',
    headers: { Cookie: student2Cookies },
    body: JSON.stringify({ problemId, contestId, language: 'javascript', sourceCode: jsCode })
  });
  await sleep(4000);
  const part2b = await fetchAPI(`/contests/${contestId}/participant`, { headers: { Cookie: student2Cookies } });
  
  console.log(`Student 2 gets points and retains penalty: ${part2b.data.score === 100 && part2b.data.penalty >= 20 ? 'PASSED' : 'FAILED'} (Score: ${part2b.data.score}, Penalty: ${part2b.data.penalty})`);

  // 15. Check leaderboard sorting
  const ranking = await fetchAPI(`/contests/${contestId}/ranking`, { headers: { Cookie: adminCookies } });
  const r1 = ranking.data[0];
  const r2 = ranking.data[1];
  const sortCorrect = r1.score > r2.score || (r1.score === r2.score && r1.penalty < r2.penalty);
  console.log(`Leaderboard sorting is correct (Score DESC, Penalty ASC): ${sortCorrect ? 'PASSED' : 'FAILED'}`);
  console.log(`1st: ${r1.username} (Score: ${r1.score}, Penalty: ${r1.penalty})`);
  console.log(`2nd: ${r2.username} (Score: ${r2.score}, Penalty: ${r2.penalty})`);

  // 16. Submission after contest end is rejected
  console.log('\nChanging contest to ENDED (end time in the past)...');
  const pastEndTime = new Date(Date.now() - 5 * 60000).toISOString();
  await fetchAPI(`/admin/contests/${contestId}`, {
    method: 'PUT',
    headers: { Cookie: adminCookies },
    body: JSON.stringify({ title: 'Test Contest', description: 'desc', startTime: pastStartTime, endTime: pastEndTime, duration: 1 })
  });
  const subResAfter = await fetchAPI('/submissions', {
    method: 'POST',
    headers: { Cookie: student1Cookies },
    body: JSON.stringify({ problemId, contestId, language: 'javascript', sourceCode: jsCode })
  });
  console.log(`Submission after end rejected (Expected 400): ${subResAfter.status === 400 ? 'PASSED' : 'FAILED'}`);

  console.log('\n--- ALL PHASE 7 TESTS COMPLETED ---');
}

runTests();
