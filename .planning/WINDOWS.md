---
schema_version: 1
open_count: 2
waived_count: 0
fixed_count: 0
total_count: 2
last_updated: 2026-11-25T01:01:23.671Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 06 | unrun-verify | server/test/emu/card-payments.test.js |  | 06-08: npm run test:emu e test:rules nao rodaram (sem JDK 11 e firebase-tools); nao publicar antes | open |  | 2026-11-25T01:01:20.175Z |  |
| 2 | 06 | unmet-truth | shared/core/classify.js |  | 06-08: isCardBillPayment casa 'pagamento de fatura' de conta de consumo; esses gastos sairiam dos limites (T-06-28) | open |  | 2026-11-25T01:01:23.671Z |  |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "06",
    "file": "server/test/emu/card-payments.test.js",
    "line": null,
    "description": "06-08: npm run test:emu e test:rules nao rodaram (sem JDK 11 e firebase-tools); nao publicar antes",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-11-25T01:01:20.175Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 2,
    "kind": "unmet-truth",
    "phase": "06",
    "file": "shared/core/classify.js",
    "line": null,
    "description": "06-08: isCardBillPayment casa 'pagamento de fatura' de conta de consumo; esses gastos sairiam dos limites (T-06-28)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-11-25T01:01:23.671Z",
    "resolved_at": null,
    "milestone": null
  }
]
````
