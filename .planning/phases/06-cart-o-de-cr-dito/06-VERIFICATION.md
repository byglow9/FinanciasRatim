---
phase: 06-cart-o-de-cr-dito
verified: 2026-11-25T23:00:00Z
status: human_needed
score: 8/8 verdades do ROADMAP verificadas por código e teste; 0 falhas
covered_files:
  - .planning/REQUIREMENTS.md
  - .planning/phases/06-cart-o-de-cr-dito/06-01-PLAN.md
  - .planning/phases/06-cart-o-de-cr-dito/06-01-SUMMARY.md
  - .planning/phases/06-cart-o-de-cr-dito/06-02-PLAN.md
  - .planning/phases/06-cart-o-de-cr-dito/06-02-SUMMARY.md
  - .planning/phases/06-cart-o-de-cr-dito/06-03-PLAN.md
  - .planning/phases/06-cart-o-de-cr-dito/06-03-SUMMARY.md
  - .planning/phases/06-cart-o-de-cr-dito/06-04-PLAN.md
  - .planning/phases/06-cart-o-de-cr-dito/06-04-SUMMARY.md
  - .planning/phases/06-cart-o-de-cr-dito/06-05-PLAN.md
  - .planning/phases/06-cart-o-de-cr-dito/06-05-SUMMARY.md
  - .planning/phases/06-cart-o-de-cr-dito/06-06-PLAN.md
  - .planning/phases/06-cart-o-de-cr-dito/06-06-SUMMARY.md
  - .planning/phases/06-cart-o-de-cr-dito/06-07-PLAN.md
  - .planning/phases/06-cart-o-de-cr-dito/06-07-SUMMARY.md
  - .planning/phases/06-cart-o-de-cr-dito/06-08-PLAN.md
  - .planning/phases/06-cart-o-de-cr-dito/06-08-SUMMARY.md
  - .planning/phases/06-cart-o-de-cr-dito/06-09-PLAN.md
  - .planning/phases/06-cart-o-de-cr-dito/06-09-SUMMARY.md
  - .planning/phases/06-cart-o-de-cr-dito/06-10-PLAN.md
  - .planning/phases/06-cart-o-de-cr-dito/06-10-SUMMARY.md
  - .planning/phases/06-cart-o-de-cr-dito/06-11-PLAN.md
  - .planning/phases/06-cart-o-de-cr-dito/06-11-SUMMARY.md
  - .planning/phases/06-cart-o-de-cr-dito/06-12-PLAN.md
  - .planning/phases/06-cart-o-de-cr-dito/06-12-SUMMARY.md
  - .planning/phases/06-cart-o-de-cr-dito/06-13-PLAN.md
  - .planning/phases/06-cart-o-de-cr-dito/06-13-SUMMARY.md
  - .planning/phases/06-cart-o-de-cr-dito/06-14-PLAN.md
  - .planning/phases/06-cart-o-de-cr-dito/06-14-SUMMARY.md
  - .planning/phases/06-cart-o-de-cr-dito/06-15-PLAN.md
  - .planning/phases/06-cart-o-de-cr-dito/06-15-SUMMARY.md
  - .planning/phases/06-cart-o-de-cr-dito/06-16-PLAN.md
  - .planning/phases/06-cart-o-de-cr-dito/06-16-SUMMARY.md
  - .planning/phases/06-cart-o-de-cr-dito/06-17-PLAN.md
  - .planning/phases/06-cart-o-de-cr-dito/06-17-SUMMARY.md
  - .planning/phases/06-cart-o-de-cr-dito/06-18-PLAN.md
  - .planning/phases/06-cart-o-de-cr-dito/06-18-SUMMARY.md
  - .planning/phases/06-cart-o-de-cr-dito/06-19-PLAN.md
  - .planning/phases/06-cart-o-de-cr-dito/06-19-SUMMARY.md
  - .planning/phases/06-cart-o-de-cr-dito/06-20-PLAN.md
  - .planning/phases/06-cart-o-de-cr-dito/06-20-SUMMARY.md
  - .planning/phases/06-cart-o-de-cr-dito/06-CONTEXT.md
  - server/scripts/card-history.js
  - server/scripts/reclassify-card-payments.js
  - server/src/card-payments.js
  - server/src/card-probe.js
  - server/src/card-sync.js
  - shared/core/cardAdopt.js
  - shared/core/cardBills.js
  - shared/core/cardCalendar.js
  - shared/core/cardInstallments.js
  - shared/core/cardManual.js
  - shared/core/cardPayments.js
  - shared/core/cardReconcile.js
  - shared/core/cardTx.js
  - shared/core/cards.js
  - src/components/cards/BillDetailSheet.tsx
  - src/components/cards/BillHistoryList.tsx
  - src/components/cards/BillPurchaseRow.tsx
  - src/components/cards/BillStatusChip.tsx
  - src/components/cards/BillSummary.tsx
  - src/components/cards/CardLimitCard.tsx
  - src/components/cards/UpcomingBills.tsx
  - src/hooks/useCardView.ts
  - src/hooks/useCards.ts
  - src/pages/CardsPage.tsx
  - src/services/cards.service.ts
