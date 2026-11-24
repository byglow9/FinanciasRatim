---
phase: 05-identidade-coinki-pwa-e-onboarding
plan: 20
subsystem: fechamento-da-fase
tags: [guarda-transversal, validacao, uat, vintem-escuro, cdp]
requires:
  - phase: 05-identidade-coinki-pwa-e-onboarding
    provides: "05-12, 05-14, 05-16, 05-19 (redirect 302 no ar), 05-22 (Login 029), 05-23 (onboarding de quatro telas)"
provides:
  - "phase5-final.test.js: guarda transversal em 22 testes (escala, chaves coinc, HTML bruto, nome OINC, requisitos IDEN, cache da casca, ganchos de teste)"
  - "vintem.mjs --theme claro|escuro (semeia coinc:tema:v1 antes da pagina)"
  - "05-VALIDATION.md com as linhas verdes, Wave 0 completa e evidencia de fechamento"
  - "05-UAT-ROTEIRO.md com 13 itens (aparelho, decisao e excecao do OINC no escuro)"
affects: [verify-work]
key-files:
  created:
    - test/static/phase5-final.test.js
    - .planning/phases/05-identidade-coinki-pwa-e-onboarding/05-UAT-ROTEIRO.md
  modified:
    - scripts/ux-audit/vintem.mjs
    - .planning/phases/05-identidade-coinki-pwa-e-onboarding/05-VALIDATION.md
key-decisions:
  - "nyquist_compliant fica false: o autoteste por pixels do OINC no escuro termina em FALHAS 4 e a decisao e do dono (UAT item 13)"
  - "Nenhum criterio do autoteste foi relaxado e nenhum token .dark .vt foi alterado"
  - "STATE.md, ROADMAP.md e REQUIREMENTS.md nao foram tocados (ordem do orquestrador: so arquivos do plano; STATE.md tem edicoes de outro agente)"
requirements-completed: []
requirements: [IDEN-01, IDEN-02, IDEN-03, IDEN-04, IDEN-05, IDEN-06, IDEN-08]
status: complete
completed: 2026-11-24
commits: 6
plan_head_before: df80b6a1ed4dee8d07dc18d88287b43f47f22a58
actuals:
  tokens: 14100
  tasks: 3
  commits: 4
---

# Phase 5 Plan 20: Fechamento da Fase 5 Summary

**Guarda transversal de 22 testes, suite e todos os executores verdes (exceto o autoteste por pixels do OINC no tema escuro, diagnosticado e registrado como exceção), mapa de validação fechado e roteiro de UAT de 13 itens no estado real da fase (quatro telas, Login 029, padrão Claro, OINC, redirect 302 no ar).**

Nota sobre `commits`: o intervalo `plan_head_before..HEAD` mede 6 porque dois commits de outro agente entraram em paralelo (`9a48085c` decisão do 05-21 e `d02a3b7f` diagnóstico de webhooks Pluggy). Os commits deste plano são 4 (`actuals.commits: 4`).

## O que foi feito

| Tarefa | Commit | Resultado |
|--------|--------|-----------|
| 1. Guarda transversal | `619afa5a` | `test/static/phase5-final.test.js`, 22 testes nas sete frentes do plano, ajustados ao estado real: onboarding de quatro passos (ids o1, o2, o3, ia), Login com `CoincWordmark` e `VintemSay`, padrão Claro, OINC, cinco chaves `coinc:` fechadas. |
| 2. Suíte, executores e mapa | `b0f1b337`, `3851defe` | `--theme claro\|escuro` em `vintem.mjs`; `05-VALIDATION.md` com linhas verdes, Wave 0 completa e seção "Evidência de fechamento"; segunda passada registra a decisão do 05-21 (manter 302). |
| 3. Roteiro de UAT | `960619b5` | `05-UAT-ROTEIRO.md`: itens 1 a 12 do plano mais o 13 (exceção do OINC no escuro), cinco blocos para o verificador e tabela de requisitos. |

## Verificação (saídas)

- `node --test test/static/phase5-final.test.js`: 22 passam, 0 falham.
- `npm run test:static`: 614 testes, 612 passam, 0 falham, 2 ignorados (já existentes).
- `npm run test:core:tz`: 722 passam em UTC e 722 em Asia/Tokyo, 0 falham.
- `npm run test:server`: 81 passam, 0 falham.
- `npm run build`: limpo (PWA v2.0.0, injectManifest, 22 entradas de pré-cache). `npm run lint`: saída 0.
- Executores CDP em `FALHAS 0`: `theme.mjs`, `theme.mjs --audit` (76 combinações), `theme.mjs --overlays` (14 sobreposições, 56 combinações), `pwa.mjs`, `install.mjs`, `onboarding.mjs` (477 verificações), `identity.mjs` (274), `icon-sketch.mjs`, `vintem.mjs --test` (padrão e `--theme claro`, 32 verificações).
- `vintem.mjs --test --theme escuro`: **`FALHAS 4`** (ver desvios).
- Leitura ao vivo (só `curl`, nada publicado): `/sw.js`, `/manifest.webmanifest` e `/` do site novo com `cache-control: no-cache` e 200; um `/assets/*.js` com `public, max-age=31536000, immutable`; site antigo (`/` e `/transacoes`) em 302 com `location: https://coinc-financias.web.app/?origem=antigo`; título `Coinc`; bundle ao vivo com "eu sou o OINC" e sem "sou o Vintém". Repete os resultados dos planos 05-18 e 05-19.

