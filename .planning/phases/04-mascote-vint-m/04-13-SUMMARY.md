---
phase: 04-mascote-vint-m
plan: 13
subsystem: ui
tags: [vintem, selftest, pixels, cdp, regression, reduced-motion, static-guard]
requires: ["04-05", "04-09", "04-11"]
provides:
  - "VintemModel.freezeAt({ turn, expr?, look?, acc? }): pose de teste congelada, giro exatamente em T"
  - "freeze(VintemFreeze) no handle de createVintemView e prop frozen opcional em Vintem; handle ganha svg()"
  - "runSelfTest(host) em src/lib/vintem/selftest.ts: verificacoes por pixels e DOM, saida PASS/FALHA:/INFO e linha FALHAS n"
  - "cartao Autoteste (pre#selftest, window.__done) em VintemTestPage, so com ?test e por import() dinamico"
  - "scripts/ux-audit/vintem.mjs --test: le o autoteste, repouso sem re-render e movimento reduzido real"
  - "test/static/phase4-selftest.test.js (8 testes)"
affects: [04-14, 04-15, 04-16, 04-17, 04-18, 04-19, 04-20]
status: complete
commits: 3
plan_head_before: 4074270ca6fec209089fc532eb63c86d579e5797
actuals:
  tokens: 13400
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "Instancias congeladas montadas por createRoot fora da arvore da pagina, com flushSync, medidas por clone do svg com estilos computados"
    - "Mascara por distancia de cor ao fundo lido de hsl(var(--background)) e preenchimento de buracos; limiar revalidado a cada execucao"
    - "Variantes de teste (neutro simetrico, olhar desviado, sem acessorio) por sobrescrita da pose em freezeAt, sem estado novo no produto"
key-files:
  created:
    - src/lib/vintem/selftest.ts
    - test/static/phase4-selftest.test.js
  modified:
    - shared/core/vintemModel.js
    - shared/core/vintemModel.test.js
    - shared/core/vintemStates.js
    - src/lib/vintem/view.ts
    - src/lib/vintem/geometry.ts
    - src/components/vintem/Vintem.tsx
    - src/pages/VintemTestPage.tsx
    - scripts/ux-audit/vintem.mjs
key-decisions:
  - "Contagem de pixels de acessorio no perfil exige diferenca contra a mesma pose sem acessorio E cor perto do token computado (so a cor casaria com o corpo no Zzz cinza)"
  - "Orelhas ancoradas medem o pivo e o meio da base (como o sketch), nao as pontas da base: no triste dobrado uma ponta passa 3 unidades do topo da cabeca sem soltar a orelha"
  - "Referencia do neutro simetrico: cv 0,10 nas duas palpebras e ba 0 (o cv do neutro do sketch)"
  - "Executor com --test roda o autoteste, o repouso e a midia emulada e depois as 21 verificacoes de sempre; sem a flag nada muda"
requirements-completed: [MASC-02, MASC-03, MASC-07]
---

# Phase 4 Plan 13: Autoteste por pixels do Vintem Summary

**Autoteste por pixels portado do sketch 020 para o app (`/vintem-teste?test`), rodado por CDP e terminando em `FALHAS 0`: 21 pares distintos a 84 e 48 px, os quatro pontos fracos medidos, giro sem vazamento nem colapso em 7 estados x 21 angulos, contraste com o corpo oliva, repouso sem re-render e movimento reduzido real.**

## Performance

- **Tasks:** 3 (1 tracer, 2 auto)
- **Files:** 2 criados, 8 modificados
- **Commits:** 3

## Accomplishments

- Tracer: `freezeAt` no modelo (snapPose com movimento reduzido forcado, giro fixo em T, `update` vira nada, aceita sobrescritas `expr`, `look` e `acc` finitas), `freeze` na view, prop `frozen` e `svg()` no componente, `selftest.ts` com 7 estados sem NaN, dois olhos e contraste por cores computadas (esclera 8,24:1, sobrancelha 7,64:1, corpo/fundo 7,03:1, corpo/cartao 7,64:1, moeda 4,94:1, acessorios de 4,12 a 8,24:1), cartao Autoteste atras de `?test` e `vintem.mjs --test`.
- Distincao: rasterizador (clone do svg com estilos computados), mascara com preenchimento de buracos e limiar 150 revalidado (distancia corpo-fundo 484, focinho 402, esclera 65; no sketch 593). 21 pares com menor valor 14,4% a 84 px e 13,1% a 48 px (bravo x sonolento); controle negativo do olhar 6,7%.
- Pontos fracos 1 e 2 medidos: neutro com palpebras 0,46 e sobrancelhas 9 unidades de diferenca, 3,2% contra o simetrico; triste com 46 px contra 49 do neutro (93,9%) e orelhas de 46,1 a 214,2.
- Giro: 7 estados x 21 angulos com uma massa conexa e nada na borda, pior largura 79% e pior area 73% da frontal, olhos 2/1/nunca zero, orelhas ancoradas (pivo e base) na frente e no perfil, acessorios de triste (105 px), atento (195), bravo (171) e sonolento (206) no perfil.
- Executor: repouso sem nenhuma mutacao de no fora do svg em 3 s, midia `prefers-reduced-motion` emulada com palpebra parada por 6 s, expressao que ainda muda, perfil em 50 ms e palpebra voltando a mudar em 2,7 s sem a midia.

## Verificacao

