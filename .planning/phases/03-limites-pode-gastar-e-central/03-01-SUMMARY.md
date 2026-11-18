---
phase: 03
plan: 01
subsystem: gates-humanos
requirements-completed: [LIM-04, LIM-06, LIM-07, LIM-10, IDEN-07]
commits: 1
---

# Plano 03-01 — Gates humanos: pacotes de fonte e premissas

## Respostas literais do dono

- Checkpoint Tarefa 2 (pacotes): "top continua" — interpretado como `approved` para os dois pacotes.
  - Aprovado: `@fontsource-variable/sora@5.3.0` e `@fontsource-variable/bricolage-grotesque@5.3.0` (OFL-1.1, sem script de instalação).
- Checkpoint Tarefa 3 (premissas): "top continua" — interpretado como `accept-all`. PR-01..PR-20 valem como estão em `03-01-PREMISES.md`, sem ajustes.

## Entregas

- `03-01-PACKAGE-EVIDENCE.md`, `03-01-PREMISES.md`.
- Nada instalado: `package.json` e `package-lock.json` intactos. A instalação acontece no plano 03-02.

## Riscos registrados

- PR-02: conta fixa paga pelo banco é descontada duas vezes (documentar no UAT).
- PR-11: Transações, Relatórios e Calendário seguem por mês-calendário.
