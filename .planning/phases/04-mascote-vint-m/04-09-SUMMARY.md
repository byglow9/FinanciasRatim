---
phase: 04-mascote-vint-m
plan: 09
subsystem: ui
tags: [vintem, svg, raf, intersection-observer, reduced-motion, springs, profile-flip, static-guard]
requires: ["04-01", "04-05"]
provides:
  - "bloco .vt em src/index.css com as 18 variaveis --vintem-* derivadas de var(--color-action)"
  - "VIEWBOX, GROUND, FRONT, EYE, PROFILE, FLIP, ACCESSORY_SHAPES, ACCESSORY_ANCHORS (front e profile), TEAR, COIN em src/lib/vintem/geometry.ts"
  - "createVintemView, createDrawer, drawPose, VintemViewHandle em src/lib/vintem/view.ts"
  - "simWorld, registerInstance, getPointer, wake, setInstanceFollow em src/lib/vintem/world.ts"
  - "Vintem, VintemProps, VintemHandle, VintemState, VintemReaction, VINTEM_SIZES em src/components/vintem/Vintem.tsx"
  - "useReducedMotion em src/hooks/useReducedMotion.ts"
  - "test/static/phase4-engine.test.js (11 testes)"
affects: [04-10, 04-11, 04-12, 04-13]
status: complete
commits: 3
plan_head_before: 22cb781b5a15719260da576cc480b676f3e9d157
actuals:
  tokens: 12600
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "Arte em JSX com ids por instancia (prefixo de useId sanitizado) e escrita por quadro so por setAttribute com cache do ultimo valor"
    - "Um laco rAF global: instancias visiveis avancam; fora da tela so continuam ate assentar; dorme em movimento reduzido assentado"
    - "Giro por fusao cruzada com elipse de corpo comum por baixo (elipse da frente interpolada para a do perfil)"
key-files:
  created:
    - src/lib/vintem/geometry.ts
    - src/lib/vintem/view.ts
    - src/lib/vintem/world.ts
    - src/components/vintem/Vintem.tsx
    - src/hooks/useReducedMotion.ts
    - test/static/phase4-engine.test.js
  modified:
    - src/index.css
key-decisions:
  - "O ly do estado (pupila desce no triste e no sonolento, sobe no atento) e somado ao olhar na pupila; o sketch o alvejava mas nunca o lia"
  - "Perfil a 95% (nao 92%) e corpo comum com dip de 4% e ry em T^3: unico jeito de a area minima do giro passar de 70% (mediu 0,75 a 0,80)"
  - "Instancia fora da tela so sai do mundo quando model.isSettled(); uma reacao em curso termina fora da tela e nao deixa override pendurado"
  - ".vt precisa estar no elemento do SVG ou num ancestral; --vintem-balloon e --vintem-balloon-fg so resolvem dentro de um .vt"
requirements-completed: [MASC-01, MASC-02, MASC-03, MASC-07]
coverage:
  - id: D1
    description: "Neutro vivo no token de acao, rosto assimetrico, respiracao e piscar por um unico laco"
    requirement: "MASC-01"
    verification:
      - kind: static
        ref: "test/static/phase4-engine.test.js#o bloco .vt de index.css deriva o corpo do token de acao e fica fora de @theme e de :root"
        status: pass
      - kind: static
        ref: "test/static/phase4-engine.test.js#o laco unico para fora da tela e com a aba oculta, e tem um unico ouvinte de pointermove"
        status: pass
    human_judgment: true
  - id: D2
    description: "Sete estados com expressao, acessorios com contorno, moeda so nas reacoes e leitura de movimento reduzido assinada a mudancas"
    requirement: "MASC-02"
    verification:
      - kind: static
        ref: "test/static/phase4-engine.test.js#as partes de D-04 existem em grupos de id, sem boca e sem patas na frente"
        status: pass
    human_judgment: true
  - id: D3
    description: "Giro de lado em perfil sem colapso: largura minima 0,82 e area minima 0,75 da frente em 21 angulos e 7 estados, sem tocar a borda, uma massa conexa"
    requirement: "MASC-07"
    verification:
      - kind: manual
        ref: "medicao por canvas em Chrome headless (harness fora do repo) sobre o SVG vivo a 240x200"
        status: pass
    human_judgment: true
  - id: D4
    description: "SVG decorativo, sem HTML bruto, sem cor literal, sem acaso nativo, ids unicos por instancia"
    requirement: "MASC-03"
    verification:
      - kind: static
        ref: "npm run test:static (368 testes, 0 falhas)"
        status: pass
---

# Phase 4 Plan 09: Vintem no navegador Summary

O Vintem passou a existir como componente React: porquinho-cofre original em SVG feito em JSX, corpo no token de acao (oliva), sete estados com acessorios, moeda so nas reacoes, giro de lado em perfil que nao colapsa e um unico laco requestAnimationFrame para todas as instancias.

## Accomplishments

