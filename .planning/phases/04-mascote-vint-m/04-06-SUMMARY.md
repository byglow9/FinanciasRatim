---
phase: 04-mascote-vint-m
plan: 06
subsystem: shared-core
tags: [vintem, phrase-bank, content, limites, node-test]
requires: ["04-04"]
provides:
  - "PHRASES_LIMITES com 7 situacoes nos 3 tons (limite-atento, limite-perto, limite-estourou, central, delivery-semana, loja-repete, categoria-acima-media), 8 variantes por tom, 168 frases"
  - "shared/core/vintemPhrasesLimites.test.js (checkBank, 40 sorteios por situacao e tom, pior caso, ordinal)"
affects: [04-09, 04-12, 04-19]
status: complete
commits: 3
plan_head_before: f6f82b630526d58541f8f0e3030ce05355c6d434
actuals:
  tokens: 6600
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "Conteudo escrito a mao e medido pela regua automatica (checkBank) no proprio teste do grupo"
    - "Variantes com menos encaixes em cada situacao para o seletor ter candidata quando faltar dado"
key-files:
  created:
    - shared/core/vintemPhrasesLimites.test.js
  modified:
    - shared/core/vintemPhrasesLimites.js
key-decisions:
  - "Nenhuma frase de loja-repete abre com {loja} (a capitalizacao do encaixe viraria 'IFood'); o teste confere"
  - "central evita 'estourou' e vereditos de estado: serve a categoria mais critica em qualquer faixa; so 2 a 3 variantes por tom usam {restante}"
  - "limite-perto (04-04) ficou intacta com 8 variantes: o teste de 04-04 exige exatamente 8"
requirements-completed: []
coverage:
  - id: D1
    description: "Sete situacoes de limite e leitura de gasto com 8 variantes por tom, ids estaveis e checkBank vazio"
    requirement: "MASC-04"
    verification:
      - kind: unit
        ref: "shared/core/vintemPhrasesLimites.test.js (checkBank do grupo, 8 variantes e ids no padrao)"
        status: pass
  - id: D2
    description: "Voz por tom: suave acolhe, direto informa, sem filtro zoa com palavrao no habito (3 ou mais por situacao), sem ataque a pessoa"
    requirement: "MASC-07"
    verification:
      - kind: unit
        ref: "shared/core/vintemPhrasesLimites.test.js (palavrao so no sem-filtro, minimo 3 por situacao)"
        status: pass
  - id: D3
    description: "Exemplo aprovado 'Quarto delivery da semana, caralho. Seu fogao e enfeite?' como ds-sf-01 com ordinal; exemplo suave aprovado segue em lp-su-01"
    requirement: "MASC-04"
    verification:
      - kind: unit
        ref: "shared/core/vintemPhrasesLimites.test.js (delivery-semana: exemplo aprovado; exemplo suave aprovado segue em limite-perto)"
        status: pass
  - id: D4
    description: "central cabe em 80 caracteres no pior caso; demais em 110; 40 sorteios sem chave sobrando nem repeticao dos recentes; candidata com um encaixe so"
    requirement: "MASC-04"
    verification:
      - kind: unit
        ref: "shared/core/vintemPhrasesLimites.test.js (central <= 80, 40 sorteios, candidata com encaixe principal)"
        status: pass
      - kind: unit
        ref: "npm run test:core:tz (UTC e Asia/Tokyo, 614 testes em cada)"
        status: pass
---

# Phase 4 Plan 06: Frases de limite e leitura de gasto do Vintem Summary

Sete situacoes escritas a mao nos tres tons (limite-atento, limite-perto, limite-estourou, central, delivery-semana, loja-repete, categoria-acima-media), 8 variantes por tom (168 frases), todas aprovadas pela regua `checkBank` do plano 04-04.

## Accomplishments

