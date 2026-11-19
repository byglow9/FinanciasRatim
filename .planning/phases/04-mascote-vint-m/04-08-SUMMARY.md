---
phase: 04-mascote-vint-m
plan: 08
subsystem: shared-core
tags: [vintem, phrase-bank, ritmo, pt-br, content, node-test]
requires: ["04-04"]
provides:
  - "PHRASES_RITMO em shared/core/vintemPhrasesRitmo.js: 7 situacoes (sem-lancar, ritmo-folgado, ritmo-atencao, ritmo-estourou, dados-velhos, inicio, toque) nos 3 tons, 150 frases"
  - "shared/core/vintemPhrasesRitmo.test.js: checkBank, varredura de pick, neutralidade de dados-velhos"
affects: [04-09, 04-12, 04-19]
status: complete
commits: 3
plan_head_before: 386ef950a777eb78d69a46ba3a8f79aaf527c2cc
actuals:
  tokens: 5300
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "Modulo de grupo de frases como dado congelado, ids prefixo-tom-NN"
    - "Varredura de pick com acaso deterministico (LCG) e historico de recentes para provar ausencia de repeticao"
key-files:
  created:
    - shared/core/vintemPhrasesRitmo.test.js
  modified:
    - shared/core/vintemPhrasesRitmo.js
key-decisions:
  - "dados-velhos nao usa encaixe, digito nem valor em tom nenhum (o teste de neutralidade tambem reprova palavrao e as palavras de veredito do plano)"
  - "ritmo-estourou so usa {dias}: nunca {restante} nem {valor}, para nao exibir valor negativo"
  - "inicio e toque seguem neutros sobre como o mes esta; os encaixes sao opcionais e ha variantes sem encaixe em todos os tons"
requirements-completed: [MASC-04, MASC-07]
coverage:
  - id: D1
    description: "Sete situacoes de ritmo e contexto escritas a mao nos tres tons (150 frases), pt-BR coloquial, sem marca de IA"
    requirement: "MASC-04"
    verification:
      - kind: unit
        ref: "shared/core/vintemPhrasesRitmo.test.js (checkBank das sete situacoes devolve [])"
        status: pass
  - id: D2
    description: "Minimos: reacoes com 8 variantes por tom e contexto com 6, ids estaveis e pior caso de ate 110 caracteres"
    requirement: "MASC-04"
    verification:
      - kind: unit
        ref: "shared/core/vintemPhrasesRitmo.test.js (checkBank, varredura de pick com 40 sorteios por tom e caso de encaixe)"
        status: pass
  - id: D3
    description: "dados-velhos neutro nos tres tons: sem elogio, bronca, veredito, valor, encaixe ou palavrao (D-08, LIM-08)"
    requirement: "MASC-04"
    verification:
      - kind: unit
        ref: "shared/core/vintemPhrasesRitmo.test.js#dados-velhos e neutro nos tres tons"
        status: pass
  - id: D4
    description: "Concordancia de {dias} ('1 dia' e '5 dias') e ritmo-estourou so com {dias}"
    requirement: "MASC-04"
    verification:
      - kind: unit
        ref: "shared/core/vintemPhrasesRitmo.test.js (sem-lancar concorda, ritmo-estourou so dias)"
        status: pass
  - id: D5
    description: "Textos originais, sem copia do app de referencia (MASC-07); conferencia final fica no plano 04-19"
    requirement: "MASC-07"
    verification:
      - kind: other
        ref: "frases escritas do zero neste plano; revisao e corte do dono em 04-19"
        status: pass
  - id: D6
    description: "Nucleo continua verde em UTC e Asia/Tokyo e o tsc nao acusa o modulo novo"
    requirement: "MASC-04"
    verification:
      - kind: unit
        ref: "npm run test:core:tz (614 testes em cada fuso, 0 falhas)"
        status: pass
      - kind: other
        ref: "npx tsc -p tsconfig.app.json --noEmit sem erro em vintemPhrasesRitmo"
        status: pass
