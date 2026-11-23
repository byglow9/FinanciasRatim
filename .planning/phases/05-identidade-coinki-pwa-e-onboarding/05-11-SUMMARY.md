---
phase: 05-identidade-coinki-pwa-e-onboarding
plan: 11
subsystem: pwa
tags: [pwa, instalacao, tela-inicial, ajustes, onboarding, cdp, acessibilidade]
status: complete

requires:
  - phase: 05-identidade-coinki-pwa-e-onboarding
    provides: "05-09 usePwaInstall (canPrompt, prompt, isStandalone, platform) e installPrompt.ts; 05-10 captureInstallPrompt no boot (main.tsx)"
provides:
  - "src/components/onboarding/InstallSteps.tsx: seletor Aparelho, tres passos por plataforma, botao Adicionar agora so com o evento, estado 'ja e app' (prop opcional onDone para o onboarding)"
  - "src/components/settings/AppCard.tsx: cartao Aplicativo (#aplicativo) com a folha Adicionar a tela inicial"
  - "SettingsPage com AppCard depois de NotificationsCard e antes de Sair da conta"
  - "test/static/phase5-install.test.js (8 testes) e scripts/ux-audit/install.mjs (porta 5195, 66 verificacoes)"
affects: [05-12 onboarding, 05-14 tela 3 do onboarding e linha Rever a apresentacao, 05-20 UAT em aparelho (IDEN-03)]

actuals:
  tokens: 9400
  tasks: 2
  commits: 2
plan_head_before: d575cb1122fbe9a1ad77a4d7bb9b1f0a09395a17

tech-stack:
  added: []
  patterns:
    - "Escolha manual do seletor em estado local (picked) sobre o padrao vindo do hook: sem efeito para sincronizar e sem setState em efeito"
    - "Passos como dados (before, word, icon, after) para o icone ficar ao lado da palavra que o nomeia e o texto continuar o do contrato"

key-files:
  created:
    - src/components/onboarding/InstallSteps.tsx
    - src/components/settings/AppCard.tsx
    - test/static/phase5-install.test.js
    - scripts/ux-audit/install.mjs
  modified:
    - src/pages/SettingsPage.tsx

key-decisions:
  - "O botao Adicionar agora so chama prompt() no toque; o evento fica guardado no modulo e a guarda de cenario prova que prompt() nunca roda sozinho (T-05-11-01)"
  - "onDone so dispara quando o resultado e 'accepted'; recusar ou indisponivel nao muda nada na tela"
  - "A linha 'Rever a apresentacao' ficou de fora, como pedido (nasce no 05-14); a guarda proibe o texto neste cartao ate la"

patterns-established:
  - "Standalone em CDP: o Chrome aceita display-mode em Emulation.setEmulatedMedia mas nao o aplica; o executor tambem forca so a consulta (display-mode: standalone) na pagina e cobre o caminho navigator.standalone do iPhone"

requirements-completed: []

duration: ~25 min
completed: 2026-11-23
---

# Phase 5 Plan 11: Passos de adicionar a tela inicial Summary

**`InstallSteps` (seletor Android/iPhone, tres passos com icones decorativos, botao nativo so quando o navegador entrega o evento, aviso de 'ja e app') e o cartao Aplicativo em Ajustes com a folha, provados no Chrome com evento sintetico, agente de usuario e standalone emulados.**

## Accomplishments

