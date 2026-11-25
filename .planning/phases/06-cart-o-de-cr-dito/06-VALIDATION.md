---
phase: "6"
slug: "cart-o-de-cr-dito"
status: partial
nyquist_compliant: false
wave_0_complete: true
created: "2026-11-25"
---

# Phase 6 — Validation Strategy

> Contrato de validação da Fase 6 (Cartão de crédito). Cada requisito CARD e CENT tem aqui o plano que o implementa, o comando automático que o prova, o arquivo de teste e o estado. `nyquist_compliant` fica `false` até o dono responder `06-UAT-ROTEIRO.md`; CARD-05 fica `parcial` (ver a seção própria).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (núcleo em `shared/core`, guardas estáticas em `test/static`, servidor em `server/test`, emulador em `server/test/emu`, regras em `test/rules`); auditores CDP em `scripts/ux-audit` |
| **Config file** | nenhum (scripts do `package.json`); ambiente `. ./scripts/dev-env.sh` antes de qualquer comando |
| **Quick run command** | `node --test shared/core/card*.test.js shared/core/purity.test.js` e `node --test test/static/phase6-*.test.js` |
| **Full suite command** | `npm run test:core:tz && npm run test:server && npm run test:emu && npm run test:rules && npm run test:static && npm run build && npm run lint` |
| **Estimated runtime** | alguns segundos o rápido; alguns minutos a suíte completa (o emulador sobe Firestore e Auth) |

---

## Sampling Rate

- **After every task commit:** comando rápido do plano (o `<automated>` da tarefa)
- **After every plan wave:** a parte da suíte completa que o plano toca (núcleo em dois fusos, servidor, emulador, regras ou estáticas) e `npm run build`
- **Before `/gsd-verify-work`:** suíte completa verde e o roteiro `06-UAT-ROTEIRO.md` respondido pelo dono
- **Max feedback latency:** 30 segundos (comando rápido)

---

## Evidência de fechamento (plano 06-15, 25/11/2026)

Ambiente `. ./scripts/dev-env.sh`, branch `main`. A suíte rodou sobre o repositório com a guarda `phase6-final.test.js` já commitada. Durante a rodada o diretório de trabalho tinha, além de `.planning/state.json`, alterações que não são deste plano (fala do Vintém espiando pela lateral: `toast.tsx`, `VintemToast.tsx`, `index.css` e a guarda `phase4-reactions.test.js`); a suíte passou com elas presentes.

| Comando | Resultado |
|---------|-----------|
| `node --test test/static/phase6-final.test.js` | 14 passam, 0 falham |
| `npm run test:core:tz` | 900 passam, 0 falham em UTC e 900 passam, 0 falham em Asia/Tokyo |
| `npm run test:server` | 124 passam, 0 falham |
| `npm run test:emu` | 153 passam, 0 falham |
| `npm run test:rules` | 13 passam, 0 falham |
| `npm run test:static` | 695 testes, 693 passam, 0 falham, 2 ignorados (já existentes: o bundle de produção sem credenciais legadas e a lista de bloqueio de frases do dono, que não foi fornecida) |
| `npm run build` | saída 0 (PWA v2.0.0, injectManifest, 22 entradas de pré-cache, 2215,80 KiB) |
| `npm run lint` | saída 0 |

---

## Mapa por requisito

"Plano" = planos de implementação que cobrem o requisito (frontmatter `requirements`). A coluna do comando traz o que prova o requisito sem aparelho; o que só o dono e o tempo provam está em `06-UAT-ROTEIRO.md` (coluna Roteiro). A guarda transversal `phase6-final.test.js` confere que todos os dez requisitos têm plano.

