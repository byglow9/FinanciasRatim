---
phase: quick-261118-mkh
plan: 01
subsystem: ui, settings, data-layer
tags: [uat-gaps, code-review, cycle-selector, calendar, settings-transaction, idempotent-writes]
requires:
  - phase: 03-limites-pode-gastar-e-central
    provides: Home, dock, LaunchSheet, núcleo de limites e avisos, 03-REVIEW.md e 03-UAT-GUIDE.md
provides:
  - tokens de ação em hex literal (bg-action, text-action-text) e tema claro único
  - dock de 8 destinos; Central de Limites removida; avisos levam à Home com a linha expandida
  - seletor de ciclo único (CycleSelector redesenhado) para Transações, Calendário e Contas Fixas
  - Calendário com legenda e + ao lado do alternador e grade de tela cheia
  - settingsStatus/reloadSettings, gravação de configurações por transação (CR-01, WR-01)
  - núcleo puro withTimeout, paymentDocId, reconcileCategoryDefs
affects: [fase-3.1, verificacao-fase-3]
tech-stack:
  added: []
  patterns:
    - "atualizador puro aplicado dentro de runTransaction sobre o documento atual"
    - "ID de documento do cliente reaproveitado entre tentativas (setDoc idempotente)"
    - "mês do ciclo memoizado por cycle.key (useCycleMonth)"
key-files:
  created:
    - src/lib/limitHash.ts
    - src/lib/cycleMonth.ts
    - src/lib/errors.ts
    - src/hooks/useCycleMonth.ts
    - shared/core/async.js
    - shared/core/ids.js
    - test/static/phase3-gaps.test.js
  modified:
    - src/index.css
    - index.html
    - src/components/ui/button.tsx
    - src/components/layout/CycleSelector.tsx
    - src/components/launcher/LaunchSheet.tsx
    - src/contexts/AreaContext.tsx
    - src/services/settings.service.ts
    - src/pages/CalendarPage.tsx
    - src/pages/DashboardPage.tsx
    - src/pages/SettingsPage.tsx
  deleted:
    - src/pages/LimitsPage.tsx
    - src/components/dashboard/CentralSummaryCard.tsx
key-decisions:
  - "Central de Limites removida por decisão do dono: D-20 e D-21 substituídos; CENT-01 e CENT-02 obsoletos"
  - "Contas Fixas mantém os três cartões de total e o + Nova; só o seletor de mês do meio saiu (correção do dono)"
  - "Calendário mantém o detalhe do dia abaixo da grade (não virou Sheet); só a linha do seletor de mês saiu (correção do dono)"
  - "CycleSelector esconde os chevrons laterais quando o contêiner tem menos de 232px livres, para o rótulo nunca truncar"
status: complete
metrics:
  tasks: 3
  commits: 10
  plan_head_before: 4ee46c76593b1c6735de85b0879ea17fd0e2a8eb
  completed: 2026-11-18
actuals:
  tasks: 3
  commits: 10
---

# Quick 261118-mkh: lacunas do UAT e revisão de código da Fase 3 Summary

Botões de ação com fundo e texto em tokens de hex literal, Central de Limites fora do app, um só seletor de ciclo (o do topo) para Transações, Calendário e Contas Fixas, LaunchSheet sem rolagem em 360x640, e CR-01, WR-01, WR-03, WR-07 e WR-08 da revisão corrigidos, com testes puros e guarda estática.

## Commits (10, medidos de `4ee46c76..HEAD`)

