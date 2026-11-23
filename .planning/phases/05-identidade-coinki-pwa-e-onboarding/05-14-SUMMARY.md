---
phase: 05-identidade-coinki-pwa-e-onboarding
plan: 14
subsystem: ui
tags: [onboarding, vintem, portao, localStorage, replay, acessibilidade, cdp]
status: complete

requires:
  - phase: 05-identidade-coinki-pwa-e-onboarding
    provides: "05-11 InstallSteps e AppCard; 05-12 marca de sessao do aviso de endereco novo (legacyOrigin)"
provides:
  - "src/lib/onboarding.ts: readOnboardingSeen() (armazenamento lancando conta como visto) e markOnboardingSeen() sobre coinc:onboarding:v1"
  - "src/components/onboarding/Onboarding.tsx: props mode first|replay e onFinish, tres telas, Vintem unico e calado"
  - "ProtectedRoute: portao carregando, onboarding, <LoginForm /> literal, app; marca gravada em silencio com sessao"
  - "AppCard: linha Rever a apresentacao (modo replay)"
  - "src/index.css: anim-onboarding-in (200 ms) com variante de fade de 100 ms no movimento reduzido"
  - "test/static/phase5-onboarding.test.js (15 testes) e scripts/ux-audit/onboarding.mjs (porta 5193, 228 verificacoes)"
affects: [05-20 fechamento de IDEN-08 e IDEN-03 e UAT em aparelho (P-02, P-03, P-10)]

actuals:
  tokens: 14700
  tasks: 2
  commits: 3
plan_head_before: 5f00a512e36a44693f2edf5889a03bad3cc61889

tech-stack:
  added: []
  patterns:
    - "Portao no ProtectedRoute lendo o armazenamento a cada render e um estado local `dismissed`, para a falha de gravacao nunca prender o usuario no onboarding"
    - "Replay em portal no body com foco preso, Esc, travamento da rolagem e devolucao do foco no cleanup do efeito"
    - "Sentido da animacao por variavel CSS (--onboarding-shift) no elemento com key de tela, sem classes por direcao"

key-files:
  created:
    - src/lib/onboarding.ts
    - src/components/onboarding/Onboarding.tsx
    - test/static/phase5-onboarding.test.js
    - scripts/ux-audit/onboarding.mjs
  modified:
    - src/components/auth/ProtectedRoute.tsx
    - src/components/settings/AppCard.tsx
    - src/index.css
    - test/static/phase5-install.test.js

key-decisions:
  - "A raiz do onboarding usa h-dvh (nao min-h-dvh): so assim a regiao do meio e a unica que rola em alturas menores que 640 e o corpo nunca rola"
  - "ProtectedRoute guarda `dismissed` em estado local: Pular/Entrar encerram o onboarding na sessao mesmo se a gravacao da marca falhar (T-05-14-01)"
  - "O replay e renderizado por createPortal no body (fixed inset-0 z-[60]), para nenhum ancestral com transform do cartao quebrar o posicionamento"

requirements-completed: []

duration: ~25 min
completed: 2026-11-23
---

# Phase 5 Plan 14: Onboarding de 3 telas e Rever a apresentacao Summary

**Onboarding de 3 telas antes do login (portao no `ProtectedRoute`, Pular em todas, chave `coinc:onboarding:v1` por aparelho gravada so em Pular/Entrar no modo `first`), com uma unica instancia do Vintem calada e decorativa (neutro, atento, feliz), e "Rever a apresentacao" em Ajustes como dialogo acessivel, provado em Chrome a 360x640, 360x560 e 390x844.**

## Accomplishments

- **Tracer (Task 1):** `readOnboardingSeen()` trata acesso lancando como visto; `markOnboardingSeen()` grava `1` em try e catch. `Onboarding` tem barra superior (Voltar invisivel e fora do foco na tela 1, Pular/Fechar), regiao do meio `overflow-y-auto` (unica que rola), rodape `sticky` com tres pontos e botao `h-14` ("Continuar", "Entrar", "Concluir"). O Vintem `<Vintem size="empty" follow decorative />` e uma so instancia fora de qualquer trecho com `key`, entao nunca remonta; as ilustracoes (R$ 1.240 e Lazer a 82%) levam o chip "Exemplo". O foco vai ao `h1` a cada troca (e na abertura do replay), com "Passo N de 3" em `sr-only` ligado por `aria-describedby`. `ProtectedRoute` ganhou `min-h-dvh bg-background` no carregamento, o onboarding entre `loading` e o `<LoginForm />` literal e o efeito de gravacao silenciosa com sessao (P-05). `AuthContext` nao mudou.
- **Task 2:** `AppCard` ganhou a linha "Rever a apresentacao" ("As 3 telas de boas-vindas") que abre `<Onboarding mode="replay" />` em portal; Esc, "Fechar" e "Concluir" fecham, o foco volta a linha, a marca nao e gravada e o Login nao aparece. `phase5-onboarding.test.js` guarda textos, Pular nas tres telas, Vintem unico sem balao/toque/contexto, tres estados, gravacao so no caminho `first` e nunca em efeito, portao, `try/catch`, escala e alvos. `onboarding.mjs` cobre os oito cenarios do plano mais o da pendencia do 05-12.
- **Pendencia do 05-12 resolvida:** cenario 9 chega por `/?origem=antigo`, atravessa as tres telas e confirma a marca `coinc:origem-antiga` intacta em cada uma, sem aviso dentro do onboarding, e o aviso "O Coinc mudou de endereco." no Login depois de "Entrar".
- **Verificacao final:** `npm run test:static` (557 testes, 555 passam, 0 falham, 2 ignorados), `npm run build`, `npm run lint`, `node scripts/ux-audit/onboarding.mjs` com `FALHAS 0` (228 verificacoes) e `install.mjs` ainda com `FALHAS 0`.

