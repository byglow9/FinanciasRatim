# 06-02 — Evidência do portão do tracer (cartão de crédito)

Data: 2026-11-24. Preparada pelo agente, só leitura e testes locais. O agente NÃO rodou deploy, push, `firebase login`, sonda nem leu `.env*`. As Tasks 2 e 3 (publicar e conferir com o app do Nubank) são do dono.

## Portão local (antes de publicar)

Tudo verde, com o ambiente `. ./scripts/dev-env.sh`:

| Comando | Resultado |
| ------- | --------- |
| `npm run test:core:tz` | 733 passam, 0 falham (UTC) e 733 passam, 0 falham (Asia/Tokyo) |
| `npm run test:server` | 118 passam, 0 falham |
| `npm run test:emu` | 62 passam, 0 falham |
| `npm run test:rules` | 13 passam, 0 falham |
| `npm run test:static` | 613 passam, 0 falham, 2 puladas (já existentes) |
| `npm run build` | exit 0 (PWA: 22 entradas no precache; `dist/` fica fora do git) |
| `npm run lint` | exit 0 |

`git status --short firestore.rules` está limpo: o arquivo do repositório é exatamente o testado no 06-01.

## SHAs

- HEAD (branch `main`): `b0bda59601cfe0972d741fdbb9dcb2eb20c50857` (b0bda596, `docs(06-01): conclui o plano tracer do cartao`).
- Commits de código do 06-01: `2aff9806` (sync grava `cards`), `715e83d0` (regra `cards` e matriz), `0a632d53` (rota `/cartoes`).
- Commit do 06-01 que alterou as regras: `715e83d05b2acad7ecbbb962062c07d3b48443a1` (715e83d0).
- Último commit que alterou as regras ANTES do 06-01 (SHA de rollback): `0aa7f2741ddccb1cb3ec0c10f6ae5e5df67069f0` (0aa7f274, plano 04-18, coleção `vintemInsights`).

## O que o `git push` do dono vai enviar ao Railway

`git log origin/main..main` hoje: **40 commits locais não enviados** (o push do 06-01 leva junto tudo que está pendente, não só o cartão). `git diff --stat origin/main..main`: 126 arquivos, +12171 −727.

Por tipo de commit: 26 `docs`, 10 `feat`, 4 `test`.

Por área (arquivos alterados): `.planning/` 50, `src/` 33, `test/` 18, `shared/` 9, `scripts/` 8, `server/` 5, e na raiz `vite.config.ts`, `index.html` e `firestore.rules` (1 cada).

Mudanças que afetam o servidor do Railway (pasta `server/` e o `shared/` que ele importa):

| Arquivo | Efeito |
| ------- | ------ |
| `server/src/sync.js` | +12 linhas: para cada conta `CREDIT`, chama `syncCardSnapshot` antes de buscar as transações; falha do cartão vira só `console.warn` e não derruba a importação do banco |
| `server/src/card-sync.js` | novo (+20 linhas no diff do push): grava `cards/{accountId}` com limite, disponível e fatura atual em centavos, só campos da lista fechada |
| `shared/core/cards.js` | novo: `cardSnapshotFromAccount` e `cardLimitView` (núcleo puro) |
| `server/scripts/diagnose-webhooks.js` | novo, script manual somente leitura (não roda no deploy) |
| `server/test/**` | só testes (`diagnose-webhooks.test.js`, `emu/card-sync.test.js`), não afetam produção |

Efeito no servidor em produção: o próximo sync passa a gravar a coleção `cards` para contas de cartão. O caminho antigo de importação das compras do cartão continua intacto. Os demais commits `feat` (`src/`, `shared/` de tema, Vintém e onboarding da fase 5) são do cliente e só chegam ao usuário na hospedagem `coinc`; não mudam o servidor. Docs e `.planning/` não têm efeito em runtime.

Atenção: o diretório de trabalho tem arquivos sem commit que NÃO entram no push (`.planning/phases/05-identidade-coinki-pwa-e-onboarding/05-18-DEPLOY-EVIDENCE.md` não versionado, `.planning/state.json`, `.planning/milestone.lock` apagado, sketches, uma `.whl` solta, e o `LibreChat/` apagado fora do projeto). O push só leva o que está commitado.

## Ordem de publicação e por que vale

1. Regras de `cards` primeiro.
2. Servidor (push em `main`, deploy automático do Railway) depois.
3. Hospedagem `coinc` por último.

