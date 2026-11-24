---
phase: 05-identidade-coinki-pwa-e-onboarding
plan: 22
subsystem: auth-ui
tags: [login, vintem, wordmark, sketch-029, cdp]
requires:
  - phase: 05-identidade-coinki-pwa-e-onboarding
    provides: "plano 05-18 (site coinc no ar), Vintém da Fase 4, Login do 05-12"
provides:
  - "Vintém de entrada (look=entrada): olhos simétricos, neutro, triste e dormindo"
  - "CoincWordmark (H1 do Login) e VintemSay (fala dos avisos)"
  - "Login do sketch 029 com avisos como fala do Vintém, sem mover o formulário"
  - "identity.mjs com os cenários do Login novo e capturas login-novo-*"
affects: [05-19]
tech-stack:
  added: []
  patterns:
    - "variante opcional do Vintém fixa por instância (look), tabelas puras em shared/core"
    - "fala derivada no render, absoluta, fora do fluxo do formulário"
key-files:
  created:
    - shared/core/vintemEntrada.js
    - shared/core/vintemEntrada.test.js
    - src/components/brand/CoincWordmark.tsx
    - src/components/vintem/VintemSay.tsx
    - .planning/phases/05-identidade-coinki-pwa-e-onboarding/05-22-DEPLOY-EVIDENCE.md
    - .planning/phases/05-identidade-coinki-pwa-e-onboarding/deferred-items.md
  modified:
    - shared/core/vintemModel.js
    - src/lib/vintem/view.ts
    - src/components/vintem/Vintem.tsx
    - src/components/auth/LoginForm.tsx
    - src/index.css
    - test/static/phase5-identity.test.js
    - test/static/phase3-1-login.test.js
    - scripts/ux-audit/identity.mjs
  deleted:
    - src/components/brand/CoincMark.tsx
key-decisions:
  - "Wordmark em Sora 800 (commit 0001769e do sketch), glifos gerados uma vez por script descartável e colados como constantes"
  - "Sem link 'Esqueci minha senha' (o app não tem fluxo de redefinição)"
  - "Botão Entrar usa size circleLg para o raio total sem conflito com rounded-btn no tailwind-merge"
requirements-completed: []
requirements: [IDEN-08, IDEN-01, IDEN-06]
status: aguardando deploy do dono
completed: 2026-11-24
commits: 3
plan_head_before: e23c04fb3034e96921ff6f4c12611ce3a53f4c69
actuals:
  tokens: 23300
  tasks: 3
  commits: 3
---

# Phase 5 Plan 22: Login novo do sketch 029 Summary

**Login com Vintém de entrada (olhos simétricos, neutro, triste e dormindo), wordmark COINC em paths da Sora 800 e avisos como fala do Vintém que não move o formulário; tarefas 1 a 3 prontas e verdes, aguardando o deploy do dono (tarefa 4).**

Status: **aguardando deploy do dono**. A Tarefa 4 (checkpoint humano de publicação do site `coinc`) não foi executada: o agente não roda `firebase deploy` nem `firebase login`. STATE.md e ROADMAP.md não foram avançados porque o plano ainda não está concluído.

## O que foi feito

| Tarefa | Commit | Resultado |
|--------|--------|-----------|
| 1. Vintém de entrada | `344a86c4` | `vintemEntrada.js` (tabelas puras do sketch 029), opção `look` no modelo, no desenhista e no componente. Sem sobrancelha, traço escuro só no olho fechado, olhos em dx 29 e y 109, olhar sem viés lateral. O look padrão não muda. |
| 2. Wordmark, fala e Login | `1c54c144` | `CoincWordmark` (h1 com `sr-only` e cinco paths), `VintemSay` (absoluta, `pointer-events-none`), `LoginForm` novo (fundo liso, campos em pílula, rodapé), CSS do brilho, do Zzz suave e da animação da fala. Guardas do Login atualizadas de propósito. |
| 3. Prova em Chrome | `5a632454` | `identity.mjs` reescrito (234 verificações), `CoincMark.tsx` removido, capturas `login-novo-*` (16 arquivos, ignorados pelo git) e `05-22-DEPLOY-EVIDENCE.md`. |

## Verificação (saídas)

