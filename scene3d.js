/* Diyar Dent — scroll-driven 3D dental implant (plain WebGL, no libraries).
   Physically-based shading with a procedural studio environment, ACES tone-mapping,
   detailed implant (helical thread, cutting flutes, hex socket), gold abutment, porcelain crown,
   gingiva and translucent bone with trabecular pattern, seat-impact rings and floating motes. */
(function(){
var inst=null,PI=Math.PI;
function m4(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}
function mul(a,b){var o=new Float32Array(16);for(var c=0;c<4;c++)for(var r=0;r<4;r++){var s=0;for(var k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o}
function persp(f,a,n,z){var t=1/Math.tan(f/2),o=new Float32Array(16);o[0]=t/a;o[5]=t;o[10]=(z+n)/(n-z);o[11]=-1;o[14]=2*z*n/(n-z);return o}
function sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]]}function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function norm(a){var l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]}
function look(e,c,roll){var z=norm(sub(e,c)),x=norm(cross([0,1,0],z)),y=cross(z,x);
 return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,e),-dot(y,e),-dot(z,e),1])}
function model(y,ry,s,x,z){s=s||1;var c=Math.cos(ry)*s,sn=Math.sin(ry)*s,o=m4();o[0]=c;o[2]=-sn;o[8]=sn;o[10]=c;o[5]=s;o[12]=x||0;o[13]=y;o[14]=z||0;return o}
function sm(a,b,x){x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x)}
function lerp(a,b,t){return a+(b-a)*t}
function keys(p,k){for(var i=0;i<k.length-1;i++){if(p<=k[i+1][0]){var t=sm(k[i][0],k[i+1][0],p);return lerp(k[i][1],k[i+1][1],t)}}return k[k.length-1][1]}

