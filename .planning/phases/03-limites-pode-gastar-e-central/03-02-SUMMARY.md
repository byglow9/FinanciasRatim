---
phase: 03-limites-pode-gastar-e-central
plan: 02
subsystem: base-visual
tags: [fontes, tokens, moeda, animacao, lint]
requires: [03-01]
provides:
  - fontes Sora e Bricolage Grotesque auto-hospedadas pelo bundle
  - tokens Moeda e utilitarios Tailwind (surface-2, track, brand, warn, danger, -ink, rhythm, shadow-float, raios)
  - classes de animacao e regra global de movimento reduzido em src/index.css
  - npm run lint com codigo 0
affects: [03-03, 03-08, interface da Fase 3]
tech-stack:
  added: ["@fontsource-variable/sora@5.3.0", "@fontsource-variable/bricolage-grotesque@5.3.0"]
  patterns: ["tokens em src/index.css (Tailwind v4, @theme inline)", "guardas estaticas node:test em test/static/phase3-*.test.js"]
key-files:
  created: [test/static/phase3-base.test.js]
  modified: [package.json, package-lock.json, src/main.tsx, index.html, src/index.css, src/components/ui/button.tsx, src/components/ui/badge.tsx, src/components/ui/input.tsx, src/components/ui/select.tsx]
decisions:
  - "Bricolage importado por opsz.css (peso + eixo optico); wght.css nao foi necessario"
  - "Nomes reais de familia conferidos no CSS dos pacotes: 'Sora Variable' e 'Bricolage Grotesque Variable'"
requirements-completed: [IDEN-07]
status: complete
commits: 3
plan_head_before: f21d9a0a44f5da82711a478053a85212920bbe94
actuals:
  tokens: 14000
  tasks: 3
  commits: 3
metrics:
  completed: 2026-11-18
---

# Fase 3 Plano 02: Base visual Moeda e lint verde

Fontes Sora e Bricolage Grotesque saem do bundle (sem Google Fonts), a paleta Moeda e as animacoes da fase vivem em `src/index.css`, e `npm run lint` sai com codigo 0.

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Tracer: fontes do npm ao bundle, com guarda | 5908c988 | package.json, package-lock.json, src/main.tsx, index.html, test/static/phase3-base.test.js |
| 2 | Tokens Moeda, fontes, animacoes e movimento reduzido | 6cb2872e | src/index.css, test/static/phase3-base.test.js |
| 3 | Lint verde nos quatro primitivos | 6c112633 | button.tsx, badge.tsx, input.tsx, select.tsx |

## Resultados dos portoes

- `npm run test:core`: 65 passam, 0 falham.
- `npm run test:static`: 59 passam, 0 falham (6 + 4 testes novos de `phase3-base.test.js`, 1 pulado pre-existente).
- `npm run build`: passa; o CSS gerado contem `Sora Variable` e os `.woff2` das duas fontes saem em `dist/assets`. Aviso de chunk acima de 500 kB e pre-existente.
- `npm run lint`: codigo 0, 0 erros, 2 avisos `react-hooks/incompatible-library` (aceitos pelo plano).

## Decisoes e conferencias

- Instalacao com `--save-exact`, versoes aprovadas em 03-01 (resposta "top continua"). `package-lock.json` ganhou apenas as duas entradas das fontes; nenhum outro pacote.
- Premissas PR-17 (verde e laranja do mockup) e PR-18 (tema claro forcado) implementadas. O bloco `.dark` e as classes `dark:` ficaram intactos; o script de tema de `index.html` foi removido. A leitura de `localStorage['financias_theme']` no `AreaContext` e o interruptor de Aparencia nao estao em `files_modified` deste plano e ficam para o plano 10.
- `--input` virou `46.2 5.3% 51.6%` (borda de campo #8a877d); campos legados passam a ter borda mais escura, efeito esperado da paleta (restilo no plano 08).

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. T-03-SC mitigado (versao exata, lockfile commitado, so os dois pacotes aprovados); T-03-03 mitigado (guarda falha se houver dominio de fontes do Google).

## Self-Check: PASSED

- Arquivos: `test/static/phase3-base.test.js`, `src/index.css`, `src/main.tsx`, `index.html` existem.
- Commits 5908c988, 6cb2872e e 6c112633 existem; contagem medida `rev-list f21d9a0a..HEAD` = 3.
