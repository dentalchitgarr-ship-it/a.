/* Diyar Dent — scroll-driven 3D dental implant (plain WebGL, no libraries).
   Steps: hover → screw into bone → healing → abutment → crown. */
(function(){
var inst=null;
function m4(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}
function mul(a,b){var o=new Float32Array(16);for(var c=0;c<4;c++)for(var r=0;r<4;r++){var s=0;for(var k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o}
function persp(f,a,n,z){var t=1/Math.tan(f/2),o=new Float32Array(16);o[0]=t/a;o[5]=t;o[10]=(z+n)/(n-z);o[11]=-1;o[14]=2*z*n/(n-z);return o}
function look(e,c){var z=norm(sub(e,c)),x=norm(cross([0,1,0],z)),y=cross(z,x);
 return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,e),-dot(y,e),-dot(z,e),1])}
function sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]]}function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function norm(a){var l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]}
function model(y,ry){var c=Math.cos(ry),s=Math.sin(ry),o=m4();o[0]=c;o[2]=-s;o[8]=s;o[10]=c;o[13]=y;return o}
function sm(a,b,x){x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x)}

/* lathe mesh: rings from bottom to top, r(i,theta) gives the radius */
function lathe(ys,rf,seg,sx,sz){
 var R=ys.length,pos=[],idx=[],i,j;
 for(i=0;i<R;i++)for(j=0;j<=seg;j++){var th=j/seg*Math.PI*2,r=rf(i,th);pos.push(r*Math.cos(th)*(sx||1),ys[i],r*Math.sin(th)*(sz||1))}
 for(i=0;i<R-1;i++)for(j=0;j<seg;j++){var a=i*(seg+1)+j,b=a+seg+1;idx.push(a,b,a+1,a+1,b,b+1)}
 var nor=new Float32Array(pos.length);
 for(i=0;i<idx.length;i+=3){var A=idx[i]*3,B=idx[i+1]*3,C=idx[i+2]*3,
  u=[pos[B]-pos[A],pos[B+1]-pos[A+1],pos[B+2]-pos[A+2]],v=[pos[C]-pos[A],pos[C+1]-pos[A+1],pos[C+2]-pos[A+2]],n=cross(u,v);
  [A,B,C].forEach(function(k){nor[k]+=n[0];nor[k+1]+=n[1];nor[k+2]+=n[2]})}
 for(i=0;i<nor.length;i+=3){var l=Math.hypot(nor[i],nor[i+1],nor[i+2])||1;nor[i]/=l;nor[i+1]/=l;nor[i+2]/=l}
 return{pos:new Float32Array(pos),nor:nor,idx:new Uint16Array(idx)}
}
function ramp(n,a,b){var o=[];for(var i=0;i<n;i++)o.push(a+(b-a)*i/(n-1));return o}
function build(){
 /* implant: tapered screw with helical thread */
 var iy=ramp(150,-2.3,0),pitch=.24;
 var imp=lathe(iy,function(i,th){var y=iy[i];if(i===0)return 0;if(i===iy.length-1)return .1;
  var base=.44;if(y<-1.95)base*=Math.sqrt(Math.max(.05,(y+2.3)/.35))*.8+.2;
  var th2=(y/pitch+th/(Math.PI*2)),tri=Math.abs((th2-Math.floor(th2))*2-1);
  var t=(y>-2.15&&y<-.3)?.1*tri:0;if(y>=-.3)base=.5+(y+.3)*.2;return base+t},44);
 /* abutment */
 var ay=ramp(40,0,1.05);
 var abu=lathe(ay,function(i,th){var y=ay[i];if(i===0||i===ay.length-1)return i===0?0:.05;
  return y<.16?.34+y*.5:(.42-(y-.16)*.12)},36);
 /* crown (incisor-like, elliptical) */
 var cy=ramp(60,.9,2.55);
 var cro=lathe(cy,function(i,th){var t=(cy[i]-.9)/1.65;if(i===0)return .22;if(i===cy.length-1)return .1;
  var r=.5+.2*Math.sin(Math.min(1,t*1.5)*Math.PI*.5)-.2*Math.pow(t,3.2);return r},40,1.3,.8);
 /* bone block (translucent) */
 var by=ramp(24,-2.7,.02);
 var bone=lathe(by,function(i,th){var y=by[i];var r=1.95+.05*Math.sin(th*3+y*2);if(i===0)return 0;if(i===by.length-1)return 1.6;if(y>-.2)r-=(y+.2)*4;return r},48);
 return{imp:imp,abu:abu,cro:cro,bone:bone}
}

