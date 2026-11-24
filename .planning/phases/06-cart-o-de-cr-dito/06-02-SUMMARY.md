---
phase: 06-cart-o-de-cr-dito
plan: 02
status: partial
completed: 2026-11-24
---

# 06-02 Resumo: gate do tracer (parcial)

## Feito (24/11/2026)
- Dono publicou na ordem: regras (`Deploy complete`, rules released), push de `main` ao Railway (07259d14, 41 commits) e hospedagem `coinc` (`Deploy complete`, bundle index-BQsnpxVc.js).
- Servidor: `/api` responde 401 sem token (no ar). O cartão foi gravado pelo servidor: `/cartoes` mostra "Última leitura do banco: 24 nov, 17:32".
- **Conferência com o app do Nubank: numeros batem.** `/cartoes` (cartão "gold", Mastercard Gold): fatura atual R$ 181,41, limite total R$ 200,00, disponível R$ 18,59, usado R$ 181,41 (91%) = valores do app do Nubank (prints do dono). Sem divergência, a expansão (ondas seguintes) está liberada.

## Pendente
- Respostas do dono (a) data das compras do Nubank em Transações confere com o app? e (b) alguma compra em dólar aparece com valor em dólar? (resultado (a) pode mudar a regra de data do 06-04).
- Sonda `probe-card.js --item 792a3230-... --days 365` depois do ciclo de 25/11 (~11:46) e compra parcelada real (D-07, CARD-05).
