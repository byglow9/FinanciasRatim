---
phase: 05-identidade-coinki-pwa-e-onboarding
plan: 07
subsystem: ui
tags: [icones, pwa, maskable, apple-touch, favicon, assets-generator, sharp]
status: complete

requires:
  - phase: 05-identidade-coinki-pwa-e-onboarding
    provides: "05-01 pacote @vite-pwa/assets-generator 2.0.0 instalado; 05-05 sketch 021 com a versao A"
provides:
  - "assets-src/icon/icon.svg e assets-src/maskable/icon-maskable.svg (fontes provisorias, versao A do sketch 021)"
  - "npm run icons: regenera PNGs, favicon e copias de public/ a partir dos dois SVGs, sem rede"
  - "public/icons/{pwa-192x192,pwa-512x512,maskable-icon-512x512,apple-touch-icon-180x180}.png, icon.svg, public/favicon.svg e favicon.ico"
  - "test/static/phase5-icons.test.js e helpers/png.js (guarda de dimensoes, opacidade, favicon e pureza dos SVGs)"
affects: [05-09 manifest e service worker, 05-13 escolha do icone, 05-16, 05-18 deploy]

actuals:
  tokens: 4500
  tasks: 2
  commits: 2
plan_head_before: 3fe46320af8a89f5c794a78f34fb8bd55422fa36

tech-stack:
  added: []
  patterns:
    - "Fonte unica em dois SVGs (any e maskable); a saida do gerador fica em assets-src (ignorada pelo git) e so as copias atomicas de public/ sao versionadas"
    - "Config do gerador exige as tres chaves do preset (transparent, maskable, apple); o que nao se quer gerar leva sizes: []"

key-files:
  created:
    - assets-src/icon/icon.svg
    - assets-src/maskable/icon-maskable.svg
    - pwa-assets.config.ts
    - pwa-assets.maskable.config.ts
    - scripts/build-icons.mjs
    - public/icons/icon.svg
    - public/icons/pwa-192x192.png
    - public/icons/pwa-512x512.png
    - public/icons/maskable-icon-512x512.png
    - public/icons/apple-touch-icon-180x180.png
    - public/favicon.svg
    - public/favicon.ico
    - test/static/helpers/png.js
    - test/static/phase5-icons.test.js
  modified:
    - package.json
    - .gitignore

key-decisions:
  - "SVGs gerados executando as funcoes icon() do proprio sketch 021 (a mesma arte, sem redesenhar); troca pelo icone escolhido no 05-13 = substituir os dois SVGs e rodar npm run icons"
  - "PNGs em truecolor RGBA: sem a opcao quality o sharp nao liga a paleta de 8 bits, que faria faixas no degrade e que o leitor de teste nao le"
  - "A silhueta da versao A ja cabe no circulo de raio 204,8 (pior raio 180,6 no autoteste do sketch), entao o maskable usa a mesma arte do icone any, sem reduzir"

patterns-established:
  - "scripts/build-icons.mjs: spawn do binario local, checagem de saidas nao vazias, copia para nome temporario e rename"

requirements-completed: []

duration: ~20 min
completed: 2026-11-23
---

# Phase 5 Plan 07: Pipeline de icones e icones provisorios Summary

**`npm run icons` gera PNGs 192, 512, maskable 512 e apple-touch 180 mais favicon.ico (48) e favicon.svg a partir de dois SVGs da versao A do sketch 021, com guarda que decodifica os PNGs; trocar o icone e so trocar os SVGs.**

## Accomplishments

- **Tracer (Task 1):** dos dois SVGs saem os sete arquivos de `public/` com um unico comando; o gerador roda duas vezes (uma por config, em pastas diferentes para os nomes nao colidirem), usando so `node_modules/.bin/pwa-assets-generator` (sem `npx`, sem rede); as copias para `public/` sao atomicas (nome temporario e rename); o script sai com codigo 1 e mensagem em portugues se faltar fonte, gerador ou saida. Conferido a olho: o maskable e de borda a borda, o `any` de 512 tem cantos arredondados transparentes.
- **Guarda (Task 2):** `phase5-icons.test.js` com 9 testes: dimensoes; cantos transparentes e centro opaco do `any` (192 e 512); maskable e apple-touch opacos na amostra de 64 pontos e em todos os pixels; bordas so de degrade e centro diferente da borda; silhueta dentro do circulo de raio 40%; favicon.ico com cabecalho `00 00 01 00` e entrada 48x48; SVGs sem `image`, `text`, `script`, `filter`, `use`, href externo; copias de `public/` identicas a fonte.
- Reproducibilidade provada: `npm run icons` rodado de novo nao altera nenhum arquivo versionado; os PNGs intermediarios de `assets-src` ficam fora do git.

