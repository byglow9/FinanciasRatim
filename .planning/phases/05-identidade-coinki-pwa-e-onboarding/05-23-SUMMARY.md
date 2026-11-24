---
phase: 05-identidade-coinki-pwa-e-onboarding
plan: 23
subsystem: onboarding-ui
tags: [onboarding, vintem, prints, adicionar-a-tela-inicial, sketch-029, cdp]
requires:
  - phase: 05-identidade-coinki-pwa-e-onboarding
    provides: "05-14 (portão, chave e replay), 05-18 (site coinc), 05-22 (Vintém de entrada e Login novo)"
provides:
  - "Vintém de entrada com seis estados (neutro, triste, dormindo, atento, surpreso, feliz) e gazeTo no controle"
  - "Onboarding de quatro telas: três de boas-vindas (balão, Vintém, celular com print real por tema) e a de adicionar à tela inicial"
  - "InstallScene: seletor de aparelho, interface do navegador desenhada, três passos tocáveis, marcador numerado"
  - "onboarding.mjs com 477 verificações, identity.mjs com o cenário 10, theme.mjs com onboarding-4"
  - "05-23-DEPLOY-EVIDENCE.md pronto para o deploy do dono"
affects: [05-19, 05-20]
tech-stack:
  added: []
  patterns:
    - "cena remontada por passo (key), roteiro por temporizadores apagados ao desmontar, nenhum com movimento reduzido"
    - "balão com texto sr-only, espaçador invisível de altura e texto digitado por cima"
    - "prints por import (hash em /assets/), trocados por useTheme().resolved, fora do pré-cache"
key-files:
  created:
    - src/assets/onboarding/ (seis WebP de 600 px)
    - src/components/onboarding/onboardingScenes.ts
    - src/components/onboarding/OnboardingParts.tsx
    - src/components/onboarding/WelcomeScene.tsx
    - src/components/onboarding/InstallScene.tsx
    - .planning/phases/05-identidade-coinki-pwa-e-onboarding/05-23-DEPLOY-EVIDENCE.md
  modified:
    - shared/core/vintemEntrada.js
    - shared/core/vintemEntrada.test.js
    - src/lib/vintem/view.ts
    - src/components/vintem/Vintem.tsx
    - src/components/onboarding/Onboarding.tsx
    - src/components/onboarding/InstallSteps.tsx
    - src/components/settings/AppCard.tsx
    - src/index.css
    - test/static/phase5-onboarding.test.js
    - test/static/phase5-install.test.js
    - test/static/phase5-darkaudit.test.js
    - test/static/phase5-docs.test.js
    - scripts/ux-audit/onboarding.mjs
    - scripts/ux-audit/theme.mjs
    - scripts/ux-audit/identity.mjs
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/phases/05-identidade-coinki-pwa-e-onboarding/05-UI-SPEC.md
key-decisions:
  - "Contagem da lente por setInterval de 16 ms com tempo decorrido, não requestAnimationFrame (a guarda do laço único da Fase 4 só o permite em world.ts, ArcGauge e useSectionReveal)"
  - "--onb-pw usa min(clamp(272px, 77vw, 300px), 100vw - 70px) em vez de 100% - 70px: mesma conta do sketch e sem porcentagem dentro de variável"
  - "Corte do topo do print em telas baixas (--onb-k e crop por cena) para o anel e a lente aparecerem a 360 por 640"
requirements-completed: []
requirements: [IDEN-08, IDEN-03, IDEN-06]
status: aguardando deploy do dono
completed: 2026-11-24
commits: 4
plan_head_before: eebcb7160cbce2e965c1e2e4956494967c03c143
actuals:
  tokens: 26500
  tasks: 4
  commits: 4
---

# Phase 5 Plan 23: Onboarding e adicionar à tela inicial do sketch 029 Summary

**Onboarding de quatro telas no visual do sketch 029: o Vintém de entrada (seis estados, olhar guiado) fala num balão com digitação, reage (susto no limite, festa no calendário) sobre um celular com print real por tema, e a última tela traz os passos ilustrados de adicionar à tela inicial para Android e iPhone; tarefas 1 a 4 prontas e verdes, aguardando o deploy do dono (tarefa 5).**

