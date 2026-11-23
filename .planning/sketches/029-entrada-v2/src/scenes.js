/* ===== icones (tracos de 2 px, 24x24) ===== */
var IC={
 mail:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 8 8 6 8-6"/>',
 lock:'<rect x="5" y="11" width="14" height="10" rx="3"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
 eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 alert:'<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>',
 wifioff:'<path d="M2 8.8a15 15 0 0 1 4-2.4M22 8.8a15 15 0 0 0-8.5-3.7M5 12.9a10 10 0 0 1 3.4-2M19 12.9a10 10 0 0 0-3-1.8M8.5 16.4a5 5 0 0 1 7 0M12 20h.01M2 2l20 20"/>',
 back:'<path d="m15 18-6-6 6-6"/>',
 dots:'<circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>',
 share:'<path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1"/>'
};
function ic(n,s,sw){return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+(sw||2)+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+IC[n]+'</svg>'}
function wordmark(){
 /* COINC em maiusculas, glifos como paths: Sora 800 (padrao) ou Bricolage 700 (?wm=bricolage); mesma altura de capitular */
 var bri=P.get('wm')==='bricolage',F=bri?WG:WGS,CAPH=44;
 var gap=bri?{CO:56,OI:84,IN:92,NC:92}:{CO:78,OI:112,IN:128,NC:104};
 var order=['C','O','I','N','C'],x=0,h='',prev=null,CAP=F.I.cap,SC=bri?1:660/CAP;
 order.forEach(function(ch){
  var gl=F[ch];if(prev)x+=gap[prev+ch]/SC;
  h+='<path transform="translate('+(x-gl.x0).toFixed(1)+' '+CAP.toFixed(1)+') scale(1 -1)" d="'+gl.d+'" fill="var(--okink)"/>';
  x+=gl.x1-gl.x0;prev=ch;
 });
 var W=x,vw=W+40/SC,vh=CAP+60/SC,px=CAPH/(CAP)*SC*0+CAPH/660*SC;
 return '<div class="wm" role="img" aria-label="Coinc"><svg style="width:'+(vw*px).toFixed(1)+'px" viewBox="'+(-20/SC)+' '+(-30/SC)+' '+vw.toFixed(1)+' '+vh.toFixed(1)+'" aria-hidden="true" focusable="false">'+h+'</svg></div>';
}

/* ===== texto ===== */
var COPY={
 o1:{title:'Seu mês, num número',say:'Oi, eu sou o Vintém! Eu cuido das suas contas e digo quanto ainda dá para gastar no mês.'},
 o2:{title:'Um teto por categoria',say:'Dê um teto para cada categoria. Se você chegar perto, eu aviso antes de estourar.'},
 o3:{title:'Tudo no calendário',say:'As contas fixas e os eventos ficam no calendário. Eu aviso antes de vencer.'}
};
var INST={a:['Abra o menu do Chrome','Adicionar à tela inicial','Confirme em Adicionar'],i:['Compartilhar, no Safari','Adicionar à Tela de Início','Toque em Adicionar']};
var KINDS=[['o1','1 Seu mês'],['o2','2 Limites'],['o3','3 Calendário'],['ia','4 Instalar (Android)'],['ii','4 Instalar (iPhone)'],['l','5 Entrar'],['le','5 Entrar, erro'],['lo','5 Entrar, sem conexão']];
var GROUPS={o:['o1','o2','o3'],i:['ia','ii'],l:['l','le','lo']};
/* coordenadas nos prints (css px de 390x844) */
var PC={home:{ring:[40,236,310,112]},limites:{row:[14,236,362]},cal:{days:{8:[36,316],14:[354,316],19:[247,368],23:[88,420]},cell:[58,50]}};
var PRINT_FOR={o1:'home',o2:'limites',o3:'calendario',ia:'home',ii:'home'};

