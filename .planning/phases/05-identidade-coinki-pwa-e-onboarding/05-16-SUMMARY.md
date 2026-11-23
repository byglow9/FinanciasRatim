---
phase: 05-identidade-coinki-pwa-e-onboarding
plan: 16
subsystem: ui
tags: [tema, dark-mode, auditoria, cdp, contraste, sobreposicoes, dock]
status: complete

requires:
  - phase: 05-identidade-coinki-pwa-e-onboarding
    provides: "tokens dos dois temas (05-03), auditor de tema e seletor (05-06), auditoria das rotas (05-15)"
provides:
  - "scripts/ux-audit/theme.mjs --overlays: 14 sobreposicoes abertas por clique real em MOCK, 2 temas x 2 tamanhos, cinco verificacoes mais a da veladura preta, uma captura por sobreposicao e tema"
  - "OVERLAY_LIST nomeada no auditor e guarda em test/static/phase5-darkaudit.test.js"
  - "dock do tema claro igual a acao (#2f6f3e), decisao P-01 do dono, com piso por tema do par botao + / dock"
affects: [05-20 fechamento de IDEN-05 e IDEN-06, 05-17 a 05-19]

actuals:
  tokens: 6760
  tasks: 3
  commits: 2
plan_head_before: b19a68069386bb4e93e9be0e6434369c1061fe0e

tech-stack:
  added: []
  patterns:
    - "pageAudit aceita rootExpr e veilSel: mede so a sobreposicao aberta e confere que a veladura e preta e translucida"
    - "Piso de contraste por tema: o minimo de um par de PAIRS pode ser { light, dark }, hoje so no par botao + / dock"

key-files:
  created: []
  modified:
    - scripts/ux-audit/theme.mjs
    - test/static/phase5-darkaudit.test.js
    - src/components/ui/select.tsx
    - src/components/layout/AlertsBell.tsx
    - src/index.css
    - test/static/helpers/palette.js
    - test/static/palette-contrast.test.js
    - test/static/phase5-tokens.test.js

key-decisions:
  - "P-01 resolvida como igualar: dock do claro igual a acao (#2f6f3e); piso do par botao + / dock no claro 1,69 (escuro segue 2,2)"
  - "Texto verde sobre painel escuro usa text-ok-ink; text-primary fica so para superficie"

patterns-established:
  - "Sobreposicao nova entra em OVERLAY_LIST com root, veil e open; a guarda estatica exige os tres"

requirements-completed: []

coverage:
  - id: D1
    description: "Lancador com teclado, folha da linha, confirmacao de apagar, Select aberto, folhas de evento e de nota, editor de categoria, seletor de icone, dialogo, paineis do sino, do ciclo e do perfil, toast e toast do Vintem legiveis nos dois temas"
    requirement: "IDEN-06"
    verification:
      - kind: e2e
        ref: "node scripts/ux-audit/theme.mjs --overlays (Chrome CDP, 56 combinacoes): FALHAS 0"
        status: pass
      - kind: unit
        ref: "node --test test/static/phase5-darkaudit.test.js (17 testes)"
        status: pass
  - id: D2
    description: "Veladura do dialogo e dos sheets continua preta nos dois temas; widget do Pluggy segue como excecao de terceiro (P-09)"
    requirement: "IDEN-06"
    verification:
      - kind: e2e
        ref: "--overlays confere veladura rgb(0,0,0) com alfa >= 0,2 em todas as sobreposicoes com veu (0,35 nos sheets, 0,8 no dialogo)"
        status: pass
  - id: D3
    description: "Dock do tema claro na cor decidida pelo dono (P-01), com auditoria e suite estatica verdes"
    requirement: "IDEN-05"
    verification:
      - kind: unit
        ref: "node --test palette-contrast.test.js phase5-tokens.test.js; npm run test:static (575 testes, 573 pass, 0 falhas)"
        status: pass
      - kind: e2e
        ref: "--audit (72 combinacoes) e --overlays (56) com FALHAS 0 apos a troca da dock"
        status: pass
  - id: D4
    description: "Julgamento visual das sobreposicoes no escuro e do preenchimento automatico do navegador pelo dono"
    requirement: "IDEN-06"
    verification:
      - kind: manual_procedural
        ref: "abrir .planning/phases/05-identidade-coinki-pwa-e-onboarding/captures/ (sobreposicao-*.png, 28 PNG) no UAT; autofill nao e provocavel em Chrome sem janela"
        status: unknown

