---
phase: 03-limites-pode-gastar-e-central
plan: 06
subsystem: nucleo-puro
tags: [pode-gastar, ritmo, projecao, gasto-por-categoria, centavos, composicao]
requires: [03-03]
provides:
  - isDayToDay, spendByCategory, sortByUrgency, incomeForCycle, billsForCycle em shared/core/budget.js
  - safeToSpend, perDayCents, restPct, RHYTHM_CUTS, rhythm em shared/core/budget.js
  - projectCycle, monthInOne, previewLaunch e buildBudgetView em shared/core/budget.js
affects: [03-07, 03-10, 03-11, 03-12, 03-13, 03-14, 03-16]
tech-stack:
  added: []
  patterns: ["composicao unica buildBudgetView como fonte do numero", "ritmo por multiplicacao cruzada de inteiros", "preview do lancamento le a view pronta"]
key-files:
  created: [shared/core/budget.js, shared/core/budget.test.js]
  modified: []
decisions:
  - "BudgetRow.pct nao satura em 100 (45000 de 40000 da 112), como pede o plano; limitState continua saturando em 100 e so os demais campos de estado vem dele"
  - "buildBudgetView filtra os lancamentos pela janela do ciclo (start a end) antes de somar, como defesa contra consulta mais larga que o ciclo"
  - "buildBudgetView normaliza a config com normalizePersonConfig; dado nulo ou ruim vira renda 0 sem quebrar"
  - "Conta com vencimento fora de 1 a 31 e ignorada em billsForCycle em vez de lancar erro (a Home nao pode cair por dado ruim)"
  - "Ids de categoria como 'constructor' nao herdam limite do prototipo (leitura por propriedade propria)"
requirements-completed: []
status: complete
commits: 3
plan_head_before: da1fe4a18cfcd42410cfcfb911e6b4f8e5b1d587
actuals:
  tokens: 11000
  tasks: 3
  commits: 3
metrics:
  completed: 2026-11-18
---

# Fase 3 Plano 06: Pode gastar, ritmo e composicao do ciclo

O numero central do app em funcoes puras de `shared/core/budget.js`: gasto por categoria com Gasto geral, renda esperada contra recebida, contas do ciclo por ocorrencia, Pode gastar, por dia, ritmo em 5 niveis, projecao, "O mes em uma conta" e o preview do lancamento, tudo numa unica `buildBudgetView` identica em UTC e Asia/Tokyo.

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Tracer: do lancamento ao Pode gastar | ffc05a29 | budget.js, budget.test.js |
| 2 | Ritmo em 5 niveis e supressao do veredito | 22bfb67c | budget.js, budget.test.js |
| 3 | Projecao, monthInOne e previewLaunch | 14b6f68e | budget.js, budget.test.js |

O gate do tracer foi cumprido: `test:core:tz` (214 testes) e `test:static` verdes antes de expandir.

## Resultados dos portoes

- `npm run test:core:tz`: 234 passam, 0 falham, em UTC e em Asia/Tokyo (45 testes novos em `budget.test.js`).
- `npm run test:static`: 59 passam, 0 falham, 1 pulado pre-existente (guarda `fixed-expense-manual` verde).
- `npm run build`: passa (tsc confere `budget.js`); aviso de chunk acima de 500 kB e pre-existente.
- `npm run lint`: 0 erros, 2 avisos `react-hooks/incompatible-library` pre-existentes.
- `git diff HEAD -- shared/core/ledger.js classify.js time.js`: sem diferenca.

## Decisoes e conferencias

- Fronteiras do ritmo conferidas em teste: com orcamento 200000, 30 dias e 15 decorridos, gasto 75000 e 0, 75001 e 1, 100000 e 1, 100001 e 2, 115000 e 2, 115001 e 3, 200000 e 3 e 200001 e 4. No teto (99.999.999, 31 dias) a fronteira de 115% cai exatamente entre 27 e 26 dias decorridos.
- PR-01, PR-02, PR-05, PR-06, PR-07, PR-14 e PR-19 implementadas como descritas em 03-01-PREMISES.md (accept-all), documentadas no cabecalho de `budget.js`.
- T-03-17 mitigado (centavos inteiros, multiplicacao cruzada, dois fusos). T-03-18 mitigado (`suppressVerdict` zera `rhythmLevel` sem mexer em `safeCents` e `perDayCents`). T-03-20 mitigado (sem console nem rede). T-03-19 aceito (PR-02, sem casamento de fixa paga pelo banco).
- Guarda REV-03 respeitada: nenhum identificador nem texto de codigo cita contas fixas pelo nome; o modulo usa bill, bills e fixedCents.
- Nenhuma quebra planejada de teste existente neste plano (arquivos novos; `purity.test.js` descobriu `budget.js` sozinho e aprovou).

## Requisitos

Nenhum requisito marcado como concluido. LIM-02, LIM-03, LIM-04, LIM-05, LIM-06 e CENT-06 sao requisitos de interface (Home, Central, resumo de Contas Fixas, renda informada pelo usuario); este plano entrega so o calculo que as telas dos planos 10 a 16 vao consumir.

## Deviations from Plan

### Auto-resolvido

**1. [Rule 1 - Contradicao entre planos] `BudgetRow.pct` acima de 100**
- **Found during:** Tarefa 1
- **Issue:** o plano pede "state over, pct 112" para 45000 de 40000 e diz que os campos de estado vem de `limitState`, mas `limitState` (plano 03, coberto por `limits.test.js`) satura `pct` em 100.
- **Fix:** em `spendByCategory`, `state`, `remainingCents` e `excessCents` vem de `limitState`; `pct` e recalculado em inteiros sem saturar (`floor(gasto * 100 / limite)`), o que tambem desempata melhor a ordenacao entre linhas "passou". `limitState` ficou intocado.
- **Para os consumidores:** barras de progresso (plano 12) devem limitar o preenchimento a 100; o texto de linha "passou" usa `excessCents`.
- **Files modified:** shared/core/budget.js
- **Commit:** ffc05a29

Fora isso, plano executado como escrito.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. O modulo nao abre superficie nova: sem rede, sem console, sem dado pessoal; recebe e devolve estruturas puras.

## Self-Check: PASSED

- Arquivos existem: shared/core/budget.js e shared/core/budget.test.js.
- Commits ffc05a29, 22bfb67c e 14b6f68e existem; contagem medida `rev-list da1fe4a1..HEAD` = 3.
