---
phase: 07-push-e-vint-m-com-ia
plan: 05
subsystem: ai-safety-core
tags: [ia, privacidade, validacao, cache, nucleo-puro]
requires:
  - phase: 04
    provides: "merchantOf, BRAND_DICTIONARY e ESTABLISHMENT_TOKENS (insights.js); AI_TELLS, PROFANITY e FORBIDDEN_DATA (phraseRules.js); normalize (classify.js)"
provides:
  - "aiPrivacy.js: PERSON_LABEL, LABEL_MAX, isPersonTransfer, scrubText, safeLabel, merchantLabel e findLeaks"
  - "aiValidate.js: validateSpeech, extractNumbers, normalizeSpeech, DISCRIMINATION, EDGY_WORDS, RELATION_WORDS e LENGTH_LIMITS"
  - "aiCacheKey.js: bucket5, labelHash, canonicalKey e as listas fechadas de partes"
affects: [07-07, 07-12, 07-13, 07-18]
tech-stack:
  added: []
  patterns:
    - "o filtro de privacidade e em camadas e findLeaks e a defesa final sobre o texto que sai"
    - "a regua da saida da IA e propria (D-22) e nao reaproveita checkPhrase nem PERSONAL_ATTACK"
    - "a chave do cache so tem partes de listas fechadas, faixa de 5 pontos e hash do rotulo da loja"
key-files:
  created:
    - shared/core/aiPrivacy.js
    - shared/core/aiPrivacy.test.js
    - shared/core/aiValidate.js
    - shared/core/aiValidate.test.js
    - shared/core/aiCacheKey.js
    - shared/core/aiCacheKey.test.js
    - shared/core/aiPipeline.test.js
  modified: []
key-decisions:
  - "findLeaks procura 4 ou mais digitos seguidos so depois de mascarar valores em R$ e percentuais; o ano e a chave AAAA-MM acusam digitos, entao o resumo enviado nunca leva data completa"
  - "Do banco, a loja so vem de merchantOf (marca ou estabelecimento); o resto vira o nome da categoria. Marca do dicionario (inclusive 99) passa sem novo filtro"
  - "No modo estrito, a palavra em minusculas depois de para, pra ou com vira PERSON_LABEL junto com as palavras seguintes que nao sao comuns, parando numa palavra comum (no, na, em, casa, amigos...)"
  - "Motivo recusa vem antes de marca-ia, porque 'nao posso ajudar' tambem esta em AI_TELLS e o motivo mais util e recusa"
  - "A faixa final do bucket5 e 305 (tudo de 305% para cima); 300 a 304 ficam na faixa 300"
  - "O validador tira de 'dado-proibido' os valores em 'N reais' alem de R$ e percentual, para '1500 reais' cair em numero-inventado e nao em dado-proibido"
status: complete
commits: 3
plan_head_before: acb087e33d76391f44c53516e3beadedc5d090ea
actuals:
  tokens: 16700
  tasks: 3
  commits: 3
---

# Phase 7 Plan 05: Portoes de seguranca da IA (privacidade, regua da saida e chave do cache) Summary

Tres modulos puros do nucleo: o filtro que decide o que pode sair de casa (aiPrivacy), a regua propria que decide o que pode aparecer na tela (aiValidate, D-22) e a chave canonica do cache sem dado pessoal (aiCacheKey), provados sem rede por testes de propriedade e por um teste de pipeline que atravessa os tres.

## O que foi feito

- **Task 1 (tracer, 80e58ef9):** `aiPrivacy.js` com `isPersonTransfer`, `scrubText` (e-mail, URL, CPF, CNPJ, telefone, 4 ou mais digitos, nome proprio depois de preposicao, modo estrito para lancamento manual), `safeLabel` (24 caracteres, so letras, numeros, espaco e `& . ' -`), `merchantLabel` (pessoa, loja, categoria ou manual) e `findLeaks`. O teste usa uma bateria de 20 descricoes sujas do banco mais casos manuais.
- **Task 2 (4d193923):** `aiValidate.js` com `validateSpeech`, na ordem vazio, marcacao, emoji, travessao, recusa, marca-ia, idioma, tamanho, dado-proibido, parceiro, discriminacao, loja-errada, numero-inventado e manso; `extractNumbers` exportado para o 07-07 usar a mesma leitura. Palavrao e apelido como baleia passam; so a lista de ofensa discriminatoria (seis categorias, conservadora) bloqueia.
- **Task 3 (c46ef11f):** `aiCacheKey.js` (`bucket5`, `labelHash` FNV-1a de 32 bits, `canonicalKey` versao 1) e `aiPipeline.test.js`, que cobre privacidade, validacao e chave juntas.

