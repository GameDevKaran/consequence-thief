import { XRDevice, metaQuest3 } from './vendor/iwer.module.js';
import { installRecording } from './recording.js';

// Official Meta IWER runtime. These controls change simulated device inputs only.
// The real application still requests an XRSession and reads XRFrame joint poses.
const device = new XRDevice(metaQuest3);
device.position.set(0, 1.56, 0);
device.fovy = 70 * Math.PI / 180;
device.primaryInputMode = 'hand';
device.stereoEnabled = false;
device.hands.left.position.set(-.25, 1.35, -.45);
device.hands.right.position.set(.25, 1.35, -.45);
device.hands.left.poseId = 'open';
device.hands.right.poseId = 'open';
device.installRuntime({ forceInstall: true });

const panel = document.createElement('aside');
panel.id = 'emulator-controls';
panel.setAttribute('aria-label', 'Official Meta IWER emulator controls');
panel.style.cssText = 'position:fixed;z-index:999999;top:82px;right:14px;width:280px;padding:14px;border:1px solid #57cac3;border-radius:10px;background:rgba(2,12,20,.95);color:#f1ffff;font:13px/1.5 system-ui;pointer-events:auto';
panel.innerHTML = `<strong>OFFICIAL META IWER 2.8.0</strong>
<div>Quest 3 emulation · not physical hardware</div>
<p>1. Enter immersive VR below.<br>2. Pinch, carry, then release.<br>3. Pinch again to face the consequence.</p>
<div style="display:flex;gap:6px;flex-wrap:wrap"><button id="sim-pinch" type="button">Pinch left hand</button><button id="sim-release" type="button">Release left hand</button><button id="sim-carry" type="button">Move held hand right</button><button id="sim-home" type="button">Reset hand position</button></div>
<p><label><input id="sim-stereo" type="checkbox"> Stereo eyes</label><br><label><input id="sim-tracking" type="checkbox" checked> Left hand tracked</label></p>
<label>Head view <select id="sim-look"><option value="0">Forward</option><option value="0.2">Look left</option><option value="-0.2">Look right</option></select></label>
<p><button id="sim-pause" type="button">Simulate system pause</button></p>
<output id="sim-status" aria-live="polite">Hands open · left tracked · mono</output>`;
document.body.append(panel);
const buttons = panel.querySelectorAll('button,select');
for (const item of buttons) item.style.cssText = 'font:12px system-ui;padding:7px;border:1px solid #367c80;border-radius:5px;background:#112e38;color:#fff;cursor:pointer';
let pinch = false, tracked = true, paused = false;
function status() {
  panel.querySelector('#sim-status').textContent = `${pinch ? 'Left pinch held' : 'Hands open'} · left ${tracked ? 'tracked' : 'occluded'} · ${device.stereoEnabled ? 'stereo' : 'mono'}${paused ? ' · paused' : ''}`;
}
panel.querySelector('#sim-pinch').onclick = () => { device.hands.left.updatePinchValue(1); pinch = true; status(); };
panel.querySelector('#sim-release').onclick = () => { device.hands.left.updatePinchValue(0); pinch = false; status(); };
panel.querySelector('#sim-carry').onclick = () => device.hands.left.position.set(.25, 1.35, -.55);
panel.querySelector('#sim-home').onclick = () => device.hands.left.position.set(-.25, 1.35, -.45);
panel.querySelector('#sim-stereo').onchange = event => { device.stereoEnabled = event.target.checked; status(); };
panel.querySelector('#sim-tracking').onchange = event => { tracked = event.target.checked; device.hands.left.connected = tracked; if(tracked)device.hands.left.updatePinchValue(pinch?1:0); status(); };
panel.querySelector('#sim-look').onchange = event => { const yaw = Number(event.target.value); device.quaternion.set(0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)); };
panel.querySelector('#sim-pause').onclick = event => { paused = !paused; device.updateVisibilityState(paused ? 'visible-blurred' : 'visible'); if(!paused)device.hands.left.updatePinchValue(pinch?1:0); event.target.textContent = paused ? 'Resume simulated headset' : 'Simulate system pause'; status(); };

await import('../src/main.js');
installRecording(panel);
