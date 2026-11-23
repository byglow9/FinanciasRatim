/* folha ampliada do Vintem dormindo: transicao sonolento -> dormindo -> acordar (olhos e corpo) */
import { writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { connect, launchChrome } from '/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/scripts/ux-audit/cdp.mjs'
const R='/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/.planning/sketches/029-entrada-v2/index.html'
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
const chrome=await launchChrome(); const page=await connect(chrome.wsUrl)
await page.send('Page.enable'); await page.send('Runtime.enable')
await page.send('Emulation.setDeviceMetricsOverride',{width:500,height:1000,deviceScaleFactor:3,mobile:false})
for(const th of ['light','dark']){
 const l=page.waitFor('Page.loadEventFired',30000)
 await page.send('Page.navigate',{url:pathToFileURL(R).href+'?only=lo&w=390&h=844&vclock'+(th==='dark'?'&t=dark':'')}); await l; await sleep(600)
 await page.evaluate(`(function(){var S=window.__pages();window.__S=Array.isArray(S)?S[0]:S[Object.keys(S)[0]];window.__adv(2.5);var r=window.__S.rig;r.setPose('neutro',true);window.__adv(.6);})()`)
 // [acao, avanco antes da captura]
 const steps=[['neutro',0],['sonolento',.15],['sonolento',.6],['dormindo',.15],['dormindo',.3],['dormindo',.6],['dormindo',1.5],['dormindo',2.4],['dormindo',3.3],['neutro',.12],['neutro',.4]]
 let i=0
 for(const [pose,adv] of steps){
  await page.evaluate(`(function(){var r=window.__S.rig;if(r.pose!=='${pose}'||${i}===0||${i}===9)r.setPose('${pose}');window.__adv(${adv})})()`)
  const f=JSON.parse(await page.evaluate(`(function(){var b=document.querySelector('.vt').getBoundingClientRect();return JSON.stringify([b.left,b.top,b.width,b.height])})()`))
  const shot=await page.send('Page.captureScreenshot',{format:'png',clip:{x:f[0],y:f[1]-f[3]*.05,width:f[2],height:f[3]*1.05,scale:1}})
  await writeFile(`/tmp/sl_${th}_${String(i).padStart(2,'0')}_${pose}.png`,Buffer.from(shot.data,'base64')); i++
 }
}
page.close(); await chrome.close()