---

# Phase 4 Plan 08: Frases do ritmo, dos dias sem lancar, de dados velhos, da abertura e do toque Summary

Sete situacoes do Vintem escritas a mao nos tres tons (150 frases): ritmo folgado, em atencao e estourado, dias sem lancar, abertura da Home e toque, mais uma fala de dados velhos neutra por contrato (sem veredito, sem palavrao, sem encaixe).

## Accomplishments

- `sem-lancar` (8 por tom): o Vintem sonolento. Suave convida a atualizar, direto informa o fato, sem filtro zoa o sumico e o habito de nao anotar, sem atacar a pessoa. Concordancia de `{dias}` provada com dias 1 e 5.
- `ritmo-folgado`, `ritmo-atencao` e `ritmo-estourou` (8 por tom): elogio debochado, aviso e bronca no sem filtro, acolhimento no suave, fato no direto. `ritmo-estourou` usa so `{dias}`. Todas as situacoes tem pelo menos 3 variantes sem encaixe por tom e pelo menos 3 frases com palavrao no sem filtro.
- `dados-velhos` (6 por tom): avisa que os dados do banco estao desatualizados e que por isso o Vintem nao opina. Sem encaixe, sem digito, sem palavrao em nenhum tom, inclusive no sem filtro.
- `inicio` e `toque` (6 por tom): abertura da Home e conversa ao toque, sem presumir como o mes esta; `inicio` tem variantes sem encaixe em todos os tons; o sem filtro solta palavrao em ambas.
- Teste `vintemPhrasesRitmo.test.js`: `checkBank` vazio, ids com o prefixo da situacao, 40 sorteios de `pick` por tom e por caso de encaixe (sem chaves, no `maxLen`, sem repetir os recentes), concordancia de dias, encaixes restritos de `ritmo-estourou`, minimo sem encaixe, neutralidade de `dados-velhos` (parabens, otimo, pessimo, estourou, passou do, folgado, tranquilo, gastou demais e qualquer palavrao) e cobertura exata das sete situacoes.

## Task Commits

1. Task 1 (tracer): `0d86990d` feat(04-08): sem-lancar nos tres tons com teste de ponta a ponta
2. Task 2: `5476d0d5` feat(04-08): ritmo folgado, atencao e estourou nos tres tons
3. Task 3: `d40a6956` feat(04-08): dados velhos, abertura da Home e toque no Vintem

Tracer gate: o `<verify>` da Task 1 (modulo + phraseRules + purity, 112 testes) passou de ponta a ponta antes de expandir.

Nota sobre `commits: 3`: `git rev-list ${plan_head_before}..HEAD` conta 9 porque os planos 04-05, 04-06 e 04-07 rodaram em paralelo no mesmo ramo. O valor do frontmatter conta so os 3 commits `(04-08)` que tocam os arquivos deste plano.

## Deviations from Plan

None - plan executed exactly as written.

Durante a execucao, `npm run test:core:tz` falhou duas vezes por testes de arquivos do plano 04-06 em andamento (`phrasePicker.test.js` contando 8 frases de `limite-perto` quando o plano 04-06 ja tinha 9, e dois testes de `vintemPhrasesLimites.test.js`). Nao eram dos arquivos deste plano; apos o 04-06 concluir, a nova execucao passou limpa (614 de 614 em UTC e em Asia/Tokyo).

## Known Stubs

None.

## Threat Flags

None. Conteudo estatico, sem endpoint, sem acesso a arquivo e sem dado pessoal (FORBIDDEN_DATA verificado por `checkBank` em cada frase).

## Self-Check: PASSED

- shared/core/vintemPhrasesRitmo.js e shared/core/vintemPhrasesRitmo.test.js existem.
- Commits 0d86990d, 5476d0d5 e d40a6956 existem no ramo main.
