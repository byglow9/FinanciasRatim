---
phase: 04-mascote-vint-m
plan: 11
subsystem: ui
tags: [vintem, test-page, hidden-route, balloon, onFrame, spring, cdp, static-guard]
requires: ["04-01", "04-02", "04-04", "04-05", "04-06", "04-07", "04-08", "04-09"]
provides:
  - "rota oculta /vintem-teste em AnimatedRoutes (atras do ProtectedRoute, sem link, noindex)"
  - "VintemTestPage com cinco cartoes: Vintem grande, Controles, Sete estados em 84px, No medidor e Balao de fala"
  - "onFrame(cb) em src/lib/vintem/world.ts: retorno por quadro dentro do laco unico"
  - "VintemBalloon (text, placement, onDismiss, popKey, reduced) e VintemInlineRow (state, text, onDismiss, onTap, popKey, reduced)"
  - "scripts/ux-audit/vintem.mjs (porta 5197, 21 verificacoes, termina em FALHAS n)"
  - "test/static/phase4-testpage.test.js (13 testes) e guardas de rotas 9 para 10"
affects: [04-12, 04-13, 04-14, 04-15, 04-16]
status: complete
commits: 3
plan_head_before: 11bfbafc30a13726c394e8e42338ae0bfe44b211
actuals:
  tokens: 19000
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "Retorno por quadro registrado no laco unico (onFrame) em vez de um segundo requestAnimationFrame"
    - "Pop de mola escrito por ref em style.transform e style.opacity, sem estado React por quadro"
    - "Verificacao CDP por clique real (Select movel, chaves, botoes) e setter nativo para o input range"
key-files:
  created:
    - src/components/vintem/VintemBalloon.tsx
    - src/components/vintem/VintemInlineRow.tsx
    - src/pages/VintemTestPage.tsx
    - scripts/ux-audit/vintem.mjs
    - test/static/phase4-testpage.test.js
  modified:
    - src/App.tsx
    - src/lib/vintem/world.ts
    - test/static/phase3-final.test.js
    - test/static/phase3-gaps.test.js
key-decisions:
  - "O interruptor Movimento reduzido da pagina parte da midia do sistema e, depois de tocado, vale mais que ela (prop reduced)"
  - "Grade de sete estados em 3 colunas (4 a partir de md): a 360 px a coluna util tem cerca de 296 px e 4 colunas de 84 px nao cabem"
  - "Tom do arco por estado: feliz e neutro brand, atento warn, bravo e triste danger, sonolento e surpreso neutral"
  - "Falar mantem a fala em texto simples abaixo dos botoes (Tarefa 2) e a repete na linha do cartao Balao de fala (Tarefa 3)"
requirements-completed: [MASC-06, MASC-03, MASC-02]
---

# Phase 4 Plan 11: Pagina de teste oculta do Vintem Summary

**Rota /vintem-teste atras do login, sem link e com noindex, com todos os controles do UI-SPEC S7, balao de fala com pop de mola pelo laco unico (onFrame), linha em linha de 48 px e executor CDP a 360 px que termina em FALHAS 0.**

## Performance

- **Tasks:** 3 (1 tracer, 2 auto)
- **Files:** 5 criados, 4 modificados

## Accomplishments

- Tracer: rota `/vintem-teste` em `AnimatedRoutes`, H1 "Teste do Vintém", legenda, `meta robots noindex` criada ao montar e removida ao desmontar, Vintém `stage` com seletor de estado, e `vintem.mjs` verde.
- Controles: `Select` de estado, `input type="range"` de 0 a 160 (`min-h-11`) que aplica `stateFromPct`, `SegmentedControl` de tom local, chaves Seguir o cursor, Girar de lado e Movimento reduzido, e botões Lançar gasto, Susto, Bronca, Festa e Falar.
- Falar sorteia por `pick` sobre `PHRASES`, com `SAMPLE_SITUATION_BY_STATE`, o tom local e encaixes fictícios (Lazer, iFood, R$ 90,00, 82%, 4 vezes, quarto, 3 dias), histórico por `pushRecent` e `recentKey` num `useRef`; sem fala disponível não mostra nada.
- `onFrame(cb)` em `world.ts`: callbacks `(dtSec) => boolean` rodam no mesmo laço, saem quando devolvem falso ou lançam, e o laço volta a dormir sem nada vivo (também solta o ouvinte de visibilidade).
- `VintemBalloon`: botão "Dispensar fala do Vintém", texto como filho React dentro de `span aria-hidden`, sem `line-clamp`, rabicho de 16 por 8, pop `bub` de 0,6 a 1 com origem no topo (ou à esquerda no inline) e só fade com movimento reduzido.
- `VintemInlineRow`: botão de 48 por 48 com o Vintém `inline` e balão à direita; sem texto não renderiza nada.
- Cartões "Sete estados em 84px" (7 botões, ativo com anel de 2 px de ação), "No medidor" (`ArcGauge` real com `restPct = 100 - pct` e Vintém de 84 no slot) e "Balão de fala".
- Guarda `phase3-final.test.js` e `phase3-gaps.test.js` passam de 9 para 10 rotas.