- `limite-estourou`, `limite-atento` e `central`: suave acolhe sem culpar ("passou do limite, mas acontece"), direto so informa ("Limite de {categoria} excedido."), sem filtro xinga o habito ("Estourou {categoria}, caralho. O limite estava la de enfeite?").
- `central` (fala curta da secao "Limites do mes"): todas as 24 variantes medem no maximo 80 pontos de codigo com categoria de 24 caracteres e valor de 13; sem veredito de estado, entao servem para a categoria mais critica em qualquer faixa.
- `delivery-semana`, `loja-repete` e `categoria-acima-media`: zoam o que foi comprado. `ds-sf-01` e o exemplo aprovado com `{ordinal}` abrindo a frase e vira "Quarto delivery da semana, caralho. Seu fogao e enfeite?". Em `loja-repete` nenhuma frase abre com `{loja}`.
- Em cada situacao, pelo menos 3 variantes por tom usam so um encaixe (categoria, loja, ordinal ou vezes), para o seletor ter candidata quando algum dado faltar. Sem filtro tem de 4 a 5 frases com palavrao por situacao (minimo da regua: 3).
- Teste do grupo: `checkBank` vazio; ids no padrao e 8 por tom; 40 sorteios por situacao, tom e dois conjuntos de encaixes reais (sem chave, dentro do tamanho, sem repetir os recentes); `pick` devolve `null` sem encaixes e acha candidata so com o encaixe principal; pior caso dentro do limite; palavrao so no sem filtro; nenhum texto repetido no grupo.

## Task Commits

1. Task 1 (tracer): `9ae00fcd` feat(04-06): limite-estourou nos tres tons e teste do grupo de limites
2. Task 2: `54fbcb76` feat(04-06): limite-atento e a fala curta da secao de limites
3. Task 3: `e79077b5` feat(04-06): delivery da semana, loja que repete e categoria acima da media

Tracer gate: o `<verify>` da Task 1 (grupo + phraseRules + purity, 118 testes) passou de ponta a ponta antes de expandir.

Nota sobre `commits: 3`: `git rev-list plan_head_before..HEAD` conta 8 porque os planos 04-07 e 04-08 rodaram em paralelo no mesmo ramo e intercalaram commits proprios; o valor conta so os 3 commits `(04-06)`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Frase passava de 110 caracteres no pior caso**
- **Found during:** Task 1 (checkBank e teste de pior caso)
- **Issue:** `le-su-04` ("... vamos de cuidado daqui pra frente.") media mais que o `maxLen` com valor e categoria no tamanho maximo
- **Fix:** encurtada para "... Acontece com todo mundo, segue com cuidado."
- **Files modified:** shared/core/vintemPhrasesLimites.js
- **Commit:** 9ae00fcd

**2. [Rule 1 - Bug] Variante extra em limite-perto quebrava o teste de 04-04**
- **Found during:** Task 3 (`npm run test:core:tz`)
- **Issue:** eu tinha acrescentado `lp-*-09` (so com categoria) em `limite-perto`; o teste de `phrasePicker.test.js` exige exatamente 8 por tom
- **Fix:** removi as tres variantes extras e deixei `limite-perto` como veio de 04-04; meus testes de "candidata com um encaixe so" excluem `limite-perto`, que nao tem variante so de categoria no tom direto
- **Files modified:** shared/core/vintemPhrasesLimites.js, shared/core/vintemPhrasesLimites.test.js
- **Commit:** e79077b5

Observacao: o commit `9ae00fcd` chegou a incluir as variantes `lp-*-09`; elas saem no commit `e79077b5`. O estado final de `limite-perto` e identico ao de 04-04.

## Known Stubs

None.

## Threat Flags

None. Texto estatico, sem rede nem armazenamento. T-04-06-01 mitigado (FORBIDDEN_DATA via `checkBank` sobre cada frase); T-04-06-03 mitigado (PERSONAL_ATTACK via `checkBank`; as frases zoam o habito e a compra, nunca a pessoa). T-04-06-02: textos originais; a conferencia com a lista de bloqueio do dono fica para o plano 04-19.

## Issues Encountered

- `npm run test:rules` nao se aplica (nucleo puro; Java indisponivel).
- STATE.md, ROADMAP.md e REQUIREMENTS.md nao foram tocados, por orientacao do orquestrador (execucao em paralelo com 04-05, 04-07 e 04-08). `04-PHRASES-REVIEW.md` nao foi regenerado nem commitado (plano 04-19).
- Pontos para o dono na revisao: frases de `central` com `{restante}` (ce-su-04, ce-di-03, ce-di-08, ce-sf-06) so devem ser sorteadas quando houver folga positiva; o seletor as pula se o encaixe faltar.

## Self-Check: PASSED

- FOUND: shared/core/vintemPhrasesLimites.js, shared/core/vintemPhrasesLimites.test.js
- FOUND commits: 9ae00fcd, 54fbcb76, e79077b5
- `node --test shared/core/vintemPhrasesLimites.test.js`: 16 testes, 0 falhas; `npm run test:core:tz`: 614 testes em UTC e em Asia/Tokyo, 0 falhas