| # | Hash | Assunto |
|---|------|---------|
| 1 | 4cf91eb2 | tokens `--color-action`/`--color-action-text`, `color-scheme`, `iconSm` (Marcar pago quadrado), guarda `phase3-gaps` |
| 2 | b71d3710 | LaunchSheet cabe sem rolagem em 360x640 e 390x844 |
| 3 | ad13e6f8 | remove a Central de Limites; dock com 8 destinos; hash `#cat-` na Home |
| 4 | 1af8926b | seletor de ciclo único e CycleSelector redesenhado |
| 5 | 8c71bca9 | Calendário: legenda e + na linha do alternador, grade de tela cheia |
| 6 | b1a4bd2b | núcleo puro `withTimeout`, `paymentDocId`, `reconcileCategoryDefs` (testes antes, vermelho depois verde) |
| 7 | a70a6f48 | CR-01 e WR-01 (mais o lado de configurações do WR-03) |
| 8 | a18022fc | WR-03 em Transações |
| 9 | 10f3c43b | WR-07 e WR-08 |
| 10 | 4c5a74b4 | `color-scheme: only light` |

## Verificação final (todas verdes)

| Comando | Resultado |
|---------|-----------|
| `npm run test:core:tz` | 253 passam em UTC e 253 em Asia/Tokyo, 0 falhas |
| `npm run test:static` | 190 passam, 0 falhas |
| `npm run test:rules` | 12 passam, 0 falhas |
| `npm run test:emu` | 58 passam, 0 falhas |
| `npm --prefix server test` | 81 passam, 0 falhas |
| `npm run build` | verde |
| `npm run lint` | 0 erros, 2 avisos antigos (`react-hooks/incompatible-library` no formulário de notas, fora do escopo) |

## Item 1: diagnóstico dos botões sem fundo

Reproduzido pelo dono no Chrome de desktop (localhost:5173), com texto branco sobre fundo claro no Entrar, no Lançar gasto, no chip Conta e na categoria selecionada.

**O que medi** (Chrome 152 headless, 390x800, toque, servidor de dev com `VITE_USE_EMULATOR=true`, script CDP descartável fora do repositório):

- Tema claro, `prefers-color-scheme: dark` emulado e `--enable-features=WebContentsForceDark` (escurecimento automático do Chrome): o fundo de todo elemento de ação computa `rgb(20, 83, 45)` com texto `rgb(255, 255, 255)`. No sheet, no dock ativo, no chip Conta, na categoria selecionada e no CTA, também depois das mudanças.
- `forced-colors: active` troca as cores por cores do sistema (fundo branco, texto preto/azul), o que é o comportamento esperado do modo de alto contraste, não o defeito descrito (texto branco sobre fundo claro).
- Tokens: `--primary` vale `143.8 61.2% 20.2%` em tempo de execução, não há `.dark` aplicado (`AreaContext` o remove), e o formato `hsl(var(--x))` resolve certo.

**Causa não reproduzida.** Nenhuma rodada produziu fundo ausente.

**O que apliquei (endurecimento):**

- `--color-action: #14532d` e `--color-action-text: #ffffff` em `@theme inline` (hex literal, sem `hsl(var(...))` nem o nome `primary`). Todo `bg-primary` sólido, `text-primary-foreground` e `hover:bg-primary/90|80` de `src/` virou `bg-action`, `text-action-text`, `hover:bg-action/90|80` (17 arquivos). Tintas (`bg-primary/10`) e `text-primary` ficam.
- `color-scheme: only light` no `:root` e `<meta name="color-scheme" content="only light">`, contra escurecimento automático do navegador.
- Guarda `phase3-gaps`: os dois tokens são hex literais e `--color-action` fica a 1 por canal do triplete de `--primary`; nenhum arquivo de `src/` usa `bg-primary` sólido nem `text-primary-foreground`; o dock ativo usa `bg-action text-action-text`.

**O que não pude confirmar:**

- A causa real no Chrome do dono. A hipótese mais coerente com "texto branco sobre fundo claro" é um escurecimento automático ou extensão (Dark Reader, Auto Dark Mode) que inverte o fundo de ação e preserva o branco do texto. É hipótese, não confirmada.
- Com a flag `WebContentsForceDark` do Chrome 152 headless a página continuou escurecida mesmo com `only light`, então não consegui provar que o opt-out funciona nesse caminho (e, nesse caminho, o fundo de ação seguiu escuro, sem reproduzir o defeito). O dono deve confirmar no navegador dele, informando versão do Chrome e se tem extensão de tema escuro ou a flag "Auto Dark Mode for Web Contents".
- Não apliquei `forced-color-adjust: none`: em modo de alto contraste ele tira do usuário a cor que ele escolheu, e o defeito relatado não é esse modo.

