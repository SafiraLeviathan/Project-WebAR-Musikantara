import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptDirectory, '..');
const projectRoot = resolve(frontendRoot, '..');
const candidates = [
  resolve(projectRoot, 'node_modules/mind-ar/dist/mindar-image-three.prod.js'),
  resolve(frontendRoot, 'node_modules/mind-ar/dist/mindar-image-three.prod.js')
];

const entryPath = candidates.find((candidate) => existsSync(candidate));
if (!entryPath) {
  console.error('MindAR entry file was not found. Run npm install from the project root first.');
  process.exit(1);
}

const original = readFileSync(entryPath, 'utf8');
const patched = original
  .replace(/\bsRGBEncoding\b/g, 'SRGBColorSpace')
  .replace(/\boutputEncoding\b/g, 'outputColorSpace');

if (/\bsRGBEncoding\b/.test(patched)) {
  console.error('MindAR compatibility patch failed: legacy sRGBEncoding reference remains.');
  process.exit(1);
}

if (patched !== original) {
  writeFileSync(entryPath, patched, 'utf8');
  console.log('MindAR compatibility patch applied: sRGBEncoding/outputEncoding → SRGBColorSpace/outputColorSpace.');
} else if (/\bSRGBColorSpace\b/.test(original)) {
  console.log('MindAR compatibility patch already active.');
} else {
  console.error('Unexpected MindAR bundle format. No known color-space API was found; refusing a silent build.');
  process.exit(1);
}
