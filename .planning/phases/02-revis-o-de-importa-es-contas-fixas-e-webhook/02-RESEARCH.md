# Phase 2: Revisão de importações, contas fixas e webhook - Research

**Researched:** 2026-11-17
**Domain:** Webhooks da Pluggy (Express 5 no Railway), frescor de dados e consentimento de item Open Finance/MeuPluggy, teste somente leitura de cartão de crédito
**Confidence:** MEDIUM-HIGH. O contrato do webhook, as regras de reenvio, o tempo limite e os tipos do SDK foram lidos em fontes oficiais nesta sessão. O ponto que a documentação não responde (se o MeuPluggy entrega eventos) é, por decisão D-07, um teste real, não pesquisa.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Escopo (decisão do dono)**
- **D-01:** Não haverá tela de revisão de importações nem ações de importar/ignorar/vincular. Resposta do dono: "nao vai ter nada duplicado ué, n precisa desse negocio de revisao". — **Reversibility:** reversible — a tela pode ser feita numa fase futura sem migração; os registros em `bankImports` continuam guardando `status` e `reason`.
- **D-02:** Não haverá vínculo entre lançamento importado e conta fixa. Marcar a fixa como paga é sempre manual, em Contas fixas, "serve pra melhor controle dele". Isso é REV-03 e já é o comportamento atual: não pode criar lançamento nem regredir.
- **D-03:** Estorno não tem tratamento especial nesta fase (o dono não reconhece o tema). Nenhuma mudança de comportamento; o que `classify` faz hoje permanece.
- **D-04:** Os itens que hoje estão em `review` não serão resolvidos por esta fase. O dono vai apagar as transações e recomeçar do zero quando for usar de verdade ("nao se importe com transações duplicadas e coisas assim").
- **D-05:** Sem tela de revisão, a lógica de classificação existente em `shared/core/classify.js` (duplicado, transferência própria, pagamento de fatura) fica **inalterada**: itens que ela manda para `review` continuam sendo gravados em `bankImports` com `status: 'review'` e **não viram lançamento**. Nenhum código novo para eles. Sem mensagem "N para revisar" que leve a lugar nenhum: o texto em `BankConnections.tsx` pode deixar de contar/mostrar "para revisar".

**Webhook e atualização do banco (REV-06)**
- **D-06:** Webhooks da Pluggy (`item/updated`, `transactions/created`, `transactions/updated`, `transactions/deleted`), autenticados por cabeçalho secreto, sincronizam na hora; evento reenviado não duplica nada; o polling atual continua sempre ativo como reserva.
- **D-07:** Precisa de teste real no MeuPluggy para saber se os eventos chegam; se não chegarem, o polling segue como único caminho e isso é registrado, sem bloquear a fase.

**Última atualização e consentimento (REV-07)**
- **D-08:** O app mostra "atualizado há X" e o estado do consentimento (vencido ou perto de vencer, com ação para reconectar). Detalhes de onde mostrar ficam com o planejador.

### Claude's Discretion
- Nome do cabeçalho secreto, rota do webhook, formato de idempotência e como guardar o segredo (variável de ambiente no Railway).
- Onde exatamente aparece "última atualização"/consentimento (provavelmente Configurações > Bancos e um indicador discreto na Home).
- Limiar de "prestes a vencer" (sugestão: 30 dias) e texto do aviso.
- Como conduzir o teste somente leitura do cartão (sem dados sensíveis em log; limite de cerca de 4 consultas por mês por CPF por banco).

### Deferred Ideas (OUT OF SCOPE)
- Tela de revisão de importações (REV-01, REV-02) — descartada por ora; reavaliar se aparecerem duplicados reais no uso.
- Vínculo de pagamento importado com conta fixa (REV-04) — descartado; pagamento fica manual.
- Estorno como crédito na categoria (REV-05) — descartado; o dono não reconhece o tema.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REV-03 | Usuário marca uma conta fixa como paga manualmente, e isso nunca cria lançamento | Já é o comportamento: `markAsPaid` só grava em `fixedExpensePayments` e nada no servidor toca fixas. A fase só precisa de um teste estático de não-regressão (§Padrão 5, §Validation Architecture) |
| REV-06 | Servidor recebe webhooks da Pluggy (4 eventos), autenticados por cabeçalho secreto, sincroniza na hora, polling como reserva | Contrato oficial dos eventos e do registro (`createWebhook` no SDK 0.94.3 com `headers`), rota fora do `/api`, resposta imediata (limite de 10 s), `syncItem` coalescido sobre a fila existente, idempotência por dado + `eventId` em memória (§Padrões 1 a 3) |
| REV-07 | Usuário vê a última atualização dos dados do banco e se o consentimento está vencido ou perto de vencer, com ação para reconectar | `Item.lastUpdatedAt`, `Item.consentExpiresAt`, `Item.status`, `Item.executionStatus` existem no SDK; o sync já grava `bankUpdatedAt`/`status`; falta gravar `consentExpiresAt`/`executionStatus`, uma função pura de estado e o reconectar via `createConnectToken(itemId)` + `updateItem` (§Padrão 4) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Fontes: `./CLAUDE.md` e `./.claude/CLAUDE.md` (lidos nesta sessão).

- Mudanças de arquivo passam por um fluxo GSD (`/gsd-execute-phase`, `/gsd-quick`); nada de edição fora do fluxo.
- **Custo zero:** Firebase Spark, Railway, MeuPluggy gratuito. Isso proíbe Cloud Functions e Firestore triggers; o servidor do Railway é quem recebe o webhook. Spark: 20K gravações/dia, então não gravar um documento de deduplicação por evento (§Padrão 2).
- **Privacidade:** nada de CPF, número de conta ou cartão em log ou em documento do repositório. O repositório GitHub é **público** (01-RESEARCH.md), então o relatório do teste de cartão só pode ter formato e contagens (§Padrão 6).
- **Idioma:** interface em pt-BR; comentários do servidor em ASCII sem acento (convenção atual de `server/src`), `shared/core` com acento.
- Convenções: serviços `src/services/*.service.ts`, hooks `{ data, loading, error, ... }`, shadcn/ui + Tailwind, escopo de dono só via `src/lib/scope.ts`, núcleo puro em `shared/core` com `node:test` e relógio injetado (D-11 da Fase 1).
- Segurança do ambiente: nunca ler `.env*` (guarda de segredos). Scripts que precisam de credenciais da Pluggy leem de variáveis de ambiente exportadas **pelo dono** no shell dele (§Padrão 6).
- `.claude/CLAUDE.md` já registra: "Make Pluggy webhooks an optional enhancement only; whether MeuPluggy items support them is not confirmed" e o limite de histórico (~4 chamadas/mês por CPF por banco). Esta pesquisa confirma e detalha ambos.

## Summary

O servidor já tem quase tudo o que o webhook precisa. `bankConnections/{itemId}` usa o **próprio `itemId` como id do documento** e guarda `ownerId` [VERIFIED: server/src/app.js:51 `db.collection('bankConnections').doc(itemId)` e :58 `ownerId,`], então mapear evento → dono é uma leitura por id. `syncConnection` é **idempotente por dado**: cada lançamento da Pluggy vira `bankImports/{tx.id}` e `transactions/bank_{tx.id}`, e quem já existe é pulado [VERIFIED: server/src/sync.js:168-173 `const existing = await getExisting(...)` / `if (existing.has(tx.id)) continue`; :202 `batch.set(db.collection(IMPORTS).doc(tx.id), {`; :199 ``const transactionId = `bank_${tx.id}` ``]. Logo "evento reenviado não duplica nada" (REV-06) é uma propriedade que já existe; o trabalho é **não perdê-la** ao adicionar o gatilho, serializando com a fila `tail` de `syncAll` e agrupando rajadas.

O contrato da Pluggy tem uma correção importante em relação ao que se supunha: o **tempo limite de resposta é 10 segundos, não 5**, com até 3 tentativas (imediata, ~15 min, ~2 h), sem nova tentativa em 400/401/403/404/405 [CITED: v2.docs.pluggy.ai/docs/webhooks]. O cabeçalho secreto só é possível em webhooks criados por `POST /webhooks` (o `webhookUrl` do item não envia cabeçalhos), e o SDK 0.94.3 já expõe `createWebhook(event, url, headers?)`, `fetchWebhooks`, `updateWebhook(id, {headers, enabled})` [VERIFIED: server/node_modules/pluggy-sdk/dist/client.d.ts:355 e types/webhook.d.ts]. O payload não traz token do usuário nem (nos eventos de transação) `clientUserId`; só `itemId` conecta ao dono.

A única incógnita real é D-07: nenhuma página oficial diz se itens do MeuPluggy (plano pessoal) recebem webhooks. O item do MeuPluggy é um item comum da Pluggy cujo conector é OAuth para o MeuPluggy, que "atualiza diariamente" a conexão original [CITED: github.com/pluggyai/meu-pluggy], então `item/updated` provavelmente chega ~1x por dia, mas isso é `[ASSUMED]` até o teste. O desenho deve funcionar nos dois cenários: webhook entrega (sync na hora) ou não entrega (polling de 6 h segue sozinho, e a tela mostra "último aviso recebido" para o dono ver a evidência).