## Deviations from Plan

### Problemas encontrados

**1. [Exceção registrada, decisão do dono] Autoteste por pixels do OINC no escuro**
- **Found during:** Tarefa 2 (cadeia de verificação).
- **Issue:** `vintem.mjs --test --theme escuro` falha nos mesmos quatro pontos de `deferred-items.md` (limiar da máscara 199 e 277, esclera 718, distinção bravo x sonolento 11,3% a 84 px e 8,8% a 48 px). O padrão e `--theme claro` terminam em `FALHAS 0`.
- **Diagnóstico:** os planos 05-22 e 05-23 reportaram "FALHAS 4 pré-existente" porque o tema padrão ainda era Automático e o Chrome do executor segue o esquema de cores da máquina (escuro), então o autoteste rodava no escuro. A hipótese "deriva do Chrome 152 ou dos tokens de ação" de `deferred-items.md` fica descartada. O método de pixels assume fundo claro: a esclera branca tem de ficar a menos de 150 do fundo e o corpo a pelo menos 300. Sobre `#0a1510` a esclera branca fica a 718 por definição, e o corpo `#2c7f4b` (199) só chegaria a 300 perdendo o contraste 4,5:1 com a esclera, que hoje passa (4,95). Satisfazer as três condições exigiria olhos escuros e corpo mais claro, ou seja, redesenhar o OINC no escuro, e não ajustar tokens. Todos os contrastes de cor do OINC no escuro passam (esclera 4,95, sobrancelha 4,71, corpo sobre fundo 3,76, corpo sobre cartão 3,45, moeda 3,97).
- **Ação:** nenhum critério relaxado, nenhum token alterado (P-14, regra da Fase 4). `05-VALIDATION.md` marca a linha 05-20-02 com ⚠️ e deixa `nyquist_compliant: false`; `wave_0_complete: true`. O dono decide em `05-UAT-ROTEIRO.md` item 13: aceitar (então basta virar `nyquist_compliant` para `true`) ou abrir plano de redesenho do OINC no escuro. `deferred-items.md` não foi editado (fora dos arquivos do plano) e traz a causa antiga; esta seção a substitui.

### Ajustes de execução

**2. [Rule 3 - bloqueio] Cadeia de executores com argumentos**
- Meu primeiro laço passou `"theme.mjs --audit"` como um só argumento e três executores deram `MODULE_NOT_FOUND`. Corrigido rodando os quatro com argumentos separados; as saídas citadas acima são as da rodada corrigida.

**3. [Escolha de implementação] Rota `/vintem-teste` e a guarda 7**
- O plano pede que a rota de teste não apareça "em produção fora de `import.meta.env.DEV`". A rota oculta existe sem condição em `App.tsx` por decisão da Fase 4 (D-17, atrás do `ProtectedRoute`, sem link). A guarda confere o que é verdadeiro: nenhum link em `NavRail`, `SettingsPage` e `ShortcutRow`, e `/vintem-teste` só declarado em `App.tsx`; o gancho de falha `__coincBootError` só existe dentro de `if (import.meta.env.DEV)` em `main.tsx` e nunca no HTML.

**4. [Escolha de implementação] Itens do plano atualizados ao estado real**
- Onboarding de quatro passos e Login 029 no lugar do texto antigo; OINC no lugar de Vintém nos textos do roteiro; padrão Claro; o item do 05-21 virou "decidido: manter 302" depois que o outro agente registrou a decisão. Os cinco `human-check` do `<verify>` da Task 3 em `05-20-PLAN.md` não foram reescritos (arquivo fora de `files_modified`): onde dizem "Vintém", leia OINC; o roteiro detalha o estado atual.

**5. [Fora do escopo] Arquivo não rastreado**
- `05-18-DEPLOY-EVIDENCE.md` segue não rastreado no git (de plano anterior). Não foi commitado por não ser arquivo deste plano.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. Só leitura (`curl -sI`, sem variável de ambiente impressa) e arquivos de teste e documentação (T-05-20-01 a T-05-20-04 mitigadas: cada linha verde cita o comando e a Evidência de fechamento lista os resultados; nenhum teste apagado nem piso reduzido).

## Depende de teste humano (aparelho)

Tudo em `05-UAT-ROTEIRO.md`: adicionar à tela inicial no Android (maskable, tela cheia) e no iPhone (ícone de 180 px, armazenamento separado); atualização entre dois deploys sem aviso nem tela branca; tema Claro por padrão e legibilidade no escuro em OLED; cor da abertura no escuro; as quatro telas do onboarding e o nome OINC; endereço antigo no celular; widget do banco no escuro; item 13 (OINC no escuro).

## Self-Check: PASSED

- `test/static/phase5-final.test.js`, `05-UAT-ROTEIRO.md`, `05-VALIDATION.md` e `scripts/ux-audit/vintem.mjs` existem; commits `619afa5a`, `b0f1b337`, `960619b5` e `3851defe` conferidos no log.
