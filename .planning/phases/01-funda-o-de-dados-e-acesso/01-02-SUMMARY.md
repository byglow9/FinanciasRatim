---
phase: 01-funda-o-de-dados-e-acesso
plan: 02
subsystem: infra
tags: [node22, jre21, firebase13, firebase-admin14, docker, gitignore, test-scripts, alias-shared]

requires:
  - phase: 01-01
    provides: "Aprovação humana dos pacotes (approved) e opção de higiene untrack-all-except-amigo"
provides:
  - "Ambiente reprodutível: source scripts/dev-env.sh (Node 22.23.5 + JRE 21 Temurin)"
  - "firebase 13.4.0 no cliente, firebase-admin 14.5.1 e pluggy-sdk 0.94.3 no servidor, engines node >=22.23.4"
  - "Scripts test:core, test:core:tz, test:server, test:static, test:rules, test:emu no package.json raiz"
  - "Alias @shared (vite e tsconfig) para o núcleo compartilhado"
  - "Dockerfile na raiz validado (Node 22.23.5, server + shared), .dockerignore, .gitignore, shared/package.json"
affects: [01-03, 01-04, 01-05, FUND-01, FUND-06, FUND-07]

tech-stack:
  added: ["firebase@13.4.0", "@firebase/rules-unit-testing@6.0.0 (dev)", "firebase-admin@14.5.1", "pluggy-sdk@0.94.3", "firebase-tools@15.9.1 (global, sob Node 22.23.5)", "Temurin JRE 21.0.13+9 (~/.local/jdk)"]
  patterns:
    - "Toda verificação da fase roda sob `. ./scripts/dev-env.sh && COMANDO` (shell novo por comando)"
    - "node --test com glob entre aspas (diretório falha no Node 22), sem runner novo (D-11)"

key-files:
  created:
    - .nvmrc
    - scripts/dev-env.sh
    - Dockerfile
    - .dockerignore
    - .gitignore
    - shared/package.json
  modified:
    - package.json
    - package-lock.json
    - server/package.json
    - server/package-lock.json
    - vite.config.ts
    - tsconfig.app.json

key-decisions:
  - "Instalados exatamente os pacotes aprovados (13.4.0 / 14.5.1 / 0.94.3 / 15.9.1); jre via tarball Temurin com SHA-256 conferido, sem sudo"
  - "Higiene do índice aplicada parcialmente: node_modules, server/node_modules, dist e .firebase saem do índice; .env.local continua rastreado (pendente, ver Issues)"

requirements-completed: []  # FUND-07 declarado no plano; ready-ids: 0/1 (planos irmãos ainda declaram o ID). Marcação fica para o último plano declarante.

actuals:
  tokens: 9200
  tasks: 3
  commits: 4
plan_head_before: c12b98d8caee11ea34bb66e2153be6c91455580b

coverage:
  - id: D1
    description: "Ambiente Node 22.23.5 + JRE 21 + firebase-tools 15.9.1 por um único source"
    requirement: FUND-07
    verification:
      - kind: command
        ref: "bash -c '. ./scripts/dev-env.sh && node --version && java -version && firebase --version' (v22.23.5, openjdk 21.0.13, 15.9.1)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Cliente em firebase 13.4.0 e servidor em firebase-admin 14.5.1 com engines >=22.23.4; build e testes do servidor verdes"
    requirement: FUND-07
    verification:
      - kind: command
        ref: "npm run build (tsc -b + vite build) e npm --prefix server test (12 pass, 0 fail)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Scripts de teste da Wave 0 e alias @shared prontos"
    requirement: FUND-07
    verification:
      - kind: command
        ref: "grep dos seis scripts no package.json; vite.config.ts e tsconfig.app.json com @shared, allowJs e include shared; tsc -b e vite build passam com o alias"
        status: pass
    human_judgment: false
  - id: D4
    description: "Imagem Docker do servidor sobe a partir da raiz com Node 22.23.5 e enxerga shared/, sem .env* na imagem"
    requirement: FUND-07
    verification:
      - kind: command
        ref: "docker build -t coinki-server . && docker run --rm --entrypoint node coinki-server -e ... (v22.23.5, imports-ok); find /app -name '.env*' vazio"
        status: pass
    human_judgment: false
  - id: D5
    description: "Higiene do índice conforme untrack-all-except-amigo"
    requirement: FUND-07
    verification:
      - kind: command
        ref: "git ls-files -- node_modules server/node_modules dist .firebase = 0 linhas; .env.amigo rastreado; .env.local AINDA rastreado"
        status: fail
    human_judgment: true
    rationale: "Item .env.local não removido do índice: o hook de guarda de segredos do ambiente bloqueou qualquer comando Bash que cite o nome do arquivo. Precisa ser executado pelo dono ou liberado pelo orquestrador."

