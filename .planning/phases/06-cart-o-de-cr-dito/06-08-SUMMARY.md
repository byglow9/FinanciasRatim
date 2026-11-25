---
phase: 06-cart-o-de-cr-dito
plan: 08
subsystem: cartao-de-credito
tags: [servidor, sync, pagamento-de-fatura, firestore, script-do-dono, backup]
status: complete

requires:
  - phase: 06-05
    provides: "detectCardPayments e as regras de caixa do cartao"
  - phase: 06-06
    provides: "bankImports de pagamento visto no cartao (cardId, reason card_payment) e cards.billTotals"
provides:
  - "classify: pagamento de fatura que sai da conta vira transferencia vinculada (transfer true, cardKind payment)"
  - "ownerHasCard e reconcileCardPayments (cards/{id}.payments)"
  - "reclassify-card-payments.js (ensaio por padrao) e assertRecentBackup"
affects: [06-12, 06-14, 06-15, 06-19]

actuals:
  tokens: 12726
  tasks: 3
  commits: 4

commits: 4
plan_head_before: a9897c61dbaa3671f7b5f5c78c318d5de87fc9ae
plan_head_after: 3a9e4c32

tech-stack:
  added: []
  patterns:
    - "script do dono: ensaio por padrao, --apply so com --backup recente, saida so com contagens"
    - "evidencia lida em janela de 90 dias; o que sai da janela fica guardado em cards.payments"

key-files:
  created:
    - server/src/card-payments.js
    - server/scripts/reclassify-card-payments.js
    - server/scripts/lib/backup-guard.js
    - server/test/backup-guard.test.js
    - server/test/emu/card-payments.test.js
  modified:
    - shared/core/classify.js
    - shared/core/classify.test.js
    - server/src/sync.js
    - server/src/card-sync.js

key-decisions:
  - "Ligacao de pagamento so alcanca faturas do mes anterior ao inicio da janela de 90 dias em diante"
  - "Pagamento cuja evidencia saiu da janela continua em cards.payments e abate a fatura antes dos novos"
  - "Saida que e o outro lado de um credito visto num cartao fica reservada a esse cartao"
  - "Reconciliacao de pagamentos nao roda na rodada em que o cartao daquela conexao falhou"

requirements-completed: []  # CARD-04 e CARD-06 seguem Pending: testes de emulador nao rodaram

coverage:
  - id: D1
    description: "Pagamento de fatura na conta vira transferencia; transferencia propria sem texto continua em revisao"
    requirement: "CARD-04"
    verification:
      - kind: unit
        ref: "shared/core/classify.test.js (node --test)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Cartao do dono (nao do item) no sync, com transfer e cardKind gravados"
    requirement: "CARD-04"
    verification:
      - kind: integration
        ref: "server/test/emu/card-payments.test.js (npm run test:emu)"
        status: unknown
    human_judgment: true
    rationale: "Emulador indisponivel nesta maquina"
  - id: D3
    description: "Pagamentos ligados a fatura em cards/{id}.payments"
    requirement: "CARD-06"
    verification:
      - kind: integration
        ref: "server/test/emu/card-payments.test.js (npm run test:emu)"
        status: unknown
    human_judgment: true
    rationale: "Emulador indisponivel nesta maquina; so o nucleo detectCardPayments foi testado"
  - id: D4
    description: "assertRecentBackup recusa copia ausente, invalida, velha, futura ou incompleta"
    verification:
      - kind: unit
        ref: "server/test/backup-guard.test.js (npm run test:server)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Script de reclassificacao idempotente, por dono, ensaio por padrao"
    requirement: "CARD-04"
    verification:
      - kind: integration
        ref: "server/test/emu/card-payments.test.js (npm run test:emu)"
        status: unknown
    human_judgment: true
    rationale: "Escrita em massa em dados reais; os testes de emulador nao rodaram"

duration: 12min (so o fechamento)
completed: 2026-11-24
---

# Phase 6 Plan 08: Pagamento da fatura no servidor Summary

