---
phase: 05-identidade-coinki-pwa-e-onboarding
plan: 05
subsystem: ui
tags: [icone, sketch, svg, pwa, autoteste, cdp, coinc]
status: complete

requires:
  - phase: 04-vintem
    provides: geometria original do Vintem em src/lib/vintem/geometry.ts (corpo, orelha, fenda, perfil)
provides:
  - "Sketch 021 com cinco versoes do icone do Coinc (A, B, C da referencia; D, E livres) e autoteste ?test"
  - "scripts/ux-audit/icon-sketch.mjs: executor CDP que termina em FALHAS n e salva preview.png"
  - "preview.png com as cinco versoes para o dono olhar sem abrir o arquivo"
affects: [05-07 icones provisorios (versao A), 05-13 portao da escolha do icone, 05-16]

actuals:
  tokens: 6000
  tasks: 2
  commits: 2
plan_head_before: 5a25f218cd88756ea158d6efe4d16c986f087463

tech-stack:
  added: []
  patterns:
    - "Sketch de icone gerado por uma funcao icon(versao, {mask, size, suf}) com id unico por copia; o autoteste usa a mesma funcao"
    - "Executor CDP de sketch por file:// (sem Vite): navega com ?test, espera window.__done, imprime FALHAS n e captura a pagina"

key-files:
  created:
    - .planning/sketches/021-icone-app/index.html
    - .planning/sketches/021-icone-app/preview.png
    - scripts/ux-audit/icon-sketch.mjs
  modified: []

key-decisions:
  - "D (cofre) ficou de lado, com a geometria PROFILE do Vintem e dois olhos na cabeca: de frente ela diferia de C em so 2,1% dos pixels a 60 px (cor do corpo quase igual e mesmo vulto), abaixo dos 12% do UI-SPEC"
  - "B (cabeca inclinada) virou cabeca grande e alta (preenche a zona segura) com orelhas caidas nas laterais: com a cabeca estreita ela diferia de A em so 9 a 11%"
  - "Silhueta maskable medida por pixel sem o fundo e sem a faixa do E; no E o desenho e recortado em y=342 para a faixa de baixo nao contar como silhueta"
  - "A escolha do icone fica para o plano 05-13; nada foi registrado em .planning/sketches/MANIFEST.md (a linha 021 | icone-app so entra com a escolha do dono)"

patterns-established:
  - "Criterio de distincao de icones: pixels diferentes (soma RGB maior que 150 ou presenca diferente) sobre a uniao dos pixels opacos a 60 px, minimo 12%"

requirements-completed: []

duration: ~25 min
completed: 2026-11-23
---

# Phase 5 Plan 05: Sketch 021 do icone do Coinc Summary

**Cinco versoes originais do icone (A frente, B cabeca inclinada, C silhueta escura, D cofre de lado, E espiando), todas derivadas da geometria do Vintem, conferidas por autoteste em Chrome (FALHAS 0) e com captura para o dono escolher no plano 05-13.**

## Accomplishments

- `index.html` autossuficiente (um unico script, nenhum recurso externo): cada versao em `viewBox 0 0 512 512`, degrade chapado de 2 cores, uma cor de silhueta e dois olhos de 32 unidades de largura. Previas em 192, 96, 60, 48 e 32 px, mascara circular de 96 px, zona segura de raio 40% com chave "mostrar zona segura" e tela inicial de mentira (60 px, rotulo "Coinc") sobre fundo claro e escuro. `?v=a` a `?v=e` mostram uma; sem `?v`, faixa com as cinco lado a lado e um cartao por versao.
- Autoteste `?test` com os oito itens do UI-SPEC mais quatro extras (sem emoji, sem recurso externo, um unico script, sem texto nem cifrao nas versoes). Resultado: `TOTAL 12 | FALHAS 0`.
- `icon-sketch.mjs`: Node puro, so Chrome em 127.0.0.1, perfil temporario removido, limpeza em SIGINT e SIGTERM, saidas 0, 1 e 2; imprime o relatorio, a linha `FALHAS n` e grava `preview.png` (1000 x 2530).

