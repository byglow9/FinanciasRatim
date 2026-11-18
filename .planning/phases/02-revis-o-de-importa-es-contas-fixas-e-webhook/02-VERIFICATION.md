---
phase: 02-revis-o-de-importa-es-contas-fixas-e-webhook
verified: 2026-11-18T18:00:00Z
status: passed
score: 9/9 must-haves verified
covered_files:
  - ".planning/REQUIREMENTS.md"
  - ".planning/phases/02-revis-o-de-importa-es-contas-fixas-e-webhook/02-01-PLAN.md"
  - ".planning/phases/02-revis-o-de-importa-es-contas-fixas-e-webhook/02-01-SUMMARY.md"
  - ".planning/phases/02-revis-o-de-importa-es-contas-fixas-e-webhook/02-02-PLAN.md"
  - ".planning/phases/02-revis-o-de-importa-es-contas-fixas-e-webhook/02-02-SUMMARY.md"
  - ".planning/phases/02-revis-o-de-importa-es-contas-fixas-e-webhook/02-03-PLAN.md"
  - ".planning/phases/02-revis-o-de-importa-es-contas-fixas-e-webhook/02-03-SUMMARY.md"
  - ".planning/phases/02-revis-o-de-importa-es-contas-fixas-e-webhook/02-04-PLAN.md"
  - ".planning/phases/02-revis-o-de-importa-es-contas-fixas-e-webhook/02-04-SUMMARY.md"
  - ".planning/phases/02-revis-o-de-importa-es-contas-fixas-e-webhook/02-05-PLAN.md"
  - ".planning/phases/02-revis-o-de-importa-es-contas-fixas-e-webhook/02-05-SUMMARY.md"
  - ".planning/phases/02-revis-o-de-importa-es-contas-fixas-e-webhook/02-06-PLAN.md"
  - ".planning/phases/02-revis-o-de-importa-es-contas-fixas-e-webhook/02-06-SUMMARY.md"
  - "server/scripts/probe-card.js"
  - "server/scripts/register-webhooks.js"
  - "server/src/app.js"
  - "server/src/card-probe.js"
  - "server/src/index.js"
  - "server/src/sync.js"
  - "server/src/webhook.js"
  - "shared/core/bankStatus.js"
  - "src/components/dashboard/BankStatusNotice.tsx"
  - "src/components/settings/BankConnections.tsx"
  - "src/hooks/useBankConnections.ts"
  - "src/hooks/useNow.ts"
  - "src/pages/DashboardPage.tsx"
  - "src/services/bank.service.ts"
  - "test/static/bank-ui-copy.test.js"
  - "test/static/fixed-expense-manual.test.js"
  - "test/static/probe-readonly.test.js"
covered_digest: "v1:sha256:187cd9d978cbef231fc7fac65c268c9cfca710a4b031d1f28e15a2bfd0c2c392"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Entrega real de webhook pelo MeuPluggy (D-07)"
    expected: "Depois que o MeuPluggy mandar um evento, Configuracoes > Bancos mostra 'Ultimo aviso do banco: ha X' (lastWebhookAt deixa de ser null) e o lancamento novo aparece sem acao do usuario. Sem evento em 48 h declara-se 'somente polling'."
    why_human: "Depende de terceiro (MeuPluggy/Pluggy enviar o evento de verdade). Nao e falha: D-07 e o plano 02-06 dizem que nao bloqueia a fase. Todo o caminho do codigo esta provado por teste; so a chegada real do evento nao e observavel agora."
  - test: "Botao Reconectar no caso positivo e renovacao de consentimento (A5)"
    expected: "Quando o consentimento estiver a 30 dias ou menos (ou vencido), o botao Reconectar aparece em Configuracoes > Bancos, abre o widget em modo updateItem e o consentimento e renovado sem criar conexao duplicada."
    why_human: "Hoje o consentimento tem cerca de 364 dias, entao o caso positivo nao e reproduzivel; se o widget renova o consentimento do MeuPluggy e observacao aberta (A5), nao falha."
---

# Phase 2: Revisao de importacoes, contas fixas e webhook - Relatorio de Verificacao

**Phase Goal:** O ledger fica confiavel: os itens importados em revisao sao resolvidos com um toque, o pagamento de conta fixa vindo do banco se vincula a fixa sem contar em dobro, e os dados do banco chegam na hora em vez de so a cada 6 horas.
**Verified:** 2026-11-18
**Status:** human_needed (nenhuma lacuna; restam 2 observacoes abertas que dependem de terceiro/tempo)
**Re-verification:** Nao, verificacao inicial

## Escopo honrado