**O pagamento da fatura que sai de uma conta bancária vira transferência vinculada à fatura, mesmo vindo de outro banco, com script do dono para corrigir o histórico. Os testes de emulador NÃO rodaram: nada deve ser publicado antes deles.**

## Atenção antes de qualquer outra coisa

1. **`origin/main` já está em `a9897c61`** (referência local, sem `git fetch`). Isso inclui o código do 06-08 anterior às correções abaixo e a importação do cartão do 06-06. Se o Railway publica a cada push em `main`, essa versão pode estar em produção. Não verifiquei o Railway.
2. **A importação do cartão nessa versão não tem o portão do D-13**: `card-sync.js` e `sync.js` não citam `historyBaselineAt` (é o 06-19, pendente). Se estiver publicada com o Nubank conectado, o sync automático já pode ter gravado o histórico do cartão sem ensaio nem cópia de segurança.
3. **Os 4 commits do fechamento são locais.** Não houve push.
4. O commit `a9897c61` ("save") levou junto um binário na raiz do repositório: `fonttools-4.68.0-...manylinux_2_17_x86_64.whl` (cerca de 5 MB). Não foi removido.

## Performance

- **Fechamento:** 2026-11-25T00:50Z a 01:02Z (cerca de 12 min). A duração da execução original não foi registrada.
- **Tasks:** 3 de 3 implementadas
- **Arquivos:** 9

## Task Commits

1. **Task 1 (classify):** `c8158f91` (feat)
2. **Task 2 (cartão do dono, `cards.payments`):** `4218bcb2` (feat)
3. **Task 3 (script e cópia de segurança):** `a9897c61` (commit "save", misturado com arquivos de planejamento e o `.whl`)
4. **Correções do fechamento:**
   - `5c3685bf` (fix): fatura do histórico não recebe pagamento da janela
   - `f73ae327` (fix): pagamento que sai da janela continua guardado
   - `222dbf89` (fix): com dois cartões o pagamento não conta nos dois
   - `3a9e4c32` (test): transferência própria sem cartão continua em revisão

Os campos `commits`, `plan_head_before` e `plan_head_after` medem só a janela do fechamento: os commits originais se intercalam com os de outros planos.

## Conferência com o plano

| Item | Código | Prova |
| ---- | ------ | ----- |
| T1: pagamento na conta sai `imported`, `transfer`, `cardKind payment` | Atende | unitário passa |
| T1: transferência própria sem texto continua `review/self_transfer` | Atende | unitário passa |
| T1: só os testes de `review`/`card_payment` mudaram, descritos | Atende (ver abaixo) | diff conferido |
| T2: item sem cartão importa como transferência se o dono tem cartão | Atende | **emulador pendente** |
| T2: mesma operação nos dois lados conta uma vez | Atende após `222dbf89` e `f73ae327` | **emulador pendente** |
| T2: transferência própria não cria lançamento nem muda saldo | Atende | classify passa; sync **emulador pendente** |
| T3: ensaio não grava, aplicar marca, repetir não muda | Atende por leitura | **emulador pendente** |
| T3: nenhum lançamento de outro casal é tocado | Atende por leitura | **emulador pendente** |
| T3: saída só com contagens | Atende por leitura | **emulador pendente** |
| T3: aplicar sem cópia recente é recusado | Atende | guard: unitário passa; recusas da linha de comando rodadas à mão (sem `--hid`, sem `--backup`, arquivo ausente) |
| Artefatos e `key_links` | Presentes | leitura |
| Proibições (sem produção, sem segredos, sem lançamento de self) | Respeitadas no fechamento | só os caminhos de recusa do script rodaram, antes de abrir o Firestore |

**Testes do classify que mudaram de propósito:** o caso "pagamento de fatura na conta vai para revisão só se o cartão está conectado" (esperava `reason card_payment`) agora espera `imported`, `cardKind payment`, `transfer true`. O caso de transferência própria passou a rodar com cartão, e a asserção sem cartão foi restaurada em `3a9e4c32`. Foram acrescentados casos para precedência sobre transferência própria, sem cartão e crédito com texto de fatura.

