/** Opt-in development harness. Never included by the production build. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const archive = path.join(root, '.local/emulator/iwer-2.8.0.tgz');
const expected = '7TKWVKl/FCPP7WMCqkwCod1peol4EkSmgveOdbtpjuACBSqVumFXjy/UUnMWMUjaaLNWwZZGXDkI+J6il+r5FQ==';
await mkdir(path.dirname(archive), { recursive: true });
let bytes;
try { bytes = await readFile(archive); } catch {
  const response = await fetch('https://registry.npmjs.org/iwer/-/iwer-2.8.0.tgz');
  if (!response.ok) throw new Error(`IWER download failed: ${response.status}`);
  bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(archive, bytes);
}
if (createHash('sha512').update(bytes).digest('base64') !== expected) throw new Error('IWER package integrity mismatch');
const vendor = path.join(root, 'qa/vendor');
await mkdir(vendor, { recursive: true });
for (const [member, output] of [['package/build/iwer.module.js', 'iwer.module.js'], ['package/LICENSE', 'LICENSE-IWER']]) {
  const data = execFileSync('tar', ['-xOf', archive, member], { maxBuffer: 16 * 1024 * 1024 });
  await writeFile(path.join(vendor, output), data);
}
let html = await readFile(path.join(root, 'index.html'), 'utf8');
html = html.replace('<head>', '<head><base href="../">');
html = html.replace('<title>', '<title>IWER EMULATOR / ');
html = html.replace('./src/main.js', './qa/emulator.js');
await writeFile(path.join(root, 'qa/emulator.html'), html);
console.log('Verified official Meta IWER 2.8.0. Open http://localhost:4173/qa/emulator.html');
