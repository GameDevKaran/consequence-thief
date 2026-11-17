import {readFile, writeFile, mkdir} from 'node:fs/promises';
const parts=['game','math','story','audio','input','render','main'];
let js='';
for(const name of parts){
  let chunk=await readFile(`src/${name}.js`,'utf8');
  chunk=chunk.replace(/^import\s+.*?\s+from\s+['"][^'"]+['"];?\s*$/gm,'');
  chunk=chunk.replace(/\bexport\s+(?=(?:const|class|function)\b)/g,'');
  js+=`\n// MODULE: ${name}\n`+chunk+'\n';
}
const html=await readFile('index.html','utf8'),css=await readFile('style.css','utf8');
const one=html.replace('<link rel="stylesheet" href="./style.css">',`<style>${css}</style>`)
.replace('<script type="module" src="./src/main.js"></script>',`<script>${js.replaceAll('</script>', '<\\/script>')}</script>`);
await mkdir('dist',{recursive:true});await writeFile('dist/offline-preview.html',one);
console.log('Extra offline-preview.html ready for file:// browser QA (not primary production output).');