## Verificação executada

| Comando | Resultado |
| ------- | --------- |
| `npm run test:core` | 875 de 875 |
| `npm run test:server` | 124 de 124 |
| `node --test shared/core/classify.test.js cardTx.test.js purity.test.js` | 164 de 164 |
| `npm run test:static` | 639 passam, 11 falham, 7 pulados: as mesmas 11 falhas da base (CRLF e separadores do Windows) |
| `npx eslint shared/core server/src server/scripts server/test` | sem erros |
| `npx tsc -p tsconfig.app.json --noEmit` | **não verificado**: para em `TS2688` porque `vite-plugin-pwa` não está instalado nesta máquina |
| `npm run test:emu` | **NÃO RODOU** (só Java 8, sem firebase-tools) |
| `npm run test:rules` | **NÃO RODOU** |

**Simulação, que não conta como emulador:** executei `card-payments.test.js` (23), `card-sync.test.js` (25) e `sync.test.js` (17) contra um Firestore falso em memória, mantido fora do repositório. Os 65 passaram. Ele não verifica índices, regras, tipos, limites de lote reais nem o comportamento do Admin SDK. Foi nele que os testes das três correções falharam antes e passaram depois.

## Testes de emulador pendentes

Nada deve ser publicado antes de `npm run test:emu` e `npm run test:rules` passarem.

`server/test/emu/card-payments.test.js`, "pagamento da fatura":
1. item sem conta CREDIT do dono que tem cartao em outro item importa o pagamento como transferencia
2. dono sem nenhum cartao importa o mesmo texto como saida comum
3. ownerHasCard nunca enxerga o cartao de outro casal
4. cards.payments traz o pagamento ligado a fatura e a mesma operacao nos dois lados conta uma vez
5. so o lado da conta: evidencia bank-text, lancamento ligado, rodar duas vezes nao duplica
6. pagamento parcial com fechamento abate a fatura fechada mais antiga e nao a aberta
7. closingDay de cardSettings de outro casal e ignorado
8. transferencia propria de valor exato vira bank-self sem lancamento; valor diferente nao
9. transferencia propria no sync continua em revisao e nao cria lancamento
10. guarda no maximo 24 pagamentos, os mais recentes
11. nunca toca cartao nem lancamento de outro casal
12. fatura do historico, fora do alcance da janela, nunca recebe o pagamento (novo)
13. pagamento que saiu da janela continua guardado (novo)
14. na borda da janela, o outro lado de um pagamento guardado nao conta de novo (novo)
15. com dois cartoes, a saida do credito de um cartao nao conta no outro (novo)
16. a rodada do sync do cartao nao trata o pagamento ligado como compra

Mesmo arquivo, "reclassificacao dos pagamentos de fatura antigos":

17. ensaio nao grava; --apply marca; rodar de novo nao altera
18. gasto comum, compra do cartao e lancamento de outro casal nao sao tocados
19. dono sem cartao: nada e reclassificado
20. muitos lancamentos: grava em lotes e conta tudo
21. linha de comando sem --hid falha; a saida nunca traz descricao, valor ou id
22. --apply sem --backup ou com copia recusada nao grava nada
23. com copia valida aplica; o ensaio nao exige copia

Também pendentes por regressão: `sync.test.js`, `card-sync.test.js`, `backfill.test.js`, `check-indexes.test.js`, `export-import.test.js`, `owner-path.test.js`, `rehearsal.test.js`, `verify.test.js` e `test/rules/*.test.js`.

**Critérios sem verificação real:** consultas só de igualdade sem índice composto em produção, `set` com `mergeFields` em `cards.payments`, lotes do script e o formato real da cópia do `export-firestore.js` passando pelo guard (conferido só por leitura).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pagamento ligado a fatura de anos atrás** (`5c3685bf`)
- As evidências cobrem 90 dias e `billTotals` o histórico inteiro. No cenário de teste, um parcial de novembro de 2026 abateu abril de 2025.
- Agora só entram faturas do mês anterior ao início da janela em diante. Os cenários com relógio real passaram a derivar o mês da fatura da data do pagamento, para não falharem meses depois.