O dono reduziu a fase em 2026-11-17 (02-CONTEXT D-01 a D-05). Os criterios 1, 3 e a parte de vinculo do criterio 2 do ROADMAP nao se aplicam (REV-01, REV-02, REV-04 e REV-05 constam como descartados em REQUIREMENTS.md). Verificado como NAO construidos de proposito: nenhuma tela, rota ou componente de revisao; nenhum vinculo importado-fixa; nenhum tratamento de estorno. `shared/core/classify.js` e `src/services/fixedExpenses.service.ts` nao tem nenhum commit da fase 2 (ultimo commit de classify e da fase 1, `ff3e325c`).

## Goal Achievement

### Observable Truths (criterios do ROADMAP aplicaveis + must_haves dos planos)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC4/REV-06: evento da Pluggy autenticado por cabecalho secreto sincroniza o item sem acao do usuario; reenvio nao duplica | VERIFIED | `server/src/app.js` L44-77: rota `POST /webhooks/pluggy` fora de `/api`, 401 sem/errado `x-webhook-secret` (`secretMatches`, sha256 + `timingSafeEqual` em `webhook.js`), 200 imediato, depois `sync.syncItem`. `createSeenEvents` descarta eventId repetido. Testes: `app.test.js` (401, query string nao vale, mesmo eventId gera um unico syncItem, 404 sem segredo, /api/sync continua exigindo token) e emulador `sync.test.js` ("webhook ponta a ponta", "replay do mesmo item mantem as contagens de bankImports e transactions") passam |
| 2 | Dono vem de `bankConnections/{itemId}`, nunca do corpo; item desconhecido sem efeito | VERIFIED | `app.js` L62-65 le o documento e retorna se nao existe; `lastWebhookAt` so e gravado apos `snap.exists`; `syncItem` em `sync.js` tambem devolve null para item inexistente (teste emu "item desconhecido resolve com null sem chamar a Pluggy") |
| 3 | Rajada coalesce e serializa com syncAll (nunca duas conexoes ao mesmo tempo); polling de 6 h intacto | VERIFIED | `sync.js` `syncItem` encadeia no mesmo `tail` com `itemRuns` e `again`; `index.js` mantem `setInterval(run, hours*3600*1000)` com `syncAll`. Testes emu "rajada coalesce" e "syncItem e syncAll juntos nunca processam duas conexoes ao mesmo tempo" passam (58/58) |
| 4 | Sem PLUGGY_WEBHOOK_SECRET a rota nao existe e o servidor sobe com aviso | VERIFIED | `index.js` usa lista filtrada e `console.warn`, nao `required()`; `app.js` so registra a rota se `secrets.length > 0`; teste "sem webhookSecret a rota nao existe (404)" |
| 5 | Webhooks registrados na Pluggy (4 eventos, idempotente, segredo nunca impresso, URL validada) | VERIFIED | `server/scripts/register-webhooks.js` existe com `registerWebhooks`, `validateWebhookUrl`, `main`; `register-webhooks.test.js` passa dentro de 81/81. Producao: 4 webhooks registrados (fato verificado pelo orquestrador; 02-06-SUMMARY registra 4 criados) |
| 6 | SC5/REV-07: usuario ve quando o banco foi atualizado e o estado do consentimento, com acao de reconectar | VERIFIED | `shared/core/bankStatus.js` `describeBankFreshness` pura (relogio injetado, limites 48 h e 30 dias, consentimento nulo nao e erro, LOGIN_ERROR/WAITING_USER_* = reconectar); `BankConnections.tsx` mostra "Atualizado ha X", vencido/vence em N dias, "Precisa reconectar" e botao Reconectar condicional; `BankStatusNotice.tsx` na Home (`DashboardPage.tsx` L63) mostra linha discreta ou aviso. `bankStatus.test.js` roda em UTC e Asia/Tokyo (65/65). UAT 1, 2, 3 = pass |
| 7 | Reconectar abre widget em `updateItem` com checagem de dono (IDOR) e sync grava consentExpiresAt/executionStatus/errorCode (so codigo) | VERIFIED | `app.js` L90-109: itemId validado, 404 sem conexao, 403 se `ownerId !== req.owner.hid` ou sem dono, pessoa do documento; `sync.js` grava `consentExpiresAt`, `executionStatus`, `errorCode: item.error?.code` (nunca mensagem); `BankConnections.tsx` `reconnect` usa `new PluggyConnect({ updateItem })` e `registerConnection` (so sync, sem duplicar); nenhum PATCH /items no servidor. Testes emu "item com erro grava so o codigo" e app.test (connect-token itemId) passam |
| 8 | SC2 (parte manual)/REV-03: marcar fixa como paga e manual e nunca cria lancamento | VERIFIED | `fixedExpenses.service.ts` `markAsPaid` grava so em `PAY_COL` (`addDoc(collection(db, PAY_COL))`), sem tocar `transactions`; arquivo sem alteracao na fase 2; `test/static/fixed-expense-manual.test.js` trava (markAsPaid sem lancamentos, hook sem importar servico de lancamentos, `server/src` e `shared/core` sem mencionar fixas), `test:static` 49 pass / 0 fail / 1 skip pre-existente (bundle, so com DIST_SCAN) |
| 9 | Decisoes D-01..D-05: nada de revisao, vinculo, estorno; "N para revisar" removido; classify inalterado | VERIFIED | grep em `BankConnections.tsx` e `bank.service.ts`: unico "review" restante e o campo `review: number` do tipo `SyncSummary` (permitido por 02-04); `classify.js` sem commit da fase 2; trava `bank-ui-copy.test.js` passa |

