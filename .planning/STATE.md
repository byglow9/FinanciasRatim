---
gsd_state_version: "1.0"
current_phase: 01
current_phase_name: Fundação de dados e acesso
status: executing
stopped_at: Phase 1 context gathered
last_updated: "2026-11-17T15:53:17.922Z"
last_activity: 2026-11-17
last_activity_desc: Roadmap criado (8 fases, 67/67 requisitos mapeados)
state_head: 90d42d2d4051761ec0fbe6f50dd7991b78dd2fb5
progress:
  total_phases: 8
  completed_phases: 0
  total_plans: 13
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-17)

**Core value:** Em segundos o usuário sabe quanto ainda pode gastar no mês (com base em limites por categoria) e o Vintém o ajuda a não estourar.
**Current focus:** Phase 1 - Fundação de dados e acesso

## Current Position

Phase: 01 (Fundação de dados e acesso) — READY TO EXECUTE
Plan: 0 of TBD in current phase
Status: Ready to execute
Last activity: 2026-11-17 - Roadmap criado (8 fases, 67/67 requisitos mapeados)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 8 fases (research sugeria 10): Mascote ficou separado dos Limites; Push e IA juntos; Casal e multiusuário juntos
- [Roadmap]: Ordem de regras do Firestore é obrigatória: login Firebase único, backfill de ownerId, índices, cliente, só então regras restritivas
- [Roadmap]: Mockups (paleta, navegação mobile, posição da Central, formato do Casal) são um portão no início da Fase 3
- [Roadmap]: Teste real do cartão (CARD-01) começa como trilha paralela somente leitura na Fase 2; o requisito é entregue na Fase 6

### Pending Todos

None yet.

### Blockers/Concerns

- Webhooks da Pluggy não confirmados para itens do MeuPluggy (testar na Fase 2; se não chegarem, ficar só com polling)
- O que o MeuPluggy entrega para o cartão do Bradesco (faturas, parcelas, `creditData`) é desconhecido; Fase 6 depende do teste
- Decisão de `ownerId` na Fase 1: uid do login compartilhado versus claim de família (manter a costura aberta)
- Plano e custo do Railway não verificados; Node >= 22.23.4 exigido no servidor
- Regra de parcelas contra o limite precisa de confirmação do dono antes da Fase 6
- Decisão do amigo (só manual ou conta MeuPluggy própria) antes da Fase 8
- Nome "Coinki": busca em lojas e INPI pendente; reservar o ID `coinki` no Hosting cedo

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| *(none)* | | | | |

## Session Continuity

Last session: 2026-11-17T15:00:40.344Z
Stopped at: Phase 1 context gathered
Resume file: .planning/phases/01-funda-o-de-dados-e-acesso/01-CONTEXT.md