REV-07 é principalmente dado e apresentação: o `Item` do SDK tem `lastUpdatedAt`, `consentExpiresAt` (Open Finance), `status` e `executionStatus` [VERIFIED: types/item.d.ts]. O sync já grava `bankUpdatedAt` e `status` (sync.js:257, :265) mas **não** `consentExpiresAt` nem `executionStatus`, e o cliente (`BankConnection`) não lê `bankUpdatedAt`. Para reconectar, a Pluggy exige um Connect Token **criado com o `itemId`** e o widget aberto com `updateItem` [CITED: v2.docs.pluggy.ai/docs/updating-an-item; VERIFIED: pluggy-connect-sdk 2.15.0 `updateItem?: string`]; o endpoint atual `/api/connect-token` nunca passa `itemId`.

**Primary recommendation:** Registrar uma rota pública `POST /webhooks/pluggy` **antes** do `app.use('/api', ...)`, autenticada por `x-webhook-secret` (comparação em tempo constante contra `PLUGGY_WEBHOOK_SECRET` do Railway), que valida, **responde 200 na hora** e dispara `syncItem(itemId)` (nova função em `sync.js`, na mesma fila de `syncAll`, com coalescência e repetição final); registrar os 4 eventos com um script idempotente local usando `createWebhook`; gravar `consentExpiresAt`/`executionStatus` no sync; uma função pura `describeBankFreshness` em `shared/core` alimenta Configurações e um aviso discreto na Home; e conduzir o teste de cartão com um script que **só emite formato** (allowlist), nunca valores.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Receber webhook e autenticar por cabeçalho | API/Backend (Express no Railway) | — | Chamada servidor-a-servidor da Pluggy, sem token do Firebase; segredo só no servidor |
| Mapear `itemId` → dono | API/Backend + Database (`bankConnections`) | — | O payload não traz dono; o doc `bankConnections/{itemId}` guarda `ownerId` (Admin SDK ignora regras, então o servidor decide) |
| Registrar webhooks na Pluggy | Script local do dono (SDK `createWebhook`) | — | Operação única e idempotente; precisa do segredo e das credenciais Pluggy, que não ficam no navegador nem no repositório |
| Sincronizar item ao receber evento | API/Backend (`syncItem` sobre `syncConnection`) | — | Reaproveita a lógica e a fila existentes; Spark/sem Functions |
| Guardar frescor/consentimento | Database (`bankConnections`, escrito só pelo servidor) | — | O cliente só lê (regras: leitura de `bankConnections` para o dono, escrita do servidor) |
| Decidir "vencido / perto de vencer / desatualizado" | `shared/core` (função pura) | Browser (texto e ícone) | Regra testável e reutilizável pela Home da Fase 3 (LIM-08) e pelo servidor |
| Mostrar "atualizado há X" e botão reconectar | Browser (Configurações > Bancos, aviso na Home) | — | Interface; lê `bankConnections` já inscrito por `subscribeBankConnections` |
| Reconectar (renovar consentimento) | Browser (widget Pluggy Connect em modo `updateItem`) | API/Backend (emite Connect Token com `itemId`, checa dono) | O Connect Token com `itemId` só pode ser criado com a chave de API, que fica no servidor |
| Teste somente leitura do cartão | Script local do dono + função pura testável no servidor | — | Credenciais Pluggy não vão ao Claude; a função de resumo é pura e testada contra vazamento |
| Marcar conta fixa como paga | Browser → Firestore (`fixedExpensePayments`) | — | Já existe; só ganha trava de teste |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `express` | 5.x (instalado em `server/`, `^5.1.0`) | Rota do webhook | Já é o servidor; nada novo [VERIFIED: server/package.json] |
| `pluggy-sdk` | 0.94.3 (instalado) | `createWebhook`, `fetchWebhooks`, `updateWebhook`, `fetchItem`, `createConnectToken(itemId, options)`, `fetchCreditCardBills` | Método de registro já está no SDK [VERIFIED: client.d.ts:341-371] |
| `node:crypto` | Node 22 (built-in) | `createHash` + `timingSafeEqual` para comparar o segredo | Sem dependência; comparação em tempo constante |
| `node:test` | Node 22 | Testes do servidor, do núcleo, estáticos e do emulador | Padrão do projeto (D-11 da Fase 1) |
| `pluggy-connect-sdk` | 2.15.0 (instalado na raiz) | Widget com `updateItem` para reconectar | `updateItem?: string` presente [VERIFIED: node_modules/pluggy-connect-sdk/dist/module/pluggy-connect.d.ts:39] |
| `date-fns` + `date-fns/locale` (`ptBR`) | 4.1.0 (instalado) | "atualizado há X" (`formatDistanceToNowStrict`) | Já é dependência e já é usada com `ptBR` em `src/components/reports/*` [VERIFIED: grep `date-fns/locale`; node -e confirmou `formatDistanceToNowStrict` e `ptBR`] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `firebase-admin` | 14.5.1 (instalado) | Firestore no servidor | Já usado; escrever `lastWebhookAt` etc. com `set(..., {merge:true})` |
| Emulador Firestore (`npm run test:emu`) | firebase-tools 15.9.1 + JRE 21 | Teste de integração do `syncItem` | Exige `source scripts/dev-env.sh` (Node 22.23.5 + JRE) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cabeçalho secreto via `POST /webhooks` | `webhookUrl` com token na query string | A própria Pluggy desaconselha: a URL aparece no Dashboard e em logs, e `webhookUrl` não envia cabeçalhos [CITED: v2.docs.pluggy.ai/docs/webhooks]. Só se `POST /webhooks` falhar no plano do dono (teste da incógnita A2) |
| Deduplicar por documento `webhookEvents/{eventId}` no Firestore | `Set` de `eventId` em memória + idempotência de dado | O documento custa 1 gravação por evento (Spark) e exige TTL no console; o dado já é idempotente. Em memória basta e perder no reinício é inofensivo |
| Allowlist do IP `52.67.145.81` | — | A Pluggy diz que não é suficiente sozinho e o IP pode mudar; atrás do proxy do Railway exigiria `trust proxy`. Não usar |
| Assinar 4 webhooks (um por evento) | Um webhook `all` | `all` recebe pagamentos etc. que o app ignora. Quatro registros casam exatamente com REV-06. Para trocar o segredo, `updateWebhook` nos quatro |

**Installation:** nenhuma dependência nova. [VERIFIED: nada a instalar; `pluggy-sdk` 0.94.3 e `date-fns` 4.1.0 já estão no projeto e foram auditados na Fase 1 (01-01-PACKAGE-EVIDENCE.md).]

**Version verification:** `npm view pluggy-sdk version` → `0.94.3` (igual ao instalado) [VERIFIED: npm registry, 2026-11-17].

## Package Legitimacy Audit

Esta fase **não instala pacotes externos**. `pluggy-sdk` e `date-fns` já estavam no projeto (Fase 1, plano 01-01 tratou os gates de pacotes). Nenhum `checkpoint:human-verify` de instalação é necessário.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none (nenhum novo)

## Architecture Patterns

### System Architecture Diagram

```
                         Pluggy (nuvem)
        ┌────────────────────┬───────────────────────────────┐
        │ evento (POST)      │ auto-sync diário (MeuPluggy)  │
        │ header x-webhook-  │ ou widget updateItem          │
        │ secret             │ dispara item/updated          │
        ▼                    │                               │
  Railway (HTTPS 443)        │                               │
  ┌──────────────────────────┴──────────────┐                │
  │ Express app (createApp)                 │                │
  │  cors → json                            │                │
  │  GET  /health                           │                │
  │  POST /webhooks/pluggy  ◄── fora de /api│                │
  │     1 secret ok? (timingSafeEqual) ─ não → 401 (sem retry)│
  │     2 corpo/evento/itemId válidos?  ─ não → 400 (sem retry)│
  │     3 res.200 IMEDIATO (limite 10 s)    │                │
  │     4 eventId repetido? ─ sim → fim     │                │
  │     5 syncItem(itemId) ─────────────────┼──┐             │
  │  app.use('/api', originGuard,           │  │             │
  │          requireOwner(token Firebase))  │  │             │
  │     POST /api/connect-token {person|itemId}  (reconectar) │
  │     POST /api/connections, /api/sync ...│  │             │
  └─────────────────────────────────────────┘  │             │
                                               ▼             │
   fila única `tail` (sync.js)  ◄── syncAll (agendador 6 h)  │
        │  syncItem coalesce por itemId (+1 repetição final) │
        ▼                                                    │
   bankConnections/{itemId} ── get → ownerId, person         │
        │                                                    │
        ▼  syncConnection (inalterado, idempotente)          │
   Pluggy API: fetchItem / fetchAccounts / fetchAllTransactions
        │                                                    │
        ├─► bankImports/{tx.id}, transactions/bank_{tx.id}   │
        └─► bankConnections/{itemId}: status, executionStatus,│
              bankUpdatedAt, consentExpiresAt, lastSyncAt,   │
              (webhook) lastWebhookAt, lastWebhookEvent       │
                                │
                                ▼ (leitura pelo cliente, onSnapshot por ownerId)
   Browser: describeBankFreshness(conn, now)  [shared/core]
        ├─ Configurações > Bancos: "atualizado há X", consentimento, [Reconectar]
        └─ Home: linha discreta; vira aviso só se desatualizado/vencendo/vencido
   [Reconectar] → POST /api/connect-token {itemId} → widget {connectToken, updateItem}
                → onSuccess → registerConnection(person, itemId) → sync
```

