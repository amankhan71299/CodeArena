const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- STARTING PHASE 12 SECURITY AUDIT TESTS ---');

  // 1. Admin Privilege Escalation Prevention
  const rand = Math.floor(Math.random() * 1000000);
  const registerPayload = {
    username: `hacker_${rand}`,
    email: `hacker_${rand}@example.com`,
    password: 'password123',
    role: 'admin' // Attempt escalation
  };

  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registerPayload)
  });
  
  if (regRes.status !== 201) throw new Error('Registration failed');
  const regData = await regRes.json();
  
  if (regData.user.role === 'admin') {
    console.error('❌ FAIL: Admin privilege escalation succeeded via registration!');
  } else {
    console.log('✅ PASS: Registration privilege escalation prevented (Role enforced as student)');
  }

  const setCookie = regRes.headers.get('set-cookie');
  const studentCookies = setCookie ? setCookie.split(', ').map(c => c.split(';')[0]).join('; ') : '';

  // 2. Unauthorized Admin Access
  const adminRes = await fetch(`${API_BASE}/admin/problems`, {
    headers: { 'Cookie': studentCookies }
  });

  if (adminRes.status === 403 || adminRes.status === 401) {
    console.log(`✅ PASS: Student blocked from admin route (Status: ${adminRes.status})`);
  } else {
    console.error(`❌ FAIL: Student accessed admin route (Status: ${adminRes.status})`);
  }

  // 3. Profile Endpoint Safety (No Password Hash/Secrets)
  const meRes = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'Cookie': studentCookies }
  });
  
  const meData = await meRes.json();
  if (meData.user.passwordHash || meData.user.password) {
    console.error('❌ FAIL: Profile endpoint exposes password hash!');
  } else {
    console.log('✅ PASS: Profile endpoint does not expose sensitive fields');
  }

  // 4. NoSQL Injection Test on Login
  const injectionPayload = {
    email: { "$ne": null },
    password: { "$ne": null }
  };

  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(injectionPayload)
  });

  if (loginRes.status === 200) {
    console.error('❌ FAIL: NoSQL Injection succeeded on login!');
  } else {
    console.log('✅ PASS: NoSQL Injection prevented on login');
  }

  console.log('--- ALL PHASE 12 SECURITY TESTS COMPLETED ---');
}

runTests().catch(console.error);
