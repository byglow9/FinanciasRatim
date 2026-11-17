---
phase: 01-funda-o-de-dados-e-acesso
plan: 01
subsystem: infra
tags: [supply-chain, npm, firebase, firebase-admin, pluggy-sdk, firebase-tools, gitignore]

requires: []
provides:
  - "Evidência npm dos 4 pacotes SUS em 01-01-PACKAGE-EVIDENCE.md"
  - "Aprovação humana dos pacotes (approved) consumida pelo Plano 02"
  - "Decisão de higiene do repositório (untrack-all-except-amigo) consumida pelo Plano 02"
affects: [01-02, FUND-07, FUND-01, FUND-04]

actuals:
  tokens: 1862
  tasks: 3
  commits: 1
plan_head_before: b8fcc286bf3639e2e98d9249dd430ec721e15cf6

tech-stack:
  added: []
  patterns:
    - "Gate de supply chain: evidência npm colada no arquivo, checkpoint blocking-human antes de qualquer install"

key-files:
  created:
    - .planning/phases/01-funda-o-de-dados-e-acesso/01-01-PACKAGE-EVIDENCE.md
  modified: []

key-decisions:
  - "Pacotes SUS aprovados pelo dono sem pin: firebase 13.4.0, firebase-admin 14.5.1, pluggy-sdk 0.94.3 e reinstalação de firebase-tools 15.9.1"
  - "Higiene do repositório: untrack-all-except-amigo (.env.local, dist/, node_modules/, server/node_modules/ e .firebase/ saem do índice; .env.amigo fica, D-15)"

requirements-completed: []  # FUND-07 declarado no plano, mas só gate; nada instalado aqui. Marcação fica para o plano que instala (ready-ids: 0/1)

coverage:
  - id: D1
    description: "Evidência npm dos quatro pacotes SUS registrada em 01-01-PACKAGE-EVIDENCE.md antes do checkpoint, sem instalar nada"
    requirement: FUND-07
    verification:
      - kind: other
        ref: "test -s 01-01-PACKAGE-EVIDENCE.md && grep -q de cada pacote@versão (comando de <verify> da Task 1)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Dono aprovou a legitimidade dos pacotes SUS e escolheu a opção de higiene do repositório"
    requirement: FUND-07
    verification: []
    human_judgment: true
    rationale: "Gate blocking-human de supply chain e decisão do dono; respostas relayadas pelo orquestrador, não há teste que prove"

duration: ~10min (estimado; hora de início não registrada)
completed: 2026-11-17
status: complete
---

# Phase 1 Plan 01: Gates de pacotes e higiene do repositório Summary

**Evidência npm colada para firebase 13.4.0, firebase-admin 14.5.1, pluggy-sdk 0.94.3 e firebase-tools 15.9.1, mais as respostas do dono: pacotes `approved` e higiene `untrack-all-except-amigo`, prontas para o Plano 02.**

## Performance

- **Duration:** ~10 min (estimado)
- **Completed:** 2026-11-17T15:57Z
- **Tasks:** 3 (1 auto, 1 human-verify, 1 decision)
- **Files modified:** 1 (criado)

## Accomplishments

- Evidência `npm view` (publicação, repositório, mantenedores, scripts, engines, integridade, deprecated, versão anterior para pin) colada para os quatro pacotes, com a seção "Veredito do pesquisador" copiada do RESEARCH.
- Nada foi instalado; `package.json` e lockfiles intactos.
- Gate T-01-SC fechado com aprovação humana; decisão de higiene do repositório registrada.

## Respostas literais do dono (consumidas pelo Plano 02)

Relayadas pelo orquestrador a partir do dono.

**Task 2 (pacotes SUS):** `approved`
- Significado conforme o resume-signal: instalar exatamente firebase 13.4.0, firebase-admin 14.5.1, pluggy-sdk 0.94.3 e reinstalar firebase-tools 15.9.1.

