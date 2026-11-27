# Fase 8: Visão do casal e multiusuário - Pesquisa

**Pesquisado em:** 2026-11-27
**Domínio:** multi-inquilino (um segundo grupo no mesmo Firebase/servidor), convite e cadastro, segredos por grupo, exclusão de conta, migração entre projetos, aba Casal
**Confiança:** ALTA para o inventário do código; MÉDIA para Pluggy, Firebase Auth e cotas; BAIXA para estimativas de consumo

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Convite e cadastro
- **D-01:** Contas novas só por **link de convite** gerado no app. Quem abre escolhe **sozinho** ou **casal**. Substitui, daqui em diante, o D-04 da Fase 1 (contas só por script); cadastro aberto sem convite continua proibido. — **Reversibility:** costly — cria rota de cadastro no servidor, claims e coleção de convites.
- **D-02:** Só o casal do dono gera convites para grupos novos. Cada link vale **uma vez** e expira em **7 dias**; dá para cancelar antes.
- **D-03:** No modo casal, quem criou a conta gera, nas Configurações, um **segundo link próprio** para o par. Cada pessoa escolhe a própria senha.
- **D-04:** No cadastro, cada pessoa informa **nome** e como o porco a trata: **masculino, feminino ou neutro** (neutro usa só falas sem gênero).

#### Modo sozinho
- **D-05:** Mostra só a área da pessoa e o **Porquinho**. Somem o seletor Ele/Ela e a aba Casal. Converter para casal depois não faz parte desta fase.

#### IA e avisos
- **D-06:** Contas convidadas têm **tudo igual**: IA, avisos e tom escolhido por grupo, com limite diário por pessoa. O sem filtro só liga se a pessoa escolher.

#### Banco
- **D-07:** Cada grupo digita no app o próprio client ID e client secret da Pluggy (MeuPluggy), com passo a passo em Bancos conectados. O servidor guarda **cifrado** e nunca devolve ao celular. As credenciais do dono não são reutilizadas. Sincronização e webhooks por dono. — **Reversibility:** costly — define formato de armazenamento de segredos e o fluxo de sync por grupo.
- **D-08:** Conectar banco é **opcional**; a conta funciona só com lançamentos manuais.

#### Privacidade e saída
- **D-09:** **Sem aviso** na tela de cadastro sobre o acesso técnico de quem administra o servidor (escolha do dono).
- **D-10:** A própria pessoa **apaga a conta** nas Configurações: conta, dados e credenciais do banco. — **Reversibility:** one-way — exclusão não tem volta; exige confirmação forte e escopo estrito por dono.

#### Migração do amigo
- **D-11:** Vem **tudo** do app antigo: lançamentos, contas fixas, metas, Porquinho e calendário, com ensaio, cópia de segurança, relatório de conflitos e repetível sem duplicar.
- **D-12:** Ele usa **uma pessoa só**: migra para o modo sozinho.
- **D-13:** O app antigo **fica no ar**, sem redirecionar. O que for lançado nele depois da migração só entra se ela for repetida.

#### Aba Casal
- **D-14:** Limites **somados por categoria**: uma barra com gasto e teto juntos; tocar abre quanto é de cada um.
- **D-15:** Destaque principal: **"Pode gastar juntos"** (soma do Pode gastar de Ele e Ela).
- **D-16:** Para limites e Pode gastar, **cada um no seu ciclo** de salário, igual à Home de cada pessoa. Cada número indica o escopo.
- **D-17:** Somente leitura; a Home continua individual (CASAL-02).

### Claude's Discretion
- Formato do token de convite, coleção, cifragem das credenciais e estrutura dos scripts de migração.
- Onde a "sobra" aparece na aba Casal (abaixo do destaque) e como conviver com o seletor Ciclo/Mês atual, que hoje recorta pelo ciclo de quem vê e conflita com D-16 para os blocos de entradas e saídas.
- Textos do passo a passo do MeuPluggy.

### Deferred Ideas (OUT OF SCOPE)
- Conta sozinha virar casal depois.
- Convites gerados por qualquer usuário.
</user_constraints>

## Project Constraints (from CLAUDE.md)

| Diretiva | Efeito nesta fase |
|----------|-------------------|
| Interface em português do Brasil | Telas de convite, cadastro, banco, exclusão e Casal |
| Custo zero (Spark, Hosting, Railway, MeuPluggy grátis, IA grátis) | Sem Cloud Functions, sem Blaze, sem serviço novo pago, sem política TTL que dependa de billing |
| Privacidade: IA recebe totais, lojas, eventos e anotações; nunca CPF, números de conta/cartão nem nomes de pessoas físicas; chaves só no servidor | Credenciais Pluggy só no servidor; nunca em log, resposta ou `localStorage` |
| Compatibilidade: manter abas Ele/Ela/Porquinho, calendário, metas, sync; não perder dados nem trocar o projeto Firebase | O casal atual não pode mudar de comportamento; documentos antigos continuam válidos |
| Segurança por regras: `ownerId` em tudo; o Admin SDK ignora regras, então toda consulta do servidor filtra o dono | Vale para as rotas novas |
| `ownerId` = campo, sem subcoleções `users/{uid}`; `hid` vem do claim | Não reestruturar o banco |
| Mock `localStorage` com `VITE_USE_EMULATOR=true` só em dev; services seguem o padrão `MOCK` ou Firestore | Services novos (household) precisam do ramo MOCK |
| Trabalho por fluxo GSD; `npm run build` (tsc), `npm run lint` | Portão de cada plano |
| Memória do projeto: pedido do dono vale mais que regra do projeto (ajustar regra/teste e avisar) | D-01 revoga o "sem cadastro pela interface" do CLAUDE.md: atualizar `CLAUDE.md`/`README.md` e os testes estáticos que o travam |

Divergência conhecida: o `.claude/CLAUDE.md` diz "do not use custom claims for tenancy", mas o código usa os claims `hid`/`person` desde a Fase 1 `[VERIFIED: firestore.rules:10-16]`. **Siga o código** (claims), não essa linha antiga.

<phase_requirements>
## Phase Requirements

| ID | Descrição | Apoio da pesquisa |
|----|-----------|-------------------|
| CASAL-01 | Aba Casal com limites, gastos e sobra somados, com escopo em cada número | Padrão 6: `coupleBudget` puro sobre dois `buildBudgetView`, cada um no próprio ciclo |
| CASAL-02 | Somente leitura; Home individual | Guarda estática: componentes do Casal não importam services de escrita; Home intocada |
| MULTI-01 | Amigo com dados separados; histórico e login migrados sem colisão | Padrões 1, 5 e Armadilhas 1-3 (isolamento antes do segundo grupo) |
| MULTI-02 | Contas por convite; sync e webhooks por dono | Padrões 2, 3 e 4 |
| MULTI-03 | Migração repetível, com ensaio, relatório de conflitos e cópia | Padrão 5 |
</phase_requirements>

## Summary

O isolamento por regras já existe, mas o app ainda é de **um grupo só** em vários pontos que quebram assim que o segundo grupo existir. Além do conhecido `settings/main`, a pesquisa achou três bloqueios que o CONTEXT não cita: (1) os ids de `limitAlerts` e `vintemInsights` não levam o `hid` (`person__ciclo__...`), então dois grupos disputam o mesmo documento; (2) os padrões de código dão a um grupo novo os nomes do casal (`Nirigue`/`Nirigua`) e o tom **sem filtro**, o que viola D-06; (3) o `firebase.rollback.json` volta para `firestore.rules.legacy`, que é `allow read, write: if true`: com um segundo inquilino esse "rollback" expõe tudo.

Nenhum pacote novo é necessário: cifragem e tokens com `node:crypto`, contas com o Admin SDK, limitador já existente em `server/src/limiter.js`. O convite deve ser um token aleatório guardado só como hash, consumido por transação, com `uid` determinístico derivado do convite para tornar o cadastro repetível após falha parcial. As credenciais Pluggy ficam em coleção só do servidor, cifradas com AES-256-GCM, e o servidor passa a resolver um `PluggyClient` por `hid`.

