import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

// Hard limits to prevent server exhaustion regardless of Problem config
const HARD_MAX_MEMORY_MB = 512;
const HARD_MAX_TIME_MS = 10000;
const MAX_OUTPUT_BUFFER_BYTES = 1024 * 1024; // 1MB

export const getLanguageConfig = (language) => {
  switch (language.toLowerCase()) {
    case 'javascript':
      return {
        image: 'node:22-alpine',
        filename: 'solution.js',
        command: ['node', '/workspace/solution.js'],
        user: 'node'
      };
    case 'python':
      return {
        image: 'python:3.12-alpine',
        filename: 'solution.py',
        command: ['python3', '/workspace/solution.py'],
        user: 'nobody'
      };
    case 'java':
      return {
        image: 'eclipse-temurin:21-jdk-alpine',
        filename: 'Main.java',
        compileCommand: ['javac', 'Main.java'],
        artifact: 'Main.class',
        command: ['java', '-cp', '/workspace', 'Main'],
        user: 'nobody'
      };
    case 'cpp':
      return {
        image: 'gcc:14-bookworm',
        filename: 'main.cpp',
        compileCommand: ['g++', '-std=c++17', '-O2', '-pipe', 'main.cpp', '-o', 'main'],
        artifact: 'main',
        command: ['/workspace/main'],
        user: 'nobody'
      };
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
};

const runDockerContainer = async ({
  codeDir,
  containerName,
  image,
  command,
  user,
  safeTimeLimit,
  safeMemoryLimit,
  isCompilation = false,
  input = ''
}) => {
  // Use :rw for compilation to emit .class / main binary
  // Use :ro for execution so user code cannot tamper with the workspace
  const mountMode = isCompilation ? 'rw' : 'ro';

  const dockerArgs = [
    'run',
    '-i', // Keep STDIN open even if not attached
    `--name=${containerName}`,
    '--network=none', // No network access
    '--read-only',    // Read-only filesystem
    '--tmpfs=/tmp',   // Required by some runtimes
    '--cap-drop=ALL', // Drop all kernel capabilities
    '--security-opt=no-new-privileges', // Prevent privilege escalation
    '--pids-limit=50', // Prevent fork bombs
    `--cpus=1.0`,     // Restrict to 1 CPU core
    `--memory=${safeMemoryLimit}m`,
    `--memory-swap=${safeMemoryLimit}m`, // Disable swap to strictly enforce RAM limit
    `--user=${user}`,
    `-v`, `${codeDir}:/workspace:${mountMode}`,
    // Ensure we start in /workspace if it's compilation
    ...((isCompilation && ['java', 'cpp'].some(lang => image.includes(lang) || image.includes('gcc') || image.includes('temurin'))) ? ['-w', '/workspace'] : []),
    image,
    ...command
  ];

  return new Promise((resolve, reject) => {
    const child = spawn('docker', dockerArgs);
    
    let stdoutData = '';
    let stderrData = '';
    let outputLength = 0;
    let isFlooded = false;
    let isTimeout = false;
    
    const killContainer = async () => {
      try {
        await execAsync(`docker kill ${containerName}`);
      } catch (e) {}
    };

    // Wall-clock timeout (give Docker a 2s buffer over the strict limit)
    // Compilation gets a slightly more generous timeout because javac/g++ is slower
    const timeoutThreshold = isCompilation ? Math.max(safeTimeLimit, 10000) : safeTimeLimit + 2000;
    
    const timeoutTimer = setTimeout(() => {
      isTimeout = true;
      killContainer();
    }, timeoutThreshold);

    // Feed input to stdin
    if (input && !isCompilation) {
      child.stdin.write(input);
    }
    child.stdin.end();

    child.stdout.on('data', (data) => {
      if (isFlooded) return;
      outputLength += data.length;
      if (outputLength > MAX_OUTPUT_BUFFER_BYTES) {
        isFlooded = true;
        killContainer();
      } else {
        stdoutData += data.toString();
      }
    });

    child.stderr.on('data', (data) => {
      if (isFlooded) return;
      outputLength += data.length;
      if (outputLength > MAX_OUTPUT_BUFFER_BYTES) {
        isFlooded = true;
        killContainer();
      } else {
        stderrData += data.toString();
      }
    });

    child.on('close', async (code) => {
      clearTimeout(timeoutTimer);
      
      let oomKilled = false;
      
      // Inspect the container for true OOMKilled state
      try {
        const { stdout: inspectOut } = await execAsync(`docker inspect ${containerName}`);
        const inspectData = JSON.parse(inspectOut);
        if (inspectData && inspectData.length > 0) {
          oomKilled = inspectData[0].State.OOMKilled;
        }
      } catch (e) {
        // Fallback if inspection fails
        if (code === 137 && !isTimeout && !isFlooded) {
          oomKilled = true;
        }
      }
      
      // Explicitly clean up the container since --rm was removed
      try {
        await execAsync(`docker rm -f ${containerName}`);
      } catch (e) {}
      
      // If we couldn't inspect, fallback to status mapping:
      let status = 'ACCEPTED'; 
      
      if (isTimeout) {
        status = 'TIME_LIMIT_EXCEEDED';
      } else if (oomKilled) {
        status = 'MEMORY_LIMIT_EXCEEDED';
      } else if (isFlooded) {
        status = 'RUNTIME_ERROR';
        stderrData = 'Output Limit Exceeded (1MB MAX).';
      } else if (code !== 0) {
        status = isCompilation ? 'COMPILATION_ERROR' : 'RUNTIME_ERROR';
      }

      resolve({
        stdout: stdoutData,
        stderr: stderrData,
        status,
        exitCode: code
      });
    });

    child.on('error', (err) => {
      clearTimeout(timeoutTimer);
      killContainer();
      resolve({
        stdout: stdoutData,
        stderr: err.message,
        status: 'SYSTEM_ERROR',
        exitCode: -1
      });
    });
  });
};

export const compileInSandbox = async ({ 
  codeDir, 
  language, 
  timeLimit, 
  memoryLimit 
}) => {
  const config = getLanguageConfig(language);
  if (!config.compileCommand) {
    return { status: 'ACCEPTED' }; // No compilation needed
  }

  const safeTimeLimit = Math.min(timeLimit || 2000, HARD_MAX_TIME_MS);
  const safeMemoryLimit = Math.min(memoryLimit || 128, HARD_MAX_MEMORY_MB);
  const containerName = `codearena_compile_${path.basename(codeDir)}_${Date.now()}`;

  const result = await runDockerContainer({
    codeDir,
    containerName,
    image: config.image,
    command: config.compileCommand,
    user: config.user,
    safeTimeLimit,
    safeMemoryLimit: Math.max(safeMemoryLimit, 256), // Compilers usually need at least 256MB
    isCompilation: true
  });

  if (result.status === 'ACCEPTED' && config.artifact) {
    try {
      await fs.access(path.join(codeDir, config.artifact));
    } catch (e) {
      result.status = 'COMPILATION_ERROR';
      result.stderr = (result.stderr ? result.stderr + '\n' : '') + `Error: Expected artifact ${config.artifact} was not found.`;
    }
  }

  return result;
};

export const executeInSandbox = async ({ 
  codeDir, 
  language, 
  input, 
  timeLimit, 
  memoryLimit 
}) => {
  const config = getLanguageConfig(language);
  const safeTimeLimit = Math.min(timeLimit || 2000, HARD_MAX_TIME_MS);
  const safeMemoryLimit = Math.min(memoryLimit || 128, HARD_MAX_MEMORY_MB);
  const containerName = `codearena_exec_${path.basename(codeDir)}_${Date.now()}`;

  return await runDockerContainer({
    codeDir,
    containerName,
    image: config.image,
    command: config.command,
    user: config.user,
    safeTimeLimit,
    safeMemoryLimit,
    isCompilation: false,
    input
  });
};
