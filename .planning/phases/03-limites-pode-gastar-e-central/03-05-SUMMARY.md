---
phase: 03-limites-pode-gastar-e-central
plan: 05
subsystem: camada-de-dados
tags: [tipos, settings, personConfig, firestore, regras, consulta-por-intervalo]
requires: [03-01]
provides:
  - LimitEntry, PersonConfig, LimitAlert e campos opcionais em Settings, CategoryDef e Transaction (src/types/index.ts)
  - updatePersonConfig(person, config) em settings.service.ts
  - getTransactionsInRange(person, start, end) em transactions.service.ts
  - getPaymentsForMonths(pairs) em fixedExpenses.service.ts
  - caso A3 na matriz de regras (test/rules/matrix.test.js)
affects: [03-07, 03-09, 03-10, 03-13, 03-14, 03-17, 03-19]
tech-stack:
  added: []
  patterns: ["update com caminho pontilhado ate o nivel da pessoa", "janela do ciclo recebida por argumento (nada de date-fns na consulta)"]
key-files:
  created: []
  modified: [src/types/index.ts, src/services/settings.service.ts, src/services/transactions.service.ts, src/services/fixedExpenses.service.ts, test/rules/matrix.test.js]
decisions:
  - "A3 confirmada no emulador: o primeiro updateDoc com personConfig.ele cria o mapa pai e gravar personConfig.ela depois nao apaga o no de ele; nao foi preciso o plano B (setDoc com merge)"
  - "getPaymentsForMonths deduplica pares por ano e mes antes de consultar"
requirements-completed: []
status: complete
commits: 2
plan_head_before: dc6fde1b1d777cff8d425f3ee44af3b5d013e191
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
metrics:
  completed: 2026-11-18
---

# Fase 3 Plano 05: Camada de dados da configuracao por pessoa e do ciclo

Tipos, gravacao do no da pessoa em `settings/main` e as duas consultas que o ciclo exige (lancamentos por intervalo e pagamentos de ate dois meses), sem regra nem indice novo.

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Tracer: tipos e updatePersonConfig provados no emulador (A3) | 5904f741 | types/index.ts, settings.service.ts, matrix.test.js |
| 2 | getTransactionsInRange e getPaymentsForMonths | 41f6dfe9 | transactions.service.ts, fixedExpenses.service.ts |

O gate do tracer foi cumprido: `test:rules`, `test:static` e `build` verdes antes de expandir.

## Resultados dos portoes

- `npm run test:core:tz`: 187 passam, 0 falham, em UTC e em Asia/Tokyo.
- `npm run test:static`: 59 passam, 0 falham, 1 pulado pre-existente (owner-queries, category-ids e fixed-expense-manual intactos).
- `npm run test:rules` (emulador): 11 passam, 0 falham, incluindo o caso novo de personConfig (A3).
- `npm run build`: passa; aviso de chunk acima de 500 kB e pre-existente.
- `npm run lint`: 0 erros, 2 avisos `react-hooks/incompatible-library` pre-existentes.
- `git diff HEAD -- firestore.rules firestore.indexes.json`: vazio. Nada publicado em producao.

## Mitigacoes

- T-03-13: `getTransactionsInRange` comeca com `...ownerScope()`; a guarda `owner-queries` passou.
- T-03-14 e T-03-15: `updateDoc` nao menciona ownerId e grava so `personConfig.<pessoa>`; teste prova que o no do parceiro sobrevive e que outro casal (HID_B) nao grava.
- T-03-16: nenhum `console.*` nos tres servicos.

## Requisitos

Nenhum requisito marcado como concluido. LIM-01, LIM-03, LIM-06, LIM-10 e CENT-06 dependem do calculo no hook de ciclo e das telas (planos 07 a 19); este plano entrega so a camada de dados que eles consomem.

## Deviations from Plan

None - plan executed exactly as written. (A hipotese A3 se confirmou; o plano B nao foi acionado.)

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. T-03-SC aceito: nenhum pacote instalado.

## Self-Check: PASSED

- Arquivos modificados existem; `grep` encontra `updatePersonConfig`, `getTransactionsInRange`, `getPaymentsForMonths`, `interface PersonConfig`.
- Commits 5904f741 e 41f6dfe9 existem; contagem medida `rev-list dc6fde1b..HEAD` = 2.