A fase é grande demais para um bloco único. Recomenda-se dividir em ondas/subfases nesta ordem: Casal, endurecimento multi-inquilino, convite e modo sozinho, banco por grupo, exclusão de conta, migração do amigo.

**Recomendação principal:** não criar nenhum segundo grupo (nem o do convite de teste em produção) antes de concluir o endurecimento multi-inquilino e publicar as regras restritivas.

## Architectural Responsibility Map

| Capacidade | Camada principal | Secundária | Motivo |
|------------|------------------|------------|--------|
| Gerar, validar e consumir convite | API (Express) | Firestore | Só o Admin SDK cria usuário e claims |
| Telas de convite e cadastro | Cliente | API | Formulário; nenhuma decisão de acesso |
| Isolamento entre grupos | Regras do Firestore | API (filtro `ownerId`) | O Admin SDK ignora regras: as duas camadas precisam filtrar |
| Perfil do grupo (modo, nomes, gênero) | Firestore `households/{hid}` (escrita do servidor) | Cliente (leitura) | Define o que a interface mostra |
| Credenciais Pluggy | API (cifra e decifra) | Firestore (só texto cifrado) | O celular nunca recebe de volta (D-07) |
| Sync, webhook, cartão por grupo | API | — | Já vivem lá |
| Exclusão de conta | API | Cliente (reautenticação) | Precisa de Admin SDK e retomada após falha |
| Migração do amigo | Script local do dono | Emulador (ensaio) | Operação pontual com chaves de serviço |
| Casal (somas) | Núcleo puro `shared/core` | Cliente | Sem escrita, testável sem DOM |

## Standard Stack

### Core

| Biblioteca | Versão | Uso | Motivo |
|------------|--------|-----|--------|
| `node:crypto` | Node >=22.23.4 | AES-256-GCM, `randomBytes`, `createHash`, `createHmac`, `timingSafeEqual` | Nativo, sem dependência; o webhook já usa `[VERIFIED: server/src/webhook.js:1-34]` |
| `firebase-admin` | `^14.5.1` (instalado) | `createUser` com `uid`, `setCustomUserClaims`, `revokeRefreshTokens`, `deleteUser`, `BulkWriter` | `[VERIFIED: server/package.json, leitura via cat]` |
| `firebase` (cliente) | `^13.4.0` (instalado) | `reauthenticateWithCredential`, login após cadastro | já no projeto |
| `pluggy-sdk` | `^0.94.3` (instalado) | Um `PluggyClient` por grupo; `createConnectToken` com `webhookUrl` | `webhookUrl` e `clientUserId` existem em `ConnectTokenOptions` `[VERIFIED: server/node_modules/pluggy-sdk/dist/types/auth.d.ts:1-11, via grep]` |
| `server/src/limiter.js` | no repo | Freio de rotas públicas | evita `express-rate-limit` novo |

### Alternativas consideradas

| Em vez de | Poderia | Por que não |
|-----------|---------|-------------|
| Convite com hash no Firestore | JWT assinado autocontido | Não dá uso único nem cancelamento sem estado |
| Admin `createUser` | `signUp` no cliente + claim depois | Exigiria cadastro aberto, proibido por D-01 |
| AES-256-GCM com chave em variável do Railway | Cloud KMS / Secret Manager | Exigem billing |
| `webhookUrl` por connect token | `register-webhooks.js` por grupo | A API de webhooks exige "API management" (403 `WEBHOOKS_API_FEATURE_NOT_ENABLED`), desligada por padrão `[CITED: docs.pluggy.ai/en/docs/developer-tools/webhooks-ref]`; o dono já tomou esse 403 `[VERIFIED: .planning/debug/webhook-pluggy-tempo-real.md, via cat]` |

**Instalação:** nenhuma.

## Package Legitimacy Audit

Nenhum pacote externo novo é instalado nesta fase. **Removidos [SLOP]:** nenhum. **Suspeitos [SUS]:** nenhum. Se o planner quiser acrescentar algum, rode `gsd-tools query package-legitimacy check` antes.

## Inventário do que assume um grupo só (pré-requisito)

Linhas obtidas por `grep`/leitura nesta sessão; confira antes de editar.

### A. Documento global `settings/main`

| Arquivo:linha | Uso | Ação |
|---------------|-----|------|
| `src/services/settings.service.ts:16-21` | `DOC_KEY = 'settings::main'`, `SETTINGS_DOC_ID = 'main'`, `settingsRef()` | Resolver `settings/{hid}` com volta para `main` |
| `server/src/sync.js:51` | `getAppCategories` | Helper único no servidor |
| `server/src/push/repo.js:97` | `readSettings` | idem |
| `server/src/ai/snapshot.js:215` | `fetchSettings` | idem |
| `server/scripts/backfill.js:35-36,75`, `server/scripts/verify.js:56` | scripts do cutover da Fase 1 | Não reutilizar após o 2º grupo (ver B) |

### B. Colisões, padrões e ferramentas

| Arquivo:linha | Problema | Gravidade |
|---------------|----------|-----------|
| `shared/core/alerts.js:44-46` | id de `limitAlerts` sem `hid`: `` `${person}__${cycleKey}__${categoryId}__${threshold}` `` | **Bloqueio** |
| `src/services/limitAlerts.service.ts:99-101` | `transaction.get` desse id: se o doc é de outro grupo, dá `permission-denied` e o alerta some | **Bloqueio** |
| `shared/core/insights.js:224` e `:297-298` | id de insight `[person, cycleKey, type, subjectKey, window].join('__')`, validado por `^(ele\|ela)__` | **Bloqueio** |
| `src/services/vintemInsights.service.ts:119` | `setDoc` com esse id | **Bloqueio** |
| `server/src/push/repo.js:147-175`, `server/src/ai/snapshot.js:356-381` | leem ids de `limitAlerts`/`vintemInsights` | Ajustar junto |
| `src/types/index.ts:79` | `DEFAULT_VINTEM_TONE: VintemTone = 'sem-filtro'` | Viola D-06 para grupo novo |
| `server/src/push/repo.js:16`, `server/src/ai/snapshot.js:28` | `DEFAULT_TONE = 'sem-filtro'` | idem |
| `src/types/index.ts:209-214`, `server/src/ai/snapshot.js:29`, `src/services/settings.service.ts:27-28` | nomes padrão `Nirigue`/`Nirigua` | Vazam para grupo novo |
| `shared/core/aiPrompt.js:324,406` | prompt: "app em que um casal controla o dinheiro" | Variar no modo sozinho |
| `server/src/index.js:22-25` | um `PluggyClient` de variável de ambiente | Resolver por `hid` |
| `server/src/index.js:36-44`, `server/src/app.js:54-85` | segredo de webhook único | Manter para o dono; rota nova por grupo |
| `server/scripts/{register-webhooks,probe-card,diagnose-webhooks,card-history,reclassify-card-payments}.js` | credencial de ambiente | Só do dono; `card-history` deve recusar `--hid` diferente do dono |
| `server/scripts/verify.js`, `backfill.js` | tratam `ownerId` diferente como falha/conflito | Quebram com 2 grupos |
| `server/scripts/export-firestore.js` | exporta **todos** os grupos | O backup do dono passa a conter dados do amigo |
| `firebase.rollback.json` e `test/static/firestore-config.test.js:79-83` | rollback aponta para regras abertas | **Bloqueio**: trocar o alvo e o teste |
| `server/src/ai/config.js:106,117-118` | `AI_DAILY_CAP_PER_USER` 100, `AI_OPEN_PER_DAY`/`AI_PEEK_PER_DAY` 200 | Cota grátis passa a ser dividida |
| `server/src/ai/budget.js:155-165` | contador por provedor é global; teto 0 = sem teto | Aceitável com teto de grupos |

