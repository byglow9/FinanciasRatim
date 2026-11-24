---
phase: 06-cart-o-de-cr-dito
plan: 17
subsystem: lançamento manual / cartão
tags: [launcher, cartao, d-12, nucleo-puro, guardas]
requires: [06-05, 06-07]
provides: [lancamento-manual-no-cartao, contrato-adocao-manual]
affects: [shared/core/cardManual.js, src/components/launcher/LaunchSheet.tsx, src/components/launcher/CardPicker.tsx]
key-files:
  created:
    - shared/core/cardManual.js
    - shared/core/cardManual.test.js
    - src/components/launcher/CardPicker.tsx
    - test/static/phase6-launch.test.js
  modified:
    - src/components/launcher/LaunchSheet.tsx
    - test/static/phase3-launcher.test.js
decisions:
  - "O gasto no cartão grava só cardId e cardKind purchase; billMonth, cardStatus e source ficam de fora (mês da fatura derivado na leitura, D-12)"
  - "A escolha do cartão é derivada (tocado, senão o primeiro); cartão que some ou perfil sem cartão devolve o pagamento para Conta"
  - "Chip Cartão desabilitado usa o aria-disabled do Chip, com title no envoltório e motivo em sr-only dentro do chip (Chip não tem prop de descrição)"
status: complete
plan_head_before: c8158f91d9367d7e1aff70d1e4d13316e99749c3
commits: 3
actuals:
  tokens: 14000
  tasks: 3
  commits: 3
requirements: [CARD-03, CARD-06]
completed: 2026-11-24
---

# Phase 6 Plan 17: Chip Cartão do lançamento manual Summary

O chip Cartão do lançamento deixa de ser provisório: na aba Gasto fica habilitado com cartão no perfil (desabilitado com o motivo sem cartão), o dono escolhe o cartão quando há mais de um, e o gasto grava só `cardId` e `cardKind: 'purchase'`, contando nos limites pela data e sem baixar o saldo da conta.

## Tarefas

| Tarefa | Commit | Arquivos |
|--------|--------|----------|
| 1. Contrato puro do lançamento manual no cartão | 20a88314 | cardManual.js, cardManual.test.js |
| 2. Chip habilitado, CardPicker e gravação com cardId/cardKind | 1840f9bc | LaunchSheet.tsx, CardPicker.tsx, phase3-launcher.test.js |
| 3. Guarda estática do lançamento no cartão | 6031d6be | phase6-launch.test.js, LaunchSheet.tsx (ajuste do bloco de chips) |

## O que foi feito

- `cardManual.js` (puro, sem pacote nem relógio): `isCardId`, `manualCardFields`, `isManualCardPurchase` (critério de adoção do 06-18) e `cardChoices` (rótulo por apelido, nome ou "Cartão", ordem estável por rótulo e id).
- `LaunchSheet.tsx`: `useCards` dentro do formulário (só monta com a folha aberta); chips Conta e Cartão só na aba Gasto; `CardPicker` abaixo da linha quando há mais de um cartão; linha text-xs "Conta nos limites pela data da compra e não baixa o saldo até você pagar a fatura"; toast "Gasto lançado no cartão {nome} em {categoria}: {valor}" com o detalhe "Não baixa o saldo da conta; conta no Pode gastar.". O gasto em Conta, Receita e Porquinho mantêm payload, guardas, timeout e id idempotente.
- Guardas: `phase3-launcher.test.js` troca só o rótulo provisório por "Cartão" e "Nenhum cartão conectado neste perfil"; `phase6-launch.test.js` trava importações, chip só no Gasto, payload sem billMonth/cardStatus/source, ausência de conta de fatura na folha, Chip com aria-pressed e escala/alvos/emoji.

## Resultados

- `node --test shared/core/cardManual.test.js` e `purity.test.js`: 140 ok
- `npm run test:static`: 655 ok, 0 falha; `npm run test:core:tz`: 875 ok, 0 falha
- `npm run build` e `npm run lint`: limpos (sem warnings)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Bloqueio] Guarda do LaunchSheet compacto (phase3-gaps.test.js) quebrou com a primeira estrutura**
- **Found during:** Task 3 (test:static)
- **Issue:** a guarda exige `<div>` seguido direto de `<Chip` na linha Categoria; o fragmento condicional da aba Gasto quebrou a expressão.
- **Fix:** a linha com os chips passou a ser renderizada só no Gasto (nas outras abas fica só o rótulo "Categoria"), sem afrouxar a guarda.
- **Files modified:** src/components/launcher/LaunchSheet.tsx
- **Commit:** 6031d6be

**2. [Rule 2 - Acessibilidade] Motivo do chip desabilitado**
- O `Chip` não tem prop de descrição e não está em `files_modified`; o motivo vai em `title` de um envoltório e em texto `sr-only` dentro do chip. Enquanto os cartões carregam, o motivo diz "Carregando os cartões".

`commits: 3` conta só os commits deste plano; o intervalo `plan_head_before..HEAD` tem mais commits porque outros planos da fase rodaram em paralelo no mesmo ramo.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. Mitigações aplicadas: T-06-57 (linha fixa e detalhe do toast explicam que não baixa o saldo) e T-06-58 (rótulo só como texto React, guarda contra HTML bruto).

## Riscos

- Não verificado no navegador a 360x640 (só guardas estáticas e build): a folha rola pelo Sheet, mas com cartão escolhido há uma linha de chips e uma de aviso a mais.
- A adoção do manual pela compra da Pluggy é do 06-18; até lá o manual fica como compra do cartão sem `bankImportId`.
- Os totais `billTotals` só sobem na próxima sincronização (D-12); `/cartoes` e Transações mostram a compra na hora.

## Self-Check: PASSED

- FOUND: shared/core/cardManual.js, shared/core/cardManual.test.js, src/components/launcher/CardPicker.tsx, test/static/phase6-launch.test.js
- FOUND commits: 20a88314, 1840f9bc, 6031d6be
