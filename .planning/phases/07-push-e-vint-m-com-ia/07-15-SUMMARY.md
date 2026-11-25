---
phase: 07-push-e-vint-m-com-ia
plan: 15
subsystem: push-servidor
tags: [push, fatura, espontaneo, relogio, silencio, pos-sincronizacao, poda, emulador]
requires:
  - phase: 07
    provides: "billEvents, spontaneousEvent e pushPrefs do nucleo (07-03), banco de frases de push (07-04), preferencias e inscricoes (07-08), createRepo, createNotifier e createPushFeature (07-10)"
provides:
  - "server/src/push/config.js: readPushConfig com todas as variaveis PUSH_* e padroes"
  - "createNotifier com evaluateBills e evaluateSpontaneous; repo com readCards, readCardSettings, joinBillCards, listRegistrations, deleteRegistration e readConnectionOwner"
  - "server/src/push/tick.js: createTick com runOnce (espontaneo, fatura, retidos e poda)"
  - "server/src/push/after-sync.js: withAfterSync, gancho pos-sincronizacao sem tocar em sync.js"
  - "createPushFeature expoe tick, afterSync, ownerOfItem e start"
affects: [07-19]
tech-stack:
  added: []
  patterns:
    - "gancho por fora: a funcao original devolve o mesmo valor ou erro, o gancho roda sem ser esperado"
    - "relogio com rodada unica por vez, erro isolado por passo e sem leitura de lancamentos"
    - "horario do espontaneo derivado de hashSeed do id do evento (pessoa e dia)"
key-files:
  created:
    - server/src/push/config.js
    - server/src/push/tick.js
    - server/src/push/after-sync.js
    - server/test/push-tick.test.js
    - server/test/emu/push-tick.test.js
  modified:
    - server/src/push/notifier.js
    - server/src/push/repo.js
    - server/src/push/limits-router.js
    - server/src/push/index.js
    - server/src/index.js
    - server/test/notifier.test.js
key-decisions:
  - "O gancho tambem dispara quando so entraram compras de cartao (cardTxs.created), que nao contam em imported"
  - "withAfterSync recebe um terceiro argumento, { ownerOf }, para achar o casal quando a chamada nao o traz (agendador e webhook)"
  - "O minuto alvo do espontaneo deixa um intervalo do relogio livre no fim da janela, para sempre haver uma rodada depois dele"
  - "A fatura nao exclui o aparelho em uso: dentro do app ela so aparece no sino, nao como aviso na tela"
  - "No check do app, falha da fatura so vai ao log (codigo); a resposta continua ok"
  - "Inscricao sem updatedAt valido nunca e podada"
requirements-completed: [PUSH-02, PUSH-03, PUSH-04]
status: complete
commits: 3
plan_head_before: 5f2b1030f2b69713cb97679ffdbfa0e0a4fbfed4
actuals:
  tokens: 16200
  tasks: 3
  commits: 3
metrics:
  duration: "cerca de 20 min"
  completed: 2026-11-25
---

# Phase 7 Plan 15: Fatura, push espontaneo, relogio e gancho pos-sincronizacao Summary

O notificador agora roda sozinho no servidor: avisa uma vez por fatura perto de vencer (mesmo calculo do sino do app), manda no maximo uma cutucada espontanea por pessoa por dia, entrega o que o silencio segurou, poda aparelhos velhos e reage as sincronizacoes do banco sem alterar `sync.js`.

## Tarefas

| Tarefa | Nome | Commit |
| ------ | ---- | ------ |
| 1 (tracer) | Fatura fechada perto do vencimento ate o aviso unico | e0660f0b |
| 2 | Push espontaneo diario e relogio com entrega retida e poda | c5f384d3 |
| 3 | Relogio ligado no servidor e gatilho pos-sincronizacao | ac646a27 |

O intervalo `plan_head_before..HEAD` tem tambem commits dos planos 07-16 e 07-17, que rodaram em paralelo na mesma branch; `commits: 3` conta so os deste plano.

## O que foi feito

