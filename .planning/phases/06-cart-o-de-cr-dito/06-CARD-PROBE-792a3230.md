# Sonda do cartao (somente formato) - 2026-11-24

Gerado por server/scripts/probe-card.js. Contem so formato, contagens e valores enumerados:
nenhum valor em reais, identificador, loja, numero de cartao ou texto livre.

- cartao CREDIT encontrado: sim
- cartao 1: faturas ok (0); 6 compras, 0 com parcela, 0 com fatura

```json
{
  "item": {
    "status": "UPDATED",
    "executionStatus": "SUCCESS",
    "errorCode": "AUSENTE",
    "connector": "MeuPluggy",
    "ageHours": 0,
    "consentExpiresInDays": 364,
    "hasNextAutoSync": true,
    "nextAutoSyncInHours": 23
  },
  "accountTypes": {
    "BANK": 1,
    "CREDIT": 1
  },
  "cardAccountsFound": 1,
  "cards": [
    {
      "n": 1,
      "creditData": {
        "fields": {
          "creditLimit": "number",
          "availableCreditLimit": "number",
          "balanceDueDate": "null",
          "balanceCloseDate": "null",
          "minimumPayment": "null",
          "brand": "string",
          "level": "string",
          "status": "string",
          "holderType": "null",
          "isLimitFlexible": "boolean",
          "disaggregatedCreditLimits": "array",
          "additionalCards": "array"
        },
        "brand": "MASTERCARD",
        "level": "GOLD",
        "status": "ACTIVE",
        "holderType": "AUSENTE",
        "isLimitFlexible": false,
        "additionalCardsCount": 0,
        "hasDisaggregatedLimits": true,
        "availableWithinLimit": true
      },
      "billsFetch": "ok",
      "billsErrorStatus": null,
      "bills": [],
      "txs": {
        "total": 6,
        "pending": 6,
        "withInstallmentNumber": 0,
        "withTotalInstallments": 0,
        "withBillId": 0,
        "withBillForecastDate": 6,
        "withPurchaseDate": 0,
        "withBillPostDate": 6,
        "withPaymentType": 6,
        "futureDated": 0,
        "byType": {
          "DEBIT": 6
        },
        "byStatus": {
          "PENDING": 6
        },
        "byPaymentType": {
          "SINGLE": 6
        },
        "installmentTotals": {}
      }
    }
  ]
}
```