- `node --test shared/core/vintemEntrada.test.js shared/core/vintemModel.test.js shared/core/vintemStates.test.js shared/core/purity.test.js`: 163 passam, 0 falham (suíte do núcleo existente sem edição).
- `npm run test:core:tz`: 714 passam, 0 falham (duas zonas).
- `npm run test:static`: 578 testes, 576 passam, 0 falham (2 ignorados já existentes).
- `npm run build` e `npm run lint`: limpos.
- `node scripts/ux-audit/identity.mjs`: `FALHAS 0` (234 verificações, 360x640 e 390x844, claro, escuro e movimento reduzido).
- `node scripts/ux-audit/onboarding.mjs`: `FALHAS 0`.
- `node scripts/ux-audit/theme.mjs --audit`: `FALHAS 0`.
- `node scripts/ux-audit/vintem.mjs --test`: `FALHAS 4`, **pré-existente** (ver desvios).

Guardas escritas antes da implementação: aplicadas ao código antigo (worktree limpo em `e23c04fb`) falharam 10 testes; com o código novo passam 24/24.

## Deviations from Plan

### Problemas encontrados e não corrigidos (fora do escopo)

**1. [Fora do escopo] Autoteste por pixels da Fase 4 já falhava antes do plano**
- **Found during:** Tarefa 1 (verificação)
- **Issue:** `vintem.mjs --test` termina em `FALHAS 4` (limiar da máscara 199 e 277, esclera 718, distinção bravo x sonolento 11,3% a 84 px e 8,8% a 48 px). O mesmo resultado, com os mesmos números, ocorre num worktree limpo do commit `e23c04fb`, e continua idêntico depois das três tarefas. A Fase 4 fechou em 32 de 32; a causa provável é deriva do ambiente (Chrome 152) ou dos tokens de cor da Fase 5.
- **Ação:** nenhuma correção e nenhum critério relaxado (regra P-14). Registrado em `deferred-items.md`. O critério "`vintem.mjs --test` em `FALHAS 0`" do plano **não** foi atingido por causa disso; o Vintém do app (modelo, geometria, tabelas e critérios) está intacto.

### Ajustes de execução (sem mudar o resultado)

**2. [Rule 3 - bloqueio] Tema escuro vazava entre as abas do `identity.mjs`**
- **Found during:** Tarefa 3
- **Issue:** o localStorage do Chrome sobrevive entre as abas e o tema escuro do cenário 7 passava ao tamanho seguinte.
- **Fix:** o seed passa a gravar `coinc:tema:v1 = claro` por padrão. **Commit:** `5a632454`.

**3. [Escolha de implementação] Botão Entrar com `size="circleLg"`**
- O `rounded-btn` do tamanho padrão não é reconhecido pelo tailwind-merge e conflitaria com `rounded-full`; o tamanho `circleLg` já traz o raio total, e o `className` mantém `h-14 w-full` para a guarda.

Fora isso, o plano foi executado como escrito. Estados da fala, textos, papéis (`alert` e `status`), prioridade e fluxo de autenticação seguem o plano.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. Não há endpoint, caminho de autenticação nem acesso a arquivo novo; a fala só exibe constantes fixas e o `accessError` do contexto (T-05-22-01 e T-05-22-02 mitigados e guardados).

## Para o dono (Tarefa 4)

Capturas para olhar antes de publicar: `.planning/phases/05-identidade-coinki-pwa-e-onboarding/captures/login-novo-<estado>-<claro|escuro>-<360|390>.png`, estados `normal`, `erro`, `sem-conexao` e `endereco-novo`.

Comando de publicação (só o site coinc, nunca o `legacy`):

```bash
cd /home/glow/Documentos/projetos/sitefinancias/financiasratimbum
. ./scripts/dev-env.sh && npm run build
firebase deploy --only hosting:coinc --project financias-ratimbum
```

Depois do "done" e da linha "Deploy complete", o agente roda as conferências de leitura (a) a (e) descritas em `05-22-DEPLOY-EVIDENCE.md`. O plano 05-19 (redirect do site antigo) deve passar a depender deste.

## Self-Check: PASSED

- Arquivos criados e removidos conferidos (`vintemEntrada.js`, `CoincWordmark.tsx`, `VintemSay.tsx`, evidência presentes; `CoincMark.tsx` ausente).
- Commits `344a86c4`, `1c54c144` e `5a632454` existem; `rev-list --count e23c04fb..HEAD` = 3 antes deste documento.
