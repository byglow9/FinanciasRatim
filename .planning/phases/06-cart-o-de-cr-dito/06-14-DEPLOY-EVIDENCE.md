# 06-14 — Evidência do portão de publicação (cartão de crédito completo)

Data: 2026-11-25. Preparada pelo agente, só leitura e testes locais. O agente NÃO rodou deploy, push, `firebase login`, exportação, `card-history`, `reclassify-card-payments` nem sonda, e não leu `.env*`. As Tasks 2 e 3 (publicar, importar o histórico, reclassificar e conferir com o app do Nubank) são do dono.

## Portão local (antes de publicar)

Tudo verde, com o ambiente `. ./scripts/dev-env.sh`:

| Comando | Resultado |
| ------- | --------- |
| `npm run test:core:tz` | 900 passam, 0 falham (UTC) e 900 passam, 0 falham (Asia/Tokyo) |
| `npm run test:server` | 124 passam, 0 falham |
| `npm run test:emu` | 153 passam, 0 falham |
| `npm run test:rules` | 13 passam, 0 falham |
| `npm run test:static` | 679 passam, 0 falham, 2 puladas (já existentes) |
| `npm run build` | exit 0 (PWA: 22 entradas no precache, 2213,65 KiB; `dist/` fica fora do git) |
| `npm run lint` | exit 0 |

`git status --short` mostra só `.planning/state.json` modificado (fora do escopo); `firestore.rules` e `firestore.indexes.json` estão limpos: os arquivos do repositório são exatamente os testados.

HEAD (branch `main`): `3bb376e90542a939ac911fd886c89fb35ac1b144`.

## SHA anterior das regras e rollback

- Commit que acrescentou `cardSettings` às regras (06-07): `8a8ea1a08562b9edd7f16750585c398a569b5b9e` (também criou o índice de `transactions` por ownerId, cardId e date em `firestore.indexes.json`).
- Último commit de regras ANTES do 06-07 (SHA de rollback): `715e83d05b2acad7ecbbb962062c07d3b48443a1` (715e83d0, 06-01, regra `cards` somente leitura).

Rollback das regras:

```
git checkout 715e83d05b2acad7ecbbb962062c07d3b48443a1 -- firestore.rules
firebase deploy --only firestore:rules --project financias-ratimbum
git checkout HEAD -- firestore.rules
```

**`firebase.rollback.json` NÃO serve para este rollback**: ele aponta para as regras abertas legadas e reabriria o acesso.

## Passos de publicação (feitos pelo dono), na ordem, e rollback de cada um

Sempre `. ./scripts/dev-env.sh` antes. Sempre `--only` e sempre `--project financias-ratimbum`. Nunca `firebase deploy` sem `--only`. Ordem obrigatória: índice, regras, servidor, hospedagem.

### Passo 1: índice

```
firebase deploy --only firestore:indexes --project financias-ratimbum
```

Confirmar "Deploy complete" e esperar, no Console (Firestore > Índices), o índice de `transactions` (ownerId, cardId, date) ficar **Habilitado** antes de seguir (T-06-47).

Rollback: o índice é aditivo e não precisa ser desfeito.

### Passo 2: regras

```
firebase deploy --only firestore:rules --project financias-ratimbum
```

Confirmar "Deploy complete". Nenhuma regra existente é afrouxada: só `cardSettings` (leitura e escrita do próprio dono) é nova; `cards` (leitura) já veio do 06-01.

Rollback: ver a seção do SHA anterior acima.

### Passo 3: servidor (Railway)

```
git push origin main
```

Feito pelo dono; dispara o deploy automático do Railway. Conferir em Railway, serviço FinanciasRatim, aba Deployments, que o deploy novo ficou **Ativo** e que o log não mostra erro de inicialização. Com o servidor novo no ar, o sync automático NÃO grava compras do cartão (só limite e agregados) até o marcador `historyBaselineAt` ser aplicado no passo 7 (D-13); é o esperado.

Rollback: no Railway, aba Deployments, reimplantar (Redeploy) o deploy Ativo anterior a este push. Não reescrever `main` com force-push.

### Passo 4: hospedagem coinc

```
npm run build
firebase deploy --only hosting:coinc --project financias-ratimbum
```

Confirmar "Deploy complete". O site `legacy` não é tocado.

Rollback: Firebase Console > Hosting > site `coinc` > histórico de versões, voltar à versão anterior.

### Passo 5: fechamento e vencimento

No app, em Configurações > Contas e cartões, informar fechamento dia 7 e vencimento dia 14 do cartão do Nubank (D-09). Fazer ANTES de importar o histórico, para o mês da fatura derivado ficar certo.

## Histórico completo e reclassificação (D-13, só depois do servidor no ar)

