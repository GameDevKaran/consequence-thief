import {Sound} from '../src/audio.js';
// Records actual rendered frames and game audio, never microphone input.
export function installRecording(panel) {
  const controls = document.createElement('div');
  controls.innerHTML = '<p><button id="capture-start" type="button">Record gameplay</button> <button id="capture-stop" type="button" disabled>Stop recording</button></p><output id="capture-status">Canvas capture · silent · emulator footage</output><a id="capture-download" hidden>Download gameplay WebM</a>';
  panel.append(controls);
  const start=controls.querySelector('#capture-start'), stop=controls.querySelector('#capture-stop'), status=controls.querySelector('#capture-status'), link=controls.querySelector('#capture-download');
  for(const b of [start,stop])b.style.cssText='font:12px system-ui;padding:7px;border:1px solid #367c80;border-radius:5px;background:#112e38;color:#fff;cursor:pointer';
  link.style.cssText='display:block;color:#9ffff5;margin-top:8px';
  let recorder, stream, soundCapture, chunks=[], url, started, timer;
  start.onclick=()=>{
    try {
      const canvas=document.querySelector('#world');
      if(!canvas.captureStream||!window.MediaRecorder)throw Error('Canvas recording is unavailable in this browser');
      if(url)URL.revokeObjectURL(url);link.hidden=true;chunks=[];
      stream=canvas.captureStream(30);
      soundCapture=Sound.current?.capture();
      for(const track of soundCapture?.stream.getAudioTracks()||[])stream.addTrack(track);
      const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));
      recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5000000});
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onerror=e=>{status.textContent=`Recording error: ${e.error?.message||'unknown'}`;};
      recorder.onstop=()=>{
        clearInterval(timer);soundCapture?.release();stream.getTracks().forEach(t=>t.stop());
        const blob=new Blob(chunks,{type:recorder.mimeType});url=URL.createObjectURL(blob);
        link.href=url;link.download='consequence-thief-iwer-gameplay.webm';link.hidden=false;
        status.textContent=`Saved ${Math.round((performance.now()-started)/1000)} seconds · ${(blob.size/1048576).toFixed(1)} MB · IWER emulation · ${soundCapture?'game audio':'silent'}`;
        start.disabled=false;stop.disabled=true;
      };
      recorder.start(1000);started=performance.now();start.disabled=true;stop.disabled=false;
      timer=setInterval(()=>status.textContent=`Recording ${Math.floor((performance.now()-started)/1000)}s · real IWER canvas`,500);
    } catch(e) {status.textContent=e.message;start.disabled=false;stop.disabled=true;}
  };
  stop.onclick=()=>{if(recorder?.state==='recording')recorder.stop();};
}