Dock: o item ativo é o único com fundo de ação, então o sumiço do ícone ao tocar tem a mesma causa e a mesma correção; não criei outro mecanismo.

## Item 3: LaunchSheet sem rolagem (medido)

`scrollHeight` do painel versus `clientHeight` (painel limitado a 92dvh), detalhes recolhidos:

| Tela / aba | Antes | Depois |
|------------|-------|--------|
| 360x640 Gasto e Receita | 806 / 589 (rola 217px) | 586 / 586 (não rola) |
| 360x640 Porquinho | 702 / 589 | 534 / 534 |
| 390x844 Gasto e Receita | 806 / 776 (rola 30px) | 718 / 718 |
| 390x844 Porquinho | 702 / 702 | 650 / 650 |

Mudanças: chips Conta e Cartão (em breve) na linha do rótulo Categoria; aviso de valor zero divide a linha da legenda; margens `mt-3/mt-4` para `mt-2`; teclas e CTA por altura de tela (56px, 48px até 760px, 44px até 700px, nunca abaixo de 44px); em 700px ou menos de altura o círculo da categoria fica em 44px e o valor digitado usa o degrau de 28px. Nenhuma função nem chip foi removido. O `Sheet` compartilhado não foi alterado.

## Item 5: Marcar pago não circular

Causa: a 03-08 deu `rounded-btn` (16px) a todos os tamanhos do `Button`, e 16px de raio em 32px é um círculo; `className` `h-8 w-8` não troca o raio porque o tailwind-merge não reconhece `rounded-btn`. Correção: tamanho `iconSm` (`h-8 w-8 rounded-md p-0`) no `Button`; a lista móvel de Contas Fixas e os botões de editar e apagar dos painéis do Calendário usam `size="iconSm"`.

## Itens 4, 6, 7 (e correções do dono)

Correções do dono que substituíram o texto do plano:

- **Contas Fixas:** mantidos os cartões Total Mensal, Pagas e Pendentes e o + Nova. Saiu só o seletor de mês do meio. O plano propunha remover Pagas e Pendentes; isso não foi feito. A suposição do "elemento extra" do plano deixa de existir.
- **Calendário:** mantido o detalhe do dia abaixo da grade (não virou Sheet). Saiu só a linha do seletor de mês. A legenda (ícone Info, 44px) e o + (44px, `Button` padrão em `bg-action`; antes era verde-500 com texto branco, sem contraste) ficam na linha do alternador Financeiro/Agenda. Existe um só alternador (não há duplicado). Como a grade agora ocupa a tela e o detalhe nasce abaixo dela, ao tocar num dia a página rola até o detalhe, acima do dock.
- **Transações:** seletor de mês do meio removido.

Detalhes:

