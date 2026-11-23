#!/usr/bin/env node
// Compara a rasterizacao do navegador (Chrome) com a do sharp/librsvg para os SVGs do sketch 027.
// Uso: . ./scripts/dev-env.sh && node .planning/sketches/027-icone-profundidade/compare-sharp.mjs
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { connect, launchChrome } from '../../../scripts/ux-audit/cdp.mjs'
const here = dirname(fileURLToPath(import.meta.url))
const sharp = createRequire(resolve(here, '../../../package.json'))('sharp')
const chrome = await launchChrome()
let bad = 0
try {
  const page = await connect(chrome.wsUrl)
  await page.send('Page.enable'); await page.send('Runtime.enable')
  const loaded = page.waitFor('Page.loadEventFired', 30000)
  await page.send('Page.navigate', { url: pathToFileURL(resolve(here, 'index.html')).href })
  await loaded
  for (const k of ['a', 'b', 'c', 'd']) for (const kind of ['any', 'mask', 'fav']) {
    const r = await page.evaluate(`(async()=>{const s=window.__icon.icon('${k}',{kind:'${kind}',suf:'-cmp'}).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ');
      const im=new Image();await new Promise((ok,er)=>{im.onload=ok;im.onerror=er;im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s)});
      const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.drawImage(im,0,0,512,512);
      return JSON.stringify({svg:s,px:Array.from(x.getImageData(0,0,512,512).data)})})()`)
    const { svg, px } = JSON.parse(r)
    const { data } = await sharp(Buffer.from(svg)).resize(512, 512).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const centre = (d) => { const o = (256 * 512 + 256) * 4; return [d[o], d[o + 1], d[o + 2]] }
    let sum = 0, n = 0
    for (let i = 0; i < data.length; i += 4) { sum += Math.abs(data[i] - px[i]) + Math.abs(data[i + 1] - px[i + 1]) + Math.abs(data[i + 2] - px[i + 2]); n += 3 }
    const mean = sum / n, cb = centre(px), cs = centre(data)
    const dc = Math.max(...cb.map((v, i) => Math.abs(v - cs[i])))
    const ok = mean < 4 && dc < 10
    if (!ok) bad++
    console.log(`${ok ? 'PASS' : 'FAIL'} ${k} ${kind}: diferenca media por canal ${mean.toFixed(2)}, centro navegador ${cb} sharp ${cs}`)
  }
  page.close()
} finally { await chrome.close() }
console.log(`FALHAS ${bad}`); process.exit(bad ? 1 : 0)