covered_digest: "v1:sha256:a1eb9315e5e8e7fbeb0d18b8b422e54246b03f3aa537e310fd7c6ea48093320f"
behavior_unverified: 0
overrides_applied: 0
re_verification: nenhuma verificação anterior
gaps: []
deferred: []
human_verification:
  - test: "Ciclo diário do MeuPluggy (cerca de 11:46): abrir /cartoes e Transações antes e depois"
    expected: "Compras pendentes viram confirmadas sem aparecer em dobro (CARD-07 ao vivo)"
    why_human: "Depende do relógio do MeuPluggy; o mesmo cenário está provado no emulador, mas o ciclo real do banco não"
  - test: "Fechamento (08/12) e vencimento (14/12) da fatura do Nubank"
    expected: "Status Fechada em 08/12, vencimento no Calendário em 14/12, aviso no sino perto do vencimento, Atrasada se passar sem pagamento"
    why_human: "Depende do calendário real; as transições estão provadas só por teste com relógio injetado (CARD-08, CENT-03, CENT-04)"
  - test: "Pagar a fatura de verdade e abrir /cartoes depois do ciclo seguinte"
    expected: "Fatura vira Paga, o saldo cai só nesse momento, o pagamento aparece como transferência e não entra nos limites (CARD-04, CARD-06)"
    why_human: "Exige pagamento real; a detecção só foi exercitada com dados de teste"
  - test: "Primeira compra parcelada real no Nubank; rodar probe-card.js (somente leitura) e abrir a fatura"
    expected: "Registrar se vêm installmentNumber e totalInstallments; fatura mostra N/M e o que sai em cada fatura futura; regra de data e heurística conferem com o app do Nubank"
    why_human: "CARD-05 foi desenhado sem nenhuma compra parcelada real (D-06, D-07); é parcial por falta de dado, não por falha de código"
  - test: "Compra em dólar e IOF"
    expected: "Compra em reais com o valor original anotado, IOF em reais, total batendo com o app do Nubank (D-08)"
    why_human: "Depende de uma compra desse tipo"
  - test: "Compra feita no cartão, conferida logo depois"
    expected: "Não aparece na hora (comportamento certo, D-05 e D-14); a interface não promete tempo real"
    why_human: "Ritmo do MeuPluggy, só observável ao vivo"
  - test: "Dock de 9 destinos no celular a 360 px"
    expected: "9 ícones, o 5º (Cartões) abre /cartoes, nenhum cortado, sem rolagem lateral da página, alvos de pelo menos 44 px"
    why_human: "Aparelho real; o auditor CDP (scripts/ux-audit) não foi reexecutado nesta verificação"
  - test: "Lançar um gasto pelo chip Cartão e esperar a compra chegar do banco"
    expected: "Conta no Pode gastar e nos limites, não baixa o saldo, aparece na fatura aberta e continua um só lançamento depois da importação (D-12)"
    why_human: "Fluxo do dono com dado real"
  - test: "Histórico completo importado: meses antigos e quase-duplicados (nearMiss)"
    expected: "Meses antigos aparecem em Transações e /cartoes com total por fatura; o dono apaga à mão o que for repetido (D-13)"
    why_human: "Só o dono reconhece as compras; o estado de produção (historyBaselineAt aplicado, contagens do ensaio) não é verificável pelo repositório"
  - test: "Decisões abertas do dono: dia do fechamento conta para a fatura que fecha ou para a seguinte; menu de configuração por usuário"
    expected: "Conferir com compra real feita no dia 07 (CLOSING_DAY_STARTS_NEXT_BILL em cardBills.js); decidir sobre o menu por usuário"
    why_human: "Decisão de produto do dono, fora do escopo de fechamento da fase"
---

# Fase 6: Cartão de crédito — Relatório de verificação

