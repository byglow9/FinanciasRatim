---
phase: "03"
slug: limites-pode-gastar-e-central
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-18"
---

# Phase 03 — Validation Strategy

> Contrato de validação por fase. Fonte: `03-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (sem vitest, jsdom ou testing-library; Fase 1 D-11) |
| **Config file** | nenhum; scripts em `package.json` (`test:core`, `test:core:tz`, `test:static`, `test:rules`, `test:emu`) |
| **Quick run command** | `. ./scripts/dev-env.sh && npm run test:core && npm run test:static` |
| **Full suite command** | `. ./scripts/dev-env.sh && npm run test:core:tz && npm run test:static && npm run test:rules && npm run test:emu && npm --prefix server test && npm run build && npm run lint` |
| **Estimated runtime** | ~90 seconds |

---

## Sampling Rate

- **After every task commit:** Run `. ./scripts/dev-env.sh && npm run test:core && npm run test:static`
- **After every plan wave:** Run the full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Req | Behavior | Test Type | Automated Command | File Exists |
|-----|----------|-----------|-------------------|-------------|
| LIM-10 | `cycleOf` (dia 1, dia 31 em fev, virada dez→jan, fuso SP), `shiftCycle` | unit | `npm run test:core:tz` | ❌ W0 `cycle.test.js` |
| LIM-01 | `setLimit`/`limitForCycle` com histórico por ciclo | unit | `npm run test:core` | ❌ W0 `limits.test.js` |
| LIM-02 | `limitState` nas fronteiras 79,99/80/100/100,01 | unit | `npm run test:core` | ❌ W0 |
| LIM-03 | `spendByCategory`, Gasto geral, transfer excluído | unit | `npm run test:core` | ❌ W0 `budget.test.js` |
| LIM-04 | `safeToSpend`, `perDayCents`, `rhythm` 5 níveis | unit | `npm run test:core` | ❌ W0 |
| LIM-05 | `projectCycle`/`monthInOne` | unit | `npm run test:core` | ❌ W0 |
| LIM-06 | `incomeForCycle` | unit | `npm run test:core` | ❌ W0 |
| LIM-07 | `thresholdsToFire`, `alertId`, idempotência | unit | `npm run test:core` | ❌ W0 `alerts.test.js` |
| LIM-07 | regras de `limitAlerts` | rules | `npm run test:rules` | ❌ estender `matrix.test.js` |
| LIM-08 | `shouldSuppressVerdict` | unit | `npm run test:core:tz` | ❌ estender `bankStatus.test.js` |
| LIM-09 | atalhos e âncoras `lm`/`fx` | static | `npm run test:static` | ❌ W0 |
| CENT-01/02, IDEN-07 | rotas `/limites` e `/casal`, dock com 9 destinos | static + build | `npm run test:static && npm run build` | ❌ W0 |
| CENT-05 | 6 âncoras, `CategoryDef` com `icon`/`kind` | static + unit | `npm run test:static && npm run test:core` | ❌ W0 |
| CENT-06 | `fixedOccurrence` | unit | `npm run test:core` | ❌ W0 |
| FUND-06 | pureza dos módulos novos | static | `npm run test:core` | ❌ atualizar `purity.test.js` |
| D-18/D-22 | sem emoji; sem Google Fonts | static | `npm run test:static` | ❌ W0 |
| Índices | 19 índices, 12 com `ownerId` | static | `npm run test:static` | ❌ atualizar `firestore-config.test.js` |

*Task IDs e planos serão preenchidos pelo planejador.*

---

## Wave 0 Requirements

- [ ] `shared/core/test/{cycle,limits,budget,alerts}.test.js` — esqueletos para LIM-01..07, LIM-10, CENT-06
- [ ] `test/static/` — guardas de rotas, dock, âncoras, emoji, fontes
- [ ] `lint` verde (4 erros pré-existentes em `badge/button/input/select.tsx`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Contraste, zoom 200 %, 360 px, sheet com teclado, rolagem do dock, perfil somente leitura | CENT-01, IDEN-07 | Sem runner de UI | UAT humano em celular |
| Deploy de regras e índice de `limitAlerts` | LIM-07 | Ação com credencial do dono | Checkpoint humano |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
