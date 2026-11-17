import test from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../src/input.js';

function hand(side) {return {handedness:side,hand:new Map([['thumb-tip',{}],['index-finger-tip',{}]])};}
function fixture() {
  const events=new EventTarget(),calls=[];
  const input=new Input(()=>calls.push('down'),()=>calls.push('up'),events);
  const session=new EventTarget();session.inputSources=[];input.bindSession(session);
  const poses=new Map();
  const frame={getJointPose:j=>poses.get(j)||null};
  const pose=(source,d)=>{for(const [name,j] of source.hand)poses.set(j,{transform:{position:{x:name==='thumb-tip'?0:d,y:1,z:-1}}});};
  const update=()=>input.updateXR(frame,session,{});
  const event=(type,source)=>{const e=new Event(type);e.inputSource=source;session.dispatchEvent(e);};
  return {input,session,poses,pose,update,event,calls,events};
}
test('one pinch owns both edges; synthesized hand select events cannot duplicate them',()=>{
  const f=fixture(),h=hand('right');f.session.inputSources=[h];
  f.pose(h,.02);f.event('selectstart',h);f.update();f.update();
  f.event('selectend',h);f.pose(h,.045);f.update();
  assert.deepEqual(f.calls,['down']);
  f.pose(h,.06);f.update();assert.deepEqual(f.calls,['down','up']);
});
test('opposite open hand cannot release an occluded owner',()=>{
  const f=fixture(),left=hand('left'),right=hand('right');f.session.inputSources=[left,right];
  f.pose(left,.08);f.pose(right,.02);f.update();const heldPoint=f.input.handPoint;
  for(const j of right.hand.values())f.poses.delete(j);
  f.update();assert.deepEqual(f.calls,['down']);assert.equal(f.input.handPoint,heldPoint);
  f.pose(right,.07);f.update();assert.deepEqual(f.calls,['down','up']);
});
test('replacement source of the same hand reacquires without accidental release',()=>{
  const f=fixture(),first=hand('right'),replacement=hand('right');f.session.inputSources=[first];
  f.pose(first,.02);f.update();f.session.inputSources=[replacement];f.update();
  assert.deepEqual(f.calls,['down']);f.pose(replacement,.02);f.update();
  assert.deepEqual(f.calls,['down']);f.pose(replacement,.07);f.update();
  assert.deepEqual(f.calls,['down','up']);
});
test('controller ownership ignores another controller and concurrent hand edges',()=>{
  const f=fixture(),a={},b={},h=hand('left');f.session.inputSources=[a,b,h];
  f.event('selectstart',a);f.event('selectstart',b);f.event('selectend',b);f.pose(h,.02);f.update();
  assert.deepEqual(f.calls,['down']);f.event('selectend',a);assert.deepEqual(f.calls,['down','up']);
});
test('session end resets ownership without committing a release',()=>{
  const f=fixture(),h=hand('right');f.session.inputSources=[h];f.pose(h,.02);f.update();
  f.session.dispatchEvent(new Event('end'));assert.deepEqual(f.calls,['down']);
  assert.equal(f.input.handHeld,false);assert.equal(f.input.handPoint,null);assert.equal(f.input.session,null);
});
test('visibility suspension preserves held input without dispatching a release',()=>{
  const f=fixture(),controller={};f.event('selectstart',controller);f.input.suspended=true;
  f.event('selectend',controller);assert.deepEqual(f.calls,['down']);assert.equal(f.input.controllerHeld,true);
  f.input.suspended=false;f.event('selectend',controller);assert.deepEqual(f.calls,['down','up']);
});
test('desktop input ignores secondary buttons and mixed release sources',()=>{
  const events=new EventTarget(),calls=[],i=new Input(()=>calls.push('down'),()=>calls.push('up'),events);
  function emit(type,props={}){const e=new Event(type,{cancelable:true});Object.assign(e,props);events.dispatchEvent(e);}
  emit('pointerdown',{button:2,pointerId:1});assert.deepEqual(calls,[]);
  emit('pointerdown',{button:0,pointerId:2});
  emit('keyup',{code:'Space'});emit('pointerup',{pointerId:1});assert.deepEqual(calls,['down']);
  emit('pointerup',{pointerId:2});assert.deepEqual(calls,['down','up']);
  emit('keydown',{code:'Space',repeat:false});emit('blur');assert.equal(i.mouseDown,false);
  assert.deepEqual(calls,['down','up','down']);
});
