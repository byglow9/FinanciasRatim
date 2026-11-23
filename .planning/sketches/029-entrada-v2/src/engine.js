'use strict';
/* ===== parametros ===== */
var P=new URLSearchParams(location.search);
var TEST=P.has('test'),STILL=P.has('still'),VCLOCK=P.has('vclock')||TEST;
var RM=STILL||P.has('reduce')||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
var VAR=(P.get('v')||'all').toLowerCase();
var THEME=P.get('t')||'light';
var ONLY=P.get('only')||'';
var HTML=document.documentElement;
function $(id){return document.getElementById(id)}
function setRM(on){RM=on;HTML.classList.toggle('rm',on)}
function setTheme(t){THEME=t;HTML.classList.toggle('dark',t==='dark')}
function clamp(v,a,b){return v<a?a:v>b?b:v}
function mulberry32(seed){var a=seed|0;return function(){a=(a+0x6d2b79f5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}

/* ===== molas amortecidas (copiadas de shared/core/vintemSpring.js) ===== */
var CRITICAL_MIN_K=420;
var SPR={body:[200,11],pos:[160,15],rot:[140,12],head:[60,13],look:[4000,126],pp:[260,21],ear:[150,6.5],gauge:[60,11],bub:[300,16],pop:[360,17],squash:[240,12],lean:[90,13]};
function Sp(x,p){this.x=x;this.v=0;this.t=x;this.k=p[0];this.c=p[1]}
Sp.prototype.snap=function(v){this.x=v;this.t=v;this.v=0};
Sp.prototype.step=function(dt,crit){
 var k=this.k,c=this.c;if(crit){k=Math.max(k,CRITICAL_MIN_K);c=2*Math.sqrt(k)}
 var n=Math.max(1,Math.ceil(dt*240)),h=dt/n;
 for(var i=0;i<n;i++){var a=(this.t-this.x)*k-this.v*c;this.v+=a*h;this.x+=this.v*h}
};
/* piscar: fecha em 80 ms, abre em ~120 ms (curva do motor real, aberta um pouco mais rapido), overshoot curto */
var BLINK={close:.08,hold:.03,open:.12,over:.06};BLINK.total=BLINK.close+BLINK.hold+BLINK.open+BLINK.over;
function blinkEnv(t){
 if(t<0||t>=BLINK.total)return 0;
 if(t<BLINK.close){var u=t/BLINK.close;return u*u*(3-2*u)}
 if(t<BLINK.close+BLINK.hold)return 1;
 var t2=t-BLINK.close-BLINK.hold;
 if(t2<BLINK.open)return(1+Math.cos(Math.PI*t2/BLINK.open))/2;
 return -.12*Math.sin(Math.PI*(t2-BLINK.open)/BLINK.over);
}

/* ===== poses (vintemStates.js) ===== */
var KEYS=['ew','eh','cvL','cvR','lt','bo','pr','arc','by','bt','ea','es','sy','py','rt'];
var DEF={ew:17,eh:21,cvL:0,cvR:0,lt:0,bo:0,pr:.52,arc:0,by:0,bt:0,ea:16,es:1,sy:1,py:0,rt:0};
var POSE={
 neutro:{},
 feliz:{arc:1,by:-5,sy:1.02,ea:8,es:1.08},
 triste:{ew:16,cvL:.3,cvR:.3,lt:-15,bo:1,pr:.74,by:6,bt:-8,sy:1.04,py:5,rt:5,ea:70,es:.72},
 sonolento:{cvL:.62,cvR:.62,pr:.6,by:4,sy:.96,ea:42,es:.95},
 surpreso:{ew:21,eh:27,pr:.2,by:-13,sy:1.04,py:-3,ea:26,es:1.2,bo:1},
 atento:{ew:18,eh:25,pr:.3,by:-8,sy:1.12,ea:0,es:1.12,bo:1,cvL:.1,cvR:.1}
};
function poseVal(name,k){var p=POSE[name]||{};return p.hasOwnProperty(k)?p[k]:DEF[k]}

/* ===== Vintem: arte (geometry.ts, so a frente) ===== */
var G={
 body:'M28,120C28,74 66,48 120,48C174,48 212,74 212,120C212,156 178,174 120,174C62,174 28,156 28,120Z',
 slit:'M98,56Q120,60 142,56',
 ear:'M-19,8C-24,-14 -12,-40 3,-46C16,-36 26,-12 21,8Z',
 drop:'M0,-13C4,-6 8,-2 8,3A8,8 0 0 1 -8,3C-8,-2 -4,-6 0,-13Z',
 spark:'M0,-14Q1.5,-1.5 14,0Q1.5,1.5 0,14Q-1.5,1.5 -14,0Q-1.5,-1.5 0,-14Z',
 z:'M-6,-6H6L-6,6H6'
};
var UID=0;
function coinG(r){r=r||20;return '<circle r="'+r+'" fill="var(--vintem-coin)" stroke="var(--vintem-coin-line)" stroke-width="'+(r*.12)+'"/><circle r="'+(r*.62)+'" fill="none" stroke="var(--vintem-coin-line)" stroke-width="'+(r*.1)+'"/><rect x="'+(-r*.11)+'" y="'+(-r*.35)+'" width="'+(r*.22)+'" height="'+(r*.7)+'" rx="'+(r*.11)+'" fill="var(--vintem-coin-line)"/>'}
function eyeSVG(u,id,x){
 return '<g data-p="eye'+id+'" transform="translate('+x+' 106)"><clipPath id="'+u+id+'"><ellipse data-p="clip'+id+'" rx="17" ry="21"/></clipPath><g clip-path="url(#'+u+id+')">'+
 '<ellipse data-p="eb'+id+'" rx="17" ry="21" fill="var(--vintem-eye)"/>'+
 '<circle data-p="pu'+id+'" r="8" fill="var(--vintem-ink)"/><circle data-p="hi'+id+'" r="2" fill="var(--vintem-eye)"/>'+
 '</g><clipPath id="'+u+id+'k"><ellipse data-p="clipB'+id+'" rx="18.5" ry="22.5"/></clipPath><g clip-path="url(#'+u+id+'k)"><path data-p="lid'+id+'" d="M-40,-60H40V0H-40Z" fill="var(--vintem-body)"/></g>'+
 '<path data-p="hap'+id+'" d="M-13,6Q0,-13 13,6" fill="none" stroke="var(--vintem-eye)" stroke-width="5.6" stroke-linecap="round" opacity="0"/>'+
 '<path data-p="brow'+id+'" d="M-13,0Q0,0 13,0" fill="none" stroke="var(--vintem-brow)" stroke-width="4.6" stroke-linecap="round" opacity="0" visibility="hidden"/></g>';
}
function vtSVG(){
 var u='v'+(++UID)+'_';
 var s='<svg class="vt" viewBox="0 0 240 200" aria-hidden="true" focusable="false">';
 s+='<clipPath id="'+u+'b"><path d="'+G.body+'"/></clipPath>';
 s+='<ellipse data-p="shadow" cx="120" cy="176" rx="78" ry="7" fill="var(--vintem-ink)" opacity=".14"/>';
 s+='<g data-p="root"><g data-p="earLg" transform="translate(63 80)"><g data-p="earL"><path d="'+G.ear+'" fill="var(--vintem-body)"/></g></g>';
 s+='<g transform="translate(177 80)"><g data-p="earR"><path transform="scale(-1 1)" d="'+G.ear+'" fill="var(--vintem-body)"/></g></g>';
 s+='<g data-p="bellyg"><path d="'+G.body+'" fill="var(--vintem-body)"/><path data-p="slit" d="'+G.slit+'" fill="none" stroke="var(--vintem-ink)" stroke-width="3.2" stroke-linecap="round"/></g>';
 s+='<g clip-path="url(#'+u+'b)"><g data-p="face"><g data-p="snout" transform="translate(120 141)"><ellipse rx="21" ry="12" fill="var(--vintem-snout)"/><ellipse cx="-6.5" rx="2.4" ry="3.4" fill="var(--vintem-ink)"/><ellipse cx="6.5" rx="2.4" ry="3.4" fill="var(--vintem-ink)"/></g>';
 s+=eyeSVG(u,'L',87)+eyeSVG(u,'R',153)+'</g></g></g>';
 /* acessorios */
 s+='<g data-p="a_excl" transform="translate(206 46)"><g data-p="a_excl_s"><rect x="-3.6" y="-14" width="7.2" height="18" rx="3.6" fill="var(--vintem-excl)" stroke="var(--vintem-accent-line)" stroke-width="1.5"/><circle cy="11" r="4" fill="var(--vintem-excl)" stroke="var(--vintem-accent-line)" stroke-width="1.5"/></g></g>';
 s+='<g transform="translate(206 50)"><g data-p="a_spark"><path d="'+G.spark+'" fill="var(--vintem-spark)" stroke="var(--vintem-accent-line)" stroke-width="1.5"/></g></g>';
 s+='<g transform="translate(34 56)"><g data-p="a_spark2"><path d="'+G.spark+'" transform="scale(.75)" fill="var(--vintem-spark)" stroke="var(--vintem-accent-line)" stroke-width="1.5"/></g></g>';
 [[176,62],[192,42],[208,22]].forEach(function(z,i){s+='<g transform="translate('+z[0]+' '+z[1]+')"><g data-p="a_z'+i+'"><path d="'+G.z+'" fill="none" stroke="var(--vintem-z)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g></g>'});
 s+='<g transform="translate(206 76)"><g data-p="a_sweat"><path d="'+G.drop+'" fill="var(--vintem-tear)" stroke="var(--vintem-eye)" stroke-width="1.2"/></g></g>';
 return s+'</svg>';
}

/* ===== Rig: fisica e rosto do Vintem ===== */
var GRAV=2600;
function Rig(host,seed,opt){
 opt=opt||{};
 this.host=host;this.rm=!!opt.rm;this.rng=mulberry32(seed||7);this.t=0;this.log=[];
 var q=host.querySelector.bind(host);this.E={};var self=this;
 [].forEach.call(host.querySelectorAll('[data-p]'),function(e){self.E[e.getAttribute('data-p')]=e});
 this.pp={};KEYS.forEach(function(k){self.pp[k]=new Sp(DEF[k],SPR.pp)});
 this.pose='neutro';this.setPose('neutro',true);
 this.eye={x:new Sp(0,SPR.look),y:new Sp(0,SPR.look)};
 this.head={x:new Sp(0,SPR.head),y:new Sp(0,SPR.head)};
 this.lean=new Sp(0,SPR.lean);
 this.px=new Sp(0,SPR.pos);this.rot=new Sp(0,SPR.rot);
 this.tilt=new Sp(0,SPR.head);        /* inclinacao extra de cabeca (nod, idle) */
 this.sq=new Sp(0,SPR.squash);        /* compressao (+) / extensao (-) */
 this.earL=new Sp(0,SPR.ear);this.earR=new Sp(0,SPR.ear);
 this.acc={excl:new Sp(0,SPR.pop),spark:new Sp(0,SPR.pop),spark2:new Sp(0,SPR.pop),z:new Sp(0,SPR.pop),sweat:new Sp(0,SPR.pop)};
 this.y=0;this.vy=0;this.ax=0;this.vx=0;this.air=false;this.bounces=0;this.wy=0;this.impact=0;this.landed=false;
 this.q=[];this.blinks=[];this.nextBlink=1.4+this.rng()*2;this.nextIdle=1.6+this.rng()*1.5;this.lastIdle='';
 this.home={x:0,y:0};this.breathAmp=1;this.deep=0;this.tr=null;this.prevHx=0;this.prevTilt=0;
 this.vis=1;this.push=0;this.ks=[this.sq,this.tilt,this.rot,this.earL,this.earR,this.lean];
}
/* impulso suavizado: a velocidade entra em ~30 ms (musculo, nao pancada) */
Rig.prototype.kick=function(sp,v){sp._p=(sp._p||0)+v};
Rig.prototype.later=function(sec,fn){this.q.push({t:this.t+sec,fn:fn})};
Rig.prototype.setPose=function(name,snap){
 this.pose=name;var self=this;
 KEYS.forEach(function(k){var v=poseVal(name,k);if(snap)self.pp[k].snap(v);else self.pp[k].t=v});
 var m={neutro:[],feliz:['spark','spark2'],triste:[],sonolento:['z'],surpreso:['excl'],atento:['sweat']}[name]||[];
 var a=this.acc;if(!a)return;
 ['excl','spark','spark2','z','sweat'].forEach(function(k){var on=m.indexOf(k)>=0;a[k].t=on?1:0;if(snap)a[k].snap(on?1:0)});
};
Rig.prototype.accent=function(name,on){this.acc[name].t=on?1:0};
/* olhar guiado: o olho vai primeiro (sacada), a cabeca segue com atraso e o corpo depois */
Rig.prototype.lookAt=function(gx,gy,opt){
 opt=opt||{};var self=this,d=Math.hypot(gx-this.eye.x.t,gy-this.eye.y.t);
 this.eye.x.t=gx;this.eye.y.t=gy;this.log.push({t:this.t,e:'sacada',d:d});
 if(d>.6&&!this.rm&&this.rng()<.55)this.later(.03,function(){self.blinkNow(false)});
 if(opt.eyeOnly)return;
 this.later(.11,function(){self.head.x.t=gx*.9;self.head.y.t=gy*.9;self.log.push({t:self.t,e:'cabeca'})});
 this.later(.26,function(){self.lean.t=gx;self.log.push({t:self.t,e:'corpo'})});
};
/* acompanha um alvo em movimento: o olho vai direto, cabeca e corpo seguem com atraso (filtros) */
Rig.prototype.follow=function(gx,gy,dt){
 this.eye.x.t=gx;this.eye.y.t=gy;
 var a=1-Math.exp(-dt/.14),b=1-Math.exp(-dt/.3);
 this.head.x.t+=(gx*.9-this.head.x.t)*a;this.head.y.t+=(gy*.9-this.head.y.t)*a;this.lean.t+=(gx-this.lean.t)*b;
};
Rig.prototype.blinkNow=function(dbl,spont){
 if(this.rm)return;if(!spont&&this.blinks.length&&this.t-this.blinks[this.blinks.length-1]<.9)return;this.blinks.push(this.t);this.log.push({t:this.t,e:'blink',dbl:!!dbl,spont:!!spont});
 if(dbl){var self=this;self.blinks.length;this.later(.2,function(){self.blinks.push(self.t);self.log.push({t:self.t,e:'blink',dbl:true,second:true,spont:spont})})}
};
/* pulo: antecipacao (agacha), impulso, voo balistico com esticar, aterrissagem com achatar */
Rig.prototype.hop=function(h,toAx,delay){
 var self=this,v0=Math.sqrt(2*GRAV*h),air=2*v0/GRAV;delay=delay||0;
 this.log.push({t:this.t,e:'antecip'});
 this.sq.t=.2;this.tilt.t=-2;
 this.later(.17+delay,function(){
  self.log.push({t:self.t,e:'hop',h:h});
  var to=(toAx===undefined)?self.ax:toAx,dir=Math.sign(to-self.ax);
  self.sq.t=-.12;self.pushT=.07;self.v0=v0;self.air=true;self.bounces=9;self.vy=0;
  self.vx=(to-self.ax)/air;self.landAx=to;self.tilt.t=0;
  if(dir)self.rot.t=dir*7;
  self.kick(self.earL,-60);self.kick(self.earR,60);
 });
};
/* segura o Vintem no alto (fora do quadro) ate a hora de soltar: sem teleporte */
Rig.prototype.hold=function(y,ax){this.y=y;this.ax=ax||0;this.air=false;this.held=true};
Rig.prototype.release=function(){this.held=false;this.air=true;this.vy=0;this.bounces=0;this.log.push({t:this.t,e:'queda'})};
/* queda de cima (pelo y): pesa, quica e assenta */
Rig.prototype.dropIn=function(fromY,dx){
 this.y=fromY;this.vy=0;this.air=true;this.bounces=0;this.vx=0;this.log.push({t:this.t,e:'queda'});
};
Rig.prototype.nod=function(a){this.kick(this.tilt,a||40);this.kick(this.sq,.5)};
Rig.prototype.shake=function(){var self=this;this.log.push({t:this.t,e:'balanco'});[0,.17,.34,.5].forEach(function(d,i){self.later(d,function(){self.kick(self.rot,(i%2?-1:1)*60*(1-i*.22))})})};
Rig.prototype.startle=function(){this.log.push({t:this.t,e:'susto'});this.vy=190;this.air=true;this.bounces=0;this.kick(this.sq,-1.6);this.kick(this.earL,-380);this.kick(this.earR,380)};
Rig.prototype.earFlick=function(){var s=this.rng()<.5?this.earL:this.earR;this.kick(s,(this.rng()<.5?-1:1)*(220+this.rng()*120));this.log.push({t:this.t,e:'orelha'})};
Rig.prototype.step=function(dt){
 var rm=this.rm,t=(this.t+=dt),self=this;
 /* fila de eventos do rig */
 for(var qi=0;qi<this.q.length;qi++){if(this.q[qi].t<=t){var f=this.q.splice(qi,1)[0];qi--;f.fn()}}
 this.ks.forEach(function(sp){if(sp._p){var d=sp._p*(1-Math.exp(-dt/.03));sp.v+=d;sp._p-=d;if(Math.abs(sp._p)<1e-4)sp._p=0}});
 KEYS.forEach(function(k){self.pp[k].step(dt,rm)});
 this.eye.x.step(dt,rm);this.eye.y.step(dt,rm);this.head.x.step(dt,rm);this.head.y.step(dt,rm);
 this.lean.step(dt,rm);this.px.step(dt,rm);this.rot.step(dt,rm);this.tilt.step(dt,rm);this.sq.step(dt,rm);
 for(var k in this.acc)this.acc[k].step(dt,rm);
 /* fisica vertical e horizontal no ar */
 if(this.pushT>0){var pd=Math.min(dt,this.pushT);this.vy+=(this.v0+GRAV*.07)/.07*pd;this.pushT-=pd;if(this.pushT<=1e-9){this.pushT=0;this.sq.t=0}}
 if(this.air){
  if(this.landAx!==undefined){var ve=this.pushT>0?this.v0:this.vy,tl=this.pushT+(ve+Math.sqrt(ve*ve+2*GRAV*Math.max(this.y,0)))/GRAV;this.vx=(this.landAx-this.ax)/Math.max(tl,.02)}
  this.vy-=GRAV*dt;this.y+=this.vy*dt;this.ax+=this.vx*dt;
  if(this.y<=0&&this.vy<0){
   var imp=-this.vy;this.impact=imp;this.y=0;this.landed=true;
   this.log.push({t:t,e:'pouso',imp:imp});
   this.kick(this.sq,clamp(imp*.0031,0,3));
   this.kick(this.earL,imp*.2);this.kick(this.earR,-imp*.2);
   if(this.landAx!==undefined){this.ax=this.landAx;this.landAx=undefined}
   this.vx=0;this.rot.t=0;
   if(imp>260&&this.bounces<2){this.vy=imp*.22;this.bounces++}else{this.vy=0;this.air=false}
  }
 }
 this.sq.x=clamp(this.sq.x,-.2,.24);
 /* orelhas: arrasto pela aceleracao do corpo e pela cabeca (sobreposicao) */
 var hv=(this.head.x.x-this.prevHx)/Math.max(dt,1e-5),tv=(this.tilt.x-this.prevTilt)/Math.max(dt,1e-5);
 this.prevHx=this.head.x.x;this.prevTilt=this.tilt.x;
 var lag=clamp(this.vy*.014+(this.sq.v)*-3,-22,26);
 var drag=clamp(-hv*5-tv*.14,-26,26);
 var ea=this.pp.ea.x;
 this.earL.t=-(ea+lag)+drag;this.earR.t=(ea+lag)+drag;
 this.earL.step(dt,rm);this.earR.step(dt,rm);
 /* piscar e idle */
 if(!rm){
  this.nextBlink-=dt;
  if(this.nextBlink<=0){this.blinkNow(this.rng()<.2,true);this.nextBlink=2+this.rng()*4}
  this.nextIdle-=dt;
  if(this.nextIdle<=0){this.nextIdle=1.4+this.rng()*2.6;this.idle()}
  this.blinks=this.blinks.filter(function(b){return t-b<BLINK.total});
 }
 this.breathPhase=t/3.6*Math.PI*2;
 this.deep=Math.max(0,this.deep-dt*.35);
};
Rig.prototype.idle=function(){
 var opts=['deriva','inclina','orelha','peso','suspiro','olhada'].filter(function(o){return o!==this.lastIdle},this);
 var o=opts[Math.floor(this.rng()*opts.length)];this.lastIdle=o;var self=this,h=this.home;
 this.log.push({t:this.t,e:'idle:'+o});
 if(o==='deriva')this.lookAt(clamp(h.x+(this.rng()-.5)*.5,-1,1),clamp(h.y+(this.rng()-.5)*.35,-1,1),{eyeOnly:true});
 else if(o==='inclina'){var a=(this.rng()-.5)*7;this.tilt.t=a;this.later(1+this.rng(),function(){self.tilt.t=0})}
 else if(o==='orelha')this.earFlick();
 else if(o==='peso'){var d=(this.rng()-.5)*5;this.px.t=d;this.rot.t=d*.3;this.later(1.4,function(){self.px.t=0;self.rot.t=0})}
 else if(o==='suspiro')this.deep=1;
 else{this.lookAt(clamp(h.x+(this.rng()<.5?-.7:.7),-1,1),clamp(h.y*.5,-1,1),{eyeOnly:true});this.later(.7+this.rng()*.5,function(){self.lookAt(h.x,h.y,{eyeOnly:true})})}
};
Rig.prototype.snap=function(){
 var self=this;KEYS.forEach(function(k){self.pp[k].snap(poseVal(self.pose,k))});
 [this.eye.x,this.eye.y,this.head.x,this.head.y,this.lean,this.px,this.rot,this.tilt,this.sq,this.earL,this.earR].forEach(function(s){s.snap(s.t)});
 for(var k in this.acc)this.acc[k].snap(this.acc[k].t);
};
Rig.prototype.render=function(T){
 var E=this.E,pp=this.pp,t=this.t,rm=this.rm,yaw=clamp(this.head.x.x*.3,-.35,.35);
 var bre=rm?0:Math.sin(this.breathPhase)*(.016+this.deep*.012);
 var sqv=clamp(this.sq.x,-.2,.24),stretch=this.air?clamp(Math.abs(this.vy)/9000,0,.1):0;
 var sy=pp.sy.x*(1+bre)*(1-sqv)*(1+stretch);var sx=1/sy;       /* volume conservado: sx*sy = 1 */
 var X=this.px.x+this.ax,Y=-this.y+pp.py.x;
 var rotB=this.rot.x+this.lean.x*2.4+pp.rt.x;
 E.root.setAttribute('transform','translate('+X.toFixed(2)+' '+Y.toFixed(2)+') translate(120 176) rotate('+rotB.toFixed(2)+') scale('+sx.toFixed(4)+' '+sy.toFixed(4)+') translate(-120 -176)');
 var h=Math.max(0,this.y);
 E.shadow.setAttribute('transform','translate('+(this.px.x+this.ax).toFixed(2)+' 0) translate(120 176) scale('+(clamp(sx,.8,1.3)/(1+h/140)).toFixed(3)+' 1) translate(-120 -176)');
 E.shadow.setAttribute('opacity',(.15/(1+h/70)).toFixed(3));
 var hx=this.head.x.x,hy=this.head.y.x,tl=pp.bt.x+this.tilt.x+hx*3.2;
 var fx=yaw*10+hx*3.5,fy=hy*2.6+pp.by.x*.55;
 E.face.setAttribute('transform','translate(120 150) rotate('+tl.toFixed(2)+') translate(-120 -150) translate('+fx.toFixed(2)+' '+fy.toFixed(2)+')');
 E.snout.setAttribute('transform','translate('+(120+yaw*9+hx*1.5).toFixed(2)+' '+(141+hy*1.2).toFixed(2)+')');
 E.earLg.setAttribute('transform','translate('+(63+yaw*4+hx*1.6).toFixed(2)+' '+(80+pp.by.x*.3+hy*1.2).toFixed(2)+')');
 E.earR.parentNode.setAttribute('transform','translate('+(177+yaw*4+hx*1.6).toFixed(2)+' '+(80+pp.by.x*.3+hy*1.2).toFixed(2)+')');
 E.earL.setAttribute('transform','rotate('+this.earL.x.toFixed(2)+') scale('+pp.es.x.toFixed(3)+')');
 E.earR.setAttribute('transform','rotate('+this.earR.x.toFixed(2)+') scale('+pp.es.x.toFixed(3)+')');
 /* olhos */
 var bl=0;if(!rm)for(var i=0;i<this.blinks.length;i++)bl+=blinkEnv(t-this.blinks[i]);
 bl=clamp(bl,-.14,1);
 var drift=rm?0:Math.sin(t*1.7)*.02+Math.sin(t*2.9+1)*.015;
 ['L','R'].forEach(function(s){
  var cv=pp['cv'+s].x,ew=pp.ew.x,eh=pp.eh.x,cover=clamp(Math.max(cv,bl),-.14,1);
  var ex=this.eye.x.x+drift,ey=this.eye.y.x+drift*.6;
  var pr=Math.min(ew,eh)*pp.pr.x*1.05;
  /* pupila presa a uma elipse interna da esclera (margem de 3): nunca encosta na borda */
  var ax=Math.max(0,ew-pr-3),ay=Math.max(0,eh-pr-3),gx=clamp(ex,-1,1),gy=clamp(ey,-1,1),gm=Math.hypot(gx,gy);if(gm>1){gx/=gm;gy/=gm}
  var px=gx*ax,py=gy*ay;
  E['clip'+s].setAttribute('rx',ew.toFixed(2));E['clip'+s].setAttribute('ry',eh.toFixed(2));E['clipB'+s].setAttribute('rx',(ew+1.5).toFixed(2));E['clipB'+s].setAttribute('ry',(eh+1.5).toFixed(2));
  E['eb'+s].setAttribute('rx',ew.toFixed(2));E['eb'+s].setAttribute('ry',eh.toFixed(2));
  E['pu'+s].setAttribute('r',pr.toFixed(2));E['pu'+s].setAttribute('cx',px.toFixed(2));E['pu'+s].setAttribute('cy',py.toFixed(2));
  E['hi'+s].setAttribute('cx',(px-pr*.35).toFixed(2));E['hi'+s].setAttribute('cy',(py-pr*.4).toFixed(2));
  var ly=-eh-4+cover*(eh*2.24+4),tilt=(s==='L'?1:-1)*pp.lt.x;
  E['lid'+s].setAttribute('d','M-44,-70H44V'+ly.toFixed(2)+'Q0,'+(ly+3).toFixed(2)+' -44,'+ly.toFixed(2)+'Z');
  E['lid'+s].setAttribute('transform','rotate('+tilt.toFixed(2)+')');
  var arc=pp.arc.x;E['eb'+s].style.opacity=1-arc;E['pu'+s].style.opacity=1-arc;E['hi'+s].style.opacity=1-arc;E['lid'+s].style.opacity=1-arc;
  E['hap'+s].setAttribute('opacity',clamp(arc,0,1).toFixed(2));
  /* sem sobrancelha: a expressao vem da pose da palpebra, nunca de um risco claro */
  E['brow'+s].setAttribute('transform','translate(0 '+(-eh-9+ (cover>.3?cover*6:0)).toFixed(2)+') rotate('+tilt.toFixed(2)+')');
 },this);
 /* acessorios: entram por mola com overshoot, nada de pop */
 var a=this.acc;
 function sc(g,v,extra){g.setAttribute('transform','scale('+clamp(v,0,1.35).toFixed(3)+')'+(extra||''));g.style.opacity=clamp(v*1.6,0,1)}
 sc(E.a_excl_s,a.excl.x);sc(E.a_spark,a.spark.x,' rotate('+(rm?0:Math.sin(t*2.2)*10).toFixed(1)+')');sc(E.a_spark2,a.spark2.x,' rotate('+(rm?0:Math.sin(t*1.9+1)*12).toFixed(1)+')');
 sc(E.a_sweat,a.sweat.x,' translate(0 '+(rm?0:(Math.max(0,Math.sin(t*1.3)))*7).toFixed(1)+')');
 for(var z=0;z<3;z++){var ph=rm?.5:(((t*.42)+z*.33)%1),v=a.z.x*Math.sin(Math.PI*ph);E['a_z'+z].setAttribute('transform','translate('+(ph*10).toFixed(1)+' '+(-ph*22).toFixed(1)+') scale('+(.6+.5*ph).toFixed(2)+')');E['a_z'+z].style.opacity=clamp(v,0,1)}
 /* rastro de pose para o autoteste */
 if(this.tr)this.tr.push({t:t,sx:sx,sy:sy,X:X,Y:Y,rot:rotB,hx:hx,hy:hy,tl:tl,ex:this.eye.x.x,eL:this.earL.x,eR:this.earR.x,yaw:yaw,bl:bl,lid:Math.max(pp.cvL.x,bl),land:this.landed});
 this.landed=false;
};