Já corretos por `hid` (não mexer): `pushPrefs/{hid}__{person}`, `oincState/{hid}__{person}`, `aiUsage/{hid}__{person}__{dia}`, chave de `aiCache` com hash de `hid|person`, marcadores `pushEvents` de limite e aleatórios, `settingsCache` do snapshot por `hid`, consultas do repo de push. As consultas `listPending` e `listRegistrations` (`server/src/push/repo.js:296-313`) são de sistema de propósito.

**Conferir no plano:** o id dos eventos de vencimento (`dueEvent` em `shared/core/pushDue.js`) deve incluir `hid`; não li essa função inteira.

### C. Chaves de armazenamento do navegador (sem `hid`; colidem se dois grupos usarem o mesmo aparelho)

`oinc:usadas:v1:{person}` (`src/lib/oincHistory.ts:7`), `vintem:baseline:v1:{person}:...` (`src/lib/vintemBaseline.ts:13`, **contém números do mês**), `oinc:rejeitadas:v1` (`src/services/oinc.service.ts:11`), `vintem:written:v1:` (`src/services/vintemInsights.service.ts:25`), `vintem:seen:v1:` (`src/hooks/useVintemInsights.ts:46`), `vintem:recent:v1` (sessão, `src/contexts/VintemContext.tsx:240`), `coinc:push:fid` e `coinc:push:off` (`src/lib/push/messaging.ts:20,22`). Preferências de aparelho que podem ficar: `coinc:tema:v1`, `coinc:onboarding:v1`, `calendarMode`.

**Ação:** limpar as chaves de dados no logout e na exclusão (mais simples que renomear). O FID já registrado para outro grupo recebe 409 (`server/src/push/router.js:38-42`): o logout deve chamar `unregister` antes.

## Modo sozinho e gênero

### Onde se assume que existem `ele` e `ela`

Valores atuais: `export type PersonType = 'ele' | 'ela'` e `export type AreaType = PersonType | 'porquinho'` `[VERIFIED: src/types/index.ts:3-4]`.

**Decisão recomendada:** `person` continua sendo só o **slot da área**. No modo sozinho a pessoa é sempre o slot `ele` (muitas telas já caem em `'ele'` quando a área é o Porquinho). O gênero passa a vir do perfil, nunca do slot.

| Cliente (arquivo:linha) | Ajuste no modo sozinho |
|-------------------------|------------------------|
| `src/components/layout/NavRail.tsx:37`, `src/App.tsx:37` | esconder Casal e redirecionar `/casal` |
| `src/components/layout/ProfileSwitcher.tsx:25-30` | sem parceiro; só nome e Sair |
| `src/contexts/AreaContext.tsx:54-55,145-153` | área sempre a própria ou Porquinho |
| `src/components/savings/SavingsForm.tsx:257-258`, `SavingsHistory.tsx:71` | sem seletor de pessoa |
| `src/components/settings/AppearanceCard.tsx:20-22` | só "Aba 1" e Porquinho |
| `src/components/settings/BankConnections.tsx:121-122,333` | pular "De quem é essa conexão?" |
| `src/components/settings/AccountsCard.tsx:35-36`, `CycleIncomeCard.tsx:108` | um nome só |
| `src/pages/ReportsPage.tsx:140-141,177`, `reports/ComparisonBarChart.tsx:52-53` | esconder comparação |
| `src/pages/{Goals:29,FixedExpenses:33,Calendar:41,Transactions:32}` | já funcionam com slot `ele` |
| `src/hooks/useCalendarActions.ts:93` | grava `person: 'conjunto'`; o calendário inclui `conjunto`, mantém |
| `src/lib/cycleData.ts:18-22` | conta fixa `conjunto` **fica fora** do Pode gastar |
| `src/hooks/useReadOnly.ts:15` | nunca somente leitura |

Servidor: a lista `['ele','ela']` aparece em `app.js:14`, `push/{router.js:5,limits-router.js:3,after-sync.js:4,tick.js:9,notifier.js:23}`, `ai/{routes.js:7,budget.js:14,cache.js:12,state.js:14,snapshot.js:68}`. Elas podem ficar (validam o slot). Só `app.js` precisa recusar `person` que não existe no grupo (`/api/connect-token`, `/api/connections`). `ai/speech.js:48-50` monta o rótulo do parceiro: vazio no modo sozinho.

No casal convidado: criador = `ele`, par = `ela`, independentemente do gênero. Antes de o par entrar, a área dele fica vazia com texto "aguardando".

### Separar gênero

Hoje `[VERIFIED: shared/core/oincSelect.js:69-73]`:

```javascript
export function genderOf(person) {
  if (person === 'ele') return 'm'
  if (person === 'ela') return 'f'
  return null
}
```

Pontos que derivam gênero de `person`: `oincSelect.js:69` (chamado em `VintemContext.tsx:385`), `aiPrompt.js:148-151` (`READER_TEXT`), `:271`, `:322`, `:404`, `server/src/ai/refill.js:25,55,84`, `server/src/push/notifier.js:28,78,97,451`.

**Padrão:** um helper puro `genderFor(person, profile)` que devolve `'m' | 'f' | null`: sem `households/{hid}` (casal atual) mantém `ele→m`, `ela→f`; com perfil usa o campo (`neutro → null`). Passar o gênero como argumento até os pontos acima. Na reposição de falas, linha gerada para neutro grava `g: 'x'`.

O neutro já é viável: o acervo carregado tem 524 falas fora de reescrita, sendo 438 `x`, 43 `m` e 43 `f`, e nenhuma cena com menos de 3 falas `x` (contagem executada nesta sessão sobre `OINC_LINES`); as 15 falas de `OINC_PUSH_LINES` são todas `x`. O banco da Fase 4 (`vintemPhrases*.js`) não tem campo de gênero: criar um teste que procure adjetivos flexionados nele. `READER_UNKNOWN` já existe no prompt, mas a saída da IA para neutro não é garantida pelo validador `[ASSUMED]`.

## Architecture Patterns

### Fluxo

```
Dono (casal) --POST /api/invites--> API --grava hash--> invites/{sha256}
   |  link https://coinc-financias.web.app/convite#<token>
   v
Convidado --POST /public/invite/accept {token,nome,e-mail,senha,gênero,modo}-->
   API: freio por IP -> transação (pendente? não expirou?) -> createUser(uid derivado)
        -> setCustomUserClaims(hid, person) -> households/{hid} + settings/{hid} -> convite "usado"
   v
Cliente: signInWithEmailAndPassword -> claims hid/person -> lê households/{hid}
   |
   +--> Bancos (opcional): PUT /api/bank/credentials -> valida na Pluggy -> cifra -> householdSecrets/{hid}
   |        -> POST /api/connect-token (cliente Pluggy do hid + webhookUrl do hid) -> widget
   |
Pluggy --webhook--> /webhooks/pluggy/h/:hid/:sig -> confere HMAC e bankConnections.ownerId == hid
                    -> syncItem(db, pluggyFor(ownerId), itemId)
Agendador --> syncAll: para cada conexão, pluggyFor(conn.ownerId) (sem credencial = pula)
```

### Arquivos sugeridos

```
server/src/
├── invites.js          # criar, listar, cancelar, aceitar
├── household.js        # perfil do grupo e helper settingsFor(hid)
├── secrets.js          # cifrar/decifrar (puro, testável)
├── pluggy-pool.js      # pluggyFor(hid) com cache por instância
└── account-delete.js   # job retomável
server/scripts/
├── migrate-settings.js # settings/main -> settings/{hid}
├── migrate-legacy.js   # snapshot do app antigo -> grupo do amigo
└── rotate-secrets.js
shared/core/
├── household.js        # normalizeHousehold, genderFor, scopedId (puros)
└── couple.js           # + coupleBudget
```

### Padrão 1: expandir, migrar, contrair

