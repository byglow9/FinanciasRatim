---
phase: 07-push-e-vint-m-com-ia
plan: 12
subsystem: ai-quota-protection
tags: [ia, cota, cache, firestore, teto-diario]
requires:
  - phase: 07
    provides: "createSpeech, createChain e readAiConfig (07-09); canonicalKey e bucket5 (07-05); collectAllowed e reactionLabels (07-07)"
provides:
  - "server/src/ai/budget.js: createBudget com consume (teto por pessoa, dia de Sao Paulo) e consumeProvider (contador por provedor, dia UTC), ambos por transacao em aiUsage"
  - "server/src/ai/cache.js: createCache com lookup revalidado, store, coalesce e cacheKeyOf (sha256 cortado em 40), aiCache com Map na frente"
  - "speech.js com cache, teto e coalescencia; generate devolve { text, source: 'cache' | 'ia' } ou { text: null }"
  - "providers.js: createChain aceita gate (freio por provedor) e expoe available(); config.js: providerCaps (AI_PROVIDER_CAP_*)"
affects: [07-13, 07-14, 07-16, 07-18]
tech-stack:
  added: []
  patterns:
    - "contador por transacao com maxAttempts 25 para aguentar contencao no ultimo lugar do teto"
    - "cache com variantes revalidadas pelo validador atual da fala; a reprovada sai do documento"
    - "erro do Firestore nunca chega a rota: teto fecha (ok false), cache vira miss, gravacao falha em silencio"
key-files:
  created:
    - server/src/ai/budget.js
    - server/src/ai/cache.js
    - server/test/_ai-memory-db.js
    - server/test/ai-budget.test.js
    - server/test/ai-cache.test.js
    - server/test/emu/ai-budget.test.js
  modified:
    - server/src/ai/speech.js
    - server/src/ai/providers.js
    - server/src/ai/config.js
    - server/src/ai/index.js
key-decisions:
  - "Ordem da fala: cache revalidado, depois teto da pessoa, depois cadeia, depois grava no cache; acerto de cache nunca consome teto e o cache serve mesmo com o teto esgotado"
  - "Com menos de AI_CACHE_VARIANTS variantes validas, um acerto tenta gerar mais uma se ainda ha teto; sem teto, serve a existente"
  - "A coalescencia envolve teto, cadeia e gravacao: 20 chamadas iguais gastam um lugar do teto e um fetch; quem entrou na geracao de outro revalida o texto com o proprio resumo"
  - "Teto da pessoa so e gasto quando ha chamada real possivel: sem provedor configurado ou com todos desligados/em pausa (chain.available()) nao consome"
  - "Freio por provedor sem teto proprio so conta e deixa passar mesmo se o banco falhar; com teto proprio o erro do banco fecha o provedor. Provedor negado pelo teto fica fora ate 00:00 UTC (como o 3036)"
  - "A chave leva cycleKey, tom, situacao, assunto, categoria (so em limite), faixa de 5 pontos do uso do limite em foco, ritmo e hash da loja (so lancamento e sync); 'acima do ritmo' nao tem vaga na lista de ritmos de 07-05 e cai no balde x"
  - "O acaso do sorteio e injetado: cache.js usa () => 0 por padrao e so o index.js passa Math.random"
  - "Documento de aiCache guarda ownerId, person, variants, lastText, expiresAt e updatedAt (TTL do Firestore pode ser ligado depois sobre expiresAt); entrada viva mantem o vencimento da criacao"
status: complete
commits: 3
plan_head_before: fa78bde52f82b9a768b16cca3edb5732e69cf6da
actuals:
  tokens: 17500
  tasks: 3
  commits: 3
---

# Phase 7 Plan 12: Cache e teto diario da fala por IA Summary

A fala por IA agora passa por um cache de ate 3 variantes por situacao (Map em processo na frente do Firestore, 24 horas, revalidado contra os numeros e a loja do resumo atual antes de servir), por um teto de 100 chamadas reais por pessoa por dia de Sao Paulo (transacao no Firestore, sobrevive a reinicio) e por um freio diario por provedor, sem nunca avisar o usuario: teto ou cota esgotados viram `text: null` e o app usa o banco de frases.

## O que foi feito

- **Task 1 (tracer, a05a33d9):** `budget.js` (`consume` em `aiUsage/{hid}__{person}__{dia SP}`, `consumeProvider` em `aiUsage/provider__{id}__{dia UTC}`), `cache.js` (sha256 de `hid|person|canonical`, 40 hex, `aiCache/{chave}`), `speech.js` com os fatos da chave (`canonicalKey`), lookup antes do teto, store depois da validacao e `text: null` quando o teto corta. `index.js` liga budget, cache e o gancho por provedor. Provado com Firestore em memoria (transacao otimista de verdade, `_ai-memory-db.js`) e no emulador: 1 geracao, 1 acerto sem contar, 1 corte pelo teto.
- **Task 2 (f7e96463):** o codigo de variantes, revalidacao, coalescencia e freio por provedor ja entrou na Task 1 (e uma peca so em `cache.js`, `budget.js` e `providers.js`); esta tarefa fecha com `ai-cache.test.js` (15 testes): K variantes sem repetir a ultima servida, TTL vencido, variante com numero velho descartada e removida do documento, variante que cita outra loja descartada, chave muda com a loja, 20 chamadas simultaneas com um fetch so, geracao fora do prazo da rota que ainda grava no cache, provedor no teto proprio pulado sem rede, cache servido com o teto esgotado.
- **Task 3 (0917e385):** `emu/ai-budget.test.js` ganhou os casos que so o banco real prova: 8 mais 22 chamadas simultaneas deixam passar exatamente 8; nova instancia de `createBudget` e de `createCache` continua o dia e respeita `expiresAt`; o teto vira as 00:00 de Sao Paulo (relogio 02:30 UTC) e o do provedor as 00:00 UTC; varredura de todos os documentos sem resumo, descricao, prompt, chave nem id de conta. Nenhum ajuste foi necessario no codigo.

