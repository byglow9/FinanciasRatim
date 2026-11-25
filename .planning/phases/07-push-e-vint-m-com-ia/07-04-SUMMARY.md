---
phase: 07-push-e-vint-m-com-ia
plan: 04
subsystem: shared-core
tags: [push, vintem, frases, pwa, estado-puro]
requires:
  - phase: 04
    provides: checkBank, phrasePicker (pick, buildSlots), TONES e mulberry32
provides:
  - banco de frases de aviso por tom (4 situacoes x 3 tons) sem dado financeiro
  - buildPushPayload deterministico pelo id do evento
  - pushState e describeState (estados do cartao Notificacoes)
affects: [07-06, 07-11, 07-18]
tech-stack:
  added: []
  patterns: [banco separado da Fase 4, hash FNV-1a como semente do mulberry32, funcao pura de estado]
key-files:
  created:
    - shared/core/vintemPhrasesPush.js
    - shared/core/vintemPhrasesPush.test.js
    - shared/core/pushState.js
    - shared/core/pushState.test.js
  modified: []
key-decisions:
  - "Banco de push separado de SITUATIONS: as 20 situacoes da Fase 4 ficam intactas"
  - "Unico encaixe permitido e {categoria}, so em push-limite-80 e push-limite-100; cada tom tem variantes sem encaixe"
  - "describeState mantem os textos fixos do plano para as duas plataformas; a plataforma fica na assinatura"
requirements-completed: [PUSH-01, PUSH-04]
status: complete
commits: 3
plan_head_before: fb6fb9af4343f4ee352dd04fdfa3dd3afc5355c0
duration: 20min
completed: 2026-11-25
actuals:
  tokens: 6400
  tasks: 3
  commits: 3
---

# Phase 7 Plan 04: Texto do aviso e estados do cartao Notificacoes Summary

Banco de frases de push por tom (sem digito, moeda, loja nem nome de pessoa, so `{categoria}` nas situacoes de limite) escolhido de forma deterministica pelo id do evento, mais a funcao pura `pushState` com os cinco estados do PUSH-01.

## O que foi feito

- **Tarefa 1 (tracer, 3defb67a):** `hashSeed` (FNV-1a 32 bits), `buildPushPayload({ situation, tone, categoryName, seed })` devolvendo `{ title: 'Vintém', body, phraseId }`, com `pick` + `mulberry32(hashSeed(seed))`; sem frase possivel cai na primeira frase sem encaixe do tom, nunca em texto vazio.
- **Tarefa 2 (6873d60f):** banco completo `PUSH_PHRASES` das quatro situacoes (`push-limite-80`, `push-limite-100`, `push-fatura`, `push-espontanea`) nos tres tons, 6 a 8 variantes por tom, ids `p8|p1|pf|pe-su|di|sf-NN`. Cada sem-filtro tem 5 a 7 frases com palavrao. Passa em `checkBank` (`reviewed: false`) sem alterar a regua.
- **Tarefa 3 (7300762c):** `PUSH_STATES`, `pushState`, `describeState`, `iphoneSteps`. Prioridade: iPhone fora do app instalado, depois nao configurado/sem suporte, depois permissao (negado, ativo, inscricao-perdida, verificando) e por fim padrao.

## Verificacao

- `npm run test:core:tz`: 962 testes, 962 passam, 0 falham, em UTC e em Asia/Tokyo.
- `node --test test/static/phase4-content.test.js`: 0 falhas (1 teste pulado, ja previsto pela Fase 4).
- `shared/core/purity.test.js` passa com os dois modulos novos (sem pacote, sem relogio, sem acaso nativo).

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

Nenhum. O conteudo das frases e rascunho de autoria propria e ainda passa pela revisao do dono no gate de producao (07-18), como na Fase 4.

## Threat Flags

Nenhum. Mitigacoes do plano aplicadas: T-07-12 (guarda que varre todas as frases e reprova digito, moeda, loja e chave estranha) e T-07-14 (`checkBank` reprova palavrao fora do sem-filtro e ataque a pessoa).

## Notas

- `commits: 3` foi medido apenas sobre os arquivos deste plano (`git rev-list --count` com filtro de caminho), porque planos paralelos da onda 1 tambem commitam na mesma branch `main`.

## Self-Check: PASSED

- shared/core/vintemPhrasesPush.js, vintemPhrasesPush.test.js, pushState.js e pushState.test.js existem.
- Commits 3defb67a, 6873d60f e 7300762c existem na branch.
