---
phase: 05-identidade-coinki-pwa-e-onboarding
plan: 13
subsystem: ui
tags: [icone, pwa, svg, decisao-do-dono, coinc]
status: complete
requires: ["05-05", "05-07"]
provides:
  - "icone definitivo do app: versao R1 do sketch 025 (silhueta verde do Vintem, dois olhos, focinho de pilula, fundo creme em degrade)"
  - "assets-src/icon/icon.svg e assets-src/maskable/icon-maskable.svg da versao R1, public/icons/*, public/favicon.* regenerados por npm run icons"
  - "test/static/phase5-icons.test.js independente da cor do icone"
affects: [05-18, 05-20]
actuals:
  tasks: 2
---

# Plano 05-13: escolha e aplicacao do icone

## Decisao do dono (Task 1)

O dono recusou as cinco versoes do sketch 021 (o porquinho creme sobre verde) e pediu o porquinho **verde sobre creme**, minimalista e moderno, na linha do app, sem detalhe realista. Houve quatro rodadas de sketch (022 a 025). Resposta literal na ultima: "pode ser o R1" (versao R1 do sketch 025: silhueta verde do Vintem, dois olhos redondos, focinho de pilula verde-claro maior, fundo creme em degrade). A decisao foi dada ao orquestrador na conversa.

## Task 2: aplicacao

- `assets-src/icon/icon.svg` e `assets-src/maskable/icon-maskable.svg` gerados a partir da funcao `icon('r1')` do sketch 025 (borda a borda para o maskable); `npm run icons` regenerou `public/icons/*`, `public/favicon.svg` e `public/favicon.ico`.
- `test/static/phase5-icons.test.js`: as duas guardas que supunham o desenho da versao A (borda verde, silhueta creme) agora acham a silhueta pela distancia ao degrade das bordas, valendo para qualquer ícone.
- `MANIFEST.md`: linhas 021 e 022 a 025 com a decisao.
- Verificacao: guarda de icones 9/9, `npm run test:static` 572 passam e 0 falham, `npm run build` ok, autoteste do sketch 021 em FALHAS 0.

## Desvios

1. A escolha nao foi entre as cinco versoes do plano (A a E): o dono pediu nova rodada e escolheu R1 no sketch 025.
2. A Task 2 foi feita pelo orquestrador, nao pelo executor, porque a decisao veio diretamente do dono ao orquestrador.

## Pendencia humana

Olhar o favicon, a marca no Login (claro e escuro) e o ícone na tela inicial do aparelho (UAT do plano 05-20).
