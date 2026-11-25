---
phase: 07-push-e-vint-m-com-ia
plan: 07
subsystem: ai-content-core
tags: [ia, resumo, prompt, privacidade, nucleo-puro]
requires:
  - phase: 07
    provides: "aiPrivacy (merchantLabel, safeLabel, findLeaks), aiValidate (extractNumbers, validateSpeech) e aiCacheKey (07-05)"
  - phase: 03
    provides: "buildBudgetView, cycleOf, shiftCycle, normalizePersonConfig e formatMoney"
  - phase: 04
    provides: "BRAND_DICTIONARY e o formato dos insights guardados (insights.js)"
provides:
  - "aiSummary.js: buildAiSummary, collectAllowed, summaryToPromptText, rankTopics, reactionLabels, TOPICS e SUMMARY_LIMITS"
  - "aiPrompt.js: buildMessages, lengthFor, isEdgy, maxTokens, TEMPERATURE, TONES, SITUATIONS, LENGTHS, STYLE_EXAMPLES, DATA_OPEN e DATA_CLOSE"
affects: [07-12, 07-13, 07-18]
tech-stack:
  added: []
  patterns:
    - "o resumo e um objeto pequeno em texto seguro: dinheiro de formatMoney, porcentagem como texto com %, contagem limitada a 999"
    - "os numeros permitidos da fala saem do proprio resumo serializado, lido com extractNumbers, a mesma leitura do validador"
    - "o bloco de dados entra no prompt entre marcas fixas e a mensagem de sistema nao depende dele"
key-files:
  created:
    - shared/core/aiSummary.js
    - shared/core/aiSummary.test.js
    - shared/core/aiPrompt.js
    - shared/core/aiPrompt.test.js
  modified: []
key-decisions:
  - "Porcentagem vai ao resumo como texto com % (\"73%\") e nunca como numero cru: assim extractNumbers a poe no balde pcts e a fala que citar 73% passa; como inteiro cru ela cairia em ints e reprovaria"
  - "O resumo usa a chave ultimoLancamento (a mesma que reactionLabels le); o campo latest do texto do plano e so o nome da entrada latestTx"
  - "Cada loja do resumo leva tipo (loja, pessoa, categoria ou manual): e por ele que reactionLabels so devolve loja reconhecida como otherLabels"
  - "padroes exclui limit-near, limit-over e rhythm: ja tem secao propria (limites e podeGastar.ritmo) e ocupariam as 5 vagas dos padroes de verdade"
  - "Tom desconhecido cai no direto (o unico sem palavrao e sem apelido), nunca no sem-filtro"
  - "O nome do mascote no prompt e OINC; a guarda phase5-oinc-name varre shared/ e proibe Vintem em texto"
status: complete
commits: 3
plan_head_before: 96b06f90037c8c8fc9bc571e4f82bdc8c0ee974f
actuals:
  tokens: 18350
  tasks: 3
  commits: 3
---

# Phase 7 Plan 07: Resumo do mes e prompt da fala por IA Summary

Dois modulos puros do nucleo: o resumo do mes que e tudo o que a IA enxerga (so a pessoa do token e o que e do casal, todo texto livre por aiPrivacy, sem ano, AAAA-MM nem data) e o prompt por tom, situacao e tamanho que traduz D-11, D-13, D-14 e D-15, provados sem rede por 46 testes novos.

## O que foi feito

- **Task 1 (tracer, 31fb3a81):** `buildAiSummary` com `ciclo` (mes pelo nome e dia do ciclo), `podeGastar` (de `buildBudgetView`), `limites` e `ultimoLancamento`; `collectAllowed` e `summaryToPromptText`; `buildMessages` com o tom sem-filtro e o bloco entre marcas. Um mes sintetico (delivery acima do limite, iFood, Pix para pessoa, manual com nome) sai sem nome, ano, AAAA-MM nem digito longo.
- **Task 2 (b81f5d75):** as demais secoes da D-16: `renda`, `fixas` (total, pagas, a pagar, 5 proximas), `semLimite`, `lojas` (ate 8, vezes na semana e no ciclo, total, Pix para pessoa agrupado em "uma pessoa"), `comparacao` (ate 6, contra o ciclo anterior ate o mesmo dia do ciclo), `metas`, `porquinho`, `fatura`, `padroes` (insights guardados de severidade 2 ou 3) e `assuntos`. `rankTopics` ordena os assuntos (padrao forte, limite estourado, limite perto, comparacao alta, ritmo, resto) e `reactionLabels` separa a loja do lancamento atual das demais.
- **Task 3 (a77130df):** mensagem de sistema propria para `suave`, `direto` e `sem-filtro` (palavrao pesado, deboche e apelidos so no sem-filtro, com a unica trava de nunca ofender raca, cor, orientacao, religiao, deficiencia, origem ou grupo e a regra de nunca falar da outra pessoa), dois exemplos de estilo por tom sem numero nem nome, mensagem de usuario com situacao, assunto, tamanho e bloco; `lengthFor`, `isEdgy` e `maxTokens`.

