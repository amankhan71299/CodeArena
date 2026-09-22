import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

const API = 'http://localhost:5000/api';

async function runTest() {
  try {
    console.log('--- TESTING ADMIN CONTEST PROBLEM ASSIGNMENT FLOW ---');

    // 1. Generate Admin Token
    const adminToken = jwt.sign({ id: '6a97e3d1cb6a0bffd9314d9a', role: 'admin' }, 'super_secret_codearena_jwt_key_123', { expiresIn: '7d' });
    const adminCookies = `token=${adminToken}`;

    // 2. Generate Student Token
    const studentToken = jwt.sign({ id: '6a97e3d1cb6a0bffd9314d9b', role: 'student' }, 'super_secret_codearena_jwt_key_123', { expiresIn: '7d' });
    const studentCookies = `token=${studentToken}`;

    // 3. Create a Problem
    const pRes = await fetch(`${API}/admin/problems`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookies },
      body: JSON.stringify({
        title: 'Assignment Test Problem',
        description: 'Testing the assignment flow',
        difficulty: 'Easy',
        timeLimit: 1000,
        memoryLimit: 128,
        supportedLanguages: ['javascript'],
        testCases: [{ input: '1', expectedOutput: '1', hidden: false }]
      })
    });
    const problem = await pRes.json();
    console.log('Problem Created:', problem._id);

    // 4. Create a Contest
    const slug = `contest-assign-${Date.now()}`;
    const cRes = await fetch(`${API}/admin/contests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookies },
      body: JSON.stringify({
        title: 'Assignment Test Contest',
        slug,
        description: 'Testing assignment',
        startTime: new Date(Date.now() - 3600000).toISOString(), // running contest
        endTime: new Date(Date.now() + 3600000).toISOString(),
        duration: 120
      })
    });
    const contest = await cRes.json();
    console.log('Contest Created:', contest._id);

    // 5. Assign Problem to Contest
    const assignRes = await fetch(`${API}/admin/contests/${contest._id}/problems`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookies },
      body: JSON.stringify({
        problemId: problem._id,
        order: 1,
        points: 50
      })
    });
    const assignData = await assignRes.json();
    if (!assignRes.ok) throw new Error(`Failed to assign: ${assignData.error}`);
    console.log('Problem Assigned! Total problems in contest:', assignData.problems.length);

    // 6. Publish Contest
    await fetch(`${API}/admin/contests/${contest._id}/publish`, {
      method: 'POST',
      headers: { Cookie: adminCookies }
    });
    console.log('Contest Published.');

    // 7. Student Fetches Contest
    const sRes = await fetch(`${API}/contests/${slug}`, {
      headers: { Cookie: studentCookies }
    });
    const sContest = await sRes.json();
    if (!sRes.ok) throw new Error(`Student failed to fetch: ${sContest.error}`);

    // 8. Verify Student sees Problem
    if (sContest.problems && sContest.problems.length > 0 && sContest.problems[0].problem.title === 'Assignment Test Problem') {
      console.log('SUCCESS: Student successfully fetched the contest and sees the assigned problem!');
      console.log(`Problem details seen by student: Title=${sContest.problems[0].problem.title}, Points=${sContest.problems[0].points}`);
    } else {
      throw new Error('Student did not see the assigned problem in the contest response!');
    }

  } catch (err) {
    console.error('TEST FAILED:', err.message);
  }
}

runTest();