**Objetivo da fase:** O usuário acompanha o cartão como conta própria (fatura, limite, vencimento e parcelas), sem contar a mesma despesa duas vezes, com escopo definido a partir do que o MeuPluggy realmente entrega.
**Verificado em:** 2026-11-25
**Status:** human_needed
**Reverificação:** Não, verificação inicial.

## Resumo

Nenhuma lacuna bloqueante. Todo o código prometido existe, é substantivo, está ligado de ponta a ponta (servidor, núcleo compartilhado, serviços, hooks, telas, dock, Calendário e sino) e a suíte completa foi reexecutada nesta verificação, toda verde. O status é `human_needed`, e não `passed`, por três motivos que não são falha: (1) CARD-05 (parcelas N/M) só pôde ser provado por heurística, pois não existe compra parcelada real (D-06, D-07); (2) comportamentos que dependem do calendário e do ciclo diário do MeuPluggy ainda não aconteceram (fechamento 07/12, vencimento 14/12, ciclo de 11:46); (3) itens de aparelho e de dinheiro real do `06-UAT-ROTEIRO.md` aguardam o dono.

## Suíte reexecutada nesta verificação

Ambiente `. ./scripts/dev-env.sh`, branch `main`, sobre o estado atual do repositório (só `.planning/state.json` modificado).

| Comando | Resultado |
|---------|-----------|
| `npm run test:core:tz` | 900 passam, 0 falham em UTC; 900 passam, 0 falham em Asia/Tokyo |
| `npm run test:server` | 124 passam, 0 falham |
| `npm run test:static` | 695 testes, 693 passam, 0 falham, 2 ignorados (já existentes) |
| `npm run build` | saída 0 (tsc -b e vite build; PWA com 22 entradas de pré-cache) |
| `npm run lint` | saída 0 |
| `npm run test:rules` | 13 passam, 0 falham |
| `npm run test:emu` | 153 passam, 0 falham |

Os números batem com os registrados em `06-VALIDATION.md` (nada a divergir).

## Verdades observáveis (critérios de sucesso do ROADMAP)

