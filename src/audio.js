/** Self-contained original synth score. Does not request mic/network or external audio files. */
export class Sound {
  constructor() { this.ctx = null; this.master = null; Sound.current = this; }
  capture() {
    this.init();
    if(!this.ctx)return null;
    const destination=this.ctx.createMediaStreamDestination();
    this.master.connect(destination);
    return {stream:destination.stream,release:()=>this.master.disconnect(destination)};
  }
  init() {
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain(); this.master.gain.value = 0.17; this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { console.warn('Audio unavailable:', e); }
  }
  tone(freq, duration, type = 'sine', gain = 0.2, endFreq = freq) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, osc = this.ctx.createOscillator(), amp = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t); osc.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq), t+duration);
    amp.gain.setValueAtTime(0.0001,t); amp.gain.exponentialRampToValueAtTime(gain,t+0.025);
    amp.gain.exponentialRampToValueAtTime(0.0001,t+duration);
    osc.connect(amp); amp.connect(this.master); osc.start(t); osc.stop(t+duration+0.02);
  }
  noise(duration = 0.5, gain=0.15) {
    if (!this.ctx) return;
    const t=this.ctx.currentTime,n=Math.ceil(duration*this.ctx.sampleRate),buffer=this.ctx.createBuffer(1,n,this.ctx.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<n;i++) data[i]=(Math.random()*2-1)*Math.pow(1-i/n,1.4);
    const node=this.ctx.createBufferSource(),amp=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();
    node.buffer=buffer;filter.type='lowpass';filter.frequency.value=1200;
    amp.gain.value=gain;node.connect(filter);filter.connect(amp);amp.connect(this.master);node.start(t);node.stop(t+duration);
  }
  play(action) {
    this.init();
    if (action==='steal') {this.tone(300,0.8,'sine',0.14,90);this.tone(590,0.9,'triangle',0.05,1100);}
    if (action==='transfer') {this.noise(1.5,0.22);this.tone(70,1.7,'sawtooth',0.3,28);this.tone(990,0.8,'sine',0.05,180);}
    if (action==='ending') {this.noise(2.5,0.25);this.tone(100,3,'sawtooth',0.22,35);[0,0.17,0.35].forEach((_,i)=>this.tone([220,330,440][i],3.8,'sine',0.08,660));}
    if (action==='replay') this.tone(490,0.3,'triangle',0.1,260);
    if (action==='ready') this.tone(280,0.9,'sine',0.08,560);
  }
}