| Requisito | Plano | Comando automático | Arquivo de teste | Roteiro | Estado |
|-----------|-------|--------------------|------------------|---------|--------|
| CARD-01 (registrar o que o MeuPluggy entrega) | 06-02 (sonda no 06-01 e 06-02) | `npm run test:server` (a sonda só grava tipos, contagens e enumerados) e leitura de `06-CARD-PROBE-792a3230.md`, `06-02-TRACER-EVIDENCE.md` e `06-14-DEPLOY-EVIDENCE.md` | `server/test/card-probe.test.js` | itens 4 e 6 | provado pela sonda e pela evidência do 06-02 e do 06-14 (a conferência com o app do Nubank bateu em 24/11/2026) |
| CARD-02 (cartão como conta própria: limite, fatura aberta, fechamento, vencimento) | 06-01, 06-02, 06-07, 06-09, 06-10, 06-16, 06-20 | `npm run test:core:tz && npm run test:rules && node --test test/static/phase6-cards-ui.test.js test/static/phase6-settings.test.js test/static/phase6-dock.test.js test/static/phase6-audit.test.js` | `shared/core/cards.test.js`, `test/rules`, `phase6-cards-ui`, `phase6-settings`, `phase6-dock`, `phase6-audit` | itens 2 e 7 | verde (automático); dock no celular fica no roteiro |
| CARD-03 (compras contam nos limites pela data da compra) | 06-04, 06-05, 06-06, 06-11, 06-17, 06-18, 06-19 | `npm run test:core:tz && npm run test:emu` | `cardTx.test.js`, `ledger.test.js`, `budget.test.js`, `cardManual.test.js`, `couple.test.js`, `series.test.js` (núcleo) e `server/test/emu/card-sync.test.js` | item 8 | verde (automático); lançamento manual no cartão fica no roteiro |
| CARD-04 (pagamento da fatura é transferência, nunca gasto) | 06-05, 06-08, 06-12 | `npm run test:core:tz && npm run test:emu && node --test test/static/phase6-bill-detail.test.js` | `cardPayments.test.js` (núcleo), `server/test/emu/card-payments.test.js`, `phase6-bill-detail` | item 3 | verde (automático); o pagamento real da fatura só acontece depois do vencimento, no roteiro |
| CARD-05 (parcelas como N/M e o que sai em cada fatura futura) | 06-04, 06-10, 06-12 | `npm run test:core:tz && node --test test/static/phase6-cards-ui.test.js test/static/phase6-bill-detail.test.js` | `cardInstallments.test.js`, `phase6-cards-ui`, `phase6-bill-detail` | item 4 | **parcial**, ver abaixo |
| CARD-06 (saldo da conta não cai com compra no cartão) | 06-05, 06-06, 06-08, 06-11, 06-17, 06-18, 06-19 | `npm run test:core:tz && npm run test:emu && node --test test/static/phase6-transactions.test.js test/static/phase6-launch.test.js` | `ledger.test.js`, `cardManual.test.js`, `server/test/emu/card-sync.test.js`, `phase6-transactions`, `phase6-launch` | itens 3 e 8 | verde (automático) |
| CARD-07 (pendente vira confirmada sem duplicar) | 06-04, 06-06, 06-18, 06-19 | `npm run test:core:tz && npm run test:emu` | `cardReconcile.test.js`, `cardAdopt.test.js`, `server/test/emu/card-sync.test.js`, `server/test/emu/card-history.test.js` | itens 1, 8 e 9 | verde (automático); a passagem de pendente a confirmada de verdade depende do ciclo diário do MeuPluggy |
| CARD-08 (fatura calculada pelas datas do usuário se o MeuPluggy não trouxer) | 06-03, 06-07, 06-09, 06-10 | `npm run test:core:tz && node --test test/static/phase6-settings.test.js` | `cardBills.test.js`, `phase6-settings` | item 2 | verde (automático); a hipótese do dia do fechamento fica nas decisões do dono |
| CENT-03 (Central mostra cada cartão: fatura, datas, limite, próximas faturas, parcelas, status) | 06-01, 06-02, 06-03, 06-07, 06-10, 06-12, 06-16, 06-20 | `npm run test:core:tz && node --test test/static/phase6-cards-ui.test.js test/static/phase6-bill-detail.test.js test/static/phase6-audit.test.js` | `cardBills.test.js`, `phase6-cards-ui`, `phase6-bill-detail`, `phase6-audit` | itens 2 e 7 | verde (automático); status fechada e atrasada só ao vivo, no roteiro |
| CENT-04 (vencimentos de fatura no Calendário e nos alertas) | 06-13 | `npm run test:core:tz && node --test test/static/phase6-calendar.test.js` | `cardCalendar.test.js`, `calendarModel.test.js`, `phase6-calendar` | item 2 | verde (automático); o aviso real de fatura perto de vencer fica no roteiro |

### CARD-05 parcial

A heurística de parcelas (`shared/core/cardInstallments.js`) e a interface (N/M na fatura, "a sair nas próximas faturas") existem e têm teste, mas a regra foi **desenhada sem nenhuma compra parcelada real**: a sonda de 24/11/2026 achou 6 compras e nenhuma com `installmentNumber` ou `totalInstallments` (D-06). O que o Open Finance entrega para parcelas (grupo, total, data da compra ou da fatura) varia por banco e não pôde ser conferido. A reavaliação com a primeira compra parcelada real é um item aberto de `06-UAT-ROTEIRO.md` (item 4, D-07): rodar a sonda somente leitura, registrar se vêm `installmentNumber` e `totalInstallments`, conferir o N/M na fatura e rever a regra de data e a heurística. Até lá CARD-05 não é dado como provado.