/* lathe from a profile of [r,y,flag]; mod() can bend the radius per angle (threads, hex, lobes) */
function lathe(pts,seg,mod,sx,sz){
 var R=pts.length,pos=new Float32Array(R*(seg+1)*3),idx=[],i,j,k=0;
 for(i=0;i<R;i++)for(j=0;j<=seg;j++){var th=j/seg*PI*2,r=pts[i][0],dy=0;if(mod){var m=mod(i,th,pts[i]);if(typeof m==='number')r=m;else{r=m[0];dy=m[1]}}pos[k++]=r*Math.cos(th)*(sx||1);pos[k++]=pts[i][1]+dy;pos[k++]=r*Math.sin(th)*(sz||1)}
 for(i=0;i<R-1;i++)for(j=0;j<seg;j++){var a=i*(seg+1)+j,b=a+seg+1;idx.push(a,b,a+1,a+1,b,b+1)}
 var nor=new Float32Array(pos.length);
 for(i=0;i<idx.length;i+=3){var A=idx[i]*3,B=idx[i+1]*3,C=idx[i+2]*3,
  u=[pos[B]-pos[A],pos[B+1]-pos[A+1],pos[B+2]-pos[A+2]],v=[pos[C]-pos[A],pos[C+1]-pos[A+1],pos[C+2]-pos[A+2]],n=cross(u,v);
  [A,B,C].forEach(function(q){nor[q]+=n[0];nor[q+1]+=n[1];nor[q+2]+=n[2]})}
 /* close the seam and the poles so there is no visible line */
 for(i=0;i<R;i++){var a0=i*(seg+1)*3,a1=a0+seg*3,pole=pts[i][0]===0;
  if(pole){var sx2=0,sy=0,sz2=0;for(j=0;j<=seg;j++){sx2+=nor[a0+j*3];sy+=nor[a0+j*3+1];sz2+=nor[a0+j*3+2]}for(j=0;j<=seg;j++){nor[a0+j*3]=sx2;nor[a0+j*3+1]=sy;nor[a0+j*3+2]=sz2}}
  else{for(var c=0;c<3;c++){var m=nor[a0+c]+nor[a1+c];nor[a0+c]=m;nor[a1+c]=m}}}
 for(i=0;i<nor.length;i+=3){var l=Math.hypot(nor[i],nor[i+1],nor[i+2])||1;nor[i]/=l;nor[i+1]/=l;nor[i+2]/=l}
 return{pos:pos,nor:nor,idx:new Uint16Array(idx)}
}
function build(){
 /* ---- implant: tapered body, helical thread, apical cutting flutes, micro-grooved neck, hex socket ---- */
 var ip=[[0,-2.3,0],[.1,-2.295,0],[.2,-2.262,0],[.28,-2.195,0],[.335,-2.1,0]],N=300,i;
 for(i=0;i<=N;i++){var y=-2.04+1.7*i/N;ip.push([.37+.03*i/N,y,1])}
 for(i=0;i<=16;i++){ip.push([.455,-.33+.3*i/16,3])}
 ip.push([.5,-.03,0],[.5,0,0],[.3,0,0],[.28,-.01,2],[.28,-.5,2],[0,-.5,2]);
 var imp=lathe(ip,96,function(i,th,p){var r=p[0],y=p[1],f=p[2];
  if(f===1){var ph=y/.2+th/(PI*2),fr=ph-Math.floor(ph),tri=1-Math.abs(fr*2-1),d=.082*Math.min(1,Math.max(.2,(y+2.05)/.5));
   r+=d*Math.min(1,tri*2.4);
   if(y<-1.45){var g=Math.max(0,Math.cos(3*th+y*2.6));r*=1-.2*Math.pow(g,9)*Math.min(1,(-1.45-y)/.4)}return r}
  if(f===3)return r+.012*Math.sin(y*130);
  if(f===2&&r>0){var a=((th%(PI/3))+PI/3)%(PI/3)-PI/6;return r/Math.cos(a)}
  return r},1,1);
 /* ---- abutment (anodised gold): hex post, flange, tapered shoulder, screw-access hole ---- */
 var ap=[[0,-.5,2],[.24,-.5,2],[.24,.004,2],[.5,.004,0],[.51,.035,0],[.49,.12,0],[.44,.26,0],[.385,.45,0],[.355,.7,0],[.345,.95,0],[.32,1.09,0],[.26,1.13,0],[.2,1.12,0],[.15,1.07,0],[.13,.95,0],[0,.95,0]];
 var abu=lathe(ap,72,function(i,th,p){var r=p[0];if(p[2]===2&&r>0){var a=((th%(PI/3))+PI/3)%(PI/3)-PI/6;return r/Math.cos(a)}return r});
 /* ---- crown: porcelain molar, rounded-square section, occlusal table with cusps and central fossa ---- */
 var cp=[[0,.42,0]],y0=.42,H=1.25,n=60;
 for(i=0;i<=n;i++){var t=i/n,r=.62*(.9+.1*Math.sin(Math.min(1,t*1.4)*PI/2))*(1-.1*Math.pow(t,2.2));cp.push([r,y0+H*t,t])}
 cp.push([.52,y0+H-.01,10],[.44,y0+H+.02,11],[.32,y0+H-.03,12],[.17,y0+H-.1,13],[0,y0+H-.13,14]);
 var cro=lathe(cp,96,function(i,th,p){var f=p[2],c=Math.abs(Math.cos(th)),s2=Math.abs(Math.sin(th)),sq=Math.pow(Math.pow(c,4)+Math.pow(s2,4),-.25),r=p[0]*sq;
  if(f>=10){var k=f<=11?1:(f===12?.7:.35);return[r,.075*k*Math.cos(2*th)+.04*k*Math.cos(4*th)]}
  return[r,0]},1.12,.95);
 /* ---- gingiva ---- */
 var gp=[[.6,-.3,0],[.58,0,0],[.56,.18,0],[.6,.3,0],[.75,.35,0],[1.0,.29,0],[1.25,.15,0],[1.45,-.02,0],[1.52,-.3,0]];
 var gum=lathe(gp,96,function(i,th,p){return p[0]*(1+.015*Math.sin(5*th))});
 /* ---- bone ---- */
 var bp=[[0,-2.78,0],[1.45,-2.78,0],[1.82,-2.65,0],[1.96,-2.35,0],[1.98,-1.2,0],[1.96,-.4,0],[1.92,-.05,0],[1.7,.015,0],[0,.015,0]];
 var bone=lathe(bp,96,function(i,th,p){return p[0]*(p[0]>1?1+.02*Math.sin(3*th+p[1]*2):1)});
 /* ---- ring for seat-impact effects ---- */
 var ring=lathe([[.9,0,0],[1,0,0]],96);
 return{imp:imp,abu:abu,cro:cro,gum:gum,bone:bone,ring:ring}
}

