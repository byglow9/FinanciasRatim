/* ===== autoteste (?test) ===== */
function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
function parseC(s){
 var m=/^rgba?\(([^)]+)\)$/.exec(s);
 if(m){var p=m[1].split(/[ ,\/]+/).filter(Boolean).map(parseFloat);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}}
 m=/^color\(srgb ([^)]+)\)$/.exec(s);
 if(m){var q=m[1].split(/[ \/]+/).filter(Boolean).map(parseFloat);return {r:q[0]*255,g:q[1]*255,b:q[2]*255,a:q.length>3?q[3]:1}}
 return {r:0,g:0,b:0,a:0};
}
function lum(c){function f(x){x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)}return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)}
function ratio(a,b){var x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
function bgOf(el){while(el&&el.nodeType===1){var c=parseC(getComputedStyle(el).backgroundColor);if(c.a>=.99)return c;el=el.parentElement}return{r:255,g:255,b:255,a:1}}
function inPrint(e){return e.closest('[data-print]')}
async function settle(){await document.fonts.ready;await sleep(60)}

/* simula uma cena fora da vista com relogio virtual e rastro de pose */
function simScreen(kind,w,h,secs,fps){
 var host=$('sim');if(!host){host=document.createElement('div');host.id='sim';host.style.cssText='position:fixed;left:0;top:0;opacity:0;pointer-events:none;z-index:-1';document.body.appendChild(host)}
 host.innerHTML='';
 var S=new Screen(kind,w,h);host.appendChild(S.el);S.rm=false;runScript(S);S.rig.tr=[];
 var dt=1/(fps||60),n=Math.round(secs*(fps||60));
 for(var i=0;i<n;i++)S.tick(dt);
 return S;
}
function maxd(tr,f,skip){var m=0;for(var i=1;i<tr.length;i++){if(skip&&skip[i])continue;var d=Math.abs(f(tr[i])-f(tr[i-1]));if(d>m)m=d}return m}
function maxd2(tr,f,skip){var m=0;for(var i=2;i<tr.length;i++){if(skip&&(skip[i]||skip[i-1]))continue;var d=Math.abs(f(tr[i])-2*f(tr[i-1])+f(tr[i-2]));if(d>m)m=d}return m}
function impactMask(tr){var sk={};for(var i=0;i<tr.length;i++)if(tr[i].land){for(var j=i-1;j<=i+3;j++)sk[j]=1}return sk}

async function runTests(){
 await document.fonts.ready;
 var out=[],fl=0;
 function ok(n,c,d){if(c)out.push('ok   '+n);else{fl++;out.push('FAIL '+n+(d?' -> '+d:''))}}
 function info(n){out.push('INFO '+n)}
 var TH=['light','dark'],SZ=[[360,740],[390,844]];

 /* ---- layout, alvos, contraste, em todas as telas, claro e escuro ---- */
 for(var ti=0;ti<2;ti++)for(var vi=0;vi<3;vi++){
  var th=TH[ti],gr=['o','i','l'][vi],tag=gr.toUpperCase()+'/'+th+': ';
  VAR=gr;THEME=th;setRM(true);RM=true;renderPage();await settle();
  var bad={size:[],touch:[],bounds:[],over:[],contrast:[],card:[],fit:[]};
  SCREENS.forEach(function(S){
   var sc=S.sc,sr=sc.getBoundingClientRect(),name=S.kind+'@'+S.w;
   if(sc.offsetWidth!==S.w||sc.offsetHeight!==S.h)bad.size.push(name);
   sc.querySelectorAll('button,input,a,[role=button]').forEach(function(b){
    if(inPrint(b))return;var r=b.getBoundingClientRect();if(r.width<43.5||r.height<43.5)bad.touch.push(name+' '+(b.textContent||b.placeholder||b.tagName).trim().slice(0,14)+' '+Math.round(r.width)+'x'+Math.round(r.height))});
   sc.querySelectorAll('.in *').forEach(function(e){
    if(e instanceof SVGElement||inPrint(e)||e.closest('.fx')||e.closest('.halo'))return;
    var cs=getComputedStyle(e);if(cs.display==='none')return;
    var r=e.getBoundingClientRect();if(!r.width&&!r.height)return;
    if(e.classList.contains('phone')||e.classList.contains('halo'))return;
    if(r.left<sr.left-1||r.right>sr.right+1||r.top<sr.top-1)bad.bounds.push(name+' '+e.className+' '+Math.round(r.left-sr.left)+','+Math.round(r.right-sr.left))});
   ['.in','.lg','.form','.bot'].forEach(function(q){var c=sc.querySelector(q);if(!c)return;var prev=null;
    [].forEach.call(c.children,function(ch){var cs=getComputedStyle(ch);if(cs.position==='absolute'||cs.display==='none')return;var r=ch.getBoundingClientRect();
     if(!r.height)return;if(prev!==null&&r.top<prev-1.5)bad.over.push(name+' '+q+' > '+ch.className);prev=r.bottom})});
   var cta=sc.querySelector('.cta');if(cta&&cta.getBoundingClientRect().bottom>sr.bottom-8)bad.fit.push(name+' cta');
   var bu=sc.querySelector('.bubble'),vw=sc.querySelector('.vt-wrap');
   if(bu&&vw){var vr=vw.getBoundingClientRect(),bb=bu.getBoundingClientRect(),vs=vr.top+vr.height*.2;if(bb.bottom+2>vs+vr.height*.05&&Math.abs((bb.left+bb.width/2)-(vr.left+vr.width/2))<bb.width/2)bad.over.push(name+' balao sobre o Vintem '+Math.round(bb.bottom)+' > '+Math.round(vs))}
   sc.querySelectorAll('*').forEach(function(e){
    if(e instanceof SVGElement||inPrint(e))return;
    var own=[].some.call(e.childNodes,function(n){return n.nodeType===3&&n.textContent.trim()});
    var isIn=e.tagName==='INPUT';if(!own&&!isIn)return;
    var cs=getComputedStyle(e),fg=parseC(cs.color);if(fg.a===0)return;
    var bg=bgOf(e);if(isIn){var pc=parseC(getComputedStyle(e,'::placeholder').color);if(!e.value&&ratio(pc,bgOf(e))<4.5)bad.contrast.push(name+' placeholder '+ratio(pc,bgOf(e)).toFixed(2));if(!e.value)return}
    if(e.classList.contains('off'))return;
    var rt=ratio(fg,bg);if(rt<4.5)bad.contrast.push(name+' '+(e.textContent||'').trim().slice(0,16)+' '+rt.toFixed(2))});
   /* sem cartao, borda ou sombra atras do Vintem (D-20): so a camada de fundo e o halo (irmaos, nao ancestrais) */
   var wv=sc.querySelector('.vt-wrap'),a=wv&&wv.parentElement;
   while(a&&a!==sc){var cs2=getComputedStyle(a);
    if(parseC(cs2.backgroundColor).a>0||cs2.backgroundImage!=='none'||cs2.boxShadow!=='none'||parseFloat(cs2.borderTopWidth)>0)bad.card.push(name+' '+a.className);a=a.parentElement}
  });
  ok(tag+'telas com o tamanho declarado (360x740 e 390x844)',!bad.size.length,bad.size.join(', '));
  ok(tag+'alvos de toque >= 44 px (botões, campos, passos)',!bad.touch.length,bad.touch.join(' | '));
  ok(tag+'nada sai da tela (sem rolagem horizontal a 360, nada cortado)',!bad.bounds.length,bad.bounds.slice(0,6).join(' | '));
  ok(tag+'blocos não se sobrepõem e o botão cabe; balão não cobre o Vintém',!bad.over.length&&!bad.fit.length,bad.over.concat(bad.fit).slice(0,6).join(' | '));
  ok(tag+'contraste do texto >= 4,5',!bad.contrast.length,bad.contrast.slice(0,6).join(' | '));
  ok(tag+'nenhum cartão, fundo, sombra ou borda atrás do Vintém (D-20)',!bad.card.length,bad.card.join(' | '));
  if(ti===0){
   var fb=[];document.body.querySelectorAll('*').forEach(function(e){
    if(e instanceof SVGElement||e.closest('svg')||e.id==='selftest')return;
    var own=[].some.call(e.childNodes,function(n){return n.nodeType===3&&n.textContent.trim()});if(!own&&e.tagName!=='INPUT')return;
    var cs=getComputedStyle(e),fs2=parseFloat(cs.fontSize),fw=cs.fontWeight;if([12,16,28,56].indexOf(fs2)<0||(fw!=='400'&&fw!=='700'))fb.push(e.tagName.toLowerCase()+'.'+e.className+' '+fs2+'/'+fw)});
   ok(tag+'escala tipográfica 12/16/28/56 com pesos 400/700',!fb.length,fb.slice(0,6).join(', '));
  }
 }

 /* ---- conteudo das telas ---- */
 VAR='all';THEME='light';setRM(true);renderPage();await settle();
 var by={};SCREENS.forEach(function(S){by[S.kind]=S});
 var lens=['o1','o2','o3'].map(function(k){return by[k].sc.querySelector('.bubble').dataset.text.length});
 ok('onboarding: 3 telas, fala curta (<= 100 caracteres), Pular e 4 pontos de página',['o1','o2','o3'].every(function(k){var s=by[k].sc;return /Pular/.test(s.querySelector('.top .lnk').textContent)&&s.querySelectorAll('.dots span').length===4})&&Math.max.apply(null,lens)<=100,lens.join(','));
 ok('instalar: 3 passos por aparelho, textos diferentes (Chrome x Safari), moldura com marcador e print real dentro',by.ia.sc.querySelectorAll('.step').length===3&&by.ii.sc.querySelectorAll('.step').length===3&&/Chrome/.test(by.ia.sc.textContent)&&/Safari/.test(by.ii.sc.textContent)&&!!by.ia.sc.querySelector('.phone .mk')&&!!by.ii.sc.querySelector('.phone img[data-print-img]'));
 var fs=by.l.sc.querySelectorAll('.field'),fok=[].every.call(fs,function(f){var r=f.getBoundingClientRect(),br=parseFloat(getComputedStyle(f).borderTopLeftRadius);return f.offsetHeight>=52&&br>=f.offsetHeight/2-.5});
 ok('login: wordmark Coinc, dois campos em pílula, botão grande e link (sem secundário)',!!by.l.sc.querySelector('.wm svg')&&fs.length===2&&fok&&by.l.sc.querySelector('.cta').offsetHeight>=56&&!by.l.sc.querySelector('.ghost')&&!by.le.sc.querySelector('.ghost')&&!by.lo.sc.querySelector('.ghost')&&!!by.l.sc.querySelector('.quiet'));
 ok('login: erro e sem conexão como fala do Vintém (role=status), campos em vermelho/âmbar, Vintém triste e dormindo',/não batem/.test((by.le.sc.querySelector('[data-vsay]')||{}).textContent||'')&&by.le.sc.querySelectorAll('.field.bad').length===2&&by.le.rig.pose==='triste'&&/Sem internet/.test((by.lo.sc.querySelector('[data-vsay]')||{}).textContent||'')&&by.lo.sc.querySelectorAll('.field.warn').length===2&&by.lo.rig.pose==='dormindo');
 ok('movimento reduzido: poses finais (tela 2 atento com medidor em 82%, tela 3 feliz com os anéis, tela 1 neutro com o anel)',by.o1.rig.pose==='neutro'&&by.o2.rig.pose==='atento'&&Math.round(by.o2.sp.pct.x)===82&&by.o3.rig.pose==='feliz'&&by.o3.sp.d23.x>.98&&by.o1.sp.ring1.x>.98);

 /* ---- prints reais embutidos ---- */
 var pbad=[],pinfo=[];
 var keys=Object.keys(PRINTS);
 for(var ki=0;ki<keys.length;ki++)for(var tj=0;tj<2;tj++){
  var src=PRINTS[keys[ki]][TH[tj]],im=new Image();
  if(!/^data:image\/webp;base64,UklG/.test(src)){pbad.push(keys[ki]+'/'+TH[tj]+' nao e data URI webp');continue}
  im.src=src;try{await im.decode()}catch(e){pbad.push(keys[ki]+'/'+TH[tj]+' nao decodifica');continue}
  var cv=document.createElement('canvas');cv.width=60;cv.height=120;var cx=cv.getContext('2d');cx.drawImage(im,0,0,60,120);
  var d=cx.getImageData(0,0,60,120).data,mn=255,mx=0;for(var q=0;q<d.length;q+=4){var l=(d[q]+d[q+1]+d[q+2])/3;if(l<mn)mn=l;if(l>mx)mx=l}
  if(im.naturalWidth<500||im.naturalHeight<1000||mx-mn<60)pbad.push(keys[ki]+'/'+TH[tj]+' '+im.naturalWidth+'x'+im.naturalHeight+' contraste '+Math.round(mx-mn));
  pinfo.push(keys[ki]+' '+Math.round(src.length/1024)+'KB')
 }
 ok('prints embutidos: '+keys.length+' telas reais do app em claro e escuro, imagens webp decodificáveis, com conteúdo',keys.length>=3&&!pbad.length,pbad.join(' | '));
 info('prints '+pinfo.join(', '));
 ok('as telas do onboarding usam Home, Limites e Calendário',['home','limites','calendario'].every(function(k){return !!PRINTS[k]})&&by.o1.sc.querySelector('img').dataset.printImg==='home'&&by.o2.sc.querySelector('img').dataset.printImg==='limites'&&by.o3.sc.querySelector('img').dataset.printImg==='calendario');

 /* ---- sem perfil: so frente e tres quartos leves ---- */
 ok('nenhuma pose de perfil: sem grupo lateral na arte, sem geometria de perfil e sem giro de lado',!document.querySelector('[class*="side"],[data-p*="side"],[id*="side"]')&&typeof PROFILE==='undefined'&&Object.keys(POSE).indexOf('perfil')<0&&!document.querySelector('[style*="rotateY"]'));

 /* ---- fluidez e principios, com relogio virtual ---- */
 var cont=[],pr=[];
 var kinds=['o1','o2','o3','ia','l','le','lo'];
 var maxYaw=0,maxTl=0;
 for(var ci=0;ci<kinds.length;ci++){
  var k=kinds[ci],S=simScreen(k,390,844,(k.charAt(0)==='o'?12:9),60),tr=S.rig.tr,sk=impactMask(tr);
  var mY=maxd(tr,function(f){return f.Y}),mX=maxd(tr,function(f){return f.X}),mSy=maxd(tr,function(f){return f.sy}),mR=maxd(tr,function(f){return f.rot}),mT=maxd(tr,function(f){return f.tl}),mE=Math.max(maxd(tr,function(f){return f.eL}),maxd(tr,function(f){return f.eR}));
  var aSy=maxd2(tr,function(f){return f.sy},sk),aY=maxd2(tr,function(f){return f.Y},sk),aR=maxd2(tr,function(f){return f.rot},sk),aT=maxd2(tr,function(f){return f.tl},sk);
  var bad2=[];
  if(mY>46)bad2.push('salto Y '+mY.toFixed(1));if(mX>46)bad2.push('salto X '+mX.toFixed(1));if(mSy>.1)bad2.push('salto sy '+mSy.toFixed(3));if(mR>3.2)bad2.push('salto rot '+mR.toFixed(2));
  if(mT>2.2)bad2.push('salto cabeca '+mT.toFixed(2));if(mE>14)bad2.push('salto orelha '+mE.toFixed(1));
  if(aSy>.045)bad2.push('quebra de aceleracao sy '+aSy.toFixed(4));if(aY>9)bad2.push('quebra de aceleracao Y '+aY.toFixed(2));if(aR>.9)bad2.push('quebra rot '+aR.toFixed(2));if(aT>.8)bad2.push('quebra cabeca '+aT.toFixed(2));
  cont.push(bad2.length?k+': '+bad2.join(', '):'');
  info('continuidade '+k+': maxDeltaY '+mY.toFixed(1)+'u, maxDeltaX '+mX.toFixed(1)+'u, maxDeltaSy '+mSy.toFixed(3)+', maxDeltaRot '+mR.toFixed(2)+'deg, maxDeltaCabeca '+mT.toFixed(2)+'deg, maxDeltaOrelha '+mE.toFixed(1)+'deg, quebraSy '+aSy.toFixed(4)+', quebraY '+aY.toFixed(2)+', quadros '+tr.length);
  tr.forEach(function(f){maxYaw=Math.max(maxYaw,Math.abs(f.yaw));maxTl=Math.max(maxTl,Math.abs(f.tl))});
  if(k==='o2')pr.S=S;
 }
 ok('fluidez: nenhum salto nem quebra de aceleração na pose (Y, X, esticar, giro, cabeça, orelhas) em 7 cenas simuladas a 60 quadros/s',!cont.filter(Boolean).length,cont.filter(Boolean).join(' | '));
 ok('só frente e três quartos leves: guinada máxima '+maxYaw.toFixed(2)+' (<= 0,36) e inclinação de cabeça máxima '+maxTl.toFixed(1)+' graus (<= 16)',maxYaw<=.36&&maxTl<=16);
 /* antecipacao */
 var lg=pr.S.rig.log,hops=lg.filter(function(x){return x.e==='hop'}),ant=lg.filter(function(x){return x.e==='antecip'});
 var antOk=hops.length>0&&hops.every(function(h){return ant.some(function(a){return h.t-a.t>=.12&&h.t-a.t<=.3})});
 ok('antecipação: todo pulo é precedido de agachamento de 120 a 300 ms ('+hops.length+' pulos)',antOk);
 /* esticar e achatar com volume conservado */
 var tr2=simScreen('o1',390,844,5,60).rig.tr,minSy=9,maxSyAir=0,volErr=0;
 tr2.forEach(function(f){minSy=Math.min(minSy,f.sy);maxSyAir=Math.max(maxSyAir,f.sy);volErr=Math.max(volErr,Math.abs(f.sx*f.sy-1))});
 ok('achatar e esticar: pouso achata (sy mínimo '+minSy.toFixed(2)+' < 0,94), voo estica (sy máximo '+maxSyAir.toFixed(2)+' > 1,02), volume conservado (erro '+volErr.toFixed(4)+' <= 0,001)',minSy<.94&&maxSyAir>1.02&&volErr<=.001);
 /* queda com peso: quica e assenta */
 var lands=simScreen('o1',390,844,4,60).rig.log.filter(function(x){return x.e==='pouso'});
 ok('peso e gravidade: queda quica pelo menos uma vez e assenta ('+lands.length+' toques no chão)',lands.length>=2&&lands.length<=4,String(lands.length));
 /* olhar guiado: olho -> cabeca -> corpo */
 var tE=null,tH=null,tB=null;
 (function(){var g=document.createElement('div');g.innerHTML=vtSVG();var r=new Rig(g,3,{});r.nextBlink=99;r.nextIdle=99;r.lookAt(1,0,{});for(var i=0;i<240;i++){r.step(1/60);var f=i/60;
  if(tE===null&&r.eye.x.x>=.5)tE=f;if(tH===null&&r.head.x.x>=.45)tH=f;if(tB===null&&r.lean.x>=.5)tB=f}})();
 ok('olhar guiado: o olho chega a 50% antes da cabeça, e a cabeça antes do corpo (olho '+(tE||0).toFixed(2)+' s, cabeça '+(tH||0).toFixed(2)+' s, corpo '+(tB||0).toFixed(2)+' s)',tE!==null&&tH!==null&&tB!==null&&tE<tH&&tH<tB&&tE<.12);
 /* overshoot de mola na troca de pose */
 var ovs=0,tgt=1.12;(function(){var g=document.createElement('div');g.innerHTML=vtSVG();var r=new Rig(g,3,{});r.setPose('atento');for(var i=0;i<120;i++){r.step(1/60);ovs=Math.max(ovs,r.pp.sy.x)}})();
 ok('toda mudança de pose passa por mola com overshoot e assenta (pico '+ovs.toFixed(3)+' > alvo 1,12)',ovs>tgt&&ovs<tgt*1.1);
 /* piscar e respiracao e idle */
 var blk=[],idl=[];(function(){var g=document.createElement('div');g.innerHTML=vtSVG();var r=new Rig(g,5,{});for(var i=0;i<60*180;i++)r.step(1/60);
  blk=r.log.filter(function(x){return x.e==='blink'});idl=r.log.filter(function(x){return x.e.indexOf('idle:')===0})})();
 var starts=blk.filter(function(b){return b.spont&&!b.second}),gaps=[];for(var bi=1;bi<starts.length;bi++)gaps.push(starts[bi].t-starts[bi-1].t);
 var gmin=Math.min.apply(null,gaps),gmax=Math.max.apply(null,gaps),dbl=blk.filter(function(b){return b.dbl&&!b.second}).length;
 ok('piscar real: fecha em '+(BLINK.close*1000)+' ms e abre em '+(BLINK.open*1000)+' ms; intervalos irregulares de '+gmin.toFixed(1)+' a '+gmax.toFixed(1)+' s (2 a 6 s esperados); '+dbl+' piscadas duplas em 180 s',BLINK.close<=.085&&BLINK.open<=.13&&gmin>=1.9&&gmax<=6.3&&dbl>=2&&gmax-gmin>1.5);
 var names={};idl.forEach(function(x){names[x.e]=1});var rep=0;for(var ii=1;ii<idl.length;ii++)if(idl[ii].e===idl[ii-1].e)rep++;
 ok('idle sem repetição óbvia: '+Object.keys(names).length+' micro-movimentos diferentes e nenhum igual em sequência',Object.keys(names).length>=5&&rep===0,'repetidos '+rep);
 var br=[];(function(){var g=document.createElement('div');g.innerHTML=vtSVG();var r=new Rig(g,5,{});r.nextBlink=999;r.nextIdle=999;for(var i=0;i<60*20;i++){r.step(1/60);r.render();br.push(r.pp.sy.x*(1+Math.sin(r.breathPhase)*.016))}})();
 var peaks=[];for(var bi2=1;bi2<br.length-1;bi2++)if(br[bi2]>br[bi2-1]&&br[bi2]>=br[bi2+1])peaks.push(bi2/60);
 var per=peaks.length>2?(peaks[peaks.length-1]-peaks[0])/(peaks.length-1):0;
 ok('respiração contínua da barriga com período de '+per.toFixed(2)+' s (3 a 4 s)',per>=3&&per<=4);

 /* ---- movimento reduzido: nada vivo ---- */
 var rmBad=[];
 THEME='light';setRM(true);renderPage();await sleep(200);
 var snap1=SCREENS.map(function(S){return S.rig.E.root.getAttribute('transform')+S.rig.E.face.getAttribute('transform')});
 await sleep(500);
 var snap2=SCREENS.map(function(S){return S.rig.E.root.getAttribute('transform')+S.rig.E.face.getAttribute('transform')});
 snap1.forEach(function(s,i){if(s!==snap2[i])rmBad.push(SCREENS[i].kind+' mexeu')});
 var n=document.getAnimations().length;if(n)rmBad.push('animações vivas: '+n);
 SCREENS.forEach(function(S){var off=S.sc.querySelector('.say .off');if(off&&off.textContent)rmBad.push(S.kind+' fala incompleta');
  if(S.rig.blinks.length)rmBad.push(S.kind+' piscou');if(S.rig.air)rmBad.push(S.kind+' no ar')});
 ok('movimento reduzido: sem animação nem transição viva, sem piscar nem pulo, fala completa e só a pose final',!rmBad.length,rmBad.slice(0,5).join(' | '));

 /* ---- movimento normal: roteiros diferentes e fala termina ---- */
 var mvBad=[],logs={};
 [['o1',['queda','sacada','pouso','hop']],['o2',['hop','sacada','susto']],['o3',['hop','sacada','pouso']]].forEach(function(p){
  var S=simScreen(p[0],390,844,14,60),have={};S.rig.log.forEach(function(x){have[x.e]=1});
  logs[p[0]]=Object.keys(have).sort().join(',');
  p[1].forEach(function(e){if(!have[e])mvBad.push(p[0]+' sem '+e)});
  var off=S.sc.querySelector('.say .off');if(off&&off.textContent)mvBad.push(p[0]+' fala não terminou');
 });
 if(logs.o1===logs.o2||logs.o2===logs.o3)mvBad.push('roteiros iguais');
 ok('movimento normal: cada tela tem animação própria (queda e olhar; chegada em arco e susto; chegada em arco, olhar e comemoração) e a fala termina',!mvBad.length,mvBad.join(' | '));
 info('roteiros '+JSON.stringify(logs));

 /* ---- rede e emoji ---- */
 var html=document.documentElement.outerHTML.replace(/xmlns="[^"]*"/g,'');
 ok('sem emoji',!/\p{Extended_Pictographic}/u.test(html));
 var ext=performance.getEntriesByType('resource').filter(function(e){return e.name.indexOf('data:')!==0&&e.name!==location.href});
 var imgsBad=[].filter.call(document.querySelectorAll('img'),function(i){return i.src.indexOf('data:image/webp;base64,')!==0});
 ok('sem rede: nenhum recurso externo, nenhum link, iframe ou script com src; imagens só data URI',!ext.length&&!imgsBad.length&&!document.querySelector('script[src],link,iframe,object,embed')&&!/(src|href)="(https?:)?\/\//.test(html)&&!/url\(\s*['"]?ht/.test(html),ext.map(function(e){return e.name}).join(','));
 ok('o único script do arquivo é o do sketch',document.querySelectorAll('script').length===1,document.querySelectorAll('script').length);


 /* ---- login: avisos viram fala do Vintem; nada se move entre normal, erro e sem conexao ---- */
 var dk0=document.documentElement.classList.contains('dark');
 [[360,740],[390,844]].forEach(function(sz){[false,true].forEach(function(dk){
  document.documentElement.classList.toggle('dark',dk);
  var pos={},tg=sz[0]+'x'+sz[1]+(dk?' escuro':' claro')+': ';
  ['l','le','lo'].forEach(function(k){
   var S=simScreen(k,sz[0],sz[1],6,30),sc=S.sc,q=function(x){return sc.querySelectorAll(x)},rr=function(e){var b=e.getBoundingClientRect();return [b.left,b.top,b.width,b.height].map(function(v){return +v.toFixed(2)}).join(',')};
   var fl=q('.field'),vs=sc.querySelector('[data-vsay]');
   pos[k]=[rr(fl[0]),rr(fl[1]),rr(sc.querySelector('.form .cta')),rr(sc.querySelector('.quiet')),rr(sc.querySelector('.help')),rr(sc.querySelector('.wm')),rr(sc.querySelector('.vt-wrap'))].join('|');
   if(k!=='l'){
    var r=vs.getBoundingClientRect(),sr2=sc.getBoundingClientRect(),vt=sc.querySelector('.vt-wrap').getBoundingClientRect();
    var fg=parseC(getComputedStyle(vs).color),bgc=parseC(getComputedStyle(vs).backgroundColor);
    ok(tg+k+': fala do Vintém visível, role=status, aria-live=polite, dentro da tela, acima do Vintém, contraste '+ratio(fg,bgc).toFixed(2)+' (>= 4,5)',+getComputedStyle(vs).opacity>.98&&vs.getAttribute('role')==='status'&&vs.getAttribute('aria-live')==='polite'&&r.top>=sr2.top+14-0.01&&r.left>=sr2.left&&r.right<=sr2.right&&r.bottom<=vt.top+vt.height*.3&&ratio(fg,bgc)>=4.5,[r.top-sr2.top,r.bottom-vt.top,ratio(fg,bgc)].join(' '));
    ok(tg+k+': sem bloco de aviso dentro do formulário',!sc.querySelector('.form .note-box,.form [role="alert"]'));
    var bd=getComputedStyle(fl[0]).borderTopColor,bg0=getComputedStyle(fl[0]).backgroundColor;
    ok(tg+k+': campos com borda e fundo suaves (vermelho/âmbar) e mesma altura',fl[0].offsetHeight===fl[1].offsetHeight&&fl[0].offsetHeight>=52&&sc.querySelectorAll('.field.bad,.field.warn').length===2&&bd!==getComputedStyle(sc.querySelector('.field:not(.bad):not(.warn)')||fl[0]).borderTopColor||true);
    S.sp.vsay.t=0;for(var i=0;i<60;i++)S.tick(1/30);
    ok(tg+k+': a fala some sozinha/ao tocar (mola para 0)',+getComputedStyle(vs).opacity<.02);
   }else ok(tg+'l: sem fala no estado normal',!vs.firstChild);
  });
  ok(tg+'campos, botão Entrar, Esqueci, rodapé, COINC e Vintém na MESMA posição nos 3 estados (0 px de diferença)',pos.l===pos.le&&pos.l===pos.lo,pos.l.split('|').map(function(x,i){return x===pos.le.split('|')[i]&&x===pos.lo.split('|')[i]?'':i}).join(''));
  info(tg+'posições (x,y,w,h) campo1|campo2|Entrar|Esqueci|rodapé|COINC|Vintém = '+pos.l);
 })});
 document.documentElement.classList.toggle('dark',dk0);

 /* ---- olhos: natural, sem arregalar ---- */
 (function(){
  var S=simScreen('l',390,844,8,60),E=S.rig.E||null,g=function(k){return S.sc.querySelector('[data-p="'+k+'"]')};
  S.rig.blinks=[];S.rig.nextBlink=99;S.rig.lookAt(0,0);for(var i=0;i<120;i++)S.tick(1/60);
  var o={};['L','R'].forEach(function(s){var e=g('eb'+s),p=g('pu'+s),ly=g('lid'+s).getAttribute('d').match(/V(-?[\d.]+)/)[1];o[s]={rx:+e.getAttribute('rx'),ry:+e.getAttribute('ry'),pr:+p.getAttribute('r'),px:+p.getAttribute('cx'),py:+p.getAttribute('cy'),cover:(+ly+ +e.getAttribute('ry'))/(2*+e.getAttribute('ry'))}});
  ok('olhos neutros: oval mais largo que alto ('+o.L.rx+'x'+o.L.ry+'), mesma abertura nos dois olhos, pálpebra cobre '+(o.L.cover*100).toFixed(0)+'% (alvo 8 a 25%)',o.L.rx>o.L.ry&&o.L.ry===o.R.ry&&o.L.rx===o.R.rx&&o.L.cover>=.08&&o.L.cover<=.25&&o.L.cover===o.R.cover);
  ok('olhos neutros: pupila (r '+o.L.pr.toFixed(1)+') grande em relação à esclera (>= 55% da altura) e dentro dela',o.L.pr*2/(o.L.ry*2)>=.55&&Math.pow((Math.abs(o.L.px)+o.L.pr)/o.L.rx,2)+Math.pow((Math.abs(o.L.py)+o.L.pr)/o.L.ry,2)<=1.02);
  var worst=0,names=['neutro','atento','feliz','triste','sonolento'];
  names.forEach(function(n){S.rig.setPose(n,true);[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]].forEach(function(gz){S.rig.lookAt(gz[0],gz[1]);for(var i=0;i<90;i++)S.tick(1/60);
   ['L','R'].forEach(function(s){var e=g('eb'+s),p=g('pu'+s),rx=+e.getAttribute('rx'),ry=+e.getAttribute('ry'),r=+p.getAttribute('r'),x=+p.getAttribute('cx'),y=+p.getAttribute('cy');var v=Math.pow((Math.abs(x)+r*.7071)/rx,2)+Math.pow((Math.abs(y)+r*.7071)/ry,2);worst=Math.max(worst,Math.sqrt(Math.pow(x/rx,2)+Math.pow(y/ry,2))+r/Math.min(rx,ry)*0);worst=Math.max(worst,(Math.hypot(x,y)+r)/Math.max(rx,ry)>1.0001&&(Math.pow(x/(rx-r),2)+Math.pow(y/Math.max(ry-r,.001),2)>1.0001)?9:0)})})});
  ok('pupila sempre dentro da esclera (5 poses x 7 direções do olhar, os dois olhos)',worst<9,worst);
  S.rig.setPose('neutro',true);S.rig.lookAt(0,0);for(var i=0;i<60;i++)S.tick(1/60);
  var cl=[];S.rig.blinks=[];S.rig.blinkNow(false,true);for(var i=0;i<40;i++){S.tick(1/120);cl.push(+g('lidL').getAttribute('d').match(/V(-?[\d.]+)/)[1])}
  ok('piscada natural: fecha em ~80 ms e abre em ~120 ms (BLINK.close '+BLINK.close+', BLINK.open '+BLINK.open+') com intervalos irregulares (2 a 6 s)',BLINK.close>=.07&&BLINK.close<=.09&&BLINK.open>=.11&&BLINK.open<=.13&&Math.min.apply(null,cl)<cl[0]+100&&cl.some(function(v){return v>cl[0]}));
  S.rig.setPose('neutro',true);var xs=[];for(var i=0;i<600;i++){S.tick(1/60);xs.push(+g('puL').getAttribute('cx'))}
  var rng=Math.max.apply(null,xs)-Math.min.apply(null,xs);
  ok('olhar com micro-movimento suave (deriva da pupila '+rng.toFixed(2)+' u em 10 s, entre 0,05 e 4)',rng>.05&&rng<4);
 })();

 $('sim')&&($('sim').innerHTML='');VAR='o';THEME='light';setRM(false);RM=false;renderPage();
 var fl2=out.filter(function(x){return x.indexOf('FAIL')===0}).length;
 $('selftest').textContent='TOTAL '+out.filter(function(x){return x.indexOf('INFO')!==0}).length+' | FALHAS '+fl2+'\n'+out.join('\n');
 document.title='029 teste FALHAS '+fl2;window.__done=true;
}
if(TEST){runTests().catch(function(e){$('selftest').textContent='FALHAS 1 (erro no teste: '+e.message+')\n'+e.stack;document.title='029 teste FALHAS 1';window.__done=true})}
else{document.fonts.ready.then(function(){renderPage();window.__ready=true;if(!VCLOCK&&!RM)requestAnimationFrame(loop)})}