---

## Mapa por plano

Uma linha por plano de implementação (o `<automated>` de cada tarefa está no próprio plano; aqui fica o comando que fecha o plano e o estado do resumo). Os planos de fechamento (06-14 e 06-15) não implementam requisito novo.

| Plano | Onda | Requisitos | Comando que fecha o plano | Estado |
|-------|------|-----------|---------------------------|--------|
| 06-01 | 1 | CARD-02, CENT-03 | `node --test shared/core/cards.test.js && npm run test:emu && npm run test:rules && npm run test:static` | verde (completo) |
| 06-02 | 2 | CARD-01, CARD-02, CENT-03 | suíte completa e `06-02-TRACER-EVIDENCE.md` | parcial no resumo (o item de compra parcelada real e a sonda do ciclo de 25/11 seguem no roteiro) |
| 06-03 | 3 | CARD-08, CARD-02, CENT-03 | `npm run test:core:tz && node --test shared/core/cardBills.test.js` | verde (completo) |
| 06-04 | 3 | CARD-07, CARD-05, CARD-03 | `npm run test:core:tz && node --test shared/core/cardReconcile.test.js` | verde (completo) |
| 06-05 | 3 | CARD-03, CARD-04, CARD-06 | `npm run test:core:tz && node --test shared/core/budget.test.js` | verde (completo) |
| 06-06 | 4 | CARD-03, CARD-06, CARD-07, CARD-02 | `npm run test:emu && npm run test:server` | verde (completo) |
| 06-07 | 4 | CARD-02, CARD-08, CENT-03 | `npm run build && npm run lint && npm run test:static` | verde (completo) |
| 06-08 | 5 | CARD-04, CARD-06 | `npm run test:emu && npm run test:server` | verde (completo) |
| 06-09 | 5 | CARD-08, CARD-02 | `node --test test/static/phase6-settings.test.js && npm run test:static` | verde (completo) |
| 06-10 | 5 | CARD-02, CENT-03, CARD-08, CARD-05 | `node --test test/static/phase6-cards-ui.test.js && npm run test:static && npm run build && npm run lint` | verde (completo) |
| 06-11 | 5 | CARD-06, CARD-03 | `node --test test/static/phase6-transactions.test.js && npm run test:static` | verde (completo) |
| 06-12 | 6 | CARD-05, CARD-04, CENT-03 | `node --test test/static/phase6-bill-detail.test.js && npm run test:static` | verde (completo) |
| 06-13 | 5 | CENT-04 | `node --test test/static/phase6-calendar.test.js && npm run test:static && npm run build && npm run lint` | verde (completo) |
| 06-14 | 8 | todos | portão local, rollback das regras e passos de publicação (`06-14-DEPLOY-EVIDENCE.md`) | completo: o dono publicou, testou e aprovou |
| 06-15 | 9 | todos | `node --test test/static/phase6-final.test.js` e a suíte completa (esta página) | este plano |
| 06-16 | 3 | CENT-03, CARD-02 | `node --test test/static/phase6-dock.test.js && node scripts/ux-audit/audit.mjs --route / --viewport 360x640 --assert dock-peek` | verde (completo) |
| 06-17 | 5 | CARD-03, CARD-06 | `node --test test/static/phase6-launch.test.js && node --test test/static/phase3-launcher.test.js && npm run test:static` | verde (completo) |
| 06-18 | 6 | CARD-07, CARD-03, CARD-06 | `npm run test:emu && npm run test:server` | verde (completo) |
| 06-19 | 7 | CARD-07, CARD-06, CARD-03 | `npm run test:emu && npm run test:server` | verde (completo) |
| 06-20 | 7 | CENT-03, CARD-02 | `node --test test/static/phase6-audit.test.js && node scripts/ux-audit/audit.mjs --routes all --seed cards --assert dock-peek && node scripts/ux-audit/theme.mjs --audit --route cartoes` | verde (completo) |

---

## Mapa das decisões D-11 a D-14

