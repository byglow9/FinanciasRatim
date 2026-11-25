---
schema_version: 1
open_count: 6
waived_count: 0
fixed_count: 0
total_count: 6
last_updated: 2026-11-25T01:27:04.031Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 06 | unrun-verify | server/test/emu/card-payments.test.js |  | 06-08: npm run test:emu e test:rules nao rodaram (sem JDK 11 e firebase-tools); nao publicar antes | open |  | 2026-11-25T01:01:20.175Z |  |
| 2 | 06 | unmet-truth | shared/core/classify.js |  | 06-08: isCardBillPayment casa 'pagamento de fatura' de conta de consumo; esses gastos sairiam dos limites (T-06-28) | open |  | 2026-11-25T01:01:23.671Z |  |
| 3 | 06 | unrun-verify | vite.config.ts |  | 06-12: npm run build nao rodou (vite-plugin-pwa ausente em node_modules) | open |  | 2026-11-25T01:11:36.461Z |  |
| 4 | 06 | unrun-verify | server/test/emu/card-sync.test.js |  | 06-18: npm run test:emu e test:rules nao rodaram (sem JDK 11 e firebase-tools); nao publicar antes | open |  | 2026-11-25T01:26:58.845Z |  |
| 5 | 06 | unmet-truth | server/src/card-sync.js |  | 06-18: adocao grava sem ensaio nem copia de seguranca; o portao historyBaselineAt e do 06-19 (D-13); nao publicar sozinho | open |  | 2026-11-25T01:27:01.536Z |  |
| 6 | 06 | unmet-truth | server/src/sync.js |  | 06-18: findDuplicate da conta BANK ainda compara com manuais lancados como Cartao (so valor e data) e pode esconder uma saida em review/duplicate | open |  | 2026-11-25T01:27:04.031Z |  |

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
  },
  {
    "id": 3,
    "kind": "unrun-verify",
    "phase": "06",
    "file": "vite.config.ts",
    "line": null,
    "description": "06-12: npm run build nao rodou (vite-plugin-pwa ausente em node_modules)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-11-25T01:11:36.461Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 4,
    "kind": "unrun-verify",
    "phase": "06",
    "file": "server/test/emu/card-sync.test.js",
    "line": null,
    "description": "06-18: npm run test:emu e test:rules nao rodaram (sem JDK 11 e firebase-tools); nao publicar antes",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-11-25T01:26:58.845Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 5,
    "kind": "unmet-truth",
    "phase": "06",
    "file": "server/src/card-sync.js",
    "line": null,
    "description": "06-18: adocao grava sem ensaio nem copia de seguranca; o portao historyBaselineAt e do 06-19 (D-13); nao publicar sozinho",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-11-25T01:27:01.536Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 6,
    "kind": "unmet-truth",
    "phase": "06",
    "file": "server/src/sync.js",
    "line": null,
    "description": "06-18: findDuplicate da conta BANK ainda compara com manuais lancados como Cartao (so valor e data) e pode esconder uma saida em review/duplicate",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-11-25T01:27:04.031Z",
    "resolved_at": null,
    "milestone": null
  }
]
````
