---
phase: "5"
slug: "identidade-coinki-pwa-e-onboarding"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-23"
---

# Phase 5 — Validation Strategy

> Contrato de validação da Fase 5 (Identidade Coinc, PWA e onboarding). A estratégia completa, com o mapa requisito-teste, está em "Arquitetura de validação" de `05-RESEARCH.md`; o planejador detalha por tarefa.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (guardas estáticas em `test/static`, núcleo em `shared/core`); auditoria CDP no Chrome |
| **Config file** | nenhum (scripts do `package.json`) |
| **Quick run command** | `node --test test/static/phase5-*.test.js` e o `.test.js` de `shared/core` tocado |
| **Full suite command** | `npm run test:static && npm run test:core:tz && npm run build && npm run lint` |
| **Estimated runtime** | ~2 s o rápido; alguns minutos a suíte completa |

---

## Sampling Rate

- **After every task commit:** comando rápido
- **After every plan wave:** `npm run test:static && npm run test:core:tz && npm run build`
- **Before `/gsd-verify-work`:** suíte completa verde + `scripts/ux-audit/theme.mjs` + `curl -I` dos cabeçalhos
- **Max feedback latency:** 30 segundos (comando rápido)

---

## Per-Task Verification Map

Preenchido pelo planejador, uma linha por tarefa, a partir da tabela "Requisito -> teste" de `05-RESEARCH.md` (IDEN-01 a IDEN-06 e IDEN-08).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `shared/core/pwaUpdate.js` e `.test.js`; `shared/core/theme.js` e `.test.js`
- [ ] `test/static/phase5-{identity,hosting,manifest,sw,theme,onboarding}.test.js`
- [ ] `test/static/helpers/palette.js` com `tokens(theme)` e `PAIRS` nos dois temas (a quebra de `palette-contrast.test.js` e de `phase3-gaps.test.js:61-64` é intencional)
- [ ] `scripts/ux-audit/theme.mjs` e onboarding/BootError nas rotas de auditoria
- [ ] `.planning/sketches/021-icone-app/index.html` com autoteste
- [ ] Instalar pacotes (portão `human-verify`: aprovação do dono)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Site `coinc` livre e publicado | IDEN-01 | Só o Firebase confirma | `firebase hosting:sites:create coinc`; se falhar, parar e perguntar ao dono (D-03) |
| Redirect real do site antigo e `ALLOWED_ORIGINS` | IDEN-02 | Depende do Railway e do deploy | `curl -sI` no site antigo; chamada à API pelo domínio novo sem 403 |
| Adicionar à tela inicial e abrir em tela cheia | IDEN-03 | Aparelho real | Android Chrome e iPhone Safari |
| Deploy A -> B sem tela branca e sem trocar no meio de um lançamento | IDEN-04 | Exige dois deploys | Procedimento da Armadilha 4 da pesquisa |
| Domínio novo nos domínios autorizados do Auth | IDEN-01 | Console do Firebase | Conferir login no endereço novo |
| Escolha do ícone entre as 5 versões | IDEN-03 | Gosto do dono | Abrir o sketch 021 e escolher |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
