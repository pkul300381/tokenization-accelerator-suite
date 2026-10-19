import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(scriptDir, '..');
const repositoryDir = resolve(appDir, '../..');
const publicDir = resolve(appDir, 'public');

await mkdir(publicDir, { recursive: true });
await Promise.all([
  copyFile(resolve(repositoryDir, 'Opus-logo.webp'), resolve(publicDir, 'Opus-logo.webp')),
  copyFile(resolve(repositoryDir, 'Tokenization Suite Architecture.html'), resolve(publicDir, 'architecture.html')),
]);

console.log('Synchronized the logo and architecture reference page into the web app public assets.');
