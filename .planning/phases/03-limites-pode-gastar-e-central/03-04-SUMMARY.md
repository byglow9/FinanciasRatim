---
phase: 03-limites-pode-gastar-e-central
plan: 04
subsystem: nucleo-puro
tags: [alertas, limiares, formatacao, categorias, centavos, pureza]
requires: [03-01]
provides:
  - THRESHOLDS, alertId, thresholdsToFire, rekeyAlerts, visibleAlerts, topAlert, unreadCount em shared/core/alerts.js
  - shouldSuppressVerdict em shared/core/bankStatus.js
  - CATEGORY_ICONS, setCategoryMeta, categoryIcon, categoryKind e addCategory com extra opcional em shared/core/categories.js
  - formatMoney, formatMoneyParts, displayTier, applyKeypad, perDayReais, shortDate, shortRange, cycleLabel, dayMonth, plural, MONTH_SHORT, MONTH_LONG em shared/core/format.js
affects: [03-05, 03-06, 03-07, 03-09, 03-10, 03-13, 03-14]
tech-stack:
  added: []
  patterns: ["ID de alerta deterministico como chave de idempotencia", "comparacao de limiar em inteiros (gasto*100 >= limite*80)", "texto de dinheiro montado a mao com Intl so para o milhar"]
key-files:
  created: [shared/core/alerts.js, shared/core/alerts.test.js, shared/core/format.js, shared/core/format.test.js]
  modified: [shared/core/bankStatus.js, shared/core/bankStatus.test.js, shared/core/categories.js, shared/core/categories.test.js]
decisions:
  - "Ao reativar categoria arquivada com addCategory, icon e kind enviados em extra sao aplicados (a cor continua ignorada, como antes), para a escolha do usuario nao sumir em silencio"
  - "categoryIcon e categoryKind ignoram valor gravado invalido (icone fora da lista ou tipo desconhecido) e caem no padrao do id"
  - "applyKeypad devolve o valor anterior sem alteracao para tecla invalida ou resultado acima do teto"
requirements-completed: []
status: complete
commits: 3
plan_head_before: 485938162e345811d48caee42d6d80f7bbf8ed10
actuals:
  tokens: 16000
  tasks: 3
  commits: 3
metrics:
  completed: 2026-11-18
---

# Fase 3 Plano 04: Alertas, supressao do veredito, categorias e formatacao

Segunda metade do nucleo puro: alertas de 80% e 100% idempotentes por ID, supressao do veredito com dado do banco velho, icone e tipo nas categorias e formatacao unica de dinheiro, teclado e rotulos de data e ciclo, tudo em `shared/core` sem relogio nem pacote.

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Tracer: das linhas de limite ao rascunho de alerta idempotente | c759a50d | alerts.js, alerts.test.js |
| 2 | Supressao do veredito e categorias com icone e tipo | 6c568fa1 | bankStatus.js, bankStatus.test.js, categories.js, categories.test.js |
| 3 | Formatacao de dinheiro, teclado, tamanho do numero grande e rotulos | 92b5c8b2 | format.js, format.test.js |

O gate do tracer foi cumprido: `test:core:tz` verde nos dois fusos (152 testes) antes de expandir.

## Resultados dos portoes

- `npm run test:core:tz`: 187 passam, 0 falham, em UTC e em Asia/Tokyo.
- `npm run test:static`: 59 passam, 0 falham, 1 pulado pre-existente (`category-ids` e `fixed-expense-manual` intactos).
- `npm run build`: passa (tsc confere alerts.js, format.js, bankStatus.js e categories.js); aviso de chunk acima de 500 kB e pre-existente.
- `npm run lint`: 0 erros, 2 avisos `react-hooks/incompatible-library` pre-existentes.
- `git diff HEAD -- shared/core/time.js ledger.js classify.js`: sem diferenca.
- `purity.test.js` descobriu `alerts.js` e `format.js` sozinho (sem editar lista) e aprovou os dois.

## Decisoes e conferencias

- PR-04, PR-08 e PR-13 implementadas no nucleo: `thresholdsToFire` nao olha dado velho (quem avalia e decidido no plano 13), `rekeyAlerts` regrava marcadores silenciosos na troca do dia do salario e `THRESHOLDS` e constante sem interruptor.
- T-03-10: teste garante que o rascunho so tem `id, person, cycleKey, categoryId, threshold, silent, spentCents, limitCents` (nenhum campo de nome ou descricao).
- T-03-11: icone validado contra `CATEGORY_ICONS` ('Icone invalido') e tipo contra gasto e receita ('Tipo invalido') em `addCategory` e `setCategoryMeta`; `requireName` segue valendo.
- T-03-12: teclado ignora resultado acima de 99.999.999; so inteiros; testado no teto.
- Os 11 padroes mantem `id` e `name`; os testes antigos de categories e `category-ids` passaram sem alteracao (nenhuma quebra planejada precisou de ajuste neste plano; `src/types` e do plano 05).
- Requisitos NAO marcados como concluidos: LIM-07, LIM-08, CENT-05, LIM-04 e LIM-02 dependem de persistencia, avaliacao no servico e interface (planos 05 a 14). Este plano entrega so a base de calculo e formatacao.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. T-03-09 e T-03-SC aceitos conforme o plano; nenhum pacote instalado.

## Self-Check: PASSED

- Arquivos existem: shared/core/alerts.js, alerts.test.js, format.js, format.test.js, bankStatus.js, categories.js e os testes.
- Commits c759a50d, 6c568fa1 e 92b5c8b2 existem; contagem medida `rev-list 48593816..HEAD` = 3.
