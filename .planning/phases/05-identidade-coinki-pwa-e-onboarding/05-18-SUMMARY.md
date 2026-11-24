---
phase: 05-identidade-coinki-pwa-e-onboarding
plan: 18
status: complete
completed: 2026-11-24
---

# 05-18 Resumo: site coinc-financias publicado

## Resultado
- Deploy de `hosting:coinc` feito pelo dono (resposta literal Task 1: `done cotinua`).
- Divergência de cache nas rotas do app corrigida no `firebase.json` (commit dd118128) e republicada. Conferido por curl em 2026-11-24: `/sw.js`, `/manifest.webmanifest`, `/`, `/index.html`, `/transacoes`, `/metas` e `/transacoes?x=1` saem com `no-cache`; só `/assets/**` é imutável.
- Logo do login quebrado em produção corrigido (b14df16b, `xmlns` no `icon.svg`).
- Task 3 (dono): login refeito na origem nova, dados presentes (Home e Transações), sem erro. Resposta literal: `done`.
- Site antigo intocado; o redirect fica no plano 05-19.

Evidência: `05-18-DEPLOY-EVIDENCE.md`.
