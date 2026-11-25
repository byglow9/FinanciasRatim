---
phase: 07-push-e-vint-m-com-ia
plan: 09
subsystem: ai-speech-server
tags: [ia, servidor, provedores, privacidade, express]
requires:
  - phase: 07
    provides: "createApp({ features }) e createLimiter (07-01); aiPrivacy, aiValidate e aiCacheKey (07-05); aiSummary e aiPrompt (07-07)"
provides:
  - "POST /api/vintem/fala: situacao em lista fechada, resposta sempre 200 com { text } (texto validado ou null)"
  - "server/src/ai/config.js: readAiConfig le todas as variaveis AI_* com padroes"
  - "server/src/ai/providers.js: adaptador fetch unico, createProviders e createChain com prazo e freios por provedor"
  - "server/src/ai/snapshot.js: createSnapshotLoader (settings e lancamentos do ciclo so da pessoa do token) e mapTransaction"
  - "server/src/ai/speech.js: createSpeech (generate) com prazo total e leakCheck injetavel"
  - "server/src/ai/index.js: createAiFeature, ja na lista features do server/src/index.js"
affects: [07-12, 07-13, 07-14, 07-16, 07-18]
tech-stack:
  added: []
  patterns:
    - "um adaptador fetch OpenAI-compativel para os tres provedores; baseUrl fixa por tipo e so o id da conta do Cloudflare vem da configuracao, validado antes de entrar na URL"
    - "freios por provedor em memoria com relogio injetado; stats() so com contagens"
    - "o corpo da rota so tem situation, categoryId e transactionId; dono e pessoa vem so do token; ids revalidados com 404 igual para alheio e inexistente"
key-files:
  created:
    - server/src/ai/config.js
    - server/src/ai/providers.js
    - server/src/ai/snapshot.js
    - server/src/ai/speech.js
    - server/src/ai/routes.js
    - server/src/ai/index.js
    - server/test/ai-providers.test.js
    - server/test/ai-speech.test.js
    - server/test/emu/ai-speech.test.js
  modified:
    - server/src/index.js
key-decisions:
  - "A lista de situacoes da rota e lancamento, limite, sync, abertura e espiar; o prompt da 07-07 chama a ultima de espiada, e speech.js faz a traducao"
  - "Nas situacoes lancamento e sync o assunto vai nulo (a propria situacao manda reagir ao ultimoLancamento); limite usa limites; abertura e espiar usam o primeiro de assuntos"
  - "Falha de rede, timeout e outros 4xx nao pausam o provedor (o plano so lista freio para 3036, modelo invalido, 3040, 429, 5xx, 401 e 403); o orcamento total limita o custo"
  - "createSpeech aceita leakCheck (padrao findLeaks): ponto de injecao para provar no emulador que um resumo com vazamento nunca chega ao provedor, ja que o resumo real e sempre saneado"
  - "transactionId malformado (fora de [A-Za-z0-9_-] ate 64) tambem responde o mesmo 404; categoryId malformado e ignorado em silencio, como o desconhecido"
  - "Sem lancamento a reagir, lancamento e sync devolvem text null (nao ha o que comentar)"
status: complete
commits: 3
plan_head_before: ce5f2d4150bd9880cf82d8051ea66735f913e2ea
actuals:
  tokens: 17900
  tasks: 3
  commits: 3
---

# Phase 7 Plan 09: Servidor da fala por IA Summary

A rota POST /api/vintem/fala monta o resumo so da pessoa do token, chama a cadeia de provedores (Cloudflare, Groq e xAI por um unico adaptador fetch, ordem, chaves e modelos so por variaveis de ambiente) com prazo e freios por provedor, valida a saida na regua da D-22 e responde sempre 200 com o texto aprovado ou null, para o app cair no banco de frases sem erro visivel.

## O que foi feito

- **Task 1 (tracer, 091a9131):** `config.js` (todas as AI_*, numero invalido volta ao padrao, provedor sem chave ou sem modelo fica de fora com aviso so do nome), `providers.js` (adaptador com `AbortSignal.timeout`, leitura de `choices[0].message.content`), `snapshot.js` (settings/main so sem dono ou com dono igual ao casal, lancamentos do ciclo atual com `ownerId`, `person` e janela de data), `speech.js` (resumo, `findLeaks`, assunto, tamanho, tempero, prompt, validador com `allowed`, `partnerLabels` e `reactionLabels`), `routes.js` e `index.js`, mais a feature na lista de `server/src/index.js`.
- **Task 2 (fbaca4d1):** `createChain` com ordem de AI_PROVIDERS, prazo por chamada (AI_TIMEOUT_MS) e orcamento total (AI_TOTAL_BUDGET_MS). Cai para o proximo: erro, timeout, rede, resposta vazia, validacao reprovada ou validador que lanca. Freios: 429 com codigo 3036 ate 00:00 UTC; 5035, 5007, 3042 e 5028 desligam o provedor com a linha "modelo invalido"; 3040, qualquer 429 e 5xx pausam 60 s (ou Retry-After, ate 15 min); 401 e 403 pausam 10 min. `stats()` so com contagens.
- **Task 3 (9664d5a2):** `categoryId` e `transactionId` opcionais revalidados (alheio e inexistente dao o mesmo 404), limitador de rajada por uid (AI_BURST_PER_MIN, 429 "Muitos pedidos" com Retry-After), prazo total da rota devolvendo `{ text: null }` sem cancelar a chamada em andamento, e o teste no emulador com dois casais e duas pessoas.