1. `households/{hid}` **ausente** significa "casal legado": modo casal, `ele=m`, `ela=f`, tom padrão atual. Assim nada precisa ser criado para o casal de hoje.
2. `settingsFor(hid)`: usa `settings/{hid}` se existir; senão `settings/main` quando o dono do doc é o `hid`. Cliente e servidor com a mesma regra. Rodar `migrate-settings.js` **depois** que servidor e cliente com essa volta estiverem publicados e os dois aparelhos atualizados; manter `main` como cópia até o fim da fase. Para grupo novo, ler `main` dá `permission-denied`: nunca tentar a volta quando houver `households/{hid}`.
3. Ids com dono: `scopedId(hid, logicalId) = `${hid}__${logicalId}``. A deduplicação deve ser pela **lista** (consulta `where ownerId`), devolvendo o id lógico (sem prefixo) tanto para documentos antigos quanto novos; `markRead` usa o id real do documento. Não fazer `get` do id antigo dentro da transação (outro grupo recebe `permission-denied`). No servidor, `readSilentAlertIds` precisa remover o prefixo.

### Padrão 2: convite e cadastro

- Token: `randomBytes(32).toString('base64url')`; guardar só `sha256` como id do documento. Link com o token no **fragmento** (`#`), que não vai ao servidor de hospedagem; o app lê uma vez e limpa com `history.replaceState` (mesmo estilo de `src/lib/legacyOrigin.ts`).
- `invites/{hash}`: `{ kind: 'grupo' | 'parceiro', hid, person, createdByUid, createdAt, expiresAt, status: 'pendente' | 'consumindo' | 'usado' | 'cancelado' }` (valores propostos). Só servidor.
- Permissão (D-02): `req.owner.hid === process.env.OWNER_HID`. Convite de parceiro (D-03): `households/{hid}.createdByUid === req.owner.uid`, modo casal e slot `ela` vazio; no máximo um pendente.
- Uso único e falha parcial: transação marca `consumindo`; `createUser({ uid: 'inv_' + hash.slice(0, 28), ... })`. Se a repetição achar `auth/uid-already-exists`, é o mesmo convite: continuar. `auth/email-already-exists`: devolver o convite a `pendente` com mensagem fixa. Claims gravados **antes** do primeiro login, então o primeiro ID token já os traz; o cliente já força um refresh se faltar claim `[VERIFIED: src/contexts/AuthContext.tsx, readClaims, via cat]`.
- Servidor grava no cadastro: `households/{hid}`, `settings/{hid}` com `ownerId`, nomes escolhidos, categorias padrão e **`vintemTone` explícito** (recomendado `'suave'` ou `'direto'`; nunca ausente).
- Rotas públicas **fora de `/api`** (que exige token, `server/src/app.js:87`), com `originGuard`, `createLimiter` por IP e global, corpo validado campo a campo, senha mínima 8, respostas genéricas para convite inválido/expirado/usado. Atrás do proxy do Railway, configurar `app.set('trust proxy', 1)` para `req.ip` `[ASSUMED]`.
- `ProtectedRoute` mostra Login quando não há sessão (`src/components/auth/ProtectedRoute.tsx`): a tela de convite precisa entrar **antes** desse portão. Se já houver sessão, pedir para sair primeiro.
- Teto de grupos: `MAX_HOUSEHOLDS` conferido ao criar e ao aceitar convite de grupo.

**Configuração do Firebase Auth (passo humano):** em Authentication > Settings > User actions, desligar criação (e exclusão) pelo usuário final; a web passa a receber `auth/admin-restricted-operation` e o Admin SDK continua criando contas `[CITED: firebase.google.com/docs/auth/users]`. O plano 01-13 registrou isso como **não verificado** `[VERIFIED: .planning/phases/01-funda-o-de-dados-e-acesso/01-13-SUMMARY.md:80, via grep]`. Confirmar também que o provedor anônimo está desligado. A defesa real continua sendo o claim `hid`.

### Padrão 3: segredos por grupo

- AES-256-GCM, IV aleatório de 12 bytes por gravação, tag de 16 bytes, **AAD = `pluggy:v1:{hid}`** (texto cifrado copiado para outro grupo não decifra). `setAAD` antes de `update`, `getAuthTag` depois de `final` `[CITED: nodejs.org/api/crypto.html]`.
- Documento `householdSecrets/{hid}`: `{ ownerId, v: 1, kid, iv, tag, data, updatedAt }`. Client ID e secret juntos dentro de `data`.
- Chave: `SECRETS_KEY` (32 bytes em base64) no Railway; `SECRETS_KEY_PREVIOUS` para rotação (mesmo desenho do `PLUGGY_WEBHOOK_SECRET_PREVIOUS`). `rotate-secrets.js` regrava tudo. Perder a chave = cada grupo digita de novo. Sem a variável, o servidor sobe e só essa função fica desligada. O dono deve guardar cópia da chave fora do Railway.
- Rotas: `GET /api/bank/credentials` devolve só `{ configured, updatedAt }`; `PUT` valida chamando a Pluggy (`createConnectToken()`), só então grava; `DELETE` remove itens e depois o segredo. Nunca devolver `err.message` nessas rotas: hoje `handle` em `server/src/app.js:93-97` devolve a mensagem crua.
- `pluggyFor(hid)`: (a) há segredo, usa-o; (b) `hid === OWNER_HID`, cliente de ambiente; (c) senão `null`. **Nunca** cair no cliente do dono para outro `hid` (o item seria criado na aplicação Pluggy do dono, violando D-07). `OWNER_HID` deve ser obrigatório (`required()`), definido no Railway **antes** do deploy. Cache da instância por `hid`, invalidado ao trocar segredo (o SDK guarda a chave de API na instância `[VERIFIED: server/node_modules/pluggy-sdk/dist/baseApi.js:113-128, via grep]`).
- Assinaturas: `sync.js` (`syncAll`, `syncItem`, `syncConnection`), `withAfterSync`, `createApp` e o agendador (`index.js:76-86`) recebem o resolvedor no lugar de `pluggy`. Conexão sem credencial vira `lastSyncError` fixo, sem derrubar a rodada. A fila única `tail` continua (um grupo lento atrasa os outros; aceitável neste porte).

### Padrão 4: webhooks por grupo

- `createConnectToken(itemId, { clientUserId: `${hid}:${person}`, webhookUrl })`. `webhookUrl` não envia cabeçalho; a doc sugere token impossível de adivinhar na URL `[CITED: docs.pluggy.ai/en/docs/developer-tools/webhooks-ref]`.
- URL proposta: `${PUBLIC_SERVER_URL}/webhooks/pluggy/h/{hid}/{HMAC-SHA256(WEBHOOK_URL_KEY, hid)}`. Responder 200 antes de processar; só aceitar `itemId` cujo `bankConnections.ownerId === hid`.
- O usuário convidado **não** precisa configurar webhook no painel. O polling de 6 h segue como reserva; o MeuPluggy só atualiza a cada 24 h, então o ganho do webhook é pequeno.
- Não confirmado: se itens espelho do MeuPluggy criados pelo widget disparam para o `webhookUrl` do token `[ASSUMED]`. Tratar como melhoria opcional com teste real.
- A rota atual com `x-webhook-secret` fica para o dono.

### O que o MeuPluggy pede de um usuário novo (base do passo a passo)

1. Criar conta em meu.pluggy.ai e autorizar cada banco `[CITED: docs.pluggy.ai/en/docs/guides/meu-pluggy-personal-use]`.
2. Entrar em dashboard.pluggy.ai com a **mesma conta** e habilitar o conector MeuPluggy (Customization > Connectors, se a seleção for personalizada) `[CITED: mesma página; docs.pluggy.ai/en/docs/guides/dashboard-connectors]`.
3. Criar a aplicação (Development) e copiar o Client ID; o Client Secret **aparece uma vez só** (dá para gerar outro) `[CITED: dashboard-connectors]`.
4. No guia oficial há ainda o passo de conectar no Demo para obter o `itemId` `[CITED: github.com/pluggyai/meu-pluggy]`; no Coinc o widget já cria o item, como acontece com o dono `[ASSUMED: dispensa o passo do Demo]`.
5. No Coinc: Configurações > Bancos conectados > colar ID e secret > Conectar banco, uma vez por banco.