### Recommended Project Structure
```
server/
├── src/
│   ├── app.js            # + rota /webhooks/pluggy (antes do /api); /api/connect-token aceita itemId
│   ├── webhook.js        # NOVO: validação do corpo, mapa evento->ação, comparação de segredo, Set de eventId
│   ├── sync.js           # + export syncItem (fila `tail`, coalescência); + campos no ref.set final
│   ├── card-probe.js     # NOVO: summarizeCardShape() puro (allowlist; sem valores)
│   └── index.js          # + PLUGGY_WEBHOOK_SECRET opcional; sync: { ..., syncItem }
├── scripts/
│   ├── register-webhooks.js  # NOVO: idempotente (fetchWebhooks → create/update/enable)
│   └── probe-card.js         # NOVO: lê Pluggy, imprime só o resumo de formato
└── test/
    ├── app.test.js       # + casos do webhook e do connect-token com itemId
    ├── webhook.test.js   # NOVO (unitário puro)
    ├── card-probe.test.js# NOVO (prova de não vazamento)
    └── emu/sync.test.js  # + syncItem: replay não duplica; campos de consentimento
shared/core/
├── bankStatus.js         # NOVO: describeBankFreshness (puro, relógio injetado)
└── bankStatus.test.js
src/
├── services/bank.service.ts       # BankConnection ganha bankUpdatedAt, consentExpiresAt, executionStatus, lastWebhookAt; createConnectToken(person, itemId?)
├── hooks/useBankConnections.ts    # NOVO: { data, loading, error } sobre subscribeBankConnections (reuso na Fase 3, LIM-08)
├── components/settings/BankConnections.tsx  # + linha de frescor/consentimento, [Reconectar]; textos sem "para revisar"
└── components/dashboard/BankStatusNotice.tsx # NOVO: indicador discreto na Home
test/static/fixed-expense-manual.test.js     # NOVO: trava de REV-03
```

### Padrão 1: Rota do webhook fora do `/api`, resposta imediata, segredo em tempo constante

**What:** `app.use('/api', originGuard(origins), requireOwner(verifyToken))` só intercepta caminhos que começam com `/api` [VERIFIED: server/src/app.js:23]. Uma rota `app.post('/webhooks/pluggy', ...)` registrada **antes** dele não passa pelo token do Firebase nem pela checagem de `Origin` (a Pluggy não envia `Origin`). `cors({ origin: origins })` é global (app.js:18) mas não bloqueia requisição sem `Origin`. O `express.json()` global (app.js:19) já parseia o corpo; no Express 5 `req.body` pode vir `undefined`, daí o `?? {}` que o código atual já usa.

**When to use:** sempre para este webhook. Contrato de resposta (derivado do contrato oficial de reenvio):

| Situação | Resposta | Por quê |
|----------|----------|---------|
| Segredo ausente/errado | `401` | A Pluggy **não** reenvia 401 [CITED: v2.docs.pluggy.ai/docs/webhooks] |
| Corpo inválido (sem `event`/`eventId`/`itemId` válidos) | `400` | Não reenvia 400 |
| Evento fora dos 4 | `200` `{ ok: true, ignored: true }` | Silencioso, sem reenvio |
| Item desconhecido (sem `bankConnections/{itemId}`) | `200` | Não vazar existência, não provocar reenvio |
| Tudo certo | `200` **antes** de sincronizar | Limite de 10 s; sync pode levar mais |
| Erro depois do 200 | só log (`console.error`, sem corpo, sem segredo) | O polling de 6 h é a reserva (D-06) |

**Example:**
```javascript
// Fonte: contrato em https://v2.docs.pluggy.ai/docs/webhooks; padrao do projeto em server/src/app.js
import { createHash, timingSafeEqual } from 'node:crypto'

const sha = (s) => createHash('sha256').update(String(s)).digest()
// Comparar digests (mesmo tamanho) evita vazar o tamanho do segredo e usa tempo constante.
export const secretMatches = (given, expected) =>
  typeof given === 'string' && given.length > 0 && timingSafeEqual(sha(given), sha(expected))

export const HANDLED_EVENTS = new Set([
  'item/updated',
  'transactions/created',
  'transactions/updated',
  'transactions/deleted',
])
const ITEM_ID_RE = /^[A-Za-z0-9-]{8,64}$/   // ids da Pluggy sao UUIDs

// dentro de createApp({ ..., webhookSecret }), ANTES do app.use('/api', ...):
if (webhookSecret) {
  app.post('/webhooks/pluggy', (req, res) => {
    if (!secretMatches(req.get('x-webhook-secret'), webhookSecret)) {
      return res.status(401).json({ error: 'Nao autorizado' })
    }
    const { event, eventId, itemId } = req.body ?? {}
    if (typeof event !== 'string' || typeof eventId !== 'string' || !ITEM_ID_RE.test(String(itemId ?? ''))) {
      return res.status(400).json({ error: 'Evento invalido' })
    }
    res.status(200).json({ ok: true })              // responde ANTES de processar
    if (!HANDLED_EVENTS.has(event) || seenEvent(eventId)) return
    sync.syncItem(db, pluggy, itemId, { event })     // sem await: erros ja sao capturados la dentro
      .catch((err) => console.error('[webhook] sync falhou:', err?.message ?? err))
  })
}
```
(Se `PLUGGY_WEBHOOK_SECRET` não estiver definido, a rota **não é montada** e o servidor registra um aviso; não usar `required()` no segredo, para o deploy do código novo não derrubar o servidor antes de a variável existir.)

### Padrão 2: Idempotência em duas camadas, sem gravação extra

**What:**
1. **Dado (já existe):** `bankImports/{tx.id}` + `transactions/bank_{tx.id}` com id determinístico; sync pula quem já existe (sync.js:168-173, :199, :202). Reenvio do mesmo evento, o evento `all` repetido, ou `item/updated` + `transactions/created` seguidos só repetem leituras.
2. **Evento (barato):** um `Set`/`Map` limitado (por exemplo, 500 `eventId`s recentes) em memória descarta o reenvio imediato. A Pluggy documenta que o `eventId` é o mesmo para o mesmo evento em todos os endpoints e não dá mais orientação [CITED: v2.docs.pluggy.ai/docs/webhooks]. Perder o `Set` no reinício é inofensivo por causa da camada 1.

**Por que não Firestore:** `webhookEvents/{eventId}` custaria uma gravação por evento (Spark: 20K/dia) e precisaria de política de TTL no console. Não compensa.

### Padrão 3: `syncItem` na fila existente, com coalescência e repetição final

**O problema:** `syncAll` serializa tudo numa cadeia `tail` e reaproveita execução em andamento por chave [VERIFIED: server/src/sync.js:280-306]. Um evento por item (e a Pluggy manda `transactions/created` **por conta**, mais `item/updated`) pode chegar em rajada. Rodar `syncConnection` direto em paralelo com o agendador faria duas leituras do mesmo item; o resultado seria idempotente (ids determinísticos), mas desperdiça chamadas e embaralha `usedManualIds`. E reaproveitar uma execução já em andamento **perde** o evento que chegou depois de ela ter lido a Pluggy.

**A solução:** exportar de `sync.js`:
```javascript
// Esboco de padrao (nao e codigo final): uma execucao por item, na MESMA fila `tail` do syncAll,
// com uma repeticao final se chegou novo evento durante a execucao.
const itemRuns = new Map() // itemId -> { again: boolean, promise }

export function syncItem(db, pluggy, itemId) {
  const cur = itemRuns.get(itemId)
  if (cur) { cur.again = true; return cur.promise }
  const state = { again: false }
  state.promise = (async () => {
    try {
      do {
        state.again = false
        const job = tail.then(async () => {
          const snap = await db.collection(CONNECTIONS).doc(itemId).get()
          if (!snap.exists) return null                 // item desconhecido: nada a fazer
          return syncConnection(db, pluggy, { itemId, ...snap.data() })
        })
        tail = job.catch(() => {})
        await job
      } while (state.again)
    } finally {
      itemRuns.delete(itemId)
    }
  })()
  itemRuns.set(itemId, state)
  return state.promise
}
```
O dono vem **sempre** do documento (`ownerId`), nunca do payload; `syncConnection` já recusa conexão sem `ownerId` (sync.js:122-124). `syncConnection` captura os próprios erros (sync.js:271-276), então o laço não fica preso.

**O que os 4 eventos fazem nesta fase:** todos chamam `syncItem`. `transactions/updated` e `transactions/deleted` **não** mudam dados hoje, porque o sync pula tudo que já existe (`existing.has(tx.id)`); isso é consistente com D-03/D-05 (nenhum comportamento novo) e fica como limitação conhecida (o tratamento de pendente→confirmada e de recriação de id é CARD-07, Fase 6). O planejador não deve criar lógica de apagar/atualizar lançamentos aqui.

**Registro e evidência (D-07):** gravar `lastWebhookAt` (Timestamp) e `lastWebhookEvent` (string) em `bankConnections/{itemId}` com `set(..., { merge: true })` quando o evento for de item conhecido. Custa 1 gravação por evento processado (poucos por dia) e dá ao dono a prova de que o MeuPluggy entrega, sem precisar abrir o console.

