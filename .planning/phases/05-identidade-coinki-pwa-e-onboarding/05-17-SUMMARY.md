---
phase: 05-identidade-coinki-pwa-e-onboarding
plan: 17
subsystem: infra
tags: [railway, cors, firebase-auth, producao, coinc]
status: complete
requires: ["05-08", "05-13", "05-16"]
provides:
  - "ALLOWED_ORIGINS no Railway com https://coinc-financias.web.app, servidor reiniciado e conferido por curl"
  - "dominio coinc-financias.web.app autorizado no Firebase Auth; chave de API do navegador sem restricao por site"
  - "05-17-DEPLOY-EVIDENCE.md com portao local, conferencias e rollback"
affects: [05-18, 05-19]
actuals:
  tasks: 3
---

# Plano 05-17: origem da API e dominio do login

## O que foi feito

- **Task 1 (portao local):** static 573/575 (2 ignorados), core 699/699, server 81/81, build e lint limpos.
- **Task 2 (Railway):** o dono acrescentou a origem nova a `ALLOWED_ORIGINS` e reiniciou. O orquestrador conferiu por curl: origem nova 401, antiga 401, estranha 403, preflight devolve a origem permitida.
- **Task 3 (Auth e chave):** o dono autorizou `coinc-financias.web.app` nos dominios do Auth (captura) e confirmou que a chave de API do navegador esta em "Nenhum" nas restricoes de aplicativo (captura); nada a ajustar.

## Desvios

- Os passos humanos foram confirmados pelo dono por capturas de tela e pelo orquestrador por curl, nao pelo texto "done" literal do plano. A URL do servidor veio da evidencia da fase 1.
- A evidencia e este SUMMARY foram escritos pelo orquestrador, nao por um executor.

## Proximo

Plano 05-18: deploy do site `coinc-financias` e login do dono no endereco novo.
