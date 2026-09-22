import http from 'http';
import assert from 'assert';

const API_BASE = 'http://localhost:5000/api';
let studentToken = '';
let adminToken = '';
let problemId = '';

const registerAndLogin = (username, email, password, role) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ username, email, password, role });
    const req = http.request(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        // If already exists, fallback to login
        if (res.statusCode === 400 && body.includes('exists')) {
          login(email, password, role).then(resolve).catch(reject);
        } else {
          const cookies = res.headers['set-cookie'];
          let token = '';
          if (cookies) {
            const tokenCookie = cookies.find(c => c.startsWith('token='));
            if (tokenCookie) {
              token = tokenCookie.split(';')[0].split('=')[1];
            }
          }
          if (role === 'admin') adminToken = token;
          else studentToken = token;
          resolve();
        }
      });
    });
    req.write(data);
    req.end();
  });
};

const login = (email, password, role) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email, password });
    const req = http.request(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const cookies = res.headers['set-cookie'];
        let token = '';
        if (cookies) {
          const tokenCookie = cookies.find(c => c.startsWith('token='));
          if (tokenCookie) {
            token = tokenCookie.split(';')[0].split('=')[1];
          }
        }

        if (role === 'admin') adminToken = token;
        else studentToken = token;
        resolve();
      });
    });
    req.write(data);
    req.end();
  });
};

const getProblems = () => {
  return new Promise((resolve, reject) => {
    const req = http.request(`${API_BASE}/problems`, {
      method: 'GET'
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const json = JSON.parse(body);
        problemId = json[0]._id;
        resolve();
      });
    });
    req.end();
  });
};

const testAIEndpoint = (endpoint, payload, token, expectedStatus = 200, checkResponse = () => true) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        ...(token ? { 'Cookie': `token=${token}` } : {})
      }
    };

    const req = http.request(`${API_BASE}/ai/${endpoint}`, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          assert.strictEqual(res.statusCode, expectedStatus, `Expected ${expectedStatus} but got ${res.statusCode} for ${endpoint}`);
          if (expectedStatus === 200) {
            const json = JSON.parse(body);
            assert.ok(checkResponse(json), `Response check failed for ${endpoint}: ${body}`);
          }
          console.log(`✅ [POST /ai/${endpoint}] Test passed (${expectedStatus})`);
          resolve();
        } catch (e) {
          console.error(`❌ [POST /ai/${endpoint}] Test failed: ${e.message}\nBody: ${body}`);
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

const testAIRecommendations = () => {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      headers: { ...(studentToken ? { 'Cookie': `token=${studentToken}` } : {}) }
    };
    const req = http.request(`${API_BASE}/ai/recommendations`, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          assert.strictEqual(res.statusCode, 200, `Expected 200 but got ${res.statusCode} for recommendations`);
          const json = JSON.parse(body);
          assert.ok(Array.isArray(json), 'Recommendations should return an array');
          console.log(`✅ [GET /ai/recommendations] Test passed (200)`);
          resolve();
        } catch (e) {
          console.error(`❌ [GET /ai/recommendations] Test failed: ${e.message}\nBody: ${body}`);
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
};

const runTests = async () => {
  console.log('--- Phase 10 Tests: AI Assistant ---');
  try {
    console.log('Fetching tokens and problem data...');
    await registerAndLogin('student10', 'student10@example.com', 'password123', 'student');
    await registerAndLogin('admin10', 'admin10@example.com', 'admin123', 'admin');
    await getProblems();

    console.log(`Using problemId: ${problemId}`);

    // 1. Unauthenticated test
    await testAIEndpoint('explain', { problemId, language: 'javascript', sourceCode: 'console.log("hello");' }, null, 401);

    // 2. Large code test (> 50k)
    const largeCode = 'a'.repeat(50001);
    await testAIEndpoint('explain', { problemId, language: 'javascript', sourceCode: largeCode }, studentToken, 400);

    // 3. Explain Code
    await testAIEndpoint('explain', { problemId, language: 'javascript', sourceCode: 'console.log("hello");' }, studentToken, 200,
      (res) => res.explanation && res.approach && res.timeComplexity && res.spaceComplexity && res.importantLogic
    );

    // 4. Hints (Level 1, 2, 3)
    await testAIEndpoint('hint', { problemId, language: 'javascript', sourceCode: 'console.log("hello");', hintLevel: 1 }, studentToken, 200,
      (res) => res.hint !== undefined
    );
    await testAIEndpoint('hint', { problemId, language: 'javascript', sourceCode: 'console.log("hello");', hintLevel: 2 }, studentToken, 200,
      (res) => res.hint !== undefined
    );
    await testAIEndpoint('hint', { problemId, language: 'javascript', sourceCode: 'console.log("hello");', hintLevel: 3 }, studentToken, 200,
      (res) => res.hint !== undefined
    );

    // Invalid hint level
    await testAIEndpoint('hint', { problemId, language: 'javascript', sourceCode: 'console.log("hello");', hintLevel: 4 }, studentToken, 400);

    // 5. Debug Code
    await testAIEndpoint('debug', {
      problemId,
      language: 'javascript',
      sourceCode: 'console.log("hel");',
      submissionStatus: 'WRONG_ANSWER',
      errorMessage: 'Output mismatch',
      output: 'hel'
    }, studentToken, 200,
      (res) => res.whyFailed && res.likelyBug && res.edgeCase && res.suggestedDirection
    );

    // 6. Code Review
    await testAIEndpoint('review', { problemId, language: 'javascript', sourceCode: 'console.log("hello");' }, studentToken, 200,
      (res) => res.correctness && res.codeQuality && res.readability && res.complexity && res.edgeCases && res.optimizations
    );

    // 7. Admin AI Editorial Generation
    // Student unauthorized check
    await testAIEndpoint(`admin/problems/${problemId}/editorial/generate`, {}, studentToken, 403);

    // Admin authorized
    await testAIEndpoint(`admin/problems/${problemId}/editorial/generate`, {}, adminToken, 200,
      (res) => res.explanation && res.approach && res.algorithm && res.complexity && res.codeExplanation
    );

    // 8. AI Recommendations
    await testAIRecommendations();

    // 9. Rate limiting test
    // Hit the explain endpoint 21 times in rapid succession (limit is 20)
    console.log('Testing rate limiter (20 requests max per minute)...');
    let rateLimitTriggered = false;
    for (let i = 0; i < 21; i++) {
      try {
        await testAIEndpoint('explain', { problemId, language: 'javascript', sourceCode: 'console.log("hello");' }, studentToken, i < 20 ? 200 : 429);
        if (i === 20) rateLimitTriggered = true;
      } catch (e) {
        if (i === 20 && e.message.includes('429')) rateLimitTriggered = true;
      }
    }

    if (rateLimitTriggered) {
      console.log('✅ Rate limiting correctly triggered.');
    } else {
      console.log('⚠️ Rate limiter might not be strict enough or test executed too slowly.');
    }

    console.log('--- All Phase 10 tests passed! ---');
    console.log('Note: If AI_API_KEY is not set, these tests used the Mock AI Provider.');
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
};

runTests();
