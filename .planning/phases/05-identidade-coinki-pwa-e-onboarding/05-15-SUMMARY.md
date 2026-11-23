---
phase: 05-identidade-coinki-pwa-e-onboarding
plan: 15
subsystem: ui
tags: [tema, dark-mode, auditoria, cdp, contraste, recharts]
status: complete

requires:
  - phase: 05-identidade-coinki-pwa-e-onboarding
    provides: "tokens dos dois temas (05-03), auditor de tema e seletor (05-06), tela de falha e gancho __coincBootError (05-10), Login do Coinc (05-12), onboarding de 3 telas (05-14)"
provides:
  - "scripts/ux-audit/theme.mjs --audit: 18 telas x 2 temas x 2 tamanhos, cinco verificacoes, uma captura por tela e tema, linha final FALHAS n"
  - "scripts/ux-audit/theme.mjs --selftest: planta defeitos e prova que o auditor os acusa"
  - "test/static/phase5-darkaudit.test.js: guarda de cobertura do auditor, das excecoes com motivo, das capturas fora do git e da pizza"
  - "CategoryPieChart com as fatias separadas por var(--color-card)"
affects: [05-16 sobreposicoes e dock, 05-20 fechamento de IDEN-06]

actuals:
  tokens: 8500
  tasks: 2
  commits: 2
plan_head_before: bc497de6cd2dc0a302ec28b17dcfe5f56d539575

tech-stack:
  added: []
  patterns:
    - "Cores medidas no navegador por canvas 2D (resolve rgb, color-mix e oklab para sRGB) e compostas ancestral por ancestral com a opacidade"
    - "Excecoes do auditor em lista com id, verificacao, seletor e motivo, travada por guarda estatica"

key-files:
  created:
    - test/static/phase5-darkaudit.test.js
  modified:
    - scripts/ux-audit/theme.mjs
    - src/components/reports/CategoryPieChart.tsx
    - .gitignore

key-decisions:
  - "Contraste de texto usa o fundo composto incluindo o fundo do proprio elemento; texto de 28 px ou mais e icones Lucide pedem 3, o resto 4,5"
  - "SVG text (eixos do Recharts) mede o fill; elementos sobre background-image so entram em notas.onImage"
  - "Pizza: stroke var(--color-card) com strokeWidth 2 e paddingAngle 0, a separacao vem do traco e nao do vazio"

patterns-established:
  - "Todo auditor novo de tela traz --selftest com defeito plantado, para um FALHAS 0 nunca ser silencio do medidor"

requirements-completed: []

coverage:
  - id: D1
    description: "Todas as rotas e telas de entrada nos dois temas e tamanhos sem rolagem horizontal, contraste baixo, bloco claro no escuro, hex em src ou alvo menor que 43,5 px"
    requirement: "IDEN-06"
    verification:
      - kind: e2e
        ref: "node scripts/ux-audit/theme.mjs --audit (72 combinacoes, Chrome CDP): FALHAS 0"
        status: pass
      - kind: e2e
        ref: "node scripts/ux-audit/theme.mjs --selftest: bloco claro, texto sem contraste, alvo de 30 px e estouro de largura acusados"
        status: pass
  - id: D2
    description: "Fatias da pizza separadas pela cor do cartao, sem hex nos componentes de relatorio"
    requirement: "IDEN-06"
    verification:
      - kind: unit
        ref: "node --test test/static/phase5-darkaudit.test.js (10 testes)"
        status: pass
  - id: D3
    description: "Julgamento visual das capturas no escuro (post-its, mapa de calor, Vintem sobre o fundo verde, hierarquia) pelo dono"
    requirement: "IDEN-06"
    verification:
      - kind: manual
        ref: "human-check da Task 2: abrir .planning/phases/05-identidade-coinki-pwa-e-onboarding/captures/ (36 PNG)"
        status: pending

duration: 55min
completed: 2026-11-23
---

# Phase 5 Plan 15: Auditoria do tema escuro Summary

