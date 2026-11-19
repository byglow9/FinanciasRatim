---
phase: 04-mascote-vint-m
plan: 05
subsystem: shared-core
tags: [vintem, model, springs, blink, gaze, reactions, reduced-motion, node-test]
requires: ["04-01"]
provides:
  - "World (t, add, remove, later, step), VintemModel (setState, setTurn, react, touch, gazeTo, update, snapPose, isSettled, destroy, effState, pose), POSE_KEYS, ACCESSORY_KEYS, REACTION_KINDS em shared/core/vintemModel.js"
  - "tipos JSDoc VintemPose, Pointer, HostRect"
affects: [04-09, 04-13]
status: complete
commits: 3
plan_head_before: 8071914d81f18548ab81ad7e0e3a417fe1c1e86f
actuals:
  tokens: 14800
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "Modelo puro + desenhista: o desenho so le model.pose (mesmo objeto, escrito a cada update)"
    - "Tempo so por World.t e acaso so por rand injetado; observador opcional onEvent para os testes medirem sem estado de producao"
    - "Reacao com token por instancia: toda entrada de world.later confere o token e o dono vivo"
key-files:
  created:
    - shared/core/vintemModel.js
    - shared/core/vintemModel.test.js
  modified: []
key-decisions:
  - "isSettled() olha as molas de expressao, os acessorios, turn, wake, droop e a ausencia de reacao; as molas ambientes (respiracao, olhar, orelha, rabo) so entram com movimento reduzido, porque em movimento normal nunca assentam"
  - "A postura vertical (py) vem do estado de fundo: o estado forcado de uma reacao (surpreso, py -3) so troca a expressao, entao toda reacao termina com |py| < 2 e a pose reduzida nao tem py"
  - "Piscar dupla: o intervalo de 140 a 200 ms conta do fim da primeira piscada (a espera so corre depois dos 360 ms), como no sketch"
  - "Bronca: amplitude da tremida cai 0,675 por passo (8 a 2,6) em vez dos 0,6 do sketch, para cumprir o UI-SPEC"
requirements-completed: [MASC-02, MASC-03]
coverage:
  - id: D1
    description: "Modelo do Vintem (molas por parametro, alvos por estado, respiracao 2% a 7%, volume preservado < 8%) roda em Node com relogio simulado e rand injetado"
    requirement: "MASC-02"
    verification:
      - kind: unit
        ref: "shared/core/vintemModel.test.js#neutro respira 20 s com meia amplitude de sy entre 0,018 e 0,07 e volume preservado"
        status: pass
      - kind: unit
        ref: "shared/core/vintemModel.test.js#volume sx*sy desvia menos de 8% em spend, festa, susto, bronca e trocas de estado"
        status: pass
    human_judgment: false
  - id: D2
    description: "Piscar por palpebra (2 a 6 s, dupla em 5% a 25%, extras em troca de estado, sacada grande e wake) e fase da respiracao independente (R < 0,3)"
    requirement: "MASC-02"
    verification:
      - kind: unit
        ref: "shared/core/vintemModel.test.js#piscar: esperas de 2 a 6 s e dupla em 5% a 25% das agendadas em 6 sementes"
        status: pass
      - kind: unit
        ref: "shared/core/vintemModel.test.js#fase da respiracao independe do piscar: concentracao R menor que 0,3"
        status: pass
    human_judgment: false
  - id: D3
    description: "Olhar: sacadas de 200 a 600 ms (120 a 300 ms seguindo), transicao de 45 a 85 ms sem overshoot, pupila presa (norma <= 1), mouse fica e toque expira em 1,2 s"
    requirement: "MASC-02"
    verification:
      - kind: unit
        ref: "shared/core/vintemModel.test.js#sacada leva 45 a 85 ms para chegar a 90% sem overshoot"
        status: pass
      - kind: unit
        ref: "shared/core/vintemModel.test.js#ponteiro de toque expira em 1,2 s e o olhar volta a deriva"
        status: pass
    human_judgment: false
  - id: D4
    description: "Movimento reduzido: param respiracao, piscar, deriva, seguir, tique, rabo, queda e giro; expressoes mudam sem overshoot; reacoes viram pose estatica de 1,3 s sem salto, tremida nem moeda"
    requirement: "MASC-03"
    verification:
      - kind: unit
        ref: "shared/core/vintemModel.test.js#movimento reduzido: 30 s sem respiracao, piscar, deriva, seguir, tique, rabo nem queda"
        status: pass
      - kind: unit
        ref: "shared/core/vintemModel.test.js#movimento reduzido: cada reacao vira pose estatica de 1,3 s sem salto, tremida nem moeda"
        status: pass
    human_judgment: false
  - id: D5
    description: "Reacoes spend, susto, bronca, festa e wake terminam em repouso, reacao nova cancela a anterior por token, moeda so em spend e festa, destroy invalida a fila"
    requirement: "MASC-02"
    verification:
      - kind: unit
        ref: "npm run test:core:tz (UTC e Asia/Tokyo, 648 testes em cada)"
        status: pass
    human_judgment: false