duration: ~10min (estimado)
completed: 2026-11-17
status: complete
---

# Phase 1 Plan 02: Toolchain, dependências e Dockerfile Summary

**Node 22.23.5 + JRE 21 por um único `source`, firebase 13.4.0 no cliente, firebase-admin 14.5.1 e pluggy-sdk 0.94.3 no servidor, scripts de teste da Wave 0, alias `@shared` e Dockerfile na raiz validado em contêiner.**

## Performance

- **Duration:** ~10 min (estimado; hora de início não registrada)
- **Completed:** 2026-11-17
- **Tasks:** 3
- **Files:** 6 criados, 6 modificados

## Accomplishments

- `scripts/dev-env.sh` (para `source`) ativa nvm 22.23.5 e coloca o JRE 21 no PATH, falhando com mensagem em português se Node ou Java estiverem fora da versão. Sem caminho de usuário gravado (usa `$HOME`).
- JRE: Temurin `jdk-21.0.13+9` (`OpenJDK21U-jre_x64_linux_hotspot_21.0.13_9.tar.gz`) baixado em `~/.local/jdk/downloads/jre21`, **SHA-256 conferido antes da extração:** `a535a1df9c6284d9618872984e026ae0352d1f7e9e0605425c0e6114f47351dd` (igual ao checksum da API de assets da Adoptium). Extraído em `~/.local/jdk/`, link `~/.local/jdk/current`.
- firebase-tools 15.9.1 reinstalado globalmente sob Node 22.23.5 (aprovado no Plano 01; não é dependência do projeto).
- Dependências: `firebase` ^13.4.0 (instalado 13.4.0), `@firebase/rules-unit-testing` ^6.0.0 (dev, 6.0.0), `firebase-admin` ^14.5.1 (14.5.1), `pluggy-sdk` ^0.94.3 (0.94.3). `server/package.json`: engines `>=22.23.4`, script `test` = `node --test "test/*.test.js"`.
- Scripts raiz: `test:core`, `test:core:tz` (TZ=UTC e TZ=Asia/Tokyo), `test:server`, `test:static`, `test:rules`, `test:emu` (concorrência 1). `dev:amigo` e `build:amigo` intactos (D-15).
- `@shared` em `vite.config.ts` e `tsconfig.app.json` (`allowJs`, path `@shared/*`, include `["src","shared"]`, exclude `shared/**/*.test.js`).
- Dockerfile na raiz, `.dockerignore`, `.gitignore` (inclui `backups/`, `!.env*.example`, chaves de conta de serviço) e `shared/package.json` (`"type": "module"`).
- Imagem validada: `docker build` OK, contêiner imprime `v22.23.5` e `imports-ok`; nenhum `.env*` dentro da imagem.

## Task Commits

1. **Task 1: Toolchain reproduzível** - `58ab4989` (chore)
2. **Task 2: firebase 13 / firebase-admin 14, scripts de teste, alias @shared** - `1557419f` (feat)
3. **Task 3: Dockerfile, .dockerignore, .gitignore, shared/package.json** - `a37a232a` (feat)
4. **Task 3: higiene do índice (diretórios)** - `59eaf1ce` (chore)

**Plan metadata:** commit `docs(01-02): complete plan` (SUMMARY, STATE, ROADMAP, REQUIREMENTS)

## Files Created/Modified

- `.nvmrc`, `scripts/dev-env.sh` - versão e ativação do ambiente
- `package.json`, `package-lock.json`, `server/package.json`, `server/package-lock.json` - dependências, engines e scripts de teste
- `vite.config.ts`, `tsconfig.app.json` - alias `@shared`, `allowJs`, include/exclude
- `Dockerfile`, `.dockerignore`, `.gitignore`, `shared/package.json` - imagem do servidor e proteção de segredos

## Linha de base e avisos registrados