- **config.js:** `PUSH_MAX_PER_DAY` (8), `PUSH_SPONT_PER_DAY` (1; 0 desliga), `PUSH_SPONT_WINDOW` (11:00-20:00), `PUSH_TICK_MINUTES` (15; 0 desliga o relogio), `PUSH_BILL_CHECK_MINUTES` (60) e `PUSH_PRUNE_DAYS` (30). Ausente, vazio ou invalido vale o padrao. Todas sao opcionais no Railway.
- **Fatura:** `evaluateBills` junta `cards` da pessoa com `cardSettings`, chama `billEvents`, grava um marcador por cartao e mes e respeita o interruptor legado (`desligado`), a antecedencia e o silencio (`pendente`). Texto do banco `push-fatura`, url `/cartoes`. O `POST /api/limits/check` chama a fatura depois dos limites.
- **Espontaneo:** `evaluateSpontaneous` so sai dentro da janela, fora do silencio, com o tipo ligado e aparelho registrado; pulado nao cria marcador. Frase do banco `push-espontanea`, sem IA.
- **Relogio:** `createTick().runOnce()` avalia o espontaneo por par a cada rodada, a fatura no maximo a cada hora, entrega os retidos e poda uma vez por dia de Sao Paulo.
- **Gancho:** `withAfterSync` envolve `syncAll`, `syncConnection` e `syncItem`; `server/src/index.js` usa o mesmo objeto na rota, no webhook e no agendador. `sync.js`, `card-sync.js`, `webhook.js` e `app.js` sem diferenca.

## Verificacao

| Comando | Resultado |
| ------- | --------- |
| `test:core:tz` | 1084 de 1084 nos dois fusos |
| `test:server` | 383 de 383 |
| `test:static` | 765 passam, 2 ignorados, 0 falhas |
| `test:emu` | 197 de 197 |
| `lint` e `build` | passam |

Rodada final sobre o commit 10485c74; a contagem inclui testes dos planos paralelos. Antes dele, `server/test/emu/ai-budget.test.js` falhava pelos campos novos de `aiUsage` do 07-16, que o proprio 07-16 corrigiu. `test:rules` nao foi rodado: nenhuma regra nem indice foi tocado.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Funcionalidade critica] Compras de cartao nao disparavam o gancho**
- **Found during:** Task 3
- **Issue:** o plano manda chamar o gancho com `imported` maior que zero, mas `syncConnection` conta as compras de cartao so em `cardTxs.created`. Uma sincronizacao so de cartao nunca avaliaria limites nem fatura.
- **Fix:** `withAfterSync` dispara com `imported > 0` ou `cardTxs.created > 0`.
- **Files modified:** server/src/push/after-sync.js, server/test/push-tick.test.js
- **Commit:** ac646a27

### Ajustes de interpretacao

- `withAfterSync(sync, hook, { ownerOf })`: o plano mostra dois argumentos; o terceiro leva a leitura de `bankConnections/{itemId}` pelo repo.
- O minuto alvo do espontaneo e sorteado em `[inicio, fim - PUSH_TICK_MINUTES)`, senao um alvo nos ultimos minutos da janela perderia o dia.

## Pontos para o dono conferir

Seguem o plano, mas podem surpreender no primeiro deploy:

1. **Faturas antigas em aberto.** Cada fatura que o sino mostra hoje (inclusive atrasada de meses atras sem pagamento registrado) vira um push, uma vez. Se forem muitas, podem consumir o teto diario (8), e o que passar do teto, inclusive aviso de limite do mesmo dia, fica como `teto` e nao e reenviado. Vale limpar o sino (marcar como pagas) antes do deploy.
2. **Horario da fatura.** A fatura nao tem janela propria: sem silencio configurado, a que entra no prazo na virada do dia sai logo depois da meia-noite.
3. **Retido e depois pago.** Uma fatura segurada pelo silencio e paga antes de ele acabar ainda e entregue (o `deliverHeld` nao reconfere o pagamento).
4. **Rajada de webhooks.** Quando o `syncItem` coalesce duas execucoes, devolve so o resumo da ultima; se apenas a primeira importou, o gancho nao roda ate o proximo check ou importacao.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum alem do `<threat_model>`: T-07-58 (marcador por `create()`, provado com instancias novas e simultaneas), T-07-59 (so o banco de push), T-07-60 (cartao por casal e pessoa, testes cruzados), T-07-61 (rodada unica, sem lancamentos, fatura de hora em hora) e T-07-62 (gancho sem await, retorno e erro identicos) mitigados. Nenhum pacote, endpoint ou indice novo.

## Self-Check: PASSED

- config.js, tick.js, after-sync.js, push-tick.test.js e emu/push-tick.test.js existem.
- Commits e0660f0b, c5f384d3 e ac646a27 existem na branch.