Limites: uso pessoal, até 5 conexões, sem uso comercial, não expira com o teste de 15 dias do painel; autorização vale 1 ano e a renovação pode mudar o id do item `[CITED: meu-pluggy-personal-use]`. Listar itens pela API é bloqueado nesse plano (403) `[CITED: resultado de busca em docs.pluggy.ai]`.

### Padrão 5: migração do app antigo

**Modelo legado** (lido do histórico, commit `7640bca0`, 2026-08-26): coleções `transactions`, `fixedExpenses`, `fixedExpensePayments`, `savings`, `goals`, `goalContributions`, `events`, `eventCategories`, `notes`, `settings` (doc `main`), todas **sem `ownerId`** e sem `categoryId`; documentos criados por `addDoc` (ids automáticos); login local com usuário/senha em variáveis de ambiente **ou** Firebase Auth `[VERIFIED: git show 7640bca0:src/types/index.ts e src/services/*; AuthContext]`. O servidor do Railway não atende o amigo, então não há dados bancários dele aqui `[VERIFIED: 01-12-SUMMARY.md:22,47, via grep]`. A versão realmente publicada no `financias-xrd` é **desconhecida**: o script deve tolerar campos a mais ou a menos.

**Passos:**
1. Dono (ou amigo) gera chave de serviço do `financias-xrd`; `export-firestore.js --out backups/amigo-<data>.json` com essa chave (script existente, sem mudança; a chave fica fora do repositório, `server/scripts/lib/admin.js`).
2. Amigo cria a conta **por convite, modo sozinho** (login novo e senha nova). Não importar hashes de senha.
3. Exportar o destino (cópia de segurança do `financias-ratimbum`, validada por `assertRecentBackup`).
4. Ensaio no emulador: importar o backup do destino, rodar `migrate-legacy.js` duas vezes, conferir que nenhum documento de outro `ownerId` mudou e que a segunda rodada escreve zero.
5. `migrate-legacy.js --source <arquivo> --hid <hid> --person ele` (simulação por padrão), depois `--apply`.

Abordagem por **arquivo** evita ter as duas credenciais no mesmo processo.

**Regras de transformação:**

| Item | Regra |
|------|-------|
| Ids | `xrd_{idOrigem}`; reescrever `goalContributions.goalId` e `fixedExpensePayments.fixedExpenseId` |
| Pagamentos | id `paymentDocId('xrd_'+billId, year, month)` (formato `` `${billId}__${year}-${mm}` `` `[VERIFIED: shared/core/ids.js, via cat]`); dois pagamentos no mesmo mês na origem = conflito no relatório |
| `ownerId` | o `hid` do amigo em tudo |
| `person` | slot dele em tudo, **inclusive `conjunto`** em contas fixas (senão saem do Pode gastar), eventos e Porquinho |
| Meta sem `person` | slot dele |
| Dados nas duas abas na origem | listar no relatório e pedir decisão antes do `--apply` |
| `categoryId` | `ensureCategoryDefs`/`resolveCategoryId` como em `backfill.js`; órfãs arquivadas |
| `settings` | mesclar em `settings/{hid}`: categorias, nome da aba dele, Porquinho, vencimento; não copiar `theme`; não sobrescrever `vintemTone` |
| Valores e datas | sem conversão; `Timestamp` preservado pelo formato do snapshot |
| Coleção desconhecida | abortar e listar |

**Repetição (D-13):** usar `create()`, nunca sobrescrever (edições feitas no Coinc ficam). Guardar `migrationLedger` (só servidor, em blocos por coleção para não passar de 1 MiB por documento) com id de origem e hash: item já migrado e apagado no Coinc **não ressuscita**; item alterado na origem vira linha de "conflito" no relatório. Conferência final: contagem e soma em centavos por coleção. Cota: 20 mil escritas/dia; o script deve ser retomável.

**Aviso ao dono:** se o `financias-xrd` ainda usa regras como `firestore.rules.legacy` (`allow read, write: if true`), os dados do amigo estão abertos, e D-13 mantém o app no ar. Não verificado (nenhum projeto foi acessado) `[ASSUMED]`.

### Padrão 6: aba Casal

- Buscar com `useCycleBudget('ele')` e `useCycleBudget('ela')`: cada um já usa o próprio ciclo (`cycleFor(person)`) e o mesmo `buildBudgetView` da Home, então os números batem por construção.
- Função pura `coupleBudget({ first, second, defs })` em `shared/core/couple.js`:
  - `safeTogetherCents = first.safeCents + second.safeCents` (negativo soma negativo);
  - sobra = soma de `monthInOne.sobra.cents`, marcada como estimativa se qualquer lado for `projected`;
  - linhas por categoria = união de `view.spend.rows`; limite e gasto somados **só de quem tem limite** naquela categoria; quem não tem aparece no detalhe como "sem limite, gastou R$ X" (proposta, ver Questões em aberto);
  - `hasIncome` falso em um lado: avisar "sem renda informada", porque o `safeCents` dele fica negativo.
- Cada número com escopo: "juntos", nome e rótulo do ciclo (`cycleLabel`).
- **Seletor Ciclo/Mês:** recomendação de menor mudança: os blocos novos (Pode gastar juntos, sobra, limites) ficam **acima** do seletor e sempre usam o ciclo de cada um (D-16); o seletor desce e passa a titular só a comparação existente, que segue como hoje (janela única, com "Recorte do ciclo de X"). Não quebra `useCoupleData` nem `test/static/phase3-1-couple.test.js`, que exige `cycleFor(viewPerson)` e duas chamadas de `getTransactionsInRange`. O deslocamento do topo vale para os dois (cada um no seu).
- Somente leitura: nenhum import de service de escrita nos componentes; Home intocada.
- Custo: mais duas cargas de lançamentos, contas e pagamentos por visita.

### Exclusão de conta (D-10)

**Coleções e escopo** (lista levantada por `grep` de `collection(` e constantes em `src/services` e `server/src`):

| Coleção | Chave de pessoa | Pessoa que sai (par fica) | Último membro |
|---------|-----------------|---------------------------|---------------|
| `transactions`, `fixedExpenses`, `goals`, `notes`, `events`, `limitAlerts`, `vintemInsights` | `person` | apaga as dela (manter `conjunto`) | apaga |
| `fixedExpensePayments` | via `fixedExpenseId` | as das contas apagadas | apaga |
| `goalContributions` | via `goalId` | as das metas apagadas | apaga |
| `savings` | `person` | **manter** (saldo é do casal; ver questão) | apaga |
| `eventCategories`, `settings/{hid}` | — | manter; remover `personConfig.{person}` | apaga |
| `bankConnections`, `bankImports`, `cards` | `person` | apaga (antes `pluggy.deleteItem`) | apaga |
| `cardSettings` | via `accountId` | as dos cartões dela | apaga |
| `pushRegistrations`, `pushPrefs`, `pushEvents`, `aiUsage`, `aiCache`, `oincState` | `ownerId` + `person` | apaga | apaga |
| `householdSecrets/{hid}` | — | manter se o par tiver conexão | apaga |
| `households/{hid}` | — | marcar slot vazio | apaga |
| `invites`, `migrationLedger` | `hid`/uid | cancelar os dela | apaga |
| Firebase Auth | uid | `deleteUser` | `deleteUser` |
| Aparelho | — | limpar `localStorage` da seção C | idem |

**Fluxo:**
1. Cliente: `reauthenticateWithCredential` com a senha, `getIdToken(true)`, digitar "APAGAR".
2. Servidor: `verifyIdToken(token, true)` e `auth_time` recente (até 5 min) `[CITED: firebase.google.com/docs/auth/admin/manage-sessions]`.
3. Grava `accountDeletions/{uid}` (só servidor) e responde 202. O job é idempotente e **retomado na subida do servidor**.
4. Ordem: `revokeRefreshTokens`; apagar inscrições de push; remover itens na Pluggy; apagar `bankConnections` (para webhook e agendador); dados em lotes de até 400; segredo; `households`/`settings`; **Auth por último**.
5. Rodar pela mesma fila do sync (`tail`) para uma importação em andamento não recriar dados. ID token antigo vale até cerca de 1 h: fazer uma segunda varredura depois desse prazo.
6. Conta da pessoa dona (`OWNER_HID`): recomendo bloquear pela interface até o dono decidir.

