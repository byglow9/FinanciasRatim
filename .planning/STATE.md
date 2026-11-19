---
gsd_state_version: "1.0"
current_phase: "03.1"
current_phase_name: redesign-das-abas
status: executing
stopped_at: Completed 03.1-08-PLAN.md
last_updated: "2026-11-19T14:10:06.152Z"
last_activity: 2026-11-19
last_activity_desc: Phase 03.1 execution started
state_head: 3429dc20a5f23da2d940fde26f9a50acd2e1ff4a
progress:
  total_phases: 9
  completed_phases: 1
  total_plans: 66
  completed_plans: 50
  percent: 11
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-17)

**Core value:** Em segundos o usuário sabe quanto ainda pode gastar no mês (com base em limites por categoria) e o Vintém o ajuda a não estourar.
**Current focus:** Phase 03.1 — redesign-das-abas

## Current Position

Phase: 03.1 (redesign-das-abas) — EXECUTING
Plan: 9 of 24
Status: Ready to execute
Last activity: 2026-11-19 — Phase 03.1 execution started

Progress: [█░░░░░░░░░] 11%

## Performance Metrics

**Velocity:**

- Total plans completed: 6
- Average duration: -
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 2 | 6 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 10 min | 3 tasks | 1 files |
| Phase 01 P02 | 10 min | 3 tasks | 12 files |
| Phase 01 P03 | 10 min | 3 tasks | 13 files |
| Phase 01 P04 | 15min | 3 tasks | 11 files |
| Phase 01 P05 | 12min | 2 tasks | 11 files |
| Phase 01 P06 | 25 min | 3 tasks | 8 files |
| Phase 01 P07 | 30min | 2 tasks | 7 files |
| Phase 01 P08 | 15 min | 3 tasks | 13 files |
| Phase 01 P09 | 25 min | 3 tasks | 12 files |
| Phase 01 P11 | 10min | 3 tasks | 0 files |
| Phase 01 P10 | 15min | 3 tasks | 0 files |
| Phase 01 P12 | 1h | 3 tasks | 0 files |
| Phase 01 P13 | 1h | 3 tasks | 0 files |
| Phase 02 P01 | 40min | 3 tasks | 8 files |
| Phase 02 P02 | 20min | 2 tasks | 2 files |
| Phase 03 P02 | 12min | 3 tasks | 10 files |
| Phase 03 P03 | ~15min | 3 tasks | 5 files |
| Phase 03 P04 | 15min | 3 tasks | 8 files |
| Phase 03 P05 | 10min | 2 tasks | 5 files |
| Phase 03 P06 | 25min | 3 tasks | 2 files |
| Phase 03 P07 | 12min | 3 tasks | 6 files |
| Phase 03 P08 | 20min | 3 tasks | 10 files |
| Phase 03 P09 | 20min | 3 tasks | 11 files |
| Phase 03 P10 | 20min | 2 tasks | 8 files |
| Phase 03 P12 | 20min | 2 tasks | 6 files |
| Phase 03 P13 | 5min | 2 tasks | 3 files |
| Phase 03 P14 | 25min | 3 tasks | 4 files |
| Phase 03 P15 | 40min | 3 tasks | 5 files |
| Phase 03 P16 | 20min | 2 tasks | 8 files |
| Phase 03 P17 | 5min | 2 tasks | 8 files |
| Phase 03 P18 | 6min | 3 tasks | 9 files |
| Phase 03 P19 | 6min | 3 tasks | 6 files |
| Phase 03 P20 | 10min | 2 tasks | 2 files |
| Phase 03 P21 | 25min | 3 tasks | 4 files |
| Phase 03 P22 | 25min | 3 tasks | 5 files |
| Phase 03 P23 | 25min | 3 tasks | 3 files |
| Phase 03.1 P01 | 12 min | 3 tasks | 10 files |
| Phase 03.1 P02 | 20 min | 3 tasks | 10 files |
| Phase 03.1 P04 | 8 min | 3 tasks | 3 files |
| Phase 03.1 P05 | 25 min | 2 tasks | 2 files |
| Phase 03.1 P06 | 1 sessão | 2 tasks | 2 files |
| Phase 03.1 P03 | 5 min | 3 tasks | 9 files |
| Phase 03.1 P07 | 25 min | 3 tasks | 6 files |
| Phase 03.1 P08 | 14 min | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 8 fases (research sugeria 10): Mascote ficou separado dos Limites; Push e IA juntos; Casal e multiusuário juntos
- [Roadmap]: Ordem de regras do Firestore é obrigatória: login Firebase único, backfill de ownerId, índices, cliente, só então regras restritivas
- [Roadmap]: Mockups (paleta, navegação mobile, posição da Central, formato do Casal) são um portão no início da Fase 3
- [Roadmap]: Teste real do cartão (CARD-01) começa como trilha paralela somente leitura na Fase 2; o requisito é entregue na Fase 6
- [Phase 01]: Plano 01-01: pacotes SUS (firebase 13.4.0, firebase-admin 14.5.1, pluggy-sdk 0.94.3, firebase-tools 15.9.1) approved pelo dono — Gate T-01-SC fechado com evidência npm
- [Phase 01]: Higiene do repositório: untrack-all-except-amigo (.env.amigo fora, D-15) — Decisão do dono; Plano 02 aplica
- [Phase 01]: Plano 01-02: instalados exatamente firebase 13.4.0, firebase-admin 14.5.1, pluggy-sdk 0.94.3; Node 22.23.5 + JRE 21 via scripts/dev-env.sh; Dockerfile na raiz — Pacotes aprovados no Plano 01; D-10
- [Phase 01]: Fase 01-03: regras por dono em dois blocos match com lista explicita; get de settings inexistente permitido so para membro; create-users valida tudo antes de escrever e mescla claims
- [Phase 01]: [Phase 01-04]: mapCategory casa alvo por id (slug) e depois por nome; renomear categoria nao quebra classificacao
- [Phase 01]: [Phase 01-04]: weeklySpend arredonda limite semanal ao centavo e filtra lancamentos ao mes escolhido
- [Phase 01]: 01-05: usuario MOCK e escopo no inicializador do useState (regra set-state-in-effect); falha ao ler token = Conta sem acesso
- [Phase 01]: 01-05: varredura do bundle ignora signUp do SDK e as chaves antigas do purge, checando-as por uso
- [Phase 01]: 01-06: Timestamp do backup preserva seconds/nanoseconds, mas o Firestore guarda microssegundos; ensaio exige emulador vazio; categoryDefs existentes so recebem orfaos arquivados
- [Phase 01]: [Phase 01-07]: Conexao existente sem ownerId e tratada como de outro dono (403) e o agendador a registra em lastSyncError ate o backfill
- [Phase 01]: [Phase 01-07]: syncAll rejeita hid vazio para nunca virar sincronizar tudo; execucoes por chave com fila unica
- [Phase 01]: Plano 01-08: settings mantem ID fixo main; troca por documento por hid fica para a Fase 8 — Open Question 4; evita reescrita agora
- [Phase 01]: 01-09: categoryDefs do AreaContext reconciliados com settings.categories (fonte de quem esta ativo) para documento antigo e rollback — getSettings mescla DEFAULT_SETTINGS; sem reconciliar, categorias removidas ressuscitariam
- [Phase 01]: 01-13: regras restritivas publicadas (2026-11-17T18:31:31Z), dono respondeu keep; pos-cutover R8 registrado como pendencias humanas nao confirmadas (user actions, .env.local, APP_API_KEY Railway, git rm --cached .env.local, troca de senhas)
- [Phase 02]: [Phase 02-01]: Webhook Pluggy: segredo so em cabecalho x-webhook-secret (sha256 + timingSafeEqual), dono sempre de bankConnections/{itemId}, sem segredo a rota nao existe (404)
- [Phase 02]: [Phase 02-01]: syncItem na mesma fila do syncAll com coalescencia por item (itemRuns); idempotencia por eventId em memoria sem colecao webhookEvents
- [Phase 02]: 02-02: webhook desativado pela Pluggy conta em reactivated; erros do SDK mascaram segredo e client secret; validateWebhookUrl devolve motivo fixo sem trecho da URL
- [Phase 3]: 03-08: raio do Button por tamanho (tailwind-merge nao trata rounded-btn como raio); Dialog guarda onOpenChange em ref para nao roubar foco
- [Phase 3]: 03-10: personConfigFor devolve config normalizada com referencia estavel; useCycleBudget guarda o ciclo por chave e so mostra view quando pessoa:ciclo:dia das entradas bate
- [Phase 3]: 03-14: lancamento sem rede falha antes de gravar (navigator.onLine), pois o Firestore sem cache persistente nao rejeita offline e o retry duplicaria
- [Phase 3]: 03-14: com ciclo passado na tela o lancamento grava hoje se o campo Data nao foi alterado; data escolhida de proposito e respeitada
- [Phase 3]: 03-17: bloqueio de edicao dos cartoes de Configuracoes vale tambem no Porquinho (user.person !== viewPerson)
- [Phase 3]: [03-18] CouplePage mostra o H1 Casal em todos os tamanhos porque o dock e so de icones
- [Phase 3]: 03-23: CouplePage e dialog.tsx ficam fora da guarda de escala tipográfica (legado, IDEN-06); LIM-10 fechado, LIM-07 pendente até confirmar índice limitAlerts Habilitado e UAT
- [Phase 03.1]: 03.1-01: guardas estaticas particionadas por tela (um arquivo phase3-1-*.test.js por tela) com helper compartilhado — Planos paralelos da mesma onda nao editam o mesmo arquivo de teste
- [Phase 03.1]: 03.1-02: parseBRL devolve null acima de R$ 999.999,99 (teto do teclado) para nunca perder precisao
- [Phase 03.1]: 03.1-04: auditoria de layout em Node puro (Chrome 152 + CDP + Vite MOCK) em scripts/ux-audit; violacao de rolagem horizontal ignora carrosseis auto/scroll e contêineres hidden/clip
- [Phase 03.1]: 03.1-05: sketches 014 e 015 sem requisição de rede (ícones Lucide inline, sem fonte externa); Metas B usa o Sheet de ações como detalhe
- [Phase 03.1]: [03.1-06] Sketches 016 e 017 offline (SVG inline, sem fontes externas), na escala 12/16/28/56; Login com mensagem fixa de falha
- [Phase 03.1]: 03.1-07: groupBillsByCategory recebe itens com categoria acrescentada pelo chamador (BillItem nao carrega categoria) — budget.js fora do escopo; tela junta a categoria da conta a cada ocorrencia
- [Phase 03.1]: [03.1-08] Icone Plus do botao de lancamento usa size-7 (28px) para nao ser acusado como alvo de toque pelo helper touchProblems

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
- 01-02: .env.local ainda rastreado no git; guard de segredos bloqueou git rm --cached .env.local. Rodar manualmente.

### Roadmap Evolution

- Phase 03.1 inserted after Phase 3: Redesign das abas no estilo da Home (UX mobile)

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| *(none)* | | | | |

## Session Continuity

Last session: 2026-11-19T14:10:06.071Z
Stopped at: Completed 03.1-08-PLAN.md
Resume file: None
