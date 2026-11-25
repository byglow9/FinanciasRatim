---
phase: 07-push-e-vint-m-com-ia
plan: 13
subsystem: ai-snapshot-server
tags: [ia, servidor, firestore, cache, privacidade]
requires:
  - phase: 07
    provides: "buildAiSummary e aiPrivacy (07-05, 07-07); createSnapshotLoader minimo e a rota da fala (07-09)"
provides:
  - "server/src/ai/snapshot.js completo: ciclo atual e anterior, contas fixas e pagamentos, metas, saldo do Porquinho, fatura aberta, insights fortes e ultimo lancamento, na forma de entrada de buildAiSummary"
  - "cache em memoria com TTL de 10 min (atual) e 12 h (anterior), fresh limitado a 1 por 15 s (FRESH_MIN_MS), contagem de leituras e aviso acima de 800"
  - "prova no emulador do escopo por pessoa e por casal, do saldo do Porquinho, dos documentos sujos e do TTL"
affects: [07-12, 07-14, 07-16]
tech-stack:
  added: []
  patterns:
    - "cache de promessas por chave (hid|person|cycleKey): cargas simultaneas dividem a mesma leitura e so quem disparou contabiliza as leituras"
    - "fonte tolerante (safe): erro de consulta devolve a parte vazia, loga so o nome da fonte e a entrada de cache vence em 15 s para tentar de novo"
    - "fatura aberta calculada na hora da carga (depende do relogio), nao guardada no cache"
key-files:
  created:
    - server/test/ai-snapshot.test.js
    - server/test/emu/ai-snapshot.test.js
  modified:
    - server/src/ai/snapshot.js
    - test/static/fixed-expense-manual.test.js
key-decisions:
  - "Lancamentos do ciclo atual e as configuracoes sao essenciais: erro sobe e a fala cai no banco de frases. O ciclo anterior e as demais fontes sao toleradas (parte vazia)"
  - "Cartao: nome do resumo e o apelido do dono (cardSettings) ou o nome da Pluggy; a configuracao e lida por id do cartao da pessoa (nunca a dos cartoes da outra pessoa) e so vale com ownerId do casal; sem fechamento ou vencimento nao ha fatura"
  - "Porquinho lido com select('type','amount'): quem guardou e a descricao nem chegam a memoria; sem nenhum lancamento valido o saldo e null (nao vira assunto 'R$ 0')"
  - "Pagamentos de contas fixas sao lidos pelo casal e do mes (nao ha person no documento) e filtrados em memoria pelas contas da pessoa antes de entrar no resumo"
  - "reads conta documentos devolvidos (mais 1 por get de documento); consulta sem resultado nao conta, diferente da cobranca real de 1 leitura minima"
  - "latestTx vai na entrada do resumo (maior createdAt); nas situacoes de reacao o speech.js do 07-09 continua escolhendo o proprio lancamento"
patterns-established:
  - "Consultas so com igualdades mais a janela de data ja indexada: nenhum indice novo e nenhuma mudanca em firestore.rules"
requirements-completed: [IA-01, IA-02]
status: complete
commits: 3
plan_head_before: 3d4f1a112a3eea3b7a9d30eb2a0a9733e599897f
actuals:
  tokens: 13500
  tasks: 3
  commits: 3
---

# Phase 7 Plan 13: Carga completa do resumo da IA Summary

O carregador do resumo agora le tudo o que a D-16 permite, so da pessoa do token (mais o saldo e as contas do casal), com cache de 10 minutos no ciclo atual e 12 horas no anterior, e a prova no emulador de que nada da outra pessoa nem de outro casal chega ao texto.

## O que foi feito