- `useCycleMonth()` deriva o mês-calendário do ciclo escolhido no topo (`cycleMonthDate`, primeiro dia do mês em que o ciclo começa) e memoiza por `cycle.key`. Medido em MOCK: 0 mutações de DOM em 3s paradas, antes e depois de trocar o ciclo, nas três telas, ou seja, sem laço de refetch.
- Calendário: na janela 390x844 a grade mede 548px (65% da altura), termina a 732px e o dock começa a 762px; células `min-h-0` com `grid-rows-6` (a altura usa `max(320px, 100dvh - 296px)`). Cada célula tem 91px de altura. Vale para a grade do Financeiro e da Agenda.
- CycleSelector: rótulo "Novembro" mede 89px, sem truncar a 360px e a 390px. O contêiner do seletor tem 152px livres a 360px e 182px a 390px; por isso os chevrons laterais só aparecem quando o contêiner tem 232px ou mais (tablet e desktop). Em celular o rótulo ganhou um `ChevronDown` de 16px e a navegação é pela lista. Um rótulo de intervalo como "15 nov a 14 dez" mede 118px e cabe nos 152px (cálculo com a mesma fonte; não testei com dia de salário diferente de 1 no app). Lista: painel `rounded-[22px] bg-surface-2 border shadow-float p-2` de `min(320px, 100vw - 32px)`, grupos por ano, linhas de 48px com o rótulo, chip "Atual" no ciclo atual, período `dd/mm a dd/mm` em 12 muted e `Check` na linha selecionada; papéis listbox/group/option, setas, Home, End, Esc e foco inicial no selecionado preservados.

## Item 7: Central de Limites removida (decisão do dono)

`LimitsPage`, `CentralSummaryCard`, a rota `/limites` e o destino do dock saíram. **D-20 (dock com 9 destinos, incluindo a Central) e D-21 (a Central só exibe) ficam substituídos; CENT-01 e CENT-02 ficam obsoletos.** D-12 e D-21 seguem valendo para a edição de limites em Configurações > Categorias. A Home mostra todas as linhas de "Limites do mês" (sem o corte em 6 e sem "Ver os outros"), e os avisos da Home e do sino vão para `/#cat-<id>`, onde a linha abre expandida e a seção rola até ela (`expandIdFromHash`: só aceita `#cat-`, decodifica dentro de try, o hash nunca vira seletor). Na aba Porquinho a Home mostra só o aviso, sem link. `BudgetView.counts` ficou no núcleo, sem consumidor de tela. Guardas antigas e o `03-UAT-GUIDE.md` foram atualizados (a guarda `phase3-central` virou guarda de ausência); os requisitos CENT-01 e CENT-02 seguem listados nos planos antigos por histórico.

## Correções da revisão

- **CR-01:** `settingsStatus` (`loading | ready | error`) e `reloadSettings()` no contexto; `loading` continua como `settingsStatus === 'loading'`. Todo gravador (`updateTabNames`, `updateCategoryDefs`, `updatePersonConfig`, `updateNotifications`, `updateTheme`) lança, antes de qualquer escrita, um erro pt-BR (`code: 'settings-not-ready'`) fora de `ready`. O `catch` de carga marca `error` sem registrar valores. Home e Configurações mostram "Não foi possível carregar suas configurações." com "Tentar de novo"; Configurações mostra esqueleto neutro enquanto carrega e nenhum cartão editável fora de `ready`; `useCycleBudget` e o avaliador de avisos só rodam com `ready`.
- **WR-01:** `updatePersonConfig(person, atualizador)` e `updateCategoryDefs(atualizador)` aplicam um atualizador puro dentro de `runTransaction` sobre o documento atual (`personConfig.<pessoa>` por caminho pontilhado; `categoryDefs` e `categories` juntos via `reconcileCategoryDefs`) e devolvem o valor gravado, que o contexto passa a guardar. `CycleIncomeCard` e `CategoryEditorSheet` passam atualizadores que reaplicam os auxiliares do núcleo; a pré-validação sobre o snapshot continua e um erro de regra (Error sem `code`) vira mensagem sob o campo, enquanto falha de rede/permissão/prazo (com `code`) segue como falha de conexão. O caminho MOCK lê, aplica e grava sem transação.
- **WR-03:** `bumpData()` após salvar limite alterado, renda e dia do salário (neste, depois do `rekeyForSalaryDay`) e após adicionar, editar e apagar em Transações (na página, não em `useTransactions`); `cycleKey` entrou nas dependências do avaliador (virada de ciclo com a aba aberta reavalia).
- **WR-07:** `markAsPaid` grava por `setDoc` com ID `<conta>__<ano>-<mm>` (`paymentDocId`). `togglePaid` ignora chamada reentrante por conta (`useRef`) e desmarcar apaga todos os pagamentos da conta no mês (há duplicados legados). Na Home, o conjunto de chaves pendentes desabilita o botão e põe `aria-busy`, e sai no `finally`. Medido em MOCK: três toques seguidos geram um único pagamento (`fx1__2026-11`).
- **WR-08:** a gravação do LaunchSheet vai por `withTimeout` de 8 000 ms com ID de documento gerado no cliente uma vez por montagem do formulário (`newTransactionId`/`newSavingsId`) e reaproveitado na nova tentativa; `addTransaction` e `addSavingsTransaction` aceitam o `id` e gravam sempre por `setDoc`. Em timeout aparece "Sem confirmação do servidor. Confira em Transações antes de tentar de novo." com "Tentar de novo", `saving` é liberado no `finally` e os dígitos ficam. Medido em MOCK: duplo clique no CTA grava um único lançamento.

