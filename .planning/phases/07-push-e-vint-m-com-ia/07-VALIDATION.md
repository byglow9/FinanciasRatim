---
phase: "7"
slug: push-e-vint-m-com-ia
status: closed-with-open-uat
nyquist_compliant: false
wave_0_complete: true
---

# Fase 7: mapa de validação

## Evidência de fechamento (2026-11-27)

| Suíte | Resultado |
|-------|-----------|
| núcleo, dois fusos | 1305 e 1305, 0 falhas |
| servidor | 521, 0 falhas |
| emulador | 202, 0 falhas |
| regras | 14, 0 falhas |
| estáticas | 811, 0 falhas |
| build e lint | sem erro |

`firestore.rules` e `firestore.indexes.json` sem diferença desde o commit base da Fase 6 usado na conferência (`ef0f5c06`).

Boa parte do comportamento da fala e dos avisos foi mudada depois pela Fase 07.1. Os testes acima são os do código atual.

## Por requisito

Planos pelo campo `requirements`; testes são os que esses planos listam em `files_modified`.

| Requisito | Planos | Testes | Estado |
|-----------|--------|--------|--------|
| PUSH-01 | 07-01, 07-02, 07-04, 07-06, 07-08, 07-11 | `server/test/limiter.test.js`, `server/test/push-dryrun.test.js`, `server/test/push.test.js`, `shared/core/pushState.test.js`, `shared/core/vintemPhrasesPush.test.js`, `test/rules/matrix.test.js` e mais 5 | verde |
| PUSH-02 | 07-03, 07-10, 07-15 | `server/test/emu/push-events.test.js`, `server/test/emu/push-tick.test.js`, `server/test/notifier.test.js`, `server/test/push-tick.test.js`, `shared/core/pushEvents.test.js`, `shared/core/pushPrefs.test.js` e mais 1 | verde |
| PUSH-03 | 07-03, 07-08, 07-10, 07-11, 07-15 | `server/test/emu/push-events.test.js`, `server/test/emu/push-tick.test.js`, `server/test/notifier.test.js`, `server/test/push-tick.test.js`, `server/test/push.test.js`, `shared/core/pushEvents.test.js` e mais 6 | verde |
| PUSH-04 | 07-01, 07-03, 07-04, 07-08, 07-10, 07-15 | `server/test/emu/push-events.test.js`, `server/test/emu/push-tick.test.js`, `server/test/limiter.test.js`, `server/test/notifier.test.js`, `server/test/push-tick.test.js`, `server/test/push.test.js` e mais 8 | verde |
| PUSH-05 | 07-01, 07-02, 07-06, 07-11 | `server/test/limiter.test.js`, `server/test/push-dryrun.test.js`, `server/test/push.test.js`, `test/static/phase3-settings-cycle.test.js`, `test/static/phase7-notifications-ui.test.js`, `test/static/phase7-push-client.test.js` e mais 1 | manual: relato do dono |
| IA-01 | 07-09, 07-12, 07-13, 07-14, 07-16 | `server/test/ai-budget.test.js`, `server/test/ai-cache.test.js`, `server/test/ai-providers.test.js`, `server/test/ai-snapshot.test.js`, `server/test/ai-speech.test.js`, `server/test/emu/ai-budget.test.js` e mais 3 | verde |
| IA-02 | 07-05, 07-07, 07-09, 07-13 | `server/test/ai-providers.test.js`, `server/test/ai-snapshot.test.js`, `server/test/ai-speech.test.js`, `server/test/emu/ai-snapshot.test.js`, `server/test/emu/ai-speech.test.js`, `shared/core/aiCacheKey.test.js` e mais 5 | verde |
| IA-03 | 07-05, 07-07, 07-09, 07-14, 07-17 | `server/test/ai-compare.test.js`, `server/test/ai-providers.test.js`, `server/test/ai-speech.test.js`, `server/test/emu/ai-speech.test.js`, `shared/core/aiCacheKey.test.js`, `shared/core/aiPipeline.test.js` e mais 6 | verde |
| IA-04 | 07-09, 07-12, 07-14, 07-16 | `server/test/ai-budget.test.js`, `server/test/ai-cache.test.js`, `server/test/ai-providers.test.js`, `server/test/ai-speech.test.js`, `server/test/emu/ai-budget.test.js`, `server/test/emu/ai-speech.test.js` e mais 1 | verde |
| IA-05 | 07-09, 07-17 | `server/test/ai-compare.test.js`, `server/test/ai-providers.test.js`, `server/test/ai-speech.test.js`, `server/test/emu/ai-speech.test.js`, `test/static/phase7-terms.test.js` | verde |