- **Tasks 1 e 2 (19668c9e):** `createSnapshotLoader.load({ hid, person, fresh })` devolve `{ input, reads, tone, tabNames }` com `prevTransactions` (ciclo anterior, para a comparacao por categoria), `bills`, `payments`, `goals`, `porquinhoCents`, `cards` (fatura aberta pelo `openBillMonth` e `billTotals`), `insights` (severidade 2 ou 3, ate 8) e `latestTx`. Constantes exportadas: `CURRENT_TTL_MS`, `PREVIOUS_TTL_MS`, `FRESH_MIN_MS`, `BIG_SNAPSHOT_READS`. Testes unitarios com banco falso que grava cada consulta (26 testes).
- **Task 3 (fa78bde5):** `emu/ai-snapshot.test.js` com dois casais e duas pessoas (7 testes): a carga de Ele nao tem nada da Ela nem do outro casal e vice-versa; o Porquinho soma o casal e nao expoe pessoa nem descricao; documentos sujos (Pix para nome, almoco com nome mais CPF e telefone, meta e conta fixa com e-mail, apelido de cartao com numero longo) passam por `buildAiSummary` com `findLeaks` vazio; TTL com relogio injetado; contagem de leituras igual ao numero de documentos lidos.
- **Guarda D-02 (868f8d0a):** ver deviation abaixo.

## Verificacao

- `npm run test:core:tz`: 1084 passam nos dois fusos. `npm run test:server`: 259 passam. `npm run test:static`: 727 passam, 0 falham. `npm run lint`: limpo. `npm run build`: ok.
- `test:emu` (todos os arquivos, com `firestore.rules` e indices reais): 189 passam, 0 falham, incluindo os 7 de `emu/ai-snapshot.test.js`. Rodei com um `firebase.emu.json` no scratchpad em portas proprias (9199, 8180, 4410, 4510), porque as portas padrao estavam ocupadas por emulador de outro executor em paralelo, e o `resetEmulators` de um apagaria os dados do outro.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Bloqueio] Guarda estatica D-02 reprovava `snapshot.js`**
- **Found during:** verificacao final (`npm run test:static`)
- **Issue:** `test/static/fixed-expense-manual.test.js` proibe qualquer mencao a `fixedExpense` em `server/src` e `shared/core` (para o banco nunca criar nem vincular pagamento de conta fixa). A D-16 deste plano exige justamente ler contas fixas e pagamentos.
- **Fix:** excecao so para `server/src/ai/snapshot.js` e um teste novo na mesma guarda que exige que o arquivo nao tenha nenhuma gravacao no Firestore (`.add(`, `).set(`, `).create(`, `).update(`, `).delete(` nem lote). A intencao da D-02 (o servidor nao grava pagamento) continua travada.
- **Files modified:** test/static/fixed-expense-manual.test.js
- **Commit:** 868f8d0a

**2. [Processo] Tarefas 1 e 2 em um unico commit**
- O `snapshot.js` foi escrito de uma vez com todas as fontes e o teste unitario cobre as duas tarefas; separar exigiria reescrever um estado intermediario artificial. Os dois conjuntos de criterios de aceite estao cobertos pelo mesmo commit (19668c9e).

## Contrato para os proximos planos

- `load` nao mudou de assinatura. `reads` e 0 em acerto de cache; `speech.js` nao foi tocado.
- Quem quiser a carga barata deve chamar com `fresh: false`; `fresh: true` so relê se a ultima leitura da chave tem 15 s ou mais.
- Cache e por processo: reiniciar o servidor zera, e varias instancias nao dividem cache.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum alem do `<threat_model>`. Mitigados: T-07-50 (toda consulta de lancamento, meta, cartao e insight leva ownerId e person do token; prova com dois casais e duas pessoas), T-07-51 (Porquinho so como saldo, lido com `select`), T-07-52 (documentos sujos com `findLeaks` vazio), T-07-53 (TTLs, fresh limitado e contagem de leituras; aviso so com a contagem).

## Notas de execucao

- Nenhum pacote instalado, nenhum `.env*` lido, sem push nem deploy. `.env.local` e `.planning/state.json` ficaram fora de todo commit; arquivos de outros executores (07-10, 07-11, 07-12, 07-14) nao foram incluidos.
- Sem indice novo e sem mudanca em `firestore.rules`.

## Self-Check: PASSED

Arquivos conferidos: server/src/ai/snapshot.js, server/test/ai-snapshot.test.js, server/test/emu/ai-snapshot.test.js, test/static/fixed-expense-manual.test.js; commits 19668c9e, fa78bde5 e 868f8d0a presentes no historico.