## Verificacao

- `npm run test:core:tz`: 1084 passam nos dois fusos. `npm run test:server`: 289 passam, 0 falham (eram 259 com a Task 1, 211 no 07-09). `npm run test:emu`: 189 passam, 0 falham, incluindo os 8 de `emu/ai-budget.test.js`. `npm run test:static`: 737 passam, 0 falham. `npm run lint`: limpo. `npm run build`: ok.
- Durante o desenvolvimento rodei o emulador numa instancia propria (config no scratchpad, portas 18180 e 19199) porque outro executor segurava as portas padrao e o `resetEmulators` apagaria os dados dele; a rodada final oficial `npm run test:emu` passou normalmente.

## Deviations from Plan

- **[Rule 3 - organizacao] Codigo da Task 2 entrou no commit da Task 1.** `budget.js`, `cache.js` e `providers.js` sao modulos unicos que o tracer ja precisava por inteiro (o `index.js` liga `gate`, `config.js` traz `AI_PROVIDER_CAP_*`). Dividir por trecho deixaria o commit do tracer quebrado, entao a Task 2 ficou so com os testes.
- **[Rule 3 - bloqueio] `server/test/_ai-memory-db.js` (arquivo novo fora de `files_modified`).** O `_fake-firestore.js` da fase nao tem `runTransaction`, e os testes do teto precisam de transacao de verdade. Criei um banco em memoria proprio (versao por documento, refaz a transacao se alguem mexeu) em vez de mexer num arquivo compartilhado por outros planos.
- **[Rule 2 - correcao] `chain.available()` e a guarda de "sem provedor".** O plano manda contar so chamada real; sem isso, com todos os provedores em pausa ou nenhum configurado, cada fala gastaria um lugar do teto sem rede. `createChain` ganhou `available()` e `speech.js` nao consome quando nao ha chamada possivel. Residual conhecido: se todos os provedores baterem o teto proprio no Firestore, o lugar da pessoa daquela fala fica gasto (o provedor negado fica fora ate 00:00 UTC, entao e uma vez so por provedor).

## Known Stubs

Nenhum.

## Threat Flags

Nenhum alem do `<threat_model>`. Mitigados: T-07-46 (teto por pessoa, cache com variantes, coalescencia e freio por provedor), T-07-47 (toda variante revalidada com `validateSpeech` e os numeros e lojas do resumo atual antes de servir, a reprovada sai do documento), T-07-48 (teste do emulador varre `aiUsage` e `aiCache` atras de loja, descricao, prompt, chave de API e id de conta), T-07-49 (transacao com `maxAttempts` 25, provada com 30 chamadas simultaneas no emulador), T-07-SC (nenhum pacote, hash por `node:crypto`). Sem indice novo e sem mudanca em `firestore.rules`: as colecoes `aiUsage` e `aiCache` so o servidor (Admin SDK) usa.

## Contrato para os proximos planos

- **Configuracao (07-18, deploy):** `AI_DAILY_CAP_PER_USER` (padrao 100), `AI_CACHE_VARIANTS` (3), `AI_CACHE_TTL_HOURS` (24) e `AI_PROVIDER_CAP_CLOUDFLARE`, `AI_PROVIDER_CAP_GROQ`, `AI_PROVIDER_CAP_XAI` (ausente ou 0 = sem teto proprio, so o freio por 429). Sugestao de partida para o Cloudflare gratuito com o 70B: algo entre 150 e 250 chamadas por dia, conforme a medicao no script.
- **Colecoes novas do Firestore:** `aiUsage` e `aiCache`, sem regra de cliente (default-deny). `aiCache.expiresAt` e Timestamp, entao uma politica de TTL do Firestore pode ser ligada depois para limpar documentos velhos.
- **Resposta da fala:** `generate` devolve `source: 'cache' | 'ia'` alem de `text`; a rota continua respondendo so `{ text }`.

## Notas de execucao

- `commits: 3` e a contagem dos commits deste plano (`git log --grep "(07-12)"`). `rev-list` desde `plan_head_before` conta 12 porque os executores dos planos 07-10, 07-11, 07-13 e 07-14 comitaram em paralelo na mesma branch.
- Nenhum pacote instalado, nenhum `.env*` lido, sem push nem deploy. `.env.local` e `.planning/state.json` ficaram fora dos commits; ROADMAP.md, REQUIREMENTS.md e STATE.md nao foram tocados.

## Self-Check: PASSED

Arquivos conferidos: server/src/ai/{budget,cache,speech,providers,config,index}.js e server/test/{_ai-memory-db,ai-budget,ai-cache}.js e emu/ai-budget.test.js, todos presentes; commits a05a33d9, f7e96463 e 0917e385 presentes no historico.