var VS='attribute vec3 a;attribute vec3 n;uniform mat4 P,V,M;varying vec3 vn,vp,vo;void main(){vec4 w=M*vec4(a,1.);vp=w.xyz;vo=a;vn=mat3(M)*n;gl_Position=P*V*w;}';
var FS=[
'#ifdef GL_FRAGMENT_PRECISION_HIGH','precision highp float;','#else','precision mediump float;','#endif',
'varying vec3 vn,vp,vo;uniform vec3 col,eye;uniform float met,rough,sss,alp,glow,fade,mode,aoK,heal,t,swp;',
'float h31(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}',
'float vn3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);',
' return mix(mix(mix(h31(i),h31(i+vec3(1.,0.,0.)),f.x),mix(h31(i+vec3(0.,1.,0.)),h31(i+vec3(1.,1.,0.)),f.x),f.y),',
'  mix(mix(h31(i+vec3(0.,0.,1.)),h31(i+vec3(1.,0.,1.)),f.x),mix(h31(i+vec3(0.,1.,1.)),h31(i+vec3(1.,1.,1.)),f.x),f.y),f.z);}',
'vec3 env(vec3 d,float r){float k=mix(70.,5.,r);',
' vec3 c=mix(vec3(.03,.026,.022),vec3(.38,.34,.29),smoothstep(-.6,.9,d.y));',
' c+=vec3(1.,.93,.82)*pow(max(dot(d,normalize(vec3(.55,.75,.45))),0.),k)*3.4;',
' c+=vec3(.7,.82,1.)*pow(max(dot(d,normalize(vec3(-.75,.35,.5))),0.),k)*2.1;',
' c+=vec3(1.,.85,.6)*pow(max(dot(d,normalize(vec3(.1,.25,-.95))),0.),k*.7)*2.8;',
' c+=vec3(1.)*pow(max(d.y,0.),k*.5)*1.2;',
' c+=vec3(1.,.97,.92)*(1.-smoothstep(0.,.16,abs(d.x-.82)))*smoothstep(-.3,.4,d.y)*(1.-smoothstep(.5,.95,d.y))*(1.-r)*1.6*step(0.,d.z);',
' return c;}',
'vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}',
'void main(){',
' if(fade<.999){float g=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));if(g>fade)discard;}',
' vec3 N=normalize(vn),V=normalize(eye-vp);if(dot(N,V)<0.)N=-N;',
' float NV=max(dot(N,V),0.),fr=pow(1.-NV,5.);',
' if(mode>.5&&mode<1.5){',
'  float tr=vn3(vp*3.4+vec3(0.,0.,3.))*.6+vn3(vp*7.)*.3+vn3(vp*14.)*.1;',
'  float web=smoothstep(.40,.50,tr)*(1.-smoothstep(.50,.64,tr));',
'  float cort=pow(1.-NV,2.2),rad=length(vp.xz);',
'  vec3 b=vec3(.98,.82,.6);',
'  vec3 c=b*(.62+.3*web)+env(reflect(-V,N),.25)*(.03+.5*fr)+b*cort*.8;',
'  float halo=heal*exp(-pow((rad-.64)*2.2,2.))*(.55+.45*sin(vp.y*7.-t*5.))*(1.-smoothstep(-.4,.1,vp.y));',
'  c+=vec3(1.,.72,.3)*halo*1.5;',
'  float a=clamp(.07+.1*web+cort*.45+heal*.10*exp(-rad*.8)+halo*.28,0.,.8)*alp;',
'  c=pow(aces(c*1.1),vec3(.4545));gl_FragColor=vec4(c*a,a);return;}',
' vec3 alb=col;',
' if(mode>2.5){float t0=clamp((vo.y-.42)/1.3,0.,1.);alb=mix(vec3(.93,.82,.62),vec3(.985,.95,.88),smoothstep(0.,.4,t0));alb=mix(alb,vec3(.84,.9,.98),smoothstep(.66,1.,t0)*.85);}',
' if(mode>1.5&&mode<2.5){N=normalize(N+(vec3(h31(vp*70.),h31(vp*70.+7.1),h31(vp*70.+13.7))-.5)*.08);}',
' vec3 F0=mix(vec3(.04),alb,met);vec3 F=F0+(1.-F0)*fr*(1.-rough*.6);',
' vec3 L1=normalize(vec3(.55,.75,.45)),L2=normalize(vec3(-.75,.35,.5)),L3=normalize(vec3(.1,.25,-.95));',
' float w=sss;float d1=max((dot(N,L1)+w)/(1.+w),0.),d2=max((dot(N,L2)+w)/(1.+w),0.),d3=max((dot(N,L3)+w)/(1.+w),0.);',
' vec3 amb=mix(vec3(.09,.075,.06),vec3(.28,.25,.21),N.y*.5+.5);',
' vec3 diff=alb*(1.-met)*(amb+vec3(1.,.95,.88)*d1*1.05+vec3(.55,.68,1.)*d2*.45+vec3(1.,.8,.55)*d3*.55);',
' if(mode>1.5&&mode<2.5)diff+=vec3(.9,.25,.2)*sss*pow(1.-NV,2.)*.2;',
' if(mode>2.5)diff+=vec3(.55,.7,.95)*sss*pow(1.-NV,2.)*.26;',
' vec3 H=normalize(L1+V);float a=rough*rough+.002,a2=a*a,NH=max(dot(N,H),0.),dd=NH*NH*(a2-1.)+1.;float D=a2/(3.14159*dd*dd);',
' vec3 c=diff+env(reflect(-V,N),rough)*F*mix(.9,1.,met)+F*D*max(dot(N,L1),0.)*.8;',
' c*=1.-aoK*smoothstep(.05,2.2,-vp.y)*.55;',
' if(mode>2.5)c+=vec3(1.,.95,.85)*pow(max(0.,1.-abs(vo.y*.9+vo.x*.75-swp)*5.),2.)*.7*step(-5.,swp);',
' c+=col*glow+vec3(1.,.8,.4)*(1.-fade)*.5;',
' c=pow(aces(c*1.08),vec3(.4545));gl_FragColor=vec4(c,1.);}'
].join('\n');
var VS2='attribute vec3 a;uniform mat4 P,V,M;varying vec3 vo;void main(){vo=a;gl_Position=P*V*M*vec4(a,1.);}';
var FS2='precision mediump float;varying vec3 vo;uniform vec3 col;uniform float alp;void main(){float r=length(vo.xz);float k=smoothstep(.9,.955,r)*(1.-smoothstep(.955,1.,r));gl_FragColor=vec4(col*k*alp,k*alp);}';
var VS3='attribute vec4 s;uniform mat4 P,V;uniform float t,dpr;varying float tw;void main(){vec3 p=vec3((s.x-.5)*7.,mod(s.y*7.+t*(.16+s.w*.3),7.)-3.,(s.z-.5)*7.);p.x+=sin(t*.6+s.y*20.)*.25;p.z+=cos(t*.5+s.x*20.)*.25;vec4 w=V*vec4(p,1.);gl_Position=P*w;gl_PointSize=(2.5+s.w*5.)*dpr*(13./-w.z);tw=(.25+.75*pow(.5+.5*sin(t*2.2+s.x*60.),2.))*smoothstep(-3.,-2.,p.y)*(1.-smoothstep(2.8,4.,p.y));}';
var FS3='precision mediump float;varying float tw;void main(){float d=length(gl_PointCoord-.5)*2.;float a=1.-smoothstep(0.,1.,d);a*=a*tw;gl_FragColor=vec4(vec3(1.,.8,.48)*a,a);}';

