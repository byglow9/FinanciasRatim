# Phase 6: Cartão de crédito - Context

**Gathered:** 2026-11-24
**Status:** Ready for research (portão CARD-01 aberto: falta a nova sonda com o Nubank)

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
