---
phase: 05-identidade-coinki-pwa-e-onboarding
plan: 12
subsystem: ui
tags: [login, identidade, marca, redirect, sessionStorage, offline, cdp]
status: complete

requires:
  - phase: 05-identidade-coinki-pwa-e-onboarding
    provides: "05-07 icone do app em public/icons/icon.svg; 05-10 main.tsx com captureInstallPrompt e registerPwa; 05-08 redirect do site antigo com ?origem=antigo"
provides:
  - "src/lib/legacyOrigin.ts: captureLegacyOrigin() (boot), hasLegacyOrigin() e clearLegacyOrigin()"
  - "src/components/brand/CoincMark.tsx: img do icone do app, 56 por 56, alt vazio"
  - "LoginForm: marca, H1 Coinc, aviso info de endereco novo e mensagem de sem conexao sem chamar signIn"
  - "test/static/phase5-identity.test.js: guarda do nome em src, index.html e public, do Login, do legacyOrigin e do main"
  - "scripts/ux-audit/identity.mjs: porta 5194, sete cenarios nos dois tamanhos, 92 verificacoes, termina em FALHAS n"
affects: [05-13 troca do icone (CoincMark acompanha o arquivo, sem editar codigo), 05-14 onboarding (a marca de sessao sobrevive as telas), 05-20 fechamento de IDEN-01 e IDEN-08, 05-21 redirect 301]

actuals:
  tokens: 9000
  tasks: 2
  commits: 2
plan_head_before: 638c2e26e995e034683834f541e58d15229a72a0

tech-stack:
  added: []
  patterns:
    - "Marca em arquivo proprio (CoincMark) para o Login nao conter o termo do degrade proibido pela guarda da Fase 3.1"
    - "Parametro de URL externo so liga um aviso de texto fixo por igualdade estrita; o valor nunca e devolvido, renderizado nem usado como destino"
    - "Estado do aviso lido uma vez ao montar (useState com inicializador), limpo depois do signIn com sucesso"

key-files:
  created:
    - src/lib/legacyOrigin.ts
    - src/components/brand/CoincMark.tsx
    - test/static/phase5-identity.test.js
    - scripts/ux-audit/identity.mjs
  modified:
    - src/components/auth/LoginForm.tsx
    - src/main.tsx
  deleted:
    - public/piggy.svg
    - public/vite.svg

key-decisions:
  - "CoincMark usa /icons/icon.svg por <img>: a troca do icone no 05-13 so substitui o arquivo, sem editar codigo"
  - "captureLegacyOrigin remove so o parametro origem (valor certo ou errado) e preserva caminho, outros parametros e hash; variantes como ANTIGO, 'antigo ' e 'antigo,x' nao ligam o aviso"
  - "O aviso info usa className bg-surface-2 para destacar do cartao bg-card; fundo dentro dos seis permitidos"

patterns-established:
  - "Offline em CDP: Network.emulateNetworkConditions offline faz navigator.onLine ser falso; erros de rede do navegador (net::ERR, WebSocket) saem da contagem de console error do executor"

requirements-completed: []

duration: ~25 min
completed: 2026-11-23
---

# Phase 5 Plan 12: Login do Coinc e aviso de endereco novo Summary

**Login com a marca do icone do app e H1 "Coinc", aviso "O Coinc mudou de endereco." vindo de `?origem=antigo` (igualdade estrita, URL limpa, sessionStorage, nunca renderizado) e mensagem propria de sem conexao antes do `signIn`, provados em Chrome a 360x640 e 390x844.**

## Accomplishments