### Padrão 4: Frescor e consentimento (REV-07)

**Fontes no SDK** [VERIFIED: server/node_modules/pluggy-sdk/dist/types/item.d.ts, lido nesta sessão]:

| Campo do `Item` | Tipo | Observação do SDK |
|-----------------|------|-------------------|
| `status` | `ItemStatus` | `"UPDATED", "UPDATING", "WAITING_USER_INPUT", "WAITING_USER_ACTION", "MERGING", "LOGIN_ERROR", "OUTDATED"` (valores literais de `ITEM_STATUSES`). `LOGIN_ERROR`: "The connection must be updated to execute again, it won't trigger updates until the parameters are updated." `OUTDATED`: "The parameters were correctly validated but there was an error in the last execution. It can be retried." |
| `executionStatus` | `ExecutionStatus` | inclui `SUCCESS`, `PARTIAL_SUCCESS`, `INVALID_CREDENTIALS`, `ACCOUNT_NEEDS_ACTION`, `USER_AUTHORIZATION_NOT_GRANTED`, etc. |
| `lastUpdatedAt` | `Date \| null` | "Last connection sync date with the institution." |
| `consentExpiresAt` | `Date \| null` | "Consent expiration date (Open Finance connections)." |
| `nextAutoSyncAt` | `Date \| null` | `null` = aplicação sem auto-sync, não conexão quebrada [CITED: docs.pluggy.ai/docs/item] |
| `error` | `{ code, message, providerMessage? } \| null` | guardar só `code` |

Há um caso a mais que o tipo `ItemStatus` não lista: ao estourar o limite mensal de um produto Open Finance o item fica **`PARTIAL_SUCCESS`** com aviso 423 [CITED: v2.docs.pluggy.ai/docs/rate-limits-of]. Tratar string desconhecida sem quebrar.

**Semântica de consentimento** [CITED: docs.pluggy.ai/docs/consents]: consentimentos Open Finance **não vencem por padrão** (`expiresAt` nulo; alguns conectores, como Inter PJ, vencem em 1 ano); ao vencer ou ser revogado, os endpoints de dados devolvem **vazio**; a renovação é um **update do item** (o usuário refaz o consentimento) e **não** exige item novo; depois, `consentExpiresAt` recebe nova data. Consequência de desenho: `consentExpiresAt` nulo significa "sem vencimento conhecido", **não** erro; e a falta de dados novos também pode ser consentimento vencido/revogado, então o aviso de "desatualizado" precisa existir mesmo sem `consentExpiresAt`.

**O que gravar no sync** (acrescentar ao `ref.set(..., { merge: true })` de sync.js:255-270): `executionStatus: item.executionStatus ?? null`, `consentExpiresAt: item.consentExpiresAt ? Timestamp.fromDate(new Date(item.consentExpiresAt)) : null`, `errorCode: item.error?.code ?? null`. `bankUpdatedAt` e `status` **já** são gravados (:257 e :265). Itens já conectados ganham os campos novos no próximo sync (polling ou "Sincronizar agora"); **não há migração**.

**Função pura** (`shared/core/bankStatus.js`, padrão `// @ts-check`, relógio injetado, sem dependências):
```javascript
// Esboco de assinatura e regras (limiares sao Discricao; ver Assumptions A7)
export function describeBankFreshness(conn, now, { staleHours = 48, expiringDays = 30 } = {}) {
  // conn: { status, executionStatus, bankUpdatedAt: Date|null, lastSyncAt: Date|null, consentExpiresAt: Date|null }
  // retorna { updatedAt, ageHours, stale, consent: 'none'|'ok'|'expiring'|'expired', daysToExpire,
  //           needsReconnect, level: 'ok'|'warn'|'error' }
}
```
Regras recomendadas: `consent='expired'` se `consentExpiresAt <= now`; `'expiring'` se faltam ≤ 30 dias; `needsReconnect` se `consent==='expired'` ou `status` ∈ {`LOGIN_ERROR`, `WAITING_USER_INPUT`, `WAITING_USER_ACTION`}; `stale` se a idade de `bankUpdatedAt` (ou, na falta, `lastSyncAt`) passa de 48 h (MeuPluggy atualiza ~1x/dia, então 48 h dá margem). `OUTDATED` e `PARTIAL_SUCCESS` são `warn` sem exigir reconexão. Esta função é **a mesma que a Fase 3 (LIM-08) vai usar** para "não elogiar nem dar bronca com número velho"; mantê-la no núcleo evita retrabalho.

**Reconectar** (ação de REV-07):
- Servidor: estender `POST /api/connect-token` para aceitar `{ itemId }`. Carregar `bankConnections/{itemId}`; `404` se não existe, `403` se `ownerId !== req.owner.hid` (mesmo padrão de app.js:67 e :86), e então `pluggy.createConnectToken(itemId, { clientUserId: conexao.person })`. A assinatura do SDK é `createConnectToken(itemId?: string, options?: ConnectTokenOptions)` [VERIFIED: client.d.ts:371]; o código atual passa `undefined` como `itemId` (app.js:37). A Pluggy diz que o token com `itemId` é "necessário por segurança" para atualizar aquele item [CITED: v2.docs.pluggy.ai/docs/updating-an-item].
- Cliente: `new PluggyConnect({ connectToken, updateItem: itemId, includeSandbox: false, onSuccess, onError, onClose })`. `onSuccess` chama o `registerConnection(person, item.id)` que já existe: para item existente do mesmo dono e mesma pessoa ele **só sincroniza** (app.js:67-74). A Pluggy também dispara `item/updated` depois do update; os dois gatilhos colapsam em `syncItem`.
- Limite: a atualização por **API** (`PATCH /items`) em client IDs novos não roda mais de 1x/hora, mas isso **não** vale para o widget [CITED: v2.docs.pluggy.ai/docs/updating-an-item]. Usar sempre o widget; nunca `PATCH /items` a partir do servidor.

**Onde mostrar:**
- **Configurações > Bancos** (`BankConnections.tsx`): por conexão, "atualizado há X" (`formatDistanceToNowStrict(bankUpdatedAt, { locale: ptBR, addSuffix: true })`), estado do consentimento e botão `Reconectar` quando `needsReconnect` ou `consent` for `expiring`/`expired`. Hoje a tela mostra "ultima sync" (`lastSyncAt`, ou seja, quando o **servidor** importou), que não é o mesmo que quando o **banco** atualizou; mostrar os dois com rótulos claros ou preferir `bankUpdatedAt`. Pequena linha de diagnóstico "último aviso do banco: há X" (`lastWebhookAt`) ajuda a cumprir D-07.
- **Home** (`DashboardPage.tsx`): componente `BankStatusNotice` discreto, escondido quando não há conexões; texto neutro quando tudo está bem ("Banco atualizado há 3 h"), destaque só quando `level !== 'ok'`, com link para `/configuracoes` [VERIFIED: src/App.tsx:27 `path="/configuracoes"`]. O texto relativo precisa de um `useNow(60_000)` para não congelar.
- Trocar os textos de `BankConnections.tsx` que contam "para revisar" (linhas 54 e 71: `${s.imported} importados, ${s.review} para revisar.` e `${imported} novos, ${review} para revisar.`) por mensagens só com "novos" (D-05). `SyncSummary.review` pode continuar existindo no tipo.

### Padrão 5: REV-03 não pode regredir

**Fato verificado:** `markAsPaid` grava apenas `{ ownerId, fixedExpenseId, month, year, paidAmount, paidAt }` em `fixedExpensePayments` [VERIFIED: src/services/fixedExpenses.service.ts:151-153] e o hook só chama `markAsPaid`/`unmarkAsPaid` (useFixedExpenses.ts:68, :85). **Nada em `server/src` nem em `shared/core` menciona `fixedExpense`** [VERIFIED: grep -rn "fixedExpense\|fixedExpensePayments" server/src shared/core → sem resultados], logo importar do banco nunca cria nem marca fixa.

**Trava recomendada** (`test/static/fixed-expense-manual.test.js`, no estilo dos testes estáticos existentes, ex.: `no-legacy-auth.test.js`): (a) o corpo de `markAsPaid` em `fixedExpenses.service.ts` não contém `transactions` nem `addTransaction`; (b) `src/hooks/useFixedExpenses.ts` não importa `@/services/transactions.service`; (c) `server/src/**/*.js` e `shared/core/**/*.js` não contêm `fixedExpense`. Barato, roda em milissegundos e protege contra a Fase 3 ligar as duas coisas sem querer. Opcional: ampliar a matriz de regras para garantir que `fixedExpensePayments` continua sendo coleção do cliente (já está em `clientCollections()` em firestore.rules).

### Padrão 6: Teste somente leitura do cartão (trilha paralela)

**O que a documentação garante**, para dimensionar o risco:

| Produto (Open Finance, por CPF/instituição) | Limite mensal | Quando a Pluggy busca |
|---|---|---|
| Lista e detalhes de cartão | 4 | Criação do item e a cada 7 dias |
| Faturas e transações de fatura | 30 | Criação do item e 1x por dia |
| Limites | 240 | A cada atualização |
| Transações recentes (1 a 6 dias) | 240 | A cada atualização |
| Transações não recentes (7 a 365 dias) | 4 | Criação do item e a cada 7 dias |