Medidas do autoteste (a 60 px, menor diferenca entre pares): A x B 13,6%, A x E 13,2%, C x D 15,9%, os demais acima de 22%. Pior raio da silhueta maskable: A 180,6, B 198,7, C 183,9, D 188,8, E 182,7 (limite 204,8). Menores contrastes: silhueta/fundo 3,94 (A) e olho/silhueta 5,62 (D).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] D (cofre) de frente nao passava no criterio de distincao**
- **Found during:** Task 1 (primeira rodada do autoteste)
- **Issue:** D de frente, como descrita no plano, diferia de C em 2,1% dos pixels a 60 px (item 6 do autoteste exige 12%), porque as duas sao um vulto verde-escuro de frente sobre creme.
- **Fix:** D redesenhada de lado a partir da geometria PROFILE do Vintem (corpo, cabeca, focinho, orelha, quatro patas, rabo, fenda no dorso), com os dois olhos na cabeca. Continua sem moeda e com a fenda e o focinho como marca de cofre; passou a 15,9% contra C. Os parametros do autoteste nao foram afrouxados.
- **Files modified:** .planning/sketches/021-icone-app/index.html
- **Commit:** c5e412e5

**2. [Rule 1 - Bug] B (cabeca inclinada) quase igual a A**
- **Found during:** Task 1
- **Issue:** a cabeca estreita com orelhas caidas diferia de A em 8,7% a 11,6%.
- **Fix:** cabeca maior e mais alta (preenche a zona segura, como pedia o UI-SPEC), inclinada 8 graus, orelhas caidas nas laterais; 13,6% contra A.
- **Files modified:** .planning/sketches/021-icone-app/index.html
- **Commit:** c5e412e5

**3. [Rule 3 - Blocking] Ordem de commits**
- O ajuste de B e D foi feito iterando com o executor da Task 2 (o autoteste so roda em Chrome). Os dois arquivos foram escritos antes do primeiro commit; os commits seguem a ordem das tarefas (Task 1: sketch; Task 2: executor e captura).

**Total deviations:** 2 correcoes de desenho (Rule 1) e 1 de ordem de trabalho; impacto: D difere da descricao textual do UI-SPEC (de lado, nao de frente); decisao de manter para o dono ver no plano 05-13.

## Authentication Gates

None.

## Known Stubs

None. As versoes sao arte final de sketch; nenhum dado ficticio chega ao app.

## Threat Flags

None. O sketch nao faz requisicao de rede (item do autoteste); T-05-05-01 a T-05-05-03 mitigadas pelo autoteste (sem `image`, `text`, `href` externo; olhos de 32 unidades e contrastes medidos). As silhuetas partem da geometria original do Vintem, sem reproduzir nenhum dos seis icones da referencia (T-05-05-02); a revisao do dono segue no plano 05-13.

## Issues Encountered

- O autoteste mede olho, silhueta e distincao no proprio Chrome; o primeiro Chrome headless nao precisou de flag para abrir `file://` com `Image` de `data:` (canvas nao fica contaminado).

## Next Phase Readiness

- Plano 05-07 pode gerar os icones provisorios a partir da versao A (`icon('a')` em `window.__icon`, SVG de 512 limpo).
- Plano 05-13 (portao humano): o dono escolhe entre A a E olhando `preview.png` ou o `index.html`; depois registrar a linha `021 | icone-app` em `.planning/sketches/MANIFEST.md`. IDEN-03 nao foi marcado como entregue neste plano.

## Self-Check: PASSED

- FOUND: .planning/sketches/021-icone-app/index.html
- FOUND: .planning/sketches/021-icone-app/preview.png
- FOUND: scripts/ux-audit/icon-sketch.mjs
- FOUND: commits c5e412e5 e 4899bc22
- `node scripts/ux-audit/icon-sketch.mjs` termina em `FALHAS 0` (exit 0)