/* ===== utilitarios de cena ===== */
function printSrc(key){var p=PRINTS[key];return p?(p[THEME]||p.light):''}
function phoneHTML(key,pw,cls){return '<div class="phone '+(cls||'')+'" style="width:'+pw+'px"><div class="glass" data-print><img alt="" decoding="sync" data-print-img="'+key+'" src="'+printSrc(key)+'"></div></div>'}
function bubbleHTML(t){return '<div class="bubble say" data-text="'+t+'"><span class="on" aria-hidden="true"></span><span class="off" aria-hidden="true">'+t+'</span></div>'}
function dots(n){var s='<div class="dots" aria-hidden="true">';for(var i=0;i<4;i++)s+='<span'+(i===n?' class="on"':'')+'></span>';return s+'</div>'}
function fieldHTML(type,icon,ph,val,bad,id,extra){
 return '<div class="field'+(bad?' bad':'')+'" data-f="'+id+'">'+ic(icon,20)+'<input id="'+id+'" type="'+type+'" placeholder="'+ph+'" value="'+(val||'')+'" aria-label="'+ph+'"'+(bad?' aria-invalid="true"':'')+'>'+(extra||'')+'</div>';
}
function vwrap(vw){return '<div class="vt-wrap" style="--vw:'+vw+'px">'+vtSVG()+'</div>'}
function money(n){return 'R$ '+Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.')}

/* ===== construcao das telas ===== */
function buildInner(kind,w,h){
 var s='';
 if(kind.charAt(0)==='o'){
  var c=COPY[kind],n=+kind.charAt(1)-1;
  s+='<div class="top"><span></span><button class="lnk" type="button">Pular</button></div><h2 class="title">'+c.title+'</h2>';
  s+='<div class="stage" data-stage>'+'<div class="halo" data-halo></div>'+bubbleHTML(c.say)+phoneHTML(PRINT_FOR[kind],0)+vwrap(100)+'<div class="fx" data-fx></div></div>';
  s+='<div class="bot">'+dots(n)+'<button class="cta" type="button">Continuar</button></div>';
 }else if(kind==='ia'||kind==='ii'){
  var pl=kind==='ia'?'a':'i';
  s+='<div class="top"><button class="lnk" type="button">'+ic('back',20)+'Voltar</button><button class="lnk" type="button">Agora não</button></div>';
  s+='<h2 class="title">Instale o Coinc</h2><p class="sub">Abre em tela cheia, como um app.</p>';
  s+='<div style="margin-top:12px"><div class="seg" role="group" aria-label="Aparelho"><button type="button" data-plat="a" aria-pressed="'+(pl==='a')+'">Android</button><button type="button" data-plat="i" aria-pressed="'+(pl==='i')+'">iPhone</button></div></div>';
  s+='<div class="stage inst" data-stage style="margin-top:6px"><div class="halo" data-halo></div>'+phoneHTML('home',0,'ill')+vwrap(100)+'<div class="fx" data-fx></div>';
  s+='<div class="steps" role="group" aria-label="Passos">';
  INST[pl].forEach(function(t,i){s+='<button class="step" type="button" data-i="'+i+'" aria-pressed="'+(i===0)+'"><i>'+(i+1)+'</i><span>'+t+'</span></button>'});
  s+='</div></div>';
  s+='<div class="bot" style="margin-top:4px">'+dots(3)+'<button class="cta" type="button">Já adicionei</button></div>';
 }else{
  var err=kind==='le',off=kind==='lo';
  s+='<div class="lg"><span class="tgap"></span><div class="lgv" data-stage style="height:'+Math.round(w*.64)+'px"><div class="halo" data-halo></div>'+vwrap(100)+'</div>'+wordmark()+
   '<div class="form">'+
   fieldHTML('email','mail','E-mail',(err||off)?'ana@email.com':'',err,'em'+(++UID))+
   fieldHTML('password','lock','Senha',(err||off)?'senha1234':'',err,'pw'+UID,'<button class="eyeb" type="button" aria-label="Mostrar senha">'+ic('eye',20)+'</button>')+
   (err?'<div class="note-box err" role="alert">'+ic('alert',20)+'<span>E-mail ou senha incorretos. Confira e tente de novo.</span></div>':'')+
   (off?'<div class="note-box off" role="alert">'+ic('wifioff',20)+'<span>Sem conexão. Ligue a internet para entrar.</span></div>':'')+
   '<button class="cta" type="button">Entrar</button></div>'+
   '<span class="fgap"></span><button class="quiet" type="button">Esqueci minha senha</button><p class="help">Acesso só para quem foi convidado.</p></div>';
 }
 return s;
}

var SCREENS=[],GT=0;
function Screen(kind,w,h,plat){
 var el=document.createElement('div');el.className='ph';
 el.innerHTML='<div class="bez"><div class="scr" data-kind="'+kind+'" style="--w:'+w+'px;--h:'+h+'px"><div class="bg" aria-hidden="true"></div><div class="sb" aria-hidden="true"><span>9:41</span><i></i></div><div class="in">'+buildInner(kind,w,h)+'</div></div></div>';
 this.el=el;this.sc=el.querySelector('.scr');this.kind=kind;this.w=w;this.h=h;this.plat=plat||(kind==='ii'?'i':'a');
 this.t=0;this.ev=[];this.sp={};this.parts=[];this.rm=RM;this.step=0;this.sc._S=this;this.fxp=[];this.say=null;this.rig=null;
}
Screen.prototype.at=function(sec,fn){this.ev.push({t:sec,fn:fn});this.ev.sort(function(a,b){return a.t-b.t})};
Screen.prototype.mount=function(){
 var self=this,host=this.sc.querySelector('.vt-wrap');
 this.vwrap=host;this.stage=this.sc.querySelector('[data-stage]');this.halo=this.sc.querySelector('[data-halo]');this.fx=this.sc.querySelector('[data-fx]');
 this.spring('halo',0,[40,9],function(v,S){S.halo.style.opacity=clamp(v,0,1)});this.sp.halo.t=0;this.halo.style.opacity=0;
 this.rig=new Rig(host,11+this.kind.charCodeAt(0)*13+this.kind.length*7+this.w,{rm:this.rm});
 if(this.rm)this.rig.rm=true;
};
/* mola de cena: valor numerico animado por uma mola; aplica via funcao */
Screen.prototype.spring=function(name,x,p,apply){var s=new Sp(x,p);this.sp[name]=s;this.parts.push({s:s,apply:apply});return s};
function sayTimes(text){
 var t=[],c=0;
 for(var i=0;i<text.length;i++){t.push(c);var ch=text[i];c+=.034;if(ch===','||ch==='—')c+=.16;if(ch==='.'||ch==='!'||ch==='?')c+=.3}
 return {t:t,end:c};
}
Screen.prototype.startSay=function(at){
 var bub=this.sc.querySelector('.bubble');if(!bub)return 0;
 var text=bub.dataset.text,st=sayTimes(text);this.say={t0:at,st:st,n:0,text:text,on:bub.querySelector('.on'),off:bub.querySelector('.off')};
 return at+st.end;
};
Screen.prototype.tick=function(dt){
 this.t+=dt;var self=this;
 while(this.ev.length&&this.ev[0].t<=this.t){var e=this.ev.shift();e.fn.call(this)}
 for(var i=0;i<this.parts.length;i++){var p=this.parts[i];p.s.step(dt,this.rm);p.apply(p.s.x,this)}
 if(this.say){
  var el=this.t-this.say.t0,n=this.say.n,tt=this.say.st.t;
  while(n<tt.length&&tt[n]<=el)n++;
  if(n!==this.say.n){
   var ch=this.say.text[n-1];this.say.n=n;
   this.say.on.textContent=this.say.text.slice(0,n);this.say.off.textContent=this.say.text.slice(n);
   if(this.rig&&(ch===','||ch==='.'||ch==='!'||(n%16===0)))this.rig.nod(ch==='.'||ch==='!'?55:32);
  }
 }
 if(this.follow&&this.rig)this.follow(dt);
 this.fxStep(dt);
 if(this.rig){this.rig.step(dt);this.rig.render()}
};
/* particulas: moedinhas com gravidade e giro; brilhos pontuais */
Screen.prototype.coin=function(x,y,vx,vy,r){
 var g=document.createElementNS('http://www.w3.org/2000/svg','svg');g.setAttribute('width',2*r+4);g.setAttribute('height',2*r+4);g.setAttribute('viewBox','-'+(r+2)+' -'+(r+2)+' '+(2*r+4)+' '+(2*r+4));
 g.innerHTML='<g class="cg">'+coinG(r)+'</g>';this.fx.appendChild(g);
 this.fxp.push({el:g,cg:g.firstChild,x:x,y:y,vx:vx,vy:vy,r:r,a:Math.random()*0,age:0,sp:(6+(this.fxp.length%3)*2)});
};
Screen.prototype.fxStep=function(dt){
 for(var i=this.fxp.length-1;i>=0;i--){
  var p=this.fxp[i];p.age+=dt;p.vy+=1500*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
  var life=1.5,al=p.age>life-.35?clamp((life-p.age)/.35,0,1):1;
  p.el.style.transform='translate('+(p.x-p.r-2).toFixed(1)+'px,'+(p.y-p.r-2).toFixed(1)+'px)';p.el.style.opacity=al;
  p.cg.setAttribute('transform','scale('+Math.abs(Math.cos(p.age*p.sp)).toFixed(3)+' 1)');
  if(p.age>life){p.el.remove();this.fxp.splice(i,1)}
 }
};

/* ===== layout das telas de onboarding ===== */
function layoutO(S){
 var st=S.stage,sw=S.w,sh=st.clientHeight,bub=S.sc.querySelector('.bubble'),ph=S.sc.querySelector('.phone');
 var bh=bub.offsetHeight,bw=bub.offsetWidth,vwMax=S.w>=390?168:152;
 var pw=Math.min(S.w>=390?300:272,S.w-70);
 var minVis=Math.round(sh*.5);
 var vw=Math.min(vwMax,(sh-6-bh-14-minVis-4)/.88*240/200);vw=Math.max(vw,120);
 var Hv=vw*200/240,ptop=6+bh+14+.88*Hv-1;
 var cx={o1:sw/2,o2:sw/2+pw*.2,o3:sw/2-pw*.2}[S.kind];
 S.vw=vw;S.ppu=vw/240;S.cx=cx;S.ptop=ptop;S.pw=pw;S.stH=sh;
 S.vwrap.style.setProperty('--vw',vw+'px');S.vwrap.style.left=(cx-vw/2)+'px';S.vwrap.style.top=(ptop-.88*Hv+1)+'px';
 ph.style.width=pw+'px';ph.style.left=((sw-pw)/2)+'px';ph.style.top=ptop+'px';
 var gl=ph.querySelector('.glass');S.gl=gl;S.ps=(pw-12)/390;
 var bl=(sw-bw)/2;bub.style.left='50%';bub.style.setProperty('--tx',clamp(cx-bl,28,bw-28)+'px');
 S.halo.style.cssText='left:'+(cx-vw*.8)+'px;top:'+(ptop-Hv*1.05-vw*.35)+'px;width:'+(vw*1.6)+'px;height:'+(vw*1.5)+'px';
 S.bub=bub;S.phone=ph;
 /* centro do olho do Vintem em px do stage, para a direcao do olhar */
 S.eyeC=function(){return {x:cx,y:ptop-.88*Hv+1+Hv*(106/200)}};
 S.gazeTo=function(px,py,scale){var e=S.eyeC();return [clamp((px-e.x)/(scale||110),-1,1),clamp((py-e.y)/(scale||110),-1,1)]};
 S.printPt=function(x,y){var r=S.gl.getBoundingClientRect(),sr=S.stage.getBoundingClientRect(),k=sr.width/S.stage.offsetWidth||1;return {x:(r.left-sr.left)/k+x*S.ps,y:(r.top-sr.top)/k+y*S.ps}};
 /* molas: celular sobe, balao entra */
 S.spring('ph',320,[70,10],function(v){ph.style.transform='translateY('+v.toFixed(2)+'px)'});
 S.spring('bub',0,SPR.bub,function(v){bub.style.opacity=clamp(v*1.8,0,1);bub.style.transform='translateX(-50%) scale('+(.86+.14*v).toFixed(4)+')'});
 S.sp.ph.t=0;
}
function addRing(S,rect,name,r){
 var d=document.createElement('div');d.className='ring';d.style.cssText='left:'+rect[0]*S.ps+'px;top:'+rect[1]*S.ps+'px;width:'+rect[2]*S.ps+'px;height:'+rect[3]*S.ps+'px;border-radius:'+(r||14)*S.ps*1.6+'px';
 S.gl.appendChild(d);
 S.spring(name,0,SPR.pop,function(v,S2){d.style.opacity=clamp(v*1.5,0,1);var pulse=S2.rm?0:Math.sin(S2.t*4.2)*.02*clamp(v,0,1);d.style.transform='scale('+(.9+.1*clamp(v,0,1.2)+pulse).toFixed(4)+')'});
 return d;
}
function ringCenter(S,rect){var p=S.printPt(rect[0]+rect[2]/2,rect[1]+rect[3]/2);return p}

/* ===== roteiros ===== */
function scriptO1(S){
 var r=S.rig;r.setPose('neutro',true);
 S.vwrap.style.opacity=0;
 var rg=PC.home.ring;addRing(S,rg,'ring1');
 var tgt=ringCenter(S,rg),gz=S.gazeTo(tgt.x,tgt.y,120);
 S.at(.05,function(){S.sp.ph.t=0});
 r.hold(S.ptop/S.ppu+30);S.vwrap.style.opacity=1;
 S.at(.45,function(){r.release()});S.at(1.3,function(){S.sp.halo.t=1});
 S.at(1.55,function(){S.sp.bub.t=1;r.lookAt(0,-.75)});
 var end=1.9+sayTimes(COPY.o1.say).end;
 S.at(1.9,function(){S.startSay(1.9)});
 S.at(end-1.2,function(){r.lookAt(gz[0],gz[1])});
 S.at(end-.4,function(){S.sp.ring1.t=1;r.hop(13)});
 S.at(end+.9,function(){r.setPose('feliz')});
 S.at(end+2.6,function(){r.lookAt(0,.05);r.setPose('neutro')});
 S.endT=end+3.2;
 S.snapFinal=function(){S.sp.halo.t=1;r.setPose('neutro');r.lookAt(gz[0],gz[1]);S.sp.ring1.t=1;S.sp.bub.t=1};
 r.home={x:0,y:.05};
}
function scriptO2(S){
 var r=S.rig;r.setPose('neutro',true);
 var row=PC.limites.row;
 /* lente: a linha de Alimentacao "ao vivo" */
 var lens=document.createElement('div');lens.className='lens';
 lens.style.cssText='left:'+(8)+'px;right:'+(8)+'px;top:'+Math.round(row[1]*S.ps)+'px';
 lens.innerHTML='<div class="lh">Alimentação<span class="pc">49%</span></div><div class="tr"><i style="width:49%"></i></div><div class="lf"><span class="sp">R$ 1.574 de R$ 3.200</span></div>';
 S.gl.appendChild(lens);
 S.spring('lensIn',0,SPR.pop,function(v){lens.style.opacity=clamp(v*1.6,0,1);lens.style.transform='translateY('+((1-v)*14).toFixed(2)+'px) scale('+(.96+.04*v).toFixed(4)+')'});
 var pcEl=lens.querySelector('.pc'),fill=lens.querySelector('.tr i'),spEl=lens.querySelector('.sp'),lastI=-1;
 S.spring('pct',49,SPR.gauge,function(v){
  fill.style.width=clamp(v,0,100).toFixed(2)+'%';var i=Math.round(v);
  if(i!==lastI){lastI=i;pcEl.textContent=i+'%';spEl.textContent=money(3200*i/100)+' de R$ 3.200';lens.classList.toggle('hot',i>=80)}
 });
 var fillPt=function(){var sr=S.stage.getBoundingClientRect(),fr=fill.parentNode.getBoundingClientRect(),k=sr.width/S.stage.offsetWidth||1;
  return {x:(fr.left-sr.left)/k+fr.width/k*clamp(S.sp.pct.x/100,0,1),y:(fr.top-sr.top)/k}};
 var lp=null;
 var startAx=-(S.cx+S.vw/2)/S.ppu-20;r.hold(0,startAx);
 S.at(.05,function(){S.sp.ph.t=0});
 S.at(.4,function(){r.hop(26,startAx*.45)});
 S.at(1.0,function(){r.hop(24,startAx*.1)});
 S.at(1.6,function(){r.hop(18,0)});
 S.at(2.0,function(){S.sp.halo.t=1});S.at(2.3,function(){S.sp.bub.t=1;r.lookAt(0,-.75)});
 var end=2.6+sayTimes(COPY.o2.say).end;
 S.at(2.6,function(){S.startSay(2.6)});
 S.at(end-.9,function(){S.sp.lensIn.t=1;var p=S.printPt(100,row[1]+30),g=S.gazeTo(p.x,p.y,120);r.lookAt(g[0],g[1])});
 S.at(end+.5,function(){S.sp.pct.t=82;S.follow=function(dt){var p=fillPt(),g=S.gazeTo(p.x,p.y+30,120);r.follow(g[0],g[1],dt)}});
 S.at(end+1.05,function(){r.setPose('atento')});
 S.at(end+1.6,function(){r.setPose('surpreso');r.startle()});
 S.at(end+2.7,function(){r.setPose('atento');S.follow=null;r.lookAt(0,.05)});
 S.endT=end+3.4;
 S.snapFinal=function(){S.sp.halo.t=1;r.setPose('atento');S.sp.lensIn.t=1;S.sp.pct.t=82;S.sp.bub.t=1;r.lookAt(0,.05);S.follow=null};
 r.home={x:0,y:.05};
}
function scriptO3(S){
 var r=S.rig;r.setPose('neutro',true);
 var cell=PC.cal.cell,days=PC.cal.days,names=['d8','d14','d19','d23'],ds=[8,14,19,23],pts=[];
 ds.forEach(function(d,i){var c=days[d];addRing(S,[c[0]-cell[0]/2,c[1]-cell[1]/2,cell[0],cell[1]],names[i],12);pts.push(S.printPt(c[0],c[1]))});
 var startAx=(S.w-S.cx+S.vw/2)/S.ppu+20;r.hold(0,startAx);
 S.at(.05,function(){S.sp.ph.t=0});
 S.at(.4,function(){r.hop(26,startAx*.45)});
 S.at(1.0,function(){r.hop(24,startAx*.1)});
 S.at(1.6,function(){r.hop(18,0)});
 S.at(2.0,function(){S.sp.halo.t=1});S.at(2.3,function(){S.sp.bub.t=1;r.lookAt(0,-.75)});
 var end=2.6+sayTimes(COPY.o3.say).end;
 S.at(2.6,function(){S.startSay(2.6)});
 var tt=end-.4;
 [0,1,2].forEach(function(i){
  S.at(tt+i*.8,function(){S.sp[names[i]].t=1;var g=S.gazeTo(pts[i].x,pts[i].y,120);r.lookAt(g[0],g[1])});
 });
 S.at(tt+2.5,function(){S.sp.d23.t=1;var g=S.gazeTo(pts[3].x,pts[3].y,120);r.lookAt(g[0],g[1])});
 S.at(tt+3.3,function(){r.lookAt(0,.05);r.setPose('feliz');r.hop(22)});
 S.at(tt+3.3+.17+.16,function(){
  var e=S.eyeC();for(var i=0;i<7;i++)S.coin(e.x+(i-3)*6,e.y-S.vw*.2,(i-3)*46,-600-((i*53)%140),9+(i%3)*1.5);
 });
 S.endT=tt+6;
 S.snapFinal=function(){S.sp.halo.t=1;r.setPose('feliz');r.lookAt(0,.05);names.forEach(function(n){S.sp[n].t=1});S.sp.bub.t=1};
 r.home={x:0,y:.05};
}
/* instalar */
var MKP={a:[[.88,.045],[.5,.0],[.5,.0]],i:[[.5,.97],[.5,.0],[.86,.045]]};
function scriptInstall(S){
 var r=S.rig,a=S.plat==='a',st=S.stage;
 var ph=S.sc.querySelector('.phone'),gl=ph.querySelector('.glass');
 var sh=st.clientHeight,ph_h=sh-8,steps=st.querySelector('.steps');
 var pw=Math.min((ph_h-12)*390/844+12,S.w>=390?184:162),left=12;
 ph.style.width=pw+'px';ph.style.left=left+'px';ph.style.top='4px';
 var colL=left+pw+10,colW=S.w-colL-14;
 steps.style.cssText='position:absolute;left:'+colL+'px;width:'+colW+'px;bottom:2px';
 var vw=Math.min(colW*.8,122),vx=colL+(colW-vw)/2,Hv=vw*200/240,gnd=sh-steps.offsetHeight-6;
 S.vwrap.style.setProperty('--vw',vw+'px');S.vwrap.style.left=vx+'px';S.vwrap.style.top=(gnd-.88*Hv)+'px';
 S.vw=vw;S.ppu=vw/240;S.cx=vx+vw/2;S.stH=sh;
 var gw=pw-12,gh=gl.offsetHeight;S.gl=gl;S.ps=gw/390;
 S.halo.style.cssText='left:'+(vx-vw*.3)+'px;top:'+(gnd-Hv*1.1)+'px;width:'+(vw*1.6)+'px;height:'+(vw*1.4)+'px';
 S.eyeC=function(){return {x:S.cx,y:gnd-.88*Hv+Hv*(106/200)}};
 /* interface do navegador desenhada por cima do print real */
 var o='';
 if(a){
  o+='<div class="bar" style="left:0;right:0;top:0;height:26px;border-width:0 0 1px 0;padding:0 8px;justify-content:space-between"><span style="flex:1;margin-right:6px;height:18px;border-radius:9px;background:var(--s2);padding:0 8px;display:flex;align-items:center">coinc.app</span><span style="width:16px;display:grid;place-items:center">'+ic('dots',14)+'</span></div>';
  o+='<div class="sheet" data-sh="1" style="right:6px;top:30px;width:'+Math.round(gw*.82)+'px;border-radius:12px;padding:4px 0;opacity:0"><div class="mrow">Nova guia</div><div class="mrow">Histórico</div><div class="mrow hl">Adicionar à tela inicial</div><div class="mrow">Compartilhar</div></div>';
  o+='<div class="sheet" data-sh="2" style="left:8px;right:8px;top:'+Math.round(gh*.34)+'px;border-radius:14px;padding:10px;opacity:0"><div style="font:700 12px var(--font)">Adicionar à tela inicial</div><div style="display:flex;align-items:center;gap:6px;margin:8px 0"><span style="width:20px;height:20px;border-radius:6px;background:var(--action);flex:none"></span><span style="flex:1;height:20px;border-radius:6px;background:var(--s2);padding:0 6px;display:flex;align-items:center">Coinc</span></div><div style="display:flex;justify-content:flex-end;gap:12px;font:700 12px var(--font)"><span style="color:var(--muted)">Cancelar</span><span style="color:var(--okink)">Adicionar</span></div></div>';
 }else{
  o+='<div class="bar" style="left:0;right:0;bottom:0;height:44px;border-width:1px 0 0 0;justify-content:space-around;padding:0 10px;color:var(--okink)"><span style="color:var(--muted)">'+ic('back',16)+'</span><span style="color:var(--muted)">'+ic('back',16).replace('m15 18-6-6 6-6','m9 18 6-6-6-6')+'</span><span>'+ic('share',16)+'</span><span style="color:var(--muted)">'+ic('dots',16)+'</span></div>';
  o+='<div class="sheet" data-sh="1" style="left:0;right:0;bottom:0;top:'+Math.round(gh*.42)+'px;border-radius:14px 14px 0 0;padding:8px 4px;opacity:0"><div class="mrow">Copiar</div><div class="mrow hl">Adicionar à Tela de Início</div><div class="mrow">Marcador</div></div>';
  o+='<div class="sheet" data-sh="2" style="left:0;right:0;top:0;bottom:0;border-radius:0;padding:26px 10px;opacity:0"><div style="display:flex;justify-content:space-between;font:700 12px var(--font)"><span style="color:var(--muted)">Cancelar</span><span style="color:var(--okink)">Adicionar</span></div><div style="display:flex;align-items:center;gap:6px;margin:14px 0"><span style="width:20px;height:20px;border-radius:6px;background:var(--action);flex:none"></span><span style="flex:1;height:20px;border-radius:6px;background:var(--s2);padding:0 6px;display:flex;align-items:center">Coinc</span></div></div>';
 }
 gl.insertAdjacentHTML('beforeend',o);
 var mk=document.createElement('div');mk.className='mk';mk.textContent='1';gl.appendChild(mk);
 var sh1=gl.querySelector('[data-sh="1"]'),sh2=gl.querySelector('[data-sh="2"]');
 S.spring('sh1',0,SPR.pop,function(v){sh1.style.opacity=clamp(v*1.6,0,1);sh1.style.transform='translateY('+((1-clamp(v,0,1.1))*(a?-6:40)).toFixed(2)+'px)'});
 S.spring('sh2',0,SPR.pop,function(v){sh2.style.opacity=clamp(v*1.6,0,1);sh2.style.transform='scale('+(.94+.06*clamp(v,0,1.1)).toFixed(4)+')'});
 var mp=function(i){var p=MKP[S.plat][i],x=p[0]*gw,y=p[1]*gh;
  if(a&&i===1){x=gw*.5;y=30+4+3*28-8+14}
  if(a&&i===2){x=gw-4;y=gh*.34+64}
  if(!a&&i===1){x=gw*.5;y=gh*.42+8+28+14}
  if(!a&&i===2){x=gw*.88;y=13}
  if(a&&i===0){x=gw-16;y=13}
  if(!a&&i===0){x=gw*.5+8;y=gh-22}
  return [x,y]};
 var m0=mp(0);
 S.spring('mx',m0[0],[120,14],function(v){mk.style.left=v.toFixed(2)+'px'});S.spring('my',m0[1],[120,14],function(v){mk.style.top=v.toFixed(2)+'px'});
 S.spring('mpulse',0,[30,3],function(){});
 var stepEls=S.sc.querySelectorAll('.step');
 S.setStep=function(i,instant){
  S.step=i;stepEls.forEach(function(b,j){b.setAttribute('aria-pressed',j===i)});
  var p=mp(i);S.sp.mx.t=p[0];S.sp.my.t=p[1];mk.textContent=i+1;
  S.sp.sh1.t=(i===1)?1:0;S.sp.sh2.t=(i===2)?1:0;
  var pt=S.printPt(0,0),g=S.gazeTo(pt.x+p[0]+0,pt.y+p[1],140);
  if(instant){S.sp.mx.snap(p[0]);S.sp.my.snap(p[1]);S.sp.sh1.snap(S.sp.sh1.t);S.sp.sh2.snap(S.sp.sh2.t);S.rig.lookAt(g[0],g[1],{eyeOnly:true});S.rig.eye.x.snap(g[0]);S.rig.eye.y.snap(g[1])}
  else{S.rig.hop(10);S.rig.lookAt(g[0],g[1])}
 };
 S.gazeTo=function(px,py,scale){var e=S.eyeC();return [clamp((px-e.x)/(scale||110),-1,1),clamp((py-e.y)/(scale||110),-1,1)]};
 S.printPt=function(x,y){var gr=S.gl.getBoundingClientRect(),sr=S.stage.getBoundingClientRect(),k=sr.width/S.stage.offsetWidth||1;return {x:(gr.left-sr.left)/k+x*S.ps,y:(gr.top-sr.top)/k+y*S.ps}};
 r.setPose('neutro',true);r.hold(150);
 /* entrada do Vintem: olha para o celular e sobe devagar */
 var times=[1.2,4.3,7.4];
 S.at(.06,function(){r.release()});S.at(.9,function(){S.sp.halo.t=1});
 for(var c=0;c<2;c++)times.forEach(function(tm,i){S.at(tm+c*9.6,function(){S.setStep(i)})});
 S.at(1.1,function(){});
 S.setStep(0,true);
 S.endT=9;
 S.snapFinal=function(){S.sp.halo.t=1;S.setStep(0,true)};
 r.home={x:.3,y:0};
}
/* login */
function scriptLogin(S){
 var r=S.rig,k=S.kind,sw=S.w,vw=Math.round(sw*(k==='l'?.42:.42)),st=S.stage;
 S.vwrap.style.setProperty('--vw',vw+'px');S.vwrap.style.left=((sw-48-vw)/2)+'px';S.vwrap.style.top=Math.max(0,st.clientHeight-vw*200/240*.88-2)+'px';
 st.style.height=Math.round(vw*200/240*.88+10)+'px';
 S.vwrap.style.top=(st.clientHeight-vw*200/240*.88-2)+'px';
 S.vw=vw;S.ppu=vw/240;S.halo.style.cssText='left:'+((sw-48-vw*1.6)/2)+'px;top:'+(st.clientHeight-vw*1.25)+'px;width:'+(vw*1.6)+'px;height:'+(vw*1.4)+'px';
 var fs=S.sc.querySelectorAll('.field'),sr=function(){return S.stage.getBoundingClientRect()};
 var gz=function(f){var a=sr(),k=a.width/st.offsetWidth||1,b=f.getBoundingClientRect(),cx=(a.left+a.right)/2,cy=a.top+(st.clientHeight-vw*200/240*.88+vw*200/240*.53)*k;return [clamp((b.left+b.width*.45-cx)/k/160,-1,1),clamp((b.top+b.height/2-cy)/k/170,-1,1)]};
 var foc=[0,1].map(function(i){return S.spring('f'+i,0,[160,18],function(v){fs[i].style.boxShadow='0 0 0 '+(3*clamp(v,0,1)).toFixed(2)+'px rgba(63,138,74,'+(.28*clamp(v,0,1)).toFixed(3)+')'})});
 r.hold(120);
 S.at(.06,function(){r.release()});S.at(.9,function(){S.sp.halo.t=1});
 S.at(1.3,function(){r.earFlick()});
 if(k==='l'){
  r.setPose('neutro',true);
  S.at(1.9,function(){var g=gz(fs[0]);r.lookAt(g[0],g[1]);S.sp.f0.t=1});
  S.at(3.4,function(){var g=gz(fs[1]);r.lookAt(g[0],g[1]);S.sp.f0.t=0;S.sp.f1.t=1});
  S.at(5.2,function(){r.lookAt(0,.05);S.sp.f1.t=0;r.hop(10)});
  S.endT=6.4;S.snapFinal=function(){S.sp.halo.t=1;r.setPose('neutro');r.lookAt(0,.05)};
 }else if(k==='le'){
  r.setPose('neutro',true);
  S.at(1.4,function(){r.setPose('triste');r.shake()});
  S.at(2.2,function(){var g=gz(fs[1]);r.lookAt(g[0],g[1]*.6)});
  S.endT=4;S.snapFinal=function(){S.sp.halo.t=1;r.setPose('triste');r.lookAt(0,.2)};
 }else{
  r.setPose('neutro',true);
  S.at(1.1,function(){r.setPose('sonolento')});S.at(2.1,function(){r.setPose('dormindo')});
  S.endT=5;S.snapFinal=function(){S.sp.halo.t=1;r.setPose('dormindo');r.lookAt(0,.1)};
 }
 r.home={x:0,y:.1};
}

function runScript(S){
 S.mount();
 if(S.kind.charAt(0)==='o'){layoutO(S);({o1:scriptO1,o2:scriptO2,o3:scriptO3})[S.kind](S)}
 else if(S.kind==='ia'||S.kind==='ii')scriptInstall(S);
 else scriptLogin(S);
}
function finish(S){
 /* movimento reduzido: simula em silencio e fica so na pose final, sem nenhuma animacao viva */
 var T=S.endT||6,dt=1/30;
 S.rig.rm=true;S.rm=true;
 for(var t=0;t<T;t+=dt)S.tick(dt);
 if(S.snapFinal)S.snapFinal();
 for(var j=0;j<90;j++)S.tick(dt);
 S.rig.snap();S.parts.forEach(function(p){p.s.snap(p.s.t);p.apply(p.s.x,S)});
 S.say&&(S.say.on.textContent=S.say.text,S.say.off.textContent='');
 if(S.sc.querySelector('.bubble')){var b=S.sc.querySelector('.bubble');b.querySelector('.on').textContent=b.dataset.text;b.querySelector('.off').textContent=''}
 S.fxp.forEach(function(p){p.el.remove()});S.fxp=[];
 S.ev=[];S.follow=null;S.rig.render();
}

/* ===== pagina ===== */
function figure(kind,w,h){
 var S=new Screen(kind,w,h);
 var f=document.createElement('div');f.className='fig';f.appendChild(S.el);
 var b=document.createElement('button');b.className='rep';b.type='button';b.textContent='Repetir';b.dataset.rep='1';f.appendChild(b);
 var c=document.createElement('div');c.className='cap';c.textContent=(KINDS.filter(function(k){return k[0]===kind})[0]||['',kind])[1]+' ('+w+' x '+h+')';f.appendChild(c);
 S.fig=f;return S;
}
function nav(){
 var n=$('nav'),h='';
 [['all','Visão geral'],['o','Onboarding'],['i','Instalar'],['l','Entrar']].forEach(function(t){h+='<a class="tab" href="?v='+t[0]+'&t='+THEME+'"'+(VAR===t[0]?' aria-current="true"':'')+'>'+t[1]+'</a>'});
 h+='<span class="sp"></span><button class="tab" type="button" id="tg" aria-pressed="'+(THEME==='dark')+'">Tema: '+(THEME==='dark'?'escuro':'claro')+'</button>';
 n.innerHTML=h;
}
function mountAll(list){
 list.forEach(function(S){
  S.rm=RM;S.sc.querySelectorAll('.vt-wrap');
 });
}
function renderPage(){
 SCREENS=[];UID=0;GT=0;
 setTheme(THEME);setRM(RM);nav();
 var w=$('stage');w.innerHTML='';document.body.classList.toggle('ov',VAR==='all'&&!ONLY);
 var list;
 if(ONLY){list=[ONLY]}else if(VAR==='all')list=KINDS.map(function(k){return k[0]});else list=GROUPS[VAR]||GROUPS.o;
 var sizes=ONLY?[[+(P.get('w')||390),+(P.get('h')||844)]]:(VAR==='all'?[[360,740]]:[[360,740],[390,844]]);
 sizes.forEach(function(sz){
  if(!ONLY&&VAR!=='all'){var h2=document.createElement('h2');h2.textContent=sz[0]+' x '+sz[1];w.appendChild(h2)}
  var row=document.createElement('div');row.className='row';w.appendChild(row);
  list.forEach(function(k){var S=figure(k,sz[0],sz[1]);row.appendChild(S.fig);SCREENS.push(S)});
 });
 SCREENS.forEach(function(S){S.rm=RM;runScript(S);if(RM)finish(S);else S.rig.render()});
}
/* relogio: rAF no uso normal; relogio virtual (?vclock, ?test) para capturas e testes deterministas */
function tickAll(dt){SCREENS.forEach(function(S){S.tick(dt)})}
var lastTs=0;
function loop(ts){var dt=lastTs?Math.min(.05,(ts-lastTs)/1000):.016;lastTs=ts;if(!RM)tickAll(dt);requestAnimationFrame(loop)}
window.__adv=function(sec,fps){var n=Math.round(sec*(fps||60)),dt=1/(fps||60);for(var i=0;i<n;i++)tickAll(dt)};
window.__pages=function(){return SCREENS};
document.addEventListener('click',function(e){
 var t=e.target.closest&&e.target.closest('[data-rep],.step,[data-plat],#tg');if(!t)return;
 if(t.id==='tg'){THEME=THEME==='dark'?'light':'dark';history.replaceState(null,'','?v='+VAR+'&t='+THEME);renderPage();return}
 var sc=t.closest('.scr');var S=sc&&sc._S;if(!S)return;
 if(t.dataset.rep){rebuild(S)}
 if(t.classList.contains('step')){S.ev=[];S.setStep&&S.setStep(+t.dataset.i)}
 if(t.dataset.plat){var kk=t.dataset.plat==='a'?'ia':'ii';rebuild(S,kk)}
});
function rebuild(S,kind){
 var n=new Screen(kind||S.kind,S.w,S.h);n.fig=S.fig;S.fig.replaceChild(n.el,S.el);SCREENS.splice(SCREENS.indexOf(S),1,n);
 n.rm=RM;runScript(n);if(RM)finish(n);else n.rig.render();
}
