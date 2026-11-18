# 03-11 — Evidência de publicação de regras e índice de limitAlerts

## Portão local (antes de publicar)

- `git status` limpo para `firestore.rules` e `firestore.indexes.json` (arquivos exatamente os testados no 03-07).
- `npm run test:rules`: # pass 12 # fail 0 
- `npm run test:static`: # pass 91 # fail 0 

## Rollback (registrado antes de publicar)

Último commit que alterou as regras ANTES do 03-07: `cd541abed43e337152bd38de92bbdfdf241e474d` (cd541abe, plano 01-03).

```
git checkout cd541abed43e337152bd38de92bbdfdf241e474d -- firestore.rules
firebase deploy --only firestore:rules --project financias-ratimbum
git checkout HEAD -- firestore.rules
```

**`firebase.rollback.json` NÃO serve para este rollback**: ele aponta para as regras abertas legadas e reabriria o acesso.

## Comandos de publicação (ordem obrigatória, sempre com --only)

1. `firebase deploy --only firestore:indexes --project financias-ratimbum`
2. Console: Firestore Database > Índices > esperar o índice de `limitAlerts` (ownerId ASC, person ASC, createdAt DESC) ficar **Habilitado**.
3. `firebase deploy --only firestore:rules --project financias-ratimbum`

Nunca rodar `firebase deploy` sem `--only`.
