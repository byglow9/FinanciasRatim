---
phase: 04-mascote-vint-m
plan: 04
subsystem: shared-core
tags: [vintem, phrase-bank, picker, content-rules, review-sheet, node-test]
requires: []
provides:
  - "SLOT_NAMES, needsOf, ordinalMasc, buildSlots, fill, pick, recentKey, pushRecent, recentLimit, textLength em shared/core/phrasePicker.js"
  - "MIN_VARIANTS, minFor, AI_TELLS, PROFANITY, PERSONAL_ATTACK, FORBIDDEN_DATA, UNACCENTED, WORST_CASE_SLOTS, checkPhrase, checkBank em shared/core/phraseRules.js"
  - "TONES, SITUATIONS (20), SITUATION_META, PHRASES, REVIEW, mergeGroups em shared/core/vintemPhrases.js"
  - "PHRASES_LIMITES (limite-perto escrita), PHRASES_LANCAMENTO e PHRASES_RITMO (vazios, para 04-07 e 04-08)"
  - "renderReviewSheet e scripts/vintem/review-sheet.mjs (grava 04-PHRASES-REVIEW.md)"
affects: [04-06, 04-07, 04-08, 04-09, 04-12, 04-19]
status: complete
commits: 6
plan_head_before: aabb615c353daec6f12cdf04af44dc600f68b81d
actuals:
  tokens: 12100
  tasks: 3
  commits: 6
tech-stack:
  added: []
  patterns:
    - "Banco de frases como dado congelado em modulos de grupo, mesclado por mergeGroups com erro de colisao na carga"
    - "Seletor puro com acaso injetado (rand) e historico imutavel por situacao e tom"
    - "Regua de conteudo por lista de regex com fronteira de palavra que entende acento (lookaround em vez de \\b)"
key-files:
  created:
    - shared/core/phrasePicker.js
    - shared/core/phrasePicker.test.js
    - shared/core/phraseRules.js
    - shared/core/phraseRules.test.js
    - shared/core/vintemPhrases.js
    - shared/core/vintemPhrasesLimites.js
    - shared/core/vintemPhrasesLancamento.js
    - shared/core/vintemPhrasesRitmo.js
    - scripts/vintem/review-sheet.mjs
    - test/static/phase4-review-sheet.test.js
  modified: []
key-decisions:
  - "Valor monetario sai por formatMoney no modo auto (R$ 90, sem ,00), igual ao exemplo aprovado do UI-SPEC ('Restam R$ 90.')"
  - "Id da frase precisa carregar o codigo do proprio tom (su, di, sf), alem do prefixo da situacao"
  - "checkPhrase mede o tamanho preenchendo o texto com WORST_CASE_SLOTS e conta pontos de codigo (NBSP vale 1)"
  - "pick tenta a lista sem recentes e, se nada servir, a lista 'tudo menos a mais recente'; nunca devolve texto generico"
requirements-completed: []
coverage:
  - id: D1
    description: "pick escolhe frase do tom e da situacao com todos os encaixes preenchidos, sem repetir as ultimas, e devolve nulo quando nada serve"
    requirement: "MASC-04"
    verification:
      - kind: unit
        ref: "shared/core/phrasePicker.test.js (pick nos tres tons, sem repeticao, relaxa, nulo sem categoria, maxLen)"
        status: pass
  - id: D2
    description: "Encaixes formatados pelo nucleo (formatMoney, plural), ordinal por extenso e primeira letra maiuscula quando o encaixe abre frase"
    requirement: "MASC-04"
    verification:
      - kind: unit
        ref: "shared/core/phrasePicker.test.js (buildSlots, ordinalMasc, fill)"
        status: pass
  - id: D3
    description: "Regras de conteudo testaveis: marca de IA, palavrao fora do sem-filtro, ataque a pessoa, dado proibido, acento, encaixe, tamanho, id, minimos e duplicados"
    requirement: "MASC-04"
    verification:
      - kind: unit
        ref: "shared/core/phraseRules.test.js (testes 1 a 8)"
        status: pass
  - id: D4
    description: "Banco com 20 situacoes declaradas, tres grupos mesclados sem colisao e limite-perto escrita (8 por tom) aprovada pela regua"
    requirement: "MASC-04"
    verification:
      - kind: unit
        ref: "shared/core/phrasePicker.test.js#o banco declara 20 situacoes; shared/core/phraseRules.test.js#8 e PHRASES e a mescla"
        status: pass
  - id: D5
    description: "Folha de revisao em Markdown gerada por script, uma tabela por situacao e tom com id, exemplo, pior caso e caixa de cortar"
    requirement: "MASC-07"
    verification:
      - kind: unit
        ref: "test/static/phase4-review-sheet.test.js (7 testes)"
        status: pass
      - kind: other
        ref: "node scripts/vintem/review-sheet.mjs grava 04-PHRASES-REVIEW.md com as 3 tabelas de limite-perto (24 linhas lp-)"
        status: pass
  - id: D6
    description: "Nucleo continua puro e o build nao quebra"
    requirement: "MASC-04"
    verification:
      - kind: unit
        ref: "npm run test:core:tz (UTC e Asia/Tokyo, 582 testes em cada, incluindo purity.test.js)"
        status: pass
      - kind: other
        ref: "npx tsc -p tsconfig.app.json --noEmit sem erros nos arquivos novos"
        status: pass