- **Paleta**: bloco `.vt` em `src/index.css` (fora de `@theme` e de `:root`) com `--vintem-body: var(--color-action)`; focinho, pata de la e tinta saem de `color-mix` sobre a acao; sobrancelha no creme da paleta; tokens proprios de pelicula, lagrima, suor, raiva, brilho, exclamacao, Zzz e moeda com os contornos de contraste do UI-SPEC. Hex so no CSS.
- **Laco unico** (`world.ts`): `simWorld`, `IntersectionObserver` (margem 48 px, `snapPose()` ao voltar depois de 1,5 s), pausa com `document.hidden`, dt limitado a 1/30 s, um unico `pointermove` passivo mais um `pointerdown` passivo, registrados so enquanto houver instancia que segue. Dorme quando todas as visiveis estao em movimento reduzido e assentadas.
- **Desenhista** (`view.ts`): le `model.pose` e escreve atributos com cache (nunca NaN ou infinito); olhos em camadas (esclera, pelicula, pupila presa com brilho, palpebra de cima por `cvL`/`cvR` com inclinacao, palpebra de baixo, cobertura do piscar, arco do feliz), sobrancelhas, orelhas, paralaxe do rosto, sombra, acessorios, lagrima em ciclo de 2,8 s, moeda recortada na fenda e ate 8 moedinhas.
- **Componente** (`Vintem.tsx`): props `state`, `size` (84x70, 48x40, 120x100, 240x200), `follow`, `decorative`, `reduced` (vale mais que a midia) e `ref` com `react`, `touch`, `setTurn`. Montagem em `useLayoutEffect` com limpeza simetrica; StrictMode verificado (ids sem duplicata, olhar segue o ponteiro, nenhum NaN).
- **Perfil e giro**: corpo comprido, cabeca, focinho, uma orelha, um olho, quatro patas (duas escuras do lado de la), rabinho preso ao corpo, tudo do rosto recortado pela silhueta; frente de 1 a 0,5 e perfil de 0,5 a 1 com fusao cruzada entre T 0,42 e 0,58 sobre uma elipse de corpo comum; acessorios somem na primeira metade e voltam reancorados ao perfil.
- **Guarda estatica**: `phase4-engine.test.js` com 11 testes (cor literal, HTML bruto, aria e ids por `useId`, rAF so em `world.ts`, ouvinte unico de `pointermove`, acaso nativo, `.vt` e o verde antigo, partes de D-04, giro e moeda, escala tipografica).

## Task Commits

1. Task 1 (tracer): `41c88c8a` feat(04-09): neutro vivo do Vintem no token de acao com laco rAF unico
2. Task 2: `5c2dab25` feat(04-09): estados, acessorios, moeda e leitura de movimento reduzido do Vintem
3. Task 3: `c0e6dd22` feat(04-09): giro de lado em perfil sem colapso e guarda estatica do motor

Tracer gate: o `<verify>` da Task 1 (build, lint, palette-contrast) foi reexecutado de ponta a ponta antes da expansao e passou; alem disso o neutro foi renderizado em Chrome, comparado com o sketch 020 variante B e visto animando (transform da raiz muda, sem NaN).

## Verification

- `npm run build`, `npm run lint`: verdes.
- `npm run test:static`: 368 testes, 0 falhas (inclui `phase4-engine.test.js` com 11 e `palette-contrast.test.js`).
- `npm run test:core`: 648 testes, 0 falhas.
- `npm run test:rules` nao roda (sem Java); nao e exigido por este plano.
- Capturas e medicoes por um harness fora do repo (esbuild + Chrome headless por CDP, no scratchpad; nao commitado): 7 estados, 9 angulos do giro, perfil dos seis estados com acessorio, reacoes spend, festa e bronca aos 420 ms, StrictMode, seguir ponteiro.
- Medicao do giro sobre o SVG vivo a 240x200, 7 estados x 21 angulos: largura minima **0,82** da frente (piso 0,50), area minima **0,75** (piso 0,70), nenhuma massa toca a borda, sempre uma massa conexa; pixels do acessorio em T=1: lagrima 93, raiva 226, suor 194 (piso 12).

## Avaliacao honesta do desenho (olhei cada captura)

Funciona e esta fiel ao sketch 020 B (comparei lado a lado):
- Corpo segue o token de acao (oliva); o neutro e assimetrico (pálpebra esquerda baixa, sobrancelha direita alta) e le como esperto; feliz, bravo, sonolento, surpreso e atento leem bem; lagrima e suor aparecem de perfil e o perfil e um cofrinho de verdade (patas, rabinho em espiral, focinho, orelha).
- O giro nao colapsa; a sequencia de T 0,5 a 1 le como o porquinho virando.

