import test from 'node:test';import assert from 'node:assert/strict';
import { createGame,updateGame,pointerDown,pointerUp,Phase,progress } from '../src/game.js';
test('intro automatically advances at 2.4 seconds',()=>{let g=createGame(0);updateGame(g,2.5);assert.equal(g.phase,Phase.STEAL);});
test('pinch extracts; release transfers; later pinch ends',()=>{
  let g=createGame(0);updateGame(g,2.5);
  assert.equal(pointerDown(g,2.6),'steal');assert.equal(g.phase,Phase.HELD);
  updateGame(g,3,[.3,1.4,-.7]);assert.equal(g.heldPosition[0],.3);
  assert.equal(pointerUp(g,3.1),'transfer');assert.equal(g.phase,Phase.TRANSFER);
  updateGame(g,7.2);assert.equal(g.phase,Phase.DEBT);
  assert.equal(pointerDown(g,7.4),'ending');updateGame(g,14.5);assert.equal(g.phase,Phase.COMPLETE);
  assert.equal(pointerDown(g,15),'replay');assert.equal(g.phase,Phase.INTRO);
});
test('ignores invalid transitions / does not skip steps',()=>{const g=createGame(0);assert.equal(pointerUp(g,0),null);assert.equal(pointerDown(g,0),null);assert.equal(g.phase,Phase.INTRO);});
test('hand position clamps unsafe coordinate spikes',()=>{const g=createGame(0);updateGame(g,2.6);pointerDown(g,2.7);updateGame(g,2.8,[50,-20,50]);assert.deepEqual(g.heldPosition,[2,.45,-.25]);});
test('progress is bounded',()=>{const g=createGame(0);updateGame(g,1.2);assert.ok(progress(g)>0.45&&progress(g)<0.55);});
test('the final consequence remains visible until replay',()=>{const g=createGame(0);updateGame(g,2.5);pointerDown(g,3);pointerUp(g,4);updateGame(g,8.1);pointerDown(g,9);updateGame(g,16.1);assert.equal(g.phase,Phase.COMPLETE);assert.equal(progress(g),1);pointerDown(g,17);assert.equal(progress(g),0);});
