---
phase: 04-mascote-vint-m
plan: 18
subsystem: data
tags: [vintem, insights, firestore, rules, privacy, idempotent-write, deploy-gate]
requires: ["04-03", "04-14", "04-15"]
provides:
  - "toStoredInsight(insight) em shared/core/insights.js: documento so com ids, chaves, severidade e numeros, ou null"
  - "getVintemInsights(person, cycleKey) e saveVintemInsights(person, cycleKey, insights) em src/services/vintemInsights.service.ts"
  - "gravacao melhor esforco dos insights de severidade 2 ou 3 em useVintemInsights"
  - "colecao vintemInsights em clientCollections() de firestore.rules (publicada), em CLIENT_COLS da matriz e em COLLECTIONS da semente"
  - "suite persist em scripts/ux-audit/vintem-app/persist.mjs, test/static/phase4-persist.test.js e 04-18-DEPLOY-EVIDENCE.md"
affects: [07-ia]
status: complete
commits: 2
plan_head_before: 9cd501310b45fb6c3a188f02e8aca277d4ae873c
actuals:
  tokens: 7000
  tasks: 3
  commits: 2
tech-stack:
  added: []
  patterns:
    - "Projecao de lista fechada (toStoredInsight) como unica porta para o armazenamento; rotulo legivel nunca vai"
    - "setDoc por id deterministico, sem leitura previa: cria ou repete com o mesmo dono"
    - "Registro local de ids gravados por pessoa e ciclo (vintem:written:v1:) mais Set por pagina para nao repetir tentativa"
key-files:
  created:
    - src/services/vintemInsights.service.ts
    - scripts/ux-audit/vintem-app/persist.mjs
    - test/static/phase4-persist.test.js
    - .planning/phases/04-mascote-vint-m/04-18-DEPLOY-EVIDENCE.md
  modified:
    - shared/core/insights.js
    - shared/core/insights.test.js
    - src/hooks/useVintemInsights.ts
    - scripts/ux-audit/seed.mjs
    - test/static/owner-queries.test.js
    - test/static/phase4-insights.test.js
    - firestore.rules
    - test/rules/matrix.test.js
key-decisions:
  - "A pessoa do documento vem do prefixo do id, porque o contrato Insight v1 nao tem campo person"
  - "A metrica level entra na lista permitida (insight rhythm so tem ela); chave desconhecida ou valor nao inteiro devolve null"
  - "O id so entra no registro do aparelho depois de gravar com sucesso; um Set por pagina limita a uma tentativa por id por visita enquanto a regra nao esta publicada"
  - "A gravacao espera a linha de base (ready) para nao guardar insight transitorio"
requirements-completed: [MASC-04]
coverage:
  - id: D1
    description: "Insight de severidade 2 ou 3 vira documento minimo em vintemInsights, sem descricao, loja, categoria, pessoa, CPF, conta, cartao nem e-mail"
    requirement: "MASC-04"
    verification:
      - kind: unit
        ref: "shared/core/insights.test.js (toStoredInsight: campos fechados, varredura de privacidade, casos null, limites de evidencia)"
        status: pass
      - kind: e2e
        ref: "scripts/ux-audit/vintem-app/persist.mjs (documento delivery-heavy, so campos permitidos, sem loja, Pix nem 6 digitos)"
        status: pass
  - id: D2
    description: "Gravacao melhor esforco e idempotente: setDoc por id deterministico, cada id uma vez por aparelho e ciclo, falha nunca aparece na tela"
    requirement: "MASC-04"
    verification:
      - kind: e2e
        ref: "scripts/ux-audit/vintem-app/persist.mjs (segunda carga nao regrava; sem excecao nem console error)"
        status: pass
      - kind: static
        ref: "test/static/phase4-persist.test.js (efeito no hook, void, max 8 por chamada, try e catch sem console)"
        status: pass
      - kind: integration
        ref: "test/rules/matrix.test.js (setDoc repetido no mesmo id pelo mesmo dono passa)"
        status: pass
  - id: D3
    description: "Nenhum indice novo e escopo de dono em toda consulta: firestore.indexes.json segue com 19 indices"
    requirement: "MASC-04"
    verification:
      - kind: static
        ref: "test/static/phase4-persist.test.js (19 indices, sem indice de vintemInsights, so where de igualdade)"
        status: pass
      - kind: static
        ref: "test/static/owner-queries.test.js (12 services, ownerScope e ownerId nos dois metodos)"
        status: pass
  - id: D4
    description: "Regra da colecao publicada em producao com rollback registrado antes"
    requirement: "MASC-04"
    verification:
      - kind: integration
        ref: "npm run test:rules (13 de 13 no emulador, incluindo o teste de vintemInsights e a iteracao de documento inexistente)"
        status: pass
      - kind: manual
        ref: "04-18-DEPLOY-EVIDENCE.md (resposta literal do dono: released rules e Deploy complete)"
        status: pass