Verificacao final: `npm run icons`, `node --test test/static/phase5-icons.test.js` (9 de 9), `npm run test:static` (488 testes, 486 passam, 0 falham, 2 ignorados) e `npm run build` verdes.

## Commits

- `e9ede66a`: feat(05-07): pipeline de icones e icones provisorios da versao A
- `9e56f951`: test(05-07): guarda de dimensoes e opacidade dos icones e script npm run icons

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Presets parciais do gerador nao funcionam**
- **Found during:** Task 1
- **Issue:** com `preset: { transparent }` (ou so `maskable` e `apple`) o gerador falha em `toResolvedAsset` (`Cannot read properties of undefined (reading 'sizes')`); a pesquisa previa so "se nao passar na tipagem".
- **Fix:** as tres chaves em cada config, com `sizes: []` nas que nao devem gerar nada.
- **Files modified:** pwa-assets.config.ts, pwa-assets.maskable.config.ts
- **Commit:** e9ede66a

**2. [Rule 1 - Bug] PNGs saiam com paleta de 8 bits**
- **Found during:** Task 1
- **Issue:** o padrao do gerador passa `quality: 60` ao sharp, que liga paleta (colormap); isso faz faixas no degrade e o leitor de teste do plano (RGB e RGBA) nao le.
- **Fix:** `png: { compressionLevel: 9 }` nas duas configs; os PNGs saem RGBA de 8 bits.
- **Files modified:** pwa-assets.config.ts, pwa-assets.maskable.config.ts
- **Commit:** e9ede66a

**3. [Informativo] Maskable sem reducao da silhueta**
- O plano previa reduzir a silhueta para caber no circulo; a versao A ja cabe (raio medido 180,6 contra 204,8), entao o maskable usa a mesma escala do icone `any`. A guarda confere o raio nos dois PNGs e vai acusar se a troca de icone (05-13) estourar o limite. O fallback com `sharp` direto nao foi necessario: o gerador rasterizou o degrade de borda a borda sem faixa solida.

**4. [Informativo] SVG limpo**
- O `id` e o `aria-label` do SVG do sketch ("versao A") foram trocados por `coinc-icon` e "Icone do Coinc" nas fontes.

**Total deviations:** 2 correcoes (Rule 3 e Rule 1) e 2 informativas; sem impacto no contrato.

## Authentication Gates

Nenhum.

## Known Stubs

Nenhum stub no codigo. O icone e provisorio por desenho (versao A); o dono escolhe o definitivo entre as 9 opcoes (cinco do sketch 021 e quatro do sketch 022, porquinho verde) no plano 05-13.

## Threat Flags

Nenhum. T-05-07-01 mitigada (binario local, sem `npx`, `npm_config_offline`), T-05-07-02 (guarda decodifica o alfa de todos os pixels do maskable e do apple-touch), T-05-07-03 (arte da geometria original do Vintem) e T-05-07-04 (guarda proibe `text`, `script`, `image`, referencia externa).

## Next Phase Readiness

- Plano 05-09 pode referenciar `/icons/pwa-192x192.png`, `/icons/pwa-512x512.png` e `/icons/maskable-icon-512x512.png` no manifest e `/icons/apple-touch-icon-180x180.png`, `/favicon.svg`, `/favicon.ico` no `index.html`. `public/piggy.svg` e `public/vite.svg` continuam la (remocao fica para quando nada mais os referenciar).
- Plano 05-13: o icone escolhido entra por substituicao dos dois SVGs (`assets-src/icon/icon.svg` com cantos arredondados; `assets-src/maskable/icon-maskable.svg` de borda a borda, silhueta dentro do raio 40%) e `npm run icons`; depois comitar `public/`. IDEN-03 nao foi marcado como entregue neste plano.

## Self-Check: PASSED

- FOUND: todos os 14 arquivos criados listados em key-files
- FOUND: commits e9ede66a e 9e56f951
- `git rev-list --count 3fe46320..HEAD` = 2 no momento da escrita
