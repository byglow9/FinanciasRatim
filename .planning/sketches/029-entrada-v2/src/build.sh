#!/bin/bash
# monta o index.html do sketch 029 (fontes do 026, prints reais em webp, css, js)
set -e
R=/home/glow/Documentos/projetos/sitefinancias/financiasratimbum
B=$(cd "$(dirname "$0")" && pwd)
OUT=$R/.planning/sketches/029-entrada-v2/index.html
PR=$R/.planning/sketches/029-entrada-v2/prints
mkdir -p $B/w
JS=""
for n in home limites calendario; do for th in claro escuro; do
  convert $PR/$n-$th.png -resize 600x -quality 78 -define webp:method=6 $B/w/$n-$th.webp
done; done
python3 - "$B" "$R" "$OUT" <<'PY'
import sys,base64
B,R,OUT=sys.argv[1:4]
src=open(R+'/.planning/sketches/026-entrada/index.html').read().split('\n')
fonts='\n'.join(src[4:6])
def b64(p): return base64.b64encode(open(p,'rb').read()).decode()
pr={}
for n in ['home','limites','calendario']:
    pr[n]={'light':'data:image/webp;base64,'+b64(f'{B}/w/{n}-claro.webp'),'dark':'data:image/webp;base64,'+b64(f'{B}/w/{n}-escuro.webp')}
prints='var PRINTS={'+','.join("%s:{light:'%s',dark:'%s'}"%(k,v['light'],v['dark']) for k,v in pr.items())+'};\n'
css=open(B+'/app.css').read()
js=prints+open(B+'/engine.js').read()+'\n'+open(B+'/glyphs.js').read()+'\n'+open(B+'/scenes.js').read()+'\n'+open(B+'/tests.js').read()
html='''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>029 Entrada do Coinc v2</title>
<style>
/* Sketch 029: autossuficiente (fontes e prints reais embutidos em base64, sem rede). Texto so em 12, 16, 28 e 56 com pesos 400 e 700. */
'''+fonts+'\n'+css+'''</style></head><body>
<nav id="nav"></nav>
<div id="wrap">
<h1>Entrada do Coinc, versão 2</h1>
<div class="note">Cenas ilustradas da variante C do 026, agora com fundo liso do app e prints reais (modo mock, dados fictícios): Home, Limites e Calendário. O Vintém só de frente e em três quartos leves; a física (molas, queda com peso, antecipação, achatar e esticar, arrasto das orelhas, olhar em três tempos, piscar e respiração) roda num relógio próprio. Use ?v=o, ?v=i ou ?v=l, ?t=dark para o escuro, ?still para a pose final (movimento reduzido), ?only=o1&amp;w=390&amp;h=844&amp;vclock para uma cena só com relógio virtual e ?test para o autoteste.</div>
<div id="stage"></div>
<div id="selftest"></div>
</div>
<script>
'''+js+'''
</script></body></html>
'''
open(OUT,'w').write(html)
print(len(html)//1024,'KB')
PY