Exclusão pelo cliente fica bloqueada quando "User actions" é desligado, então precisa ser pelo servidor. Não usar `recursiveDelete` por coleção inteira: apagaria todos os grupos.

### Antipadrões

- Usar `hid`, `person` ou `ownerId` vindos do corpo em rota autenticada.
- Copiar `settings/main` por cima ou usar "coleção inteira" em script que apaga ou migra.
- Cair no cliente Pluggy do dono quando falta credencial.
- Colocar o token do convite em query string ou log.
- Hardcode do `hid` do casal no código (usar `OWNER_HID` ou "sem `households`").

## Don't Hand-Roll

| Problema | Não construir | Usar | Motivo |
|----------|---------------|------|--------|
| Cifragem | CBC + HMAC próprios | `aes-256-gcm` com AAD | autenticação embutida |
| Senhas e contas | tabela de usuários | Firebase Auth via Admin SDK | hash, bloqueio, tokens |
| Token de convite | contador ou `Math.random` | `randomBytes(32)` | entropia |
| Uso único | ler e depois escrever | `runTransaction` | corrida |
| Backup e restauração | script novo | `export-firestore.js` (`exportAll`, `importAll`, `assertEmulator`) | já testado |
| Pode gastar do casal | fórmula nova | `buildBudgetView` por pessoa e somar | não divergir da Home |
| Escrita em massa | `Promise.all` solto | `BulkWriter` com `onWriteError` | padrão do `backfill.js` |

## Runtime State Inventory

| Categoria | Itens | Ação |
|-----------|-------|------|
| Dados gravados | `settings/main`; `limitAlerts` e `vintemInsights` sem prefixo; todo o `financias-xrd` | migração de dados (settings); leitura compatível (ids); migração (amigo) |
| Config de serviço vivo | Railway: variáveis novas `OWNER_HID`, `SECRETS_KEY`, `PUBLIC_SERVER_URL`, `WEBHOOK_URL_KEY`, `MAX_HOUSEHOLDS` (nomes propostos); conferir `AI_*`; Firebase Auth "User actions"; webhooks do dono no painel Pluggy | passos humanos |
| Registrado no SO | Nenhum (não há tarefa agendada nem serviço local no repositório) | nada |
| Segredos | credenciais Pluggy do dono continuam em variáveis; chave nova de cifragem; chave de serviço do `financias-xrd` (temporária, fora do repo, revogar depois) | criar e revogar |
| Artefatos instalados | PWAs nos celulares com cliente antigo (lê `settings/main`, grava ids sem prefixo) | manter compatibilidade até atualizarem; só então contrair as regras |

## Regras, índices e ordem de deploy

### Mudanças nas regras

Hoje `[VERIFIED: firestore.rules:24-36]`:

```
allow read, delete: if isMember() && col in clientCollections() && ownsExisting();
allow create: if isMember() && col in clientCollections() && ownsIncoming();
...
allow get: if isMember() && col in ['settings', 'limitAlerts'] && resource == null;
...
allow read: if isMember() && col in ['bankConnections', 'bankImports', 'cards'] && ownsExisting();
```

com `clientCollections()` = `['transactions', 'fixedExpenses', 'fixedExpensePayments', 'savings', 'goals', 'goalContributions', 'events', 'eventCategories', 'notes', 'settings', 'limitAlerts', 'vintemInsights', 'cardSettings']` `[VERIFIED: firestore.rules:17-21]`.

1. **Aditiva:** `match /households/{hid} { allow get: if isMember() && hid == request.auth.token.hid; }`. Sem escrita do cliente. Também permitir `get` de doc inexistente nesse caminho (é o caso do casal legado).
2. **Restritiva (depois do cliente novo):** `settings`: criar e `get` de inexistente só com `id == request.auth.token.hid`. Sem isso, um grupo pode **criar `settings/{hid de outro}`** com o próprio `ownerId` e trancar o outro grupo fora. `limitAlerts`/`vintemInsights`: `create` só com id começando por `hid + '__'`.
3. `invites`, `householdSecrets`, `migrationLedger`, `accountDeletions`: ficam negadas por padrão; acrescentar à lista `SERVER_COLS` dos testes (`test/rules/matrix.test.js`, `test/static/phase7-rules.test.js`).
4. **Somente leitura do parceiro:** comentários no código dizem "Fase 8 aplica nas regras" (`AreaContext.tsx:23`, `useReadOnly.ts:7`, `CategoryEditorSheet.tsx:79`, `CategoriesCard.tsx:64`, `CycleIncomeCard.tsx:105`), mas o 08-CONTEXT não pede. Não incluir sem confirmação.

**Índices:** nenhum novo previsto (consultas novas são de um campo ou só igualdades). Confirmar com o `check-indexes` se algum plano criar consulta com ordenação.

### Ordem

| Passo | Ação | Rollback |
|-------|------|----------|
| 0 | `export-firestore.js` do projeto; guardar regras atuais como `firestore.rules.pre-fase8` e **repontar `firebase.rollback.json`** (e o teste) | — |
| 1 | Publicar regras aditivas | regras pré-fase 8 |
| 2 | Definir variáveis no Railway; publicar servidor (resolvedor, `settingsFor`, rotas novas; convites desligados) | redeploy anterior |
| 3 | Publicar site (compatível, Casal, perfil) e esperar os dois aparelhos atualizarem | release anterior do Hosting |
| 4 | `migrate-settings.js --apply` | apagar `settings/{hid}`; `main` segue intacto |
| 5 | Publicar regras restritivas | pré-fase 8 |
| 6 | Desligar "User actions"; ligar convites; testar com conta descartável e apagá-la | desligar convites |
| 7 | Convidar o amigo; migrar | exclusão do grupo do amigo (nunca restauração total) |

Depois que existir um segundo grupo, o rollback do **cliente/servidor** para versão que usa `settings/main` ou o cliente Pluggy único deixa de ser seguro para ele: desligar convites primeiro. A 07.1 já está publicada (`f8a7efc5`), mas o aceite dela segue pendente `[VERIFIED: .planning/phases/07.1-falas-do-oinc-com-qualidade/.continue-here.md, via cat]`: evitar misturar correções dela nos deploys desta fase.

## Cotas grátis com mais grupos

| Serviço | Limite | Impacto |
|---------|--------|---------|
| Firestore (Spark) | 50 mil leituras, 20 mil escritas, 20 mil exclusões/dia; 1 GiB no total; estourar desliga o produto `[CITED: firebase.google.com/pricing; docs.cloud.google.com/firestore/quotas]` | Dividido entre todos |
| Cloudflare Workers AI | 10.000 neurons/dia, reinicia 00:00 UTC; depois dá erro `[CITED: developers.cloudflare.com/workers-ai/platform/pricing]` | Cai no próximo provedor/acervo |
| Groq | a tabela lida mostra, para `qwen/qwen3.8-27b`, 30 RPM, 1 mil RPD, 8 mil TPM, 200 mil TPD, apresentada como **plano Developer**; os números do plano grátis não vieram `[CITED: console.groq.com/docs/rate-limits]` | Conferir na tela de limites da conta |
| Railway | Free: US$ 1 de crédito/mês; Hobby: US$ 5/mês `[CITED: docs.railway.com/pricing/plans]` | Plano do dono não verificado; a carga extra é pequena `[ASSUMED]` |
| Firebase Auth | 100 cadastros/hora por IP `[CITED: firebase.google.com/docs/auth/limits]` | irrelevante |