Motivo: o cliente novo lê `cards`. O servidor precisa ter gravado esse documento e a regra precisa liberar a leitura ao dono. Publicar a hospedagem antes mostraria `/cartoes` vazia ou com erro de permissão. Nenhuma regra existente é afrouxada (a mudança do 06-01 no `firestore.rules` é só a regra de leitura de `cards`).

## Passos de publicação (feitos pelo dono) e rollback de cada um

Sempre `. ./scripts/dev-env.sh` antes. Sempre `--only` e sempre `--project financias-ratimbum`. Nunca `firebase deploy` sem `--only`. Não há índice novo neste plano: não publicar `firestore:indexes`.

### Passo 1: regras de cards

```
firebase deploy --only firestore:rules --project financias-ratimbum
```

Confirmar a linha "Deploy complete".

Rollback (SHA registrado antes de publicar, 0aa7f274):

```
git checkout 0aa7f2741ddccb1cb3ec0c10f6ae5e5df67069f0 -- firestore.rules
firebase deploy --only firestore:rules --project financias-ratimbum
git checkout HEAD -- firestore.rules
```

**`firebase.rollback.json` NÃO serve para este rollback**: ele aponta para as regras abertas legadas e reabriria o acesso.

### Passo 2: servidor (Railway)

```
git push origin main
```

Feito pelo dono; dispara o deploy automático do Railway. Conferir em Railway, serviço FinanciasRatim, aba Deployments, que o deploy novo ficou **Ativo** e que o log não mostra erro de inicialização. Depois, no app, Configurações > Bancos > "Sincronizar agora" (ou esperar o próximo ciclo) para o servidor gravar o cartão. Se o Nubank não aparece em Bancos, conectar o MeuPluggy do Nubank por lá (item 792a3230).

Rollback: no Railway, aba Deployments, reimplantar o deploy anterior (Redeploy do deploy Ativo antes deste push). Não reescrever `main` com force-push. O documento `cards/{id}` já gravado fica no Firestore sem uso; apagar à mão só se o dono quiser.

### Passo 3: hospedagem coinc

```
npm run build
firebase deploy --only hosting:coinc --project financias-ratimbum
```

Confirmar a linha "Deploy complete". O site antigo (`legacy`) não é tocado.

Rollback: Firebase Console > Hosting > site `coinc` > histórico de versões, voltar a versão anterior.

## Roteiro da Task 3 (conferência e sonda) — o que o dono confere e cola

Tudo somente leitura. Colar só números do app, códigos e o resumo da sonda; nunca credenciais.

1. Abrir o Coinc publicado, perfil de quem conectou o Nubank, e digitar `/cartoes`. Comparar, no mesmo momento, com o app do Nubank: limite total, limite disponível, fatura atual e porcentagem usada (usado dividido pelo limite). Responder "numeros batem" ou "diverge" com os dois valores lado a lado. Divergência bloqueia a expansão e volta ao 06-01.
2. Em Transações, nas compras do Nubank já importadas pelo caminho antigo:
   - (a) a data mostrada confere com a data da compra no app do Nubank? Se "não confere", a data da compra passa a ser outro campo (entrada para 06-04 e 06-06).
   - (b) alguma compra internacional aparece com valor em dólar em vez de reais (ex.: US$ 5,00 em vez de R$ 30,08)? Confirma o conserto do 06-04 e do 06-06.
3. Rodar a sonda somente leitura com a credencial do dono (o agente não roda):
   ```
   . ./scripts/dev-env.sh && node server/scripts/probe-card.js --item 792a3230-3225-4431-9235-65ad1e3fbac5 --days 365
   ```
   Só grava formato (nenhum valor, identificador ou loja); tem trava de uma execução por dia (`alreadyProbedToday`). Colar o resumo: quantas faturas voltaram; quantas compras a sonda contou nos últimos 365 dias (profundidade do histórico, D-13); quantas compras têm parcela; quantas têm `billId` e `purchaseDate`; se `balanceDueDate` e `balanceCloseDate` continuam nulos. Se o ciclo de 25/11 (cerca de 11:46) ainda não passou, dizer e repetir depois.
4. Se houver compra parcelada real no Nubank, dizer; a sonda feita depois dela decide o CARD-05.

Resposta esperada para o executor registrar no SUMMARY: "numeros batem" com (a), (b) e o resumo da sonda, ou "diverge: DESCRIÇÃO".