| # | Verdade | Status | Evidência |
|---|---------|--------|-----------|
| 1 | Existe registro do que o MeuPluggy devolve para o cartão e o escopo foi decidido a partir dele; sem fatura da Pluggy, a fatura sai dos dias informados pelo usuário | VERIFICADO | `06-CARD-PROBE-792a3230.md` (só formato: `balanceDueDate`, `balanceCloseDate`, `minimumPayment` nulos, faturas vazias, 6 compras todas pendentes, nenhuma com parcela) e decisões D-06 a D-10 em `06-CONTEXT.md`. O caminho CARD-08 existe de fato: `shared/core/cardBills.js` (`billMonthOf` usa o mês da Pluggy e cai para `derivedBillMonth` pelo fechamento do dono; `duePartsOf` e `cardBillStatus` usam fechamento e vencimento configurados; sem datas, status nulo e nada inventado) |
| 2 | Na Central, cada cartão mostra limite disponível, fatura aberta, fechamento e vencimento, próximas faturas, parcelas a vir (N/M e quanto sai em cada fatura futura) e status | VERIFICADO (parcelas: ver CARD-05) | `src/pages/CardsPage.tsx` (rota `/cartoes` em `src/App.tsx`) monta `CardLimitCard`, `BillSummary`, `BillHistoryList`, `UpcomingBills`, `BillDetailSheet`. `useCardView` lê compras reais do Firestore (`getCardTransactions`, índice ownerId+cardId+date presente em `firestore.indexes.json`) e calcula tudo no núcleo (`groupBills`, `cardLimitView`, `futureInstallments`). Status aberta, fechada, paga, atrasada e futura em `cardBillStatus`. Fluxo de dados real (nenhum valor fixo ou simulado fora de MOCK de desenvolvimento) |
| 3 | Compra conta nos limites pela data da compra; o saldo da conta não cai até o pagamento da fatura, tratado como transferência vinculada à fatura, nunca gasto | VERIFICADO | `shared/core/ledger.js`: `isOnCardTx` exclui compra e estorno do saldo e de `monthTotals`; `cardSpendCents` alimenta a linha "Compras no cartão"; o pagamento (`cardKind: 'payment'`, `transfer: true`) fica fora dos gastos. `shared/core/cardPayments.js` e `server/src/card-payments.js` ligam o pagamento à fatura por três fontes (crédito no cartão, texto na conta, transferência própria de valor igual), sem contar a mesma operação duas vezes. Provado em `ledger.test.js`, `budget.test.js`, `cardPayments.test.js` e `server/test/emu/card-payments.test.js` (verdes) |
| 4 | Compra pendente vira confirmada sem duplicar, mesmo quando o banco recria o identificador | VERIFICADO no emulador (ciclo real do banco: humano) | `shared/core/cardReconcile.js` e `syncCardTransactions` (`updates`, `rebinds`, `vanished`: só pendente sem par some, confirmada nunca). Testes do emulador exercitam o comportamento: "pendente vira confirmada com o mesmo id: so atualiza o status, sem segundo lancamento", "id recriado pelo banco: religa ao lancamento existente, sem duplicar e sem perder a categoria editada", "so pendente sem par some; confirmada que sumiu permanece", "resposta vazia da Pluggy nao apaga compra pendente" |
| 5 | Vencimentos de fatura aparecem no Calendário e nos alertas | VERIFICADO (disparo real: humano) | `shared/core/cardCalendar.js` (`cardBillEvents`, `cardBillAlerts`); `src/hooks/useCalendarData.ts` chama `cardBillEvents`; `src/components/layout/AlertsBell.tsx` usa `cardBillAlerts` e renderiza `CardBillRow` com a fatura fechada ou atrasada e não paga perto do vencimento. Provado em `cardCalendar.test.js`, `calendarModel.test.js` e `phase6-calendar.test.js` |
| 6 | Dock com o 9º destino Cartões (ícone de cartão, rótulo acessível), abre `/cartoes`, sem rolagem horizontal e sem alvo menor que 44 px a 360 px; Home mantém o resumo (D-11) | VERIFICADO em código (aparelho: humano) | `src/components/layout/NavRail.tsx`: 9 destinos, `/cartoes` com `CreditCard`, depois de Contas fixas e antes de Metas. `HomeCardSummary` segue em `src/components/dashboard/HomeSections.tsx`. Guardas `phase6-dock.test.js`, `phase6-final.test.js` ("o dock tem exatamente 9 destinos") e `phase6-audit.test.js`. O auditor CDP a 360x640 não foi reexecutado aqui |
| 7 | Gasto manual como Cartão: conta nos limites pela data, entra na fatura pelo fechamento, não baixa o saldo, e vira um só lançamento quando o banco o traz (D-12) | VERIFICADO | `src/components/launcher/LaunchSheet.tsx` grava só `cardId` e `cardKind` via `manualCardFields` (nunca billMonth, cardStatus nem source); `shared/core/cardManual.js`, `cardAdopt.js`; no servidor `planAdoptions`, `matchManualAdoptions` e `matchReverseAdoptions` em `server/src/card-sync.js`. Emulador: adoção para a frente, reassentamento, id recriado em compra adotada, "manual adotado e manual ainda sem par nunca sao removidos", segunda rodada sem alterar nada, manuais de outro casal nunca adotados |
| 8 | Todo o histórico do cartão é importado sem corte por idade e sem duplicar manuais antigos; reclassificação em massa só com ensaio e cópia de segurança (D-13) | VERIFICADO em código e emulador (estado de produção: humano) | `CARD_HISTORY_FLOOR = '2000-01-01'` é só piso técnico; `fetchAllTransactions(cardId, { dateFrom })` não usa `importFrom` da conexão; `historyBaselineAt` impede o sync automático de gravar compras antes de o dono aplicar; `server/scripts/card-history.js` e `reclassify-card-payments.js` com ensaio como padrão e `--apply` exigindo `--backup` recente (`backup-guard.test.js`, "--apply sem --backup ... nao grava nada", guarda `phase6-final.test.js`). Teste "historico sem corte: compra de 14 meses atras entra", "manual antigo sem cardId, de 10 meses atras, vira compra do cartao" |

**Pontuação:** 8 de 8 verdades verificadas por evidência de código e teste executado; 0 presentes-sem-comportamento-exercitado; as partes que dependem de tempo, banco real ou aparelho estão listadas em "Verificação humana".

## Cobertura de requisitos

