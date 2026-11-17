/** Tiny WebGL column-major matrix library; no dependency or build step. */
export function multiply4(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let sum = 0; for (let k = 0; k < 4; k++) sum += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = sum;
  }
  return o;
}
export function inverse4(a) {
  const m = Array.from({length: 4}, (_, r) => [a[r], a[4+r], a[8+r], a[12+r], ...[0,1,2,3].map(c => +(c === r))]);
  for (let i = 0; i < 4; i++) {
    let pivot = i;
    for (let r = i + 1; r < 4; r++) if (Math.abs(m[r][i]) > Math.abs(m[pivot][i])) pivot = r;
    if (Math.abs(m[pivot][i]) < 1e-12) throw new Error('Singular matrix');
    [m[i], m[pivot]] = [m[pivot], m[i]];
    let div = m[i][i]; for (let j = 0; j < 8; j++) m[i][j] /= div;
    for (let r = 0; r < 4; r++) if (r !== i) {
      let factor = m[r][i]; for (let j = 0; j < 8; j++) m[r][j] -= factor * m[i][j];
    }
  }
  const out = new Float32Array(16);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) out[c * 4 + r] = m[r][c + 4];
  return out;
}
export function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
  return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]);
}
export function lookAt(eye, target, up=[0,1,0]) {
  const norm = v => { const l=Math.hypot(...v)||1; return v.map(x=>x/l); };
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const dot = (a,b) => a.reduce((s,x,i)=>s+x*b[i],0);
  const z = norm(eye.map((v,i)=>v-target[i])), x = norm(cross(up,z)), y = cross(z,x);
  return new Float32Array([x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0, -dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
}
