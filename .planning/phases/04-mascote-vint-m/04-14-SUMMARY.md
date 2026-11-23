---
phase: 04-mascote-vint-m
plan: 14
subsystem: ui
tags: [vintem, insights, baseline, localstorage-cache, bank-arrival, privacy, cdp, static-guard]
requires: ["04-03", "04-12"]
provides:
  - "baselineKey, readCachedBaseline, writeCachedBaseline, loadBaseline(person, cycle, categoryDefs?) em src/lib/vintemBaseline.ts"
  - "useVintemInsights({ person, cycle, view, transactions, categoryDefs, enabled }) devolvendo { insights, baseline, bankArrival, ready }"
  - "useHomeVintem com insights nos fatos de humor, encaixes da fala por insight e reacao a lancamento importado do banco"
  - "suite insights em scripts/ux-audit/vintem-app/insights.mjs"
  - "test/static/phase4-insights.test.js (7 testes)"
affects: [04-15, 04-16, 04-17, 04-18]
status: complete
commits: 3
plan_head_before: bfd374e4f2b7d7678d5d29cdea474cebc1dfacf3
actuals:
  tokens: 8000
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "Linha de base: uma consulta de intervalo por ciclo e aparelho, cache so de agregados por categoryId, leitura validada por versao e formato, consulta em andamento compartilhada por chave"
    - "Marco de chegada do banco por pessoa congelado em estado durante a carga e gravado so no localStorage, para a chegada de agora continuar visivel e a primeira visita nao reagir"
    - "Fala de entrada espera a linha de base (ready) para sair uma vez so com os insights completos"
key-files:
  created:
    - src/lib/vintemBaseline.ts
    - src/hooks/useVintemInsights.ts
    - scripts/ux-audit/vintem-app/insights.mjs
    - test/static/phase4-insights.test.js
  modified:
    - src/hooks/useHomeVintem.ts
key-decisions:
  - "A fala de entrada espera a linha de base carregar (flag ready): como ela sai uma vez por visita, falar antes perderia categoria-acima-media e gasto-grande por ticket"
  - "O marco vintem:seen:v1 fica congelado em estado durante a carga e so o localStorage avanca: a chegada de agora reage uma vez e o proximo carregamento ja a considera vista"
  - "A reacao de chegada do banco e observada na suite pela moeda do Vintem e pela regiao viva, pois data-vintem-state so mostra o humor de fundo"
requirements-completed: [MASC-02, MASC-04]
coverage:
  - id: D1
    description: "Quatro compras de iFood na semana viram a fala de delivery da Home com ordinal, contagem e total reais, sem IA"
    requirement: "MASC-04"
    verification:
      - kind: e2e
        ref: "scripts/ux-audit/vintem-app/insights.mjs (data-situation delivery-semana, frase ds-*, sem Pix nem 6 digitos)"
        status: pass
  - id: D2
    description: "Linha de base dos 3 ciclos anteriores em uma consulta, guardada so como agregados por categoryId e lida do cache"
    requirement: "MASC-04"
    verification:
      - kind: static
        ref: "test/static/phase4-insights.test.js (uma chamada, chave v1, valor de buildBaseline, leitura validada)"
        status: pass
      - kind: e2e
        ref: "scripts/ux-audit/vintem-app/insights.mjs (cache gravado, sem nome de loja nem descricao, sem 6 digitos na chave)"
        status: pass
  - id: D3
    description: "Lancamento importado (source bank) mais novo que o marco provoca uma reacao unica; primeira visita so registra o marco"
    requirement: "MASC-02"
    verification:
      - kind: e2e
        ref: "scripts/ux-audit/vintem-app/insights.mjs (primeira visita sem reacao, chegada nova com moeda e fala anunciada, revisita sem reacao)"
        status: pass
      - kind: static
        ref: "test/static/phase4-insights.test.js (source bank, vintem:seen:v1:, counted true, slot e somente leitura)"
        status: pass
---

# Phase 4 Plan 14: Insights reais na Home do Vintem Summary

**Detector local alimentado com as transacoes do ciclo e uma linha de base de 3 ciclos (uma consulta, cache de agregados), fala de delivery da semana na entrada da Home e reacao unica a lancamento importado do banco.**

## Accomplishments

