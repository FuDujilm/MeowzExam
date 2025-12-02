#!/usr/bin/env node
'use strict';

const { spawn } = require('node:child_process');

const NEXT_BIN = require.resolve('next/dist/bin/next');
const DEFAULT_PORT = '3001';
const MAX_CAPTURED_OUTPUT = 20000;
const debugRunner = process.env.DEV_RUNNER_DEBUG === '1';

const userArgs = process.argv.slice(2);
const normalizedArgs = ensurePortArg(userArgs);
const argsWithoutTurboFlags = normalizedArgs.filter(
  (arg) => !/^--?(?:turbo|turbopack)$/i.test(arg)
);

const turboArgs = ['dev', '--turbopack', ...argsWithoutTurboFlags];
const fallbackArgs = ['dev', '--webpack', ...argsWithoutTurboFlags];

async function main() {
  if (process.env.NEXT_DISABLE_TURBOPACK === '1') {
    await runNext(fallbackArgs);
    return;
  }

  const turboResult = await runNext(turboArgs);
  if (debugRunner) {
    console.log('\n[dev-runner] Turbopack output (truncated):\n');
    console.log(turboResult.output);
    console.log('\n[dev-runner] -------\n');
  }
  const output = turboResult.output.toLowerCase();
  const shouldFallback =
    output.includes('next.js package not found') ||
    output.includes("couldn't find the next.js package");
  if (debugRunner) {
    console.log(`[dev-runner] shouldFallback=${shouldFallback}`);
  }
  const exitedCleanly =
    turboResult.code === 0 && !turboResult.signal && !shouldFallback;

  if (exitedCleanly) {
    process.exit(0);
  }

  if (!shouldFallback) {
    process.exit(turboResult.code ?? 1);
  }

  console.warn(
    '\n[dev-runner] Turbopack crashed with "Next.js package not found". ' +
      'Starting a webpack dev server instead...\n'
  );

  const fallbackResult = await runNext(fallbackArgs, { disableTurbopack: true });
  process.exit(fallbackResult.code ?? 0);
}

function runNext(args, options = {}) {
  return new Promise((resolve) => {
    const fullArgs = [NEXT_BIN, ...args];
    const env = { ...process.env };
    if (options.disableTurbopack) {
      env.NEXT_DISABLE_TURBOPACK = '1';
      env.TURBOPACK = undefined;
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

function ensurePortArg(args) {
  const hasPort = args.some((arg) => {
    if (arg === '-p' || arg === '--port') {
      return true;
    }
    if (arg.startsWith('-p=') || arg.startsWith('--port=')) {
      return true;
    }
    return false;
  });

  if (hasPort) {
    return args;
  }

  return [...args, '-p', process.env.PORT || DEFAULT_PORT];
}

main().catch((error) => {
  console.error('\n[dev-runner] Failed to start Next.js dev server.');
  console.error(error);
  process.exit(1);
});
