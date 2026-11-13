import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = resolve('assets');
const destination = resolve('public/assets');
await mkdir(resolve('public'), { recursive: true });
await rm(destination, { recursive: true, force: true });
await cp(source, destination, { recursive: true, force: true });
const visionWasm = resolve('node_modules/@mediapipe/tasks-vision/wasm');
const publicWasm = resolve('public/mediapipe/wasm');
try {
  await mkdir(resolve('public/mediapipe'), { recursive: true });
  await rm(publicWasm, { recursive: true, force: true });
  await cp(visionWasm, publicWasm, { recursive: true, force: true });
  console.log('MediaPipe WASM runtime copied to public/mediapipe/wasm.');
} catch {
  console.warn('MediaPipe package WASM files are not installed yet. Run npm install, then npm run assets:sync.');
}
console.log('Original instrument assets copied to public/assets for Vite serving.');