Auditor `theme.mjs --audit` mede 18 telas nos dois temas e nos dois tamanhos de celular com as cinco verificacoes do UI-SPEC S6, termina em `FALHAS 0`, e as fatias da pizza passam a ser separadas pela cor do cartao.

## Accomplishments

- **Auditor (Task 1, tracer).** `--audit` percorre `/`, `/transacoes`, `/calendario`, `/contas-fixas`, `/casal`, `/relatorios` (quatro abas), `/metas`, `/porquinho`, `/configuracoes`, `/vintem-teste`, Login, as tres telas do onboarding e a tela de falha (por `window.__coincBootError()`), a 360x640 e 390x844, com toque, forcando `coinc:tema:v1`. Por combinacao: uma linha JSON com a lista de violacoes, notas (elementos sobre imagem, excecoes acionadas) e a salvaguarda de que o tema pedido foi mesmo aplicado. Linha final `FALHAS n`; codigos 0, 1 e 2; flags `--route`, `--theme`, `--viewport`, `--report-only`.
- **Cinco verificacoes.** (a) rolagem horizontal no criterio da 3.1; (b) contraste de texto e de icones Lucide contra o fundo efetivo composto (4,5; 3 para 28 px ou mais e icones); (c) no escuro, bloco de 64x64 ou mais com luminancia acima de 0,5; (d) guarda de paleta (`palette-contrast.test.js`) como subprocesso; (e) alvo de toque abaixo de 43,5 px.
- **Capturas.** 36 PNG (18 telas x 2 temas, 390x844) em `.planning/phases/05-identidade-coinki-pwa-e-onboarding/captures/`, ignoradas pelo git. Observacao: a captura de pagina inteira mostra a dock fixa no meio da Home; e artefato do `captureBeyondViewport`, nao defeito do app.
- **`--selftest`.** Planta no escuro um bloco branco de 80x80, texto cinza sobre cinza, botao de 30x30 e um estouro de largura, e exige que o auditor acuse os quatro. Foi o que provou que o `FALHAS 0` nao e silencio do medidor.
- **Pizza (Task 2).** `CategoryPieChart`: `stroke="var(--color-card)"`, `strokeWidth={2}`, `paddingAngle={0}` (antes `stroke="none"` com folga de 2 graus). Conferido na captura do escuro: fatias separadas pela cor do cartao.
- **Guarda.** `phase5-darkaudit.test.js` (10 testes): telas e abas, dois temas e tamanhos, gancho de falha so em DEV, cinco verificacoes e limites, flags e codigos, excecoes com motivo, auditor so em 127.0.0.1 e sem ler `.env*`, `.gitignore` das capturas, pizza com o token e nenhum hex em `src/components/reports`.

## Lista inicial de violacoes (antes de corrigir)

A primeira passada real do auditor, ja com o calculo de fundo corrigido, deu **zero violacoes em 72 combinacoes** (uma rodada anterior acusou 3 falsos positivos de contraste 1:1 em `Home` claro, causados por o fundo do proprio botao nao entrar na composicao; corrigido no auditor antes do commit). Os tokens e componentes das ondas 1 a 5 ja saiam sem classe de cor fixa. O unico ajuste de `src` desta onda foi a pizza, que o plano mandava trocar de qualquer modo. Nenhum token de `index.css` precisou mudar e nenhum piso de contraste baixou.

## Task Commits

1. Task 1 (tracer): auditor de tema nos dois temas e tamanhos - `860da0ea`
2. Task 2: fatias da pizza separadas pela cor do cartao - `30293d56`

## Excecoes do auditor (cada uma com motivo no proprio script)

