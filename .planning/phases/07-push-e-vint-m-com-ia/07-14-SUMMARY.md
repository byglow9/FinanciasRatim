---
phase: 07-push-e-vint-m-com-ia
plan: 14
subsystem: ai-speech-client
tags: [ia, cliente, vintem, fala, reserva-banco-de-frases]
requires:
  - phase: 07
    provides: "POST /api/vintem/fala com { text } validado ou null (07-09)"
provides:
  - "askVintem({ situation, categoryId, timeoutMs }): texto ou null, nunca lanca, so situacao e categoria no corpo"
  - "VintemContext.speakText e speakAi: fala da IA no balao com reserva imediata do banco de frases"
  - "deliver (reacao ao lancamento) tenta a IA com prazo de 2,5 s, no balao da Home e no toast fora dela"
  - "situacao limite para as tres situacoes de limite e sync para o gasto importado do banco"
affects: [07-16, 07-18]
tech-stack:
  added: []
  patterns:
    - "geracao de fala (speechGen) + escopo (rota e perfil) conferidos depois da espera: resposta atrasada e descartada"
    - "um unico pedido em voo (askInFlight); o seguinte cai direto no banco de frases"
    - "prazo da IA dentro do servico (AbortSignal.timeout mais corrida contra o prazo); o contexto nao usa temporizador"
key-files:
  created:
    - src/services/vintemSpeech.service.ts
    - test/static/phase7-speech-ui.test.js
  modified:
    - src/contexts/VintemContext.tsx
    - src/hooks/useHomeVintem.ts
key-decisions:
  - "O prazo da abertura e da sincronizacao e o padrao de speakAi (timeoutMs opcional): o hook useHomeVintem nao pode importar servico (guarda phase4-insights), entao nao importa ASK_TIMEOUT_OPEN_MS"
  - "askVintem so e chamado em askGuarded, usado por speakAi e por deliver; o portao canAsk (user.person igual a viewPerson e fora do somente leitura) e o do pedido em voo ficam no mesmo lugar"
  - "deliver virou async e nunca lanca; onGoal chama com void e segue sem IA (meta e porquinho continuam so do banco de frases)"
  - "resposta atrasada (outra geracao de fala ou outro escopo) e descartada inteira, inclusive a reserva, porque ja ha uma fala mais nova na tela"
  - "o anuncio na regiao viva so ocorre na primeira exibicao do mesmo texto da IA"
status: complete
commits: 3
plan_head_before: b4f85ac244ba684ec2d50c62d33b07df05c7f118
actuals:
  tokens: 7000
  tasks: 3
  commits: 3
---

# Phase 7 Plan 14: Cliente da fala por IA Summary

As reacoes a lancamento, a limite e ao fim de sincronizacao agora pedem a fala ao servidor (so situacao e categoria no corpo, com ID token) com prazo de cerca de 2,5 s, e mostram o texto da IA como texto React no balao da Home e no toast do OINC fora dela; sem resposta a tempo, o banco de frases fala como antes, sem erro visivel.

## O que foi feito

- **Task 1 (tracer, ff3c9b4c):** `vintemSpeech.service.ts` (`AbortSignal.timeout`, corrida contra o prazo cobrindo tambem o ID token, nulo em MOCK e sem URL, texto so se string nao vazia de ate 300 caracteres). `VintemContext` ganhou `canAsk`, `speakText`, `askGuarded`, `speakAi`; `deliver` anima na hora, pergunta a IA e entrega no balao (Home) ou no toast (fora), com a frase do banco como reserva. `onLaunched` manteve try, catch, o portao `view === null || view.isPast` e o `void` do chamador.
- **Task 2 (3d4f1a11):** `limite-atento`, `limite-perto` e `limite-estourou` pedem a situacao `limite`; `lancamento-ok` e `gasto-grande` seguem `lancamento`. No ramo do gasto importado de `useHomeVintem`, `speak` virou `void speakAi` com situacao `sync`, a categoria da chegada e a mesma reserva de antes. Toque e fala de entrada nao chamam a IA.
- **Task 3 (9dfc6cbd):** contador `speechGen` (sobe a cada fala mostrada, dispensada ou troca de escopo) e escopo conferidos antes de mostrar; um unico `askInFlight`; anuncio unico por texto; nenhuma excecao sai de `speakAi` ou `deliver`.

## Verificacao

- `node --test` das guardas novas e das da Fase 4 e 5 (phase7-speech-ui 11 testes, phase4-reactions, phase4-home, phase4-limits, phase4-insights, phase5-oinc-name): todas passam sem alteracao.
- `npm run test:core:tz`: 1084 passam nos dois fusos. `npm run lint`: limpo. `npm run build`: ok.
- `npm run test:static`: 725 passam, 1 falha: "servidor e nucleo compartilhado nao mencionam contas fixas" (arquivos de servidor de outro executor em andamento, fora dos meus `files_modified`; ver Deferred Issues).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Hook nao pode importar servico**
- **Found during:** Task 3 (rodando `test:static` completo)
- **Issue:** `useHomeVintem.ts` importava `ASK_TIMEOUT_OPEN_MS` do servico e a guarda `phase4-insights` ("os hooks nao leem nem gravam no Firestore") reprovou; o plano manda nao alterar guardas da Fase 4.
- **Fix:** `timeoutMs` virou opcional em `SpeakAiArgs.ai` e o padrao de `speakAi` e `ASK_TIMEOUT_OPEN_MS`; o hook nao passa prazo. Efeito igual ao do plano (4 s na sincronizacao).
- **Files modified:** src/hooks/useHomeVintem.ts, src/contexts/VintemContext.tsx, test/static/phase7-speech-ui.test.js
- **Commit:** 9dfc6cbd

## Deferred Issues

- `test:static` falha 1 teste de outro executor da onda 4 ("servidor e nucleo compartilhado nao mencionam contas fixas"). Um erro de lint em `QuietHoursFields.tsx` tambem apareceu no meio da execucao e sumiu antes do final; ambos fora do escopo deste plano.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum alem do `<threat_model>`. T-07-54 (corpo so com situation e categoryId, guarda estatica), T-07-55 (canAsk exige user.person igual a viewPerson e fora do somente leitura), T-07-56 (texto React, sem HTML bruto, guarda estatica) e T-07-57 (prazo no cliente, um pedido em voo, reserva imediata) mitigados.

## Notas de execucao

- `commits: 3` e a contagem dos commits deste plano (`git log --grep "(07-14)"`); `rev-list` desde `plan_head_before` conta 10 porque os executores paralelos 07-10 a 07-13 comitaram na mesma branch.
- `actuals.tokens` e chars/4 sobre o diff dos 4 arquivos (cerca de 27 mil caracteres).
- A frase do plano "so o servico vintemInsights grava" segue valida: o novo servico so faz POST ao servidor e nao toca o Firestore.
- Nenhum pacote instalado, nenhum `.env*` lido, sem push nem deploy. `.env.local` e `.planning/state.json` ficaram fora de todo commit. ROADMAP.md, REQUIREMENTS.md e STATE.md nao foram tocados.

## Self-Check: PASSED

Arquivos conferidos: src/services/vintemSpeech.service.ts, test/static/phase7-speech-ui.test.js, src/contexts/VintemContext.tsx e src/hooks/useHomeVintem.ts presentes; commits ff3c9b4c, 3d4f1a11 e 9dfc6cbd presentes no historico.
