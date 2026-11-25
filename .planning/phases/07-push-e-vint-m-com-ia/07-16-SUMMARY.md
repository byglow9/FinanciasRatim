---
phase: 07-push-e-vint-m-com-ia
plan: 16
subsystem: ai-speech-spontaneous
tags: [ia, fala-espontanea, vintem, hints, cliente, servidor]
requires:
  - phase: 07
    provides: "teto diario e cache da fala (07-12), resumo completo (07-13), cliente da fala por IA (07-14), config da IA (07-09)"
provides:
  - "server/src/ai/topics.js: pickTopic, dailyCapOf, hintsOf e a lista SPONTANEOUS (abertura, espiar)"
  - "budget.readDay e budget.commitSpontaneous: aiUsage do dia guarda abertura, espiar e assuntos, por transacao"
  - "GET /api/vintem/hints: peekMinMs, peekMaxMs, peekPerDay, openPerDay e reactionTimeoutMs"
  - "src/hooks/useVintemPeek.ts: espiada com aba visivel, usuario ativo, nada aberto e a propria pessoa"
  - "abertura do app com fala da IA (uma por carga) e getVintemHints/getReactionTimeoutMs no servico"
affects: [07-17, 07-18]
tech-stack:
  added: []
  patterns:
    - "fala espontanea so e contada quando ha texto para mostrar: prazo vencido ou conexao fechada pelo app nao consome"
    - "teste estatico que executa servico e hook TypeScript de verdade (transpileModule com React, fetch, documento e temporizadores falsos)"
key-files:
  created:
    - server/src/ai/topics.js
    - src/hooks/useVintemPeek.ts
  modified:
    - server/src/ai/budget.js
    - server/src/ai/speech.js
    - server/src/ai/routes.js
    - server/src/ai/index.js
    - server/test/ai-speech.test.js
    - server/test/ai-budget.test.js
    - server/test/emu/ai-budget.test.js
    - src/services/vintemSpeech.service.ts
    - src/contexts/VintemContext.tsx
    - src/hooks/useHomeVintem.ts
    - test/static/phase7-speech-ui.test.js
key-decisions:
  - "commitSpontaneous nega tambem assunto ja usado: de dois pedidos simultaneos pelo mesmo assunto so um e mostrado"
  - "Com gasto novo do banco para reagir na carga, a Home nao pede a abertura: a vez da IA e da reacao de sincronizacao (um pedido em voo so; sem isso a reacao do 07-14 cairia no banco de frases)"
  - "O prazo das reacoes e lido de forma sincrona (getReactionTimeoutMs): a reacao nunca espera a consulta dos hints; antes de eles chegarem vale 2500"
  - "So resposta boa dos hints fica guardada pela carga; falha ou falta de ID token tenta de novo depois"
  - "Espiada no balao da Home nao e anunciada na regiao viva (fala nao pedida, como a de entrada) e usa a reacao 'wake', a mais discreta"
  - "Assunto limites com limite estourado sai longo tambem na fala espontanea (D-15)"
requirements-completed: [IA-01, IA-04]
status: complete
commits: 5
plan_head_before: 5f2b1030f2b69713cb97679ffdbfa0e0a4fbfed4
metrics:
  duration: "cerca de 12 minutos (retomada apos a liberacao do limite de uso)"
  completed: 2026-11-25
actuals:
  tokens: 14400
  tasks: 3
  commits: 5
---

# Phase 7 Plan 16: Fala espontanea da IA Summary

O OINC agora abre o dia com um comentario da IA sobre o mes (uma pergunta por carga do app, ate 3 por dia, sem repetir assunto, com a frase do banco como reserva) e espia de vez em quando enquanto a pessoa usa o app (ate 6 por dia, so com texto da IA), com frequencias, tetos e prazo das reacoes definidos so na configuracao do servidor e entregues por GET /api/vintem/hints.

## O que foi feito

- **Task 1, tracer da abertura (00853709):** `topics.js` escolhe o assunto pelo `rankTopics`; `budget.js` le e grava o dia (`abertura`, `espiar`, `assuntos`) por transacao; `speech.js` confere o teto do tipo antes de ler dados ou chamar provedor e so conta quando ha texto; `useHomeVintem` pede a abertura com uma variavel de modulo. Gate do tracer: modo `end-of-phase` com verificacao automatizada, reexecutada e verde antes de seguir.
- **Task 2, espiada no servidor e hints (febd135d):** `GET /hints` atras do `requireOwner`; intervalo com piso de 60 s, maximo nunca abaixo do minimo e teto de 24 h; prazo das reacoes fora de 1500..4000 volta a 2500. A rota informa quando o app fechou a conexao, e a fala nao mostrada nao e contada.
- **Task 3, parte 1, prazo das reacoes (f24bfee5):** `getVintemHints` e `getReactionTimeoutMs` no servico; `deliver` passou a usar o valor dos hints no lugar da constante.
- **Task 3, parte 2, quem espia (4ec0dd84):** `useVintemPeek` montado no provedor; `espiar` mostra no balao da Home ou no toast ja aprovado (`VintemToast.tsx` nao foi alterado), confere de novo `isBusy` e a visibilidade depois da resposta, e nunca usa o banco de frases.
- **Prova no emulador (10485c74):** documento do dia com os campos novos, assuntos so de lista fechada, e pedidos paralelos respeitando o teto sem repetir assunto.

## Prazo das reacoes: cobertura de teste (lacuna do verificador de planos)