[CITED: v2.docs.pluggy.ai/docs/rate-limits-of]. A própria página define "chamada" como "the fetches Pluggy makes to the institution during an item update" e **não diz** se as leituras da API sobre dado em cache contam. Por isso o limite crítico (4 por mês) é consumido por **criar item, `PATCH /items`, apagar e recriar o item**, e não por `fetchAccounts`/`fetchCreditCardBills`. Estourar um limite deixa o produto sem atualizar até o mês seguinte (item `PARTIAL_SUCCESS`, aviso 423).

**Regras do script de sonda** (`server/scripts/probe-card.js`):
1. **Somente leitura:** só `fetchItem`, `fetchAccounts`, `fetchAccount`, `fetchCreditCardBills` (e `fetchAllTransactions` com a mesma janela que o polling já usa a cada 6 h). **Proibido** no script: `createItem`, `updateItem`, `PATCH /items`, `deleteItem`, `createConnectToken`. Isso vira uma verificação por `grep` no plano.
2. **No máximo 1 execução por dia** e nenhuma em laço; o script falha se já existir `02-CARD-PROBE.md` do mesmo dia.
3. **Saída = formato, nunca valor.** A função pura `summarizeCardShape({ item, accounts, bills, txs })` (em `server/src/card-probe.js`, testável) devolve só: presença/nulidade e **tipo** de cada campo de `creditData`; os valores de campos enumerados e não identificadores (`brand`, `level`, `status`, `holderType`, `tx.status`, `tx.type`, `creditCardMetadata.paymentType`); contagens (nº de contas `CREDIT`, de faturas, de transações com `installmentNumber`, com `billId`, com `billForecastDate`, com `status: 'PENDING'`); e booleanos derivados (`availableCreditLimit <= creditLimit`, `soma das transações da fatura == totalAmount da fatura`, `dueDate` posterior a `billClosingDate`). **Nunca** imprime `id`, `description`, `merchant`, `cardNumber`, valores em reais, nome do titular, nem JSON cru. Não existe modo "dump".
4. **Teste obrigatório de não vazamento** (`server/test/card-probe.test.js`): fixture com strings sentinela (`'LOJA-SECRETA'`, `'5555 **** **** 1234'`, `'12345678900'`, `987.65`) e asserção de que `JSON.stringify(resumo)` não contém nenhuma delas.
5. **Credenciais:** o script lê `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET` e `--item <id>` do ambiente/argumentos, exportados **pelo dono** no shell. O agente executor não lê `.env*`; a execução real é um passo `checkpoint:human-action`.
6. **Destino do resultado:** o dono cola a saída (que já é segura) em `.planning/phases/02-.../02-CARD-PROBE.md`, que o planejamento da Fase 6 (CARD-01) lê. O repositório é público, então só entra o resumo de formato.
7. **Item "grátis" do item:** incluir no mesmo relatório os campos não sensíveis do item (`status`, `executionStatus`, presença e **dias até** `consentExpiresAt`, presença de `nextAutoSyncAt`, nome do conector). Isso responde de graça às incógnitas A4 e A10 de REV-07.

**O que já se sabe do cartão no código atual** (para a Fase 6, não para esta): `classify` trata conta `CREDIT` assim: valor positivo = compra (`saida`, `imported`), negativo = pagamento da fatura (`ignored`, `card_payment`) ou estorno (`review`, `card_refund`) [VERIFIED: shared/core/classify.js:190-197]. Ou seja, as compras do cartão **já entram hoje como saída** (não mexer nesta fase).

### Anti-Patterns to Avoid
- **Colocar a rota sob `/api`:** o `requireOwner` exige `Authorization: Bearer` e responderia 401 à Pluggy (que não reenvia 401). Fica em `/webhooks/pluggy`.
- **Sincronizar antes de responder:** estoura o limite de 10 s em contas com muitos lançamentos e provoca reenvio.
- **Confiar no payload:** tratar como sinal; o dono vem do documento `bankConnections`, e os dados vêm de `fetchItem`/`fetchAllTransactions` [CITED: v2.docs.pluggy.ai/docs/webhooks, "Treat payloads as signals"].
- **Segredo na query string ou no corpo:** vaza em logs e no Dashboard da Pluggy. Só cabeçalho.
- **`required('PLUGGY_WEBHOOK_SECRET')` no boot:** derruba o servidor no deploy que antecede a variável. Montar a rota só se existir e avisar no log.
- **`===` para comparar o segredo:** use `timingSafeEqual` sobre digests.
- **Registrar o segredo em log, em `console.log(req.headers)` ou na saída do script de registro.**
- **Chamar `PATCH /items` ou criar item novo para "testar" o webhook:** consome o limite de 4/mês de histórico.
- **Subir `createWebhook` repetidamente:** cria duplicatas e o evento chega N vezes (o script precisa listar antes).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Comparação de segredo | `a === b` ou loop próprio | `crypto.timingSafeEqual` sobre `sha256` | Tempo constante; tamanhos diferentes não vazam |
| Registro do webhook | `fetch` manual a `POST /webhooks` | `pluggy.createWebhook(event, url, headers)` / `fetchWebhooks` / `updateWebhook` | Já no SDK 0.94.3 com autenticação e tipos |
| Fila de sincronização | Segunda fila/mutex novo | A cadeia `tail` de `sync.js` + mapa por `itemId` | Uma só fila evita duas leituras do mesmo item |
| Dedupe de evento persistente | Coleção `webhookEvents` | `Set` em memória + ids determinísticos de `bankImports` | Sem custo de gravação nem TTL |
| "Atualizado há X" | Formatador de tempo próprio | `formatDistanceToNowStrict` + `ptBR` (date-fns 4.1.0, já no projeto) | Pluralização e idioma prontos |
| Widget de reconexão | Formulário próprio | `PluggyConnect({ updateItem })` | Cuida de OAuth/MFA/credenciais |
| Fuso e meses | Aritmética de datas | `shared/core/time.js` (`zonedParts`, `monthRange`) quando precisar de "dia" em São Paulo | Já testado em 3 fusos de host |

**Key insight:** o difícil já foi feito (sync idempotente, fila única, escopo por dono). Esta fase é cola fina e **proteção contra regressão**; o maior risco é perder idempotência ou ordem ao paralelizar.

## Common Pitfalls

### Pitfall 1: Achar que o limite de resposta é 5 s
**What goes wrong:** desenhar pensando em 5 s e complicar sem necessidade, ou, no outro extremo, sincronizar antes de responder.
**Why:** o limite documentado é **10 s** ("Your API responds with a 2XX status within 10 seconds") [CITED: v2.docs.pluggy.ai/docs/webhooks]. Qualquer não-2xx, redirecionamento (3xx) ou silêncio conta como falha.
**How to avoid:** validar, responder 200 e só então processar. Não redirecionar (cuidado com proxy forçando `http`→`https`: a URL registrada deve ser a final `https://...`).
**Warning signs:** reenvios aos 15 min nos logs; Dashboard da Pluggy mostrando entregas falhas.

### Pitfall 2: Rota do webhook capturada pelo middleware do `/api`
**What goes wrong:** 401 permanente; a Pluggy não reenvia 401 e para de tentar.
**How to avoid:** registrar `/webhooks/pluggy` fora do prefixo `/api`; teste HTTP provando 200 sem `Authorization` e que `/api/sync` continua 401 sem token.

### Pitfall 3: Webhook desativado por inatividade
**What goes wrong:** o changelog de fev/2026 diz que "URLs that have not received events for an extended period are automatically deactivated" (limiar não informado) [CITED: v2.docs.pluggy.ai/en/changelog/2026.02]. Se o MeuPluggy gerar poucos eventos, o webhook pode ser desativado em silêncio (`disabledAt` preenchido).
**How to avoid:** o script de registro deve, ao listar, tratar `disabledAt != null` com `updateWebhook(id, { enabled: true })` (o tipo `UpdateWebhook` tem `enabled?: boolean` [VERIFIED: webhook.d.ts]); rodar de novo sempre que o dono desconfiar. O polling cobre o intervalo.

### Pitfall 4: `transactions/*` sem `clientUserId`
**What goes wrong:** tentar achar o dono pelo payload. `clientUserId` aparece em eventos `item/*`, **não** em `transactions/*` [CITED: v2.docs.pluggy.ai/docs/webhooks].
**How to avoid:** sempre `bankConnections/{itemId}.ownerId`.

### Pitfall 5: Rajada de eventos e execução perdida
**What goes wrong:** 1 `item/updated` + N `transactions/created` (um por conta) em segundos; reaproveitar a execução em andamento perde o último evento.
**How to avoid:** `syncItem` com `again` (Padrão 3) + teste que dispara 3 eventos durante uma execução lenta e espera exatamente 2 execuções, a última depois do último evento.

