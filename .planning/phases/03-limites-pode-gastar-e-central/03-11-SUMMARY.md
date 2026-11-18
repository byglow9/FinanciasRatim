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

## Pendente

- **Estado "Habilitado" do índice NÃO foi confirmado.** O dono não informou e a CLI não mostra o estado. Conferir no Console (Firestore, Índices) antes do UAT; enquanto estiver "Criando", consultas de avisos podem falhar com `failed-precondition`.
- LIM-07 não marcado: depende do avaliador, do sino e das telas (planos 13, 15, 16).