---

# Phase 4 Plan 18: Guardar insights do Vintem no Firestore Summary

**O Vintem grava os insights fortes (severidade 2 ou 3) em `vintemInsights` por `setDoc` de id deterministico, so com ids, chaves, tipo, severidade e numeros, escopado ao dono, sem indice novo e com a regra ja publicada em producao.**

## Performance

- **Duration:** cerca de 10 min de execucao mais o portao humano da publicacao
- **Tasks:** 3 (1 tracer, 1 auto, 1 checkpoint human-action)
- **Files:** 4 criados, 8 modificados

## Accomplishments

- `toStoredInsight`: lista fechada de campos (`id`, `v`, `person`, `type`, `severity`, `cycleKey`, `day`, `subjectKind`, `subjectKey`, `metrics`, `evidenceTxIds`, `evidenceDays`). O rotulo da loja nunca vai; a chave do sujeito precisa casar `[a-z0-9:_-]` sem 6 digitos seguidos; metricas so inteiras e conhecidas; evidencia limitada a 20 ids e 14 dias. Qualquer campo fora do formato devolve `null`.
- `vintemInsights.service.ts`: leitura so por igualdades (`ownerScope()`, pessoa, ciclo), ordenada no cliente, sem `orderBy`, `limit` nem `updateDoc`. Gravacao melhor esforco com ate 8 documentos por chamada, registro `vintem:written:v1:{pessoa}:{ciclo}` (maximo 100 ids) e ramo MOCK com substituicao por id.
- `useVintemInsights` grava em efeito, so com a linha de base resolvida, ciclo atual e fora do somente leitura, e so se houver insight de severidade 2 ou 3. Nada muda na tela se a gravacao falhar.
- `firestore.rules` lista `vintemInsights` em `clientCollections()` e nada mais; a excecao de documento inexistente segue so com `settings` e `limitAlerts`. A matriz ganhou o teste de criacao e repeticao pelo dono, leitura pela parceira, `ownerId` imutavel, criacao com dono alheio negada e consulta por igualdade (casal B, sem claim e anonimo negados).
- Publicacao: o dono rodou `firebase deploy --only firestore:rules --project financias-ratimbum` e confirmou "released rules" e "Deploy complete" (16 s, sem indices). Resposta literal na evidencia.

## Verificacao

- `npm run test:core:tz`: 667 testes em UTC e em Asia/Tokyo, 0 falhas.
- `npm run test:static`: 441 testes, 440 passam, 0 falhas (1 pulado ja existente).
- `npm run build` e `npm run lint`: limpos.
- `node scripts/ux-audit/vintem-app.mjs --only persist`: `FALHAS 0`.
- `npm run test:rules`: 13 de 13 no emulador (Java 21 vem do `scripts/dev-env.sh`). O dono nao rodou de novo no checkpoint.
- `git status --short firestore.rules` limpo: o publicado e o do repositorio.

Tracer gate: o `<verify>` da Task 1 passou de ponta a ponta antes da expansao.

## Task Commits

