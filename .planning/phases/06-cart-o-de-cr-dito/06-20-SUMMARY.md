---
phase: 06-cart-o-de-cr-dito
plan: 20
subsystem: cartao-de-credito
tags: [auditoria, layout, tema, chrome, cdp, semente-sintetica, ramo-mock]
status: complete

requires:
  - phase: 06-16
    provides: "dock de 9 destinos provado em Chrome"
  - phase: 06-17
    provides: "folha de lancamento com o chip Cartao e o CardPicker"
provides:
  - "ramo MOCK de subscribeCards, subscribeCardSettings, saveCardSettings e getCardTransactions"
  - "semente cards do auditor (dois cartoes sinteticos, configuracao e compras com todas as marcas)"
  - "/cartoes em ALL_ROUTES de audit.mjs e na tela cartoes de theme.mjs; theme.mjs semeia com buildSeed('cards')"
  - "assert launch-card em audit.mjs (folha de lancamento com chip Cartao e dois cartoes)"
affects: [06-15, 06-14]

actuals:
  tokens: 6800
  tasks: 3
  commits: 4

commits: 4
plan_head_before: 7985d80d91e62c2e73e3ac838400bbb77d8f4f50

tech-stack:
  added: []
  patterns:
    - "o assert da folha usa a mesma regra de recorte do auditor principal: quem mora em carrossel overflow-x nao conta como vazamento"

key-files:
  created:
    - test/static/phase6-audit.test.js
  modified:
    - src/services/cards.service.ts
    - scripts/ux-audit/seed.mjs
    - scripts/ux-audit/audit.mjs
    - scripts/ux-audit/theme.mjs

key-decisions:
  - "Nenhuma violacao acusada: nenhum arquivo de interface do cartao foi alterado e nenhuma regra ou excecao do auditor mudou"
  - "launch-card mede altura minima de 44px (como o plano pede) e usa o recorte overflow-x do auditor principal para o carrossel de categorias"

requirements-completed: []  # CENT-03 e CARD-02 seguem Pending: faltam o UAT do 06-15 e os dados reais do cartao

coverage:
  - id: D1
    description: "As telas do cartao passam sem rolagem horizontal e sem alvo abaixo de 44px a 360x640 e 390x844"
    requirement: "CENT-03"
    verification:
      - kind: browser
        ref: "node scripts/ux-audit/audit.mjs --routes all --seed cards --assert dock-peek (20 combinacoes, 0 violacoes)"
        status: pass
    human_judgment: false
  - id: D2
    description: "/cartoes e as telas que mostram o cartao passam nos dois temas sem violacao de contraste nem bloco claro no escuro"
    requirement: "CENT-03"
    verification:
      - kind: browser
        ref: "node scripts/ux-audit/theme.mjs --audit --route cartoes | / | /transacoes | /calendario | /configuracoes (FALHAS 0 em todas)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Folha de lancamento com chip Cartao e dois cartoes cabe em 360px, alvos de 44px, botao ao alcance, troca de cartao atualiza a escolha"
    requirement: "CARD-02"
    verification:
      - kind: browser
        ref: "node scripts/ux-audit/audit.mjs --route / --seed cards --viewport 360x640 --viewport 390x844 --assert launch-card (0 violacoes)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Ramo MOCK e semente sinteticos, sem tocar o Firestore e sem numero do dono"
    requirement: "CARD-02"
    verification:
      - kind: unit
        ref: "node --test test/static/phase6-audit.test.js (16 de 16)"
        status: pass
    human_judgment: false

duration: "cerca de 20min nesta sessao (retomada: os 3 primeiros commits e os passos 1 a 3 da tarefa 2 vinham de uma execucao anterior)"
completed: 2026-11-25
---

# Phase 6 Plan 20: Auditoria em Chrome das telas do cartao Summary

**As telas do cartao, o dock de 9 destinos e a folha de lancamento com o chip Cartao e dois cartoes passaram nos auditores de layout e de tema em Chrome real, nos dois tamanhos e nos dois temas, com zero violacoes e sem nenhuma correcao na interface.**

## Chrome rodou

Chrome headless (`/usr/bin/google-chrome`) e Vite em modo MOCK, so em 127.0.0.1, via `. ./scripts/dev-env.sh`. Nenhuma requisicao externa, nenhum `.env*` lido, nenhum dado real, nenhuma publicacao.

## Tarefas e commits

| Tarefa | Commits | O que entrega |
| ------ | ------- | ------------- |
| 1. Ramo MOCK e semente | `04776769` (test), `6699eea3` (feat) | MOCK nas quatro funcoes de `cards.service.ts`; semente `cards` em `seed.mjs` |
| 2. /cartoes nos auditores | `8651ec84` | `/cartoes` em `ALL_ROUTES`, `--seed cards`, tela `cartoes` em `theme.mjs`; auditoria rodada nesta sessao |
| 3. Folha de lancamento | `86016a4c` | assert `launch-card` e as guardas estaticas dele |

## Lista inicial de violacoes (antes de qualquer correcao)

