---
phase: "8"
slug: vis-o-do-casal-e-multiusu-rio
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-27"
---

# Fase 8: estratégia de validação

## Infraestrutura de teste

| Propriedade | Valor |
|-------------|-------|
| Framework | `node --test` (núcleo, servidor, estáticos, regras, emulador) |
| Comando rápido | `. ./scripts/dev-env.sh && npm run test:core && npm run test:server && npm run test:static` |
| Suíte completa | `. ./scripts/dev-env.sh && npm run build && npm run lint && npm run test:core:tz && npm run test:server && npm run test:static && npm run test:rules && npm run test:emu` |

## Taxa de amostragem

- Por commit de tarefa: comando rápido.
- Por onda: suíte completa.
- Antes de `/gsd-verify-work`: suíte verde.

## Mapa por requisito

| Requisito | Comportamento | Comando | Arquivo |
|-----------|---------------|---------|---------|
| CASAL-01 | somas, categoria com um só limite, sem renda, ciclos diferentes, fuso | `node --test shared/core/couple.test.js` | estender |
| CASAL-02 | Casal sem escrita; Home inalterada | `node --test test/static/phase8-couple.test.js` | Wave 0 |
| MULTI-01 | grupo A não lê nem escreve em B; ids de alerta e insight com `hid` | `npm run test:rules` e `node --test shared/core/household.test.js` | estender e Wave 0 |
| MULTI-01 | modo sozinho sem seletor e sem Casal; gênero separado da área | `node --test test/static/phase8-solo.test.js` | Wave 0 |
| MULTI-02 | convite de uso único, expirado, cancelado, retomada | `node --test server/test/invites.test.js` | Wave 0 |
| MULTI-02 | cifra das chaves Pluggy, resolvedor por `hid`, webhook de item alheio | `node --test server/test/secrets.test.js server/test/pluggy-pool.test.js` | Wave 0 |
| D-10 | exclusão apaga só o alvo e retoma após falha | `npm run test:emu` (`account-delete.test.js`) | Wave 0 |

## Wave 0

- [ ] Fixture de dois grupos no emulador
- [ ] Pluggy e Auth falsos para convite, resolvedor e exclusão
- [ ] Atualizar guardas antigas: `no-legacy-auth.test.js`, `firestore-config.test.js`, `phase7-rules.test.js`, `owner-queries.test.js`

## Só manual

Desligar cadastro direto no Firebase Auth; variáveis no Railway; conectar banco com credenciais de outra pessoa; convite e instalação no iPhone.

MULTI-03 e a migração do amigo saíram do escopo (2026-11-27).