| Id | Verificacao | Motivo |
|----|-------------|--------|
| widget-pluggy | bloco claro | iframe de terceiros, nao segue o tema (P-09) |
| cor-de-categoria-de-evento | bloco claro | cor escolhida pelo usuario, so ponto com borda |
| balao-do-vintem | bloco claro | balao claro com texto escuro de proposito nos dois temas; o contraste dele e medido normalmente |
| controle-desabilitado | contraste | isento pela WCAG 1.4.3 (acionou 6 vezes no Calendario) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug do auditor] Fundo do proprio elemento fora da composicao**
- **Found during:** Task 1
- **Issue:** a primeira versao media o texto contra o fundo dos ancestrais, sem o do proprio elemento: "Marcar pago" (creme sobre verde) saia 1:1.
- **Fix:** o fundo efetivo inclui o elemento e a opacidade acumulada entra uma so vez.
- **Commit:** `860da0ea`

**2. [Acrescimo] Modo `--selftest` e salvaguarda de tema aplicado**
- Nao estava no plano. Entrou porque o resultado esperado era `FALHAS 0` e um auditor sem prova de sensibilidade nao distingue "tudo certo" de "nao mediu". Custo: cerca de 40 linhas. O `--selftest` roda a parte, nao entra no `--audit`.
- **Commit:** `860da0ea`

**3. [Interpretacao] Excecao de controle desabilitado e do balao do Vintem**
- O plano nomeia so Pluggy e cor de categoria de evento. O UI-SPEC manda o balao do Vintem claro nos dois temas e a WCAG isenta controles inativos; ambos entraram com motivo, e a guarda estatica exige motivo de qualquer excecao.

**Total deviations:** 3, nenhuma muda escopo nem arquitetura. Nenhum arquivo de `src` fora de `files_modified` foi tocado.

## Issues Encountered

- A pagina inteira capturada com `captureBeyondViewport` desenha elementos `fixed` (dock e botao +) no meio da pagina longa. Nao afeta as medidas, so as imagens para o dono.
- `.planning/milestone.lock` e `.planning/state.json` continuam modificados no working tree por outro processo; nao foram staged nem revertidos, como pedido.

## Known Stubs

Nenhum.

## Deferred Items

- **Fora do escopo deste plano (vai no 05-16):** sobreposicoes (LaunchSheet com teclado numerico, RowActionsSheet, EventSheet, CategoryEditorSheet, IconPicker, Dialog, paineis do sino, do ciclo e do perfil, lista do Select, Toast e VintemToast), estados de Home dependentes de dados (por exemplo `LimitAlertNotice` e `StaleNotice` so aparecem conforme o seed) e a decisao da dock (P-01). O auditor ja tem a base (`pageAudit`, excecoes, `prepareScreen`) para receber esses cenarios.
- **Human-check da Task 2** (julgamento do dono sobre post-its, mapa de calor, Vintem sobre o fundo verde e hierarquia visual) fica para o UAT, sobre as 36 capturas.
- `requirements mark-complete` NAO foi executado: IDEN-06 (e IDEN-05) fecham no 05-20, por orientacao do orquestrador.
- Estimativa do plano: 130k tokens contra 8,5k medidos (chars/4 do diff). A estimativa foi alta porque previa correcoes por token que a auditoria nao encontrou.

## Threat Flags

Nenhum. T-05-15-01 a T-05-15-04 cobertos: auditoria por rota, tema e tamanho; capturas em diretorio ignorado (verificado por `git status` e pela guarda); excecoes so com motivo e guardadas estaticamente; auditor so em 127.0.0.1, MOCK, sem `.env*` nem rede externa (guarda estatica).

## Verification

`node scripts/ux-audit/theme.mjs --audit` (72 combinacoes, `FALHAS 0`), `--selftest` (`FALHAS 0`), `npm run test:static` (567 testes, 565 pass, 0 falhas), `palette-contrast` e `phase5-tokens` verdes, `npm run build` e `npm run lint` verdes.

## Self-Check: PASSED

- Arquivos: scripts/ux-audit/theme.mjs, test/static/phase5-darkaudit.test.js, src/components/reports/CategoryPieChart.tsx existem; 36 capturas existem fora do git.
- Commits `860da0ea` e `30293d56` existem no historico.
