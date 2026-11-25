---
phase: 06-cart-o-de-cr-dito
plan: 15
subsystem: cartao-de-credito
tags: [fechamento, guarda-transversal, validacao, uat]
requires: [06-14]
provides:
  - "test/static/phase6-final.test.js: guarda transversal da fase 6 (14 testes)"
  - "06-VALIDATION.md: mapa por requisito, por plano e por decisao (D-11 a D-14), com CARD-05 parcial"
  - "06-UAT-ROTEIRO.md: roteiro do dono e as duas decisoes ainda abertas"
key-files:
  created:
    - test/static/phase6-final.test.js
    - .planning/phases/06-cart-o-de-cr-dito/06-VALIDATION.md
    - .planning/phases/06-cart-o-de-cr-dito/06-UAT-ROTEIRO.md
decisions:
  - "CARD-05 fica parcial e nyquist_compliant fica false ate o dono responder o roteiro (D-06, D-07)"
  - "A guarda de cobertura dos requisitos ignora os planos de fechamento 06-14 e 06-15, que listam os dez requisitos e tornariam a prova vazia"
  - "ROADMAP.md e REQUIREMENTS.md nao foram tocados: marcar a fase e os requisitos e do verificador, depois do UAT do dono"
status: complete
plan_head_before: 9c64c0ef486184b4928e595fdc84f8e1057b9b0f
commits: 3
actuals:
  tokens: 8600
  tasks: 3
  commits: 3
requirements: [CARD-01, CARD-02, CARD-03, CARD-04, CARD-05, CARD-06, CARD-07, CARD-08, CENT-03, CENT-04]
completed: 2026-11-25
---

# Phase 6 Plan 15: fechamento da fase do cartao Summary

Guarda estatica transversal (14 testes), suite completa verde com as contagens registradas, mapa de validacao por requisito com CARD-05 parcial e roteiro de UAT com as decisoes que continuam do dono.

## Tarefas

| Tarefa | Commit | Arquivos |
|--------|--------|----------|
| 1. Guarda estatica transversal | 60aaa251 | test/static/phase6-final.test.js |
| 2. Suite completa e mapa de validacao | 37e1d579 | 06-VALIDATION.md |
| 3. Roteiro de UAT e decisoes abertas | 77823d9a | 06-UAT-ROTEIRO.md |

Nota sobre `commits`: `git rev-list --count 9c64c0ef..HEAD` dava 5 ao fechar, porque dois commits do trabalho da fala do Vintem (`05aa6c0c` e `3e2f6130`, feitos pelo dono em paralelo na mesma `main`) entraram no intervalo. Os commits deste plano sao 3.

## O que a guarda transversal trava

Cobertura dos dez requisitos pelos planos de implementacao; regras (`cards` so leitura, `cardSettings` do cliente, sem `if true`); indice de `transactions` por `ownerId`, `cardId` e `date`; nove modulos puros do nucleo com teste e so imports relativos; nenhum emoji nos arquivos novos; dock com exatamente 9 destinos e Cartoes entre Contas fixas e Metas (D-11); servidor sem campo do titular; historico do cartao com ensaio como padrao, `--backup` e `assertRecentBackup` (D-13); `webhook.js` e `app.js` sem o cartao e interface sem texto de tempo real (D-14); interface sem import direto de firebase; `AccountsSkeletonCard.tsx` ausente; `LaunchSheet` com `manualCardFields` e o cartao so na aba Gasto (D-12); `/cartoes` nos auditores; e as guardas por plano continuam na suite. Foi feita uma mutacao de teste (campo do titular em `card-payments.js`): a guarda falhou como esperado e o arquivo foi restaurado.

## Resultado da suite completa (25/11/2026)

| Comando | Resultado |
|---------|-----------|
| `node --test test/static/phase6-final.test.js` | 14 passam, 0 falham |
| `npm run test:core:tz` | 900 passam em UTC e 900 em Asia/Tokyo, 0 falham |
| `npm run test:server` | 124 passam, 0 falham |
| `npm run test:emu` | 153 passam, 0 falham |
| `npm run test:rules` | 13 passam, 0 falham |
| `npm run test:static` | 695 testes, 693 passam, 0 falham, 2 ignorados (ja existentes) |
| `npm run build` | saida 0 (22 entradas de pre-cache) |
| `npm run lint` | saida 0 |

## Deviations from Plan

None - plan executed exactly as written. A unica escolha de projeto foi a da guarda (1) excluir 06-14 e 06-15 da uniao de `requirements`, para a prova de cobertura nao ser tautologica; a uniao dos demais planos cobre os dez requisitos.

## Observacoes

- Durante a rodada da suite o diretorio de trabalho tinha alteracoes que nao sao deste plano (`toast.tsx`, `VintemToast.tsx`, `index.css` e `phase4-reactions.test.js`, da fala do Vintem espiando pela lateral); nao foram tocadas nem commitadas aqui, e a suite passou com elas presentes.
- Os dois testes ignorados da suite estatica sao os de sempre (bundle de producao sem credenciais legadas, e a lista de bloqueio de frases do dono, nao fornecida).
- Nenhum pacote foi instalado, nenhum deploy ou push foi feito, e nenhum `.env*` foi lido.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum: o plano so acrescenta uma guarda de teste e dois documentos, sem endpoint, caminho de autenticacao ou acesso a arquivo novo. Os documentos nao trazem lojas, descricoes, identificadores nem valores de lancamento (T-06-52).

## Pendente (do dono e do tempo)

Ver `06-UAT-ROTEIRO.md`: ciclo diario do MeuPluggy, fechamento e vencimento de dezembro, pagamento real, primeira compra parcelada (CARD-05), dock no celular, lancamento manual no cartao e o historico importado. Decisoes abertas: dia do fechamento e menu de configuracao por usuario. ROADMAP.md e REQUIREMENTS.md seguem sem marcacao ate o verificador.

## Self-Check: PASSED

- FOUND: test/static/phase6-final.test.js, 06-VALIDATION.md, 06-UAT-ROTEIRO.md
- FOUND commits: 60aaa251, 37e1d579, 77823d9a