## Verificacao

- `npm run test:server`: 211 passam, 0 falham (eram 178 antes deste plano; `ai-providers` 24, `ai-speech` 21 testes novos).
- `npm run test:emu`: 159 passam, 0 falham, incluindo os 6 de `emu/ai-speech.test.js`: a fala de Ele nao tem Rappi, Spotify, Viagem nem valores dela; a de Ela nao tem nada dele; o casalB nao ve nada do casalA; nome de pessoa em lancamento manual chega sem o nome; vazamento forcado nunca chama o fetch falso; ids alheios dao 404 igual ao inexistente.
- `npm run test:core:tz`: 1084 passam nos dois fusos. `npm run test:static`: 714 passam. `npm run lint`: limpo. `npm run build`: ok.
- `server/src/app.js` nao foi alterado.

## Deviations from Plan

Nenhuma de regra 1 a 4. Decisoes de detalhe fora do texto do plano estao em key-decisions (traducao `espiar` para `espiada`, assunto nulo nas reacoes, `leakCheck` injetavel, 404 tambem para id malformado).

## Contrato para os proximos planos

- **07-12 (cache e teto diario):** `createSpeech({ snapshot, providers, config })` recebe qualquer objeto com `complete(args)`; o cache e o teto entram como camada em volta de `providers.complete` ou de `speech.generate`. `config.dailyCapPerUser`, `cacheTtlHours` e `cacheVariants` ja sao lidos. `generate` ja devolve `{ text }` e o prazo total (AI_TOTAL_BUDGET_MS) nao cancela a chamada em andamento.
- **07-13 (snapshot completo):** `createSnapshotLoader.load({ hid, person, fresh })` ja recebe `fresh` (verdadeiro em lancamento, limite e sync) e devolve `reads`; faltam `prevTransactions`, `bills`, `payments`, `goals`, `porquinhoCents`, `cards` e `insights`, hoje vazios.
- **07-16 (GET /hints):** devolver `config.reactionTimeoutMs` (padrao 2500, entre 1500 e 4000); `createAiFeature` expoe `config`.
- **07-14 (cliente):** corpo `{ situation, categoryId?, transactionId? }`; 200 com `{ text }` (null = banco de frases), 429 e 404 tratados como sem fala.

## Known Stubs

Nenhum stub de UI. Os campos do snapshot que ainda vao vazios (bills, goals, cards, porquinho, insights, comparacao) sao escopo declarado do 07-13.

## Threat Flags

Nenhum alem do `<threat_model>` do plano. Mitigados: T-07-32 (ids revalidados, 404 igual), T-07-33 (consulta so da pessoa do token, findLeaks antes de enviar, prova no emulador), T-07-34 (baseUrl fixa por tipo, id da conta validado), T-07-35 (teste captura o log e procura chave, prompt, texto e descricao), T-07-36 (rajada por uid e freios por provedor; teto diario e cache sao do 07-12), T-07-37 (validateSpeech antes de responder). Esta rota e superficie nova de rede, ja coberta pelo registro.

## Notas de execucao

- `commits: 3` e a contagem dos commits deste plano (`git log --grep "(07-09)"`). `rev-list` desde `plan_head_before` conta 4 porque o commit 6e7eeb07 ("icone") entrou na mesma branch por fora deste plano.
- O executor do 07-08 comitou em paralelo; so houve edicao compartilhada em `server/src/index.js`, e a minha foi de duas linhas (import e item na lista `features`).
- Nenhum pacote instalado, nenhum `.env*` lido, sem push nem deploy. `.env.local` e `.planning/state.json` aparecem modificados no status e ficaram fora de todo commit.

## Self-Check: PASSED

Arquivos conferidos: server/src/ai/{config,providers,snapshot,speech,routes,index}.js, server/test/ai-providers.test.js, ai-speech.test.js e emu/ai-speech.test.js, todos presentes; commits 091a9131, fbaca4d1 e 9664d5a2 presentes no historico.