function mount(section){
 if(inst){inst.stop();inst=null}
 if(!section)return;
 var cv=section.querySelector('#gl3');if(!cv)return;
 var gl=cv.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true})||cv.getContext('experimental-webgl');
 if(!gl){section.style.display='none';return}
 var VS='attribute vec3 a;attribute vec3 n;uniform mat4 P,V,M;varying vec3 vn,vp;void main(){vec4 w=M*vec4(a,1.);vp=w.xyz;vn=mat3(M)*n;gl_Position=P*V*w;}';
 var FS='precision mediump float;varying vec3 vn,vp;uniform vec3 col,eye;uniform float met,alp,glow;'+
  'void main(){vec3 n=normalize(vn);vec3 v=normalize(eye-vp);if(dot(n,v)<0.)n=-n;'+
  'vec3 l1=normalize(vec3(.5,.9,.7)),l2=normalize(vec3(-.8,.2,.4));'+
  'float d=max(dot(n,l1),0.)*.8+max(dot(n,l2),0.)*.35+.2;'+
  'vec3 h=normalize(l1+v);float s=pow(max(dot(n,h),0.),mix(28.,110.,met));'+
  'float f=pow(1.-max(dot(n,v),0.),3.);'+
  'vec3 r=reflect(-v,n);float e=smoothstep(-.7,.9,r.y);vec3 env=mix(vec3(.16,.12,.08),vec3(1.,.92,.74),e);'+
  'vec3 c=col*d*(1.-.55*met)+env*met*.8+vec3(1.,.95,.85)*s*(.3+met*.9)+vec3(.9,.72,.4)*f*.35+col*glow;'+
  'float a2=alp+f*.55*(1.-alp);gl_FragColor=vec4(c*a2,a2);}';
 function sh(t,src){var s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);return s}
 var pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);
 if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){section.style.display='none';return}
 gl.useProgram(pr);
 var U={};['P','V','M','col','eye','met','alp','glow'].forEach(function(k){U[k]=gl.getUniformLocation(pr,k)});
 var aA=gl.getAttribLocation(pr,'a'),aN=gl.getAttribLocation(pr,'n');
 var G=build(),M={};
 Object.keys(G).forEach(function(k){var g=G[k],o={};o.p=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,o.p);gl.bufferData(gl.ARRAY_BUFFER,g.pos,gl.STATIC_DRAW);
  o.n=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,o.n);gl.bufferData(gl.ARRAY_BUFFER,g.nor,gl.STATIC_DRAW);
  o.i=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,o.i);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,g.idx,gl.STATIC_DRAW);o.c=g.idx.length;M[k]=o});
 gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
 function draw(o,mod,col,met,alp,glow){
  gl.bindBuffer(gl.ARRAY_BUFFER,o.p);gl.enableVertexAttribArray(aA);gl.vertexAttribPointer(aA,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,o.n);gl.enableVertexAttribArray(aN);gl.vertexAttribPointer(aN,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,o.i);
  gl.uniformMatrix4fv(U.M,false,mod);gl.uniform3fv(U.col,col);gl.uniform1f(U.met,met);gl.uniform1f(U.alp,alp);gl.uniform1f(U.glow,glow);
  gl.drawElements(gl.TRIANGLES,o.c,gl.UNSIGNED_SHORT,0)}

 var track=section.querySelector('.j3t'),items=section.querySelectorAll('.j3l li'),bar=section.querySelector('.j3bar i');
 var p=0,tp=0,vis=true,raf=0,stopped=false,cur=-1,t0=performance.now();
 function prog(){var r=track.getBoundingClientRect(),m=r.height-innerHeight;return m>0?Math.min(1,Math.max(0,-r.top/m)):0}
 function resize(){var r=Math.min(devicePixelRatio||1,2),w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;if(cv.width!==Math.round(w*r)||cv.height!==Math.round(h*r)){cv.width=Math.round(w*r);cv.height=Math.round(h*r)}}
 function frame(ts){
  raf=0;if(stopped)return;
  tp=prog();p+=(tp-p)*.12;if(Math.abs(tp-p)<.0004)p=tp;
  resize();gl.viewport(0,0,cv.width,cv.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  var asp=cv.width/Math.max(1,cv.height),idle=(ts-t0)/1000;
  var az=-.55+p*2.3+Math.sin(idle*.4)*.05,el=.2+.12*Math.sin(p*5),dist=asp<.9?19:15,ty=.45;
  var eye=[Math.sin(az)*Math.cos(el)*dist,ty+Math.sin(el)*dist,Math.cos(az)*Math.cos(el)*dist];
  gl.uniformMatrix4fv(U.P,false,persp(.55,asp,1,60));gl.uniformMatrix4fv(U.V,false,look(eye,[0,ty,0]));gl.uniform3fv(U.eye,eye);
  var down=sm(.12,.42,p),abu=sm(.58,.78,p),cro=sm(.8,.97,p),heal=sm(.42,.48,p)*(1-sm(.56,.62,p));
  /* implant screws in */
  draw(M.imp,model(3.1*(1-down),down*Math.PI*8+idle*.35*(1-down)),[.78,.74,.68],1,1,0);
  /* abutment */
  draw(M.abu,model(3.0*(1-abu),abu*Math.PI*2),[.93,.78,.48],.9,1,0);
  /* crown */
  draw(M.cro,model(3.4*(1-cro),0),[.97,.94,.88],.12,1,cro>.98?.05+.05*Math.sin(idle*3):0);
  /* bone (translucent, drawn last) */
  gl.depthMask(false);draw(M.bone,model(0,idle*.05),[.92,.8,.62+.1*heal],0,.16+.12*heal,.16*heal+.35*heal*(.5+.5*Math.sin(idle*4)));gl.depthMask(true);
  /* UI */
  var idx=p<.12?0:p<.44?1:p<.58?2:p<.8?3:4;
  if(idx!==cur){cur=idx;items.forEach(function(li,i){li.classList.toggle('on',i===idx);li.classList.toggle('done',i<idx)})}
  if(bar)bar.style.transform='scaleX('+p+')';
  if(vis||Math.abs(tp-p)>0)raf=requestAnimationFrame(frame);
 }
 function kick(){if(!raf&&!stopped&&vis)raf=requestAnimationFrame(frame)}
 var io='IntersectionObserver' in window?new IntersectionObserver(function(es){vis=es[0].isIntersecting;if(vis)kick()},{rootMargin:'200px 0px'}):null;
 if(io)io.observe(track);
 addEventListener('scroll',kick,{passive:true});addEventListener('resize',kick);
 kick();
 inst={stop:function(){stopped=true;if(raf)cancelAnimationFrame(raf);removeEventListener('scroll',kick);removeEventListener('resize',kick);if(io)io.disconnect()}};
}
window.J3={mount:mount};
})();