function mount(section){
 if(inst){inst.stop();inst=null}
 if(!section)return;
 var cv=section.querySelector('#gl3');if(!cv)return;
 var gl=cv.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,powerPreference:'high-performance'})||cv.getContext('experimental-webgl');
 if(!gl){section.style.display='none';return}
 function sh(t,src){var s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))console.warn(gl.getShaderInfoLog(s));return s}
 function prog(v,f){var p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,v));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);return gl.getProgramParameter(p,gl.LINK_STATUS)?p:null}
 var pr=prog(VS,FS),pf=prog(VS2,FS2),pp=prog(VS3,FS3);
 if(!pr||!pf||!pp){section.style.display='none';return}
 function locs(p,names){var o={};names.forEach(function(k){o[k]=gl.getUniformLocation(p,k)});return o}
 var U=locs(pr,['P','V','M','col','eye','met','rough','sss','alp','glow','fade','mode','aoK','heal','t','swp']),U2=locs(pf,['P','V','M','col','alp']),U3=locs(pp,['P','V','t','dpr']);
 var G=build(),B={};
 Object.keys(G).forEach(function(k){var g=G[k],o={};o.p=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,o.p);gl.bufferData(gl.ARRAY_BUFFER,g.pos,gl.STATIC_DRAW);
  o.n=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,o.n);gl.bufferData(gl.ARRAY_BUFFER,g.nor,gl.STATIC_DRAW);
  o.i=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,o.i);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,g.idx,gl.STATIC_DRAW);o.c=g.idx.length;B[k]=o});
 var seeds=new Float32Array(110*4);for(var q=0;q<seeds.length;q++)seeds[q]=Math.random();
 var sb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,sb);gl.bufferData(gl.ARRAY_BUFFER,seeds,gl.STATIC_DRAW);
 var aA=gl.getAttribLocation(pr,'a'),aN=gl.getAttribLocation(pr,'n'),aA2=gl.getAttribLocation(pf,'a'),aS=gl.getAttribLocation(pp,'s');
 gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.clearColor(0,0,0,0);
 function bindMesh(o,loc,nloc){gl.bindBuffer(gl.ARRAY_BUFFER,o.p);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,0,0);
  if(nloc>=0){gl.bindBuffer(gl.ARRAY_BUFFER,o.n);gl.enableVertexAttribArray(nloc);gl.vertexAttribPointer(nloc,3,gl.FLOAT,false,0,0)}gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,o.i)}
 /* m: [col,met,rough,sss,alp,glow,fade,mode,aoK] */
 function draw(o,mod,m){bindMesh(o,aA,aN);gl.uniformMatrix4fv(U.M,false,mod);gl.uniform3fv(U.col,m[0]);gl.uniform1f(U.met,m[1]);gl.uniform1f(U.rough,m[2]);gl.uniform1f(U.sss,m[3]);gl.uniform1f(U.alp,m[4]);gl.uniform1f(U.glow,m[5]);gl.uniform1f(U.fade,m[6]);gl.uniform1f(U.mode,m[7]);gl.uniform1f(U.aoK,m[8]);gl.drawElements(gl.TRIANGLES,o.c,gl.UNSIGNED_SHORT,0)}
 var track=section.querySelector('.j3t'),items=section.querySelectorAll('.j3l li'),bar=section.querySelector('.j3bar i');
 var p=0,tp=0,vis=true,raf=0,stopped=false,cur=-1,t0=performance.now(),mx=0,my=0,tmx=0,tmy=0,dprCap=Math.min(devicePixelRatio||1,2.5),fr=0,acc=0,lastT=0;
 function prog2(){var r=track.getBoundingClientRect(),m=r.height-innerHeight;return m>0?Math.min(1,Math.max(0,-r.top/m)):0}
 function resize(){var r=dprCap,w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;var W=Math.round(w*r),H=Math.round(h*r);if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}}
 function onMove(e){var r=cv.getBoundingClientRect();tmx=((e.clientX-r.left)/r.width-.5)*2;tmy=((e.clientY-r.top)/r.height-.5)*2}
 addEventListener('pointermove',onMove,{passive:true});
 var TI=[.78,.8,.83],GOLD=[.95,.74,.36],PORC=[.97,.94,.88],GUM=[.74,.3,.33],BONE=[.93,.8,.62];
 function frame(ts){
  raf=0;if(stopped)return;
  var dtm=lastT?ts-lastT:16;lastT=ts;
  /* adaptive resolution: drop DPR if the device struggles */
  if(++fr>20){acc+=dtm;if(fr===80){if(acc/60>26&&dprCap>1.25)dprCap=Math.max(1.25,dprCap-.5);fr=21;acc=0}}
  tp=prog2();p+=(tp-p)*.1;if(Math.abs(tp-p)<.0004)p=tp;
  mx+=(tmx-mx)*.05;my+=(tmy-my)*.05;
  resize();gl.viewport(0,0,cv.width,cv.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  var asp=cv.width/Math.max(1,cv.height),idle=(ts-t0)/1000;
  var az=-.5+p*2.5+mx*.14,el=.24+.1*Math.sin(p*6)-my*.06,dist=(asp<.9?19.5:15.2)*(1-.14*sm(.78,.97,p)+.06*sm(.12,.0,p));
  var ty=keys(p,[[0,.9],[.3,.35],[.5,-.25],[.7,.55],[1,1.25]]);
  var eye=[Math.sin(az)*Math.cos(el)*dist,ty+Math.sin(el)*dist,Math.cos(az)*Math.cos(el)*dist],pM=persp(.55,asp,1,80),vM=look(eye,[0,ty,0]);
  var down=sm(.12,.42,p),abu=sm(.58,.78,p),cro=sm(.8,.97,p),heal=sm(.42,.5,p)*(1-sm(.58,.66,p));
  gl.useProgram(pr);gl.uniformMatrix4fv(U.P,false,pM);gl.uniformMatrix4fv(U.V,false,vM);gl.uniform3fv(U.eye,eye);gl.uniform1f(U.heal,heal);gl.uniform1f(U.t,idle);
  gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);
  gl.uniform1f(U.swp,-9);
  /* gingiva */
  draw(B.gum,model(0,0),[GUM,0,.36,.55,1,0,1,2,0]);
  /* implant: hovers, then screws in */
  var iy=2.9*(1-down)+Math.sin(idle*1.4)*.07*(1-down),irot=down*PI*10+idle*.6*(1-down);
  draw(B.imp,model(iy,irot),[TI,1,.27,0,1,heal*.1,1,0,.9]);
  /* abutment */
  if(abu>0||p>.5){draw(B.abu,model(2.3*(1-abu)+Math.sin(idle*1.3+1)*.05*(1-abu),abu*PI*2),[GOLD,1,.22,0,1,0,sm(.5,.6,p),0,.9])}
  /* crown with a light sweep once seated */
  if(p>.7){gl.uniform1f(U.swp,p>.965?lerp(-.8,3.2,sm(.965,1,p)):-9);draw(B.cro,model(2.0*(1-cro)+Math.sin(idle*1.2+2)*.05*(1-cro),0),[PORC,0,.2,.55,1,0,sm(.72,.82,p),3,0]);gl.uniform1f(U.swp,-9)}
  /* bone: translucent, drawn after opaque parts */
  gl.depthMask(false);draw(B.bone,model(0,idle*.04),[BONE,0,.3,0,1,0,1,1,0]);
  /* FX: seat rings + motes (additive) */
  gl.blendFunc(gl.ONE,gl.ONE);gl.disableVertexAttribArray(aN);gl.useProgram(pf);gl.uniformMatrix4fv(U2.P,false,pM);gl.uniformMatrix4fv(U2.V,false,vM);
  function ringFx(c,start,len,col,y,sz){var t=sm(start,start+len,p);var a=(1-t)*sm(start-.02,start+.005,p);if(a<.01)return;bindMesh(B.ring,aA2,-1);gl.uniformMatrix4fv(U2.M,false,model(y,0,.55+t*sz));gl.uniform3fv(U2.col,col);gl.uniform1f(U2.alp,a*.9);gl.drawElements(gl.TRIANGLES,B.ring.c,gl.UNSIGNED_SHORT,0)}
  ringFx(0,.41,.14,[1,.78,.4],.4,2.6);ringFx(0,.77,.12,[1,.8,.45],.42,2.2);ringFx(0,.965,.035,[1,.95,.8],1.2,3.4);
  gl.useProgram(pp);gl.uniformMatrix4fv(U3.P,false,pM);gl.uniformMatrix4fv(U3.V,false,vM);gl.uniform1f(U3.t,idle);gl.uniform1f(U3.dpr,cv.width/Math.max(1,cv.clientWidth));
  gl.bindBuffer(gl.ARRAY_BUFFER,sb);gl.enableVertexAttribArray(aS);gl.vertexAttribPointer(aS,4,gl.FLOAT,false,0,0);gl.drawArrays(gl.POINTS,0,110);
  gl.depthMask(true);
  /* UI */
  var idx=p<.12?0:p<.44?1:p<.58?2:p<.8?3:4;
  if(idx!==cur){cur=idx;items.forEach(function(li,i){li.classList.toggle('on',i===idx);li.classList.toggle('done',i<idx)})}
  if(bar)bar.style.transform='scaleX('+p+')';
  if(vis)raf=requestAnimationFrame(frame);
 }
 function kick(){if(!raf&&!stopped&&vis)raf=requestAnimationFrame(frame)}
 var io='IntersectionObserver' in window?new IntersectionObserver(function(es){vis=es[0].isIntersecting;if(vis){lastT=0;kick()}},{rootMargin:'200px 0px'}):null;
 if(io)io.observe(track);
 addEventListener('resize',kick);
 kick();
 inst={stop:function(){stopped=true;if(raf)cancelAnimationFrame(raf);removeEventListener('resize',kick);removeEventListener('pointermove',onMove);if(io)io.disconnect()}};
}
window.J3={mount:mount};
})();
