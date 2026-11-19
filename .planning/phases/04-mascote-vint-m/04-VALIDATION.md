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

Preenchido pelo planejador a partir da tabela "Phase Requirements → Test Map" de `04-RESEARCH.md` (MASC-01 a MASC-07), uma linha por tarefa.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| — | — | — | MASC-01..07 | — | — | — | ver `04-RESEARCH.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `shared/core/vintemSpring.js` + teste (molas, piscar, RNG)
- [ ] `shared/core/vintemStates.js` + teste (7 estados)
- [ ] `shared/core/vintemModel.js` + teste (modelo e World)
- [ ] `shared/core/vintemMood.js` + teste
- [ ] `shared/core/insights.js` + teste (com fixtures de privacidade)
- [ ] `shared/core/vintemPhrases.js`, `phrasePicker.js` + teste
- [ ] `test/static/phase4-*.test.js` (home, settings, testpage, engine, content)
- [ ] `scripts/ux-audit/vintem.mjs` + `src/lib/vintem/selftest.ts`
- [ ] Atualizar guardas existentes: `phase3-final.test.js` (10 rotas) e, se houver `vintemInsights`, `test/rules/matrix.test.js`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Aparência do perfil, do triste a 84px e do giro | MASC-03 | Julgamento visual do dono (UI-SPEC P-04) | Abrir a página de teste e percorrer os 7 estados e o giro |
| 60 fps em Android e iPhone reais | MASC-03 | Exige aparelho real | Abrir a página de teste instalada e ver o medidor de FPS |
| Revisão e corte do banco de frases | MASC-04, MASC-07 | "Soa como eu?" é do dono (D-12) | Ler a folha de revisão gerada e preencher `REVIEW.reviewedAt` |
| Conferência de originalidade contra os prints de referência | MASC-07 | Critério 5 do roadmap | Comparar desenho, nome e frases com os prints |
| Olhar seguindo o toque no celular | MASC-03 | Sensação de movimento (D-18) | Tocar na tela e observar o olhar |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