## Verificacao

- `node scripts/ux-audit/vintem.mjs`: 21 verificações, `FALHAS 0` (montagem, noindex, olhos, ausência de NaN, piscada, cartões, grade em 84 px, arco, select, limite 120 vira bravo, Falar, pop do balão, giro, rolagem horizontal, alvos >= 43,5 px, dispensa do balão, movimento reduzido parado por 6 s, sem exceção nem `console.error`).
- `npm run build`, `npm run lint`, `npm run test:static` (380 verdes) e `npm run test:core:tz` (648 em UTC e em Tokyo) verdes.

## Task Commits

| Tarefa | Commit | Observacao |
|--------|--------|------------|
| 1 (tracer) | 419bbeec | Entrou no commit "save" do dono (rota, página base, guarda, `vintem.mjs`, 10 rotas); nesta execução só foi reverificada (FALHAS 0) |
| 2 | b9736eff | Controles, falas e verificações CDP de estado, giro, movimento reduzido e alvos |
| 3 | 83d9c2f5 | `onFrame`, balão, linha em linha, três cartões novos, guarda de rotas de `phase3-gaps` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Guarda de rotas de phase3-gaps com contagem antiga**
- **Found during:** Tarefa 3 (`npm run test:static`)
- **Issue:** `test/static/phase3-gaps.test.js` exigia exatamente 9 `<Route path=` em `App.tsx`; a rota oculta leva a 10. Só `phase3-final.test.js` estava listado no plano.
- **Fix:** contagem atualizada para 10 com comentário citando D-17.
- **Files modified:** `test/static/phase3-gaps.test.js`
- **Commit:** 83d9c2f5

**2. [Rule 3 - Bloqueio] Tarefa 1 já estava no histórico**
- O commit "save" 419bbeec do dono capturou os arquivos do tracer antes desta execução. Não houve commit separado da Tarefa 1; o `commits: 3` medido desde `plan_head_before` inclui esse commit.

**3. Grade de estados em 3 colunas**
- O plano pede 7 botões com arte de 84 px; a 360 px quatro colunas não cabem, então a grade usa 3 colunas (4 a partir de `md`).

## Auth gates

Nenhum.

## Known Stubs

Nenhum. A fala vazia some de propósito (contrato do UI-SPEC), e os encaixes fictícios da página são intencionais (D-17).

## Threat Flags

Nenhum. A página não importa serviço, hook de dados nem contexto, e não grava nada (guarda estática); a rota fica atrás do `ProtectedRoute` com `noindex` e sem string de rota em NavRail, SettingsPage e ShortcutRow; o texto do balão é filho React; o único `requestAnimationFrame` de laço segue em `world.ts`.

## Pendente (julgamento humano)

- Abrir `/vintem-teste` num celular ou a 360 px: percorrer os sete estados, ligar Girar de lado, tocar nos botões e no Vintém sonolento, e avaliar se cada estado se distingue e se o perfil parece um porquinho de verdade (UI-SPEC P-04). Pixel e código não decidem isso.

## Self-Check: PASSED

- Arquivos: `src/pages/VintemTestPage.tsx`, `src/components/vintem/VintemBalloon.tsx`, `src/components/vintem/VintemInlineRow.tsx`, `scripts/ux-audit/vintem.mjs`, `test/static/phase4-testpage.test.js` existem.
- Commits 419bbeec, b9736eff e 83d9c2f5 existem em `main`.