---

# Phase 4 Plan 04: Infraestrutura do banco de frases do Vintem Summary

Seletor de frases sem repeticao com encaixes formatados pelo nucleo, regua automatica de conteudo (sem cara de IA, sem palavrao fora do sem-filtro, sem ataque a pessoa, sem dado proibido, com acento), agregador de tres modulos de grupo e gerador da folha de revisao do dono, tudo provado com `limite-perto` escrita de verdade nos tres tons.

## Accomplishments

- `phrasePicker.js`: `buildSlots` devolve so encaixes validos (valor, restante e total por `formatMoney`; vezes e dias por `plural`; pct como `82%`; ordinal por extenso; loja e categoria em ate 24 caracteres e sem chaves). `fill` devolve `null` com encaixe faltando e capitaliza o encaixe que abre frase ("Quarto delivery da semana"). `pick` filtra por tom e encaixes, tira os recentes, relaxa para "tudo menos a mais recente" e devolve `null` em vez de texto generico; o acaso entra por `rand`.
- `vintemPhrases.js`: `TONES`, as 20 `SITUATIONS`, `SITUATION_META` (prefixo, natureza, encaixes permitidos, `maxLen` 110 e 80 em `central`, `edgy`), `PHRASES` por `mergeGroups` (lanca erro na carga se duas fontes definirem a mesma situacao) e `REVIEW = { reviewedAt: null }`. O guia de estilo dos planos de conteudo esta no cabecalho.
- `vintemPhrasesLimites.js` com `limite-perto` em 8 variantes por tom (ids `lp-su-01` a `lp-sf-08`; o exemplo aprovado e `lp-su-01`); `vintemPhrasesLancamento.js` e `vintemPhrasesRitmo.js` prontos e vazios para 04-07 e 04-08, com a lista de situacoes de cada grupo no cabecalho.
- `phraseRules.js`: `checkPhrase` e `checkBank` conforme o plano (minimo 8 em reacao e 6 em contexto antes da revisao e 5 depois; 3 frases com palavrao em sem-filtro nas situacoes `edgy`, 2 depois da revisao; id e texto duplicados). `limite-perto` passa na regua sem problema algum.
- `scripts/vintem/review-sheet.mjs`: `renderReviewSheet` pura e execucao direta que grava `.planning/phases/04-mascote-vint-m/04-PHRASES-REVIEW.md` e imprime a contagem por situacao e tom. As 17 situacoes ainda sem frases aparecem como "sem frases".

## Task Commits

1. Task 1 (tracer): `06575410` feat(04-04): seletor de frases, agregador e limite-perto nos tres tons
2. Task 2 (TDD): `6311e75e` test (RED), `a3c3866e` feat (GREEN): regua de conteudo e modulos de grupo
3. Task 3 (TDD): `8b9733e8` test (RED), `449efd99` feat (GREEN): gerador da folha de revisao
4. Correcao de tipos: `9df77c93` fix(04-04): tipos do seletor e da regua para o tsc do build