Estimativas `[ASSUMED]`: o prompt medido tem cerca de 2.000 caracteres mais a saída (limite 120 tokens vezes o fator), algo como 700 a 1.000 tokens por chamada; 200 mil TPD dariam umas 200 a 280 chamadas por dia para **todos**, enquanto o teto atual é 100 por pessoa. Recomendo `AI_DAILY_CAP_PER_USER` perto de 40 e `MAX_HOUSEHOLDS` 3 a 4. Maiores leitores no Firestore: cada sync lê todos os `bankImports` da pessoa (`server/src/sync.js:171`), cresce com o histórico, 4 vezes por dia por conexão mais webhooks; `fetchPorquinho` lê todo o `savings` do grupo; o relógio lê todas as inscrições a cada 15 min. Antes de convidar, olhar o consumo atual no console.

## Divisão recomendada

A fase tem pelo menos 6 frentes quase independentes, com um passo sem volta (exclusão) e um de dados reais (migração). Recomendo subfases (8, 8.1, 8.2...) ou, no mínimo, ondas com portão:

| Ordem | Entrega | Requisitos | Portão |
|-------|---------|------------|--------|
| A | Aba Casal | CASAL-01, 02 | UAT do dono; não depende do resto |
| B | Isolamento: settings por grupo, ids com dono, perfil/gênero, padrões neutros, chaves locais, rollback seguro, regras | base de MULTI-01/02 | testes com dois `hid` no emulador; casal atual sem diferença |
| C | Convite, cadastro, modo sozinho, convite do par | MULTI-02 | conta descartável de ponta a ponta |
| D | Banco por grupo: segredos, resolvedor, webhook | MULTI-02 | teste real com a conta Pluggy de outra pessoa |
| E | Exclusão de conta | D-10 | ensaio no emulador antes de qualquer convidado real |
| F | Migração do amigo | MULTI-01, 03 | ensaio OK e relatório sem conflito |

Como o ROADMAP marca `mode: mvp`, cada linha é uma fatia entregável. E vem antes de F para o amigo já ter saída.

## Common Pitfalls

1. **Grupo novo herdando o casal.** `getSettings` cria `DEFAULT_SETTINGS` quando falta o doc (`settings.service.ts:38-42`). Evitar: servidor cria `settings/{hid}` no cadastro e os padrões viram neutros para quem tem `households`. Sinal: nomes "Nirigue" ou palavrão em conta nova.
2. **Alerta de limite sumindo.** Id sem `hid`. Sinal: `permission-denied` no console do segundo grupo.
3. **Rollback que abre o banco.** `firestore.rules.legacy`.
4. **Escrita perdida na troca de settings.** Aparelho com cliente velho grava em `main` depois da cópia. Evitar: copiar só após atualização dos dois.
5. **Vazamento por mensagem de erro.** `handle` devolve `err.message`; erros do SDK podem ecoar detalhes.
6. **Convite consumido sem conta.** Falha entre transação e `createUser`. Evitar: uid determinístico e estado `consumindo` retomável.
7. **`settings` por `hid` sem regra de id.** Permite ocupar o documento alheio.
8. **Casal com somas enganosas.** Somar gasto de quem não tem limite contra o teto do outro.
9. **Migração ressuscitando itens apagados** ou duplicando pagamentos antigos (`addDoc`).
10. **Hook de segredos do ambiente** bloqueia comandos que citam arquivos `.env` mesmo em padrão de busca; os planos não devem pedir leitura deles.

## Code Examples

Esboços propostos (não existem no código).

```javascript
// server/src/secrets.js
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const aad = (hid) => Buffer.from(`pluggy:v1:${hid}`)

export function seal(key, hid, value) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 })
  cipher.setAAD(aad(hid))
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return { v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') }
}

export function open(key, hid, doc) {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(doc.iv, 'base64'), { authTagLength: 16 })
  decipher.setAAD(aad(hid))
  decipher.setAuthTag(Buffer.from(doc.tag, 'base64'))
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(doc.data, 'base64')), decipher.final()]).toString('utf8'))
}
```

```javascript
// server/src/invites.js: reserva atômica do convite
const ref = db.collection('invites').doc(sha256Hex(token))
const invite = await db.runTransaction(async (t) => {
  const snap = await t.get(ref)
  const d = snap.exists ? snap.data() : null
  const stale = d?.status === 'consumindo' && now() - d.claimedAt.toDate() > 2 * 60_000
  if (!d || d.expiresAt.toDate() <= now() || (d.status !== 'pendente' && !stale)) return null
  t.update(ref, { status: 'consumindo', claimedAt: now() })
  return d
})
```

A retomada de um `consumindo` antigo é segura porque o `uid` deriva do hash. Se a conta já existir com esse uid, **não** trocar a senha dela.

## State of the Art

| Antes | Agora | Impacto |
|-------|-------|---------|
| Contas só por script (Fase 1, D-04) | Convite no app (D-01) | `create-users.js` fica para o casal; ajustar `CLAUDE.md` |
| Webhook criado por API | Painel ou `webhookUrl` por token (API exige "API management") | cada convidado não precisa registrar nada |

## Assumptions Log

| # | Afirmação | Seção | Risco se errada |
|---|-----------|-------|-----------------|
| A1 | `webhookUrl` do connect token dispara para itens espelho do MeuPluggy | Padrão 4 | fica só o polling (aceitável) |
| A2 | No Coinc o widget dispensa o passo do Demo; após o teste de 15 dias dá para criar item novo | MeuPluggy | convidado trava na conexão; testar com conta real |
| A3 | Servidor que guarda credenciais de cada pessoa para os próprios dados cabe no "uso pessoal" da Pluggy | Padrão 3 | revisão dos termos; D-07 fica em risco |
| A4 | `trust proxy 1` dá o IP real no Railway | Padrão 2 | freio por IP inútil ou global |
| A5 | O `financias-xrd` pode estar com regras abertas | Padrão 5 | exposição dos dados do amigo |
| A6 | Estimativas de tokens, `MAX_HOUSEHOLDS` e teto de IA | Cotas | cota estoura ou fica apertada demais |
| A7 | Saída da IA para gênero neutro respeita a instrução | Gênero | fala com gênero errado |
| A8 | Carga extra no Railway é pequena | Cotas | custo |

## Open Questions

1. **Categoria com limite de um só.** Recomendação: barra soma só quem tem limite; o outro aparece no detalhe. Confirmar no UI-SPEC.
2. **Exclusão em casal.** O que acontece com Porquinho, itens `conjunto`, categorias e credenciais quando um sai e o outro fica? É sem volta: pedir confirmação do dono. Recomendação: manter o compartilhado.
3. **Dono pode apagar a própria conta?** Recomendação: bloquear pela interface.
4. **"Login migrado" (MULTI-01).** Basta conta nova por convite (mesmo e-mail, senha nova)? Recomendo sim.
5. **Dados do amigo:** quem gera a chave de serviço do `financias-xrd`? Há lançamentos nas duas abas? Qual versão está publicada?
6. **Tom inicial do grupo novo:** `suave` ou `direto`? E o cadastro pergunta ou só as Configurações?
7. **Falas do sem filtro** citam fumaça/vape e apelidos do jeito do casal; servem para o convidado que escolher o tom? (D-06 diz "tudo igual".)
8. **IA e convidados:** D-06 liga a IA para todos e os provedores grátis podem reter dados; quem autorizou foi o dono. D-09 trata só do acesso do administrador. Vale perguntar se quer alguma frase sobre a IA; sem resposta, não acrescentar.
9. **Somente leitura do parceiro nas regras:** entra nesta fase?
10. **Esqueci a senha:** convidado não tem fluxo. Recomendo script do dono ou `sendPasswordResetEmail` depois; fora do escopo atual.

## Environment Availability

| Dependência | Para | Disponível | Versão | Reserva |
|-------------|------|-----------|--------|---------|
| Node | tudo | sim | v22.23.5 | — |
| Java (emuladores) | regras, ensaio | só após `. ./scripts/dev-env.sh` | JRE 21 | — |
| firebase CLI | regras, emulador | sim | instalada no nvm | — |
| Chave de serviço do `financias-xrd` | migração | não verificada | — | **sem reserva**: passo humano |
| Conta Pluggy de outra pessoa | teste do banco por grupo | não verificada | — | testar com mocks; UAT com o amigo |
| Acesso ao Railway e ao console Auth | variáveis, User actions | humano | — | passo humano |

