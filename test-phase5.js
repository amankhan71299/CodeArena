const API_BASE = 'http://localhost:5000/api';

const { execSync } = require('child_process');

async function loginUser(email, password) {
  const username = 'TestUser_' + Date.now() + Math.random();
  await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  
  execSync(`node make-admin.js "${email}"`, { cwd: './backend' });

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

const JS_TESTS = [
  {
    name: 'JS Normal Code',
    language: 'javascript',
    code: `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim();
if (input.includes('3,2,4')) console.log('[1,2]');
else if (input.includes('3,3')) console.log('[0,1]');`,
    expectedStatus: 'ACCEPTED'
  }
];

const PY_TESTS = [
  {
    name: 'PY Normal Code',
    language: 'python',
    code: `import sys
input_data = sys.stdin.read().strip()
if '3,2,4' in input_data: print('[1,2]')
elif '3,3' in input_data: print('[0,1]')`,
    expectedStatus: 'ACCEPTED'
  }
];

const JAVA_TESTS = [
  {
    name: 'JAVA Normal Code (Phase 4 compatibility / Two Sum logic)',
    language: 'java',
    code: `import java.io.BufferedReader;
import java.io.InputStreamReader;
public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String input = br.readLine();
        if (input != null && input.contains("3,2,4")) {
            System.out.println("[1,2]");
        } else if (input != null && input.contains("3,3")) {
            System.out.println("[0,1]");
        }
    }
}`,
    expectedStatus: 'ACCEPTED'
  },
  {
    name: 'JAVA Compilation Error',
    language: 'java',
    code: `public class Main {
    public static void main(String[] args) {
        System.out.println("hello"
    }
}`,
    expectedStatus: 'COMPILATION_ERROR'
  },
  {
    name: 'JAVA Runtime Error',
    language: 'java',
    code: `public class Main {
    public static void main(String[] args) {
        int x = 1 / 0;
    }
}`,
    expectedStatus: 'RUNTIME_ERROR'
  },
  {
    name: 'JAVA Timeout (Infinite Loop)',
    language: 'java',
    code: `public class Main {
    public static void main(String[] args) {
        while (true) {}
    }
}`,
    expectedStatus: 'TIME_LIMIT_EXCEEDED'
  },
  {
    name: 'JAVA Memory Attack',
    language: 'java',
    code: `import java.util.ArrayList;
public class Main {
    public static void main(String[] args) {
        ArrayList<byte[]> list = new ArrayList<>();
        while(true) {
            list.add(new byte[1000000]);
        }
    }
}`,
    expectedStatus: 'MEMORY_LIMIT_EXCEEDED'
  },
  {
    name: 'JAVA Output Flood',
    language: 'java',
    code: `public class Main {
    public static void main(String[] args) {
        while(true) {
            System.out.println("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
        }
    }
}`,
    expectedStatus: 'RUNTIME_ERROR' // Or TIME_LIMIT depending on Node IPC buffering
  },
  {
    name: 'JAVA Network Attack',
    language: 'java',
    code: `import java.net.URL;
public class Main {
    public static void main(String[] args) {
        try {
            new URL("http://google.com").openStream();
        } catch (Exception e) {
            System.exit(1);
        }
    }
}`,
    expectedStatus: 'TIME_LIMIT_EXCEEDED'
  },
  {
    name: 'JAVA Host Filesystem Attack',
    language: 'java',
    code: `import java.io.File;
import java.io.FileInputStream;
public class Main {
    public static void main(String[] args) {
        try {
            new FileInputStream(new File("/var/run/docker.sock"));
            System.exit(0);
        } catch (Exception e) {
            System.exit(1);
        }
    }
}`,
    expectedStatus: 'RUNTIME_ERROR'
  }
];

const CPP_TESTS = [
  {
    name: 'CPP Normal Code',
    language: 'cpp',
    code: `#include <iostream>
#include <string>
using namespace std;
int main() {
    string input;
    getline(cin, input);
    if (input.find("3,2,4") != string::npos) cout << "[1,2]" << endl;
    else if (input.find("3,3") != string::npos) cout << "[0,1]" << endl;
    return 0;
}`,
    expectedStatus: 'ACCEPTED'
  },
  {
    name: 'CPP Compilation Error',
    language: 'cpp',
    code: `#include <iostream>
int main() {
    std::cout << "hello" << std::endl
}`,
    expectedStatus: 'COMPILATION_ERROR'
  },
  {
    name: 'CPP Runtime Error',
    language: 'cpp',
    code: `int main() {
    int* ptr = nullptr;
    *ptr = 1;
    return 0;
}`,
    expectedStatus: 'RUNTIME_ERROR'
  },
  {
    name: 'CPP Timeout',
    language: 'cpp',
    code: `int main() {
    while (true) {}
    return 0;
}`,
    expectedStatus: 'TIME_LIMIT_EXCEEDED'
  },
  {
    name: 'CPP Memory Attack',
    language: 'cpp',
    code: `#include <vector>
int main() {
    std::vector<int*> v;
    while(true) {
        v.push_back(new int[1000000]);
    }
    return 0;
}`,
    expectedStatus: 'MEMORY_LIMIT_EXCEEDED'
  },
  {
    name: 'CPP Output Flood',
    language: 'cpp',
    code: `#include <iostream>
int main() {
    while(true) {
        std::cout << "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" << std::endl;
    }
    return 0;
}`,
    expectedStatus: 'RUNTIME_ERROR'
  },
  {
    name: 'CPP Network Attack (Simulated)',
    language: 'cpp',
    code: `#include <stdlib.h>
int main() {
    int res = system("curl -s http://google.com");
    if (res != 0) return 1;
    return 0;
}`,
    expectedStatus: 'RUNTIME_ERROR'
  },
  {
    name: 'CPP Process Limit Attack',
    language: 'cpp',
    code: `#include <unistd.h>
#include <stdlib.h>
int main() {
    for(int i=0; i<100; i++) {
        if (fork() < 0) exit(1);
    }
    return 0;
}`,
    expectedStatus: 'RUNTIME_ERROR' // Will crash due to fork returning -1 (PID limit)
  }
];

const TESTS = [...JS_TESTS, ...PY_TESTS, ...JAVA_TESTS, ...CPP_TESTS];

async function runAllTests() {
  console.log('--- STARTING PHASE 5 TESTS ---');
  try {
    const rand = Math.floor(Math.random() * 100000);
    const cookies = await loginUser(`testuser_${rand}@example.com`, 'password123');
    
    const probRes = await fetch(`${API_BASE}/admin/problems`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies },
      body: JSON.stringify({
        title: `Phase 5 Test Problem ${rand}`,
        description: 'Test problem',
        difficulty: 'Easy',
        timeLimit: 1000,
        memoryLimit: 128,
        supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
        testCases: [
          { input: '[3,2,4]', expectedOutput: '[1,2]', hidden: false },
          { input: '[3,3]', expectedOutput: '[0,1]', hidden: false }
        ]
      })
    });
    const problem = await probRes.json();
    const problemId = problem._id;
    console.log(`Using problem: ${problem.title}`);

    let passed = 0;

    let currentCookies = cookies;

    for (let i = 0; i < TESTS.length; i++) {
      const test = TESTS[i];
      console.log(`\nRunning: ${test.name}`);
      
      // Bypass rate limit (10 requests / 60 seconds) by switching user
      if (i === 9) {
        const rand2 = Math.floor(Math.random() * 100000);
        await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: `testuser_${rand2}`, email: `testuser_${rand2}@example.com`, password: 'password123' })
        });
        currentCookies = await loginUser(`testuser_${rand2}@example.com`, 'password123');
      }

      const result = await runCode(problemId, test.language, test.code, currentCookies);
      
      let testPassed = (result.status === test.expectedStatus);
      
      console.log(`Expected: ${test.expectedStatus}, Got: ${result.status}`);
      if (result.errorMessage) console.log(`Error Message: ${result.errorMessage.slice(0, 100).replace(/\\n/g, ' ')}...`);
      
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
