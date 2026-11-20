import { spawn } from 'node:child_process';

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error('Jalankan skrip ini melalui "npm run dev" dari folder utama project.');
  process.exit(1);
}

const cwd = process.cwd();
const children = new Set();
let stopping = false;

function spawnNpm(args) {
  const child = spawn(process.execPath, [npmCli, ...args], {
    cwd,
    stdio: 'inherit',
    env: process.env,
    windowsHide: true
  });
  children.add(child);
  child.once('close', () => children.delete(child));
  child.once('error', (error) => {
    console.error(`Gagal menjalankan npm ${args.join(' ')}:`, error.message);
    process.exitCode = 1;
    stopChildren();
  });
  return child;
}

function stopChildren(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill(signal);
    }
  }
}

process.once('SIGINT', () => stopChildren());
process.once('SIGTERM', () => stopChildren());

const build = spawnNpm(['run', 'build']);
build.once('close', (code, signal) => {
  if (stopping) return;
  if (code !== 0) {
    process.exitCode = code ?? 1;
    if (signal) console.error(`Build dihentikan oleh signal ${signal}.`);
    stopChildren();
    return;
  }

  const frontend = spawnNpm(['run', 'dev', '--workspace', 'frontend']);
  const backend = spawnNpm(['run', 'dev', '--workspace', 'backend']);

  for (const child of [frontend, backend]) {
    child.once('close', (status, childSignal) => {
      if (stopping) return;
      if (status !== 0) process.exitCode = status ?? 1;
      if (childSignal) console.error(`Proses development berhenti oleh signal ${childSignal}.`);
      stopChildren();
    });
  }
});