- `src/lib/vintemBaseline.ts`: chave `vintem:baseline:v1:{pessoa}:{ciclo}:{diaSalario}`; `loadBaseline` le o cache validado (versao 1, `byCategory` com numeros) e, sem cache, faz UMA chamada a `getTransactionsInRange` do inicio do mais antigo dos 3 ciclos anteriores ao fim do anterior, reparte por ciclo e monta com `buildBaseline`. O valor guardado e so o que `buildBaseline` devolve. Consultas simultaneas da mesma chave compartilham a mesma promessa.
- `src/hooks/useVintemInsights.ts`: carrega a linha de base com descarte de resposta velha (falha vira nula sem barulho), calcula `insights` com `buildInsights` sobre as transacoes da Home e deriva `bankArrival` (saida `source === 'bank'` com `createdAt` maior que o marco `vintem:seen:v1:{pessoa}`, `bigSpend` por `isSpendSpike`).
- `useHomeVintem`: chama `useVintemInsights` por dentro (a pagina `DashboardPage.tsx` nao foi editada), passa os insights aos `MoodFacts` e preenche os encaixes (`delivery-semana`: ordinal, vezes, valor; `loja-repete`; `categoria-acima-media`; `gasto-grande`; `sem-lancar`). A chegada do banco chama `reactionForLaunch` com `counted: true`, `slot.react` e fala anunciada, uma vez por pessoa:ciclo.
- Suite `insights`: fala "Quarto pedido de comida na semana e R$ 187,50 ja foram..." com `data-situation="delivery-semana"`, cache so com ids e numeros, primeira visita sem reacao, chegada nova com moeda e regiao viva, revisita sem reacao.

## Verificacao

- `npm run build` e `npm run lint` verdes.
- `node scripts/ux-audit/vintem-app.mjs` (todas as suites) termina em `FALHAS 0`; `--only insights`: 16 verificacoes ok.
- `npm run test:static`: 404 testes, 0 falhas (1 pulado ja existente); `phase4-insights`: 7 testes.
- `npm run test:core:tz`: 650 testes verdes em UTC e em Asia/Tokyo.

## Task Commits

| Tarefa | Commit | Observacao |
|--------|--------|------------|
| 1 (tracer) | a5ab0913 | Linha de base, hook de insights, humor e fala de delivery, suite insights |
| 2 | 133dfd94 | Marco de chegada do banco, reacao unica e cenarios da suite |
| 3 | 6217b409 | Guarda estatica de privacidade, validacao da leitura e ausencia de Firestore nos hooks |

Tracer gate: o `<verify>` da Task 1 (build, lint e suite insights) passou de ponta a ponta antes da expansao.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reacao nao observavel por `data-vintem-state`**
- **Found during:** Task 2
- **Issue:** o plano manda a suite conferir a reacao pelo atributo `data-vintem-state` do slot, mas (plano 04-12) ele reflete so o humor de fundo (prop `state`); `handle.react` nao o altera. A conferencia nunca veria `surpreso` nem `bravo`.
- **Fix:** a suite grava, desde o inicio do documento, se a moeda da reacao de gasto (`g[id$="-coinR"]`) chegou a aparecer, e confere a fala anunciada na regiao viva e a volta ao repouso (moeda apagada) em ate 4 s. Nenhum arquivo fora do plano foi editado.
- **Files modified:** scripts/ux-audit/vintem-app/insights.mjs
- **Commit:** 133dfd94

**2. [Rule 2 - Critical] Fala de entrada esperando a linha de base**
- **Found during:** Task 1
- **Issue:** a fala de entrada sai uma vez por visita; sem esperar a linha de base ela sairia sem `categoria-acima-media` nem gasto grande por ticket, e nunca mais seria refeita.
- **Fix:** `useVintemInsights` devolve `ready` e `useHomeVintem` so fala de entrada com `ready` verdadeiro (verdadeiro tambem quando nao ha o que carregar; falha de carga tambem libera).
- **Commit:** a5ab0913

### Ajustes de assinatura (aditivos)

- `loadBaseline(person, cycle, categoryDefs = [])`: terceiro argumento opcional para `buildBaseline` resolver lancamento sem `categoryId` pelo nome, como `spendByCategory`.
- `UseHomeVintemArgs` perdeu o `insights?` reservado pelo plano 04-12 (agora vem de dentro) e passou a usar `transactions`.
- `BankArrival` ganhou `id` (lancamento importado) para a Home reagir uma vez por chave.

Fora isso, o plano foi executado como escrito.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. T-04-14-01 a T-04-14-04 mitigados: o filtro de `merchantOf` do nucleo roda antes de qualquer rotulo e a suite confere a fala sem "Pix" nem 6 digitos; o cache guarda so agregados por `categoryId` com leitura validada (cache adulterado vale como ausente); uma consulta de intervalo por ciclo e aparelho, depois cache, sem leitura nova por visita; a reacao so existe com o slot registrado e fora do modo somente leitura.

## Pendente (humano)

- Conferir num celular real a reacao a uma saida importada de verdade do banco (a suite usa um lancamento semeado com `source: 'bank'`).
- A calibragem de "gasto grande" e "categoria acima da media" com historico real do casal (`INSIGHT_RULES`) so aparece depois de alguns ciclos de dados.

## Notas do ambiente

Outro agente seguiu editando `src/components/vintem/VintemSlot.tsx`, `ArcGauge.tsx`, `VintemTestPage.tsx`, `home.mjs` e dois testes estaticos em paralelo; nenhum deles entrou nos commits deste plano (stage por arquivo).

## Self-Check: PASSED

- FOUND: src/lib/vintemBaseline.ts, src/hooks/useVintemInsights.ts, scripts/ux-audit/vintem-app/insights.mjs, test/static/phase4-insights.test.js
- FOUND commits: a5ab0913, 133dfd94, 6217b409