## Resultados dos testes

- `TZ=UTC` e `TZ=Asia/Tokyo` nos dois modulos e em `purity.test.js`: passam (aiSummary 28 casos, aiPrompt 18 casos).
- `npm run test:core:tz`: 1084 passam e 0 falham nos dois fusos (eram 1032).
- `npm run test:static`: 709 passam, 0 falham.
- `npm run lint`: limpo. `npm run build` (tsc -b e vite build): ok.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Nome composto digitado sem preposicao num lancamento manual**
- **Found during:** Task 2 (bateria de entradas sujas)
- **Issue:** `merchantLabel` em modo manual so cobre nome depois de para, pra, com e preposicoes; "Joao Silva Santos" ou "Lucas Ricardo Fernanda" sozinhos passavam como rotulo de loja ate o provedor (T-07-25, critica).
- **Fix:** camada extra em `safeMerchant` de `aiSummary.js`: rotulo manual formado so por duas ou mais palavras com inicial maiuscula, sem marca do dicionario nem termo de estabelecimento, cai no nome da categoria. `aiPrivacy.js` (07-05) nao foi tocado.
- **Files modified:** shared/core/aiSummary.js, shared/core/aiSummary.test.js
- **Commit:** b81f5d75

### Decisoes de detalhe fora do texto do plano

- Chaves do resumo em portugues sem acento (`podeGastar`, `semLimite`, `naSemana`, `noCiclo`, `diasRestantes`); valores de texto com acento.
- Secoes vazias sao omitidas (menos tokens); `ciclo`, `podeGastar` e `assuntos` sempre existem.
- `podeGastar.valor` e `porDia` so saem quando ha renda (esperada ou recebida); `gastoDoCiclo` sempre sai.
- Cada lista tem tamanho maximo em `SUMMARY_LIMITS`; resumo de pior caso fica abaixo de 6.000 caracteres (cerca de 1.500 tokens).
- Em `rankTopics`, "comparacao alta" e variacao de 30 pontos percentuais ou mais, para cima ou para baixo (`HIGH_COMPARISON_PCT`).
- `lengthFor` so vira `longa` por `overLimit`, ou pelos assuntos padroes, comparacao e semana; `situation` entra na assinatura mas nao muda o resultado.

## Contrato para os proximos planos

- **07-12 (rota do servidor):** montar a entrada de `buildAiSummary` so com dados de `hid` e `person` do token; passar `latestTx` ja relido pelo `transactionId`; o resumo nao leva ano nem AAAA-MM, entao `canonicalKey` (aiCacheKey) recebe a chave do ciclo por fora. Antes de enviar, rodar `findLeaks(summaryToPromptText(summary))` e abandonar a chamada (frase do banco) se nao vier vazio.
- **07-12 e 07-13 (validacao da saida):** `ctx.allowed = collectAllowed(summary)`; para as situacoes `lancamento` e `sync` somar `reactionLabels(summary)` ao contexto; `edgy = isEdgy(situation, topic)`; `length = lengthFor({ situation, topic, overLimit })`; tokens por `maxTokens(length, fator)`.
- **07-13:** `partnerLabels` continua por conta do chamador (nomes das duas abas).

## Risco residual (T-07-16, aceito na D-20, agora ampliado)

O removedor de nomes nao pega nome digitado sem preposicao e em minusculas ("maria souza" sozinho), nem nome dentro de nome de conta fixa, meta ou cartao fora dos padroes de preposicao ("Nubank final Joao" passa). Vai para o roteiro de UAT junto com o risco registrado no 07-05.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum: so funcoes puras, sem endpoint, sem acesso a arquivo e sem mudanca de esquema.

## Notas de execucao

- `commits: 3` e a contagem dos commits deste plano (`git log --grep "(07-07)"`); `plan_head_before` e o HEAD no primeiro commit, e como o executor do 07-06 comita em paralelo na mesma branch, `rev-list` desde esse ponto conta tambem o commit f34c7d14 do 07-06.
- `.env.local` aparece modificado no status, mas nao foi lido nem tocado por este plano e ficou fora de todo commit.
- Nenhum pacote instalado, sem push nem deploy.

## Self-Check: PASSED

Arquivos conferidos: shared/core/aiSummary.js, aiSummary.test.js, aiPrompt.js, aiPrompt.test.js, todos presentes; commits 31fb3a81, b81f5d75 e a77130df presentes no historico.
