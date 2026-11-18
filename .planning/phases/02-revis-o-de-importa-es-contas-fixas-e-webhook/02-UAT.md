---
status: partial
phase: 02-revis-o-de-importa-es-contas-fixas-e-webhook
source: 02-04-SUMMARY.md, 02-05-SUMMARY.md, 02-06-SUMMARY.md
started: 2026-11-18T12:00:00Z
updated: 2026-11-18T12:30:00Z
---

## Current Test

[testing paused — 1 item outstanding (teste 4, D-07, aguarda evento do MeuPluggy)]

## Tests

### 1. "Atualizado há X" em Configurações > Bancos
expected: A conexão MeuPluggy mostra "Atualizado há X" e o estado do consentimento (válido, sem aviso de vencimento)
result: pass

### 2. Linha de frescor na Home
expected: A Home mostra uma linha discreta de frescor do banco; sem alarme quando está tudo em dia
result: pass

### 3. Botão Reconectar
expected: Não aparece com o consentimento válido (~364 dias); só surge quando está vencendo ou vencido
result: pass
note: não apareceu em Configurações > Bancos com consentimento válido (print do dono). O caso positivo (vencendo) não é testável agora.

### 4. Último aviso do banco (D-07)
expected: Se o MeuPluggy já mandou evento, Configurações > Bancos mostra "Último aviso do banco: há X"; senão, nada quebra
result: blocked
blocked_by: third-party
reason: o MeuPluggy ainda não entregou evento; a tela não mostra a linha e nada quebra. Reavaliar após 48 h (sem evento = somente polling).

## Summary

total: 4
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 1

## Gaps

[none yet]
