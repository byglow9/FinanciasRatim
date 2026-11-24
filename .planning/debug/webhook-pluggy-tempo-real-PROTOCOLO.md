# Protocolo: por que os lançamentos do banco não chegam em tempo real

Sessão de debug: `.planning/debug/webhook-pluggy-tempo-real.md`. Nada aqui altera produção: o script só lê.

## O que já está confirmado (antes de testar)

- O servidor **nunca pede dado novo ao banco**. Ele só lê o que a Pluggy já guardou: polling a cada `SYNC_INTERVAL_HOURS` (padrão 6 h, `server/src/index.js`), webhook (`POST /webhooks/pluggy`) e o botão "Sincronizar agora" (`POST /api/sync`).
- Docs oficiais da Pluggy (lidas em 24/11/2026): o Meu Pluggy atualiza as conexões originais **a cada 24 h, de graça**. O item que aparece no nosso app é um *espelho*: reflete cada atualização do original, **não tem auto-sync próprio e não aceita atualização manual (sem PATCH /items)**. Webhooks funcionam normalmente nesse item espelho.
- Os 4 webhooks **foram registrados em produção** (02-06-SUMMARY: "4 criados"; 02-VERIFICATION, verdade 5). O que nunca foi provado é a **entrega** (UAT 4 ficou `blocked` em 18/11, o mesmo dia do registro; a reavaliação prevista para depois de 48 h não está registrada em nenhum arquivo).
- Entrega da Pluggy: o servidor precisa responder 2xx em até 10 s; 3 tentativas (na hora, ~15 min, ~2 h); **400, 401, 403, 404 e 405 nunca são reenviados**. Um segredo errado, portanto, perde o evento em silêncio.
- Teto realista com Meu Pluggy: **1 atualização por dia**. Webhook só tira o atraso extra do nosso servidor (de até 6 h para segundos).

## Cuidado com o teste "R$ 1 entre contas dele"

Transferência entre contas do **mesmo CPF** vira `review / self_transfer` no servidor: fica em `bankImports`, mas **não vira lançamento no app** (a tela de revisão foi descartada na fase 2). O script mostra isso na coluna "situação". Para ver o lançamento no app, use um Pix de R$ 1 para outra pessoa (por exemplo, para ela) ou uma compra pequena. Para medir só o tempo, a transferência entre contas serve: o script lê a Pluggy e `bankImports`.

## Passo 0: diagnóstico sem transferir nada (10 min)

Na pasta do projeto, no shell do dono (as credenciais ficam só nas variáveis, nunca em arquivo do repositório):

```bash
cd /home/glow/Documentos/projetos/sitefinancias/financiasratimbum
. ./scripts/dev-env.sh && \
PLUGGY_CLIENT_ID=... PLUGGY_CLIENT_SECRET=... \
FIREBASE_SERVICE_ACCOUNT_FILE=/caminho/FORA/do/repo/chave-de-servico.json \
WEBHOOK_URL=https://SEU-SERVIDOR-NO-RAILWAY/webhooks/pluggy \
node server/scripts/diagnose-webhooks.js --days 7 --limit 5
```

- `FIREBASE_SERVICE_ACCOUNT_FILE` é opcional (liga a comparação com `bankConnections`/`bankImports`; precisa ficar fora do repositório). Sem ela, informe `PLUGGY_ITEM_IDS=id1,id2` (Dashboard Pluggy > Aplicações > Demo > Itens Conectados), porque `GET /items` não existe no Meu Pluggy.
- `WEBHOOK_URL` é opcional (acusa webhook registrado em outra URL).
- A saída mascara segredos, mostra itemId/accountId com 8 caracteres e **não imprime descrições** (use `--show-description` só se quiser). Pode colar a saída inteira para o agente.

Leia a saída em 4 pontos:

1. **Webhooks registrados**: procure `[erro]`/`[aviso]` (`AUSENTE`, `DESATIVADO`, `URL_DIFERENTE`, `SEM_WEBHOOKS`). Tudo `[ok]` significa só "registrado", não "entregue".
2. **lotes de createdAt**: horários em que a Pluggy criou transações. Um lote por dia, sempre no mesmo horário, é o ciclo de 24 h do Meu Pluggy.
3. **lastUpdatedAt** do item e `lastWebhookAt` do Firestore (`NUNCA_RECEBEU_WEBHOOK`, `WEBHOOK_EM_DIA`, `SERVIDOR_ATRASADO`, `SEM_DOC_NO_FIRESTORE`).
4. **atraso do servidor** por transação (`importado − createdAt da Pluggy`) e a frase "compatível com webhook / polling".

Depois abra **dashboard.pluggy.ai > Events** (filtro por `item/updated` e `transactions/created`, últimos 7 dias). Essa é a única fonte que mostra o **status HTTP que o nosso servidor devolveu** a cada entrega. Anote: há eventos? Qual status (200, 401, 404, timeout)? Dá para usar "Retry" em um evento para testar sem esperar.

