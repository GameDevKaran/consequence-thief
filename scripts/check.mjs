import { readFile, stat } from 'node:fs/promises';
const required=['index.html','style.css','src/main.js','src/render.js','src/game.js','src/input.js','src/math.js','src/audio.js','src/story.js'];
for (const f of required) {const s=await stat(f);if(s.size<20)throw new Error(`Empty file ${f}`);}
const game=await readFile('src/game.js','utf8');if(!game.includes('Phase.ENDING'))throw new Error('Story end missing');
console.log('Package structure OK; no npm dependencies.');
