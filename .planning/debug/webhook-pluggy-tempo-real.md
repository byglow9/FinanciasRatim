---
status: investigating
trigger: "dono relata que os lancamentos do banco so aparecem quando 'atualiza uma vez no dia', sem tempo real (hoje 24/11/2026 um gasto de Uber R$ 21,95 apareceu no mesmo dia). Descobrir se vem de (a) polling do servidor 6h, (b) atualizacao automatica da Pluggy/MeuPluggy, (c) webhook funcionando"
created: 2026-11-24T16:00:00Z
updated: 2026-11-24T16:45:00Z
goal: find_root_cause_only
---

## Current Focus

hypothesis: H1 - o teto de frescor e o ciclo proprio de 24 h do Meu Pluggy (item original), refletido no item espelho; webhook e polling so decidem quanto atraso extra (0 a 6 h) se soma. H2 (webhook registrado mas nao entregue/aceito) e a causa do atraso extra, ainda nao observada.
test: dono roda server/scripts/diagnose-webhooks.js (somente leitura) e segue .planning/debug/webhook-pluggy-tempo-real-PROTOCOLO.md; ver tambem dashboard.pluggy.ai/events (status HTTP de cada entrega)
expecting: createdAt das transacoes na Pluggy em lotes ~1x/dia => H1; atraso servidor (bankImports.createdAt - Pluggy createdAt) de segundos + lastWebhookAt preenchido => webhook ok; atraso de minutos a 6 h e lastWebhookAt null => polling (webhook nao entrega)
next_action: aguardar dono rodar o script e devolver a saida (sem segredos); classificar com a tabela de decisao do PROTOCOLO

## Symptoms

expected: lancamentos do banco aparecem no app logo depois do gasto (tempo real)
actual: aparecem so quando "atualiza uma vez no dia"; hoje o Uber de R$ 21,95 apareceu no mesmo dia
errors: nenhum erro; Configuracoes > Bancos 'Ultimo aviso do banco' nao aparece (lastWebhookAt null) desde o UAT de 18/11/2026
reproduction: fazer gasto/transferencia pequena e medir o horario ate aparecer na Pluggy, no Firestore (bankImports) e no app
started: sempre (conexao MeuPluggy criada em 17-18/11/2026)

## Eliminated

- hypothesis: "webhooks nunca foram registrados em producao" (premissa do pedido)
  evidence: 02-06-SUMMARY.md registra dry-run e registro real "4 criados, 0 atualizados" (item/updated, transactions/created|updated|deleted) e 02-VERIFICATION.md verdade 5 e Key Link index.js<->Railway ("producao: 401 sem segredo, confirmado pelo orquestrador"). Existe registro; o que falta e a prova de ENTREGA.
  timestamp: 2026-11-24T16:10:00Z
- hypothesis: "um botao Atualizar agora via PATCH /items resolveria para o MeuPluggy"
  evidence: docs oficiais (v2.docs.pluggy.ai item, "Meu Pluggy connections are a separate case"): item espelho "cannot be updated through the API (no update/ PATCH)" e "does not run its own auto-sync"
  timestamp: 2026-11-24T16:15:00Z

## Evidence

- timestamp: 2026-11-24T16:05:00Z
  checked: server/src/sync.js, server/src/index.js
  found: syncConnection so le (fetchItem, fetchAccounts, fetchAllTransactions); nenhum updateItem/PATCH. Polling setTimeout 30 s apos subir e setInterval SYNC_INTERVAL_HOURS (padrao 6 h). syncConnection le TODOS os bankImports da pessoa a cada rodada (sync.js L143).
  implication: o servidor nunca pede atualizacao ao banco; so reflete o que a Pluggy ja tem. Encurtar o polling multiplica leituras de Firestore (Spark 50k/dia).
- timestamp: 2026-11-24T16:06:00Z
  checked: server/src/app.js POST /webhooks/pluggy
  found: 401 sem segredo correto (nunca retentado pela Pluggy), 200 imediato, so grava lastWebhookAt/lastWebhookEvent se bankConnections/{itemId} existe, depois syncItem e log '[webhook] evento item=8chars'. Item desconhecido, 401 e 400 nao deixam NENHUM log.
  implication: ausencia de linha '[webhook]' no Railway e ambigua (nao chegou, 401, 400 ou item desconhecido). So o painel da Pluggy (Events) mostra o status HTTP devolvido.