**Score:** 9/9 truths verified (0 presentes sem comportamento provado: os comportamentos de estado/serializacao tem teste nomeado no emulador).

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `server/src/webhook.js` | VERIFIED | 58 linhas, 5 exports, usado por `app.js` |
| `server/src/app.js` (rota webhook + connect-token itemId) | VERIFIED | Wired antes do `/api`; sem token do Firebase |
| `server/src/sync.js` (`syncItem`, campos de consentimento) | VERIFIED | Exportado e injetado em `index.js` (`sync: { ..., syncItem }`) |
| `server/src/index.js` | VERIFIED | Segredo opcional + PREVIOUS para rotacao |
| `server/scripts/register-webhooks.js` | VERIFIED | Testes passam |
| `server/src/card-probe.js`, `server/scripts/probe-card.js` | VERIFIED | Testes de sentinela e trava `probe-readonly` passam; `02-CARD-PROBE.md` so tem formato |
| `shared/core/bankStatus.js` | VERIFIED | Pura, importada por `BankConnections.tsx` e `BankStatusNotice.tsx` |
| `src/services/bank.service.ts` | VERIFIED | Le `bankUpdatedAt`, `consentExpiresAt`, `executionStatus`, `errorCode`, `lastWebhookAt`, `lastWebhookEvent` do Firestore; `createConnectToken(person | { itemId })` |
| `src/hooks/useNow.ts`, `useBankConnections.ts` | VERIFIED | Usados pelos dois componentes |
| `src/components/settings/BankConnections.tsx` | VERIFIED | Substantivo, sem stub |
| `src/components/dashboard/BankStatusNotice.tsx` | VERIFIED | Montado em `DashboardPage.tsx` |
| Travas estaticas (3) | VERIFIED | Passam |

### Key Links

| From | To | Via | Status |
|------|----|-----|--------|
| app.js | webhook.js | `secretMatches(`, `validateWebhookBody`, `HANDLED_EVENTS`, `createSeenEvents` | WIRED |
| app.js | sync.js | `sync.syncItem(db, pluggy, itemId)` apos o 200 | WIRED |
| sync.js | fila `tail` | `syncItem` encadeia no mesmo `tail`, `itemRuns` | WIRED |
| BankConnections.tsx | bankStatus.js | `describeBankFreshness` | WIRED |
| BankConnections.tsx | POST /api/connect-token | `createConnectToken({ itemId })` + `updateItem` | WIRED |
| sync.js | bank.service.ts | `consentExpiresAt`/`executionStatus`/`errorCode` gravados e lidos | WIRED |
| index.js | Railway env | `process.env.PLUGGY_WEBHOOK_SECRET` | WIRED (producao: 401 sem segredo, confirmado pelo orquestrador) |

### Data-Flow Trace (Level 4)

| Artifact | Variavel | Fonte | Dado real | Status |
|----------|----------|-------|-----------|--------|
| BankConnections.tsx / BankStatusNotice.tsx | `bankUpdatedAt`, `consentExpiresAt`, `lastSyncAt` | `subscribeBankConnections` (Firestore `bankConnections`) <- `syncConnection` grava a partir de `pluggy.fetchItem` | Sim | FLOWING (UAT: "Atualizado ha X" real mostrado ao dono) |
| BankConnections.tsx | `lastWebhookAt` | gravado so pelo handler do webhook | Sem evento real ainda (null) | Caminho provado por teste; entrega real = item humano 1 |

### Behavioral Spot-Checks (executados nesta verificacao)

| Comando | Resultado | Status |
|---------|-----------|--------|
| `npm run test:core:tz` | 65/65 | PASS |
| `npm run test:static` | 49 pass, 0 fail, 1 skip pre-existente | PASS |
| `npm run test:server` | 81/81 | PASS |
| `npm run test:emu` (emuladores auth+firestore) | 58/58 | PASS |
| `npm run build` | tsc -b + vite ok | PASS |
| `npm run lint` | 4 erros + 2 avisos, todos em `src/components/ui/*` (baseline pre-existente) | PASS (baseline) |

