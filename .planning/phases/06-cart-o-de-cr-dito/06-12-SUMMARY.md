---
phase: 06-cart-o-de-cr-dito
plan: 12
subsystem: cartao-de-credito
tags: [ui, cartoes, fatura, parcelas, pagamento-de-fatura]
status: complete

requires:
  - phase: 06-10
    provides: "pagina /cartoes, BillHistoryList com onOpen, BillStatusChip e cardLabels"
  - phase: 06-08
    provides: "pagamentos ligados a fatura em cards/{id}.payments"
  - phase: 06-07
    provides: "saveCardSettings com paidMonths"
provides:
  - "BillDetailSheet: compras por dia, pagamentos, pago e restante, marcar e desmarcar como paga"
  - "BillPurchaseRow: Pendente, Lancada por voce, parcela N/M (estimada quando lida do texto) e valor original em moeda"
  - "billDayGroups no nucleo (total do dia em centavos)"
  - "guarda estatica phase6-bill-detail.test.js"
affects: [06-14, 06-15, 06-20]

actuals:
  tokens: 5680
  tasks: 3
  commits: 3

commits: 3
plan_head_before: ad24df3cdaeb0f90edf67315aa12a73ea9e18b3f
plan_head_after: f04e5dd519bdc50d91c624243ab02b7d03446296

tech-stack:
  added: []
  patterns:
    - "folha mantem a ultima fatura em estado para o conteudo nao sumir na animacao de saida"

key-files:
  created:
    - src/components/cards/BillDetailSheet.tsx
    - src/components/cards/BillPurchaseRow.tsx
    - test/static/phase6-bill-detail.test.js
  modified:
    - src/pages/CardsPage.tsx
    - src/components/cards/BillHistoryList.tsx
    - shared/core/cardBills.js
    - shared/core/cardBills.test.js

key-decisions:
  - "Total do dia calculado no nucleo (billDayGroups), nao na folha; transactionDayGroups deixaria o estorno de fora"
  - "Fatura paga por pagamento detectado e sem marca do dono nao oferece botao"

requirements-completed: [CARD-05, CARD-04, CENT-03]  # copiados do plano; seguem Pending em REQUIREMENTS.md (planos irmaos sem SUMMARY)

coverage:
  - id: D1
    description: "Folha da fatura com compras por dia, Pendente, Lancada por voce, N/M, estimada e valor original"
    requirement: "CARD-05"
    verification:
      - kind: unit
        ref: "shared/core/cardBills.test.js#billDayGroups (node --test)"
        status: pass
      - kind: other
        ref: "test/static/phase6-bill-detail.test.js"
        status: pass
      - kind: manual_procedural
        ref: "Chrome sem janela, 360px, CardsPage real com hooks e servico simulados (fora do repositorio)"
        status: pass
    human_judgment: true
    rationale: "Sem dados reais de cartao; parcela real nunca foi vista (D-07)"
  - id: D2
    description: "Pagamentos ligados a fatura com data, valor, origem, pago e restante"
    requirement: "CARD-04"
    verification:
      - kind: manual_procedural
        ref: "Chrome sem janela com pagamentos simulados"
        status: pass
    human_judgment: true
    rationale: "Depende de cards.payments real, e os testes de emulador do 06-08 nao rodaram"
  - id: D3
    description: "Marcar e desmarcar como paga, bloqueado em somente leitura, com mensagem de erro"
    requirement: "CENT-03"
    verification:
      - kind: other
        ref: "test/static/phase6-bill-detail.test.js"
        status: pass
      - kind: manual_procedural
        ref: "Chrome sem janela: somente leitura nao grava, falha mostra a mensagem, marcar e desmarcar mudam o status"
        status: pass
    human_judgment: true
    rationale: "A gravacao foi simulada; Firestore e regras nao foram exercitados"
  - id: D4
    description: "Folha aberta pelo historico e pela fatura atual, com o foco devolvido ao botao"
    verification:
      - kind: manual_procedural
        ref: "Chrome sem janela: foco volta ao botao ao fechar e com Esc"
        status: pass
    human_judgment: true
    rationale: "Nao conferido em celular real"

duration: 9min
completed: 2026-11-24
---

# Phase 6 Plan 12: Detalhe da fatura Summary

**Tocar numa fatura de `/cartoes` abre a folha dela: compras por dia com Pendente, parcela N/M e valor original em moeda, pagamentos ligados e a marca manual de fatura paga.**

## Performance

- **Duração:** cerca de 9 min (2026-11-25T01:02Z a 01:11Z)
- **Tasks:** 3 de 3
- **Arquivos:** 7

## Task Commits

