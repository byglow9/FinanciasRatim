---
phase: "4"
slug: "mascote-vint-m"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-19"
---

# Phase 4 — Validation Strategy

> Contrato de validação da Fase 4 (Mascote Vintém). A estratégia completa, com o mapa requisito-teste, está na seção "Validation Architecture" de `04-RESEARCH.md`; este arquivo a resume e a planejadora a detalha por tarefa.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` + `node:assert/strict` (Node 22.23.5); autoteste de pixels por CDP no Chrome |
| **Config file** | nenhum (scripts em `package.json`); acrescentar `test:vintem` opcional |
| **Quick run command** | `node --test shared/core/vintem*.test.js shared/core/insights.test.js shared/core/phrasePicker.test.js` |
| **Full suite command** | `npm run test:core:tz && npm run test:static && node scripts/ux-audit/vintem.mjs` |
| **Estimated runtime** | ~30 s o comando rápido; alguns minutos a suíte completa |

---

## Sampling Rate

- **After every task commit:** comando rápido (modelo, humor, detector, frases)
- **After every plan wave:** `npm run test:core:tz && npm run test:static`
- **Before `/gsd-verify-work`:** suíte completa verde, inclusive `node scripts/ux-audit/vintem.mjs` terminando em `FALHAS 0`
- **Max feedback latency:** 30 segundos

---

## Per-Task Verification Map

Preenchido pelo planejador (20 planos, 59 tarefas) a partir da tabela "Phase Requirements → Test Map" de `04-RESEARCH.md` (MASC-01 a MASC-07), uma linha por tarefa. O comando é o `<automated>` do plano, sem o prefixo `. ./scripts/dev-env.sh &&` (todo comando roda depois dele). "File Exists" ❌ W0 = o teste nasce na própria tarefa (tracer-first); o plano 04-19 atualiza a coluna Status e a conformidade ao fechar a fase.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | MASC-02,  MASC-03 | T-04-01-* | Tabelas congeladas e passo de integração limitado; sem acaso nativo no núcleo | unitário (núcleo) | `node --test shared/core/vintemSpring.test.js shared/core/purity.test.js` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | MASC-02,  MASC-03 | T-04-01-* | Tabelas congeladas e passo de integração limitado; sem acaso nativo no núcleo | unitário (núcleo) | `node --test shared/core/vintemStates.test.js shared/core/vintemSpring.test.js` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | MASC-02,  MASC-03 | T-04-01-* | Tabelas congeladas e passo de integração limitado; sem acaso nativo no núcleo | unitário (núcleo) | `npm run test:core:tz` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | MASC-02 | T-04-02-* | Dado velho nunca gera veredito; fronteira de estouro por inteiros e row.state | unitário (núcleo) | `node --test shared/core/vintemMood.test.js shared/core/purity.test.js` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | MASC-02 | T-04-02-* | Dado velho nunca gera veredito; fronteira de estouro por inteiros e row.state | unitário (núcleo) | `node --test shared/core/vintemMood.test.js` | ❌ W0 | ⬜ pending |
| 04-02-03 | 02 | 1 | MASC-02 | T-04-02-* | Dado velho nunca gera veredito; fronteira de estouro por inteiros e row.state | unitário (núcleo) | `npm run test:core:tz` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 1 | MASC-04 | T-04-03-* | Nenhum nome de pessoa, CPF, conta, cartão ou e-mail em insight, id ou payload | unitário (núcleo) | `node --test shared/core/insights.test.js shared/core/purity.test.js` | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 1 | MASC-04 | T-04-03-* | Nenhum nome de pessoa, CPF, conta, cartão ou e-mail em insight, id ou payload | unitário (núcleo) | `node --test shared/core/insights.test.js` | ❌ W0 | ⬜ pending |
| 04-03-03 | 03 | 1 | MASC-04 | T-04-03-* | Nenhum nome de pessoa, CPF, conta, cartão ou e-mail em insight, id ou payload | unitário (núcleo) | `npm run test:core:tz` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 1 | MASC-04,  MASC-07 | T-04-04-* | Encaixes cortados e texto React; régua barra dado pessoal e cara de IA | unitário (núcleo) | `node --test shared/core/phrasePicker.test.js shared/core/purity.test.js` | ❌ W0 | ⬜ pending |
| 04-04-02 | 04 | 1 | MASC-04,  MASC-07 | T-04-04-* | Encaixes cortados e texto React; régua barra dado pessoal e cara de IA | unitário (núcleo) | `node --test shared/core/phraseRules.test.js shared/core/phrasePicker.test.js shared/core/purity.test.js` | ❌ W0 | ⬜ pending |
| 04-04-03 | 04 | 1 | MASC-04,  MASC-07 | T-04-04-* | Encaixes cortados e texto React; régua barra dado pessoal e cara de IA | estático | `node --test test/static/phase4-review-sheet.test.js && node scripts/vintem/review-sheet.mjs` | ❌ W0 | ⬜ pending |
| 04-05-01 | 05 | 2 | MASC-02,  MASC-03 | T-04-05-* | dt limitado a 1/30 s; reação cancela a anterior; pose sempre finita | unitário (núcleo) | `node --test shared/core/vintemModel.test.js shared/core/purity.test.js` | ❌ W0 | ⬜ pending |
| 04-05-02 | 05 | 2 | MASC-02,  MASC-03 | T-04-05-* | dt limitado a 1/30 s; reação cancela a anterior; pose sempre finita | unitário (núcleo) | `node --test shared/core/vintemModel.test.js` | ❌ W0 | ⬜ pending |
| 04-05-03 | 05 | 2 | MASC-02,  MASC-03 | T-04-05-* | dt limitado a 1/30 s; reação cancela a anterior; pose sempre finita | unitário (núcleo) | `npm run test:core:tz` | ❌ W0 | ⬜ pending |
| 04-06-01 | 06 | 2 | MASC-04,  MASC-07 | T-04-06-* | Frases sem dado pessoal, sem ataque a quem o usuário é, palavrão só no sem filtro | unitário (núcleo) | `node --test shared/core/vintemPhrasesLimites.test.js shared/core/phraseRules.test.js shared/core/purity.test.js` | ❌ W0 | ⬜ pending |
| 04-06-02 | 06 | 2 | MASC-04,  MASC-07 | T-04-06-* | Frases sem dado pessoal, sem ataque a quem o usuário é, palavrão só no sem filtro | unitário (núcleo) | `node --test shared/core/vintemPhrasesLimites.test.js` | ❌ W0 | ⬜ pending |
| 04-06-03 | 06 | 2 | MASC-04,  MASC-07 | T-04-06-* | Frases sem dado pessoal, sem ataque a quem o usuário é, palavrão só no sem filtro | unitário (núcleo) | `npm run test:core:tz` | ❌ W0 | ⬜ pending |
| 04-07-01 | 07 | 2 | MASC-04,  MASC-07 | T-04-07-* | Frases sem dado pessoal, sem ataque a quem o usuário é, palavrão só no sem filtro | unitário (núcleo) | `node --test shared/core/vintemPhrasesLancamento.test.js shared/core/phraseRules.test.js shared/core/purity.test.js` | ❌ W0 | ⬜ pending |
| 04-07-02 | 07 | 2 | MASC-04,  MASC-07 | T-04-07-* | Frases sem dado pessoal, sem ataque a quem o usuário é, palavrão só no sem filtro | unitário (núcleo) | `node --test shared/core/vintemPhrasesLancamento.test.js` | ❌ W0 | ⬜ pending |
| 04-07-03 | 07 | 2 | MASC-04,  MASC-07 | T-04-07-* | Frases sem dado pessoal, sem ataque a quem o usuário é, palavrão só no sem filtro | unitário (núcleo) | `npm run test:core:tz` | ❌ W0 | ⬜ pending |
| 04-08-01 | 08 | 2 | MASC-04,  MASC-07 | T-04-08-* | dados-velhos neutra por teste; sem dado pessoal; palavrão só no sem filtro | unitário (núcleo) | `node --test shared/core/vintemPhrasesRitmo.test.js shared/core/phraseRules.test.js shared/core/purity.test.js` | ❌ W0 | ⬜ pending |
| 04-08-02 | 08 | 2 | MASC-04,  MASC-07 | T-04-08-* | dados-velhos neutra por teste; sem dado pessoal; palavrão só no sem filtro | unitário (núcleo) | `node --test shared/core/vintemPhrasesRitmo.test.js` | ❌ W0 | ⬜ pending |
| 04-08-03 | 08 | 2 | MASC-04,  MASC-07 | T-04-08-* | dados-velhos neutra por teste; sem dado pessoal; palavrão só no sem filtro | unitário (núcleo) | `npm run test:core:tz` | ❌ W0 | ⬜ pending |
| 04-09-01 | 09 | 3 | MASC-01,  MASC-02,  MASC-03,  MASC-07 | T-04-09-* | Arte em JSX sem HTML bruto; laço único; sem hex literal em src | estático | `npm run build && npm run lint && node --test test/static/palette-contrast.test.js` | ❌ W0 | ⬜ pending |
| 04-09-02 | 09 | 3 | MASC-01,  MASC-02,  MASC-03,  MASC-07 | T-04-09-* | Arte em JSX sem HTML bruto; laço único; sem hex literal em src | build/lint | `npm run build && npm run lint` | ❌ W0 | ⬜ pending |
| 04-09-03 | 09 | 3 | MASC-01,  MASC-02,  MASC-03,  MASC-07 | T-04-09-* | Arte em JSX sem HTML bruto; laço único; sem hex literal em src | estático | `node --test test/static/phase4-engine.test.js && npm run build && npm run lint && npm run test:static` | ❌ W0 | ⬜ pending |
| 04-10-01 | 10 | 1 | MASC-05 | T-04-10-* | Tom inválido cai no padrão; gravação bloqueada no perfil do parceiro; sem log de valor | estático | `node --test test/static/phase4-settings.test.js test/static/phase3-settings-categories.test.js && npm run build` | ❌ W0 | ⬜ pending |
| 04-10-02 | 10 | 1 | MASC-05 | T-04-10-* | Tom inválido cai no padrão; gravação bloqueada no perfil do parceiro; sem log de valor | estático | `node --test test/static/phase4-settings.test.js && npm run build && npm run lint` | ❌ W0 | ⬜ pending |
| 04-11-01 | 11 | 4 | MASC-06,  MASC-03,  MASC-02 | T-04-11-* | Página de teste sem leitura nem gravação de dado; noindex; sem link; texto React | estático + CDP | `node --test test/static/phase4-testpage.test.js test/static/phase3-final.test.js && npm run build && node scripts/ux-audit/vintem.mjs` | ❌ W0 | ⬜ pending |
| 04-11-02 | 11 | 4 | MASC-06,  MASC-03,  MASC-02 | T-04-11-* | Página de teste sem leitura nem gravação de dado; noindex; sem link; texto React | estático + CDP | `node --test test/static/phase4-testpage.test.js && npm run build && npm run lint && node scripts/ux-audit/vintem.mjs` | ❌ W0 | ⬜ pending |
| 04-11-03 | 11 | 4 | MASC-06,  MASC-03,  MASC-02 | T-04-11-* | Página de teste sem leitura nem gravação de dado; noindex; sem link; texto React · + item manual (UAT) | estático + CDP | `node --test test/static/phase4-testpage.test.js test/static/phase4-engine.test.js && npm run build && npm run lint && node scripts/ux-audit/vintem.mjs` | ❌ W0 | ⬜ pending |
| 04-12-01 | 12 | 5 | MASC-01,  MASC-02,  MASC-03,  MASC-04,  MASC-05 | T-04-12-* | Silêncio em dado velho, passado, sem renda e somente leitura; só ids em sessionStorage | CDP (Chrome) | `npm run build && npm run lint && node scripts/ux-audit/vintem-app.mjs --only home` | ❌ W0 | ⬜ pending |
| 04-12-02 | 12 | 5 | MASC-01,  MASC-02,  MASC-03,  MASC-04,  MASC-05 | T-04-12-* | Silêncio em dado velho, passado, sem renda e somente leitura; só ids em sessionStorage | CDP (Chrome) | `npm run build && npm run lint && node scripts/ux-audit/vintem-app.mjs --only home` | ❌ W0 | ⬜ pending |
| 04-12-03 | 12 | 5 | MASC-01,  MASC-02,  MASC-03,  MASC-04,  MASC-05 | T-04-12-* | Silêncio em dado velho, passado, sem renda e somente leitura; só ids em sessionStorage · + item manual (UAT) | estático + CDP | `node --test test/static/phase4-home.test.js test/static/phase3-home-components.test.js && npm run build && npm run lint && node scripts/ux-audit/vintem-app.mjs --only home` | ❌ W0 | ⬜ pending |
| 04-13-01 | 13 | 5 | MASC-02,  MASC-03,  MASC-07 | T-04-13-* | Autoteste só com ?test e sem dado do usuário; limiar de 12% não relaxado | unitário + CDP | `node --test shared/core/vintemModel.test.js && npm run build && npm run lint && node scripts/ux-audit/vintem.mjs --test` | ❌ W0 | ⬜ pending |
| 04-13-02 | 13 | 5 | MASC-02,  MASC-03,  MASC-07 | T-04-13-* | Autoteste só com ?test e sem dado do usuário; limiar de 12% não relaxado | unitário + CDP | `npm run test:core && npm run build && node scripts/ux-audit/vintem.mjs --test` | ❌ W0 | ⬜ pending |
| 04-13-03 | 13 | 5 | MASC-02,  MASC-03,  MASC-07 | T-04-13-* | Autoteste só com ?test e sem dado do usuário; limiar de 12% não relaxado · + item manual (UAT) | estático + CDP | `node --test test/static/phase4-selftest.test.js test/static/phase4-engine.test.js && npm run build && npm run lint && node scripts/ux-audit/vintem.mjs --test` | ❌ W0 | ⬜ pending |
| 04-14-01 | 14 | 6 | MASC-02,  MASC-04 | T-04-14-* | Cache só de agregados por categoryId; fala sem Pix nem 6 dígitos; uma consulta por ciclo | CDP (Chrome) | `npm run build && npm run lint && node scripts/ux-audit/vintem-app.mjs --only insights` | ❌ W0 | ⬜ pending |
| 04-14-02 | 14 | 6 | MASC-02,  MASC-04 | T-04-14-* | Cache só de agregados por categoryId; fala sem Pix nem 6 dígitos; uma consulta por ciclo | CDP (Chrome) | `npm run build && npm run lint && node scripts/ux-audit/vintem-app.mjs --only insights` | ❌ W0 | ⬜ pending |
| 04-14-03 | 14 | 6 | MASC-02,  MASC-04 | T-04-14-* | Cache só de agregados por categoryId; fala sem Pix nem 6 dígitos; uma consulta por ciclo | estático | `node --test test/static/phase4-insights.test.js && npm run test:static && npm run build` | ❌ W0 | ⬜ pending |
| 04-15-01 | 15 | 7 | MASC-01,  MASC-02,  MASC-03,  MASC-04 | T-04-15-* | Reação só depois da gravação; sem log de valor; sem fórmula de orçamento em src | unitário + CDP | `npm run test:core:tz && npm run test:static && npm run build && npm run lint && node scripts/ux-audit/vintem-app.mjs --only reactions` | ❌ W0 | ⬜ pending |
| 04-15-02 | 15 | 7 | MASC-01,  MASC-02,  MASC-03,  MASC-04 | T-04-15-* | Reação só depois da gravação; sem log de valor; sem fórmula de orçamento em src | CDP (Chrome) | `npm run test:static && npm run build && npm run lint && node scripts/ux-audit/vintem-app.mjs --only reactions` | ❌ W0 | ⬜ pending |
| 04-15-03 | 15 | 7 | MASC-01,  MASC-02,  MASC-03,  MASC-04 | T-04-15-* | Reação só depois da gravação; sem log de valor; sem fórmula de orçamento em src · + item manual (UAT) | unitário + CDP | `node --test test/static/phase4-reactions.test.js && npm run test:static && npm run test:core:tz && npm run build && npm run lint && node scripts/ux-audit/vintem-app.mjs --only reactions` | ❌ W0 | ⬜ pending |
| 04-16-01 | 16 | 6 | MASC-01,  MASC-02,  MASC-04,  MASC-05 | T-04-16-* | Fala curta nunca na região viva; linha some em dado velho e no perfil do parceiro | unitário + CDP | `npm run test:core:tz && npm run build && npm run lint && node scripts/ux-audit/vintem-app.mjs --only limits` | ❌ W0 | ⬜ pending |
| 04-16-02 | 16 | 6 | MASC-01,  MASC-02,  MASC-04,  MASC-05 | T-04-16-* | Fala curta nunca na região viva; linha some em dado velho e no perfil do parceiro | CDP (Chrome) | `npm run build && npm run lint && node scripts/ux-audit/vintem-app.mjs --only settings` | ❌ W0 | ⬜ pending |
| 04-16-03 | 16 | 6 | MASC-01,  MASC-02,  MASC-04,  MASC-05 | T-04-16-* | Fala curta nunca na região viva; linha some em dado velho e no perfil do parceiro | estático | `node --test test/static/phase4-limits.test.js test/static/phase4-settings.test.js && npm run test:static` | ❌ W0 | ⬜ pending |
| 04-17-01 | 17 | 7 | MASC-01,  MASC-02 | T-04-17-* | Erro de rede é surpreso, nunca triste; no máximo dois Vinténs por tela | CDP (Chrome) | `npm run build && npm run lint && node scripts/ux-audit/vintem-app.mjs --only empties` | ❌ W0 | ⬜ pending |
| 04-17-02 | 17 | 7 | MASC-01,  MASC-02 | T-04-17-* | Erro de rede é surpreso, nunca triste; no máximo dois Vinténs por tela | CDP (Chrome) | `npm run build && npm run lint && node scripts/ux-audit/vintem-app.mjs --only empties` | ❌ W0 | ⬜ pending |
| 04-17-03 | 17 | 7 | MASC-01,  MASC-02 | T-04-17-* | Erro de rede é surpreso, nunca triste; no máximo dois Vinténs por tela | estático | `node --test test/static/phase4-empty.test.js && npm run test:static` | ❌ W0 | ⬜ pending |
| 04-18-01 | 18 | 8 | MASC-04 | T-04-18-* | Documento só por toStoredInsight; escopo de dono; sem índice novo; publicação com rollback | unitário + CDP | `npm run test:core:tz && node --test test/static/owner-queries.test.js && npm run build && npm run lint && node scripts/ux-audit/vintem-app.mjs --only persist` | ❌ W0 | ⬜ pending |
| 04-18-02 | 18 | 8 | MASC-04 | T-04-18-* | Documento só por toStoredInsight; escopo de dono; sem índice novo; publicação com rollback · + item manual (UAT) | estático | `node --test test/static/phase4-persist.test.js && npm run test:static && test -s .planning/phases/04-mascote-vint-m/04-18-DEPLOY-EVIDENCE.md && grep -q 'firestore:rules' .planning/phases/04-mascote-vint-m/04-18-DEPLOY-EVIDENCE.md` | ❌ W0 | ⬜ pending |
| 04-18-03 | 18 | 8 | MASC-04 | T-04-18-* | Documento só por toStoredInsight; escopo de dono; sem índice novo; publicação com rollback | manual (portão humano) | `— (checkpoint humano)` | n/a | ⬜ pending |
| 04-19-01 | 19 | 8 | MASC-04,  MASC-07 | T-04-19-* | Revisão do dono bloqueante; lista de bloqueio fora do git e nunca impressa | estático | `node --test test/static/phase4-content.test.js && node scripts/vintem/review-sheet.mjs && test -s .planning/phases/04-mascote-vint-m/04-PHRASES-REVIEW.md` | ❌ W0 | ⬜ pending |
| 04-19-02 | 19 | 8 | MASC-04,  MASC-07 | T-04-19-* | Revisão do dono bloqueante; lista de bloqueio fora do git e nunca impressa | manual (portão humano) | `— (checkpoint humano)` | n/a | ⬜ pending |
| 04-19-03 | 19 | 8 | MASC-04,  MASC-07 | T-04-19-* | Revisão do dono bloqueante; lista de bloqueio fora do git e nunca impressa · + item manual (UAT) | unitário (núcleo) | `node --test test/static/phase4-content.test.js test/static/phase4-content-review.test.js && npm run test:core:tz && npm run test:static` | ❌ W0 | ⬜ pending |
| 04-20-01 | 20 | 7 | MASC-01,  MASC-02 | T-04-20-* | Erro de rede é surpreso, nunca triste; sino sem Vintém na Home | CDP (Chrome) | `npm run build && npm run lint && node scripts/ux-audit/vintem-app.mjs --only empties-more` | ❌ W0 | ⬜ pending |
| 04-20-02 | 20 | 7 | MASC-01,  MASC-02 | T-04-20-* | Erro de rede é surpreso, nunca triste; sino sem Vintém na Home | CDP (Chrome) | `npm run build && npm run lint && node scripts/ux-audit/vintem-app.mjs --only empties-more` | ❌ W0 | ⬜ pending |
| 04-20-03 | 20 | 7 | MASC-01,  MASC-02 | T-04-20-* | Erro de rede é surpreso, nunca triste; sino sem Vintém na Home | estático | `node --test test/static/phase4-empty-more.test.js && npm run test:static` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Fase em tracer-first: cada teste nasce na tarefa que o exige (a primeira tarefa de cada plano é o tracer e traz o seu comando automatizado). Arquivos de teste e executores criados, por plano:

- [ ] 04-01: `shared/core/vintemSpring.test.js`, `vintemStates.test.js`
- [ ] 04-02: `shared/core/vintemMood.test.js`
- [ ] 04-03: `shared/core/insights.test.js` (com fixtures de privacidade)
- [ ] 04-04: `shared/core/phrasePicker.test.js`, `phraseRules.test.js`, `test/static/phase4-review-sheet.test.js`
- [ ] 04-05: `shared/core/vintemModel.test.js`
- [ ] 04-06 a 04-08: `shared/core/vintemPhrasesLimites.test.js`, `vintemPhrasesLancamento.test.js`, `vintemPhrasesRitmo.test.js`
- [ ] 04-09: `test/static/phase4-engine.test.js`
- [ ] 04-10: `test/static/phase4-settings.test.js`
- [ ] 04-11: `test/static/phase4-testpage.test.js`, `scripts/ux-audit/vintem.mjs`; atualiza `phase3-final.test.js` (10 rotas)
- [ ] 04-12: `test/static/phase4-home.test.js`, `scripts/ux-audit/vintem-app.mjs` e `vintem-app/home.mjs`
- [ ] 04-13: `src/lib/vintem/selftest.ts` (autoteste por pixels), `test/static/phase4-selftest.test.js`
- [ ] 04-14 a 04-17 e 04-20: `test/static/phase4-insights.test.js`, `phase4-reactions.test.js`, `phase4-limits.test.js`, `phase4-empty.test.js`, `phase4-empty-more.test.js` e as suítes `vintem-app/*.mjs`
- [ ] 04-18: `test/static/phase4-persist.test.js`; atualiza `owner-queries.test.js` (11 para 12) e `test/rules/matrix.test.js`
- [ ] 04-19: `test/static/phase4-content.test.js`, `phase4-content-review.test.js`

Instalação de framework: nenhuma.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Aparência do perfil, do triste a 84px e do giro | MASC-03 | Julgamento visual do dono (UI-SPEC P-04) | Abrir a página de teste e percorrer os 7 estados e o giro |
| 60 fps em Android e iPhone reais | MASC-03 | Exige aparelho real | Abrir a página de teste instalada e ver o medidor de FPS |
| Revisão e corte do banco de frases | MASC-04, MASC-07 | "Soa como eu?" é do dono (D-12) | Ler a folha de revisão gerada e preencher `REVIEW.reviewedAt` |
| Conferência de originalidade contra os prints de referência | MASC-07 | Critério 5 do roadmap | Comparar desenho, nome e frases com os prints |
| Olhar seguindo o toque no celular | MASC-03 | Sensação de movimento (D-18) | Tocar na tela e observar o olhar |
| Matriz de regras da coleção vintemInsights no emulador | MASC-04 | Este ambiente não tem Java (`npm run test:rules` não sobe o emulador) | Numa máquina com Java 21 ou superior, `. ./scripts/dev-env.sh && npm run test:rules` (checkpoint do plano 04-18) |
| Publicação das regras de vintemInsights em produção | MASC-04 | Credencial do dono; portão com rollback registrado | Passos do checkpoint do plano 04-18; "adiar" é aceito (a gravação falha em silêncio) |
| Reações ao lançar no aparelho real (agachar, susto, bronca, festa) | MASC-01, MASC-02 | Leitura das animações e do tom das falas | Lançar gasto comum, perto do limite, estourado, receita e Porquinho, na Home e em Transações (plano 04-15) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