- **Tracer (Task 1):** `legacyOrigin.ts` e chamado em `main.tsx` depois de `initTheme()` e `captureInstallPrompt()` e antes do `createRoot`. O `LoginForm` troca o circulo com `PiggyBank` por `<CoincMark />`, o H1 passa a "Coinc", o subtitulo com "finanças" fica, e acima do formulario aparece `Notice tone="info"` (icone `Info`) quando `hasLegacyOrigin()`. Em `onSubmit`, `navigator.onLine === false` define o estado de sem conexao e retorna sem chamar `signIn`; a mensagem fixa de credencial errada, o `catch` sem variavel e `accessError` nao mudaram; `clearLegacyOrigin()` roda depois do `signIn` com sucesso.
- **Task 2:** `public/piggy.svg` e `public/vite.svg` removidos (nada os referenciava), com guarda de ausencia e de referencia. `identity.mjs` (Vite em MOCK na porta 5194, Chrome por CDP) cobre os sete cenarios nos dois tamanhos: origem antiga (URL perde so o parametro e preserva `outro=1` e o hash, marca guardada, H1, imagem `/icons/icon.svg` com alt vazio de 56 por 56, titulo da aba, aviso acima do formulario, marca sobrevive a recarga), abertura normal sem aviso, `origem=qualquer` e tres variantes sem aviso, offline (mensagem em `role="alert"`, sem "E-mail ou senha incorretos."; voltando online, volta a mensagem de credencial), nome antigo ausente do texto visivel, sem rolagem horizontal e alvos de pelo menos 43,5 px, tema escuro com corpo `rgb(10, 21, 16)`.
- **Verificacao final:** `npm run test:static` (542 testes, 540 passam, 0 falham, 2 ignorados), `phase3-1-login.test.js` passa sem edicao, `npm run build`, `npm run lint` e `node scripts/ux-audit/identity.mjs` com `FALHAS 0` (92 verificacoes).

## Commits

- `e7db853c`: feat(05-12): Login do Coinc com marca, aviso de endereco novo e mensagem de sem conexao
- `2f0131cb`: test(05-12): executor CDP do Login e remocao dos SVGs sem uso

## Deviations from Plan

### Auto-fixed Issues

Nenhum desvio de regra. O plano foi executado como escrito.

### Informativos

- **Guardas divididas entre as tarefas:** os testes de remocao dos SVGs e do executor `identity.mjs` foram escritos no commit da Task 2 (nao da Task 1), para o commit da Task 1 nao deixar teste vermelho; o arquivo `phase5-identity.test.js` e o mesmo.
- **Erros de rede fora da contagem do executor:** com a rede emulada offline o Chrome registra erros de console de rede; o executor ignora `net::ERR`, `Failed to load resource` e `WebSocket` na verificacao de console limpo (excecoes continuam todas contadas).
- Nenhum arquivo de icone do plano 05-13 foi tocado; `.planning/milestone.lock` e `.planning/state.json` ficaram fora dos commits.
- Exclusoes `public/piggy.svg` e `public/vite.svg` sao intencionais (Task 2).

**Total deviations:** 0 correcoes e 3 informativas.

## Authentication Gates

Nenhum. Nenhum `firebase deploy`, login, mudanca no Railway nem pacote instalado.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. T-05-12-01 (`origem` so por igualdade estrita com `antigo`, aviso de texto fixo, valor nunca renderizado nem usado em navegacao: guarda estatica e cenarios 1 e 3), T-05-12-02 e T-05-12-03 (mensagem de credencial errada fixa; a de sem conexao nao depende da conta) e T-05-12-04 (guarda do nome com lista fechada de excecoes P-12) mitigadas.

## Pendencias

- **IDEN-01 e IDEN-08 nao marcados como entregues** (fecham mais adiante, 05-20); IDEN-02 depende da escolha do icone no 05-13.
- O onboarding (05-14) ainda nao existe: a sobrevivencia da marca de sessao as telas dele e provada so a recarga no Login; conferir no 05-14.

## Next Phase Readiness

- 05-13 pode trocar os SVGs de icone e rodar `npm run icons`: o `CoincMark` acompanha pelo `<img>` sem edicao de codigo.
- 05-14 le `hasLegacyOrigin()` indiretamente: a marca fica em `sessionStorage` ate o login dar certo.

## Self-Check: PASSED

- FOUND: src/lib/legacyOrigin.ts, src/components/brand/CoincMark.tsx, test/static/phase5-identity.test.js, scripts/ux-audit/identity.mjs
- MISSING (esperado, removidos): public/piggy.svg, public/vite.svg
- FOUND: commits e7db853c e 2f0131cb
- `git rev-list --count 638c2e26..HEAD` = 2 no momento da escrita