- `node --test shared/core/vintemModel.test.js`, `npm run test:core:tz` (650 em UTC e em Tokyo), `npm run test:static` (396), `npm run build` e `npm run lint` verdes.
- `node scripts/ux-audit/vintem.mjs --test`: 32 verificacoes, `FALHAS 0`; sem a flag, 21 verificacoes e `FALHAS 0` (comportamento do 04-11 intacto). `vintem-app.mjs --only home`: `FALHAS 0`.

## Task Commits

| Tarefa | Commit | Observacao |
|--------|--------|------------|
| 1 (tracer) | 94b791d7 | freezeAt, freeze, frozen, selftest minimo, cartao Autoteste, `--test` |
| 2 | 1c3e4bca | rasterizador, pares, controle negativo, pontos fracos 1 e 2, ajuste de STATE_PARAMS |
| 3 | c048c47d | giro, orelhas, acessorios no perfil, repouso, midia emulada, guarda estatica, patas do perfil |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Neutro assimetrico abaixo de 3% contra o simetrico**
- **Found during:** Tarefa 2
- **Issue:** com `cvL .30`, `cvR .06`, `ba -6` (UI-SPEC) a diferenca media 2,5% a 84 px (minimo 3%); com .40, .04, -8 ainda 2,9%.
- **Fix:** `cvL .48`, `cvR .02`, `ba -9` (3,2%). O limiar de 3% nao foi tocado; o teste do nucleo (`cvL - cvR >= .15`, `|ba| >= 5`) segue verde.
- **Files modified:** `shared/core/vintemStates.js`
- **Commit:** 1c3e4bca

**2. [Rule 1 - Bug] Triste com 85,7% da altura do neutro (minimo 92%)**
- **Found during:** Tarefa 2
- **Issue:** com `sy .93` o corpo mede 117 unidades e o neutro ganha altura das orelhas em pe (141); `py` so desloca, nao soma altura, e as orelhas dobradas (`ea 70`, `es .72`, fixadas pelo teste do nucleo) nao chegam ao topo do corpo.
- **Fix:** `sy 1.04` no triste (46 px contra 49 a 84 px, 93,9%). O peso do triste fica em `py 5`, `rt 5`, olhos, sobrancelhas e orelhas. `vintemModel.test.js` passou a ler o `sy` da tabela em vez do literal 0,93.
- **Files modified:** `shared/core/vintemStates.js`, `shared/core/vintemModel.test.js`
- **Commit:** 1c3e4bca

**3. [Rule 1 - Bug] Pata do perfil do triste tocava a borda de baixo do quadro**
- **Found during:** Tarefa 3
- **Issue:** com `sy 1.04`, `py 5` e a cabeca tombada em 5 graus, a pata do perfil (fim em y 178) chegava a 8 pixels na borda de baixo em T de 0,55 a 1.
- **Fix:** patas do perfil terminam em y 172 (alturas 26 e 28). Margem de cerca de 4 unidades; area minima do giro foi de 75% para 73%.
- **Files modified:** `src/lib/vintem/geometry.ts`
- **Commit:** c048c47d

**4. [Rule 3 - Bloqueio] Guarda do motor barra `outerHTML` e `rgb(` literal em `src/lib/vintem`**
- **Found during:** Tarefa 1
- **Fix:** o teste de NaN usa `XMLSerializer` e a sonda de cor usa `fillStyle = 'black'`.
- **Commit:** 94b791d7

### Interpretacoes do plano

- **Acessorios no perfil:** contam como pixels do acessorio os que diferem da mesma pose sem acessorio (`acc` zerado por `freezeAt`) e ficam a no maximo 120 de soma RGB da cor computada dele. So a cor casaria com o corpo no Zzz cinza; a diferenca sozinha ignoraria o token.
- **Orelhas ancoradas:** pivo e meio da base, como no sketch. Com as quatro pontas da base o triste falhava por 3 unidades acima da cabeca no perfil, sem orelha solta.
- **Lagrima no contraste:** medida sobre o corpo (onde e desenhada); suor, raiva, brilho, exclamacao e Zzz sobre o cartao e o fundo da pagina (vale o pior).
- **Executor `--test`:** soma as verificacoes do autoteste, do repouso e da midia emulada as 21 de sempre (a pagina com `?test` ganha um sexto cartao, entao as de sempre rodam em `/vintem-teste?w=360`).

## Auth gates

Nenhum.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. O modulo so mede o desenho (guarda estatica proibe servico, hook de dados, contexto, armazenamento e `fetch`), so e carregado por `import()` atras de `?test`, e a rota segue atras do `ProtectedRoute` e com `noindex` (T-04-13-01 e T-04-13-02 mitigados).

## Pendente (julgamento humano)

- Abrir `/vintem-teste?test` no Chrome do desktop (relatorio termina em `FALHAS 0`) e depois `/vintem-teste` girando de lado em cada estado: "parece um porquinho de verdade" e julgamento do dono (P-04). Atencao a tres mudancas de arte desta execucao: neutro com a palpebra esquerda bem mais baixa (`cvL .48`), triste sem achatar (`sy 1.04`) e patas do perfil 6 unidades mais curtas.

## Self-Check: PASSED

- Arquivos: `src/lib/vintem/selftest.ts`, `test/static/phase4-selftest.test.js`, `scripts/ux-audit/vintem.mjs`, `shared/core/vintemModel.js` existem.
- Commits 94b791d7, 1c3e4bca e c048c47d existem em `main`.
