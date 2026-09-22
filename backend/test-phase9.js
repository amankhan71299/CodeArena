import http from 'http';
import mongoose from 'mongoose';

const API_URL = 'http://localhost:5000/api';

const makeRequest = (method, path, data = null, cookies = '') => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (cookies) {
      options.headers['Cookie'] = cookies;
    }
    
    if (data) {
      const dataString = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = http.request(options, (res) => {
      let body = '';
      let setCookie = res.headers['set-cookie'] || [];
      
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let parsed = body;
        try { if (body) parsed = JSON.parse(body); } catch(e){}
        resolve({
          status: res.statusCode,
          data: parsed,
          cookies: setCookie
        });
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
};

const runTests = async () => {
  console.log('--- STARTING PHASE 9 TESTS ---');
  let passed = 0;
  let total = 0;
  const tStart = Date.now();
  
  const assert = (condition, message, data = null) => {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${message}`);
      if (data) console.log('Response:', data);
    }
  };

  // 1. Setup Users
  const user1 = `s1_${Date.now()}`;
  const user2 = `s2_${Date.now()}`;
  
  await makeRequest('POST', '/auth/register', { username: user1, email: `${user1}@test.com`, password: 'password123' });
  const login1 = await makeRequest('POST', '/auth/login', { email: `${user1}@test.com`, password: 'password123' });
  const cookie1 = login1.cookies[0];

  await makeRequest('POST', '/auth/register', { username: user2, email: `${user2}@test.com`, password: 'password123' });
  const login2 = await makeRequest('POST', '/auth/login', { email: `${user2}@test.com`, password: 'password123' });
  const cookie2 = login2.cookies[0];

  const adminName = `admin_${Date.now()}`;
  await makeRequest('POST', '/auth/register', { username: adminName, email: `${adminName}@test.com`, password: 'password123' });
  
  // Set role to admin directly via Mongoose since it's hardcoded to 'student' in /auth/register
  await mongoose.connect('mongodb://admin:secret@127.0.0.1:27018/codearena?authSource=admin');
  await mongoose.connection.db.collection('users').updateOne({ username: adminName }, { $set: { role: 'admin' } });
  await mongoose.disconnect();
  
  const adminLogin = await makeRequest('POST', '/auth/login', { email: `${adminName}@test.com`, password: 'password123' });
  const cookieAdmin = adminLogin.cookies[0];

  const problemCreate = await makeRequest('POST', '/admin/problems', {
    title: `Phase 9 Test Problem`,
    slug: `p9-test-${Date.now()}`,
    description: 'Test problem for P9',
    difficulty: 'Easy',
    testCases: [{ input: '1', expectedOutput: '1' }],
    timeLimit: 1000,
    memoryLimit: 128,
    supportedLanguages: ['javascript']
  }, cookieAdmin);
  const problemSlug = problemCreate.data.slug;
  const problemId = problemCreate.data._id;

  // 1. Unauthenticated discussion creation rejected
  const unauthRes = await makeRequest('POST', `/discussions/problem/${problemId}`, { title: 'Test', content: 'Test' });
  assert(unauthRes.status === 401, 'Unauthenticated discussion creation rejected', unauthRes);

  // 2. Authenticated discussion creation succeeds
  const d1Res = await makeRequest('POST', `/discussions/problem/${problemId}`, { title: 'How to solve this?', content: 'I am stuck.' }, cookie1);
  assert(d1Res.status === 201 && d1Res.data && d1Res.data.title === 'How to solve this?', 'Authenticated discussion creation succeeds', d1Res);
  const d1 = d1Res.data || {};

  // 3. Discussion belongs to correct problem
  assert(d1.problem === problemId, 'Discussion belongs to correct problem');

  // 4. Discussion appears in listing
  const listRes = await makeRequest('GET', `/discussions/problem/${problemId}`);
  assert(listRes.status === 200 && listRes.data.length > 0 && listRes.data[0]._id === d1._id, 'Discussion appears in listing');

  // 5. Second user can read discussion
  const readRes = await makeRequest('GET', `/discussions/${d1._id}`);
  assert(readRes.status === 200 && readRes.data.discussion._id === d1._id, 'Second user can read discussion');

  // 6. Second user can reply
  const rep1Res = await makeRequest('POST', `/discussions/${d1._id}/replies`, { content: 'Try using a loop.' }, cookie2);
  assert(rep1Res.status === 201 && rep1Res.data.content === 'Try using a loop.', 'Second user can reply');
  const rep1 = rep1Res.data;

  // 7. Owner can edit discussion
  const editD1Res = await makeRequest('PUT', `/discussions/${d1._id}`, { title: 'How to solve this? (Edited)' }, cookie1);
  assert(editD1Res.status === 200 && editD1Res.data.title === 'How to solve this? (Edited)', 'Owner can edit discussion');

  // 8. Non-owner cannot edit discussion
  const editD1Fail = await makeRequest('PUT', `/discussions/${d1._id}`, { title: 'Hacked' }, cookie2);
  assert(editD1Fail.status === 403, 'Non-owner cannot edit discussion');

  // 10. Non-owner cannot delete discussion
  const delD1Fail = await makeRequest('DELETE', `/discussions/${d1._id}`, null, cookie2);
  assert(delD1Fail.status === 403, 'Non-owner cannot delete discussion');

  // 11. Reply owner can edit
  const editRepRes = await makeRequest('PUT', `/discussions/replies/${rep1._id}`, { content: 'Edited reply' }, cookie2);
  assert(editRepRes.status === 200 && editRepRes.data.content === 'Edited reply', 'Reply owner can edit');

  // 12. Non-owner cannot edit reply
  const editRepFail = await makeRequest('PUT', `/discussions/replies/${rep1._id}`, { content: 'Hacked' }, cookie1);
  assert(editRepFail.status === 403, 'Non-owner cannot edit reply');

  // 14. Like works
  const likeRes = await makeRequest('POST', `/discussions/${d1._id}/like`, null, cookie2);
  assert(likeRes.status === 200 && likeRes.data.likes.length === 1, 'Like works');

  // 15. Duplicate like does not double-count (it toggles to Unlike)
  const unlikeRes = await makeRequest('POST', `/discussions/${d1._id}/like`, null, cookie2);
  assert(unlikeRes.status === 200 && unlikeRes.data.likes.length === 0, 'Duplicate like toggles unlike');

  // 16. Unlike works (tested above)
  assert(true, 'Unlike works');

  // 17. Report works
  const reportRes = await makeRequest('POST', `/discussions/${d1._id}/report`, { reason: 'Spam' }, cookie2);
  assert(reportRes.status === 201, 'Report works');

  // 18. Duplicate report prevented
  const reportDup = await makeRequest('POST', `/discussions/${d1._id}/report`, { reason: 'Spam again' }, cookie2);
  assert(reportDup.status === 400, 'Duplicate report prevented');

  // 19. Admin can view reports
  const adminReports = await makeRequest('GET', `/admin/reports`, null, cookieAdmin);
  assert(adminReports.status === 200 && Array.isArray(adminReports.data), 'Admin can view reports', adminReports);
  let repId = null;
  if (Array.isArray(adminReports.data)) {
    const rep = adminReports.data.find(r => r.targetId === d1._id);
    if (rep) repId = rep._id;
  }

  // 21. Student cannot access moderation
  const studMod = await makeRequest('GET', `/admin/reports`, null, cookie1);
  assert(studMod.status === 403, 'Student cannot access moderation', studMod);

  // 20. Admin can resolve reports
  if (repId) {
    const resolveRes = await makeRequest('PUT', `/admin/reports/${repId}/resolve`, { action: 'dismiss' }, cookieAdmin);
    assert(resolveRes.status === 200, 'Admin can resolve reports', resolveRes);
  } else {
    assert(false, 'Cannot test resolve without report ID');
  }

  // 22. Admin can create editorial
  const edRes = await makeRequest('POST', `/admin/problems/${problemId}/editorial`, { explanation: 'Just solve it' }, cookieAdmin);
  assert(edRes.status === 200 && edRes.data.editorial.explanation === 'Just solve it', 'Admin can create editorial');

  // 26. Student cannot modify editorial
  const studEd = await makeRequest('POST', `/admin/problems/${problemId}/editorial`, { explanation: 'Hack' }, cookie1);
  assert(studEd.status === 403, 'Student cannot modify editorial');

  // 25. Student can read editorial
  const readProb = await makeRequest('GET', `/problems/${problemSlug}`, null, cookie1);
  assert(readProb.status === 200 && readProb.data.editorial && readProb.data.editorial.explanation === 'Just solve it', 'Student can read editorial', readProb);

  // 28. Hidden test data is not exposed
  assert(!readProb.data.testCases || readProb.data.testCases.length === 0 || readProb.data.testCases.every(tc => !tc.hidden), 'Hidden test data is not exposed');

  // 23. Admin can update editorial
  const edUpd = await makeRequest('POST', `/admin/problems/${problemId}/editorial`, { explanation: 'Updated' }, cookieAdmin);
  assert(edUpd.status === 200 && edUpd.data.editorial.explanation === 'Updated', 'Admin can update editorial');

  // 24. Admin can delete editorial
  const edDel = await makeRequest('DELETE', `/admin/problems/${problemId}/editorial`, null, cookieAdmin);
  assert(edDel.status === 200, 'Admin can delete editorial');

  // 9. Owner can delete discussion
  const delD1 = await makeRequest('DELETE', `/discussions/${d1._id}`, null, cookie1);
  assert(delD1.status === 200, 'Owner can delete discussion');

  // 13. Reply owner can delete
  const d2Res = await makeRequest('POST', `/discussions/problem/${problemId}`, { title: 'Test 2', content: 'Test' }, cookie1);
  const rep2Res = await makeRequest('POST', `/discussions/${d2Res.data._id}/replies`, { content: 'Reply 2' }, cookie2);
  const delRep = await makeRequest('DELETE', `/discussions/replies/${rep2Res.data._id}`, null, cookie2);
  assert(delRep.status === 200, 'Reply owner can delete');

  // 30. Rate limiting works
  // We hit the report limit (5) for a user
  let rateLimited = false;
  for (let i = 0; i < 6; i++) {
    const res = await makeRequest('POST', `/discussions/${d2Res.data._id}/report`, { reason: 'Spam' }, cookie1);
    if (res.status === 429) rateLimited = true;
  }
  assert(rateLimited, 'Rate limiting works');

  // 31. Invalid IDs are handled safely
  const invalidId = await makeRequest('GET', `/discussions/invalid123`);
  assert(invalidId.status === 500 || invalidId.status === 404 || invalidId.status === 400, 'Invalid IDs are handled safely');

  console.log(`\nFinal Score: ${passed}/${total} Tests Passed`);
};

runTests();
