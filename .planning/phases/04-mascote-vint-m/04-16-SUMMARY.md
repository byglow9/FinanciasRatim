---
phase: 04-mascote-vint-m
plan: 16
subsystem: ui
tags: [vintem, limits, inline-row, tone-preview, empty-state, cdp, static-guard]
requires: ["04-02", "04-06", "04-08", "04-10", "04-11", "04-12"]
provides:
  - "inlineMood({ rows, tone }) em shared/core/vintemMood.js: estado e sujeito da categoria mais critica (situacao central)"
  - "useInlineVintem({ rows, neutralOk, categoryDefs }) devolvendo { visible, state, text, popKey, onTap, onDismiss }"
  - "VintemInlineRow entre o cabecalho e a lista de LimitsList (Limites do mes da Home)"
  - "previa Exemplo no VintemToneCard (TONE_EXAMPLES, tres textos fixos)"
  - "VintemEmpty({ pose: 'neutro' | 'sonolento' | 'surpreso' }) para os planos 04-15, 04-17 e 04-20"
  - "suites limits e settings em scripts/ux-audit/vintem-app/ e test/static/phase4-limits.test.js"
affects: [04-15, 04-17, 04-20]
status: complete
commits: 3
plan_head_before: 005a65d0688bd69a72620f56466a90d8170f01a8
actuals:
  tokens: 7000
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "Fala da linha sorteada em efeito pelo pickPhrase do provedor, chaveada por primitivos da categoria mais critica (id, pct, restante), sem laco de animacao novo"
    - "Previa de tom com texto fixo e popKey por contador de troca, sem consultar o banco de frases"
key-files:
  created:
    - src/hooks/useInlineVintem.ts
    - src/components/vintem/VintemEmpty.tsx
    - scripts/ux-audit/vintem-app/limits.mjs
    - scripts/ux-audit/vintem-app/settings.mjs
    - test/static/phase4-limits.test.js
  modified:
    - shared/core/vintemMood.js
    - shared/core/vintemMood.test.js
    - src/components/limits/LimitRow.tsx
    - src/components/settings/VintemToneCard.tsx
    - src/pages/SettingsPage.tsx
key-decisions:
  - "inlineMood reaproveita overState e limitBand: estouro acima de 130% do limite (em centavos) ou tom suave vira triste, senao bravo"
  - "A fala da linha e refeita quando muda a categoria mais critica ou o pct dela (numeros do balao sempre atuais); dispensar vale ate remontar o hook"
  - "VintemEmpty nao passa follow nem decorative: herda os padroes do Vintem (decorativo, olhar segue o ponteiro) e fica aria-hidden no contêiner"
requirements-completed: [MASC-01, MASC-02, MASC-04, MASC-05]
---

# Phase 4 Plan 16: Vintem em Limites do mes, previa de tom e VintemEmpty Summary

**Linha do Vintem de 48 px com fala curta (ate 80 caracteres) sobre a categoria mais critica no cabecalho de "Limites do mes", previa "Exemplo" com os tres exemplos fixos no cartao de tom e a peca VintemEmpty calada para estados vazios e de erro.**

## Performance

- **Duration:** cerca de 6 min de execucao
- **Tasks:** 3 (1 tracer, 2 auto)
- **Files:** 5 criados, 5 modificados

## Accomplishments

- `inlineMood`: primeira linha de `rows` manda; estourou e bravo (triste no tom suave ou acima de 130%), perto e atento viram atento, abaixo e feliz so se todas as linhas estao abaixo de 40% (senao neutro); sem linhas devolve `null`. Sete testes novos cobrem os tres tons, as fronteiras 39 e 40 por cento e a lista vazia.
- `useInlineVintem`: `visible` falso com linhas vazias, dado velho (`neutralOk`), perfil do parceiro (`readOnly`) ou sem frase no banco; o sorteio roda em efeito pelo `pickPhrase` do provedor com `maxLen: 80`; toque no Vintem refaz a fala e incrementa `popKey` (sem giro); dispensar esconde a linha. Nao usa `speak`, regiao viva nem laco de animacao.
- `LimitsList` renderiza `VintemInlineRow` dentro de `mt-3`, entre o cabecalho e o bloco "Nenhum limite definido"; so 15 linhas acrescentadas em `LimitRow.tsx`, nenhuma alterada.
- Cartao de tom: rotulo "Exemplo" (12/700) e `VintemInlineRow` neutro de 48 px com o exemplo do tom exibido (otimista), `onDismiss` vazio e novo pop a cada troca (inclusive na reversao por falha e na ressincronizacao).
- `VintemEmpty`: `div mx-auto flex justify-center`, `aria-hidden="true"`, `data-pose`, `Vintem size="empty"` (120 por 100); sem botao, balao, fala nem nome acessivel.
- Suites `limits` (9 verificacoes mais a de console) e `settings` (15 mais a de console) do executor CDP, ambas em `FALHAS 0`; guarda `phase4-limits.test.js` com 6 testes.