Ainda esta fraco, e o 04-13 precisa olhar:
1. **Triste**: o corpo continua largo e baixo e as orelhas ainda parecem abas pequenas saindo dos lados. Nao e mais um disco com asas, mas a altura da silhueta (orelhas incluidas) e **85%** da do neutro, abaixo do piso de 92% do UI-SPEC. So o corpo da 93%. Dobrar as orelhas (que e a correcao 2) derruba o topo da silhueta, entao ou o criterio mede o corpo, ou os valores de `STATE_PARAMS.triste` mudam; nao dava para cumprir os dois aqui.
2. **Neutro**: a assimetria e sutil; a palpebra esquerda baixa vira um corte escuro reto. Funciona, mas se o dono achar sem graca, o ajuste e em `cvL` e `ba` (plano 01).
3. **Meio do giro (T 0,45 a 0,58)**: as duas faces aparecem a 50% sobre a elipse do corpo e o quadro fica enlameado; dura cerca de 0,1 s. Nao vi em movimento real, so em quadros isolados.
4. O oliva e escuro: fenda, narinas e focinho tem pouco contraste com o corpo (de proposito no UI-SPEC), e o Zzz cinza quase se confunde com o focinho (conferi por diferenca de pixels, nao por cor).
5. Nao medi a distincao por pares (21 pares a 84 e 48 px) nem o controle negativo do neutro; isso e do 04-13.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Contorno da palpebra do neutro virava uma mancha translucida**
- **Found during:** Task 1 (captura do neutro)
- **Issue:** a linha da palpebra tinha opacidade `cv*5`; com `cvR .06` ficava a 30% e aparecia como um crescente cinza no topo do olho direito.
- **Fix:** rampa `cv*14` (linha nitida assim que a palpebra cobre algo).
- **Files modified:** src/lib/vintem/view.ts
- **Commit:** 41c88c8a

**2. [Rule 1 - Bug] Lagrima nascia por cima da pupila na pose estatica**
- **Found during:** Task 2 (captura do triste com movimento reduzido, fase fixa 0,3)
- **Issue:** com `dy -3` a gota ficava sobre o olho.
- **Fix:** `TEAR.dy = 4`: a gota pende logo abaixo do olho e cai dai.
- **Files modified:** src/lib/vintem/geometry.ts
- **Commit:** 5c2dab25

**3. [Rule 1 - Bug] Area do giro caia a 65% da frente (piso 70%)**
- **Found during:** Task 3 (medicao em 21 angulos)
- **Issue:** perfil a 92% e corpo comum estreitando 12% deixavam a area minima em 0,63 a 0,67.
- **Fix:** perfil a 95% (P-14 permite ajustar), `coreDip` 0,04 e `ry` do corpo comum interpolado em T^3; area minima 0,75 e largura minima 0,82.
- **Files modified:** src/lib/vintem/geometry.ts, src/lib/vintem/view.ts
- **Commit:** c0e6dd22

### Decisions that interpret the plan

- **`ly` do estado e aplicado a pupila.** Na tabela dos estados `ly` desce a pupila (triste .7, sonolento .3) e sobe no atento, mas o sketch o alvejava sem nunca le-lo. Somei `e.ly` ao olhar vertical antes de prender a pupila.
- **`rt`** (cabeca tombada do triste) soma-se a rotacao da raiz junto com `pose.rot` e `pose.head`.
- **Brilho** gira 90 graus por ciclo (nao 30 graus por segundo): o brilho tem simetria de 90 graus, entao o ciclo e continuo no salto da fase.
- **Instancia fora da tela** so sai do mundo quando `model.isSettled()`; assim uma reacao em curso termina e nao deixa override pendurado (a fila do mundo descarta entradas de modelo removido).
- **Handle estendido**: `VintemViewHandle` tambem expoe `setFollow` e `model` (leitura da pose para testes e capturas); `world.ts` exporta `wake` e `setInstanceFollow`. O handle do componente continua `react`, `touch`, `setTurn`.
- **`decorative={false}`** envolve a arte num `span role="img"`; o SVG segue `aria-hidden="true"`.
- **Montagem em `useLayoutEffect`** (nao `useEffect`) para a primeira pose ser desenhada antes da pintura, sem piscada da arte sem posicao.

**Total deviations:** 3 auto-fixed (3 bugs). **Impact:** nenhum no contrato publico; os valores do perfil mudaram (95%).

## Known Stubs

None.

## Threat Flags

None. Mitigados: T-04-09-01 (arte em JSX, escrita por atributos, guarda estatica de HTML bruto), T-04-09-02 (observador de visibilidade, pausa com a aba oculta, dt limitado, sono em movimento reduzido assentado), T-04-09-03 (`destroy()` simetrico; os ouvintes do ponteiro saem quando nao ha instancia que segue; StrictMode verificado).

## Issues Encountered

Nenhum bloqueio. `npm run test:rules` nao pode rodar (sem Java), como previsto.

## Self-Check: PASSED

- FOUND: src/lib/vintem/geometry.ts, view.ts, world.ts; src/components/vintem/Vintem.tsx; src/hooks/useReducedMotion.ts; test/static/phase4-engine.test.js; bloco `.vt` em src/index.css
- FOUND commits: 41c88c8a, 5c2dab25, c0e6dd22