| Decisão | Plano | Teste ou guarda | Comando | Estado |
|---------|-------|-----------------|---------|--------|
| D-11: dock de 9 destinos, Cartões depois de Contas fixas | 06-16 e 06-20 | `phase6-dock.test.js`, o auditor de espiada (`audit.mjs --assert dock-peek`) e a guarda transversal | `node --test test/static/phase6-dock.test.js test/static/phase6-final.test.js` | verde (automático); o dock no celular fica no roteiro (item 7) |
| D-12: chip Cartão do lançamento manual e adoção do manual pela compra importada | 06-17 e 06-18 | `phase6-launch.test.js`, `cardManual.test.js`, `cardAdopt.test.js` e os cenários do emulador (`card-sync`) | `node --test test/static/phase6-launch.test.js shared/core/cardManual.test.js shared/core/cardAdopt.test.js && npm run test:emu` | verde (automático); lançar de verdade no cartão fica no roteiro (item 8) |
| D-13: histórico completo, com ensaio e cópia de segurança | 06-06, 06-18, 06-19 e 06-08 | cenários de `card-sync.test.js`, `card-history.test.js` e `backup-guard.test.js`, mais a guarda transversal (ensaio como padrão, `--backup` exigido, `historyBaselineAt`) | `npm run test:emu && npm run test:server && node --test test/static/phase6-final.test.js` | verde (automático); a conferência do histórico importado fica no roteiro (item 9) |
| D-14: sem tempo real (sync, webhook e cadência intactos); Casal e Relatórios contam a compra; Marcar como paga | 06-05 e 06-12 | `couple.test.js` e `series.test.js` (06-05), `phase6-bill-detail.test.js` (06-12) e a guarda transversal (`webhook.js` e `app.js` sem o cartão, interface sem texto de tempo real) | `npm run test:core:tz && node --test test/static/phase6-bill-detail.test.js test/static/phase6-final.test.js` | verde (automático) |

---

## Wave 0 Requirements

Cada item nasceu na primeira tarefa do plano indicado (tracer-first). Wave 0 está completa: todos os itens existem e passam.

- [x] `shared/core/cards.js`, `cardBills.js`, `cardTx.js`, `cardInstallments.js`, `cardReconcile.js`, `cardPayments.js`, `cardCalendar.js`, `cardManual.js` e `cardAdopt.js`, cada um com `.test.js`; `purity.test.js` descobre os novos módulos sozinho
- [x] `test/static/phase6-{audit,bill-detail,calendar,cards-ui,dock,launch,settings,transactions,final}.test.js`
- [x] `server/test/card-probe.test.js`, `server/test/emu/{card-sync,card-history,card-payments}.test.js` e `server/test/backup-guard.test.js`
- [x] Regra `cards` (somente leitura) e `cardSettings` (do dono) em `firestore.rules`, índice de `transactions` por `ownerId`, `cardId` e `date` em `firestore.indexes.json`, e a matriz de `test/rules`
- [x] Dados simulados do cartão e `/cartoes` nos auditores `audit.mjs` e `theme.mjs` (plano 06-20)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Compra pendente vira confirmada sem duplicar depois do ciclo diário | CARD-07 | Depende do relógio do MeuPluggy (cerca de 11:46) | `06-UAT-ROTEIRO.md` item 1 |
| Fechamento, aviso e atraso da fatura | CARD-08, CENT-03, CENT-04 | Depende do calendário real (fecha em 07/12, vence em 14/12) | `06-UAT-ROTEIRO.md` item 2 |
| Pagamento real da fatura | CARD-04, CARD-06 | Exige pagar de verdade | `06-UAT-ROTEIRO.md` item 3 |
| Primeira compra parcelada real | CARD-05 | Não existe compra parcelada nos dados (D-06, D-07) | `06-UAT-ROTEIRO.md` item 4 |
| Compra internacional e IOF em reais | CARD-02, CARD-03 | Depende de uma compra desse tipo | `06-UAT-ROTEIRO.md` item 5 |
| Dock de 9 destinos no celular a 360 px | CENT-03, CARD-02 | Aparelho real | `06-UAT-ROTEIRO.md` item 7 |
| Lançamento manual no cartão e adoção pela compra importada | CARD-03, CARD-06, CARD-07 | Fluxo do dono com dado real | `06-UAT-ROTEIRO.md` item 8 |
| Histórico completo importado: meses antigos e possíveis duplicados | CARD-07 | Só o dono reconhece as compras | `06-UAT-ROTEIRO.md` item 9 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s (comando rápido)
- [ ] `nyquist_compliant: true` set in frontmatter (fica `false` até o dono responder `06-UAT-ROTEIRO.md`)

**Approval:** parcial. Suíte completa verde e nove dos dez requisitos provados por automação; CARD-05 parcial (regra desenhada sem compra parcelada real); os itens de aparelho, de tempo e de dinheiro real estão em `06-UAT-ROTEIRO.md`.
