---
phase: 06-cart-o-de-cr-dito
plan: 09
subsystem: cartao-de-credito
tags: [configuracoes, ui, cartao, fechamento, vencimento]
status: complete
requires: [06-07]
provides:
  - "AccountsCard: cartao Contas e cartoes com a lista de cartoes, dono e resumo Fecha dia X e Vence dia Y (CARD-08, CARD-02)"
  - "CardSettingsSheet: folha de apelido, dia de fechamento e dia de vencimento, gravando por saveCardSettings (D-06, D-09)"
  - "phase6-settings.test.js: guarda de ancora, seletores de dia, somente leitura, apelido e ordem dos cartoes"
affects: [06-10, 06-13]
key-files:
  created:
    - src/components/settings/AccountsCard.tsx
    - src/components/settings/CardSettingsSheet.tsx
    - test/static/phase6-settings.test.js
  modified:
    - src/pages/SettingsPage.tsx
    - test/static/phase3-settings-cycle.test.js
    - test/static/phase3-settings-categories.test.js
    - test/static/phase3-final.test.js
    - test/static/phase4-settings.test.js
    - test/static/phase5-install.test.js
  deleted:
    - src/components/settings/AccountsSkeletonCard.tsx
decisions:
  - "Datas ainda nao informadas aparecem sem selecao no DayPicker (valor 0), nunca com dia inventado; salvar com uma data vazia e permitido e a folha avisa que a fatura fica sem status"
  - "Dois DayPicker na mesma folha ganham nome acessivel por role=group com aria-labelledby, sem mexer no DayPicker compartilhado"
  - "Em somente leitura o toque na linha chama guard('editar') e nem abre a folha; a folha repete o guard antes de gravar"
commits: 3
plan_head_before: 20a88314840406faf72c8d5c2b56bdd62230a273
actuals:
  tokens: 14000
  tasks: 3
  commits: 3
---

# Phase 6 Plan 09: Configuracoes do cartao Summary

O cartao "Contas e cartoes" deixou de ser "em breve": lista cada cartao conectado do casal com apelido (ou nome do cartao), dono pelo `settings.tabNames` e "Fecha dia 7 · Vence dia 14", e abre uma folha para informar apelido (ate 24), dia de fechamento e dia de vencimento por duas grades de 1 a 31, gravando por `saveCardSettings` do 06-07.

## Tarefas

| Tarefa | Commit | O que entrega |
| ------ | ------ | ------------- |
| 1 | bbd50c5b | `AccountsCard` e `CardSettingsSheet` |
| 2 | 43f7eb8b (+ 40a747ad, ver desvios) | `SettingsPage` com `AccountsCard` na posicao do esqueleto, esqueleto removido, cinco guardas atualizadas |
| 3 | a9539008 | `phase6-settings.test.js` (7 testes) |

## Comportamento

- Estados em portugues: carregando (dois blocos neutros com `aria-busy`), vazio ("Nenhum cartao conectado ainda" com link para `/configuracoes#bancos`) e erro (`Notice` com "Tentar de novo").
- Cartao sem as duas datas mostra o chip de atencao "Informe fechamento e vencimento"; a folha explica que o MeuPluggy nao entrega as datas (D-06) e avisa que sem as duas a fatura fica sem status.
- Erro de gravacao mostra "Nao foi possivel salvar. Tente de novo." sem fechar a folha; sucesso fecha e mostra "Salvo".
- Apelido so como texto React, `maxLength` 24 na interface e limite igual no servico; sem HTML bruto, sem emoji, so `text-base`/`text-xs`, pesos 400/700, alvos de 44px ou mais.

## Verificacao

- `node --test test/static/phase6-settings.test.js`: 7 de 7
- Guardas de Configuracoes (phase3-settings-cycle, phase3-settings-categories, phase3-final, phase4-settings, phase5-install): 43 de 43
- `npm run test:core:tz`: 875 de 875 (UTC e Asia/Tokyo)
- `npm run build`: sem erros; `npm run lint`: 0 erros
- `npm run test:static`: 653 passam e 2 falham, ambas em arquivos de outros planos ainda em edicao: `phase3-gaps` (LaunchSheet, 06-17) e `phase6-cards-ui` "alvo minimo de 44px" (`BillHistoryList.tsx`, 06-10). Nenhuma toca arquivos do 06-09; devem ser reconferidas quando esses planos terminarem.
- Sem rede, sem segredos, sem pacote novo, sem deploy nem push.

## Deviations from Plan

**1. [Rule 3 - Blocking] Delecao do esqueleto entrou no commit do 06-10**
- **Found during:** Task 2
- **Issue:** `git rm` do `AccountsSkeletonCard.tsx` deixou a delecao no indice compartilhado e um commit paralelo do 06-10 (40a747ad) a levou junto. O 43f7eb8b nao a contem.
- **Fix:** nenhuma; o arquivo nao existe mais na arvore nem no HEAD, e a guarda `phase6-settings` confere isso.
- **Commit:** 40a747ad

**2. [Rule 1 - Bug] DayPicker sem selecao nao tem parada de Tab**
- **Found during:** Task 1
- **Issue:** com data ainda nao informada, nenhum botao da grade tem `tabIndex` 0 (o `DayPicker` so deixa o dia escolhido focavel). No toque nao ha efeito; por teclado a grade so e alcancavel depois de escolher com o mouse ou toque.
- **Fix:** nao corrigida, porque `DayPicker.tsx` esta fora de `files_modified` e e compartilhado com o cartao de salario. Ajuste sugerido: `tabIndex` 0 tambem no dia 1 quando `value < 1`.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum alem do registro do plano. T-06-32 (apelido como texto React, limite 24 na interface e no servico, guarda contra HTML bruto), T-06-33 (`guard('editar')` antes de gravar) e T-06-34 (resumo sempre visivel e aviso quando falta uma data) mitigados.

## Self-Check: PASSED

Arquivos criados existem, o esqueleto nao existe, e os commits bbd50c5b, 43f7eb8b e a9539008 existem no historico.
