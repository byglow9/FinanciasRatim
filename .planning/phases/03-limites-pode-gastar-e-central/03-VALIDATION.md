---
phase: "03"
slug: limites-pode-gastar-e-central
status: draft
nyquist_compliant: true
wave_0_complete: false
created: "2026-11-18"
---

# Phase 03 — Validation Strategy

> Contrato de validação por fase. Fonte: `03-RESEARCH.md` § Validation Architecture. O mapa abaixo foi preenchido pelo planejamento (20 planos); o Plano 20 fecha `wave_0_complete` e a assinatura depois da suíte completa verde.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (sem vitest, jsdom ou testing-library; Fase 1 D-11; PR-16) |
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

Notação do Task ID: `03-NN-T#` = plano NN, tarefa #. Os testes novos nascem na própria tarefa (TDD ou guarda criada junto), então não há tarefa sem `<automated>`.

| Req | Behavior | Test Type | Automated Command | Task(s) | File Exists |
|-----|----------|-----------|-------------------|---------|-------------|
| LIM-10 | `cycleOf` (dia 1, dia 31 em fev, virada dez→jan, fuso SP, horário de verão antigo), `shiftCycle`, `cycleDay`, dia do salário por pessoa | unit | `npm run test:core:tz` | 03-03-T1, 03-03-T3 | ❌ W0 `cycle.test.js`, `limits.test.js` |
| LIM-10 | Dia do salário na interface: `DayPicker`, confirmação inline, `rekeyForSalaryDay` | static + build | `npm run test:static && npm run build` | 03-15-T1, 03-10-T2 | ❌ `phase3-settings-cycle.test.js` |
| LIM-01 | `setLimit`/`limitForCycle` com histórico por ciclo; `setCategoryLimit` | unit | `npm run test:core:tz` | 03-03-T3 | ❌ W0 `limits.test.js` |
| LIM-01 | `updatePersonConfig` cria o mapa pai e não apaga o nó do parceiro (A3) | rules (emulador) | `npm run test:rules` | 03-05-T1 | ❌ estender `matrix.test.js` |
| LIM-01 | Editor de categoria grava limite só em Configurações (D-21) | static + build | `npm run test:static && npm run build` | 03-17-T1, 03-17-T3 | ❌ `phase3-settings-categories.test.js` |
| LIM-02 | `limitState` nas fronteiras 79,99/80/100/100,01 | unit | `npm run test:core:tz` | 03-03-T3 | ❌ W0 |
| LIM-02 | `LimitRow` (barra, estado em texto, expansão, `cat-{id}`) | static + build | `npm run test:static && npm run build` | 03-14-T2, 03-19-T1 | ❌ `phase3-home-components.test.js` |
| LIM-03 | `spendByCategory`, Gasto geral, transfer excluído, arquivada | unit | `npm run test:core:tz` | 03-06-T1 | ❌ W0 `budget.test.js` |
| LIM-04 | `safeToSpend`, `perDayCents`, `rhythm` 5 níveis, `previewLaunch` | unit | `npm run test:core:tz` | 03-06-T1, 03-06-T2, 03-06-T3 | ❌ W0 |
| LIM-04 | Formatação, teclado e tamanho do número (`format.js`) | unit | `npm run test:core:tz` | 03-04-T3 | ❌ W0 `format.test.js` |
| LIM-04 | Hero da Home sem fórmula na página, estados e textos | static + build | `npm run test:static && npm run build` | 03-18-T1, 03-18-T2, 03-18-T3 | ❌ `phase3-home.test.js` |
| LIM-05 | `projectCycle`/`monthInOne` | unit | `npm run test:core:tz` | 03-06-T3 | ❌ W0 |
| LIM-06 | `incomeForCycle` (esperada, override, `max`, sem renda) | unit | `npm run test:core:tz` | 03-06-T1 | ❌ W0 |
| LIM-06 | Renda esperada por ciclo ou para todos | static + build | `npm run test:static && npm run build` | 03-15-T2 | ❌ `phase3-settings-cycle.test.js` |
| LIM-07 | `thresholdsToFire`, `alertId`, idempotência, `rekeyAlerts` | unit | `npm run test:core:tz` | 03-04-T1 | ❌ W0 `alerts.test.js` |
| LIM-07 | Regras de `limitAlerts` e criar-se-ausente por transação | rules (emulador) | `npm run test:rules` | 03-07-T1 | ❌ estender `matrix.test.js` |
| LIM-07 | Índice `limitAlerts` e serviço no escopo do dono | static | `npm run test:static` | 03-07-T2, 03-07-T3 | ❌ atualizar `firestore-config.test.js` e `owner-queries.test.js` |
| LIM-07 | Avaliador de avisos e sino | static + build | `npm run test:static && npm run build` | 03-10-T2, 03-10-T3, 03-13-T1 | ❌ `phase3-data.test.js`, `phase3-topbar.test.js` |
| LIM-07 | Publicação de regras e índice (ação com credencial do dono) | manual (checkpoint humano) | `npm run test:rules && npm run test:static` (portão local) | 03-11-T1, 03-11-T2 | ❌ evidência `03-11-DEPLOY-EVIDENCE.md` |
| LIM-08 | `shouldSuppressVerdict` | unit | `npm run test:core:tz` | 03-04-T2 | ❌ estender `bankStatus.test.js` |
| LIM-08 | `StaleNotice` e `RhythmPill` neutra com dado velho | static + build | `npm run test:static && npm run build` | 03-14-T1, 03-14-T3, 03-18-T1 | ❌ `phase3-home-components.test.js` |
| LIM-09 | Atalhos, âncoras `lm`/`fx` e lançamento em sheet | static + build | `npm run test:static && npm run build` | 03-12-T1, 03-12-T2, 03-12-T3, 03-14-T3, 03-18-T2 | ❌ `phase3-launcher.test.js` |
| CENT-01/02, IDEN-07 | Rotas `/limites` e `/casal`, dock com 9 destinos, Central só exibe | static + build | `npm run test:static && npm run build` | 03-16-T1, 03-16-T3, 03-19-T1, 03-19-T3 | ❌ `phase3-shell.test.js`, `phase3-central.test.js` |
| CENT-05 | `CategoryDef` com `icon`/`kind` e as 6 âncoras de Configurações | static + unit | `npm run test:static && npm run test:core:tz` | 03-04-T2, 03-15-T1, 03-17-T3 | ❌ W0; estender `categories.test.js` |
| CENT-06 | `billOccurrences` (dia 31/fev, antes/depois do início) e `billsForCycle` | unit | `npm run test:core:tz` | 03-03-T2, 03-06-T1 | ❌ W0 |
| CENT-06 | Resumo de Contas Fixas na Home com Marcar pago manual (REV-03) | static + build | `npm run test:static && npm run build` | 03-14-T2, 03-18-T2 | ❌ `phase3-home.test.js` |
| FUND-06 | Pureza dos módulos novos (descoberta automática) | static | `npm run test:core:tz` | 03-03-T1 | ❌ atualizar `purity.test.js` |
| D-18/D-22 | Sem emoji; sem Google Fonts; `lang="pt-BR"`; tema claro forçado | static | `npm run test:static` | 03-02-T1, 03-10-T3, 03-20-T1 | ❌ W0 `phase3-base.test.js` |
| Lint | `npm run lint` verde (4 erros pré-existentes) | lint | `npm run lint` | 03-02-T3 | ✅ |
| Primitivos | Contratos de acessibilidade e escala tipográfica | static | `npm run test:static` | 03-08-T1, 03-08-T2, 03-08-T3, 03-09-T1, 03-09-T2, 03-09-T3 | ❌ `phase3-primitives-restyle.test.js`, `phase3-primitives-new.test.js` |
| Índices | 19 índices, 12 com `ownerId` | static | `npm run test:static` | 03-07-T2 | ❌ atualizar `firestore-config.test.js` |
| Transversal | Rotas, remoções, fórmula só no núcleo, regras e índice, cobertura dos 15 requisitos | static | `npm run test:static` | 03-20-T1 | ❌ `phase3-final.test.js` |
| Fase | Suíte completa verde e roteiro de UAT | full suite + manual | comando da suíte completa | 03-20-T2, 03-20-T3 | ❌ `03-UAT-GUIDE.md` |

---

## Wave 0 Requirements

- [ ] `shared/core/{cycle,limits,budget,alerts,format}.test.js` — testes novos nascem nas tarefas TDD dos planos 03, 04 e 06
- [ ] `test/static/` — guardas de rotas, dock, âncoras, emoji, fontes (planos 02, 08, 09, 10, 12 a 19 e a final do 20)
- [ ] `lint` verde (4 erros pré-existentes em `badge/button/input/select.tsx`) — plano 02, tarefa 3

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Contraste, zoom 200 %, 360 px, sheet com teclado, rolagem do dock, perfil somente leitura | CENT-01, IDEN-07 | Sem runner de UI | UAT humano em celular (`03-UAT-GUIDE.md`) |
| Deploy de regras e índice de `limitAlerts` | LIM-07 | Ação com credencial do dono | Checkpoint humano do Plano 11 |
| Avisos de 80% e 100% sem repetição, em recarga e em outra aba | LIM-07 | Depende de dados reais e de dois contextos de navegador | UAT humano (`03-UAT-GUIDE.md`, passo i) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter (mapa preenchido; todas as tarefas dos planos 02 a 20 têm `<automated>`)

**Approval:** pending (fechada no Plano 20, tarefa 2, depois da suíte completa verde)