Tracer gate: o `<verify>` da Task 1 (picker + purity, 105 testes) passou de ponta a ponta antes de expandir.

Nota sobre `commits: 6`: `git rev-list ${plan_head_before}..HEAD` conta mais porque o plano 04-10 rodou em paralelo no mesmo ramo e intercalou commits proprios. O valor do frontmatter conta so os 6 commits `(04-04)` listados acima (tarefa 1, RED e GREEN das tarefas 2 e 3, e o fix de tipos).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Erros de tipo no build (tsc)**
- **Found during:** verificacao final (o `tsconfig.app.json` inclui `shared`, e `// @ts-check` ativa a checagem)
- **Issue:** `found` implicito `any[]` em `needsOf`, parametro `msg` sem tipo e indexacao de `TONE_CODE` por string quebrariam `npm run build`
- **Fix:** anotacoes JSDoc (`@type {string[]}`, `@param {string} msg`, `@type {Readonly<Record<string, string>>}`)
- **Files modified:** shared/core/phrasePicker.js, shared/core/phraseRules.js
- **Commit:** 9df77c93

### Interpretacoes do plano

- Valor monetario no modo `auto` do `formatMoney` ("R$ 90", sem centavos zerados), em vez de "R$ 90,00" citado no plano: segue o contrato do UI-SPEC ("Restam R$ 90.") e o formato do resto do app.
- Ordinal acima de 10 vira `11º` (a notacao "Nº" do plano).
- `checkPhrase` exige que o id traga o codigo do tom certo (`su`, `di`, `sf`), mais estrito que o padrao `(su|di|sf)` do plano, para pegar frase posta no tom errado.
- `PHRASES` e a mescla por `mergeGroups` (exportada para teste), e `textLength` foi exportada do seletor para o gerador e a regua usarem a mesma contagem.
- Efeito colateral da regra de capitalizacao: encaixe de loja no inicio da frase vira "IFood". Os planos de conteudo devem evitar abrir frase com `{loja}`.

## Decisions Made

- Ver `key-decisions` no frontmatter.
- O arquivo gerado `04-PHRASES-REVIEW.md` ficou sem commit de proposito: nao esta em `files_modified`, e os planos 04-06, 04-07 e 04-08 o regeneram; o plano 04-19 gera a versao final para o dono.

## Known Stubs

- `shared/core/vintemPhrasesLancamento.js` e `shared/core/vintemPhrasesRitmo.js` exportam objeto vazio de proposito (nenhuma tela os consome ainda; `pick` devolve `null` e o balao nao aparece). Resolvidos pelos planos 04-07 e 04-08. Nao registrado em `.planning/WINDOWS.md` por ser placeholder planejado e nomeado no plano.

## Threat Flags

None. Modulos puros, sem rede, DOM nem armazenamento. T-04-04-01 mitigado (`buildSlots` corta em 24 caracteres e remove chaves; `fill` nao reinterpreta o valor inserido); T-04-04-02 mitigado (`FORBIDDEN_DATA` em `checkPhrase`); T-04-04-03 mitigado (`{loja}` restrito a `loja-repete` em `SITUATION_META`); T-04-04-04 mitigado (candidatas finitas, retorno `null` testado).

## Issues Encountered

- `npm run test:rules` nao se aplica (nucleo puro, sem regras do Firestore) e Java nao e necessario.
- Requisitos MASC-04 e MASC-07 nao foram marcados como concluidos: outros planos da fase tambem os listam. Por orientacao do orquestrador, STATE.md, ROADMAP.md e REQUIREMENTS.md nao foram tocados por este plano (o orquestrador os atualiza). Nenhuma marca precisou ser desfeita.

## Self-Check: PASSED

- FOUND: shared/core/phrasePicker.js, phrasePicker.test.js, phraseRules.js, phraseRules.test.js, vintemPhrases.js, vintemPhrasesLimites.js, vintemPhrasesLancamento.js, vintemPhrasesRitmo.js, scripts/vintem/review-sheet.mjs, test/static/phase4-review-sheet.test.js
- FOUND commits: 06575410, 6311e75e, a3c3866e, 8b9733e8, 449efd99, 9df77c93