Credenciais só em variáveis de ambiente do shell do dono (`FIREBASE_SERVICE_ACCOUNT_FILE`, `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`). A pasta `backups/` é ignorada pelo git (conferido) e o arquivo nunca é commitado nem colado; o dono o apaga depois do UAT (T-06-68).

### Passo 6: cópia de segurança

```
node server/scripts/export-firestore.js --out backups/AAAA-MM-DD-cartao.json
```

Conferir as contagens impressas. Os dois scripts abaixo recusam aplicar sem cópia de até 24 horas com `transactions` e `bankImports`, e o histórico exige que a cópia reflita EXATAMENTE o estado atual: mudou algo depois da exportação, gere outra.

### Passo 7: histórico do cartão (ensaio, depois aplicação)

Ensaio (padrão, não grava nada):

```
node server/scripts/card-history.js --hid HID
```

Colar só as contagens: `created`, `updated`, `rebound`, `removed`, `adopted`, `adoptedLegacy`, `rehomed`, `nearMiss` e `skippedNoBrl`. `adoptedLegacy` são lançamentos manuais antigos que viram compra do cartão e deixam de baixar o saldo; `nearMiss` são possíveis duplicados que o Coinc NÃO uniu (valor e data iguais, descrição diferente). Se parecerem erradas, não aplicar.

Aplicação, só se as contagens fizerem sentido:

```
node server/scripts/card-history.js --hid HID --apply --backup backups/AAAA-MM-DD-cartao.json
```

Depois, em Configurações > Bancos, "Sincronizar agora" e esperar terminar.

### Passo 8: reclassificação dos pagamentos de fatura antigos

Ensaio (padrão): `node server/scripts/reclassify-card-payments.js --hid HID`. Colar só `examined`, `matched`, `updated`. Se fizerem sentido:

```
node server/scripts/reclassify-card-payments.js --hid HID --apply --backup backups/AAAA-MM-DD-cartao.json
```

Se parecerem erradas, não aplicar. Só texto estreito de pagamento de fatura e só em lançamentos de dono com cartão (T-06-50). O script é idempotente.

### Passo 9: o que colar de volta

As linhas "Deploy complete" (índice, regras, hospedagem), "indice habilitado", "railway ativo" e as contagens do histórico e da reclassificação. Nunca credenciais, descrições ou valores de lançamentos.

## Roteiro de conferência (Task 3)

Somente leitura, no app publicado e no app do Nubank, no mesmo momento. Colar só números do próprio cartão.

1. Em `/cartoes`: limite total, disponível, % usado, fatura atual, "Fecha dia 7", "Vence dia 14" e status (Aberta antes do fechamento). Responder "numeros batem" ou "diverge" com os valores lado a lado.
2. Fatura atual: compras batem com a tela Fatura do Nubank; a internacional aparece em reais (ex.: R$ 30,08) com o valor original em dólar ao lado; as não confirmadas aparecem como Pendente.
3. "Sincronizar agora" de novo: o número de compras da fatura não muda (sem duplicar).
4. Transações: compras com a marca "Cartão"; Saldo e Saídas não incluem o cartão; a linha "Compras no cartão" mostra o total. Home: "Pode gastar" e limites contam as compras pela data.
5. Calendário: vencimento da fatura em 14/12 com o valor. O aviso do sino só depois do fechamento (08/12); sem aviso hoje é "sem aviso, esperado" (aviso falso é falha do 06-13).
6. Compra parcelada real, se existir: `. ./scripts/dev-env.sh && node server/scripts/probe-card.js --item 792a3230-3225-4431-9235-65ad1e3fbac5` (somente leitura; trava de uma execução por dia) e dizer se a fatura mostra N/M. Se não existir: "sem parcelada ainda" (CARD-05 a reavaliar, D-07).
7. Dock (D-11): 9 ícones no celular, o 5º abre `/cartoes` (rótulo Cartões); a Home mantém o resumo do cartão.
8. Histórico (D-13): ciclos anteriores em Transações com a marca Cartão, saldo sem queda, nenhuma compra duplicada (inclusive as lançadas à mão e adotadas); `/cartoes` lista todos os meses com total.
9. Lançamento manual (D-12): no botão +, aba Gasto, chip Cartão, lançar compra igual a uma já importada (mesmo valor e data); depois de sincronizar continua uma só. Uma compra nova no cartão conta no Pode gastar e nos limites e não baixa o saldo.

Divergência de número, compra duplicada ou saldo caindo com compra do cartão bloqueiam o fechamento; o responsável por cada caso está na Task 3 do plano (06-06, 06-11, 06-03/06-09, 06-13, 06-16, 06-17, 06-18, 06-19).