## Resultados dos testes

- `TZ=UTC node --test` e `TZ=Asia/Tokyo node --test` nos quatro arquivos de teste novos e em `purity.test.js`: todos passam (aiPrivacy 21, aiValidate 24, aiCacheKey 9, aiPipeline 7 casos; purity sem falha).
- `npm run test:core:tz`: 1032 passam e 0 falham nos dois fusos.
- `tsc --noEmit -p tsconfig.app.json`: sem erro nos tres modulos novos (os arquivos de `shared` entram no build). `eslint` nos tres modulos: sem aviso.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Falso positivo de `digitos` em datas curtas**
- **Found during:** Task 1
- **Issue:** a primeira versao de `findLeaks` juntava digitos separados por `.`, `-` ou `/` antes de contar, e acusava `25/11` (data curta legitima do resumo).
- **Fix:** removida a junção; a regra e a do plano (4 ou mais digitos seguidos). CPF, CNPJ e telefone formatados continuam acusados pelos seus proprios codigos.
- **Files modified:** shared/core/aiPrivacy.js
- **Commit:** 80e58ef9

**2. [Rule 1 - Bug] Caracteres de controle e espacos exoticos gravados como literais no arquivo**
- **Found during:** Task 1 e Task 2
- **Issue:** escapes unicode de espaco sem quebra e de separador de linha dentro de regex foram gravados como caracteres literais, o que quebrou a sintaxe (`missing /`).
- **Fix:** `aiPrivacy.js` monta o conjunto com `String.fromCharCode`; `aiValidate.js` usa a forma `\u{...}` com a flag `u`. Os dois arquivos ficaram so com ASCII.
- **Commit:** 80e58ef9 e 4d193923

**3. [Rule 1 - Bug] Tipos implicitos no build**
- **Found during:** Task 2
- **Issue:** `tsc` acusou dois parametros sem tipo em `countSentences`.
- **Fix:** anotacao JSDoc.
- **Commit:** 4d193923

### Decisoes de detalhe fora do texto do plano

- O motivo `marca-ia` (demais marcas de AI_TELLS) foi nomeado por este plano; o texto so dizia para reaproveitar AI_TELLS.
- `recusa` e verificada antes de `marca-ia` (decisao registrada acima).
- Com `ctx.allowed` ausente, qualquer numero no texto reprova (conjuntos vazios); texto sem numero passa.

## Contrato para os proximos planos

- **07-07:** montar o bloco de resumo so com `merchantLabel(...).label`, totais formatados com `formatMoney`, percentuais e contagens; nunca ano, chave AAAA-MM nem data completa; rodar `findLeaks` no bloco inteiro antes de enviar. Calcular `ctx.allowed` com `extractNumbers` sobre o proprio bloco (valores em centavos sempre positivos; o validador le `-R$ 25` como 2500).
- **07-12:** a chave de `canonicalKey` e so a chave; aplicar sha256 no servidor e revalidar cada variante contra o resumo atual antes de servir.
- **07-13:** `partnerLabels` com os nomes das duas abas (a regra por palavra inteira reprova qualquer texto que contenha esse rotulo, inclusive "Ela" se a aba tiver esse nome).
- **07-18:** o dono revisa `DISCRIMINATION` (seis categorias) e `EDGY_WORDS` em `shared/core/aiValidate.js`.

## Risco residual registrado (T-07-16, aceito na D-20)

Nome de pessoa digitado em minusculas num lancamento manual fora dos padroes cobertos (para, pra, com seguidos do nome; nome com inicial maiuscula depois de preposicao) pode chegar ao provedor, por exemplo um sobrenome em minusculas depois de um nome em maiusculas ("com Carlos silva": o sobrenome sobra). Vai para o roteiro de UAT.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum: o plano so cria funcoes puras, sem endpoint, sem acesso a arquivo e sem mudanca de esquema.

## Notas de execucao

- `commits: 3` e a contagem dos commits deste plano (`git log --grep "(07-05)"`); `plan_head_before` e o HEAD no primeiro commit, e como outros executores da onda 1 comitam em paralelo na mesma branch, `rev-list` desde esse ponto contaria commits dos planos 07-01 a 07-04.
- Nenhum pacote instalado, nenhum `.env*` lido, sem push nem deploy.

## Self-Check: PASSED

Arquivos conferidos: aiPrivacy.js, aiPrivacy.test.js, aiValidate.js, aiValidate.test.js, aiCacheKey.js, aiCacheKey.test.js, aiPipeline.test.js, todos presentes em `shared/core/`; commits 80e58ef9, 4d193923 e c46ef11f presentes no historico.