## Teste real (cronometrado)

1. Anote o horário (BRT, com segundos) de cada transferência de R$ 1.
2. **Não** aperte "Sincronizar agora" nem abra Configurações > Bancos durante a medição (isso força o servidor a ler e estraga o atraso medido).
3. Rode o script (comando acima) em: +5 min, +30 min, +2 h, +6 h30 e no dia seguinte. Em cada rodada anote: `createdAt` da Pluggy, `importado` e se o lançamento já aparece no app.
4. Em cada checkpoint olhe também: Configurações > Bancos ("Último aviso do banco: há X" só aparece com `lastWebhookAt` preenchido) e o log do Railway (painel > Deployments > Logs; o painel pode mostrar UTC, Brasília é UTC−3), procurando `[webhook] item/updated item=xxxxxxxx` e `[sync] agendada:`.
5. Repita 3 vezes em horários diferentes, uma delas logo depois de um `[sync] agendada` e outra logo antes do próximo (a fase do polling de 6 h muda o atraso).

Tabela para preencher:

| # | Transferência (BRT) | Tipo | createdAt na Pluggy | Importado no servidor | Apareceu no app | `[webhook]` no Railway | Events (status) |
|---|---------------------|------|---------------------|-----------------------|-----------------|------------------------|-----------------|
| 1 |                     |      |                     |                       |                 |                        |                 |
| 2 |                     |      |                     |                       |                 |                        |                 |
| 3 |                     |      |                     |                       |                 |                        |                 |

## Tabela de decisão

Duas etapas independentes. **A** = `createdAt` da Pluggy − hora da transferência (banco → Pluggy). **B** = `importado` − `createdAt` da Pluggy (Pluggy → servidor).

| Classe | Como reconhecer | Consequência |
|--------|-----------------|--------------|
| **atualização-diária-da-Pluggy** (Meu Pluggy 24 h) | A de horas (até ~24 h); `createdAt` em lote único por dia, no mesmo horário; `nextAutoSyncAt` nenhum | É o teto. Nenhum ajuste no servidor vence isso (sem PATCH no espelho). Convive com qualquer classe abaixo. |
| **polling-6h** | B de minutos até ~6 h, variando com a fase do polling; `lastWebhookAt` vazio; nenhuma linha `[webhook]`; Events sem entregas ou com erro | O servidor só vê o dado no próximo polling. Corrigir o webhook (ou polling/sync ao abrir) reduz B. |
| **webhook-funcionando** | B de segundos (até ~3 min); `lastWebhookAt` ≈ `createdAt`; linha `[webhook] item/updated item=...`; Events com 200; "Último aviso do banco" no app | Entrega provada (fecha o UAT 4). O que sobra é só o teto de 24 h. |
| **webhook-não-registrado/desativado** | Script com `AUSENTE`, `DESATIVADO`, `SEM_WEBHOOKS` ou `URL_DIFERENTE`; Events sem nenhuma entrega para a URL | Rodar `register-webhooks.js` (idempotente; reativa e reaplica o segredo). |
| (4b) **webhook-registrado-mas-rejeitado** | Script todo `[ok]`, mas Events mostra 401 / 404 / 5xx / timeout, ou `SEM_DOC_NO_FIRESTORE` | 401: segredo no Railway diferente do usado no registro. 404: URL errada. `SEM_DOC_NO_FIRESTORE`: o `itemId` do evento não tem documento em `bankConnections` (o servidor descarta sem log). |

Atenção ao ler os logs: o servidor **não loga** 401, 400 nem item desconhecido. Ausência de `[webhook]` no Railway é ambígua; só Events (Pluggy) desempata.

## Hipóteses ranqueadas

| # | Hipótese | Plausibilidade | Evidência / como falsificar |
|---|----------|----------------|-----------------------------|
| H1 | O teto é o ciclo de 24 h do Meu Pluggy (a causa do "só uma vez por dia") | Alta, documentada | Docs oficiais. Falsa se `createdAt` aparecer várias vezes ao dia ou minutos após a compra. |
| H2a | Segredo divergente: `PLUGGY_WEBHOOK_SECRET` do Railway ≠ cabeçalho gravado no registro (401, nunca reenviado) | Média-alta (entre as falhas de webhook) | O segredo é digitado em dois lugares (Railway e comando de registro) e já houve erro de colagem de outra credencial nessa etapa (02-06-SUMMARY); a checagem de produção só provou que a rota existe (401 sem segredo). Events mostra 401. |
| H2b | URL registrada ≠ URL pública atual do Railway (domínio trocado, typo, serviço antigo) | Média | Script com `WEBHOOK_URL`; Events com 404/connection error. |
| H2c | `itemId` do evento sem documento em `bankConnections` (por exemplo após reautorizar o Meu Pluggy, que pode trocar o itemId) | Baixa-média | `SEM_DOC_NO_FIRESTORE`; servidor ignora em silêncio. |
| H2d | Servidor fora do ar na hora (deploy/reinício) e a Pluggy esgotou as 3 tentativas (~2 h 30) | Baixa, pontual | Events com timeout em horários isolados. |
| H2e | Webhook desativado (`disabledAt`), por exemplo por inatividade | Baixa e **não confirmada**: a documentação lida só descreve o campo `disabledAt`, não a regra de desativação | Script mostra `DESATIVADO`. |
| H3 | Polling de 6 h soma 0 a 6 h quando o webhook não entrega | Certa, mas secundária (soma ao H1) | Coluna "atraso" do script. |
| H4 | Limite de PATCH (1/hora para client IDs novos) ou plano gratuito impedindo atualização | Irrelevante para o espelho: nem existe PATCH | Docs (Meu Pluggy: "no update/PATCH"). |

