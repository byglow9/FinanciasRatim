---
phase: 05-identidade-coinki-pwa-e-onboarding
plan: 04
subsystem: docs
tags: [documentacao, nome, coinc, redirect, atualizacao-silenciosa, guarda-estatica, node-test]
status: complete

requires:
  - phase: 05-identidade-coinki-pwa-e-onboarding
    provides: CONTEXT com as decisoes D-01 a D-06, D-12 e D-14 da conversa de 2026-11-23
provides:
  - "ROADMAP, REQUIREMENTS, PROJECT, .claude/CLAUDE.md e STACK com Coinc e coinc.web.app"
  - "IDEN-02 (redirect direto), IDEN-03 (terceira tela e Ajustes), IDEN-04 (atualiza sozinho) e IDEN-05 (Automatico) com a redacao nova"
  - "test/static/phase5-docs.test.js: guarda dos textos de planejamento"
affects: [05-08 Hosting e redirect, 05-10 boot e atualizacao, 05-20 fechamento da fase, verificador da Fase 5]

actuals:
  tokens: 9700
  tasks: 2
  commits: 2
plan_head_before: ffd0ac3ba9c7b276940360d83c31da6fa03c0b31

tech-stack:
  added: []
  patterns:
    - "Guarda estatica de documentos de planejamento: nome antigo montado por concatenacao e varredura linha a linha com lista fechada de excecoes"

key-files:
  created:
    - test/static/phase5-docs.test.js
  modified:
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - .planning/PROJECT.md
    - .claude/CLAUDE.md
    - .planning/research/STACK.md

key-decisions:
  - "IDEN-05 e IDEN-06 voltaram a [ ] e Pending (checkbox e tabela Traceability): o mark-complete do 05-03 as fechou cedo; so fecham no plano 05-20"
  - "Nao rodei requirements mark-complete neste plano: e so documentacao e IDEN-01, IDEN-02 e IDEN-04 nao estao entregues"
  - "A guarda nao afirma o estado de IDEN-05 e IDEN-06, para o plano 05-20 poder fecha-los sem quebrar o teste"

patterns-established:
  - "Nenhum Write sobre arquivo de planejamento: edicoes por trecho unico, com falha se o trecho nao for unico"

requirements-completed: []

coverage:
  - id: D1
    description: "Os cinco documentos dizem Coinc e coinc.web.app; o nome antigo so fica em caminhos, identificadores internos e na linha historica da decisao de nome (D-01)"
    requirement: "IDEN-01"
    verification:
      - kind: unit
        ref: "node --test test/static/phase5-docs.test.js (testes 1 e 2)"
        status: pass
  - id: D2
    description: "IDEN-02 e criterio 1 dizem redirect direto sem pagina de aviso; ROADMAP dispensa pesquisa de loja e INPI, ID ocupado vira perguntar ao dono, ordem com 302 antes de 301 (D-02, D-03, D-04)"
    requirement: "IDEN-02"
    verification:
      - kind: unit
        ref: "node --test test/static/phase5-docs.test.js (testes 3, 4 e 5)"
        status: pass
  - id: D3
    description: "IDEN-04 e criterio 3 dizem atualiza sozinho ao abrir, sem aviso, sem tela branca e nunca no meio de um lancamento (D-14)"
    requirement: "IDEN-04"
    verification:
      - kind: unit
        ref: "node --test test/static/phase5-docs.test.js; npm run test:static (465 testes, 0 falhas)"
        status: pass

duration: 10min
completed: 2026-11-23
---

# Phase 5 Plan 04: Documentos com Coinc, redirect direto e atualizacao silenciosa Summary

**Cinco documentos de planejamento reescritos por trecho para Coinc e coinc.web.app, com redirect direto do site antigo e atualizacao silenciosa ao abrir, e uma guarda estatica que impede o nome antigo e os avisos descartados de voltarem.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 2
- **Files modified:** 6 (5 documentos e 1 teste novo)

## Accomplishments

- ROADMAP: titulo, visao geral, lista de fases, secao Phase 5 (meta, notas de execucao com D-02, D-03, D-05, D-06 e a ordem de producao com 302 antes de 301, criterios 1 a 5), meta da Fase 8 e linha da tabela de progresso. O bloco "Plans:" e o contador "2/21" nao foram tocados.
- REQUIREMENTS: IDEN-01 a IDEN-05 e IDEN-08 com a redacao nova, MULTI-01, tabela de fora de escopo e rodape.
- PROJECT.md e a secao Project de `.claude/CLAUDE.md`: nome, endereco, decisao de nome como "Decidido" (D-01, D-02, D-03) e duas linhas novas na tabela de decisoes (D-04 e D-14).
- STACK.md e a copia da pilha em `.claude/CLAUDE.md`: Feature 6 com `coinc`, nota de `registerType: 'prompt'` apontando para `shared/core/pwaUpdate.js` (D-14) e a lacuna de pesquisa do nome trocada pela regra de parar e perguntar.
- `test/static/phase5-docs.test.js`: 6 testes (nome, excecoes, IDEN-02/03/04/05, secao Phase 5 e bloco Plans).

## Task Commits

1. **Task 1: reescrever os cinco documentos** - `c35deae8` (docs)
2. **Task 2: guarda estatica** - `86365ff9` (test)

## Deviations from Plan

### Ajuste pedido pelo orquestrador (nao e desvio de regra)

- **IDEN-05 e IDEN-06 pendentes.** O plano manda nao alterar a tabela Traceability, mas o `requirements mark-complete` do 05-03 tinha marcado os dois como completos antes da hora. Revertidos para `[ ]` e `Pending` (checkbox e tabela). Fecham so no plano 05-20.
- **Sem `requirements mark-complete` neste plano.** O plano declara IDEN-01, IDEN-02 e IDEN-04, mas e so texto: nada disso esta entregue. Rodar o comando fecharia os tres cedo demais.

Fora isso, plano executado como escrito. Uma asserção extra que eu tinha pensado (IDEN-05 e IDEN-06 pendentes na guarda) foi retirada antes do commit, para nao quebrar o 05-20.

## Issues Encountered

- **IDEN-04 continua `[x]` / Complete** em REQUIREMENTS.md, marcado pelo `mark-complete` do 05-02. Com a redacao nova ("atualiza sozinho ao abrir... nunca no meio de um lancamento") ele so fica pronto no plano 05-10 (boot e recarga protegida). Nao mexi porque o pedido citou so IDEN-05 e IDEN-06; fica para o orquestrador decidir.
- `.planning/milestone.lock` e `.planning/state.json` ficaram modificados no working tree e nao foram incluidos nem revertidos.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum: so texto de planejamento e um teste que le arquivos locais.

## Self-Check: PASSED

- FOUND: test/static/phase5-docs.test.js
- FOUND: c35deae8, 86365ff9 (`git rev-list --count` desde o ledger = 2)
- `node --test test/static/phase5-docs.test.js`: 6 testes, 0 falhas; `npm run test:static`: 465 testes, 0 falhas