**Nenhuma.** A primeira rodada ja saiu limpa, entao nao houve correcao na interface do cartao (`src/components/cards/*`, `CardsPage`, `LaunchSheet`, `CardPicker` etc. nao foram tocados).

| Auditoria | Resultado |
| --------- | --------- |
| `audit.mjs --routes all --seed cards --assert dock-peek` | 10 rotas x 2 tamanhos = 20 combinacoes, 0 violacoes (rolagem horizontal, alvo menor que 44px, texto menor que 12px); dock com 9 destinos e o link Cartoes a 360x640 em todas as rotas |
| `theme.mjs --audit --route cartoes` | 4 combinacoes (claro e escuro, 360x640 e 390x844), `FALHAS 0`; 21 controles interativos e 131 pares de contraste medidos |
| `theme.mjs --audit --route /` | 8 combinacoes, `FALHAS 0` (casa a Home e a tela de falha, ambas em `/`) |
| `theme.mjs --audit --route /transacoes` | 4 combinacoes, `FALHAS 0` |
| `theme.mjs --audit --route /calendario` | 4 combinacoes, `FALHAS 0` (excecao existente `controle-desabilitado`, nao criada aqui) |
| `theme.mjs --audit --route /configuracoes` | 24 combinacoes, `FALHAS 0` (a rota tambem casa login e onboarding) |
| `audit.mjs --route / --seed cards --viewport 360x640 --viewport 390x844 --assert launch-card` | 0 violacoes nos dois tamanhos |

### Folha de lancamento (launch-card)

- Dois cartoes sinteticos aparecem ("Principal" e "Reserva para as viagens"); o primeiro vem escolhido e, ao tocar o segundo, a escolha troca.
- Sem rolagem horizontal da folha nem do documento; nenhum alvo com menos de 44px de altura.
- O botao "Lancar gasto" fica ao alcance: a 360x640 so depois de rolar o contêiner da folha (`overflow-y: auto` do Sheet, `max-h-92dvh`), ficando em 575,8 a 623,8 de 640 (48px de altura); a 390x844 tambem precisa rolar e fica em 771,1 a 827,1 de 844. Isso e o que o plano previa ("com a rolagem do Sheet").
- Teste negativo: com `--seed full` (sem cartao) o assert acusa `chip "Cartão" ausente ou desabilitado` e sai com codigo 1, entao ele nao passa em branco.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Falso positivo da medicao do proprio assert launch-card**
- **Found during:** Tarefa 3, primeira rodada
- **Issue:** a primeira versao acusava 8 a 9 controles "fora da largura da tela": eram os chips de categoria, que moram num carrossel com rolagem horizontal propria e intencional.
- **Fix:** a medicao passou a usar a mesma regra do auditor principal (quem esta num ancestral `overflow-x` auto, scroll, hidden ou clip nao conta), sem contar o proprio dialog, cujo `overflow-y: auto` faz o `overflow-x` computar auto. A checagem de `scrollWidth` da folha e do documento segue valendo e o teste negativo acima prova que o assert ainda falha.
- **Files modified:** `scripts/ux-audit/audit.mjs`
- **Commit:** `86016a4c`

**2. [Aviso] O ledger de commits do plano nao existia**
- A execucao anterior nao criou `gsd-plan-head-before-06-20`. A base foi reconstruida como o pai do primeiro commit do plano (`7985d80d`); `commits: 4` e a contagem medida desde ela. O commit de docs deste SUMMARY nao entra na contagem.

**Fora do plano, nao feito:** nao houve mudanca em regra do auditor, excecao nova, pacote novo nem alteracao no caminho do Firestore.

## Verificacao executada

| Comando | Resultado |
| ------- | --------- |
| `node --test test/static/phase6-audit.test.js` | 16 de 16 |
| `node --test test/static/phase5-darkaudit.test.js test/static/phase4-persist.test.js` | 23 de 23 |
| `npm run test:static` | 679 passam, 0 falham |
| `npm run build` | ok |
| `npm run lint` | ok |

## Limites desta prova

- E Chrome headless com o app em MOCK e dados sinteticos: prova layout, alvos e contraste, nao o comportamento com os dados reais do cartao. O UAT do 06-15 segue necessario, em especial a folha de lancamento em aparelho real.
- `cards.service.ts` so tem o ramo MOCK testado por guarda estatica e pelo auditor; o caminho do Firestore nao mudou e nao foi exercitado.
- CENT-03 e CARD-02 nao foram marcados como cumpridos: dependem do UAT do 06-15 e dos testes de emulador pendentes (06-08 e 06-19).

## Known Stubs

Nenhum. A semente `cards` e dado sintetico de auditoria e nao entra no app.

## Threat Flags

Nenhum. T-06-66 (numero real na semente) e T-06-67 (MOCK em producao) seguem mitigados pela guarda estatica de `phase6-audit.test.js`, que confere a ausencia de numeros do dono e a dependencia da constante `MOCK`.

## Self-Check: PASSED
