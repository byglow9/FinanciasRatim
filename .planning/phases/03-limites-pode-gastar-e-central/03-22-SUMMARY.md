---
phase: 03-limites-pode-gastar-e-central
plan: 22
subsystem: home
tags: [DashboardPage, ArcGauge, RhythmPill, ShortcutRow, HomeSections, StaleNotice, estados, regiao-viva, guarda-estatica]
requires: [03-10, 03-12, 03-14, 03-16, 03-18, 03-20]
provides:
  - DashboardPage reescrita (Home nova) sobre useCycleBudget, so exibindo a BudgetView
  - Estados da Home - carregando, erro, sem renda, ciclo passado, negativo, dado velho e Porquinho defensivo
  - Regiao viva sr-only aria-live polite com o Pode gastar e o por dia
  - BankStatusNotice removido; a Home usa StaleNotice
  - test/static/phase3-home.test.js (7 asserções)
affects: [03-23]
tech-stack:
  added: []
  patterns: ["sem view nao ha numero: carregando e erro nunca renderizam valor", "pagina so compoe componentes e le a BudgetView, sem formula", "Porquinho desliga a consulta do ciclo por enabled: false"]
key-files:
  created: [test/static/phase3-home.test.js]
  modified: [src/pages/DashboardPage.tsx, test/static/bank-ui-copy.test.js, test/static/phase3-home-cards.test.js]
  deleted: [src/components/dashboard/BankStatusNotice.tsx]
decisions:
  - "O valor por dia sai de perDayReais (reais inteiros, para baixo) e e formatado por formatMoney, com separador de milhar"
  - "Sem renda esperada o rotulo Pode gastar tambem some: o bloco vazio substitui rotulo, valor, por dia e pilula, e o arco fica so no trilho"
  - "Ciclo passado troca rotulo e linha, remove a pilula e mantem o arco no tom do nivel (null vira neutro); a regiao viva diz Sobrou ou Passou no ciclo"
  - "Erro tem precedencia sobre a view: depois de uma falha no refetch a Home mostra so o aviso, sem numero nem secoes"
  - "Porquinho (defensivo, D-02, inalcancavel pela casca) mostra o Notice e o CentralSummaryCard com contagens zeradas, porque nao consulta o ciclo"
requirements-completed: [LIM-03, LIM-04, LIM-05, LIM-06, LIM-08, LIM-09, CENT-01, CENT-06, IDEN-07]
status: complete
commits: 3
plan_head_before: f803f20bbf7df27eb6a41ad455f4091f5fb7c7fc
actuals:
  tokens: 9000
  tasks: 3
  commits: 3
metrics:
  completed: 2026-11-18
---

# Fase 3 Plano 22: Home nova

A Home passa a mostrar o Core Value: o Pode gastar do perfil atual grande dentro do arco, o valor por dia, a pilula de ritmo de 5 niveis, os quatro atalhos e as secoes do `HomeSections`, tudo vindo da `BudgetView` do nucleo, com aviso de dado velho que suspende o veredito.

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Tracer: do Pode gastar calculado ao hero na tela | 2035ee0b | DashboardPage.tsx, BankStatusNotice.tsx (removido), bank-ui-copy.test.js, phase3-home-cards.test.js |
| 2 | Estados da Home e regiao viva | 2e1c9b27 | DashboardPage.tsx |
| 3 | Guarda estatica da Home | 47598ad1 | phase3-home.test.js |

Gate do tracer cumprido (modo interativo, `<verify>` automatizado): `test:static`, `build` e `lint` verdes antes de expandir.

## Resultados dos portoes

- `npm run test:core:tz`: 234 passam, 0 falham (UTC e Asia/Tokyo).
- `npm run test:static`: 163 passam, 0 falham, 1 pulado pre-existente (7 testes novos em `phase3-home.test.js`).
- `npm run test:rules`: 12 passam, 0 falham.
- `npm run test:emu`: 58 passam, 0 falham.
- `npm --prefix server test`: 81 passam, 0 falham.
- `npm run build`: passa; aviso de chunk acima de 500 kB e pre-existente.
- `npm run lint`: 0 erros, 2 avisos `react-hooks/incompatible-library` pre-existentes.
- Unica exclusao nos commits: `BankStatusNotice.tsx`, intencional. `CouplePage.tsx`, `HomeSections.tsx`, `markAsPaid`, `useFixedExpenses.ts` e `fixedExpenses.service.ts` intactos.

