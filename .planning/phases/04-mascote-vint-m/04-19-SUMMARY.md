---
phase: 04-mascote-vint-m
plan: 19
subsystem: content
tags: [vintem, frases, revisao-do-dono, validacao]
requires: ["04-04", "04-06", "04-07", "04-08", "04-12", "04-15", "04-16", "04-17", "04-20"]
provides:
  - "guarda de conteudo do banco inteiro (phase4-content.test.js) e guarda final (phase4-content-review.test.js)"
  - "REVIEW.reviewedAt = 2026-11-23 em shared/core/vintemPhrases.js"
  - "folha de revisao 04-PHRASES-REVIEW.md (462 frases, 20 situacoes, 3 tons)"
  - "04-VALIDATION.md completo, nyquist_compliant: true"
status: complete
---

# Plano 04-19: conteudo e validacao da fase

## Resultado

- Regua automatica sobre o banco real: 462 frases, 20 situacoes x 3 tons, zero problemas.
- Revisao do dono (D-12, MASC-07): resposta literal "Revisado, sem cortes", dada diretamente ao orquestrador
  numa pergunta explicita no terminal. Nenhum corte, nenhuma reescrita, sem BLOCKLIST.txt, sem copia apontada.
  Por isso nenhum modulo de frases foi alterado alem de `REVIEW.reviewedAt`.
- `phase4-content-review.test.js`: reviewedAt valido (AAAA-MM-DD) e `checkBank` com `reviewed: true` vazio.
- Suite completa verde: `test:core:tz` 667, `test:static` 447, build, lint, `vintem.mjs --test` 32/32, `vintem-app.mjs` FALHAS 0.

## Desvios

1. O executor do plano recusou a aprovacao repassada por outro agente; o orquestrador pediu a confirmacao
   ao dono diretamente e concluiu a Task 3 em linha.
2. `phrasePicker.test.js` esperava `reviewedAt === null`; passou a exigir data valida.
3. O tamanho do Vintem no medidor mudou a pedido do dono (slot 150x125, sem disco de fundo): ajustadas as
   verificacoes `arcgauge-real-com-vintem-150-no-slot` em `vintem.mjs`, `home.mjs` e as guardas estaticas.

## Pendencias humanas (UAT)

60 fps em aparelho real, perfil de lado, olhar seguindo o toque, reacoes ao lancar, tom das falas, estados vazios.