- **Tracer (Task 1):** `InstallSteps` usa `usePwaInstall()`; em standalone mostra so `Notice` "Você já está usando o Coinc como app."; fora dele, "Adicionar agora" (`Button outline h-14 w-full`, `Download`) acima dos passos e apenas com `canPrompt`, aviso "Adicionado. Procure o ícone do Coinc na tela inicial." so no resultado aceito, `SegmentedControl` `ariaLabel="Aparelho"` com padrao pela plataforma do hook e `<ol>` com os seis passos do contrato (icones `EllipsisVertical`, `Share`, `SquarePlus` com `aria-hidden`, circulo `size-8`). `AppCard` e um `SettingsCard id="aplicativo"` (`Smartphone`, "Aplicativo", "Coinc na tela inicial") com a linha-botao `min-h-14` que abre `Sheet` "Adicionar à tela inicial"; a descricao da linha vira "Já está na tela inicial" em standalone. `SettingsPage` renderiza `<AppCard />` depois de `<NotificationsCard />`, sem tocar no subtitulo nem na ordem anterior. Guarda `phase5-install` (ordem dos cartoes, textos, termos proibidos, escala e alvos de toque) e `phase4-settings` passam.
- **Task 2:** `scripts/ux-audit/install.mjs` cobre os sete cenarios em abas novas com seed: (1) cartao depois de Notificacoes, ultimo antes de Sair, linha abre a folha com o titulo certo; (2) setas, Home e End, so a opcao ativa tabulavel e os textos exatos dos passos de cada plataforma; (3) padrao iPhone por UA de iPhone e por iPadOS-como-Mac com toque, Android por UA de Android; (4) sem evento nao ha botao, com evento sintetico ele aparece acima dos passos, `prompt()` so roda no toque (uma vez), aceito mostra o aviso e recusado nao muda nada, inclusive com o evento chegando antes de a folha abrir; (5) standalone por `display-mode` e por `navigator.standalone`; (6) Esc fecha e o foco volta a linha; (7) sem rolagem horizontal e todo alvo com pelo menos 43.5 px, com a folha aberta nas duas plataformas e com o botao nativo. Saida: 66 verificacoes `ok`, `FALHAS 0`, codigo 0, sem processo orfao.
- Verificacao final: `npm run test:static` (531 testes, 529 passam, 0 falham, 2 ignorados), `npm run build`, `npm run lint`, `audit.mjs --route /configuracoes` a 360x640 e 390x844 (0 violacoes) e `node scripts/ux-audit/install.mjs` (`FALHAS 0`).

## Commits

- `2b08bc3a`: feat(05-11): cartao Aplicativo e passos para adicionar o Coinc a tela inicial
- `1f65db87`: test(05-11): executor CDP dos passos de adicionar a tela inicial

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Bloqueio] `Emulation.setEmulatedMedia` nao aplica `display-mode`**
- **Found during:** Task 2, primeira execucao do executor (FALHAS 4, todas no cenario 5)
- **Issue:** o plano manda emular `display-mode: standalone` por `Emulation.setEmulatedMedia`; o Chrome aceita a chamada sem erro, mas `matchMedia('(display-mode: standalone)').matches` segue falso.
- **Fix:** o executor mantem a chamada e tambem forca, por script de novo documento, so a consulta `(display-mode: standalone)` no `matchMedia` (as demais consultas seguem reais); acrescentou ainda o caminho `navigator.standalone` do Safari como verificacao propria (cenario 5 roda duas vezes: Chrome e iPhone).
- **Files modified:** scripts/ux-audit/install.mjs
- **Commit:** 1f65db87

### Informativos

- **Guarda do executor na Task 2:** o teste que confere `install.mjs` foi escrito na Task 2 (nao na Task 1), para o commit da Task 1 nao deixar teste vermelho; o arquivo `phase5-install.test.js` e o mesmo, citado nos `files` das duas tarefas.
- **Recusar o dialogo:** o evento do navegador vale uma vez (comportamento do 05-09: `promptInstall` o descarta), entao depois de recusar o botao some ate o navegador entregar outro evento; os passos e o resto da tela nao mudam, como pede o contrato.
- Nenhum arquivo de icone do plano 05-13 foi tocado; `.planning/milestone.lock` e `.planning/state.json` ficaram fora dos commits.

**Total deviations:** 1 correcao (Rule 3) e 3 informativas.

## Authentication Gates

Nenhum. Nenhum `firebase deploy`, login, mudanca no Railway nem pacote instalado.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. T-05-11-01 (`prompt()` so no toque, cenario 4 prova zero chamadas antes do clique), T-05-11-03 (textos como filhos React fixos, guarda proibe HTML bruto) mitigadas; T-05-11-02 aceito (revisao dos textos no UAT).

## Pendencias

- **IDEN-03 nao marcado como entregue:** fecha so no 05-20 (a terceira tela do onboarding e a linha "Rever a apresentacao" vem no 05-14; conferencia em aparelho no UAT).
- **Confirmacao em aparelho (human-check da Task 2):** os passos batem com os menus reais do Chrome e do Safari, o botao Adicionar agora abre o dialogo nativo no Android e o app adicionado abre em tela cheia com o icone do Coinc. Consolidado no 05-20 (P-10).

## Next Phase Readiness

- 05-14 reaproveita `InstallSteps` (com `onDone`) na terceira tela e acrescenta a linha "Rever a apresentacao" ao `AppCard`.
- A ancora `#aplicativo` ja funciona pelo `useHashReveal` de Ajustes.

## Self-Check: PASSED

- FOUND: src/components/onboarding/InstallSteps.tsx, src/components/settings/AppCard.tsx, test/static/phase5-install.test.js, scripts/ux-audit/install.mjs
- FOUND: commits 2b08bc3a e 1f65db87
- `git rev-list --count d575cb11..HEAD` = 2 no momento da escrita