---

# Phase 4 Plan 05: Modelo puro do Vintem Summary

Modelo do Vintem portado do sketch 020 para o nucleo como `VintemModel` e `World` de tempo simulado: molas por parametro, alvos por estado, respiracao, piscar por palpebra, sacadas do olhar, seguir mouse e toque, giro de lado, acessorios e as cinco reacoes, tudo determinista em Node, sem DOM, e com movimento reduzido de verdade.

## Accomplishments

- `World` com `t`, `add`, `remove`, `later` ordenado (empate pela insercao) e `step` que limita `dt` a 1/30 s; entradas pendentes de modelo destruido ou removido viram nada.
- `VintemModel` com uma mola `pp` por chave de `STATE_KEYS`, molas de corpo (`body`, `pos`, `rot`, `head`, `look`, `ear`, `tail`, `turn`, `wake`, `droop`) e `pose` com o contrato do plano. Volume preservado: `sx = 1 / sy`, desvio medido abaixo de 8% em repouso, gasto, festa, susto, bronca e trocas, a 60 e a 120 quadros por segundo.
- Piscar por palpebra: espera de 2 a 6 s, dupla em 1 de 8, extra em troca de estado, sacada grande (> 0,55 e > 0,6 s) e wake; so `pose.blink` muda (`ew` e `eh` ficam parados). Fase da respiracao independente (R < 0,3 em 6 sementes de 900 s).
- Olhar: deriva com vies de +0,15 em x no neutro e 40% da amplitude no sonolento, `gazeTo`, mouse que fica e toque que expira em 1,2 s, cabeca seguindo o centro do olhar, tique de orelha, rabo, queda do sonolento em 3 etapas e tranco aos 9,4 s.
- Reacoes com token por instancia, moeda do gasto (gravidade 900) e moedinhas da festa (gravidade 1500, ate 8), giro por mola `turn`, acessorios com `popIn` e `popOut` e `accPhase`.
- Movimento reduzido: param todos os efeitos ambientes, as expressoes continuam mudando em amortecimento critico (overshoot medido < 0,01) e as reacoes viram pose estatica de 1,3 s.

## Task Commits

1. Task 1 (tracer): `1efbfbed` feat(04-05): World e modelo minimo do Vintem com respiracao e troca de estado
2. Task 2: `785043e2` feat(04-05): piscar por palpebra, olhar, ponteiro, sonolento e movimento reduzido
3. Task 3: `9763b00b` feat(04-05): reacoes, giro de lado, acessorios, moedas e ciclo de vida do Vintem

