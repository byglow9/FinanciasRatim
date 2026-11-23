# 04-18 — Evidência de publicação da regra de vintemInsights

A mudança em `firestore.rules` só acrescenta `'vintemInsights'` à lista de `clientCollections()`. Nenhuma coleção existente muda e `firestore.indexes.json` não muda (continua com 19 índices): a leitura da coleção usa só igualdades (dono, pessoa e ciclo).

## Portão local (antes de publicar)

Rodado no ambiente de desenvolvimento com `. ./scripts/dev-env.sh` (Node 22.23.5 e JRE 21).

- `npm run test:static`: # tests 441 # pass 440 # fail 0 # skipped 1 (o pulado já existia; inclui `phase4-persist` com 6 testes, a guarda de 19 índices e `owner-queries` com 12 services)
- `npm run test:core:tz`: # tests 667 # pass 667 # fail 0, em UTC e em Asia/Tokyo
- `npm run test:rules`: # tests 13 # pass 13 # fail 0 (o emulador do Firestore subiu aqui, ao contrário do que o plano supunha: o JRE 21 vem do `dev-env.sh`). A matriz inclui o teste novo de `vintemInsights` e a iteração de documento inexistente com a coleção nova.
- `npm run build` e `npm run lint`: limpos.
- `node scripts/ux-audit/vintem-app.mjs --only persist`: `FALHAS 0`.
- `git status --short firestore.rules` deve ficar sem o arquivo depois do commit desta tarefa (o publicado é o do repositório).

## Rollback (registrado antes de publicar)

Último commit que alterou as regras ANTES desta mudança: `fac1eb65a46acaa9d441e72e9e3162de5a6add30` (fac1eb65, plano 03-07, "regras de limitAlerts"). Essas são as regras hoje publicadas (03-11 publicou e o dono respondeu "Deploy complete!"). O conteúdo de `firestore.rules` em `HEAD` antes desta tarefa é idêntico ao de `fac1eb65`.

```
git checkout fac1eb65a46acaa9d441e72e9e3162de5a6add30 -- firestore.rules
firebase deploy --only firestore:rules --project financias-ratimbum
git checkout HEAD -- firestore.rules
```

**`firebase.rollback.json` NÃO serve para este rollback**: ele aponta para as regras abertas legadas e reabriria o acesso.

## Comando de publicação

Só as regras, sempre com `--only` e com o projeto explícito. Credencial do dono (o agente não faz `firebase login`).

```
. ./scripts/dev-env.sh
firebase login:list
firebase deploy --only firestore:rules --project financias-ratimbum
```

Nunca rodar `firebase deploy` sem `--only firestore:rules` e sem `--project financias-ratimbum`. Não há índice a publicar nesta mudança.

## Sem a regra publicada

Sem a regra em produção a gravação dos insights falha em silêncio (a regra padrão nega a coleção `vintemInsights`; o serviço engole o erro, sem mensagem e sem mudar a tela) e o app segue normal. O balão do Vintém consome os insights em memória e não depende da gravação. Cada insight é tentado uma vez por visita enquanto a regra não estiver publicada.

## Resultado da publicação

(preenchido depois da resposta do dono no checkpoint da Task 3)