duration: 75min
completed: 2026-11-23
---

# Phase 5 Plan 16: Sobreposicoes no escuro e decisao da dock Summary

O auditor ganhou o modo `--overlays` (14 sobreposicoes, 56 combinacoes, `FALHAS 0`), duas falhas reais de contraste do escuro foram corrigidas por token, e a dock do tema claro passou a ser igual a acao (#2f6f3e) por decisao do dono (P-01).

## Accomplishments

- **Auditor de sobreposicoes (Task 1).** `OVERLAY_LIST` abre cada item por interacao real em MOCK: lancador com categoria marcada e tecla digitada, acoes da linha, confirmacao de apagar, Select aberto (dentro da folha de edicao), folhas de evento e de nota, editor de categoria, seletor de icone, dialogo, paineis do sino, do ciclo e do menu de perfil, toast comum e toast do Vintem (disparado por um lancamento de gasto fora da Home). `pageAudit` ganhou `rootExpr` (mede so a sobreposicao) e `veilSel` (veladura preta e translucida). Cada combinacao tem uma nova tentativa se a abertura perder a corrida com a carga do mock.
- **Defeitos achados e corrigidos por token.** Opcao marcada do `Select` no escuro: contraste 3,13 (minimo 4,5). "Marcar todos como lidos" do sino no escuro: 3,45. Causa: `text-primary` (#2c7f4b, verde de superficie) sobre `bg-popover` escuro. Troca por `text-ok-ink` (#8fd9a3 no escuro, #2e6a34 no claro) em `src/components/ui/select.tsx` e `src/components/layout/AlertsBell.tsx`. Nenhum hex, nenhum piso baixou.
- **Dock (Tasks 2 e 3).** Resposta do dono a P-01, repassada pelo orquestrador: "quero o verde mais claro mesmo". Interpretada como **igualar**. `--color-dock` e `--color-dock-active-fg` do claro viraram `#2f6f3e` em `src/index.css`; o escuro nao mudou (dock ja era igual a acao, par botao + / dock mede 3,15 e segue com piso 2,2).

## Decisao P-01 (registro literal)

> "quero o verde mais claro mesmo"

Dada depois de ver as capturas lado a lado (`captures/p01-*-manter-claro*.png` e `p01-*-igualar-claro*.png`) e a evidencia: razao botao + / dock 1,69 contra 2,23 mantendo, dock sobre o fundo 5,17 contra 6,82. O orquestrador traduziu a resposta como `igualar` (o verde mais claro e o `#2f6f3e` dos botoes de acao). A resposta chegou pelo orquestrador, nao diretamente pelo executor.

## Task Commits

1. Task 1: auditor de sobreposicoes e correcao do texto verde em painel escuro - `392323c4`
2. Task 2: checkpoint de decisao P-01, sem commit (resolvida pelo dono)
3. Task 3: dock do claro igual a acao e piso por tema do par - `da949547`

## Arquivos de `src` tocados fora de `files_modified` (apontados pela auditoria)

| Arquivo | Mudanca |
|---------|---------|
| `src/components/ui/select.tsx` | opcao marcada `text-primary` para `text-ok-ink` |
| `src/components/layout/AlertsBell.tsx` | "Marcar todos como lidos" `text-primary` para `text-ok-ink` |

## Sobreposicoes: alcance e limites

- **Dialog (`ui/dialog.tsx`) sem consumidor no app.** Nenhuma tela o usa, entao nao existe gatilho real em MOCK. O auditor o monta a partir do modulo real servido pelo Vite e do React ja carregado pela pagina (`mountDialogHarness`), com os botoes do `Button` do app. A confirmacao em duas etapas do `RowActionsSheet` ("Apagar") cobre o caso de confirmacao real do usuario.
- **Preenchimento automatico do navegador.** Nao e provocavel em Chrome sem janela; depende de `color-scheme: dark`, ja ativo no `.dark`. Fica no UAT sobre as capturas.
- **Widget do Pluggy Connect.** Continua exceção de terceiro (P-09); nao ha janela dele nas sobreposicoes, entao a excecao nao acionou.
- Capturas: 28 PNG `sobreposicao-<id>-<tema>.png` a 390x844, ignoradas pelo git.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug do plano] Piso de 1,7 reprova a razao medida de 1,692**
- **Found during:** Task 3
- **Issue:** o plano e o UI-SPEC mandam o piso do claro em 1,7 citando razao medida 1,69, mas 1,692 e menor que 1,7; o teste de paleta reprovava com o piso literal de 1,7.
- **Fix:** piso do par no claro em **1,69** (o 1,7 do UI-SPEC e arredondamento). E o valor medido e o que o dono viu na evidencia; nao afrouxa nada alem da decisao dele.
- **Files modified:** `test/static/helpers/palette.js`, `test/static/palette-contrast.test.js`, comentario em `src/index.css`
- **Commit:** `da949547`

**2. [Interpretacao] Onde mora a asserção "dock diferente de ação"**
- O plano a coloca em `phase5-tokens.test.js`; ela estava em `palette-contrast.test.js` (e o piso de 2,2 tambem). Ajustei onde ela vive, com a decisao numa constante `P01_DECISION`, e acrescentei em `phase5-tokens.test.js` um teste de dock igual a acao nos dois temas e de piso 2,2 no escuro.

**3. [Acrescimo] Confirmacao de apagar, nova tentativa por combinacao e `floorOf`**
- A confirmacao do `RowActionsSheet` entrou na lista (alem das 13 do UI-SPEC) e a abertura tem uma nova tentativa porque uma execucao isolada perdeu a corrida com o sino. `floorOf` existe porque `PAIRS` precisava de piso por tema.

**Total deviations:** 3, nenhuma muda escopo nem arquitetura.

## Issues Encountered

- Uma execucao do auditor acusou o painel do sino como "sumiu antes da medicao"; tres reexecucoes isoladas e duas rodadas completas passaram. Nenhum efeito do `AlertsBell` fecha o painel sozinho; tratado como corrida do auditor.
- `.planning/milestone.lock` e `.planning/state.json` seguem modificados por outro processo; nao foram staged nem revertidos. Os arquivos de icone do 05-13 nao foram tocados.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. T-05-16-01 (sobreposicao ilegivel no escuro) mitigada pelo `--overlays`; T-05-16-02 (piso afrouxado) so no par e no tema autorizados pelo dono, travado por teste que exige que seja o unico par com piso por tema; T-05-16-03 (capturas no git) capturas em diretorio ignorado.

## Verification

`node scripts/ux-audit/theme.mjs --audit` (72 combinacoes) e `--overlays` (56) com `FALHAS 0` apos a troca da dock, `npm run test:static` (575 testes, 573 pass, 0 falhas), `build` e `lint` verdes. `requirements mark-complete` NAO foi executado: IDEN-05 e IDEN-06 fecham no 05-20.

## Self-Check: PASSED

- Arquivos: scripts/ux-audit/theme.mjs, test/static/phase5-darkaudit.test.js, src/components/ui/select.tsx, src/components/layout/AlertsBell.tsx, src/index.css, test/static/helpers/palette.js, test/static/palette-contrast.test.js, test/static/phase5-tokens.test.js existem.
- Commits `392323c4` e `da949547` existem no historico.
