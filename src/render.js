import { Phase, progress } from './game.js';
import { storyText } from './story.js';

// All art is original and procedural. Main pass is a bounded SDF renderer with no external meshes/textures.
const vertex = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);
  vUv=p;
  gl_Position=vec4(p*2.0-1.0,0.0,1.0);
}`;
const fragment = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform mat4 uInvVP;
uniform vec3 uEye;
uniform vec3 uOrb;
uniform vec2 uRes;
uniform float uTime;
uniform float uAge;
uniform float uProgress;
uniform int uPhase;
#define PI 3.14159265359
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float sdBox(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0);}
float sdTorus(vec3 p,vec2 t){vec2 q=vec2(length(p.xy)-t.x,p.z);return length(q)-t.y;}
float sdOct(vec3 p,float s){p=abs(p);return (p.x+p.y+p.z-s)*0.57735027;}
float sdRoundBox(vec3 p,vec3 b,float r){return sdBox(p,b)-r;}
float sdCyl(vec3 p,vec2 h){vec2 d=abs(vec2(length(p.xz),p.y))-h;return min(max(d.x,d.y),0.0)+length(max(d,0.0));}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
vec2 add(vec2 a,vec2 b){return a.x < b.x?a:b;}
vec2 mapWorld(vec3 p){
  vec2 d=vec2(p.y,1.);
  // Hero framing: large incomplete luminous arc, a small platform and distant ceremonial geometry.
  vec3 arch=p-vec3(0.,1.54,-3.5);
  d=add(d,vec2(sdTorus(arch,vec2(1.48,.018)),5.));
  d=add(d,vec2(sdTorus(arch,vec2(1.35,.008)),6.));
  d=add(d,vec2(sdCyl(p-vec3(-.68,.26,-2.25),vec2(.41,.26)),2.));
  d=add(d,vec2(sdCyl(p-vec3(.73,.26,-2.75),vec2(.45,.26)),2.));
  vec3 crystal=p-vec3(-.68,1.29+.10*sin(uTime*.75),-2.25);
  d=add(d,vec2(sdOct(crystal,.46),3.));
  d=add(d,vec2(sdOct(crystal,.35),7.));
  // Source consequence is carried by a hand; before extraction, it floats over the glass.
  if(uPhase<=2) d=add(d,vec2(length(p-uOrb)-.11,4.));
  vec3 gate=p-vec3(.73,1.18,-2.75);
  float gateDist=sdRoundBox(gate,vec3(.30,.62,.11),.045);
  if(uPhase>=3){
    float spread=clamp(uAge*.65,0.,1.8);
    // Sections fly apart deterministically instead of requiring a physics engine.
    float left=sdRoundBox(gate-vec3(-.29*spread,.24*spread,0.),vec3(.14,.28,.095),.025);
    float right=sdRoundBox(gate-vec3(.28*spread,-.2*spread,0.),vec3(.13,.29,.095),.025);
    gateDist=min(left,right);
    if(uPhase>=4)gateDist=10.;
  }
  d=add(d,vec2(gateDist,8.));
  if(uPhase>=5){
    vec3 sky=p-vec3(0.,1.55,-3.5);
    float r=1.48 + .20*sin(9.*atan(sky.y,sky.x)+uTime*2.)*uProgress;
    d=add(d,vec2(sdTorus(sky,vec2(r,.012+.035*uProgress)),9.));
  }
  return d;
}
vec3 normal(vec3 p){vec2 e=vec2(.002,0.);return normalize(vec3(mapWorld(p+e.xyy).x-mapWorld(p-e.xyy).x,mapWorld(p+e.yxy).x-mapWorld(p-e.yxy).x,mapWorld(p+e.yyx).x-mapWorld(p-e.yyx).x));}
vec3 matColor(float id, vec3 p){
  if(id<1.5){
    float grid=pow(1.-smoothstep(.003,.026,min(abs(fract(p.x*.5)-.5),abs(fract(p.z*.5)-.5))),3.);
    float pools=exp(-2.5*length(p.xz-vec2(-.68,-2.25)))+exp(-2.5*length(p.xz-vec2(.73,-2.75)));
    return vec3(.015,.030,.052)+vec3(.02,.10,.14)*grid + vec3(.04,.06,.08)*pools;
  }
  if(id<2.5)return vec3(.065,.12,.16);
  if(id<3.5)return mix(vec3(.13,.42,.54),vec3(.42,.83,.78),.5+.5*sin(p.y*23.+p.x*7.));
  if(id<4.5)return vec3(.53,.97,.92);
  if(id<5.5)return vec3(.13,.29,.36);
  if(id<6.5)return vec3(.28,.35,.48);
  if(id<7.5)return vec3(.020,.055,.081);
  if(id<8.5){float crack=1.-smoothstep(.035,.095,abs(sin(p.y*22.+sin(p.x*19.)*3.)));
    return mix(vec3(.10,.095,.15),vec3(.89,.54,.38),crack*(uPhase>=3?1.:.22));}
  return vec3(1.0,.54,.26);
}
vec3 backdrop(vec3 rd){
  float h=clamp(rd.y*.5+.5,0.,1.);
  vec3 col=mix(vec3(.018,.034,.059),vec3(.004,.009,.025),h);
  float aurora=pow(max(0.,1.-abs(rd.x+.09*sin(rd.y*8.))*2.7),3.)*pow(max(rd.y+.1,0.),1.5);
  col+=vec3(.01,.05,.068)*aurora;
  vec2 cell=floor(vec2(atan(rd.z,rd.x)*72.,rd.y*160.));
  float star=step(.9915,hash(cell))*pow(hash(cell+47.),8.);
  col+=star*vec3(.16,.4,.52);
  if(uPhase>=5){
    float a=atan(rd.y,rd.x),r=length(rd.xy);
    float crack=pow(1.-smoothstep(0.,.022,abs(sin(a*12.+r*8.+sin(a*7.)))),4.);
    col+=vec3(.14,.14,.21)*crack*uProgress;
  }
  return col;
}
void main(){
  vec2 ndc=vUv*2.-1.;
  vec4 far=uInvVP*vec4(ndc,1.,1.);
  vec3 ro=uEye;
  vec3 rd=normalize(far.xyz/far.w-ro);
  vec3 color=backdrop(rd);
  float t=.05;vec2 hit=vec2(0.);vec3 p=ro;
  for(int i=0;i<64;i++){
    p=ro+rd*t;hit=mapWorld(p);
    if(hit.x<.003||t>20.)break;
    t+=max(.008,hit.x*.83);
  }
  if(t<20. && hit.x<.01){
    vec3 n=normal(p);
    vec3 key=normalize(vec3(-.48,.9,.46)),rim=normalize(vec3(.65,.35,-.6));
    float diff=max(dot(n,key),0.);
    float fringe=pow(1.-max(dot(n,-rd),0.),3.);
    float spec=pow(max(dot(reflect(-key,n),-rd),0.),26.);
    vec3 base=matColor(hit.y,p);
    vec3 lit=base*(.38+.76*diff)+vec3(.38,.7,.78)*spec*.37+fringe*vec3(.07,.18,.23);
    if(hit.y>3.5&&hit.y<4.5)lit+=vec3(.4,1.5,1.4);
    if(hit.y>4.5&&hit.y<6.5)lit+=vec3(.10,.27,.29);
    if(hit.y>8.5)lit+=vec3(1.8,.5,.24)*uProgress;
    float fog=1.-exp(-t*t*.0042);color=mix(lit,backdrop(rd),fog);
  }
  vec3 orb=uOrb;
  float orbDepth=dot(orb-ro,rd),distToOrb=length(cross(orb-ro,rd));
  if(orbDepth>0.){
    float power=uPhase==0?.24:(uPhase<=2?1.0:(uPhase==3?max(0.,1.-uAge):0.));
    color+=power*vec3(.10,.95,.87)*(.19*exp(-4.5*distToOrb)+.5*exp(-27.*distToOrb));
  }
  if(uPhase==3){
    float burst=exp(-2.5*uAge);vec3 target=vec3(.73,1.22,-2.75);
    float dist=length(cross(target-ro,rd));
    color+=vec3(1.6,.52,.32)*exp(-7.*dist)*burst*.9;
  }
  if(uPhase>=5){
    float flashes=uPhase==5?pow(max(0.,sin(uAge*4.8)),14.)*exp(-uAge*.42):0.;
    color+=vec3(.3,.6,.8)*flashes*.22;
    color+=vec3(.05,.3,.44)*uProgress*exp(-3.*length(rd.xy));
  }
  float vignette=1.-.35*dot(ndc*.7,ndc*.7);
  color*=vignette;
  color=color/(color+vec3(.7));
  color=pow(max(color,0.),vec3(.86));
  float grain=(hash(gl_FragCoord.xy+uTime*90.)-.5)*.009;
  outColor=vec4(color+grain,1.);
}`;
const textVertex=`#version 300 es
precision highp float;
uniform mat4 uVP;
out vec2 uv;
void main(){
  vec2 p=vec2((gl_VertexID==1||gl_VertexID==2||gl_VertexID==4)?1.:0.,(gl_VertexID==2||gl_VertexID==4||gl_VertexID==5)?1.:0.);
  // 2.4 m physical text board placed inside the actual 3D space.
  uv=vec2(p.x,1.-p.y);
  vec3 world=vec3((p.x-.5)*2.52,2.24+(p.y-.5)*.48,-2.68);
  gl_Position=uVP*vec4(world,1.);
}`;
const textFragment=`#version 300 es
precision mediump float;
uniform sampler2D uText;
in vec2 uv;
out vec4 color;
void main(){color=texture(uText,uv);if(color.a<.025)discard;}`;
function compile(gl, type, source) {
  const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Shader compile: '+gl.getShaderInfoLog(s));return s;
}
function program(gl,vs,fs){const p=gl.createProgram();gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error('Shader link: '+gl.getProgramInfoLog(p));return p;}
export class SceneRenderer {
  constructor(gl){
    this.gl=gl;this.main=program(gl,vertex,fragment);this.textProgram=program(gl,textVertex,textFragment);
    this.uniforms=Object.fromEntries(['uInvVP','uEye','uOrb','uRes','uTime','uAge','uProgress','uPhase'].map(x=>[x,gl.getUniformLocation(this.main,x)]));
    this.vpLocation=gl.getUniformLocation(this.textProgram,'uVP');
    this.textLocation=gl.getUniformLocation(this.textProgram,'uText');
    this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);
    this.labelCanvas=document.createElement('canvas');this.labelCanvas.width=1024;this.labelCanvas.height=256;
    this.labelTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.labelTexture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    this.lastLabel=-1;
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
  }
  refreshLabel(game){
    if(this.lastLabel===game.phase)return;this.lastLabel=game.phase;
    const c=this.labelCanvas,ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);
    ctx.fillStyle='rgba(4,13,26,.72)';ctx.beginPath();ctx.roundRect(25,26,974,204,34);ctx.fill();
    ctx.strokeStyle='rgba(75,230,221,.45)';ctx.lineWidth=3;ctx.stroke();
    const text=storyText(game.phase);
    ctx.textAlign='center';ctx.fillStyle='#70c7c8';ctx.font='600 26px system-ui';ctx.fillText(text.act,512,83);
    ctx.fillStyle='#f4f5f3';ctx.font='700 57px system-ui';ctx.fillText(text.title,512,146);
    ctx.fillStyle='#9ce7de';ctx.font='500 27px system-ui';ctx.fillText(text.subtitle,512,194);
    const gl=this.gl;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.labelTexture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);
  }
  render({invVP,vp,eye,viewport,game,time,hand}){
    const gl=this.gl;this.refreshLabel(game);
    gl.viewport(viewport.x,viewport.y,viewport.width,viewport.height);
    gl.disable(gl.BLEND);gl.useProgram(this.main);gl.bindVertexArray(this.vao);
    gl.uniformMatrix4fv(this.uniforms.uInvVP,false,invVP);
    gl.uniform3fv(this.uniforms.uEye,eye);
    const orb=game.phase===Phase.HELD?game.heldPosition:game.phase>=Phase.TRANSFER?[.73,1.26,-2.75]:[-.68,1.77,-2.25];
    gl.uniform3fv(this.uniforms.uOrb,orb);
    gl.uniform2f(this.uniforms.uRes,viewport.width,viewport.height);
    gl.uniform1f(this.uniforms.uTime,time);gl.uniform1f(this.uniforms.uAge,game.phaseElapsed);
    gl.uniform1f(this.uniforms.uProgress,progress(game));gl.uniform1i(this.uniforms.uPhase,game.phase);
    gl.drawArrays(gl.TRIANGLES,0,3);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.textProgram);gl.uniformMatrix4fv(this.vpLocation,false,vp);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.labelTexture);gl.uniform1i(this.textLocation,0);
    gl.drawArrays(gl.TRIANGLES,0,6);gl.disable(gl.BLEND);
  }
}
