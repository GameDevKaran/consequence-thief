import { spawn } from 'node:child_process';
import http from 'node:http';
import { existsSync } from 'node:fs';
if(!existsSync('dist/index.html'))throw new Error('Run npm run build before npm run smoke');
const port=4667;
const child=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:String(port),SERVE_ROOT:process.cwd()+'/dist'},stdio:'ignore'});
let succeeded=false;
try{
  for(let attempt=0;attempt<24&&!succeeded;attempt++){
    await new Promise(resolve=>setTimeout(resolve,100));
    try {
      const html=await new Promise((resolve,reject)=>http.get(`http://127.0.0.1:${port}/`,r=>{let s='';r.on('data',d=>s+=d);r.on('end',()=>resolve({code:r.statusCode,body:s}));}).on('error',reject));
      if(html.code!==200||!html.body.includes('CONSEQUENCE THIEF'))throw new Error('Bad HTML');
      const js=await new Promise((resolve,reject)=>http.get(`http://127.0.0.1:${port}/src/main.js`,r=>{r.resume();r.on('end',()=>resolve(r.statusCode));}).on('error',reject));
      if(js!==200)throw new Error('Missing app JS');
      succeeded=true;
    }catch{ /* server warmup */ }
  }
  if(!succeeded)throw new Error('Local static host smoke failed');
  console.log('PASS: dist/index.html and app JS served (HTTP 200). Browser interaction and VR still require manual QA.');
}finally{child.kill();}