Status: **aguardando deploy do dono**. A Tarefa 5 (checkpoint humano de publicação do site `coinc`) não foi executada: o agente não roda `firebase deploy` nem `firebase login`. STATE.md e ROADMAP.md não foram avançados além do texto que a Tarefa 4 manda mudar (Goal e critérios 2 e 5 da Fase 5, `REQUIREMENTS.md`).

## O que foi feito

| Tarefa | Commit | Resultado |
|--------|--------|-----------|
| 1. Vintém de entrada | `e3a96408` | `vintemEntrada.js` ganha atento (suor), surpreso (exclamação) e feliz (faísca) com os números do `POSE` do sketch; `gazeTo(x, y)` na view e no `Vintem`. O look padrão e as tabelas do app não mudam. |
| 2. Três telas e casca | `5481ab21` | Seis WebP (33 a 42 KB), `onboardingScenes.ts`, `OnboardingParts.tsx` (celular, anel, lente, balão), `WelcomeScene.tsx` (roteiro de cada cena) e `Onboarding.tsx` de quatro passos. Guardas e `--smoke` reescritos de propósito. |
| 3. Adicionar à tela inicial | `01368224` | `InstallScene.tsx` (seletor, interface do navegador, passos tocáveis, marcador, Vintém olhando o marcador, avanço automático único, "Adicionar agora" só com `canPrompt`, modo app); casca com Agora não, Já adicionei, Entrar e Concluir; `AppCard` diz "As telas de boas-vindas". |
| 4. Prova, executores, documentos | `8624b57b` | `onboarding.mjs` (477 verificações), `identity.mjs` cenário 10, `theme.mjs` e guarda com `onboarding-4`, documentos em "onboarding curto" e "última tela", `05-23-DEPLOY-EVIDENCE.md`, capturas `onboarding-novo-*`. |

## Verificação (saídas)

- `node --test shared/core/vintemEntrada.test.js shared/core/vintemModel.test.js shared/core/vintemStates.test.js shared/core/purity.test.js`: 170 passam, 0 falham.
- `npm run test:core:tz`: 721 passam, 0 falham (duas zonas).
- `npm run test:static`: 585 testes, 583 passam, 0 falham, 2 ignorados (já existentes).
- `npm run build` e `npm run lint`: limpos (os seis WebP saem em `dist/assets/` com hash).
- `node scripts/ux-audit/onboarding.mjs`: `FALHAS 0` (477 verificações, 360 por 640, 390 por 844 e 360 por 560).
- `node scripts/ux-audit/identity.mjs`: `FALHAS 0` (274 verificações, com o cenário 10).
- `node scripts/ux-audit/install.mjs`: `FALHAS 0`.
- `node scripts/ux-audit/theme.mjs --audit`: `FALHAS 0` (76 combinações, 19 telas por dois temas e dois tamanhos).
- `node scripts/ux-audit/vintem.mjs --test`: `FALHAS 4`, **os mesmos quatro números de antes do plano** (199 e 277; 718; 11,3% a 84 px; 8,8% a 48 px). Medido antes (depois da Tarefa 1) e depois das quatro tarefas, idêntico ao registrado em `deferred-items.md`. Nenhum critério relaxado.

Capturas para o dono olhar antes de publicar: `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/.planning/phases/05-identidade-coinki-pwa-e-onboarding/captures/onboarding-novo-tela-<1 a 4>-<claro|escuro>-<360|390>.png` (16 arquivos, pasta ignorada pelo git; 360 por 640 e 390 por 844, pose final, movimento reduzido).

## Deviations from Plan

### Ajustes de execução

**1. [Rule 3 - bloqueio] Contagem da lente sem `requestAnimationFrame`**
- **Found during:** Tarefa 2 (`npm run test:static`)
- **Issue:** a guarda `phase4-testpage` só permite `requestAnimationFrame` em `world.ts`, `ArcGauge` e `useSectionReveal` (laço único da Fase 4); o plano mandava rAF na contagem.
- **Fix:** `setInterval` de 16 ms com o tempo decorrido (`performance.now()`), sem alterar a guarda da Fase 4. A guarda nova exige `performance.now()` e proíbe rAF.
- **Commit:** `5481ab21`