| Tarefa | Commit | Observacao |
|--------|--------|------------|
| 1 (tracer) | 75950d1d | toStoredInsight, servico, gravacao no hook, semente, suite persist, guardas |
| 2 | 0aa7f274 | regra, matriz, guarda phase4-persist e evidencia de publicacao |
| 3 (checkpoint) | n/a | publicacao feita pelo dono; resposta registrada na evidencia |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Guarda do 04-14 proibia servico no hook**
- **Found during:** Task 1
- **Issue:** `phase4-insights.test.js` ("os hooks nao leem nem gravam no Firestore") reprovava qualquer import de `@/services/` em `useVintemInsights`, mas o plano manda o hook chamar `saveVintemInsights`.
- **Fix:** excecao estreita so para `vintemInsights.service` em `useVintemInsights`; `useHomeVintem` continua sem servicos e os demais testes da guarda seguem iguais.
- **Files modified:** test/static/phase4-insights.test.js
- **Commit:** 75950d1d

**2. [Rule 2 - Critical] Metrica `level` na lista permitida**
- **Found during:** Task 1
- **Issue:** o insight `rhythm` (severidade ate 3) so tem a metrica `level`, fora da lista do plano; sem ela seria sempre descartado.
- **Fix:** `level` entra na lista fechada; chave desconhecida ou valor nao inteiro continua devolvendo `null`.
- **Files modified:** shared/core/insights.js
- **Commit:** 75950d1d

### Ajustes de ambiente e de escolha

- **Java existe neste ambiente:** o plano dizia que `npm run test:rules` nao rodava aqui; com `scripts/dev-env.sh` (JRE 21) ele rodou, 13 de 13. O item manual ficou coberto.
- A suite `persist` reaproveita `extraStorage` da suite `insights`, trocando os ids `ins-ifood-N` por `ins-ped-N`: os ids de lancamento vao como evidencia e a conferencia "sem nome de loja" olha o texto inteiro.
- Escolhas onde o plano deixava espaco: pessoa derivada do prefixo do id, `Set` por pagina contra tentativa repetida com a regra nao publicada, e espera da linha de base (`ready`) antes de gravar (ver `key-decisions`).

Fora isso, o plano foi executado como escrito.

## Auth Gates

Task 3 (`checkpoint:human-action`): a publicacao das regras usa a credencial do dono; o agente nao faz `firebase login` nem `firebase deploy`. O dono executou o comando e devolveu "✔ firestore: released rules firestore.rules to cloud.firestore" e "✔ Deploy complete!" (firebase-tools 15.9.1, 16 s, compilacao das regras OK, sem indices). Fluxo normal, nao desvio. Nenhuma credencial registrada.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. Mitigacoes: T-04-18-01 (so `toStoredInsight` monta o documento; varredura de privacidade e suite lendo o armazenamento), T-04-18-02 (`ownerId: ownerId()` na gravacao, `ownerScope()` na consulta, `ownerId` imutavel nas regras, casal B negado na matriz), T-04-18-03 (guarda `owner-queries` descobriu o servico novo, 12 services), T-04-18-04 (ate 8 gravacoes por chamada, cada id uma vez por aparelho e ciclo, nenhuma leitura de insight na Home), T-04-18-05 (portao local, rollback registrado antes, deploy so de `firestore:rules` com `--project`). T-04-18-06 aceito (gravacao melhor esforco por desenho).

## Pendente (humano)

- Nenhum item bloqueante. Opcional: conferir no Console do Firebase que `vintemInsights` recebe documentos depois de uma visita real a Home com insight forte (so ids, chaves e numeros).
- A Fase 7 le a colecao por igualdades (dono, pessoa, ciclo); nenhuma consulta precisa de indice.

## Notas do ambiente

As edicoes nao commitadas do dono (ArcGauge, VintemSlot, Vintem, VintemTestPage, home.mjs, phase4-home, phase3-home-components, milestone.lock e state.json) ficaram intactas e fora dos commits (stage por arquivo). `commits: 2` e a medida do ledger (`git rev-list --count` da base ate HEAD); o commit final de documentacao e separado.

## Self-Check: PASSED

- FOUND: src/services/vintemInsights.service.ts, scripts/ux-audit/vintem-app/persist.mjs, test/static/phase4-persist.test.js, .planning/phases/04-mascote-vint-m/04-18-DEPLOY-EVIDENCE.md
- FOUND commits: 75950d1d, 0aa7f274