Conclusão provisória: mesmo com tudo certo nos webhooks, o app continua "uma vez por dia" (H1). Webhook corrige o atraso extra do servidor, não o ciclo do Meu Pluggy. Falta provar a entrega (UAT 4) e medir se o Uber de hoje chegou dentro do ciclo.

## Opções de correção (nenhuma implementada)

| Opção | Prós | Contras |
|-------|------|---------|
| **A. Consertar o webhook** (rodar `register-webhooks.js` com a URL e o segredo iguais aos do Railway; opcionalmente logar 401/item desconhecido e `triggeredBy` no servidor) | Custo zero; atraso do servidor cai de até 6 h para segundos; já está construído e testado | Não vence o ciclo de 24 h; exige o segredo do dono; log extra pede deploy |
| **B. "Atualizar agora" via PATCH /items** | Seria o único jeito de "pedir dado novo" | **Inviável no Meu Pluggy** (espelho não aceita PATCH). Só funcionaria em conector direto, com limite de 1/hora, MFA em alguns bancos e plano pago. O botão "Sincronizar agora" que já existe só relê a Pluggy. Não construir |
| **C. Polling mais curto** (`SYNC_INTERVAL_HOURS=1` ou `0.5`, só variável do Railway) | Sem código; cobre webhook falhando | Não vence o teto de 24 h; cada rodada lê todos os `bankImports` da pessoa e as transações da janela (`sync.js`), então as leituras do Firestore Spark (50 mil/dia) crescem com o histórico: leituras/dia ≈ rodadas/dia × (bankImports + transações lidas). Calcular antes de encurtar |
| **D. Sync ao abrir o app** (ao abrir/voltar ao foco, com intervalo mínimo de ~15 min via `lastSyncAt`, chamar `POST /api/sync` em segundo plano) | Frescor quando o dono olha; custo proporcional ao uso; independe de webhook | Não vence o teto de 24 h; gasta leituras a cada abertura (precisa do intervalo mínimo); PWA em segundo plano não dispara |
| **E. Perguntar ao suporte do Meu Pluggy** (meu-suporte@pluggy.ai) se há atualização manual no app ou frequência maior | Única via de vencer o teto sem pagar | Depende de terceiro; as docs lidas não confirmam botão de atualização manual no Meu Pluggy |
| **F. Sair do Meu Pluggy para conector direto pago** | Auto-sync 8/12/24 h e PATCH com limite | Quebra a restrição "rodar de graça"; MFA em alguns bancos. Não recomendado |

Ordem sugerida: medir (Passo 0 e teste) → se o webhook falha, A → D como complemento barato → C só como reserva, calculando as leituras → E em paralelo. B e F descartadas.

## O que devolver ao agente

1. A saída completa do script (já mascarada), do Passo 0 e de cada checkpoint.
2. A tabela preenchida.
3. Print (ou transcrição) do Dashboard Pluggy > Events: horário, evento e status HTTP, **sem cabeçalhos**.
4. Trecho do log do Railway com `[webhook]` e `[sync] agendada` e seus horários. Nunca cole `PLUGGY_*`, chave de serviço nem o valor do segredo.

## Fontes

- Pluggy, Item (Meu Pluggy: caso à parte; auto-sync): https://v2.docs.pluggy.ai/en/docs/connections/item
- Pluggy, Uso pessoal com Meu Pluggy: https://docs.pluggy.ai/pt/docs/guides/meu-pluggy-personal-use
- Pluggy, Updating an Item (limite de PATCH, atualização automática 24/12/8 h por plano, MFA): https://v2.docs.pluggy.ai/en/docs/connect-widget/updating-item
- Pluggy, Webhook (eventos, entrega, tentativas, status não reenviados): https://v2.docs.pluggy.ai/en/reference/webhooks
- Pluggy, Webhook: configurar e depurar (Dashboard > Events, Retry): https://v2.docs.pluggy.ai/en/docs/developer-tools/webhook-troubleshoot
- Confiança: trechos citados lidos diretamente nas páginas; a diferença entre páginas sobre intervalos de auto-sync (24/12/8 h por plano versus 6 a 96 h configurados pela Pluggy) vem de resumo de busca e não afeta o Meu Pluggy, que tem ciclo próprio de 24 h.