## Commits

- `659e6188`: feat(05-14): onboarding de 3 telas antes do login com o Vintem calado
- `a668458e`: feat(05-14): rever a apresentacao em Ajustes, guarda estatica e cenarios completos em Chrome
- `c0e3e5e9`: test(05-14): marca do aviso de endereco novo sobrevive as telas do onboarding

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Falha de gravacao da marca prenderia o usuario no onboarding**
- **Found during:** Task 1 (desenho do portao)
- **Issue:** com leitura funcionando e gravacao falhando (cota cheia), `readOnboardingSeen()` seguiria falso depois de Pular e o onboarding reapareceria para sempre.
- **Fix:** `ProtectedRoute` guarda `dismissed` em estado local, alem de ler a chave a cada render.
- **Files modified:** src/components/auth/ProtectedRoute.tsx
- **Commit:** 659e6188

**2. [Rule 1 - Bug] Atualizacao da guarda do 05-11**
- **Found during:** Task 2
- **Issue:** `phase5-install.test.js` proibia o texto "Rever a apresentação" no `AppCard` ate este plano.
- **Fix:** a proibicao foi trocada por um comentario apontando a guarda nova.
- **Files modified:** test/static/phase5-install.test.js
- **Commit:** a668458e

### Informativos

- **`h-dvh` no lugar de `min-h-dvh`:** o plano manda `min-h-dvh` na raiz, mas com `min-h-dvh` o conteudo faz a pagina crescer e a regiao do meio nunca rola; `h-dvh` cumpre o criterio (so a regiao do meio rola, corpo parado, barra e rodape fixos). A guarda estatica nao exige `min-h-dvh` no onboarding, so no carregamento do `ProtectedRoute`.
- **Spinner `size-8`:** o spinner do `ProtectedRoute` usava `h-8 w-8`, par que a varredura de alvos de toque reprova; trocado por `size-8` (nao e alvo de toque).
- **Cenario 8 (armazenamento lancando):** em MOCK o app precisa do `localStorage` para abrir logado, entao `Storage.prototype.getItem` passa a lancar depois do boot, logo antes de "Sair da conta" (e nao "antes do carregamento"); prova o mesmo caminho do portao.
- **Cenario 5 (recarregar na tela 2):** em MOCK a sessao volta a cada carga, entao o app abre direto e grava a marca em silencio (P-05); o "recomeca na tela 1" e provado por: marca ausente na tela 2, recarga abrindo o app sem onboarding, e nova ida ao Login mostrando a tela 1 de novo. Abertura a frio sem sessao so se confirma no aparelho (UAT).
- **Estado do Vintem nao lido no navegador:** o motor guarda o estado fora do DOM; os tres estados e a instancia unica sao provados pela guarda estatica e pela identidade do no do SVG entre as telas.
- Nenhum arquivo de icone do plano 05-13 foi tocado; `.planning/milestone.lock` e `.planning/state.json` ficaram fora dos commits.

**Total deviations:** 2 correcoes (Rule 1) e 5 informativas.

## Authentication Gates

Nenhum. Nenhum `firebase deploy`, login, mudanca no Railway nem pacote instalado.

## Known Stubs

Nenhum. Os valores "R$ 1.240" e "82% do limite" sao exemplos fixos e visiveis como tal (chip "Exemplo", ilustracao `aria-hidden`), sem leitura do Firestore (T-05-14-04).

## Threat Flags

Nenhum. T-05-14-01 (armazenamento indisponivel conta como visto, Pular nas tres telas, `dismissed` local; cenarios 5 e 8), T-05-14-02 (so a presenca da chave importa; guarda estatica), T-05-14-03 (dialogo com foco preso, Esc e Fechar; cenario 6) e T-05-14-04 mitigadas.

## Pendencias

- **IDEN-08 e IDEN-03 nao marcados como entregues:** fecham no 05-20 (o `requirements mark-complete` ficou de fora de proposito).
- **Human-check (P-02, P-03, P-10):** limpar os dados do site no celular, passar pelas tres telas (pulando em uma numa segunda tentativa) e, em Ajustes, tocar em "Rever a apresentacao"; o dono revisa o texto das telas e confirma quando marcar como visto. Consolidado no UAT do 05-20.

## Next Phase Readiness

- O Login ja recebe o usuario depois do onboarding com a marca de sessao do aviso de endereco novo intacta.
- 05-20 fecha IDEN-08 e IDEN-03 depois do UAT em aparelho.

## Self-Check: PASSED

- FOUND: src/lib/onboarding.ts, src/components/onboarding/Onboarding.tsx, test/static/phase5-onboarding.test.js, scripts/ux-audit/onboarding.mjs
- FOUND: commits 659e6188, a668458e e c0e3e5e9
- `git rev-list --count 5f00a512..HEAD` = 3 no momento da escrita
