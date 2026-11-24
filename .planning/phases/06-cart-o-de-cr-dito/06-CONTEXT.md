# Phase 6: Cartão de crédito - Context

**Gathered:** 2026-11-24
**Status:** Ready for research (portão CARD-01 respondido pela sonda de 24/11: ver D-06)

<domain>
## Phase Boundary

O usuário acompanha o cartão como conta própria (fatura, limite, vencimento e parcelas), sem contar a mesma despesa duas vezes, com escopo definido a partir do que o MeuPluggy realmente entrega. Requisitos: CARD-01..08, CENT-03, CENT-04 (ver ROADMAP.md, Fase 6).
</domain>

<decisions>
## Implementation Decisions

- **D-01:** O cartão de crédito do dono é do **Nubank**, não do Bradesco. A sonda de 18/11 (`.planning/phases/02-revis-o-de-importa-es-contas-fixas-e-webhook/02-CARD-PROBE.md`) achou só duas contas BANK do Bradesco, sem CREDIT; o diagnóstico de 24/11 confirmou o mesmo. O item MeuPluggy atual (`cf5a10f5`) não traz cartão.
- **D-02:** O portão CARD-01 segue valendo: **nada é modelado antes de a sonda mostrar o que o MeuPluggy entrega para o cartão**. O dono vai conectar o **Nubank** no MeuPluggy (meu.pluggy.ai, Open Finance, uso pessoal gratuito, até 5 conexões) e então rodamos `server/scripts/probe-card.js` de novo. Não se sabe se o Nubank entra no mesmo item ou em outro itemId (a doc da Pluggy manda não assumir o mesmo itemId): a sonda e o `bankConnections` decidem.
- **D-03:** **Parcelas contra o limite** (decisão do dono, 24/11/2026): a **parcela do mês conta** no limite; o total restante das parcelas aparece separado como "a sair nas próximas faturas". Compra à vista conta pela **data da compra** (CARD-03).
- **D-04:** Se o MeuPluggy não devolver fatura, vale CARD-08: o sistema calcula a fatura pelos dias de fechamento e vencimento informados pelo usuário.
- **D-05 (restrições herdadas):** o servidor só lê o que a Pluggy já guardou; o MeuPluggy atualiza ~1x/dia (ciclo ~11:46) e não aceita atualização manual (ver `.planning/debug/webhook-pluggy-tempo-real.md`). Nenhuma promessa de tempo real para o cartão. Transferência entre contas do mesmo CPF vira `review/self_transfer` (pagamento de fatura deve seguir CARD-04: transferência vinculada à fatura, nunca gasto).
- **D-06 (resultado da sonda, 24/11/2026, item `792a3230` = MeuPluggy com o Nubank; arquivo `06-CARD-PROBE-792a3230.md`):** o Nubank entrou como **item separado** (cada banco do MeuPluggy vira um item), com 1 conta BANK e 1 conta **CREDIT** (Mastercard Gold, ACTIVE). O que o MeuPluggy entrega para o cartão: `creditLimit` e `availableCreditLimit` (números), `brand`, `level`, `status`, `isLimitFlexible`, `disaggregatedCreditLimits`. O que **não** entrega: `balanceDueDate`, `balanceCloseDate` e `minimumPayment` vêm `null`; `bills` (faturas) volta **vazio** (fetch ok, 0 faturas). Transações do cartão: 6 em 90 dias, **todas PENDING**, tipo DEBIT, `paymentType` SINGLE, todas com `billForecastDate` (mês da fatura prevista) e `billPostDate`, **nenhuma** com `installmentNumber`, `totalInstallments`, `billId` ou `purchaseDate`. Consequências de escopo: limite disponível vem da Pluggy; **fatura aberta = soma das compras agrupadas por `billForecastDate`**; **fechamento e vencimento vêm do usuário (CARD-08 vira o caminho principal)**; faturas fechadas, pagas e atrasadas **não** vêm da Pluggy e precisam ser inferidas (pagamento da fatura na conta, CARD-04); parcelas N/M **não confirmadas** (a amostra não tinha compra parcelada): reavaliar com uma compra parcelada real antes de prometer CARD-05, com heurística como reserva.
- **D-07:** A amostra é pequena (6 compras, item recém-conectado, histórico pode ser curto). Antes de fechar o modelo, repetir a sonda após o próximo ciclo (25/11 ~11:46) e, se possível, com uma compra parcelada no Nubank.
- **D-08 (conferência com o app do Nubank, 24/11/2026, prints do dono):** os dados da Pluggy **batem com o app**. `creditLimit` 200, `availableCreditLimit` 18,59 e `balance` 181,41 na conta CREDIT = limite disponível e **fatura atual** do Nubank (R$ 181,41, limite disponível R$ 18,59). Então `balance` da conta CREDIT é o valor da fatura aberta e `availableCreditLimit` é o limite disponível. As 6 compras pendentes somam **exatamente 181,41** quando se usa `amountInAccountCurrency` (compras em USD vêm com `amount` em dólar e `currencyCode: USD`; ex.: 5,00 USD = R$ 30,08). **Regra: valor em reais de compra internacional = `amountInAccountCurrency`**, nunca `amount`. IOF de compra internacional chega como lançamento próprio (BRL). Todas com `billForecastDate` 2026-12 (a fatura que fecha em dezembro).
- **D-09 (dados que a Pluggy não traz e o app do Nubank mostra):** fechamento **07/12** e vencimento **14/12** (dia 7 e dia 14, informados pelo dono); a Pluggy devolve esses campos `null`. Ficam como configuração do cartão (CARD-08).
- **D-10 (visão desejada pelo dono):** uma área própria do cartão com boa visibilidade das faturas: fatura atual (valor), quando fecha e vence, **quanto foi gasto em cada fatura** (por mês de fatura, `billForecastDate`), limite total, limite disponível e % usado, próximas faturas e compras da fatura (como a tela 'Fatura' do Nubank). Vive na Central de Limites e Cartões (CENT-03) e no Calendário (CENT-04).
</decisions>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` (Fase 6), `.planning/REQUIREMENTS.md` (CARD-01..08, CENT-03/04)
- `.planning/phases/02-revis-o-de-importa-es-contas-fixas-e-webhook/02-CARD-PROBE.md` e `server/src/card-probe.js`, `server/scripts/probe-card.js`
- `.planning/research/` (pluggy-sdk: `creditData`, `fetchCreditCardBills`, `installmentNumber`, `billForecastDate`; parcelas sem ID de grupo no Open Finance)
- `.planning/debug/webhook-pluggy-tempo-real.md` (ciclo de 24 h do MeuPluggy)
</canonical_refs>

<specifics>
## Specific Ideas

- Próximo passo do dono: adicionar o Nubank em meu.pluggy.ai e, no Coinc, Configurações > Bancos, reconectar/atualizar o MeuPluggy; depois avisar para rodar a sonda.
</specifics>

<deferred>
## Deferred Ideas

- Captura de notificações do banco no celular para lançamentos em tempo real (fora da Fase 6; avaliar depois, depende de Android ou iPhone).
</deferred>
