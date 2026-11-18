---
phase: 03-limites-pode-gastar-e-central
plan: 20
subsystem: home-secoes
tags: [HomeSections, MonthInOneCard, LimitsList, CentralSummaryCard, FixedMonthCard, marcar-pago, guarda-estatica]
requires: [03-09, 03-10, 03-12, 03-16]
provides:
  - HomeSections({ view, cycle, loading, refetch }) com as quatro seções da Home sobre a BudgetView
  - Marcar pago manual (guard editar, markAsPaid, refetch, bumpData e toast), sem criar lançamento
  - Estado de carregamento com blocos bg-card anim-pulse aria-hidden, sem número
  - test/static/phase3-home-sections.test.js (6 asserções)
affects: [03-22, 03-23]
tech-stack:
  added: []
  patterns: ["seções só exibem fatias da BudgetView, sem fórmula de orçamento", "erro de gravação vira toast fixo em português, sem console nem valor", "view nula com loading mostra blocos neutros; sem loading não renderiza (erro é da página)"]
key-files:
  created: [src/components/dashboard/HomeSections.tsx, test/static/phase3-home-sections.test.js]
  modified: []
decisions:
  - "A atualização depois de Marcar pago espera refetch() antes de bumpData() e do toast, para a view já refletir o pagamento quando o aviso aparecer"
  - "Falha ao marcar pago mostra 'Não foi possível marcar como pago. Tente de novo.' (texto fixo, sem valor nem console)"
  - "Os quatro blocos de carregamento têm alturas fixas (176, 288, 80 e 144 px) próximas às das seções; sem número nem R$"
requirements-completed: []
status: complete
commits: 2
plan_head_before: 7db754f320483b03793e4d2710fcd9dd333f4143
actuals:
  tokens: 5500
  tasks: 2
  commits: 2
metrics:
  completed: 2026-11-18
---

# Fase 3 Plano 20: Seções da Home sobre a BudgetView

As quatro seções da Home (O mês em uma conta, Limites do mês com Gasto geral, resumo da Central e Contas fixas do mês) extraídas num componente próprio, com o "Marcar pago" manual e o estado de carregamento, protegidas por guarda estática. A página Home (Plano 22) ainda precisa montá-lo.

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Tracer: da BudgetView às quatro seções e ao Marcar pago | 3e10b90e | HomeSections.tsx |
| 2 | Estado de carregamento e guarda estática das seções | 7e7e48ca | HomeSections.tsx, phase3-home-sections.test.js |

O gate do tracer foi cumprido (modo interativo, `<verify>` automatizado): `test:static`, `build` e `lint` verdes antes de expandir.

## Resultados dos portões

- `npm run test:core:tz`: 234 passam, 0 falham.
- `npm run test:static`: 150 passam, 0 falham, 1 pulado pré-existente (6 testes novos em `phase3-home-sections.test.js`; `fixed-expense-manual` segue verde, sem edição).
- `npm run test:rules`: 12 passam, 0 falham.
- `npm run test:emu`: 58 passam, 0 falham.
- `npm --prefix server test`: 81 passam, 0 falham.
- `npm run build`: passa; aviso de chunk acima de 500 kB é pré-existente.
- `npm run lint`: 0 erros, 2 avisos `react-hooks/incompatible-library` pré-existentes.
- Nenhuma exclusão nos commits. `markAsPaid`, `useFixedExpenses.ts` e `fixedExpenses.service.ts` intactos. Nenhum teste existente quebra de propósito neste plano (só arquivos novos).

## Mitigações

- T-03-77: o componente só chama `markAsPaid` (grava em `fixedExpensePayments`); a guarda confere a ausência de serviço de lançamento e a ordem guarda, gravação, atualização; o toast diz que o Pode gastar não muda.
- T-03-78: nomes de conta e categoria só como texto React; a guarda falha se o atributo de HTML bruto aparecer.
- T-03-79: nenhum `console.*`; mensagens de erro fixas; a guarda varre o arquivo.
- T-03-80: aceito; `guard('editar')` bloqueia só na interface (Fase 8 aplica em regras).
- T-03-94: view nula mostra blocos neutros e nunca "R$ 0"; a guarda confere `anim-pulse` e a ausência de `formatMoney` e "R$" no bloco de carregamento.

## Requisitos

Nenhum marcado como concluído. O componente existe e está guardado, mas nada o monta ainda (`HomeSections` só aparece no próprio arquivo): LIM-02, LIM-03, LIM-05, LIM-06, CENT-01 e CENT-06 só se cumprem quando a Home (Plano 22) o montar, e CENT-01/LIM-02/LIM-03 também dependem da Central (Plano 21). IDEN-07 já constava como concluído.

## Deviations from Plan

Nenhum. Plano executado como escrito.

## Known Stubs

Nenhum.

## Self-Check: PASSED

- `src/components/dashboard/HomeSections.tsx`: existe.
- `test/static/phase3-home-sections.test.js`: existe.
- Commits 3e10b90e e 7e7e48ca: existem.
