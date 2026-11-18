---
phase: 03-limites-pode-gastar-e-central
plan: 03
subsystem: nucleo-puro
tags: [ciclo, limites, fuso, centavos, pureza]
requires: [03-01]
provides:
  - cycleOf, shiftCycle, cycleDay, daysLeftInCycle, isCycleOver, cycleMonths em shared/core/cycle.js
  - billOccurrences, nextOccurrence, daysBetweenParts em shared/core/cycle.js
  - limitForCycle, setLimit, limitsForCycle, limitState, normalizePersonConfig, setSalaryDay, setExpectedIncome, setCategoryLimit em shared/core/limits.js
  - purity.test.js com descoberta automatica dos modulos do nucleo
affects: [03-04, 03-06, 03-10, 03-13, 03-17, 03-19]
tech-stack:
  added: []
  patterns: ["nucleo puro em shared/core com // @ts-check e JSDoc completo", "ciclo por zonedParts/zonedTimeToInstant, days por Date.UTC de datas de calendario", "limite em centavos inteiros sem ponto flutuante"]
key-files:
  created: [shared/core/cycle.js, shared/core/cycle.test.js, shared/core/limits.js, shared/core/limits.test.js]
  modified: [shared/core/purity.test.js]
decisions:
  - "daysBetweenParts nasceu na Tarefa 1 (cycleOf e cycleDay dependem dela) e so ganhou testes proprios na Tarefa 2"
  - "normalizePersonConfig trata renda e limite acima do teto como dado ruim (renda vira 0, entrada de limite e descartada)"
  - "Chaves __proto__, constructor e prototype sao ignoradas em limits e incomeOverrides, e setCategoryLimit recusa esses ids"
  - "pct de limitState satura em 100 quando over"
requirements-completed: []
status: complete
commits: 3
plan_head_before: 727f5206600bec4acd9ce8c8e286e49b78e85b93
actuals:
  tokens: 17000
  tasks: 3
  commits: 3
metrics:
  completed: 2026-11-18
---

# Fase 3 Plano 03: Nucleo de ciclo e limites

Ciclo do salario em America/Sao_Paulo (com dia 31, fevereiro, virada de ano e horario de verao antigo), ocorrencias de vencimento dentro do ciclo, historico e estado de limite por categoria em centavos inteiros, e helpers imutaveis da configuracao por pessoa, tudo em `shared/core` sem React nem Firebase.

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Tracer: ciclo do salario em Sao Paulo e guarda de pureza automatica | 75db0857 | cycle.js, cycle.test.js, purity.test.js |
| 2 | Ocorrencias de vencimento no ciclo | 9f2d61d3 | cycle.js, cycle.test.js |
| 3 | Historico e estado dos limites e helpers da configuracao | 315af322 | limits.js, limits.test.js |

O gate do tracer foi cumprido: `test:core:tz` verde nos dois fusos antes de expandir.

## Resultados dos portoes

- `npm run test:core:tz`: 128 passam, 0 falham, em UTC e em Asia/Tokyo.
- `npm run test:static`: 59 passam, 0 falham, 1 pulado pre-existente (guarda `fixed-expense-manual` verde).
- `npm run build`: passa (tsc confere cycle.js e limits.js); aviso de chunk acima de 500 kB e pre-existente.
- `npm run lint`: 0 erros, 2 avisos `react-hooks/incompatible-library` pre-existentes (aceitos em 03-02).
- `git diff HEAD -- shared/core/time.js ledger.js classify.js`: sem diferenca.

## Decisoes e conferencias

- A guarda de pureza agora lista a pasta com `readdirSync` e exclui `*.test.js`; `CLOCK_FREE` e `ALL` menos `classify.js`. Um teste de sanidade confirma que os seis modulos conhecidos sao descobertos. Modulos dos proximos planos ficam cobertos sem editar lista. Foi a unica quebra planejada (Pitfall 3) e ficou na mesma tarefa que a causa.
- PR-09 (limite editado vale ja neste ciclo, passados mantem o da epoca) e PR-10 (dia do salario e renda por pessoa) implementadas como funcoes puras; a persistencia e a tela ficam para os planos 17 e 19.
- Requisitos NAO marcados como concluidos: LIM-10, LIM-01, LIM-02, LIM-06 e CENT-06 exigem interface (Configuracoes, Home, resumo de Contas Fixas) e integracao com dados, que vem em planos posteriores. Este plano entrega so a base de calculo.

## Deviations from Plan

None - plan executed exactly as written. (Detalhe de ordem: `daysBetweenParts`, listada na Tarefa 2, foi criada e exportada na Tarefa 1 porque `cycleOf` e `cycleDay` a usam; os testes dela entraram na Tarefa 2.)

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. T-03-05 e T-03-06 mitigados (normalizacao defensiva com testes de entrada nula, tipo errado, fora de faixa e chaves perigosas; validacao com teto de 8 digitos). T-03-07 mitigado (so inteiros; teste com valor maximo). T-03-08 aceito (nucleo sem `console`).

## Self-Check: PASSED

- Arquivos existem: shared/core/cycle.js, cycle.test.js, limits.js, limits.test.js, purity.test.js.
- Commits 75db0857, 9f2d61d3 e 315af322 existem; contagem medida `rev-list 727f5206..HEAD` = 3.