## Por decisão

Mapa montado pela menção da decisão no texto dos planos: indica onde procurar, não é prova linha a linha.

| Decisão | Planos | Testes | Estado |
|---------|--------|--------|--------|
| D-01 | 07-12, 07-14 | `server/test/ai-budget.test.js`, `server/test/ai-cache.test.js`, `server/test/emu/ai-budget.test.js`, `test/static/phase7-speech-ui.test.js` | suíte verde |
| D-02 | 07-05, 07-12, 07-16 | `server/test/ai-budget.test.js`, `server/test/ai-cache.test.js`, `server/test/ai-speech.test.js`, `server/test/emu/ai-budget.test.js`, `shared/core/aiCacheKey.test.js`, `shared/core/aiPipeline.test.js` e mais 3 | suíte verde |
| D-03 | 07-09, 07-12, 07-16 | `server/test/ai-budget.test.js`, `server/test/ai-cache.test.js`, `server/test/ai-providers.test.js`, `server/test/ai-speech.test.js`, `server/test/emu/ai-budget.test.js`, `server/test/emu/ai-speech.test.js` e mais 1 | suíte verde |
| D-04 | 07-09 | `server/test/ai-providers.test.js`, `server/test/ai-speech.test.js`, `server/test/emu/ai-speech.test.js` | suíte verde |
| D-05 | 07-01, 07-04, 07-07, 07-10, 07-15 | `server/test/emu/push-events.test.js`, `server/test/emu/push-tick.test.js`, `server/test/limiter.test.js`, `server/test/notifier.test.js`, `server/test/push-tick.test.js`, `server/test/push.test.js` e mais 6 | suíte verde |
| D-06 | 07-03, 07-08, 07-11 | `server/test/push.test.js`, `shared/core/pushEvents.test.js`, `shared/core/pushPrefs.test.js`, `test/rules/matrix.test.js`, `test/static/phase3-settings-cycle.test.js`, `test/static/phase7-notifications-ui.test.js` e mais 1 | suíte verde |
| D-07 | 07-03, 07-10, 07-15 | `server/test/emu/push-events.test.js`, `server/test/emu/push-tick.test.js`, `server/test/notifier.test.js`, `server/test/push-tick.test.js`, `shared/core/pushEvents.test.js`, `shared/core/pushPrefs.test.js` e mais 1 | suíte verde |
| D-08 | 07-02, 07-03, 07-04, 07-11, 07-16 | `server/test/ai-budget.test.js`, `server/test/ai-speech.test.js`, `shared/core/pushEvents.test.js`, `shared/core/pushPrefs.test.js`, `shared/core/pushState.test.js`, `shared/core/vintemPhrasesPush.test.js` e mais 4 | suíte verde |
| D-09 | 07-05, 07-07, 07-09 | `server/test/ai-providers.test.js`, `server/test/ai-speech.test.js`, `server/test/emu/ai-speech.test.js`, `shared/core/aiCacheKey.test.js`, `shared/core/aiPipeline.test.js`, `shared/core/aiPrivacy.test.js` e mais 3 | suíte verde |
| D-10 | 07-09, 07-17 | `server/test/ai-compare.test.js`, `server/test/ai-providers.test.js`, `server/test/ai-speech.test.js`, `server/test/emu/ai-speech.test.js`, `test/static/phase7-terms.test.js` | suíte verde |
| D-11 | 07-07, 07-13, 07-16 | `server/test/ai-budget.test.js`, `server/test/ai-snapshot.test.js`, `server/test/ai-speech.test.js`, `server/test/emu/ai-snapshot.test.js`, `shared/core/aiPrompt.test.js`, `shared/core/aiSummary.test.js` e mais 1 | suíte verde |
| D-12 | 07-03, 07-15, 07-16 | `server/test/ai-budget.test.js`, `server/test/ai-speech.test.js`, `server/test/emu/push-tick.test.js`, `server/test/notifier.test.js`, `server/test/push-tick.test.js`, `shared/core/pushEvents.test.js` e mais 2 | suíte verde |
| D-13 | 07-04, 07-05, 07-07 | `shared/core/aiCacheKey.test.js`, `shared/core/aiPipeline.test.js`, `shared/core/aiPrivacy.test.js`, `shared/core/aiPrompt.test.js`, `shared/core/aiSummary.test.js`, `shared/core/aiValidate.test.js` e mais 2 | suíte verde |
| D-14 | 07-01, 07-05, 07-07, 07-08, 07-09, 07-10, 07-13, 07-14, 07-15, 07-16 | `server/test/ai-budget.test.js`, `server/test/ai-providers.test.js`, `server/test/ai-snapshot.test.js`, `server/test/ai-speech.test.js`, `server/test/emu/ai-snapshot.test.js`, `server/test/emu/ai-speech.test.js` e mais 17 | suíte verde |
| D-15 | 07-05, 07-07, 07-16 | `server/test/ai-budget.test.js`, `server/test/ai-speech.test.js`, `shared/core/aiCacheKey.test.js`, `shared/core/aiPipeline.test.js`, `shared/core/aiPrivacy.test.js`, `shared/core/aiPrompt.test.js` e mais 3 | suíte verde |
| D-16 | 07-07, 07-09, 07-13, 07-14 | `server/test/ai-providers.test.js`, `server/test/ai-snapshot.test.js`, `server/test/ai-speech.test.js`, `server/test/emu/ai-snapshot.test.js`, `server/test/emu/ai-speech.test.js`, `shared/core/aiPrompt.test.js` e mais 2 | suíte verde |
| D-17 | 07-05, 07-09, 07-17 | `server/test/ai-compare.test.js`, `server/test/ai-providers.test.js`, `server/test/ai-speech.test.js`, `server/test/emu/ai-speech.test.js`, `shared/core/aiCacheKey.test.js`, `shared/core/aiPipeline.test.js` e mais 3 | suíte verde |
| D-18 | 07-17 | `server/test/ai-compare.test.js`, `test/static/phase7-terms.test.js` | manual |
| D-19 | 07-04, 07-10 | `server/test/emu/push-events.test.js`, `server/test/notifier.test.js`, `shared/core/pushState.test.js`, `shared/core/vintemPhrasesPush.test.js`, `test/static/phase7-limits-check.test.js` | suíte verde |
| D-20 | 07-05, 07-07, 07-09, 07-13 | `server/test/ai-providers.test.js`, `server/test/ai-snapshot.test.js`, `server/test/ai-speech.test.js`, `server/test/emu/ai-snapshot.test.js`, `server/test/emu/ai-speech.test.js`, `shared/core/aiCacheKey.test.js` e mais 5 | suíte verde |
| D-21 | 07-03, 07-08, 07-10, 07-11, 07-15 | `server/test/emu/push-events.test.js`, `server/test/emu/push-tick.test.js`, `server/test/notifier.test.js`, `server/test/push-tick.test.js`, `server/test/push.test.js`, `shared/core/pushEvents.test.js` e mais 6 | suíte verde |
| D-22 | 07-05, 07-09, 07-12 | `server/test/ai-budget.test.js`, `server/test/ai-cache.test.js`, `server/test/ai-providers.test.js`, `server/test/ai-speech.test.js`, `server/test/emu/ai-budget.test.js`, `server/test/emu/ai-speech.test.js` e mais 4 | suíte verde |
| D-23 | 07-06, 07-17 | `server/test/ai-compare.test.js`, `server/test/push-dryrun.test.js`, `test/static/phase7-terms.test.js` | suíte verde |

## Só manual

- PUSH-05: aviso de teste recebido no iPhone real nos três casos (07-06); em 2026-11-27 o dono respondeu "Avisos e falas ok".
- D-18: modelo escolhido pelo dono (`07-AI-TERMS.md`), confirmado no segundo teste cego da 07.1.