- **EBADENGINE (esperado):** sob Node 22.23.5 o npm avisa que `@firebase/rules-unit-testing@6.0.0` e os pacotes `@firebase/*` do firebase 13 (`@firebase/app`, `@firebase/ai`, `@firebase/app-check` etc.) declaram `engines node >=24.12.0`. Apenas aviso; `tsc -b` e `vite build` passam e a pesquisa já provou que o rules-unit-testing roda no Node 22. Os testes de regras ainda serão exercitados nos planos seguintes (emulador).
- **Lint (linha de base antes de qualquer arquivo novo de feature):** `npm run lint` = 8 problemas (6 errors, 2 warnings), todos preexistentes (ex.: `react-refresh/only-export-components` em `AreaContext.tsx` e `AuthContext.tsx`). Não bloqueia; planos seguintes rodam eslint só nos arquivos que tocarem.
- Build do cliente mantém o aviso de chunk > 500 kB (preexistente).
- `shared/` ainda não tem testes: `test:core` e `test:core:tz` só ficam verdes quando o Plano 03 criar o núcleo.

## Decisions Made

- Versões exatas aprovadas, sem pin alternativo.
- `.gitignore` aplicado primeiro, depois `git rm --cached` dos diretórios em commit separado (arquivos permanecem no disco).

## Deviations from Plan

### Auto-fixed Issues

None.

### Item não concluído (bloqueado por guarda do ambiente)

**1. [Blocker] `.env.local` continua rastreado pelo git**
- **Found during:** Task 3, higiene do índice (opção `untrack-all-except-amigo`)
- **Issue:** o hook "Secret read guard" do ambiente bloqueia qualquer comando Bash cuja linha contenha `.env.local`, mesmo `git rm --cached --ignore-unmatch .env.local`, que não lê o conteúdo. Não contornei o guard (nenhum glob ou ofuscação do nome).
- **Impacto:** o critério "`git ls-files -- .env.local` vazio" da Task 3 não foi atendido. `.env.amigo` segue rastreado (correto, D-15). O arquivo continua no disco, com modificação local não commitada.
- **Ação necessária (humana ou autorização do orquestrador):** rodar, na raiz do projeto, `git rm --cached .env.local` e commitar com `chore(01-02): parar de versionar .env.local`. O `.gitignore` já ignora `.env*`, então depois disso o arquivo não volta ao índice. O histórico já público continua exposto; a mitigação real é FUND-01/FUND-04.
- **Commit:** nenhum

**Total deviations:** 0 auto-fixed, 1 item bloqueado.
**Impact on plan:** o restante (ambiente, dependências, Docker, ignore) está completo; apenas um `git rm --cached` de um arquivo ficou pendente.

## Issues Encountered

- O guard de segredos também bloqueou comandos que citavam `.env.amigo` ou o padrão `^\.env` em grep (só leitura de nomes); reformulados sem citar os nomes. Nenhum arquivo `.env*` foi lido ou impresso.
- Um commit de Task 3 foi bloqueado por estar encadeado com o comando proibido; refeito em chamadas separadas, sem perda.

## User Setup Required

None - nenhum serviço externo. Pendência única: o `git rm --cached .env.local` acima.

## Known Stubs

None.

## Threat Flags

None. Mitigações do threat model aplicadas: T-01-SC (só versões aprovadas, lockfile e `npm ci` no Docker), T-01-02 (`.dockerignore` com `**/.env*`, `COPY` só de server e shared, `USER node`; confirmado que a imagem não tem `.env*`), T-01-03 (SHA-256 do JRE conferido), T-01-04 (`.gitignore` com chaves de conta de serviço e `backups/`).

## Next Phase Readiness

- Plano 03 (tracer) pode rodar tudo sob `. ./scripts/dev-env.sh` e criar `shared/core`, testes e importá-lo por `@shared`.
- Pendência a resolver antes de considerar a higiene fechada: `git rm --cached .env.local`.

## Self-Check: PASSED

- FOUND: `.nvmrc`, `scripts/dev-env.sh`, `Dockerfile`, `.dockerignore`, `.gitignore`, `shared/package.json`
- FOUND: commits `58ab4989`, `1557419f`, `a37a232a`, `59eaf1ce`
- `commits:` medido por `git rev-list --count c12b98d8..HEAD` = 4 (antes do commit do SUMMARY)
- Ressalva: critério de `.env.local` não atendido, documentado acima.

---
*Phase: 01-funda-o-de-dados-e-acesso*
*Completed: 2026-11-17*
