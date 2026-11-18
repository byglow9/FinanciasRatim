---
phase: 03-limites-pode-gastar-e-central
plan: 13
subsystem: estado-e-dados-da-interface
tags: [LimitAlertsContext, avisos, limiares, rekey, guarda-estatica]
requires: [03-04, 03-07, 03-10]
provides:
  - LimitAlertsProvider e useLimitAlerts com { alerts, visible, unread, loaded, markRead, markAllRead, evaluate, rekeyForSalaryDay }
  - LimitAlertsProvider montado em App.tsx dentro de CycleProvider e ProtectedRoute
  - guarda estatica (h), (i) e (j) em test/static/phase3-data.test.js
affects: [03-15, 03-16, 03-17]
tech-stack:
  added: []
  patterns: ["avaliacao como funcao de modulo sem setState, estado so no .then (passa react-hooks/set-state-in-effect)", "ultimo now/config/categoryDefs lidos por ref atualizado em efeito, para o callback de avaliar nao mudar a cada minuto", "uma avaliacao por vez com rodada extra pedida por flag (nunca em paralelo)"]
key-files:
  created: [src/contexts/LimitAlertsContext.tsx]
  modified: [src/App.tsx, test/static/phase3-data.test.js]
decisions:
  - "evaluate e rekeyForSalaryDay so agem para a pessoa do claim; rekeyForSalaryDay com outra pessoa retorna sem gravar (PR-04, T-03-38)"
  - "Falha ao calcular o ciclo nao perde a lista de avisos ja lida: runEvaluation devolve os avisos lidos se o calculo ou a gravacao falham"
  - "Disparo por dataVersion e por montagem nao tem intervalo minimo; so a volta do foco respeita os 5 minutos"
  - "markRead e markAllRead sao otimistas e desfazem a marca local se o servico falhar"
status: complete
commits: 2
plan_head_before: 6d8fd52bae290c9f7dcd60810f94372290167498
actuals:
  tokens: 3300
  tasks: 2
  commits: 2
metrics:
  completed: 2026-11-18
requirements-completed: []
---

# Fase 3 Plano 13: Avisos de limite (avaliador e regravacao)

Provedor que avalia no cliente da pessoa logada os limiares de 80% e 100% do ciclo atual dela, grava cada aviso uma vez por limiar e ciclo (ID deterministico) e regrava os marcadores na troca do dia do salario, protegido por guarda estatica.

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Tracer: do ciclo atual ao aviso gravado | e162426e | LimitAlertsContext.tsx, App.tsx |
| 2 | Guarda estatica do avaliador de avisos | 41df9bf7 | phase3-data.test.js |

Gate do tracer cumprido (modo interativo, `<verify>` automatizado): `test:static`, `build` e `lint` verdes antes da Tarefa 2.

## Resultados dos portoes

- `npm run test:core:tz`: 234 passam, 0 falham, em UTC e em Asia/Tokyo.
- `npm run test:static`: 94 passam, 0 falham, 1 pulado pre-existente (3 testes novos; as assercoes (a) a (g) do Plano 10 seguem intactas).
- `npm run test:rules`: 12 passam, 0 falham.
- `npm run test:emu`: 58 passam, 0 falham.
- `npm --prefix server test`: 81 passam, 0 falham.
- `npm run build`: passa; aviso de chunk acima de 500 kB e pre-existente.
- `npm run lint`: 0 erros, 2 avisos `react-hooks/incompatible-library` pre-existentes.
- Nenhuma exclusao nos commits. `git diff --stat` do plano lista so os tres arquivos de `files_modified`.

## Mitigacoes

- T-03-37: uma leitura da lista por avaliacao (mais uma so se algum aviso foi criado), `limit(30)` do servico, sem `onSnapshot`; volta do foco com no minimo 5 minutos; a guarda falha se `onSnapshot` ou `httpsCallable` aparecer.
- T-03-38: a pessoa vem so de `user.person` (claim); `viewPerson` nao aparece no arquivo (guarda); `rekeyForSalaryDay` ignora pessoa diferente da logada.
- T-03-90: todos os `catch` engolem sem registrar; o arquivo nao tem `console`; a guarda falha se `console.` receber `spent`, `limit`, `amount` ou `cents`.

## Requisitos

Nenhum requisito marcado como concluido. LIM-07 so se cumpre com o sino (Plano 15) e o aviso da Home (Plano 16); LIM-08 com a Home; LIM-10 com a tela de ciclo e renda que chama `rekeyForSalaryDay` (Plano 17). Este plano entrega a camada de estado que essas telas consomem.

## Pendente herdado do 03-11

O estado "Habilitado" do indice `limitAlerts` ainda nao foi confirmado no Console. Enquanto estiver "Criando", `getLimitAlerts` falha com `failed-precondition`; o provider engole o erro e a lista fica vazia, sem derrubar a Home, e a proxima avaliacao tenta de novo. Conferir antes do UAT.

## Deviations from Plan

Nenhum desvio de regra. Escolhas de implementacao dentro do plano:

- A avaliacao vive numa funcao de modulo (`runEvaluation`) sem `setState`; o estado so muda no `.then`, no mesmo formato de `useCycleBudget`, para passar `react-hooks/set-state-in-effect`.
- O `now` usado e o de `useCycle()` (renova a cada minuto). Se a aba ficar em segundo plano por horas e cruzar a virada de ciclo, a avaliacao feita ao voltar o foco usa o instante do ultimo tick; o proximo tick corrige. Aceito.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. Sem endpoint, rede nova nem superficie nova alem das leituras e gravacoes ja previstas em `limitAlerts` (regras publicadas no 03-11).

## Verificacao nao feita

Sem jsdom nem navegador (PR-16): disparo ao voltar o foco, intervalo de 5 minutos e gravacao real no Firestore ficam para o UAT humano (e dependem do indice `limitAlerts` Habilitado).

## Self-Check: PASSED

- src/contexts/LimitAlertsContext.tsx, src/App.tsx e test/static/phase3-data.test.js existem.
- Commits e162426e e 41df9bf7 existem; contagem medida `rev-list 6d8fd52b..HEAD` = 2.
