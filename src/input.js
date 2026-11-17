/** Native WebXR hand pinch plus controller-trigger fallback. Hand tracking is optional at session start. */
export class Input {
  constructor(onDown, onUp, events = window) {
    this.onDown = onDown; this.onUp = onUp;
    this.mouseDown = false; this.controllerHeld = false; this.handHeld = false; this.handPoint = null;
    this.handSeen = false; this.session = null; this.heldBy = null; this.heldSource = null;
    const uiTarget = e => e.target?.closest?.('button, a, input, textarea, select, [contenteditable="true"]');
    events.addEventListener('pointerdown', e => {
      if (this.session || e.button !== 0 || uiTarget(e)) return;
      this.start('pointer', e.pointerId);
    });
    events.addEventListener('pointerup', e => this.finish('pointer', e.pointerId));
    events.addEventListener('keydown', e => {
      if (!this.session && e.code==='Space' && !e.repeat && !uiTarget(e)) {
        e.preventDefault();this.start('keyboard', 'Space');
      }
    });
    events.addEventListener('keyup', e => { if(e.code==='Space'){e.preventDefault();this.finish('keyboard', 'Space');} });
    // Losing desktop focus cancels input ownership, not an intentional release.
    const cancel = () => { if (this.heldBy==='pointer' || this.heldBy==='keyboard') this.reset(); };
    events.addEventListener('pointercancel', cancel);
    events.addEventListener('blur', cancel);
  }
  start(kind, source) {
    if (this.suspended || this.heldBy) return false;
    this.heldBy=kind;this.heldSource=source;
    this.mouseDown=kind==='pointer'||kind==='keyboard';this.controllerHeld=kind==='controller';this.handHeld=kind==='hand';
    if(kind==='controller')this.handPoint=null;
    this.onDown();return true;
  }
  finish(kind, source) {
    if (this.suspended || this.heldBy!==kind || this.heldSource!==source) return;
    this.heldBy=null;this.heldSource=null;this.mouseDown=false;this.controllerHeld=false;this.handHeld=false;
    this.onUp();
  }
  reset() {
    this.heldBy=null;this.heldSource=null;this.mouseDown=false;this.controllerHeld=false;this.handHeld=false;this.handPoint=null;
  }
  bindSession(session) {
    this.reset();this.session=session;this.handSeen=false;
    // Hands may emit select events too. Joint tracking exclusively owns their pinch edges.
    session.addEventListener('selectstart', e => {
      if(this.session===session && e.inputSource && !e.inputSource.hand)this.start('controller',e.inputSource);
    });
    session.addEventListener('selectend', e => {
      if(this.session===session && !e.inputSource?.hand)this.finish('controller',e.inputSource);
    });
    session.addEventListener('end', () => {if(this.session===session){this.reset();this.session=null;}});
  }
  updateXR(frame, session, referenceSpace) {
    if(this.session!==session)return null;
    if(this.heldBy==='controller')return null;
    // Keep the extracting hand as owner. An open opposite hand must never release it
    // while its joints are temporarily occluded. Reacquire a replaced same-side source.
    if(this.handHeld && !Array.from(session.inputSources).includes(this.heldSource)) {
      const replacement=Array.from(session.inputSources).find(s=>s.hand && s.handedness===this.heldSource.handedness);
      if(replacement)this.heldSource=replacement;
    }
    let detected=false, restingPoint=null;
    for (const source of session.inputSources) {
      if (!source.hand) continue;
      if(this.handHeld && source!==this.heldSource)continue;
      const thumb=source.hand.get('thumb-tip'), index=source.hand.get('index-finger-tip');
      if (!thumb || !index) continue;
      const t=frame.getJointPose(thumb, referenceSpace), i=frame.getJointPose(index, referenceSpace);
      if (!t || !i) continue;
      const a=t.transform.position,b=i.transform.position;
      if(![a.x,a.y,a.z,b.x,b.y,b.z].every(Number.isFinite))continue;
      detected=true;
      const d=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
      const point=[(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2];
      restingPoint=point;
      // Hysteresis avoids spurious release from optical-tracking noise.
      if (this.handHeld) {
        this.handPoint=point;
        if(d>=0.055)this.finish('hand',source);
        break;
      }
      if (d<0.032) {this.handPoint=point;this.start('hand',source);break;}
    }
    this.handSeen ||= detected;
    if(!this.handHeld && restingPoint)this.handPoint=restingPoint;
    return this.handPoint;
  }
}