**2. [Rule 1 - bug] Palco crescia até o celular inteiro e a região do meio rolava**
- **Found during:** Tarefa 4 (primeira rodada do `onboarding.mjs`: `scrollHeight` 846 contra 464 a 360 por 640)
- **Issue:** `.onb-stage` com `flex: 1 1 auto` e `overflow: hidden` assumia a altura do conteúdo; o celular não era cortado pela base do palco e a região rolava.
- **Fix:** `flex: 1 1 0` com piso de 21 rem (base zero), em `src/index.css`. Entrou no commit da Tarefa 4 (`8624b57b`).

**3. [Decisão de implementação] Corte do topo do print em telas baixas**
- A 360 por 640 o anel, a lente e o dia 23 saíam do palco (só ~200 px do celular aparecem). Cada cena tem `crop` (100, 150 e 215 px do print) multiplicado por `--onb-k` (1 até 720 px de altura, 0,5 até 800, 0 acima). A 390 por 844 o desenho é o do sketch, sem corte. Medidas em `onboardingScenes.ts` e `index.css`.

**4. [Decisão de implementação] Largura do celular e `100%`**
- `--onb-pw` usa `100vw - 70px` no lugar de `100% - 70px` (mesma conta do sketch enquanto a coluna é mais estreita que 448 px) para a variável servir em `left`, `calc` e no rabicho sem depender do contêiner.

**5. [Decisão de implementação] Lint do `react-refresh`**
- `DEVICE_OPTIONS` exportado de `InstallSteps.tsx` leva `eslint-disable-next-line react-refresh/only-export-components` (o plano manda só exportar, e a guarda do 05-11 lê os literais no arquivo). `ADDED_TEXT` e `ALREADY_APP_TEXT` (strings) não precisam.

**6. [Decisão de implementação] Itens menores**
- `InstallScene` recebe só `reduced` (a casca já sabe se é app por `usePwaInstall`, então `replay` e o retorno de estado não foram necessários).
- Em `identity.mjs`, a leitura "olho 21 por 18" no onboarding (movimento normal) usa folga de 1,2 por causa do overshoot da piscada; a leitura exata de 0,5 continua no cenário 8 (movimento reduzido). `onboarding.mjs` e `identity.mjs` agora gravam `coinc:tema:v1 = claro` por padrão (o localStorage do Chrome vazava o escuro entre abas).
- As guardas da Tarefa 1 e da 2 foram escritas junto da implementação (e não antes) porque o visual foi iterado em Chrome; elas cobrem os mesmos comportamentos do plano, mas não foi feita a prova "falha no código antigo" desta vez.

## Known Stubs

Nenhum. Os prints têm dados fictícios do seed MOCK (conferidos um a um), a lente e os valores são fixos e decorativos (`aria-hidden`), sem leitura do Firestore.

## Threat Flags

Nenhum. Sem endpoint, caminho de autenticação nem acesso a arquivo novo; imagens só por `import` local, falas só como texto React, `ProtectedRoute`, `lib/onboarding.ts`, `AuthContext` e `LoginForm` intactos (T-05-23-01 a T-05-23-05 mitigadas e guardadas).

## Para o dono (Tarefa 5)

Olhar as capturas acima e confirmar que quer as quatro telas. Depois, comando exato (só o site coinc, nunca o `legacy`):

```bash
cd /home/glow/Documentos/projetos/sitefinancias/financiasratimbum
. ./scripts/dev-env.sh && npm run build
firebase deploy --only hosting:coinc --project financias-ratimbum
```

Responder "done" com a linha "Deploy complete" e uma frase sobre o onboarding (inclusive as quatro telas), ou "problema: DESCRIÇÃO". Depois do "done" o agente roda as conferências de leitura (a) a (e) de `05-23-DEPLOY-EVIDENCE.md` (cabeçalhos, bundle com as falas novas, seis imagens `immutable`, ícone, site antigo sem redirect). Os planos 05-19 e 05-20 devem passar a depender deste.

## Self-Check: PASSED

- Arquivos criados conferidos (`InstallScene.tsx`, `WelcomeScene.tsx`, `OnboardingParts.tsx`, `onboardingScenes.ts`, seis WebP, evidência) e capturas `onboarding-novo-*` (16).
- Commits `e3a96408`, `5481ab21`, `01368224` e `8624b57b` existem; `git rev-list --count eebcb716..HEAD` = 4 antes deste documento.