## Deviations from Plan

### Correções do dono (substituem o plano)

1. Contas Fixas mantém Total Mensal, Pagas, Pendentes e + Nova; só o seletor de mês do meio saiu (o plano removia Pagas e Pendentes).
2. Calendário mantém o detalhe do dia como painel (o plano o transformava em Sheet); só a linha do seletor de mês saiu.
3. Transações perdeu o seletor de mês do meio (como o plano).
4. Item 1: endurecimento dos tokens, `color-scheme only light`, investigação registrada acima.
5. Central removida (como o plano), com D-20/D-21 e CENT-01/CENT-02 registrados como obsoletos.

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Guardas estáticas atualizadas ao padrão novo**
- **Found during:** Tarefas 1 a 3
- **Issue:** guardas antigas exigiam `bg-primary text-primary-foreground`, a rota `/limites`, `max={6}`, `CentralSummaryCard`, o gravador de configurações no formato velho e `addDoc` nos serviços.
- **Fix:** expectativas trocadas pelas equivalentes novas (`phase3-primitives-restyle`, `phase3-settings-cycle`, `phase3-settings-categories`, `phase3-shell`, `phase3-final`, `phase3-home-*`, `phase3-topbar`, `category-ids`, `phase3-central`). Em `transactions.service.ts` e `savings.service.ts` a gravação passou a ser sempre `setDoc` (com ID do cliente quando o chamador não passa um), porque a guarda `owner-queries` exige `ownerId: ownerId()` dentro de cada `setDoc`/`addDoc`.
- **Commits:** 4cf91eb2, ad13e6f8, a70a6f48, 10f3c43b

**2. [Rule 3 - Blocking] Regras de lint do React Compiler em `AreaContext`**
- **Found during:** Tarefa 3
- **Issue:** ao refatorar o carregamento com `useCallback`, `react-hooks/set-state-in-effect` passou a acusar o efeito de carga e o efeito antigo que sincroniza a aba com a pessoa do claim.
- **Fix:** dois `eslint-disable-next-line react-hooks/set-state-in-effect` justificados (carga de dados só atualiza estado após o `await`; sincronização de aba é código anterior).
- **Commit:** a70a6f48

**3. [Rule 2 - Missing critical] Erro de regra distinguido de falha de conexão**
- **Found during:** Tarefa 3 (WR-01)
- **Issue:** com o atualizador rodando dentro da transação, um erro de regra do núcleo chegaria ao `catch` como "Não foi possível salvar".
- **Fix:** `src/lib/errors.ts` (`isRuleError`: Error sem `code`; o erro de configuração não carregada e os de rede/prazo têm `code`), usado nos dois editores.
- **Commit:** a70a6f48

**4. [Rule 2 - Missing critical] Rolagem do detalhe do dia no Calendário**
- **Found during:** Tarefa 2
- **Issue:** com a grade ocupando a tela, o painel de detalhe nasce fora da área visível.
- **Fix:** `scrollIntoView` do painel ao escolher um dia, com `scroll-mb-32` para parar acima do dock.
- **Commit:** 8c71bca9

