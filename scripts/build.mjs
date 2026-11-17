import { rm, mkdir, cp, copyFile, writeFile } from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const p of ['src','public'])await cp(p,`dist/${p}`,{recursive:true});
for(const p of ['index.html','style.css','manifest.webmanifest'])await copyFile(p,`dist/${p}`);
await writeFile('dist/_headers','/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: xr-spatial-tracking=(self)\n');
await import('./build-single.mjs');
console.log('Static output ready in dist/ (including self-contained offline-preview.html)');