### Pitfall 6: Segredo trocado e rejeições silenciosas
**What goes wrong:** ao rotacionar a variável no Railway sem atualizar os webhooks na Pluggy, todos os eventos viram 401 (sem reenvio).
**How to avoid:** ordem de rotação: gerar novo valor → `updateWebhook(id, { headers })` nos 4 → trocar a variável. O próprio servidor pode aceitar `PLUGGY_WEBHOOK_SECRET` e `PLUGGY_WEBHOOK_SECRET_PREVIOUS` durante a janela [CITED: v2.docs.pluggy.ai/docs/webhooks, "Rotate secrets safely"]. `fetchWebhooks()` não devolve os cabeçalhos, então o script **sempre** reaplica `headers` (não tenta comparar).

### Pitfall 7: Railway em modo Serverless ("App Sleeping")
**What goes wrong:** com o modo ativo, o serviço dorme após ~10 min sem tráfego de saída e a 1ª requisição acorda o contêiner; relatos de 502 na primeira chamada [CITED: docs.railway.com/reference/app-sleeping e relatos da comunidade, MEDIUM]. A Pluggy trataria 5xx com reenvio (15 min), mas o agendador de 6 h do `index.js` também deixaria de ser confiável.
**How to avoid:** confirmar no painel do Railway que o serviço **não** está com Serverless ligado (A6). Não é verificável daqui.

### Pitfall 8: Contar "ultima sync" como frescor do banco
**What goes wrong:** `lastSyncAt` é quando o **nosso servidor** rodou; um item em `LOGIN_ERROR` sincroniza "com sucesso" trazendo nada novo e `lastSyncAt` fica fresco.
**How to avoid:** frescor = `bankUpdatedAt` (`item.lastUpdatedAt`); usar `lastSyncAt` só como reserva de exibição.

### Pitfall 9: Vazamento no teste de cartão
**What goes wrong:** colar JSON cru no repositório público ou em log.
**How to avoid:** saída por allowlist, sem modo dump, teste de não vazamento (Padrão 6).

### Pitfall 10: Quebrar o teste do servidor por dependência de ordem
**What goes wrong:** `fakeDb` de `server/test/app.test.js` só tem `doc().get/set/delete`; o webhook novo precisa de `set merge`/`update`.
**How to avoid:** estender o `fakeDb` (a leitura por `doc(itemId).get()` já existe) e usar um `waitFor(() => calls.some(...))` nos testes, já que o processamento é depois da resposta.

## Code Examples

### Registro idempotente dos webhooks (script local do dono)
```javascript
// Fonte: assinatura em server/node_modules/pluggy-sdk/dist/client.d.ts:341-366 e types/webhook.d.ts
// Uso (no shell do dono, com as variaveis exportadas por ele; nunca ler .env pelo agente):
//   PLUGGY_CLIENT_ID=... PLUGGY_CLIENT_SECRET=... PLUGGY_WEBHOOK_SECRET=... \
//   WEBHOOK_URL=https://financiasratim-production.up.railway.app/webhooks/pluggy \
//   node server/scripts/register-webhooks.js
import { PluggyClient } from 'pluggy-sdk'

const EVENTS = ['item/updated', 'transactions/created', 'transactions/updated', 'transactions/deleted']
const need = (n) => { const v = process.env[n]; if (!v) { console.error(`Falta ${n}`); process.exit(1) } return v }

const pluggy = new PluggyClient({ clientId: need('PLUGGY_CLIENT_ID'), clientSecret: need('PLUGGY_CLIENT_SECRET') })
const url = need('WEBHOOK_URL')
const headers = { 'x-webhook-secret': need('PLUGGY_WEBHOOK_SECRET') }
if (!url.startsWith('https://')) { console.error('WEBHOOK_URL precisa ser https'); process.exit(1) }

const { results } = await pluggy.fetchWebhooks()
for (const event of EVENTS) {
  const mine = results.filter((w) => w.event === event && w.url === url)
  if (mine.length === 0) {
    await pluggy.createWebhook(event, url, headers)
    console.log(`criado: ${event}`)
  } else {
    // headers nao voltam na listagem: reaplicar sempre; reativar se desativado por inatividade
    await pluggy.updateWebhook(mine[0].id, { headers, enabled: true })
    console.log(`atualizado: ${event}${mine[0].disabledAt ? ' (estava desativado)' : ''}`)
  }
}
// NUNCA imprimir o valor do segredo.
```
Gerar o segredo: `openssl rand -hex 32` (openssl 3.0.13 disponível) e guardar só em **Railway > Variables** (`PLUGGY_WEBHOOK_SECRET`) e no shell do dono durante o registro.

### Teste HTTP do webhook (padrão `app.test.js`)
```javascript
// Padrao: createApp com deps falsas; webhookSecret injetado; waitFor porque o sync roda depois do 200
test('POST /webhooks/pluggy: sem segredo 401, com segredo 200 e sincroniza o item do dono', async () => {
  db.store.set('bankConnections/item-w1', { ownerId: 'casalA', person: 'ele' })
  const body = { event: 'item/updated', eventId: 'ev-1', itemId: 'item-w1' }
  const bad = await call('/webhooks/pluggy', { method: 'POST', body })
  assert.equal(bad.status, 401)                              // sem Authorization de Firebase: o 401 e do SEGREDO
  const ok = await call('/webhooks/pluggy', { method: 'POST', body, headers: { 'x-webhook-secret': SECRET } })
  assert.equal(ok.status, 200)
  await waitFor(() => calls.some((c) => c[0] === 'syncItem'))
  assert.equal(calls.filter((c) => c[0] === 'syncItem').length, 1)
})
// repetir o mesmo eventId -> continua 200, mas nenhum syncItem novo
```

