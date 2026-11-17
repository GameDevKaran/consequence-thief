import { createGame, updateGame, pointerDown, pointerUp, Phase } from './game.js';
import { multiply4, inverse4, perspective, lookAt } from './math.js';
import { SceneRenderer } from './render.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { storyText } from './story.js';

const canvas = document.querySelector('#world'), xrButton = document.querySelector('#xr'), restartButton = document.querySelector('#restart');
const errBox = document.querySelector('#error'), mode = document.querySelector('#mode');
const gl = canvas.getContext('webgl2',{ antialias:false, alpha:false, depth:false, stencil:false, xrCompatible:true, powerPreference:'high-performance' });
if (!gl) {
  errBox.hidden=false;errBox.textContent='WebGL 2 is unavailable. Open this experience in a current Chrome or Meta Quest Browser.';
  throw new Error('WebGL 2 not supported');
}
const game=createGame(0), audio=new Sound();
let renderer;
try{renderer=new SceneRenderer(gl);}catch(e){errBox.hidden=false;errBox.textContent=`Graphics initialization failed: ${e.message}`;throw e;}
let session=null, space=null, runStart=performance.now()/1000, lastPhase=-1;
let desktopFrame=null, xrFrame=null, xrStarting=false, pausedAt=null;
const t=()=>(pausedAt ?? performance.now()/1000)-runStart;
function pauseClock(){if(pausedAt===null)pausedAt=performance.now()/1000;input.suspended=true;}
function resumeClock(){if(pausedAt!==null){runStart+=performance.now()/1000-pausedAt;pausedAt=null;}input.suspended=false;}
function syncVisibility(){
  const visible=session?session.visibilityState==='visible':!document.hidden;
  if(xrStarting||!visible)pauseClock();else resumeClock();
}
function scheduleDesktop(){if(!session&&desktopFrame===null)desktopFrame=requestAnimationFrame(renderDesktop);}
function stopDesktop(){if(desktopFrame!==null){cancelAnimationFrame(desktopFrame);desktopFrame=null;}}
function scheduleXR(active){if(session===active&&xrFrame===null)xrFrame=active.requestAnimationFrame(renderXR);}
function dispatch(result){if(result)audio.play(result);}
const input = new Input(()=>{if(pausedAt===null&&!xrStarting)dispatch(pointerDown(game,t()));},()=>{if(pausedAt===null&&!xrStarting)dispatch(pointerUp(game,t()));});
restartButton.onclick=()=>{runStart=performance.now()/1000;pausedAt=null;input.reset();Object.assign(game,createGame(0));lastPhase=-1;syncVisibility();audio.play('replay');};
function updateUI() {
  if(game.phase===lastPhase)return;
  lastPhase=game.phase;
  const story=storyText(game.phase);
  document.querySelector('#act').textContent=story.act;
  document.querySelector('#title').textContent=story.title;
  document.querySelector('#instruction').textContent=story.subtitle;
  const cues=['THE WORLD WILL WAIT FOR YOU','TAKE WHAT SHOULD NOT BE TAKEN','CARRY IT. RELEASE IT.','ONE THING MUST PAY FOR ANOTHER','THE WORLD REMEMBERS','THERE IS NO ESCAPE','CLICK / PINCH TO EXPERIENCE IT AGAIN'];
  document.querySelector('#cue').textContent=cues[game.phase];
  ['step1','step2','step3'].forEach((id,i)=>document.querySelector('#'+id).classList.toggle('active',game.phase>=(i===0?0:i===1?3:4)));
  if(game.phase===Phase.STEAL)audio.play('ready');
}
function resize(){const dpr=Math.min(window.devicePixelRatio||1,1.25);const w=Math.max(2,Math.floor(innerWidth*dpr)),h=Math.max(2,Math.floor(innerHeight*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}}
function renderDesktop(now){
  desktopFrame=null;if(session)return;
  syncVisibility();resize();const time=t();updateGame(game,time);updateUI();
  // slow dolly and subtle perspective shift; scene stays stable and comfortable during VR.
  const eye=[Math.sin(time*.15)*.06,1.56,0];
  const projection=perspective(70*Math.PI/180,canvas.width/canvas.height,.05,70);
  const view=lookAt(eye,[0,1.42,-2.75]);const vp=multiply4(projection,view),invVP=inverse4(vp);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);
  renderer.render({invVP,vp,eye,game,time,hand:null,viewport:{x:0,y:0,width:canvas.width,height:canvas.height}});
  scheduleDesktop();
}
function renderXR(time,frame){
  const active=frame.session;if(!session||session!==active)return;
  xrFrame=null;scheduleXR(active);
  if(active.visibilityState!=='visible'){pauseClock();return;}
  const pose=frame.getViewerPose(space);if(!pose){pauseClock();return;}
  resumeClock();const seconds=t();
  input.updateXR(frame,active,space);
  updateGame(game,seconds,input.handPoint);updateUI();
  const layer=active.renderState.baseLayer;
  gl.bindFramebuffer(gl.FRAMEBUFFER,layer.framebuffer);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);
  for(const view of pose.views){
    const vp=multiply4(view.projectionMatrix,view.transform.inverse.matrix);
    const invVP=inverse4(vp);const pos=view.transform.position;
    const eye=[pos.x,pos.y,pos.z],viewport=layer.getViewport(view);
    renderer.render({invVP,vp,eye,game,time:seconds,hand:input.handPoint,viewport});
  }
}
async function initXR(){
  if(!navigator.xr){xrButton.textContent='VR: USE QUEST BROWSER';xrButton.disabled=true;return;}
  try{const supported=await navigator.xr.isSessionSupported('immersive-vr');
    if(supported){xrButton.disabled=false;xrButton.textContent='ENTER IMMERSIVE VR';}
    else{xrButton.disabled=true;xrButton.textContent='VR DEVICE NOT FOUND';}
  }catch(e){xrButton.disabled=true;xrButton.textContent='VR UNAVAILABLE';}
}
xrButton.onclick=async()=>{
  if(xrStarting)return;
  if(session){try{await session.end();}catch(e){errBox.hidden=false;errBox.textContent=`Cannot exit VR: ${e.message}`;}return;}
  xrStarting=true;xrButton.disabled=true;syncVisibility();
  let candidate=null, candidateEnded=false;
  try{
    audio.init();await gl.makeXRCompatible();
    // Native local-floor space with optional hands and controller-select fallback.
    candidate=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor'],optionalFeatures:['hand-tracking']});
    candidate.addEventListener('end',()=>{
      candidateEnded=true;if(session!==candidate)return;
      if(xrFrame!==null)candidate.cancelAnimationFrame(xrFrame);
      xrFrame=null;session=null;space=null;
      input.reset();input.session=null;
      xrButton.textContent='ENTER IMMERSIVE VR';mode.textContent='DESKTOP: HOLD + RELEASE CLICK / SPACE';
      syncVisibility();scheduleDesktop();
    });
    candidate.updateRenderState({baseLayer:new XRWebGLLayer(candidate,gl,{alpha:false,antialias:false,framebufferScaleFactor:.72})});
    const nextSpace=await candidate.requestReferenceSpace('local-floor');
    if(candidateEnded)throw new Error('The immersive session ended before initialization completed');
    // Publish the active session only after every awaited setup step succeeds.
    stopDesktop();session=candidate;space=nextSpace;input.bindSession(candidate);
    candidate.addEventListener('visibilitychange',()=>{if(session===candidate)syncVisibility();});
    xrButton.textContent='EXIT VR';mode.textContent='VR: PINCH / RELEASE OR CONTROLLER TRIGGER';
    runStart=performance.now()/1000;pausedAt=null;Object.assign(game,createGame(0));lastPhase=-1;
    errBox.hidden=true;scheduleXR(candidate);
  }catch(e){
    if(candidate&&!candidateEnded){try{await candidate.end();}catch{}}
    if(session===candidate){session=null;space=null;xrFrame=null;input.reset();input.session=null;}
    errBox.hidden=false;errBox.textContent=`Cannot enter immersive VR: ${e.message}. Check HTTPS and Meta Quest Browser, or play on desktop.`;
    xrButton.textContent='ENTER IMMERSIVE VR';scheduleDesktop();
  }finally{
    xrStarting=false;xrButton.disabled=false;syncVisibility();
  }
};
document.addEventListener('visibilitychange',syncVisibility);
window.addEventListener('resize',resize);
window.addEventListener('error',event=>{console.error(event.error||event.message);});
initXR();syncVisibility();scheduleDesktop();
// Developer-only state inspection for QA. Not used for telemetry or analytics.
window.__CT_QA__={get phase(){return game.phase},get transitions(){return game.transitionCount},get xr(){return !!session},get paused(){return pausedAt!==null},restart:()=>restartButton.click()};