| Pacote | Decisão |
|--------|---------|
| firebase@13.4.0 | approved |
| firebase-admin@14.5.1 | approved |
| pluggy-sdk@0.94.3 | approved |
| firebase-tools@15.9.1 | approved (reinstalação da mesma versão; NÃO usar 15.36.0) |

Observação para o Plano 02: pluggy-sdk@0.94.3 exige Node `^22.23.4 || >=24.22.1`; a máquina local estava em Node 22.17.1 quando a evidência foi coletada.

**Task 3 (higiene do repositório):** `untrack-all-except-amigo`
- Parar de versionar (`git rm --cached`, arquivos permanecem no disco): `.env.local`, `dist/`, `node_modules/`, `server/node_modules/`, `.firebase/`.
- `.env.amigo` fica fora do escopo (D-15). O Plano 02 cria o `.gitignore` e aplica esta opção.
- Lembrete: o histórico já público continua exposto; tratar a chave compartilhada e a senha legada como já expostas (mitigação real em FUND-01 e FUND-04).

## Task Commits

1. **Task 1: Coletar evidência npm dos pacotes SUS** - `68249b4b` (docs)
2. **Task 2: Verificar legitimidade dos pacotes (checkpoint human-verify, blocking-human)** - sem commit (resposta humana `approved`)
3. **Task 3: Decidir higiene do repositório (checkpoint decision, blocking-human)** - sem commit (resposta humana `untrack-all-except-amigo`)

**Plan metadata:** commit `docs(01-01): complete plan` (SUMMARY, STATE, ROADMAP)

## Files Created/Modified

- `.planning/phases/01-funda-o-de-dados-e-acesso/01-01-PACKAGE-EVIDENCE.md` - tabela de evidência npm dos 4 pacotes, detalhes colados e veredito do pesquisador

## Decisions Made

- Aprovar sem pin os quatro pacotes SUS (a alternativa de pin ficou registrada no arquivo de evidência: firebase 13.3.0, firebase-admin 14.5.0, pluggy-sdk 0.94.2, firebase-tools 15.9.0).
- Higiene `untrack-all-except-amigo` para o Plano 02.

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written no código; houve uma interrupção de processo, abaixo.

### Process note (não é deviation de código)

- O guard de HEAD do protocolo recusou o commit da Task 1 em `main` (branch padrão, `git.allow_default_branch_commits` ausente). A execução foi interrompida e reportada; o orquestrador relatou que o dono autorizou e a chave foi setada em `.planning/config.json` (arquivo da orquestração, não commitado por este plano). Com o guard liberado pela config, o commit foi feito normalmente.

**Total deviations:** 0 auto-fixed
**Impact on plan:** Nenhum no escopo; apenas atraso de uma rodada.

## Issues Encountered

- Nenhum comando de rede falhou. A evidência indica que firebase-tools@15.9.1 tem mais de 8 meses (o `too-new` do RESEARCH refere-se à 15.36.0).
- firebase-admin e pluggy-sdk declaram `prepare`; não são scripts de instalação para dependências do registro (conferência no site ficou a cargo do dono, que aprovou).

## User Setup Required

None - no external service configuration required.

## Threat Flags

None.

## Next Phase Readiness

- Plano 02 pode instalar exatamente as versões aprovadas e aplicar `untrack-all-except-amigo`. Precisa de Node >= 22.23.4 para pluggy-sdk 0.94.3 (e Node >= 22 para firebase-admin 14).
- `.env.amigo` e o projeto do amigo permanecem intocados (D-15).

## Self-Check: PASSED

- FOUND: `.planning/phases/01-funda-o-de-dados-e-acesso/01-01-PACKAGE-EVIDENCE.md`
- FOUND: commit `68249b4b`
- `commits:` medido por `git rev-list --count b8fcc286..HEAD` = 1 (antes do commit do SUMMARY)

---
*Phase: 01-funda-o-de-dados-e-acesso*
*Completed: 2026-11-17*
