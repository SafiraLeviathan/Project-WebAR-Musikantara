import { cp, mkdir, access, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const candidates = [
  resolve(here, '../node_modules/@mediapipe/tasks-vision/wasm'),
  resolve(here, '../../node_modules/@mediapipe/tasks-vision/wasm')
];
const destination = resolve(here, '../public/mediapipe/wasm');
const requiredFiles = ['vision_wasm_internal.js', 'vision_wasm_internal.wasm'];

let copied = false;

for (const source of candidates) {
  try {
    await Promise.all(requiredFiles.map((file) => access(resolve(source, file))));

    await mkdir(dirname(destination), { recursive: true });
    await rm(destination, { recursive: true, force: true });
    await cp(source, destination, { recursive: true, force: true });

    await Promise.all(requiredFiles.map((file) => access(resolve(destination, file))));
    console.log(`MediaPipe ${requiredFiles.join(' + ')} copied from ${source}`);
    copied = true;
    break;
  } catch {
    // Try the next npm workspace installation location.
  }
}

if (!copied) {
  console.warn(
    'MediaPipe WASM local assets were not copied. The gesture sensor will try the pinned official CDN fallback.'
  );
}
