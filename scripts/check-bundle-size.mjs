import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const budget = 200 * 1024;
const html = readFileSync(resolve('dist/index.html'), 'utf8');
const scripts = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/gu)].map((match) => match[1]);

if (scripts.length === 0) {
  throw new Error('No initial JavaScript files were found in dist/index.html.');
}

const bytes = scripts.reduce((total, source) => {
  const path = resolve('dist', source.replace(/^\//u, ''));
  return total + gzipSync(readFileSync(path), { level: 9 }).byteLength;
}, 0);

const kilobytes = (bytes / 1024).toFixed(1);
console.log(`Initial JavaScript: ${kilobytes} KB gzip (budget: 200.0 KB)`);
if (bytes > budget) process.exitCode = 1;
