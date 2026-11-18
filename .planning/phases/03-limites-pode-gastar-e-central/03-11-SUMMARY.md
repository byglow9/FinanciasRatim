---
phase: 03
plan: 11
subsystem: deploy-gate
requirements-completed: []
commits: 1
---

# Plano 03-11 — Publicação de regras e índice de limitAlerts

## Resultado

- Índice: `firebase deploy --only firestore:indexes --project financias-ratimbum` terminou com "Deploy complete!" (saída colada pelo dono).
- Regras: `firebase deploy --only firestore:rules --project financias-ratimbum` terminou com "✔ firestore: released rules firestore.rules to cloud.firestore" e "Deploy complete!".
- `firebase firestore:indexes` lista o índice `limitAlerts` (ownerId ASC, person ASC, createdAt) no projeto.
- Portão local antes da publicação: regras 12/12, estático 91/91. `firestore.rules` e `firestore.indexes.json` sem diferença em relação ao commit.
- Rollback: `03-11-DEPLOY-EVIDENCE.md` (commit anterior das regras: cd541abe; nunca `firebase.rollback.json`).

## Índice confirmado

- Console do Firebase (prints do dono, 2026-11-18): 19 índices, todos **Ativado**, incluindo `limitAlerts` (ownerId ASC, person ASC, createdAt DESC).

## Pendente

- LIM-07 não marcado: depende do passo (i) do UAT (um aviso por limiar, sem repetir em recarga nem em segunda aba).