### Aviso de frescor (cliente)
```tsx
// Fonte: date-fns 4.1.0 (ja usado com ptBR em src/components/reports/*)
import { formatDistanceToNowStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
const ago = (d: Date | null) =>
  d ? formatDistanceToNowStrict(d, { locale: ptBR, addSuffix: true }) : 'sem registro'
// "atualizado " + ago(bankUpdatedAt)  ->  "atualizado há 3 horas"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `createdTransactionsLink` (`/transactions`) em `transactions/created` | `createdTransactionsLinkV2` para aplicações criadas antes de 2026-06-02; o link antigo só existe até 2026-12-31 | 2026-06-02 | **Não usar o link**: o sync já relê via `fetchAllTransactions` (cursor). Evita o corte de 31/12 |
| `fetchTransactions` paginado | `fetchTransactionsCursor` / `fetchAllTransactions` (o sync já usa `fetchAllTransactions`) | SDK recente | Já alinhado [VERIFIED: sync.js:167; client.d.ts:141 marca `fetchTransactions` como deprecated] |
| Webhook só por `webhookUrl` do item | Webhook global por `POST /webhooks` com `headers` | — | Único caminho com cabeçalho secreto |
| Config as Code do Railway | Dockerfile na raiz | 2026-12-01 (`railway.json` deixa de ser lido, 01-RESEARCH) | Fase 1 já usa Dockerfile; nada a fazer |

**Deprecated/outdated:** `id` no payload (`@deprecated` em favor de `eventId` [VERIFIED: types/webhook.d.ts `/** @deprecated id of the entity related to the event (use eventId ...)*/`]); usar `eventId` para deduplicar.

## Assumptions Log

> Itens `[ASSUMED]` precisam de confirmação do dono ou de teste real antes de virarem decisão travada.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Itens do MeuPluggy (plano pessoal) **recebem** webhooks da Pluggy. Nenhuma página oficial confirma ou nega. É o objeto de D-07 | Summary, Padrão 3 | Se não chegarem, o polling de 6 h é o único caminho; o código fica inerte mas inofensivo. Não bloqueia a fase |
| A2 | A aplicação de desenvolvimento (trial de 15 dias do MeuPluggy) permite `POST /webhooks` e continua entregando depois do trial. A doc diz só que "você ainda pode puxar dados" após o trial | Padrão 3, Code Examples | `createWebhook` pode falhar com 4xx; plano B é `webhookUrl` com token na query (pior para segredo) ou ficar só no polling |
| A3 | Leituras de API sobre dado em cache (`fetchAccounts`, `fetchCreditCardBills`, `fetchAllTransactions`) **não** consomem os limites mensais Open Finance. A página define chamada como "fetches Pluggy makes to the institution during an item update" mas não declara explicitamente | Padrão 6 | A sonda poderia gastar cota de faturas (30/mês); mitigado por 1 execução/dia e por nunca disparar atualização |
| A4 | `consentExpiresAt` vem preenchido para itens do MeuPluggy. Pela doc geral, é nulo por padrão e só alguns conectores vencem em 1 ano; `.claude/CLAUDE.md` cita "authorization lasts 1 year" para MeuPluggy (LOW) | Padrão 4 | Se vier sempre nulo, "perto de vencer" nunca aparece; só `status` (`LOGIN_ERROR` etc.) e "desatualizado" avisam. A UI já trata nulo como "sem vencimento conhecido" |
| A5 | `updateItem` sobre um item cujo conector é o OAuth do MeuPluggy reabre a autorização do MeuPluggy e renova a conexão. A doc de update não descreve OAuth/Open Finance | Padrão 4 | O botão Reconectar pode não renovar; fallback: orientar o dono a reautorizar no próprio MeuPluggy e usar "Sincronizar agora" |
| A6 | O serviço do Railway **não** está em Serverless/App Sleeping | Pitfall 7 | Primeira entrega após ociosidade pode falhar/atrasar; o polling e os reenvios cobrem parcialmente |
| A7 | Limiares: "desatualizado" > 48 h; "perto de vencer" ≤ 30 dias (este vem de CONTEXT como sugestão) | Padrão 4 | Só calibração de texto; ajustável por parâmetro da função pura |
| A8 | A Pluggy desativa a URL do webhook após "um período prolongado" sem eventos; o limiar não é publicado | Pitfall 3 | Se o MeuPluggy gerar poucos eventos, o webhook pode sumir sem aviso; o script reativa |
| A9 | A atualização automática do item MeuPluggy ocorre ~1x/dia (README do MeuPluggy: "daily basis") e dispara `item/updated` (`triggeredBy: SYNC`) | Summary | Se for menos frequente, "desatualizado > 48 h" gera falso alarme; calibrar com o relatório da sonda (`nextAutoSyncAt`) |
| A10 | `updateWebhook(id, { headers })` troca os cabeçalhos (tipo `UpdateWebhook = Partial<CreateWebhook> & { enabled? }` confirma o formato, não o comportamento) | Pitfall 6, Code Examples | Rotação de segredo exigiria apagar e recriar o webhook |

## Open Questions

1. **O MeuPluggy entrega webhooks?** (A1/A2)
   - What we know: o contrato é por aplicação (`POST /webhooks` vale para todos os itens); o MeuPluggy é item comum, atualizado diariamente.
   - What's unclear: o plano pessoal/trial entrega ou limita eventos.
   - Recommendation: conduzir o teste de D-07 (§Validation Architecture, itens manuais) e **registrar o resultado em `02-VERIFICATION`/SUMMARY**. Sem entrega em 48 h com `nextAutoSyncAt` passado, declarar "polling único".

2. **Quais lançamentos o dono quer ver "removidos" quando chega `transactions/deleted`?**
   - What we know: hoje o sync nunca apaga nem atualiza; D-03/D-05 mandam não mudar comportamento.
   - What's unclear: se, ao usar de verdade, o dono vai querer propagar exclusões/edições.
   - Recommendation: fora do escopo; registrar como limitação e deixar para CARD-07 (Fase 6) ou para uma fase futura.

3. **A URL pública do Railway é estável?** (`financiasratim-production.up.railway.app`)
   - Mudança de domínio (Fase 5, Coinki) exige reexecutar `register-webhooks.js` com a nova `WEBHOOK_URL`. Anotar no runbook, não bloqueia.

4. **O dono quer um indicador "recebido por webhook" visível ou só no log?**
   - Recomendação: linha pequena em Configurações > Bancos (`lastWebhookAt`); custo mínimo e serve de evidência de D-07.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node (padrão do projeto) | testes, scripts | ✓ (via `source scripts/dev-env.sh`) | 22.23.5 (nvm); shell padrão tem 22.17.1 | usar `dev-env.sh` (pluggy-sdk 0.94.3 exige >=22.23.4) |
| JRE 21 | `npm run test:emu` | ✓ em `~/.local/jdk/current/bin` (fora do PATH padrão) | 21.0.13 | `source scripts/dev-env.sh` põe no PATH |
| `firebase-tools` | emuladores | ✓ | 15.9.1 | — |
| `openssl` | gerar o segredo do webhook | ✓ | 3.0.13 | `node -e "console.log(crypto.randomBytes(32).toString('hex'))"` |
| `curl` | smoke test do endpoint público | ✓ | — | — |
| `railway` CLI | ver logs/variáveis | ✓ instalado (login não verificado; na Fase 1 estava sem login) | — | painel web do Railway |
| Painel Railway (variáveis, logs, Serverless) | segredo e A6 | ✗ não inspecionável daqui | — | passo `checkpoint:human-action` do dono |
| Pluggy Dashboard (log de entregas, reenvio) | D-07 | ✗ não inspecionável daqui | — | passo humano |
| Credenciais Pluggy (`PLUGGY_CLIENT_ID/SECRET`) | registro dos webhooks e sonda | ✗ (guarda de segredos; só o dono) | — | passo `checkpoint:human-action` |

**Missing dependencies with no fallback:** nenhuma que bloqueie a **implementação**. O registro real dos webhooks, o teste do MeuPluggy e a sonda do cartão dependem de credenciais do dono (passos humanos).

**Missing dependencies with fallback:** o `railway` CLI e o painel são o caminho para definir `PLUGGY_WEBHOOK_SECRET`; sem login na CLI, usar o painel.

## Validation Architecture

> `workflow.nyquist_validation` está `true` em `.planning/config.json` (lido nesta sessão).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (built-in, Node 22); sem vitest nesta fase |
| Config file | nenhum; scripts em `package.json` (raiz) e `server/package.json` |
| Quick run command | `npm --prefix server test && npm run test:core && npm run test:static` |
| Full suite command | `source scripts/dev-env.sh && npm --prefix server test && npm run test:core:tz && npm run test:static && npm run test:rules && npm run test:emu && npm run build && npm run lint` |
| Baseline (esta sessão) | server 20/20, core 50/50, static 35 ok + 1 skip: tudo verde antes da fase |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REV-06 | Sem `x-webhook-secret` ou com valor errado → 401, nada sincroniza | unit (HTTP) | `npm --prefix server test` (`server/test/app.test.js`) | ❌ Wave 0 (adicionar casos) |
| REV-06 | Segredo certo + evento válido → 200 imediato e `syncItem` do item do dono (payload com `ownerId` falso é ignorado) | unit (HTTP) | idem | ❌ Wave 0 |
| REV-06 | Cada um dos 4 eventos aciona o sync; evento fora da lista → 200 sem sync; corpo inválido → 400; item desconhecido → 200 sem sync | unit | idem | ❌ Wave 0 |
| REV-06 | Mesmo `eventId` duas vezes → um único `syncItem` | unit | `npm --prefix server test` (`server/test/webhook.test.js`) | ❌ Wave 0 |
| REV-06 | A rota não exige token do Firebase e `/api/sync` continua 401 sem token | unit (HTTP) | `npm --prefix server test` | ❌ Wave 0 |
| REV-06 | Sem `PLUGGY_WEBHOOK_SECRET`, a rota não existe (404) | unit | idem | ❌ Wave 0 |
| REV-06 | `syncItem`: 3 eventos durante uma execução lenta → 2 execuções, a última após o último evento; serializa com `syncAll` (nunca 2 `syncConnection` simultâneos) | unit (Pluggy/db falsos com atraso controlado) | `npm --prefix server test` | ❌ Wave 0 |
| REV-06 | Replay do mesmo evento no emulador: nenhuma duplicata em `bankImports`/`transactions` (contagem igual antes e depois) | integração (emulador) | `source scripts/dev-env.sh && npm run test:emu` (`server/test/emu/sync.test.js`) | ❌ Wave 0 |
| REV-06 | `register-webhooks.js` cria só os que faltam, reativa `disabledAt`, não imprime o segredo | unit (Pluggy falso) | `npm --prefix server test` | ❌ Wave 0 |
| REV-07 | `describeBankFreshness`: limites 30 dias / 48 h, `consentExpiresAt` nulo, `LOGIN_ERROR`, vencido, `OUTDATED`, `PARTIAL_SUCCESS`, string de status desconhecida, relógio injetado, 3 fusos de host | unit | `npm run test:core:tz` (`shared/core/bankStatus.test.js`) | ❌ Wave 0 |
| REV-07 | `syncConnection` grava `consentExpiresAt`, `executionStatus`, `errorCode`, `bankUpdatedAt`; item sem consentimento grava `null` | integração (emulador) | `npm run test:emu` | ❌ Wave 0 |
| REV-07 | `POST /api/connect-token` com `itemId`: 200 para dono (chama `createConnectToken(itemId, …)`), 403 para outro dono, 404 inexistente, 400 sem `person` nem `itemId` | unit (HTTP) | `npm --prefix server test` | ❌ Wave 0 |
| REV-07 | Cliente compila e passa no lint com os novos campos/componentes | tipo/lint | `npm run build && npm run lint` | ✅ infra existe |
| REV-07 | `BankConnections.tsx` não contém mais "para revisar" (D-05) | estático | `npm run test:static` | ❌ Wave 0 |
| REV-03 | `markAsPaid` não toca `transactions`; hook não importa o serviço de lançamentos; `server/src` e `shared/core` não mencionam `fixedExpense` | estático | `npm run test:static` (`test/static/fixed-expense-manual.test.js`) | ❌ Wave 0 |
| Trilha cartão | `summarizeCardShape` não vaza sentinelas (loja, cartão, CPF, valor) e só devolve formato/contagens/enumerados | unit | `npm --prefix server test` (`server/test/card-probe.test.js`) | ❌ Wave 0 |
| Trilha cartão | `probe-card.js` não usa operações de escrita/atualização da Pluggy | estático (grep no teste) | `npm run test:static` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm --prefix server test` (≈1 s) e `npm run test:core` / `npm run test:static` conforme o arquivo mexido.
- **Per wave merge:** suíte completa listada acima (inclui `test:emu` com `source scripts/dev-env.sh`).
- **Phase gate:** suíte completa verde + os testes manuais abaixo registrados antes de `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `server/test/app.test.js`: estender `fakeDb` (`set` com merge) e `fakeSync` (`syncItem`), helper `waitFor`, casos do webhook e do connect-token com `itemId`.
- [ ] `server/test/webhook.test.js`: segredo, validação de corpo, `Set` de `eventId` (puro).
- [ ] `server/test/card-probe.test.js` e fixture com sentinelas.
- [ ] `shared/core/bankStatus.test.js`.
- [ ] `server/test/emu/sync.test.js`: `syncItem` (replay, rajada) e campos de consentimento.
- [ ] `test/static/fixed-expense-manual.test.js` e a trava de "para revisar" e de operações proibidas da sonda.
- [ ] Nenhuma instalação de framework: toda a infraestrutura de teste já existe.

### Verificação manual (não automatizável; `human_verify_mode: end-of-phase`)
| Passo | Justificativa | Como |
|-------|---------------|------|
| Smoke do endpoint público | Prova rota + segredo no Railway sem a Pluggy | `curl -i -X POST https://financiasratim-production.up.railway.app/webhooks/pluggy -H 'content-type: application/json' -d '{"event":"item/updated","eventId":"smoke-1","itemId":"00000000-0000-0000-0000-000000000000"}'` → **401**; repetir com `-H "x-webhook-secret: $PLUGGY_WEBHOOK_SECRET"` → **200** (item desconhecido, sem efeito) |
| Registro dos 4 webhooks | Só o dono tem as credenciais | dono roda `register-webhooks.js`; confirmar 4 linhas "criado" e depois "atualizado" na 2ª execução (idempotente) |
| **D-07: o MeuPluggy entrega?** | Depende da nuvem da Pluggy | (a) ler `nextAutoSyncAt` do item (sonda, só leitura); (b) esperar a atualização automática **ou** abrir o widget `updateItem` do próprio app (no máximo 1x por 7 dias por banco; não usar `PATCH /items`); (c) conferir `lastWebhookAt` em Configurações > Bancos e o log do Railway `[webhook] item/updated`; (d) sem evento em 48 h → registrar "somente polling" |
| Reconectar | A doc não cobre OAuth do MeuPluggy (A5) | dono toca em Reconectar, completa o fluxo e confere que `bankUpdatedAt`/`consentExpiresAt` mudaram |
| Aviso na Home e frescor | Visual | conferir em celular: linha discreta com "atualizado há X"; forçar `consentExpiresAt` próximo no emulador/doc de teste para ver o destaque |
| Sonda do cartão | Credenciais e dados reais | dono roda `probe-card.js` 1x e cola o resumo em `02-CARD-PROBE.md` |