### Outras escolhas fora do texto literal do plano

- `useCycleMonth` (hook compartilhado) em vez de um `useMemo` em cada página; a memoização por `cycle.key` é a mesma e a guarda confere o hook e as três páginas.
- Em Transações e Contas Fixas o título (H1) agora aparece também no celular, no lugar do seletor de mês que ocupava a linha.
- O valor do sheet de lançamento cai para o degrau de 28px em telas de até 700px de altura (a UI-SPEC prevê 56px); era a alavanca que faltava para caber em 360x640 sem rolagem.
- `bg-action` aplicado também fora da lista de arquivos do plano (por exemplo o + do Calendário), porque a guarda cobre todo o `src/`.

## Known Stubs

Nenhum introduzido.

## Threat Flags

Nenhum novo. T-qk-01 a T-qk-03, T-qk-05 e T-qk-06 do plano estão cobertos (bloqueio fora de `ready`, transação, hash só por `getElementById`, IDs determinísticos e de cliente, prazo de 8 s, sem valores em log). T-qk-04 aceito: as regras por dono continuam sendo a barreira.

## Pendências (não feitas, por escopo)

- 03-REVIEW.md: **WR-02, WR-04, WR-05, WR-06, WR-09 e IN-01 a IN-10** seguem abertos.
- Casal e Relatórios continuam com o `MonthSelector` de grade (o componente não foi apagado); redesenho amplo das abas e de Casal/Relatórios/Porquinho é da Fase 3.1.
- O recorte de Transações, Calendário e Contas Fixas é o mês-calendário em que o ciclo começa (aproximação quando o dia do salário não é 1); o recorte exato fica para a Fase 3.1.
- Na aba Porquinho o `CycleSelector` não aparece (D-02), mas Transações, Calendário e Contas Fixas continuam acessíveis e seguem o deslocamento de ciclo vigente sem controle visível.
- Em celular o `CycleSelector` perde os chevrons de ciclo anterior e próximo (ficam só a lista e o `ChevronDown`). Se o dono preferir os chevrons, o custo é o rótulo truncar a 360px ou o `TopBar` ganhar uma segunda linha.
- LIM-07 segue pendente de confirmação humana no aparelho (guia `03-UAT-GUIDE.md`).
- CENT-01 e CENT-02 obsoletos; D-20 e D-21 substituídos (registrado acima).

## Sem poder confirmar

- A causa real do fundo ausente no Chrome do dono (item 1); o dono confirma no navegador dele depois deste build.
- O comportamento real contra o Firestore de produção das gravações novas: `runTransaction` em `settings/main`, `setDoc` com ID do cliente em `transactions`, `savings` e `fixedExpensePayments`. `test:rules` e `test:emu` passam, mas não exercitam esses caminhos; a verificação funcional foi em MOCK.
- O caminho de timeout do LaunchSheet (8 s) em runtime: coberto por teste puro de `withTimeout` e pela guarda estática, não simulei rede caindo.
- Rótulo de ciclo com dia de salário diferente de 1 no app (medi "Novembro" e calculei o intervalo mais longo).
- Se o `only light` evita o escurecimento automático no Chrome do dono (não funcionou com a flag em headless).

## Self-Check: PASSED

Arquivos criados conferidos no disco (`src/lib/limitHash.ts`, `src/lib/cycleMonth.ts`, `src/lib/errors.ts`, `src/hooks/useCycleMonth.ts`, `shared/core/async.js`, `shared/core/ids.js`, `test/static/phase3-gaps.test.js`); `src/pages/LimitsPage.tsx` e `src/components/dashboard/CentralSummaryCard.tsx` ausentes; os 10 hashes existem em `git log`; `.env.local`, `.planning/state.json` e `.planning/milestone.lock` fora dos commits.