| Requisito | Status | Evidência |
|-----------|--------|-----------|
| CARD-01 (registrar o que o MeuPluggy entrega) | SATISFEITO | Sondas `06-CARD-PROBE-792a3230.md` e `06-CARD-PROBE-cf5a10f5.md` (só formato, sem valores nem identificadores), `server/src/card-probe.js` e `server/test/card-probe.test.js`; escopo decidido em D-06 a D-10; conferência com o app do Nubank em 24/11 ("numeros batem": fatura R$ 181,41, limite R$ 200,00, disponível R$ 18,59) registrada no `06-02-SUMMARY.md` |
| CARD-02 (cartão como conta própria) | SATISFEITO | `shared/core/cards.js`, `server/src/card-sync.js` (`syncCardSnapshot`), regra `cards` somente leitura, `/cartoes`, Home e dock |
| CARD-03 (compras contam nos limites pela data da compra) | SATISFEITO | `bankFields` grava a data da compra; `budget.js` conta `cardKind: 'purchase'`; `couple.test.js`, `series.test.js` e `budget.test.js` verdes |
| CARD-04 (pagamento da fatura é transferência) | SATISFEITO em código e emulador; pagamento real: humano | `cardPayments.js`, `card-payments.js`, `reclassify-card-payments.js`; "Marcar como paga" só muda o status (`BillDetailSheet.tsx`, D-14c) |
| CARD-05 (parcelas N/M e o que sai por fatura futura) | PARCIAL (humano) | Existem e passam: `parseInstallment` (campos da Pluggy primeiro, texto cru como heurística, nunca um dd/mm solto), `futureInstallments` (não projeta mês já lançado), `UpcomingBills` (marca "estimada" na heurística, "Nenhuma compra parcelada detectada" quando não há dado, sem prometer nada), gravação de `installment` no sync. Falta a prova com dado real: a amostra tinha 6 compras e nenhuma parcelada (D-06). Não é lacuna de código: é o item 4 do roteiro (D-07) |
| CARD-06 (saldo não cai com compra no cartão) | SATISFEITO | `isOnCardTx` em `ledger.js` vale para compra importada e manual; testes do núcleo, emulador e `phase6-transactions.test.js` |
| CARD-07 (pendente vira confirmada sem duplicar) | SATISFEITO no emulador; ciclo real: humano | ver verdade 4 |
| CARD-08 (fatura calculada pelas datas do usuário) | SATISFEITO | `cardBills.js` (`derivedBillMonth`, `duePartsOf`), `cardSettings` por dono nas regras, `phase6-settings.test.js`; `derivationMismatch` avisa quando o fechamento do dono não bate com o banco. A regra do dia do fechamento é uma suposição declarada (`CLOSING_DAY_STARTS_NEXT_BILL = false`) a conferir com compra real |
| CENT-03 (Central mostra cada cartão) | SATISFEITO | verdade 2; fechada e atrasada só ao vivo |
| CENT-04 (vencimento no Calendário e nos alertas) | SATISFEITO em código; aviso real: humano | verdade 5 |

**Requisitos órfãos:** nenhum. Os dez IDs de REQUIREMENTS.md mapeados à Fase 6 aparecem no frontmatter `requirements` de pelo menos um plano de implementação (a guarda `phase6-final.test.js` confere isso excluindo 06-14 e 06-15, para a prova não ser tautológica).

## Decisões D-11 a D-14

| Decisão | Status | Evidência |
|---------|--------|-----------|
| D-11 dock de 9 destinos | VERIFICADO em código | `NavRail.tsx`, `phase6-dock.test.js`; celular: humano |
| D-12 chip Cartão e adoção do manual | VERIFICADO | `LaunchSheet.tsx`, `cardManual.js`, `cardAdopt.js`, cenários `card-sync` |
| D-13 histórico completo com ensaio e cópia de segurança | VERIFICADO em código e emulador | `card-history.js`, `historyBaselineAt`, `backup-guard.test.js`; aplicação em produção só por atestado do dono |
| D-14 sem tempo real; Casal e Relatórios contam a compra; "Marcar como paga" fica | VERIFICADO | `phase6-final.test.js` ("webhook.js e app.js nao referenciam o cartao e a interface nao promete tempo real"), `couple.test.js`, `series.test.js`, `BillDetailSheet.tsx` |

## Artefatos e ligações

