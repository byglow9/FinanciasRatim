---
phase: 04-mascote-vint-m
plan: 07
subsystem: shared-core
tags: [vintem, phrase-bank, pt-br, content, node-test]
requires: ["04-04"]
provides:
  - "PHRASES_LANCAMENTO com 6 situacoes (gasto-grande, lancamento-ok, receita, porquinho-guardou, porquinho-retirou, meta-batida) em 3 tons, 8 variantes por tom (144 frases)"
  - "shared/core/vintemPhrasesLancamento.test.js: checkBank, ids, minimo de encaixes, palavrao por tom, varredura de pick"
affects: [04-09, 04-12, 04-19]
status: complete
commits: 3
plan_head_before: 0d86990ddf617abe7a940bd37e7e59e598b7ab93
actuals:
  tokens: 4600
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "Grupo de frases como dado congelado; teste do grupo mede checkBank e varre pick com buildSlots reais"
key-files:
  created:
    - shared/core/vintemPhrasesLancamento.test.js
  modified:
    - shared/core/vintemPhrasesLancamento.js
    - shared/core/phrasePicker.test.js
key-decisions:
  - "receita usa uma fala so para a festa e para o susto: espanto bom e 'entrou {valor}', sem 'esperado' nem 'previsto' (o teste trava essas palavras)"
  - "Palavrao no sem-filtro e de empolgacao nas festas (receita, guardou, meta) e de choque nos sustos (gasto-grande, retirou), sempre no gasto ou no cofre, nunca na pessoa"
requirements-completed: [MASC-04, MASC-07]
---

# Phase 4 Plan 07: Frases de reacao a lancamento Summary

Seis situacoes de reacao a lancamento escritas a mao em tres tons (144 frases, 8 por situacao e tom), com `checkBank` vazio e teste de grupo proprio.

## O que foi feito

1. **Task 1 (tracer), `f6f82b63`:** `gasto-grande` (susto) nos tres tons mais o teste do grupo (`checkBank`, ids `gg-su|di|sf-NN`, minimo de 3 variantes com ate um encaixe por tom, palavrao so no sem-filtro, 40 sorteios de `pick` por situacao e tom sem repetir os ultimos ids).
2. **Task 2, `29b4bc1a`:** `lancamento-ok` (fala curta quando o Vintem engole a moeda) e `receita` (neutra entre festa e susto).
3. **Task 3, `73d8e2eb`:** `porquinho-guardou` (festa), `porquinho-retirou` (susto) e `meta-batida` (comemoracao); teste confirma que o grupo tem exatamente as seis situacoes.

Voz: suave acolhe e comemora sem palavrao; direto so informa, em frases curtas; sem-filtro zoa o gasto e o cofre com palavrao (5 ou mais frases por situacao, minimo da regua e 3). Nenhuma frase abre com `{loja}` (nenhuma usa esse encaixe) e todas ficam dentro de 110 caracteres no pior caso.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Teste do seletor assumia `receita` vazia**
- **Found during:** Task 3 (`npm run test:core:tz`)
- **Issue:** `shared/core/phrasePicker.test.js` usava `situation: 'receita'` como exemplo de "sem banco para a situacao" e esperava `null`; com `receita` preenchida o teste quebrou por causa deste plano.
- **Fix:** troquei a situacao do caso por `'situacao-inexistente'`, que preserva a intencao do teste.
- **Files modified:** shared/core/phrasePicker.test.js
- **Commit:** 73d8e2eb

## Deferred Issues

- `npm run test:core:tz` termina com 1 falha, fora dos arquivos deste plano: `phrasePicker.test.js` "o banco declara 20 situacoes, metadados completos e limite-perto com 8 frases por tom" ve 9 frases em `limite-perto`, por causa do trabalho em andamento do plano 04-06 em `shared/core/vintemPhrasesLimites.js`. Reexecutado depois de um intervalo, continuou igual. Deve fechar quando 04-06 atualizar esse teste ou o banco. O teste proprio (`vintemPhrasesLancamento.test.js`, 7 testes) passa, assim como `phraseRules.test.js` e `purity.test.js`.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. Texto estatico sem endpoint novo; `FORBIDDEN_DATA`, `PERSONAL_ATTACK` e `AI_TELLS` passam em todas as frases pelo `checkBank` (T-04-07-01 e T-04-07-03). Textos escritos do zero; a conferencia contra a referencia fica para o plano 04-19 (T-04-07-02).

## Self-Check: PASSED

- shared/core/vintemPhrasesLancamento.js e .test.js existem; commits f6f82b63, 29b4bc1a e 73d8e2eb existem.