## Verificacao

- `npm run test:core:tz`: 656 testes em UTC e em Asia/Tokyo, 0 falhas.
- `npm run test:static`: 410 testes, 409 passam, 0 falhas (1 pulado ja existente).
- `npm run build` e `npm run lint`: limpos.
- `node scripts/ux-audit/vintem-app.mjs` (home, insights, limits, settings): `FALHAS 0`.

## Task Commits

| Tarefa | Commit | Observacao |
|--------|--------|------------|
| 1 (tracer) | fbd95eb4 | inlineMood, hook, linha em LimitsList e suite limits; verify de ponta a ponta repetida e verde antes de seguir |
| 2 | 992a7584 | previa Exemplo, suite settings e chave unica do esqueleto de SettingsPage |
| 3 | 088866c0 | VintemEmpty e guarda estatica phase4-limits |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Bloqueio] Chave duplicada no esqueleto de carga de SettingsPage**
- **Found during:** Tarefa 2 (suite `settings`, verificacao `sem-excecoes-nem-console-error`)
- **Issue:** `src/pages/SettingsPage.tsx` renderiza o esqueleto com `key={h}` sobre `[144, 224, 112, 144]`; o 144 repetido gerava o `console.error` do React ("two children with the same key"), derrubando o `FALHAS 0` exigido. Pre-existente, nao causado pelo cartao.
- **Fix:** `key={`${i}-${h}`}` (uma linha, sem mudanca visual).
- **Files modified:** `src/pages/SettingsPage.tsx`
- **Commit:** 992a7584

### Observacoes sem desvio

- O `maxLen: 80` ficou literal no hook (e nao em constante) para a guarda estatica e o contrato do plano baterem com o texto.
- O nome da categoria "Alimentacao" sem acento visto na suite vem da semente fictícia do executor, nao do codigo.
- Edicoes nao commitadas do dono (ArcGauge, VintemSlot, Vintem, VintemTestPage, home.mjs, phase4-home e phase3-home-components, medidor 150 por 125) ficaram intactas e fora dos commits. Nenhum outro agente commitou no intervalo: `commits: 3` e a medida do ledger.

## Known Stubs

Nenhum. `VintemEmpty` ainda nao esta montado em nenhuma tela por contrato: os planos 04-15, 04-17 e 04-20 o usam nos estados vazios e de erro.

## Threat Flags

Nenhum. Mitigacoes T-04-16-01 (texto do balao como filho React, sem HTML bruto, guarda estatica), T-04-16-02 (`visible` falso com `neutralOk` e `readOnly`) e T-04-16-03 (sem `speak(` nem regiao viva na linha) aplicadas e cobertas por `phase4-limits.test.js` e pela suite `limits`.

## Pendente (humano)

- Conferir num celular a linha do Vintem em "Limites do mes" nos tres tons e com a categoria estourada (bravo contra triste) e ouvir a previa nas Configuracoes. O banco de frases `central` ainda aguarda a revisao do dono.

## Self-Check: PASSED

- Arquivos presentes: `src/hooks/useInlineVintem.ts`, `src/components/vintem/VintemEmpty.tsx`, `scripts/ux-audit/vintem-app/limits.mjs`, `scripts/ux-audit/vintem-app/settings.mjs`, `test/static/phase4-limits.test.js`.
- Commits presentes em `main`: fbd95eb4, 992a7584, 088866c0.