Producao (fatos verificados pelo orquestrador, nao refeitos aqui): `/health` 200, `POST /webhooks/pluggy` 401 sem segredo, `POST /api/sync` 401 sem token, Hosting publicado, 4 webhooks registrados.

### Probe Execution

Nenhum probe `scripts/*/tests/probe-*.sh` declarado nos planos. SKIPPED.

### Requirements Coverage

| Requirement | Plano | Descricao | Status | Evidencia |
|-------------|-------|-----------|--------|-----------|
| REV-03 | 02-03 | Marcar fixa como paga e manual e nunca cria lancamento | SATISFIED | Truth 8 |
| REV-06 | 02-01, 02-02, 02-06 | Webhooks autenticados por cabecalho secreto, sync na hora, polling como reserva | SATISFIED no codigo e producao; entrega real pelo MeuPluggy ainda nao observada (item humano 1) | Truths 1-5 |
| REV-07 | 02-04, 02-05, 02-06 | Ultima atualizacao + consentimento + reconectar | SATISFIED | Truths 6-7 |
| REV-01, 02, 04, 05 | (nenhum) | Descartados pelo dono em 2026-11-17 | N/A (nao orfaos: marcados descartados em REQUIREMENTS.md) | CONTEXT D-01..D-03 |

Todos os IDs do frontmatter dos planos (REV-03, REV-06, REV-07) estao contabilizados; nao ha requisito orfao.

### Anti-Patterns

Varredura de TBD/FIXME/XXX/TODO/HACK nos arquivos de implementacao da fase: nenhuma ocorrencia relevante (a varredura de `.env` foi bloqueada pelo guard de segredos e nao foi feita; nenhum `.env*` foi lido). Nenhum stub, retorno estatico ou `console.log` como implementacao. Nenhum BLOCKER.

### Human Verification Required

#### 1. Entrega real de webhook (D-07)

**Test:** Aguardar um evento real do MeuPluggy (ou ate 48 h) e abrir Configuracoes > Bancos.
**Expected:** "Ultimo aviso do banco: ha X" aparece e o lancamento novo chega sem acao. Sem evento em 48 h: registrar "somente polling" (polling de 6 h ja e a reserva).
**Why human:** Depende de terceiro. UAT teste 4 = blocked (third-party). Observacao aberta, nao falha.

#### 2. Reconectar no caso positivo e renovacao de consentimento (A5)

**Test:** Quando o consentimento estiver a 30 dias ou menos, abrir Configuracoes > Bancos e usar Reconectar.
**Expected:** Widget em modo updateItem, sem conexao duplicada, consentimento renovado.
**Why human:** Caso positivo nao reproduzivel agora (consentimento de cerca de 364 dias). Observacao aberta, nao falha.

### Observacoes (nao bloqueantes)

- **Contabilidade de documentos:** `.planning/REQUIREMENTS.md` ainda mostra REV-07 como `[ ]` / "Pending" (REV-03 e REV-06 estao `[x]`), e o ROADMAP mostra a fase 2 com "5/6 plans executed" e checkbox vazio. O codigo de REV-07 existe e foi verificado; atualizar o rastreio ao fechar a fase.
- **Achado para a Fase 6 (nao e gap da fase 2):** a sonda do cartao encontrou 0 contas CREDIT no MeuPluggy; entender isso antes de planejar CARD-01.
- 02-06 nao pode provar em producao "segredo certo + item desconhecido = 200" (so o dono tem o segredo); isso esta coberto por teste de aplicacao.

### Gaps Summary

Nenhuma lacuna. O objetivo reduzido pelo dono (webhook autenticado e idempotente, polling como reserva, frescor e consentimento com Reconectar, pagamento de fixa manual sem lancamento) esta implementado, conectado a dados reais e coberto por testes passando (core 65, servidor 81, emulador 58, estaticos 49). O status e `human_needed` apenas porque duas observacoes dependem de terceiro/tempo (entrega real do webhook e caso positivo do Reconectar); ambas foram declaradas nao bloqueantes pelo plano e pelo dono.

---

_Verified: 2026-11-18_
_Verifier: Claude (gsd-verifier)_

## Aceite do dono

Em 2026-11-18 o dono aprovou a fase ("ta tudo aprovado") e aceitou D-07 (entrega real do webhook, ainda sem evento) e A5 (renovacao pelo Reconectar) como observacoes abertas que nao bloqueiam a fase, conforme o plano 02-06. Status alterado de human_needed para passed por esse aceite.
