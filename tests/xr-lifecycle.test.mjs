import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as gameAPI from '../src/game.js';
import * as mathAPI from '../src/math.js';
import {storyText} from '../src/story.js';

const source=(await readFile(new URL('../src/main.js',import.meta.url),'utf8')).replace(/^import .*;\r?$/gm,'');
function harness({rejectSpace=false}={}){
  let now=0,id=0;const desktop=new Map(),xrFrames=new Map(),elements=new Map(),draws=[];
  const gl={makeXRCompatible:async()=>{},bindFramebuffer(){},clearColor(){},clear(){}};
  for(const name of ['world','xr','restart','error','mode','act','title','instruction','cue','step1','step2','step3']){
    elements.set('#'+name,{width:100,height:100,hidden:true,classList:{toggle(){}},getContext:()=>gl,click(){this.onclick?.();}});
  }
  const session=new EventTarget();session.visibilityState='visible';session.inputSources=[];
  session.requestAnimationFrame=callback=>{const key=++id;xrFrames.set(key,callback);return key;};
  session.cancelAnimationFrame=key=>xrFrames.delete(key);
  session.updateRenderState=state=>session.renderState=state;
  session.requestReferenceSpace=async()=>{if(rejectSpace)throw Error('fixture reference-space rejection');return {};};
  session.end=async()=>session.dispatchEvent(new Event('end'));
  const document=new EventTarget();document.hidden=false;document.querySelector=selector=>elements.get(selector);
  const window=new EventTarget();window.devicePixelRatio=1;
  let input;
  class Input {constructor(down,up){this.down=down;this.up=up;input=this;}bindSession(s){this.session=s;}reset(){this.handPoint=null;}updateXR(){}}
  class SceneRenderer {render(args){draws.push({phase:args.game.phase,elapsed:args.game.phaseElapsed,time:args.time});}}
  class Sound {init(){}play(){}}
  class XRWebGLLayer {constructor(){this.framebuffer={};}getViewport(){return{x:0,y:0,width:100,height:100};}}
  const context={...gameAPI,...mathAPI,storyText,Input,SceneRenderer,Sound,XRWebGLLayer,document,window,innerWidth:100,innerHeight:100,console,
    performance:{now:()=>now*1000},navigator:{xr:{isSessionSupported:async()=>true,requestSession:async()=>session}},
    requestAnimationFrame:callback=>{const key=++id;desktop.set(key,callback);return key;},cancelAnimationFrame:key=>desktop.delete(key)};
  vm.runInNewContext(source,context);
  const identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  function desktopTick(seconds){now=seconds;const [key,callback]=desktop.entries().next().value;desktop.delete(key);callback(now*1000);}
  function xrTick(seconds,tracked=true){now=seconds;const [key,callback]=xrFrames.entries().next().value;xrFrames.delete(key);callback(now*1000,{session,getViewerPose:()=>tracked?{views:[{projectionMatrix:identity,transform:{inverse:{matrix:identity},position:{x:0,y:1.6,z:0}}}]}:null});}
  return{desktop,xrFrames,session,window,elements,draws,input,desktopTick,xrTick,setTime:v=>now=v,enter:()=>elements.get('#xr').onclick()};
}
test('failed XR setup preserves exactly one desktop RAF loop',async()=>{
  const h=harness({rejectSpace:true});assert.equal(h.desktop.size,1);
  await h.enter();assert.equal(h.window.__CT_QA__.xr,false);assert.equal(h.desktop.size,1);
  assert.equal(h.xrFrames.size,0);h.desktopTick(1);assert.equal(h.desktop.size,1);
  assert.match(h.elements.get('#error').textContent,/fixture reference-space rejection/);
});
test('XR visibility and tracking loss freeze time, then end resumes one desktop loop',async()=>{
  const h=harness();await h.enter();assert.equal(h.desktop.size,0);assert.equal(h.xrFrames.size,1);
  h.xrTick(1);assert.equal(h.window.__CT_QA__.phase,gameAPI.Phase.INTRO);
  h.setTime(1);h.session.visibilityState='hidden';h.session.dispatchEvent(new Event('visibilitychange'));
  assert.equal(h.input.suspended,true);h.xrTick(21);assert.equal(h.window.__CT_QA__.paused,true);
  h.session.visibilityState='visible';h.session.dispatchEvent(new Event('visibilitychange'));h.xrTick(21.5);
  assert.equal(h.window.__CT_QA__.phase,gameAPI.Phase.INTRO);
  assert.ok(Math.abs(h.draws.at(-1).elapsed-1.5)<.001);
  h.xrTick(22,false);h.xrTick(42,false);h.xrTick(42.4);
  assert.equal(h.window.__CT_QA__.phase,gameAPI.Phase.INTRO);
  assert.ok(Math.abs(h.draws.at(-1).elapsed-2)<.001);
  await h.session.end();assert.equal(h.desktop.size,1);assert.equal(h.xrFrames.size,0);
  h.desktopTick(42.5);assert.equal(h.desktop.size,1);
});
