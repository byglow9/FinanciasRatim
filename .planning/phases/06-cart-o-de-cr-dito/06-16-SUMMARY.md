---
phase: 06-cart-o-de-cr-dito
plan: 16
subsystem: dock / navegação
tags: [dock, navrail, cartoes, guardas, auditor-layout]
requires: [06-01, 06-02]
provides: [dock-9-destinos, atalho-cartoes]
affects: [src/components/layout/NavRail.tsx, scripts/ux-audit/audit.mjs]
key-files:
  modified:
    - src/components/layout/NavRail.tsx
    - test/static/phase3-1-dock.test.js
    - test/static/phase3-gaps.test.js
    - scripts/ux-audit/audit.mjs
  created:
    - test/static/phase6-dock.test.js
decisions:
  - "Cartões fica logo depois de Contas fixas (D-11), 5º item, primeiro parcial na espiada a 360px"
status: complete
plan_head_before: 86b7334b40b540367904ba8cf53f6dd8b5a3e1c8
commits: 2
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
requirements: [CENT-03, CARD-02]
completed: 2026-11-24
---

# Phase 6 Plan 16: Dock com o 9º destino Cartões Summary

Dock do NavRail passa de 8 para 9 destinos com Cartões (`/cartoes`, ícone Lucide `CreditCard`, aria-label e title "Cartões", sem rótulo visível) depois de Contas fixas, e as guardas e o auditor de espiada passam a conferir 9 itens.

## Tarefas

| Tarefa | Commit | Arquivos |
|--------|--------|----------|
| 1. Destino Cartões e guardas de 9 | 1c14d70a | NavRail.tsx, phase3-1-dock.test.js, phase3-gaps.test.js |
| 2. Auditor de espiada e guarda do 9º destino | 56bfd006 | audit.mjs, phase6-dock.test.js |

Nota sobre `commits`: `git rev-list --count` desde a base do plano dá 7 porque os planos 06-03, 06-04 e 06-05 commitaram em paralelo no mesmo branch; os commits deste plano são 2 (1c14d70a, 56bfd006).

## Verificação

- `node --test` de phase3-1-dock, phase3-gaps e phase6-dock: passam (5 testes novos).
- `npm run test:static`: 618 pass, 0 fail, 2 skipped (pré-existentes).
- `npm run test:core:tz`: 782 pass, 0 fail.
- `npm run build` e `npm run lint`: sem erros.
- Auditor `audit.mjs --route / --viewport 360x640 --assert dock-peek`: ok, total 9, rótulo Cartões presente, 4 inteiros, 1 parcial à direita, sem corte à esquerda, 0 violações.
- Auditor a 390x844 (rota `/`): 0 violações.

## Deviations from Plan

None - plano executado como escrito. Nenhuma guarda foi afrouxada além do número, da lista e do ícone; o assert `dock-peek` segue só válido a 360x640.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum (T-06-54 e T-06-55 mitigados: 48px por item e espiada medida; guarda trava o href `/cartoes`).

## Self-Check: PASSED

Arquivos e commits 1c14d70a e 56bfd006 conferidos.
