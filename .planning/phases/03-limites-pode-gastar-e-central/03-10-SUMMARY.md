---
phase: 03-limites-pode-gastar-e-central
plan: 10
subsystem: estado-e-dados-da-interface
tags: [AreaContext, CycleContext, useCycleBudget, somente-leitura, tema-claro, guarda-estatica]
requires: [03-03, 03-04, 03-05, 03-06, 03-09]
provides:
  - AreaContext com readOnly, lastPerson, personConfigFor, updatePersonConfig e updateNotifications; tema claro forcado (PR-18)
  - CycleProvider e useCycle com now, offset, shift, viewPerson, cycleFor, dataVersion e bumpData
  - loadCycleInputs, toBills e toBillPayments em src/lib/cycleData.ts
  - useCycleBudget(person, opts) devolvendo { view, cycle, loading, error, refetch }
  - useBankFreshness() devolvendo { items, suppress, hasConnections, loading }
  - useReadOnly() devolvendo { readOnly, partnerName, guard }
  - ToastProvider e CycleProvider montados em App.tsx
  - test/static/phase3-data.test.js (guarda de ligacoes de dados)
affects: [03-11, 03-12, 03-13, 03-14, 03-15, 03-16, 03-17, 03-18, 03-19, 03-20, 03-21, 03-22]
tech-stack:
  added: []
  patterns: ["ciclo estavel por chave (setState no render) para o minuto de useNow nao refazer a consulta", "fetch por .then para passar react-hooks/set-state-in-effect", "view nula enquanto a chave pessoa:ciclo:dia das entradas difere da atual"]
key-files:
  created: [src/contexts/CycleContext.tsx, src/lib/cycleData.ts, src/hooks/useBankFreshness.ts, src/hooks/useCycleBudget.ts, src/hooks/useReadOnly.ts, test/static/phase3-data.test.js]
  modified: [src/contexts/AreaContext.tsx, src/App.tsx]
decisions:
  - "personConfigFor devolve a configuracao normalizada uma vez por mudanca de settings.personConfig (referencia estavel), para os hooks nao refazerem consulta a cada render"
  - "O ciclo dentro de useCycleBudget e guardado por estado e so troca quando muda a chave ou o dia do salario; o relogio de 60s nao dispara nova consulta"
  - "Durante um refetch do mesmo ciclo a view anterior segue na tela (mesma pessoa e mesmo ciclo); trocar pessoa, ciclo ou dia do salario zera a view ate chegar a consulta nova"
  - "useReadOnly depende so de AreaContext e do toast, nao do CycleProvider"
  - "partnerName e o nome do perfil visto (area1 para ele, area2 para ela)"
requirements-completed: []
status: complete
commits: 2
plan_head_before: 1d38f33c625ff7d50dd2b2694fb21f82a0187ec1
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
metrics:
  completed: 2026-11-18
---

# Fase 3 Plano 10: Estado e dados da interface (primeira metade)

Perfil e ciclo vistos, configuracao por pessoa, somente leitura derivado, `BudgetView` por hook e frescor do banco, com a conta toda no nucleo e uma guarda estatica que impede formula de orcamento fora dele.

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Tracer: do perfil e do ciclo a BudgetView | 8a87355c | AreaContext.tsx, CycleContext.tsx, cycleData.ts, useBankFreshness.ts, useCycleBudget.ts |
| 2 | useReadOnly, providers no App.tsx e guarda estatica | cf2ff30d | useReadOnly.ts, App.tsx, phase3-data.test.js |

O gate do tracer foi cumprido (modo interativo, `<verify>` automatizado): `test:static`, `build` e `lint` verdes antes de expandir.

## Resultados dos portoes

- `npm run test:core:tz`: 234 passam, 0 falham, em UTC e em Asia/Tokyo.
- `npm run test:static`: 84 passam, 0 falham, 1 pulado pre-existente (7 testes novos em `phase3-data.test.js`; `category-ids` verde).
- `npm run test:emu`: 58 passam, 0 falham.
- `npm --prefix server test`: 81 passam, 0 falham.
- `npm run build`: passa; aviso de chunk acima de 500 kB e pre-existente.
- `npm run lint`: 0 erros, 2 avisos `react-hooks/incompatible-library` pre-existentes.

## Mitigacoes

- T-03-34: toda consulta passa pelos servicos com `ownerScope()`; a view so existe quando a chave `pessoa:ciclo:dia` das entradas carregadas e a atual; `CycleProvider` fica dentro do `ProtectedRoute` (guarda estatica confere abertura e fechamento).
- T-03-35: os arquivos novos so registram mensagens fixas (`console.error('Error updating ...')` no AreaContext, sem valores); a guarda falha se `console.` receber `spent`, `limit`, `amount` ou `cents`.
- T-03-36 (aceito): somente leitura e so de interface; aplicacao nas regras e Fase 8.

## Requisitos

Nenhum requisito foi marcado como concluido: LIM-04, LIM-06, LIM-08, LIM-10 e CENT-06 sao resultados visiveis (Home, Configuracoes, resumo de Contas Fixas) que dependem das telas dos planos 12 a 22. Este plano entrega so a camada de estado que elas consomem. IDEN-07 ja consta como completo no REQUIREMENTS.md.

## Deviations from Plan

Nenhum desvio de regra. Duas escolhas de implementacao dentro do plano:

- O fetch de `useCycleBudget` usa `.then` em vez de `async/await` porque o `react-hooks/set-state-in-effect` acusava erro no formato async (padrao de `useTransactions.ts` nao passou a regra nesta forma).
- `setCurrentArea` virou `useCallback` sobre um estado interno `setAreaState` (involucro pedido pelo plano para manter `lastPerson`).

## Known Stubs

Nenhum.

## Threat Flags

Nenhum.

## Self-Check: PASSED

- src/contexts/CycleContext.tsx, src/lib/cycleData.ts, src/hooks/useBankFreshness.ts, src/hooks/useCycleBudget.ts, src/hooks/useReadOnly.ts e test/static/phase3-data.test.js existem.
- Commits 8a87355c e cf2ff30d existem no historico.