## Security Domain

> `security_enforcement` está habilitado (`workflow.security_enforcement: true`, ASVS nível 1).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (webhook) | Segredo compartilhado em cabeçalho, 32 bytes aleatórios (`openssl rand -hex 32`), comparação em tempo constante; rotas `/api` seguem com token do Firebase |
| V3 Session Management | no | Webhook sem sessão; sessões do cliente seguem do Firebase Auth |
| V4 Access Control | yes | `itemId` → `bankConnections.ownerId` no servidor; connect-token com `itemId` exige `ownerId === req.owner.hid` (anti-IDOR); o payload nunca define dono |
| V5 Input Validation | yes | Lista fechada de eventos, regex de `itemId`, tipos de `eventId`, tamanho do corpo (padrão do `express.json`, 100 kb); corpo malformado → 400 |
| V6 Cryptography | yes | `crypto.timingSafeEqual` sobre `sha256`; nunca `===`; segredo só em variável de ambiente do Railway |
| V7 Error Handling and Logging | yes | Logar só `event` e fragmento do `itemId`; nunca cabeçalhos, segredo, corpo, valores ou nomes; sanitizar `itemId` antes do log (já validado por regex) |
| V8 Data Protection | yes | Sonda do cartão sai por allowlist; repositório público: nada de CPF, número de conta/cartão, descrição, valores |
| V13 API | yes | Rota pública mínima e única; sem CORS aberto para ela; 401/400 sem reenvio da Pluggy |

### Known Threat Patterns for {Express público + webhook de terceiro}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Webhook forjado (qualquer um sabe a URL) | Spoofing | Cabeçalho secreto + `timingSafeEqual`; sem o segredo, 401 barato e sem efeito |
| Reenvio/replay do mesmo evento | Tampering | Idempotência de dado (ids determinísticos) + `Set` de `eventId` |
| Inundação de eventos para esgotar a API da Pluggy ou o Firestore | Denial of Service | Resposta imediata, coalescência por `itemId` (máx. 1 execução + 1 repetição), fila única; só quem tem o segredo chega ao sync |
| IDOR no reconectar (usar `itemId` de outro casal) | Elevation of Privilege | Checar `ownerId` do documento antes de emitir o Connect Token |
| Vazamento do segredo por log, saída do script ou commit | Information Disclosure | Nunca imprimir; variável só no Railway/shell do dono; scripts sem `.env`; repositório público |
| Corpo que força trabalho caro (muitos itens, strings enormes) | DoS | Regex de `itemId`, limite de corpo, só 4 eventos tratados |
| Dados financeiros no relatório do cartão | Information Disclosure | Allowlist + teste de sentinelas; sem modo dump |
| Segredo na URL (query string) | Information Disclosure | Não usar; só cabeçalho (a Pluggy mostra a URL no Dashboard) |

## Sources

### Primary (HIGH confidence)
- `server/node_modules/pluggy-sdk/dist/client.d.ts`, `types/webhook.d.ts`, `types/item.d.ts`, `types/execution.d.ts`, `types/consent.d.ts`, `types/auth.d.ts`, `types/account.d.ts` (CreditData), `types/creditCardBills.d.ts`, `types/transaction.d.ts` (CreditCardMetadata) — lidos nesta sessão (pluggy-sdk 0.94.3).
- `node_modules/pluggy-connect-sdk/dist/module/pluggy-connect.d.ts` — `updateItem`, `forceAskForCredentials` (2.15.0).
- Código do repositório lido nesta sessão: `server/src/app.js`, `auth.js`, `sync.js`, `index.js`, `server/test/app.test.js`, `shared/core/classify.js`, `shared/core/time.js`, `src/services/bank.service.ts`, `src/services/fixedExpenses.service.ts`, `src/hooks/useFixedExpenses.ts`, `src/components/settings/BankConnections.tsx`, `src/pages/DashboardPage.tsx`, `src/App.tsx`, `Dockerfile`, `firestore.rules`, `.planning/*`.
- https://v2.docs.pluggy.ai/docs/webhooks — eventos, payloads de exemplo, limite de 10 s, política de reenvio, verificação e segurança, `POST /webhooks` vs `webhookUrl`.
- https://docs.pluggy.ai/reference/webhooks-create — corpo de `POST /webhooks` (`url`, `event`, `headers`), valores de `event`, exigências de URL (HTTPS, porta 443, domínio público).
- https://v2.docs.pluggy.ai/docs/rate-limits-of — limites operacionais Open Finance por produto, status `PARTIAL_SUCCESS`/423.
- https://docs.pluggy.ai/docs/consents — expiração, renovação por update do item.
- https://v2.docs.pluggy.ai/docs/updating-an-item — token com `itemId`, `updateItem`, limite de 1/hora só na API.

### Secondary (MEDIUM confidence)
- https://docs.pluggy.ai/docs/item — `LOGIN_ERROR`, `nextAutoSyncAt`, re-coleta de 4 dias (lida por resumidor).
- https://github.com/pluggyai/meu-pluggy — fluxo de credenciais do MeuPluggy, "refreshes on a daily basis", trial de 15 dias (lida por resumidor).
- https://v2.docs.pluggy.ai/en/docs/products/credit-card-installments e `/credit-card-bills` — campos de parcelas e faturas, limites por CPF/instituição (lidas por resumidor).
- https://v2.docs.pluggy.ai/en/changelog/2026.02 — desativação automática de URLs inativas (limiar não informado).
- https://docs.railway.com/reference/app-sleeping e guia de Serverless (via busca).

### Tertiary (LOW confidence)
- Relatos da comunidade do Railway sobre 502 no primeiro acesso após suspensão.
- Qualquer afirmação sobre MeuPluggy entregar webhooks ou sobre `consentExpiresAt` nesses itens: só `[ASSUMED]` (A1, A4, A5, A9).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. Nada novo; métodos e campos conferidos nos tipos instalados.
- Architecture (webhook, fila, idempotência): HIGH. Baseada no código lido e no contrato oficial.
- REV-07 (campos e fluxo de reconexão): MEDIUM-HIGH. Campos verificados; comportamento do MeuPluggy em `consentExpiresAt` e `updateItem` é `[ASSUMED]`.
- Entrega de webhook no MeuPluggy: LOW por natureza (D-07 é o teste).
- Cartão (limites e formato): MEDIUM. Se leituras de cache consomem cota é `[ASSUMED]` (A3); mitigado por desenho.
- Pitfalls: HIGH para os do contrato Pluggy/Express; MEDIUM para Railway Serverless.

**Research date:** 2026-11-17
**Valid until:** 2026-12-17 (a Pluggy mexe em webhooks e limites com frequência; o link `/transactions` de `createdTransactionsLink` deixa de existir em 2026-12-31, mas esta fase não o usa).
