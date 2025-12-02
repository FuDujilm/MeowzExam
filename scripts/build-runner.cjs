#!/usr/bin/env node
'use strict';

const { spawn } = require('node:child_process');

const NEXT_BIN = require.resolve('next/dist/bin/next');
const MAX_CAPTURED_OUTPUT = 20000;

const FALLBACK_PATTERNS = [
  'next.js package not found',
  "couldn't find the next.js package",
];

async function main() {
  const userArgs = process.argv.slice(2);
  const sanitizedArgs = userArgs.filter(
    (arg) => arg !== '--turbo' && arg !== '--turbopack' && arg !== '--webpack'
  );
  const turboArgs = ['build', ...sanitizedArgs];
  const webpackArgs = ['build', '--webpack', ...sanitizedArgs];

  const turboResult = await runNext(turboArgs, { preloadIgnoreEacces: true });
  const shouldFallback = detectFallback(turboResult.output);
  const exitedCleanly = turboResult.code === 0 && !turboResult.signal && !shouldFallback;

  if (exitedCleanly) {
    process.exit(0);
  }

  if (!shouldFallback) {
    process.exit(turboResult.code ?? 1);
  }

  console.warn(
    '\n[build-runner] Turbopack crashed with "Next.js package not found". ' +
      'Retrying the build with webpack...\n'
  );

  const fallbackResult = await runNext(webpackArgs, {
    disableTurbopack: true,
    preloadIgnoreEacces: true,
  });
  process.exit(fallbackResult.code ?? 0);
}

function detectFallback(output) {
  if (!output) return false;
  const normalized = output.toLowerCase();
  return FALLBACK_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function runNext(args, options = {}) {
  return new Promise((resolve) => {
    const fullArgs = [NEXT_BIN, ...args];
    const env = { ...process.env };
    if (options.disableTurbopack) {
      env.NEXT_DISABLE_TURBOPACK = '1';
      delete env.TURBOPACK;
    }
    if (options.preloadIgnoreEacces) {
      const scriptPath = require.resolve('./ignore-eacces.cjs');
      const quotedPath = JSON.stringify(scriptPath);
      const requireFlag = `--require ${quotedPath}`;
      const existing = env.NODE_OPTIONS && env.NODE_OPTIONS.trim();
      env.NODE_OPTIONS = existing ? `${existing} ${requireFlag}` : requireFlag;
    }

    const child = spawn(process.execPath, fullArgs, {
      cwd: process.cwd(),
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let capturedOutput = '';
    const appendOutput = (chunk) => {
      capturedOutput += chunk.toString();
      if (capturedOutput.length > MAX_CAPTURED_OUTPUT) {
        capturedOutput = capturedOutput.slice(-MAX_CAPTURED_OUTPUT);
      }
    };

    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      appendOutput(chunk);
    });

    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
      appendOutput(chunk);
    });

    const forwardSignal = (signal) => {
      if (!child.killed) {
        child.kill(signal);
      }
    };

    process.on('SIGINT', forwardSignal);
    process.on('SIGTERM', forwardSignal);

    child.on('close', (code, signal) => {
      process.off('SIGINT', forwardSignal);
      process.off('SIGTERM', forwardSignal);
      resolve({ code, signal, output: capturedOutput });
    });
  });
}

main().catch((error) => {
  console.error('\n[build-runner] Failed to run `next build`.');
  console.error(error);
  process.exit(1);
});