Tracer gate: o `<verify>` da Task 1 (modelo + purity) foi reexecutado de ponta a ponta antes da expansao e passou (104 testes). Os executores 04-06, 04-07 e 04-08 commitaram em paralelo na mesma arvore, entao `plan_head_before` e o pai do meu primeiro commit e `commits: 3` e a contagem dos commits `(04-05)`, nao um `rev-list` bruto ate o HEAD.

## Verification

- `. ./scripts/dev-env.sh && node --test shared/core/vintemModel.test.js shared/core/purity.test.js`: verde (31 testes do modelo mais a guarda de pureza).
- `npm run test:core:tz`: exit 0 em UTC e em Asia/Tokyo (648 testes cada).
- `tsc --noEmit -p tsconfig.app.json`: nenhum erro em `vintemModel.js` (o modulo tem `// @ts-check` e entra no `include` de `shared`).
- `npm run test:rules` nao roda (sem Java); nao e exigido por este plano.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Estado forcado de reacao deslocava o corpo (py -3 do surpreso)**
- **Found during:** Task 3 (teste de repouso apos reacao)
- **Issue:** em `susto` e `wake` o estado forcado `surpreso` tem `py -3`; no fim da reacao o corpo ainda estava em cerca de -2,9, acima do limite `|py| < 2` do criterio de aceitacao, e a pose reduzida ganhava um `py` que nao e salto nenhum do roteiro.
- **Fix:** a postura vertical (`py`) vem do estado de fundo; o estado forcado so troca a expressao. `surpreso` como estado de fundo continua com `py -3`.
- **Files modified:** shared/core/vintemModel.js
- **Commit:** 9763b00b

### Decisions that interpret the plan

- **Spend nao forca `feliz` em movimento normal.** A acao da Task 3 cita "spend feliz" entre os estados a forca, mas o UI-SPEC (tabela "Reacoes") e o sketch nao forcam estado no `spend`, e olhos em arco esconderiam o olhar para cima e o "engole". Em movimento reduzido o `spend` usa `feliz`, como o UI-SPEC manda.
- **Bronca:** a tremida cai 0,675 por passo (8 a 2,6) porque o UI-SPEC diz "8 caindo para 2,6"; o sketch usava 0,6 (8 a 3,2).
- **Piscada dupla:** os 140 a 200 ms contam do fim da primeira piscada, como no sketch (a espera so corre depois dos 360 ms).
- **`isSettled()`** ignora as molas ambientes em movimento normal (ver key-decisions), senao o criterio "assenta em 3 s depois de `setState('triste')`" seria impossivel com a respiracao ligada.
- **Extras no contrato da pose:** `coins[i].o` (opacidade, 0 a 1) alem de `x`, `y`, `a` (giro em radianos), `coin.rot` e o giro da moeda; `pose.head` e a queda do sonolento (graus) e `rot` e o corpo seguindo o olhar mais as reacoes; `wake` e `droop` entram em `pose.e.cvL` e `cvR`.
- **Observador `onEvent`:** opcional no construtor, usado so pelos testes para medir esperas, sacadas, tiques e quedas sem guardar historico em producao.

**Total deviations:** 1 auto-fixed (1 bug). **Impact:** nenhum no contrato; o 04-09 le `pose` como descrito.

## Known Stubs

None.

## Threat Flags

None. Modulo puro, sem DOM, rede ou entrada de usuario alem de coordenadas numericas injetadas por funcao. Mitigados: T-04-05-01 (`World.step` e `update` limitam `dt` a 1/30 s, molas em subpassos, teste com `step(1000)` e `update(1e9)`), T-04-05-02 (token por reacao e `destroy()`/`remove()` invalidam a fila, teste de cancelamento e de fila vazia), T-04-05-03 (toda pose passa por `Number.isFinite`; teste de pose finita em todos os quadros das sequencias).

## Issues Encountered

None.

## Self-Check: PASSED

- FOUND: shared/core/vintemModel.js, shared/core/vintemModel.test.js
- FOUND commits: 1efbfbed, 785043e2, 9763b00b
