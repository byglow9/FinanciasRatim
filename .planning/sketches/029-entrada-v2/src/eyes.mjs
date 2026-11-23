import { writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { connect, launchChrome } from '/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/scripts/ux-audit/cdp.mjs'
const R='/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/.planning/sketches/029-entrada-v2/index.html'
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
const chrome=await launchChrome(); const page=await connect(chrome.wsUrl)
await page.send('Page.enable'); await page.send('Runtime.enable')
await page.send('Emulation.setDeviceMetricsOverride',{width:500,height:1000,deviceScaleFactor:3,mobile:false})
const out=[];let fails=0
for(const th of ['light','dark']){
 const l=page.waitFor('Page.loadEventFired',30000)
 await page.send('Page.navigate',{url:pathToFileURL(R).href+'?only=l&w=390&h=844&vclock'+(th==='dark'?'&t=dark':'')}); await l; await sleep(600)
 await page.evaluate(`(function(){var S=window.__pages();window.__S=Array.isArray(S)?S[0]:S[Object.keys(S)[0]];window.__adv(8)})()`)
 const steps=[['neutro',0,0,0],['neutro-olhar-dir',0,.9,.1],['neutro-olhar-baixo',0,0,1],['neutro-olhar-esq-cima',0,-1,-1],['piscada-meio',0,0,0,.04],['piscada-fechada',0,0,0,.09],['atento',1],['triste',1],['sonolento',1],['feliz',1],['neutro-fim',1]]
 for(const st of steps){
  const [name,,gx,gy,blink]=st
  const isPose=['atento','triste','sonolento','feliz','neutro-fim'].includes(name)
  await page.evaluate(`(function(){var r=window.__S.rig;${isPose?`r.setPose('neutro',true);window.__adv(.5);r.setPose('${name==='neutro-fim'?'neutro':name}');r.lookAt(0,.05);`:`r.setPose('neutro',true);r.lookAt(${gx||0},${gy||0});`}window.__adv(${isPose?1.2:1.0})})()`)
  if(blink!==undefined){ await page.evaluate(`(function(){var r=window.__S.rig;r.blinkNow(false,true);window.__adv(${blink})})()`) }
  const m=JSON.parse(await page.evaluate(`(function(){var sc=document.querySelector('.lg')||document;var o={};['L','R'].forEach(function(s){var q=function(k){return document.querySelector('[data-p="'+k+s+'"]')};var eb=q('eb').getBoundingClientRect(),pu=q('pu').getBoundingClientRect(),eg=q('eb');o[s]={ew:eb.width,eh:eb.height,cx:eb.left+eb.width/2,cy:eb.top+eb.height/2,pl:pu.left,pr:pu.right,pt:pu.top,pb:pu.bottom,rx:+eg.getAttribute('rx'),ry:+eg.getAttribute('ry'),px:+q('pu').getAttribute('cx'),py:+q('pu').getAttribute('cy'),pr_:+q('pu').getAttribute('r'),lid:q('lid').getAttribute('d')}});var f=document.querySelector('.vt').getBoundingClientRect();o.f=[f.left,f.top,f.width,f.height];return JSON.stringify(o)})()`))
  // pupila dentro da esclera (elipse, em unidades locais) com margem
  let ok=true
  for(const s of ['L','R']){const e=m[s];const n=Math.pow(e.px/(e.rx-e.pr_),2)+Math.pow(e.py/(e.ry-e.pr_),2);const inside=Math.pow(e.px/(e.rx),2)+Math.pow(e.py/(e.ry),2)
   // ponto mais distante da pupila deve estar dentro da elipse
   const far=Math.hypot(e.px,e.py)+e.pr_; const lim=Math.min(e.rx,e.ry)
   const edge=Math.pow((Math.abs(e.px)+e.pr_)/e.rx,2)+Math.pow((Math.abs(e.py)+e.pr_)/e.ry,2)
   if(n>1.0001) ok=false }
  const sym=Math.abs(m.L.ew-m.R.ew)<0.01&&Math.abs(m.L.eh-m.R.eh)<0.01
  const lidEq=m.L.lid===m.R.lid
  if(!ok) fails++
  if(name.startsWith('neutro')&&name!=='neutro-fim'&&!blink&&(!sym||!lidEq)) fails++
  console.log(th,name,'pupilaDentro',ok,'simetria',sym,'lidIgual',lidEq,'pupL',m.L.px.toFixed(1),m.L.py.toFixed(1),'rx/ry',m.L.rx,m.L.ry,'pr',m.L.pr_.toFixed(1))
  const f=m.f
  const shot=await page.send('Page.captureScreenshot',{format:'png',clip:{x:f[0]+f[2]*.22,y:f[1]+f[3]*.22,width:f[2]*.56,height:f[3]*.45,scale:1}})
  await writeFile(`eye_${th}_${name}.png`,Buffer.from(shot.data,'base64')); out.push(`eye_${th}_${name}.png`)
 }
}
console.log('FALHAS_OLHO',fails)
await writeFile('eyes.list',out.join('\n'))
page.close(); await chrome.close()