- timestamp: 2026-11-24T16:08:00Z
  checked: shared/core/classify.js isSelfTransfer + sync.js
  found: transferencia entre contas do mesmo CPF (categoria "same person transfer" ou payer==receiver) vira status review/self_transfer: grava em bankImports mas NAO cria lancamento em transactions (tela de revisao foi descartada na fase 2).
  implication: o teste "R$ 1 entre contas dele" aparece na Pluggy e em bankImports, mas provavelmente NAO como lancamento no app. O protocolo precisa medir em bankImports/Pluggy ou usar Pix a terceiro (ela).
- timestamp: 2026-11-24T16:12:00Z
  checked: docs oficiais Pluggy (item, personal-use, updating-item, webhooks) lidas em 2026-11-24
  found: (1) Meu Pluggy atualiza as conexoes originais a cada 24 h, gratis, independente do plano; (2) item espelho no app "reflects every update automatically; no own auto-sync; cannot be updated manually (no PATCH)"; (3) "Proxy Items receive webhooks like any other Item"; (4) item/updated = item atualizado e sincronizado com sucesso; transactions/created so dispara se houve transacao nova; (5) entrega: 2xx em ate 10 s, 3 tentativas (imediata, ~15 min, ~2 h), 400/401/403/404/405 nunca retentados, 3xx nao seguido; (6) painel dashboard.pluggy.ai/events mostra cada entrega com status HTTP e permite Retry manual; (7) limite de PATCH /items de 1/hora vale para client IDs novos de apps comuns, irrelevante para espelho; (8) POST/PATCH /webhooks exigem "API management" habilitado, GET devolve headers mascarados (****); (9) a doc consultada nao descreve desativacao automatica de webhook por inatividade (so o campo disabledAt).
  implication: com MeuPluggy tempo real e impossivel por API; o melhor que o servidor consegue e chegar a segundos depois de cada ciclo de 24 h (webhook) ou ate 6 h depois (polling).
- timestamp: 2026-11-24T16:14:00Z
  checked: src/components/settings/BankConnections.tsx
  found: ja existe botao "Sincronizar agora" (POST /api/sync -> syncAll)
  implication: "Atualizar agora" no sentido de reler a Pluggy ja existe; o que nao existe (e nao e possivel no espelho) e pedir dado novo ao banco.

- timestamp: 2026-11-24T16:40:00Z
  checked: instrumentacao entregue (diagnostico somente leitura)
  found: server/scripts/diagnose-webhooks.js + server/test/diagnose-webhooks.test.js (37 testes; suite do server 118/118; mutacoes de vazamento de query/segredo e de escrita no Firestore derrubam os testes). Mede por transacao o atraso Pluggy createdAt -> bankImports.createdAt (webhook = segundos; polling = minutos a 6 h) e agrupa createdAt em lotes (1 lote/dia = ciclo de 24 h do Meu Pluggy).
  implication: dois estagios separaveis (banco->Pluggy e Pluggy->servidor); a decisao entre polling-6h, atualizacao-diaria, webhook-funcionando e webhook-nao-registrado/desativado sai da tabela do PROTOCOLO. Hipoteses ranqueadas e opcoes de correcao (nao implementadas) estao no PROTOCOLO.
- timestamp: 2026-11-24T16:45:00Z
  checked: datas de 02-06-SUMMARY (registro dos webhooks) e 02-UAT (teste 4)
  found: registro e UAT 4 sao ambos de 18/11/2026; a reavaliacao "apos 48 h" prevista no UAT nao esta registrada em nenhum arquivo
  implication: "lastWebhookAt null" so prova ausencia de evento ate 18/11; o estado atual e desconhecido ate o dono rodar o script e olhar dashboard.pluggy.ai/events

## Resolution

root_cause: [nao confirmado; depende de dados reais do dono. Hipotese principal H1 (teto de 24 h do Meu Pluggy) + H2 (entrega do webhook nao provada; ranking H2a segredo, H2b URL, H2c itemId sem doc, H2d servidor fora, H2e desativado) no PROTOCOLO]
fix: [fora de escopo: diagnostico somente]
verification: [pendente: dono roda o script/protocolo]
files_changed:
  - server/scripts/diagnose-webhooks.js
  - server/test/diagnose-webhooks.test.js
  - .planning/debug/webhook-pluggy-tempo-real-PROTOCOLO.md