| Artefato | Status | Detalhes |
|----------|--------|----------|
| `shared/core/card*.js` (9 módulos, cada um com teste) | VERIFICADO | puros, sem relógio nem pacote; usados pelo servidor e pelo cliente (mesma `sumBillTotals` nos dois lados) |
| `server/src/card-sync.js`, `card-payments.js`, `card-probe.js` | VERIFICADO | chamados de `server/src/sync.js` (conta CREDIT segue caminho próprio; falha do cartão não derruba a importação do banco; sem ownerId nada é gravado) |
| `server/scripts/card-history.js`, `reclassify-card-payments.js` | VERIFICADO | ensaio padrão, `--apply` exige `--backup` |
| `firestore.rules` (`cards` leitura, `cardSettings` do dono) e índice de `transactions` | VERIFICADO | `test/rules` 13 verdes; índice presente no repositório |
| `src/pages/CardsPage.tsx` e `src/components/cards/*` | VERIFICADO | ligados por `App.tsx`, `useCardView`, `useCards`, `cards.service.ts` |
| `NavRail.tsx`, `HomeCardSummary`, `useCalendarData.ts`, `AlertsBell.tsx`, `LaunchSheet.tsx`, `TransactionRow.tsx` | VERIFICADO | ligações conferidas |

Data-flow (nível 4): `/cartoes` lê `cards/{id}` (gravado pelo servidor com dados da Pluggy) e `transactions` por `ownerId`, `cardId` e `date`; nenhum valor é fixo. `BillSummary` ainda mostra a diferença entre a fatura do banco e a soma das compras (`openBillMismatchCents`), o que expõe divergência em vez de escondê-la.

## Anti-padrões

Nenhum `TBD`, `FIXME`, `XXX`, `TODO` ou `HACK` nos 28 arquivos de código da fase (varredura por grep). Nenhum stub: os retornos vazios do núcleo são resultados conservadores documentados (`null`, `'unknown'`, lista vazia) para entrada inválida, e o estado de carregamento de `CardsPage` mostra blocos neutros sem número. Nenhum bloqueio.

## Avisos (não bloqueiam)

1. **Atestado do dono não é evidência do repositório.** O `06-14-SUMMARY.md` registra que o dono publicou, importou o histórico, reclassificou, conferiu e aprovou, mas não guarda as contagens do ensaio (`created`, `adopted`, `nearMiss` e demais) nem os "Deploy complete". Se `card-history.js --apply` rodou e se `historyBaselineAt` está gravado em produção só se confirma no Firestore ou no app, o que esta verificação não fez (sem credenciais e sem ler `.env*`). Vale o dono guardar as contagens no roteiro (item 9).
2. **Documentação inconsistente no 06-14.** O `06-14-SUMMARY.md` descreve três passos de publicação (regras, servidor, hospedagem; "Não há índice novo", rollback `0aa7f274`), enquanto o `06-14-DEPLOY-EVIDENCE.md` descreve nove passos (inclui o índice de `transactions`, rollback `715e83d0`). O índice está no repositório (`8a8ea1a0`) e `/cartoes` consulta por ele; o app aprovado pelo dono o usa. Convém alinhar os dois textos para quem for reverter.
3. **Escrita de acompanhamento pendente no planejamento.** `ROADMAP.md` ainda mostra 06-14 e 06-15 sem marca, "18/20 plans executed" e a fase sem `[x]`; `REQUIREMENTS.md` mostra CARD-01 a CARD-08, CENT-03 e CENT-04 como `Pending`. Esta verificação não editou nenhum dos dois, como pedido. O orquestrador atualiza depois de decidir o destino do status `human_needed` (CARD-05 não deve ser marcado como provado).
4. **`06-VALIDATION.md` está com `nyquist_compliant: false` e `status: partial`**, corretamente, até o dono responder o roteiro.
5. **Suposição declarada do dia do fechamento** (`CLOSING_DAY_STARTS_NEXT_BILL = false`): só afeta compras derivadas pelo fechamento (quando a Pluggy não traz o mês); a troca é de uma linha e está nas decisões do dono.
6. **Custo de leituras do Firestore do histórico inteiro (D-13):** risco registrado pelo dono, ainda sem medição; acompanhar no console do Firebase.

## Verificação humana necessária

Os itens estão no frontmatter (`human_verification`) e correspondem aos itens 1 a 9 do `06-UAT-ROTEIRO.md`, mais as duas decisões abertas do dono. Os dependentes do tempo (ciclo diário, fechamento 07/12, vencimento 14/12, primeira compra parcelada, compra em dólar) são esperados e não contam como falha.

## Resumo das lacunas

Nenhuma lacuna de código ou ligação. CARD-05 permanece parcial por falta de dado real, não por defeito. A fase só pode ser marcada como completa depois que o dono responder o roteiro; até lá, `human_needed`.

---

_Verificado em: 2026-11-25_
_Verificador: Claude (gsd-verifier)_