## Mitigacoes

- T-03-75: a pagina so le a `BudgetView`; com `view` nula (carregando ou erro) nao renderiza valor; a guarda falha se aparecer `R$ 0`, formula de orcamento, Recharts ou `useTransactions`.
- T-03-76: `verdictSuppressed` neutraliza o arco e o valor e a pilula vira "Aguardando dados do banco"; `StaleNotice` ligado na ordem certa (guarda confere).
- T-03-95: nenhum `console.*` na pagina; mensagens de erro fixas; a regiao viva repete so o numero ja visivel.

## Requisitos

Marcados como concluidos pelo que o plano entrega de fato, com o conjunto 03-10 a 03-21 ja montado:

- LIM-03 (Gasto geral nas linhas de limite da Home, descontado no Pode gastar pelo nucleo), LIM-04 (Pode gastar, por dia e ritmo na Home), LIM-05 (O mes em uma conta com chip de estimativa), LIM-06 (renda esperada em Configuracoes pelo `CycleIncomeCard` e Home separando esperado de recebido), LIM-08 (aviso de dado velho e veredito suspenso), LIM-09 (quatro atalhos), CENT-01 (pagina `/limites` e cartao-resumo na Home) e CENT-06 (Contas Fixas continua em `/contas-fixas` e a Home tem o resumo com atalho).
- IDEN-07: revisado. Tinha sido marcado cedo no 03-02 (so fontes e tokens). Agora tem lastro: a navegacao do `NavRail` (03-18) alcanca `/limites` e `/contas-fixas`, as rotas existem (03-21) e a Home liga a ambas. Fica marcado; a conferencia no aparelho e do UAT (03-23).
- LIM-02 ja constava concluido (03-21). LIM-01 e CENT-05 (03-19) e CENT-02 (03-21) inalterados. LIM-07 e LIM-10 nao sao deste plano.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Teste de outro plano quebrado pela remocao do BankStatusNotice**
- **Found during:** Task 1
- **Issue:** `test/static/phase3-home-cards.test.js` (03-16) exigia que `BankStatusNotice.tsx` seguisse existindo ate o Plano 22; o `git rm` do plano o derrubaria.
- **Fix:** o teste agora exige que o arquivo nao exista. O arquivo nao esta em `files_modified`, mas o plano quebra a asserção de proposito e a regra do pedido e atualizar na mesma tarefa.
- **Files modified:** test/static/phase3-home-cards.test.js
- **Commit:** 2035ee0b

Fora isso, plano executado como escrito. Escolha de implementacao dentro do plano: o aviso de erro usa `Button` `outline` `sm` (44px) dentro do `Notice`; o botao "Informar renda esperada" e um `Link` com as classes do botao primario (o `Button` nao tem `asChild`).

## Known Stubs

Nenhum de dados. Ressalva: o ramo do Porquinho passa contagens zeradas ao `CentralSummaryCard` (texto "Nenhum limite definido ainda"), porque o plano manda nao consultar o ciclo ali; a casca nunca leva a Home ao Porquinho (UI-SPEC S1), entao o ramo e so defensivo.

## Threat Flags

Nenhum. Sem endpoint, rede nova nem coleção nova.

## Verificacao nao feita

Sem jsdom nem navegador (PR-16): arco animado, rolagem e destaque dos atalhos, o anuncio da regiao viva em leitor de tela, o layout a 360px e a troca de estados reais (sem renda, ciclo passado, dado velho) ficam para o UAT humano do Plano 23. O toast "Lançado em {hoje}, fora do ciclo que você está vendo" (P-07) nao faz parte deste plano.

## Self-Check: PASSED

- `src/pages/DashboardPage.tsx` e `test/static/phase3-home.test.js` existem; `src/components/dashboard/BankStatusNotice.tsx` nao existe mais.
- Commits 2035ee0b, 2e1c9b27 e 47598ad1 existem; contagem medida `rev-list f803f20b..HEAD` = 3.
