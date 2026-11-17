import test from 'node:test';import assert from 'node:assert/strict';
import {multiply4,inverse4,perspective,lookAt} from '../src/math.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<0.0001,`${a} !== ${b}`);
test('invert matrix and recover identity',()=>{const a=multiply4(perspective(1.2,1.4,.1,200),lookAt([0,1.6,0],[0,1,-2]));const i=multiply4(a,inverse4(a));for(let r=0;r<4;r++)for(let c=0;c<4;c++)close(i[c*4+r],r===c?1:0);});
test('perspective right-handed projection',()=>{const m=perspective(Math.PI/2,1,.1,100);close(m[0],1);close(m[5],1);close(m[11],-1);});