**2. [Rule 1 - Bug] Pagamento apagado depois de 90 dias** (`f73ae327`)
- `payments` era sobrescrito só com a janela, então a fatura paga voltaria a "atrasada".
- Os guardados anteriores à janela são mantidos (limite de 24), abatidos da fatura, e o outro lado da mesma operação não recontado na borda.

**3. [Rule 1 - Bug] Mesma operação em dois cartões** (`222dbf89`)
- O primeiro cartão da lista podia abater a fatura dele com o pagamento do outro.

**4. [Cobertura] Asserção de transferência própria sem cartão restaurada** (`3a9e4c32`)

### Diferenças já presentes na execução original

- `server/src/card-sync.js` foi alterado (fora de `files_modified`): o lançamento de pagamento não entra na reconciliação de compras.
- `reconcileCardPayments` não roda se o cartão daquela conexão falhou na rodada (`summary.cardError`).
- `ownerHasCard` só é consultado quando o item não tem conta CREDIT, com `try` próprio.
- Task 3 não teve commit atômico próprio.
- `scripts/dev-env.sh` não funciona nesta máquina: usei o Node 24.15.0 do sistema (o `pluggy-sdk` pede `^24.22.1` na linha 24).

## Riscos conhecidos, não corrigidos

1. **Conta de consumo pode virar pagamento de cartão.** `isCardBillPayment` devolve verdadeiro para "PAGAMENTO DE FATURA ENERGIA ELETRICA" e "PAGTO FATURA CELULAR". Como o "tem cartão" agora vale para o dono todo, esses gastos sairiam dos limites. Vale para importações novas e para o script. O plano proibia mudar outro comportamento do classify. **Decidir antes de publicar** e conferir o ensaio do script antes de aplicar (a saída traz só contagens, então a conferência é pelo número).
2. **O texto real do banco não foi confirmado.** "PGTO FATURA" não casa com o regex. Conferir no gate 06-14 como o Bradesco descreve o pagamento do Nubank.
3. Se o banco sincroniza antes de o primeiro cartão existir em `cards`, o pagamento entra como gasto comum; só o script corrige.
4. Pagamento que casa com um lançamento manual vai para revisão (`duplicate`) e não vira evidência.
5. Faturas antigas sem pagamento detectado aparecem como "atrasada" no sino e no Calendário (06-13) quando há fechamento e vencimento, até "Marcar como paga" (06-12). Com o histórico inteiro importado podem ser muitas.
6. Com dois cartões e sem crédito visto no cartão, uma saída só por texto é disputada pela ordem dos cartões.
7. Pagamento feito mais de um mês depois do mês anterior ao início da janela fica sem fatura (`billMonth` nulo).
8. Pagamento guardado fora da janela não é recalculado, mesmo que o lançamento seja apagado.
9. Pagamentos que o caminho antigo deixou em revisão (`card_payment` no lado da conta) não têm lançamento, e o script não os recupera.
10. Cada rodada lê todos os `bankImports` de cada cartão (histórico inteiro). Um filtro extra por `reason` reduziria as leituras da cota Spark.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova além do registro do plano. T-06-28 (gasto legítimo reclassificado) está **mitigado só em parte**: o texto aceito não é estreito, ver risco 1.

## Next Phase Readiness

- 06-19 pode reusar `assertRecentBackup`.
- Bloqueios para publicar: testes de emulador e de regras, decisão sobre o risco 1 e conferência do estado do Railway.

## Self-Check: PASSED

Os 5 arquivos criados e os commits `c8158f91`, `4218bcb2`, `a9897c61`, `5c3685bf`, `f73ae327`, `222dbf89` e `3a9e4c32` existem. O self-check cobre só presença de arquivos e commits; os testes de emulador seguem pendentes.