## Validation Architecture

### Test Framework

| Propriedade | Valor |
|-------------|-------|
| Framework | `node --test` (núcleo, servidor, estáticos, regras, emulador) |
| Configuração | scripts em `package.json`; emuladores em `firebase.json` |
| Comando rápido | `npm run test:core && npm run test:server && npm run test:static` |
| Suíte completa | `. ./scripts/dev-env.sh && npm run build && npm run lint && npm run test:core:tz && npm run test:server && npm run test:static && npm run test:rules && npm run test:emu` |

`test:core` e `test:server` não precisam de Java.

### Mapa de requisitos para testes

| Req | Comportamento | Tipo | Comando | Arquivo existe? |
|-----|---------------|------|---------|-----------------|
| CASAL-01 | somas, categoria com um só limite, sem renda, ciclos diferentes, virada, fuso | unidade | `node --test shared/core/couple.test.js` | conferir/estender |
| CASAL-02 | Casal sem escrita; Home inalterada | estático | `node --test test/static/phase8-couple.test.js` | não, Wave 0 |
| MULTI-01 | grupo A não lê/escreve B; `settings` e alertas com id alheio negados | regras | `npm run test:rules` | estender `matrix.test.js` |
| MULTI-01 | dois grupos geram alerta e insight da mesma categoria sem colisão | unidade + emulador | `node --test shared/core/household.test.js` | não, Wave 0 |
| MULTI-01 | `genderFor` e sorteio neutro só `x` | unidade | idem | não, Wave 0 |
| MULTI-01 | modo sozinho sem seletor, Casal escondida | estático + auditoria Chrome (`scripts/ux-audit`) | `node --test test/static/phase8-solo.test.js` | não, Wave 0 |
| MULTI-02 | convite: uso único concorrente, expirado, cancelado, retomada, só dono cria | servidor + emulador | `node --test server/test/invites.test.js` | não, Wave 0 |
| MULTI-02 | cifra/decifra, AAD de outro grupo falha, nada volta na resposta ou no log | servidor | `node --test server/test/secrets.test.js` | não, Wave 0 |
| MULTI-02 | resolvedor nunca entrega o cliente do dono a outro `hid`; webhook com assinatura errada ou item alheio | servidor | `node --test server/test/pluggy-pool.test.js server/test/webhook.test.js` | parcial |
| D-10 | exclusão apaga tudo do alvo e nada de outro grupo; retomada após falha no meio | emulador | `npm run test:emu` (`server/test/emu/account-delete.test.js`) | não, Wave 0 |
| MULTI-03 | dry-run não escreve; 2ª rodada zero; apagado não volta; outros grupos intactos; relatório de conflito | emulador | `server/test/emu/migrate-legacy.test.js` | não, Wave 0 |

### Amostragem
- **Por commit de tarefa:** comando rápido.
- **Por onda:** suíte completa (regras e emulador).
- **Portão da fase:** suíte verde antes do `/gsd-verify-work`.

### Lacunas da Wave 0
- [ ] Fixture de **dois grupos** no emulador (`server/test/emu/_helpers.js`).
- [ ] Snapshot sintético do app antigo (sem dados reais).
- [ ] Pluggy e Auth falsos para convite, resolvedor e exclusão (`createApp` já recebe dependências).
- [ ] Atualizar guardas que travam o estado antigo: `test/static/no-legacy-auth.test.js` (proíbe `signUp`; o cadastro novo é via servidor, manter a proibição e cuidar dos nomes), `firestore-config.test.js` (rollback), `phase7-rules.test.js`, `owner-queries.test.js` (service novo `households`).

### Só manual
Desligar "User actions" (e conferir que o cadastro direto é recusado); variáveis no Railway; conectar banco com credenciais de outra pessoa; migração real; convite e instalação no iPhone.

## Security Domain

### Categorias ASVS (nível 1)

| Categoria | Aplica | Controle |
|-----------|--------|----------|
| V2 Autenticação | sim | Firebase Auth; senha mínima 8; reautenticação para apagar |
| V3 Sessão | sim | `revokeRefreshTokens`; `checkRevoked` em ações destrutivas |
| V4 Controle de acesso | sim | claims `hid`; regras; filtro `ownerId` no servidor; `OWNER_HID` para convidar |
| V5 Validação | sim | listas fechadas e regex nas rotas, como em `push/router.js` |
| V6 Criptografia | sim | `node:crypto` AES-256-GCM; chave fora do banco |
| V7 Logs | sim | nunca token, senha, secret ou `req.body` |
| V8 Proteção de dados | sim | segredo nunca volta ao cliente; exclusão completa; backups com dados de terceiros em `backups/` |

### Ameaças

| Padrão | STRIDE | Mitigação |
|--------|--------|-----------|
| Adivinhar ou reutilizar convite | Spoofing | 256 bits, só hash, transação, 7 dias, cancelável, freio |
| Link vazado antes do uso | Spoofing | uso único, cancelamento, lista de pendentes para o dono |
| Cadastro direto pela API pública do Auth | Elevation | User actions desligado; sem claim não há acesso |
| Convidado chama rota de convite | Elevation | checar `OWNER_HID` no token |
| `person`/`itemId` alheio | Tampering/IDOR | dono sempre do token e do documento |
| Ocupar id de documento de outro grupo | DoS | regra de prefixo/id |
| Vazamento do Firestore expõe credenciais | Info disclosure | cifra com chave só no Railway |
| Webhook forjado | Spoofing/DoS | HMAC por grupo, conferir dono do item, corpo é só sinal |
| Exclusão por sessão roubada ou aberta | Tampering | senha de novo, `auth_time`, digitar confirmação |
| Script de migração/exclusão no escopo errado | Tampering | `--hid` obrigatório, simulação por padrão, backup, emulador |
| Um grupo esgota a cota de todos | DoS | teto por pessoa, teto de grupos, freio |

Residual aceito: quem administra o servidor consegue ler os dados e decifrar credenciais (D-09, sem aviso).

## Sources

### Primárias (código do repositório, lido nesta sessão)
`firestore.rules`, `.firebaserc`, `shared/core/{alerts,oincSelect,budget,couple,limits}.js`, `src/types/index.ts`, `server/src/{index,app,auth,sync,webhook,limiter}.js`, `server/src/push/{repo,tick,router}.js`, `server/src/ai/{budget,config,routes,refill}.js`, scripts de `server/scripts/`, histórico git (`7640bca0`), planejamento das fases 01, 05, 07.1.

### Secundárias (documentação oficial, MÉDIA)
- https://docs.pluggy.ai/en/docs/guides/meu-pluggy-personal-use
- https://docs.pluggy.ai/en/docs/developer-tools/webhooks-ref
- https://docs.pluggy.ai/en/docs/guides/dashboard-connectors
- https://github.com/pluggyai/meu-pluggy
- https://firebase.google.com/docs/auth/users
- https://firebase.google.com/docs/auth/limits
- https://firebase.google.com/docs/auth/admin/manage-sessions
- https://firebase.google.com/pricing e https://docs.cloud.google.com/firestore/quotas
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://console.groq.com/docs/rate-limits
- https://docs.railway.com/pricing/plans
- https://nodejs.org/api/crypto.html

## Metadata

**Confiança:**
- Inventário do código: ALTA (leitura e busca; linhas a conferir na edição)
- Arquitetura de convite, segredos, exclusão e migração: MÉDIA (desenho proposto, ainda não ensaiado)
- Pluggy para usuário novo: MÉDIA/BAIXA até teste real
- Cotas e estimativas: BAIXA para o consumo, MÉDIA para os limites

**Data:** 2026-11-27
**Válida até:** cerca de 30 dias; limites de Pluggy, Groq e Railway, conferir de novo antes de publicar
