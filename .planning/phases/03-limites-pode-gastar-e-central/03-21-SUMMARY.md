---
phase: 03-limites-pode-gastar-e-central
plan: 21
subsystem: central-de-limites
tags: [LimitsPage, rota-limites, hash-do-sino, os-dois-juntos, cartoes-esqueleto, guarda-estatica]
requires: [03-10, 03-12, 03-18, 03-20]
provides:
  - LimitsPage em /limites (totais, Limites do mês sem teto, Ajustar em Configurações, esqueleto de Cartões e Os dois juntos)
  - Hash /limites#cat-{id} do sino abre, rola, foca e destaca a linha
  - test/static/phase3-central.test.js (6 asserções)
affects: [03-22, 03-23]
tech-stack:
  added: []
  patterns: ["expandId derivado do hash a cada render por decodeURIComponent em try, sem estado", "a soma dos dois Pode gastar é a única conta da página", "ordem das seções verificada no JSX da página, não nas funções auxiliares"]
key-files:
  created: [src/pages/LimitsPage.tsx, test/static/phase3-central.test.js]
  modified: [src/App.tsx, test/static/phase3-shell.test.js]
decisions:
  - "A página chama useCycleBudget só para 'ele' e 'ela' e escolhe a visão do perfil atual por viewPerson, em vez de uma terceira consulta igual à de uma das pessoas"
  - "A legenda 'Cada um no seu ciclo' compara as chaves de ciclo das duas pessoas (cycle.key)"
  - "Em erro de uma das duas visões o cartão Os dois juntos é omitido; enquanto carrega mostra blocos neutros sem valor"
requirements-completed: [CENT-02, LIM-02]
status: complete
commits: 3
plan_head_before: 409bc8ab23fc19b9e334c9520d5f9b1be6d15a1f
actuals:
  tokens: 8500
  tasks: 3
  commits: 3
metrics:
  completed: 2026-11-18
---

# Fase 3 Plano 21: Central de Limites e Cartões

A rota `/limites` abre a Central: totais por estado, o `LimitsList` da Home sem teto de linhas, o atalho "Ajustar em Configurações", o esqueleto de Cartões e "Os dois juntos". A página só exibe a `BudgetView`; nada edita limite nem bloqueia gasto.

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Tracer: da BudgetView à lista de limites em /limites, com o hash do sino | 4f0ec2af | LimitsPage.tsx, App.tsx, phase3-shell.test.js |
| 2 | Totais, esqueleto de Cartões, Os dois juntos e duas colunas | 98e49135 | LimitsPage.tsx |
| 3 | Guarda estática da Central | 9608c865 | phase3-central.test.js |

Gate do tracer cumprido (modo interativo, `<verify>` automatizado): `test:static`, `build` e `lint` verdes antes de expandir.

## Resultados dos portões

- `npm run test:core:tz`: 234 passam, 0 falham (UTC e Asia/Tokyo).
- `npm run test:static`: 156 passam, 0 falham, 1 pulado pré-existente (6 testes novos em `phase3-central.test.js`).
- `npm run test:rules`: 12 passam, 0 falham.
- `npm run test:emu`: 58 passam, 0 falham.
- `npm --prefix server test`: 81 passam, 0 falham.
- `npm run build`: passa; aviso de chunk acima de 500 kB é pré-existente.
- `npm run lint`: 0 erros, 2 avisos `react-hooks/incompatible-library` pré-existentes.
- Nenhuma exclusão nos commits.

## Mitigações

- T-03-81: o hash só passa por `decodeURIComponent` dentro de `try`; valor inválido vira nulo; a rolagem usa `getElementById` (`useHashReveal`); a guarda proíbe `querySelector(`.
- T-03-82: só texto React; a guarda falha se aparecer HTML bruto.
- T-03-83: a guarda falha se a página importar `MoneyKeypad`, `setCategoryLimit`, `setLimit`, `updatePersonConfig` ou qualquer serviço (`@/services/`).
- T-03-84: leituras só por `useCycleBudget` (serviços com `ownerScope()` e regras por hid); a página não consulta nada direto.
- T-03-85: legenda "Cada um no seu ciclo" quando as chaves de ciclo das duas pessoas diferem.

## Requisitos

- Concluídos: CENT-02 (a Central só exibe estado e lançamentos de cada limite; ajuste só em Configurações) e LIM-02 (por categoria: gasto, limite, porcentagem, o que resta e expansão com lançamentos, numa rota alcançável pelo dock).
- Não marcados: CENT-01 ("resumo na Home que leva até ela"): o `CentralSummaryCard` existe, mas a Home ainda é a antiga; o Plano 22 monta `HomeSections`. LIM-03 ("Gasto geral" que desconta do Pode gastar): o Pode gastar na Home também é do Plano 22. IDEN-07 já constava como concluído.

## Deviations from Plan

### Testes que o plano quebra de propósito

**1. [Rule 3 - Bloqueio] Guarda do shell proibia a rota /limites**
- **Found during:** Task 1
- **Issue:** `phase3-shell.test.js` tinha `assert.doesNotMatch(src, /path="\/limites"/, 'a rota /limites e do Plano 21')`; registrar a rota derrubava a suíte estática.
- **Fix:** a asserção passou a exigir `<Route path="/limites" element={<LimitsPage />} />` e o título do teste inclui `/limites`.
- **Files modified:** test/static/phase3-shell.test.js
- **Commit:** 4f0ec2af

### Escolha de implementação

- Em vez de três chamadas de `useCycleBudget` (perfil atual, ele e ela), a página chama o hook só para `'ele'` e `'ela'` e usa `viewPerson` para escolher a visão da lista e dos totais. O resultado é o mesmo e evita uma consulta duplicada.
- O cartão "Cartões" e "Os dois juntos" só aparecem com a view do perfil carregada (na grade de duas colunas), por isso não há bloco de cartões durante o carregamento da página.

`files_modified` do plano não lista `phase3-shell.test.js`; foi incluído por ser o teste quebrado de propósito.

## Known Stubs

"Cartões" é um esqueleto intencional (chip "em breve" e texto fixo, sem dados nem botões); o conteúdo real é da Fase 6 (CARD-*), como o UI-SPEC S4 determina.

## Threat Flags

Nenhum. Sem rede, armazenamento nem superfície nova.

## Verificação não feita

Sem jsdom nem navegador (PR-16): rolagem, foco e destaque do hash do sino, layout de duas colunas em 1024px e leitura de tela do "Carregando seus números" ficam para o UAT humano (Plano 23).

## Self-Check: PASSED

- `src/pages/LimitsPage.tsx` e `test/static/phase3-central.test.js`: existem.
- Commits 4f0ec2af, 98e49135 e 9608c865: existem; contagem medida `rev-list 409bc8ab..HEAD` = 3.