- Servidor (`ai-speech.test.js`): padrao 2500, 1500 e 4000 aceitos, fora da faixa e lixo voltam a 2500, valor devolvido por `GET /hints`.
- Cliente (`phase7-speech-ui.test.js`): o servico e executado de verdade; `getReactionTimeoutMs()` vale 2500 antes dos hints e sem servidor ou em MOCK, e 3300 depois de um `GET /hints` com 3300.
- Ligacao: `deliver` chama `askGuarded({ ...ai, timeoutMs: getReactionTimeoutMs() })`.
- Conferido por mutacao: com `getReactionTimeoutMs` ignorando os hints falham 3 testes; com prazo fixo no `deliver` falha 1.

## Verificacao

- `test:core:tz`: 1084 nos dois fusos. `test:server`: 383. `test:static`: 765. `lint` e `build`: limpos. `test:emu`: 197, 0 falhas. As contagens incluem testes que os executores paralelos (07-15 e 07-17) somaram.
- As portas padrao dos emuladores estavam ocupadas por outro executor; a rodada final usou uma instancia propria (config no scratchpad, portas 9299 e 8280), com as mesmas regras e indices.
- **Pendente para o dono (checagem humana da Task 3, fim da fase):** com o servidor de IA configurado, usar o app por alguns minutos e confirmar que o OINC espia de vez em quando, nunca com lancamento aberto nem com a aba escondida, sem repetir assunto no dia. A cadencia real nao foi medida; nada foi testado em aparelho ou navegador.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Bloqueio] `server/src/ai/index.js` fora de `files_modified`**
- A rota precisa da configuracao para responder os hints; mudou uma linha (`createAiRouter({ speech, config, ... })`). Commit febd135d.

**2. [Rule 1] Teste do emulador do 07-12 listava os campos antigos do `aiUsage`**
- O plano manda gravar `abertura`, `espiar` e `assuntos` no documento do dia, e `emu/ai-budget.test.js` exigia a lista anterior. Lista atualizada e um teste de concorrencia somado. Commit 10485c74.

**3. [Rule 2] Fala nao mostrada nao consome teto nem assunto**
- O prazo total da rota (6 s) passa do prazo do app (4 s), e a geracao continua depois da desistencia. `speech.generate` ganhou `gone` e deixa de contar com prazo vencido ou conexao fechada. Commits 00853709 e febd135d.

**4. [Rule 1] Abertura nao concorre com a reacao do gasto importado**
- Os dois efeitos da Home disparam na mesma carga e so ha um pedido a IA em voo; a abertura tiraria a fala da IA da reacao de sincronizacao. Com `bankArrival` presente, a entrada usa o banco. Commit 00853709.

**5. [Processo] Task 3 em dois commits** (prazo das reacoes separado da espiada, como sugerido pelo pedido), e a guarda estatica ja foi ajustada no commit da Task 1, porque a da 07-14 proibia a IA na fala de entrada.

## Limites conhecidos

- Se chegar uma reacao a lancamento enquanto uma abertura ou espiada esta em voo, a reacao usa o banco de frases e a resposta atrasada e descartada; o servidor ja tera contado aquele assunto.
- O mesmo vale se a pessoa trocar de tela ou abrir um lancamento durante a espera: nada aparece, mas a fala foi contada (o app nao avisa o servidor, so a conexao fechada e percebida).
- Esconder a aba zera o temporizador (como pede o plano): sessoes mais curtas que o intervalo minimo, 6 minutos no padrao, nao tem espiada.
- Se o gasto do banco nao gerar reacao (sem veredito), aquela carga fica sem fala de abertura da IA.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum alem do `<threat_model>`. A rota nova `GET /api/vintem/hints` esta prevista no registro, fica atras do `requireOwner` e devolve so numeros de configuracao. Mitigados: T-07-63 (tetos por tipo, assunto sem repeticao, cache, teto diario), T-07-64 (`canAsk` no hook e no `askGuarded`; pessoa e casal so do token), T-07-65 (`isBusy` antes de perguntar e antes de mostrar), T-07-66 (piso de 60 s e maximo nunca abaixo do minimo), T-07-SC (nenhum pacote).

## Contrato para os proximos planos

- **07-17 e 07-18 (calibragem e deploy):** `AI_REACTION_TIMEOUT_MS` (1500..4000, padrao 2500), `AI_OPEN_PER_DAY` (3), `AI_PEEK_PER_DAY` (6), `VINTEM_PEEK_MIN_MS` (360000) e `VINTEM_PEEK_MAX_MS` (900000), so no servidor; o app le na carga seguinte.
- Sem indice novo e sem mudanca em `firestore.rules`.

## Notas de execucao

- `commits: 5` e a contagem dos commits deste plano (`git log --grep "(07-16)"`). `rev-list` desde `plan_head_before` conta mais porque os executores do 07-15 e do 07-17 comitaram em paralelo na mesma branch.
- `actuals.tokens` e chars/4 sobre as linhas adicionadas e removidas dos 5 commits (cerca de 57,7 mil caracteres).
- Nenhum pacote instalado, nenhum `.env*` lido, sem push nem deploy. `.env.local` e `.planning/state.json` ficaram fora de todo commit. ROADMAP.md, REQUIREMENTS.md, STATE.md e WINDOWS.md nao foram tocados.

## Self-Check: PASSED

Arquivos conferidos: server/src/ai/topics.js e src/hooks/useVintemPeek.ts criados, os 11 modificados presentes nos commits; commits 00853709, febd135d, f24bfee5, 4ec0dd84 e 10485c74 presentes no historico; nenhuma delecao.