1. **Task 1 (linha de compra e folha):** `794b084b` (feat)
2. **Task 2 (abrir pela página, histórico e fatura atual):** `421cba93` (feat)
3. **Task 3 (guarda estática):** `f04e5dd5` (test)

## Verificação executada

| Comando | Resultado |
| ------- | --------- |
| `npm run test:core` | 878 de 878 (875 da base mais 3 novos) |
| `npm run test:server` | 124 de 124 |
| `npm run test:static` | 647 passam, 11 falham, 7 pulados: as mesmas 11 falhas da base |
| `node --test test/static/phase6-bill-detail.test.js` | 8 de 8 |
| `npm run lint` | sem erros |
| `npx tsc -p tsconfig.app.json --noEmit --types vite/client` | só 3 erros em `src/lib/pwa/registerPwa.ts` (pacote `vite-plugin-pwa` ausente); nenhum nos arquivos deste plano |
| `npm run build` | **NÃO RODOU**: `vite-plugin-pwa` não está instalado nesta máquina |

**Guarda contra defeito plantado:** cópias em CRLF fora do repositório, sem "estimada", sem a validação da moeda, sem o `guard` e com o botão em fatura aberta: a guarda falhou nas quatro e passou na cópia sem defeito.

**Conferência no navegador:** `CardsPage`, `BillHistoryList`, `BillSummary`, folha e linha reais, empacotados fora do repositório com `useCards`, `useCardView`, `useReadOnly`, o ciclo e o serviço simulados, no Chrome a 360px. Compras por dia, marcas, US$ 5,00, código de moeda ruim mostrando só reais, nome com HTML exibido como texto, sem rolagem horizontal, somente leitura sem gravar, erro de gravação, marcar e desmarcar, foco devolvido e console sem erros.

## Decisions Made

- O total do dia vem de `billDayGroups`, novo no núcleo, que usa `groupByDay`. O estorno subtrai, como no total da fatura.
- O botão aparece só em fatura fechada, atrasada ou paga por marca do dono. Se os pagamentos detectados já cobrem a fatura, não há botão.
- "Ver compras da fatura" só aparece quando há lançamento na fatura aberta (precisa do dia de fechamento).
- Estorno aparece com a marca "Estorno" e o valor com sinal de mais. A parcela é escrita "Parcela 2/6".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `billDayGroups` em `shared/core` (fora de `files_modified`)**
- **Issue:** o plano pede o total do dia e proíbe a folha de calcular; `transactionDayGroups` ignora transferências e deixaria o estorno fora.
- **Fix:** helper puro com 3 testes. **Commit:** `794b084b`

**2. [Rule 1 - Bug] Botão sem efeito em fatura paga pela detecção**
- **Issue:** "Marcar como paga" ou "Desmarcar" não mudaria nada numa fatura já coberta pelos pagamentos e sem marca.
- **Fix:** o botão não aparece nesse caso. **Commit:** `794b084b`

**3. [Rule 2 - Acessibilidade] Rótulo da linha do histórico**
- **Issue:** o `aria-label`, agora ativo, escondia valor e status do leitor de tela.
- **Fix:** o rótulo inclui os dois. **Commit:** `421cba93`

**Ambiente:** `scripts/dev-env.sh` não funciona nesta máquina; usei o Node 24.15.0 do sistema. Nenhum pacote instalado.

## Pendências (não verificado)

- `npm run build`.
- `npm run test:emu` e `npm run test:rules`: continua valendo o bloqueio do 06-08 antes de publicar. A gravação real de `cardSettings.paidMonths` não foi exercitada.
- Conferência em celular real e com dados reais do cartão, inclusive uma compra parcelada (D-07).

## Riscos conhecidos, não corrigidos

1. `paidMonths` aceita no máximo 36 meses (`validateCardSettingsPatch`). No 37º, a folha só mostra "Não foi possível salvar. Tente de novo.". Pode pesar se muitas faturas antigas aparecerem como atrasadas (risco 5 do 06-08).
2. Sem rede, o status muda na tela na hora, mas o botão ignora novos toques até o servidor confirmar.
3. `guard('editar')` não bloqueia na área Porquinho, mesmo vendo o cartão do parceiro. É o mesmo comportamento da folha do cartão em Configurações.
4. No Safari do iPhone, tocar num botão não lhe dá foco, então a devolução do foco do `Sheet` não tem efeito ali.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova. T-06-40 a T-06-43 mitigados na interface; a regra do Firestore para `cardSettings` não foi testada aqui.

## Self-Check: PASSED

Os arquivos criados e os commits `794b084b`, `421cba93` e `f04e5dd5` existem. O self-check cobre presença; as pendências acima seguem abertas.
