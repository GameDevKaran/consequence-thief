import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=process.env.SERVE_ROOT?path.resolve(process.env.SERVE_ROOT):path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT)||4173;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.png':'image/png'};
http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    const decoded=decodeURIComponent(url.pathname);
    if(decoded.split(/[\\/]/).some(part=>part.startsWith('.')||part==='node_modules'))throw new Error('Forbidden');
    const full=path.resolve(root,'.'+decoded); if(full!==root&&!full.startsWith(root+path.sep))throw new Error('Forbidden');
    const candidate=(await stat(full)).isDirectory()?path.join(full,'index.html'):full;
    const body=await readFile(candidate);
    res.writeHead(200,{'Content-Type':mime[path.extname(candidate)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);
  } catch(e) {res.writeHead(404);res.end('Not found');}
}).listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Consequence Thief: http://localhost:${port} (Quest requires HTTPS or secure tunnel)`));
