# API Coverage — Pluggy (webhooks, reconexão de item e leitura de cartão)

> Full coverage by default. Opt-outs are explicit, reasoned decisions. Escopo reduzido pelo dono em 2026-11-17 (02-CONTEXT.md): só os quatro eventos de D-06; REV-01, REV-02, REV-04 e REV-05 foram descartados.

| capability | decision | reason |
|---|---|---|
| webhook-event:item/updated | INTEGRATE | |
| webhook-event:transactions/created | INTEGRATE | |
| webhook-event:transactions/updated | INTEGRATE | |
| webhook-event:transactions/deleted | INTEGRATE | |
| webhook-event:item/created | OPT-OUT | fora dos quatro eventos de D-06; o registro do item já ocorre pelo widget e por POST /api/connections |
| webhook-event:item/error | OPT-OUT | fora de D-06; o estado de erro do item vem de fetchItem em cada sync (executionStatus e errorCode, REV-07) |
| webhook-event:item/deleted | OPT-OUT | fora de D-06; a desconexão é feita pelo próprio app (DELETE /api/connections) |
| webhook-event:item/waiting_user_input | OPT-OUT | fora de D-06; o status WAITING_USER_INPUT é lido no sync e vira "precisa reconectar" (REV-07) |
| webhook-event:item/waiting_user_action | OPT-OUT | fora de D-06; o status WAITING_USER_ACTION é lido no sync e vira "precisa reconectar" (REV-07) |
| webhook-event:item/login_succeeded | OPT-OUT | fora de D-06; sem uso no app |
| webhook-event:connector/status_updated | OPT-OUT | fora de D-06; sem uso no app |
| webhook-event:all | OPT-OUT | receberia eventos de pagamento que o app ignora; quatro registros casam com REV-06 |
| webhook-event:payment-products | OPT-OUT | eventos de pagamento (payment_intent, scheduled_payment, pix, boleto, smart_transfer) fora do escopo do app (REQUIREMENTS, Out of Scope) |
| webhooks-api:create | INTEGRATE | |
| webhooks-api:list | INTEGRATE | |
| webhooks-api:update | INTEGRATE | |
| webhooks-api:get-by-id | OPT-OUT | a listagem já traz o necessário para o registro idempotente |
| webhooks-api:delete | OPT-OUT | duplicados são desativados por update com enabled false, que é reversível; apagar não é necessário |
| connect-token-with-itemId | INTEGRATE | |
| card-probe-read-only-calls | INTEGRATE | |
| item-write-operations | OPT-OUT | createItem, updateItem por API e deleteItem ficam fora: a sonda do cartão é somente leitura e a atualização por API consome o limite mensal do banco |
| payload-createdTransactionsLink | OPT-OUT | o sync relê por fetchAllTransactions; o link antigo deixa de existir em 2026-12-31 |
| other-pluggy-products | OPT-OUT | investimentos, empréstimos, identidade, SCR e boletos: fora do foco de controle de gastos (REQUIREMENTS, Out of Scope) |

Notas: card-probe-read-only-calls = fetchItem, fetchAccounts, fetchCreditCardBills e fetchAllTransactions. connect-token-with-itemId = createConnectToken(itemId) para reconectar item existente (REV-07).
