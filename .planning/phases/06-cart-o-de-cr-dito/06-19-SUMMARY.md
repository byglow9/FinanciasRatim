---
phase: 06-cart-o-de-cr-dito
plan: 19
subsystem: cartao-de-credito
tags: [servidor, sync, historico, ensaio, backup, script-do-dono]
status: complete

requires:
  - phase: 06-08
    provides: "assertRecentBackup e o padrao do script do dono"
  - phase: 06-18
    provides: "adocao e reassentamento planejados antes de gravar, em syncCardTransactions"
provides:
  - "marcador cards/{accountId}.historyBaselineAt: sem ele o sync automatico nao grava compras do cartao"
  - "syncCardTransactions com dryRun e baseline; syncConnection com cardHistory e cardHistoryPending no resumo"
  - "server/scripts/card-history.js (runCardHistory e main), ensaio por padrao"
affects: [06-14, 06-20]

actuals:
  tokens: 16800
  tasks: 3
  commits: 6

commits: 6
plan_head_before: 06971614bbd1370719a7b4589bf496236eeee83a
plan_head_after: 7d6927db7c53262391da7271b331e4c4f1096211

tech-stack:
  added: []
  patterns:
    - "primeira reclassificacao em massa so por script do dono: marcador, ensaio, copia conferida documento a documento"

key-files:
  created:
    - server/scripts/card-history.js
    - server/test/emu/card-history.test.js
  modified:
    - server/src/card-sync.js
    - server/src/sync.js
    - server/test/emu/card-sync.test.js
    - server/test/emu/card-payments.test.js

key-decisions:
  - "Aplicar so aceita copia que traga, como estao agora, todos os lancamentos e importacoes do casal (e os cartoes ja gravados)"
  - "Resposta vazia da Pluggy nao define o marcador"
  - "O marcador guarda a data da primeira aplicacao e nao e regravado"
  - "Um conjunto de manuais ja reservados e compartilhado entre as conexoes, para o ensaio contar como a aplicacao"
  - "O estado deixado por versoes anteriores so e contado enquanto o cartao nao tem marcador"

requirements-completed: []  # CARD-03, CARD-06 e CARD-07 seguem Pending: testes de emulador nao rodaram

coverage:
  - id: D1
    description: "Sem o marcador o sync automatico nao grava compras do cartao"
    requirement: "CARD-07"
    verification:
      - kind: integration
        ref: "server/test/emu/card-sync.test.js (npm run test:emu)"
        status: unknown
    human_judgment: true
    rationale: "Emulador indisponivel; protege contra reescrita de dados financeiros reais"
  - id: D2
    description: "Ensaio nao grava e conta o mesmo que a aplicacao"
    requirement: "CARD-07"
    verification:
      - kind: integration
        ref: "server/test/emu/card-sync.test.js e card-history.test.js (npm run test:emu)"
        status: unknown
    human_judgment: true
    rationale: "Emulador indisponivel"
  - id: D3
    description: "Aplicar sem copia valida, recente e que cubra os documentos do casal e recusado"
    requirement: "CARD-07"
    verification:
      - kind: integration
        ref: "server/test/emu/card-history.test.js (npm run test:emu)"
        status: unknown
    human_judgment: true
    rationale: "Emulador indisponivel; a comparacao com o formato do Admin SDK real nao foi conferida"
  - id: D4
    description: "Historico inteiro, sem corte de idade, so do casal de --hid, saida so com contagens"
    requirement: "CARD-03"
    verification:
      - kind: integration
        ref: "server/test/emu/card-history.test.js (npm run test:emu)"
        status: unknown
    human_judgment: true
    rationale: "Emulador indisponivel"

duration: nao medida por inteiro (implementacao e verificacao cerca de 8min, mais a leitura)
completed: 2026-11-24
---

# Phase 6 Plan 19: Primeira importação controlada do histórico do cartão Summary

**Sem `historyBaselineAt` o sync automático grava só limite e agregados; o histórico entra pelo script `card-history.js`, que ensaia por padrão e só aplica com cópia de segurança conferida. Os testes de emulador NÃO rodaram: nada deve ser publicado antes deles, e o script não deve ser usado em produção antes deles.**

## Antes de publicar ou aplicar

1. **Rodar `npm run test:emu` e `npm run test:rules`** (lista abaixo). Nada deste plano foi verificado no emulador.
2. **`origin/main` já tem o importador do 06-06 sem esta trava** (`a9897c61`, referência local, sem `git fetch`). Se o Railway publicou, pode já ter gravado compras sem ensaio. O ensaio mostra isso (`priorImported`, `priorReview`, `priorWithoutTx`, `priorUnadopted`), mas **aplicar não conserta**: o que ficou em revisão não é recriado nem adotado, e manual antigo parecido com compra já importada segue duplicado.
3. **Publique o servidor com a trava antes de aplicar.** O código antigo ignora o marcador.
4. **Não existe restauração automática em produção.** `importAll` só grava no emulador. A adoção não guarda os valores anteriores do manual; com a cópia em mãos, voltar atrás exige escrever um script de restauração. Decidir antes de aplicar.
5. Há 21 commits locais à frente de `origin/main`, mais o commit deste resumo. Nenhum push foi feito.

## Como o dono usa

```
PLUGGY_CLIENT_ID=... PLUGGY_CLIENT_SECRET=... FIREBASE_SERVICE_ACCOUNT_FILE=<fora do repo> \
node server/scripts/card-history.js --hid <id-do-casal>                    # ensaio
node server/scripts/export-firestore.js --out backups/<arquivo>.json       # copia
node server/scripts/card-history.js --hid <id-do-casal> --apply --backup backups/<arquivo>.json
```

Exportar logo antes de aplicar. Se qualquer lançamento ou importação do casal mudar no meio (sync automático, edição no app), a aplicação é recusada e basta exportar de novo, guardando as cópias anteriores. Repetir a aplicação também exige cópia nova.

## Tarefas e commits

| Tarefa | Commits | O que entrega |
| ------ | ------- | ------------- |
| 1. Marcador e ensaio | `05c738e5` (test), `deb4fe72` (feat) | `dryRun`, `baseline`, `historyBaselineAt`, contagens |
| 2. `syncConnection` | `6feb0b92` (test), `ca8b4854` (feat) | `cardHistory` `dry-run` ou `apply`, `cardHistoryPending` |
| 3. Script do dono | `785d11ee` (test), `7d6927db` (feat) | `card-history.js` |

`webhook.js`, `app.js` e o agendador não mudaram (D-14).

## Verificação executada

| Comando | Resultado |
| ------- | --------- |
| `npm run test:core` | 900 de 900 |
| `npm run test:server` | 124 de 124 |
| `npm run test:static` | 647 passam, 11 falham, 7 pulados: as 11 falhas da linha de base |
| `npx eslint shared/core server/src server/scripts server/test` | sem erros |
| `npm run test:emu` | **NÃO RODOU** (Java 8, sem firebase-tools) |
| `npm run test:rules` | **NÃO RODOU** |

Node 24.15.0 do sistema (`scripts/dev-env.sh` não funciona nesta máquina).

**Simulação, que não conta como emulador:** com o Firestore falso em memória, fora do repositório, passaram `card-history`, `card-sync`, `sync` e `card-payments` (109 de 109, sem os 3 testes que abrem processo filho). O falso não confere índices, regras, limites reais nem o Admin SDK. Acrescentei a ele `listCollections` para o `exportAll` real gerar a cópia dos testes.

**Aviso sobre a execução local:** na primeira rodada do falso com `card-payments.test.js`, o filtro para pular os testes de linha de comando não valeu (o Git Bash converteu o padrão) e eles abriram `reclassify-card-payments.js` em processo filho. Antes disso eu tinha conferido que nenhuma variável de credencial estava definida (só presença); o script parou em "Defina FIREBASE_SERVICE_ACCOUNT_FILE" ou na recusa da cópia, antes de abrir o Firestore. Nenhuma produção foi acessada. `card-history.js` nunca foi executado como processo.

## TDD Gate Compliance

- **Tarefa 1:** 7 cenários vermelhos antes da implementação, classificados `RED_EVIDENCE_OK` (alvo: o ensaio não grava).
- **Tarefa 2:** 6 vermelhos antes da implementação; sem classificador.
- **Tarefa 3:** 11 vermelhos contra um esqueleto vazio (não commitado); sem classificador. Um cenário precisou de ajuste no teste (a cópia de um casal sem lançamentos não tem a coleção `transactions`).
- Todo RED e GREEN foi visto só no Firestore falso.

## Testes de emulador pendentes

`server/test/emu/card-history.test.js`, "script do historico do cartao (D-13)":
1. argumentos inválidos falham sem abrir nada
2. sem credenciais da Pluggy falha sem abrir nada
3. ensaio é o padrão, não grava, imprime contagens e o próximo passo
4. ensaio mostra o que uma versão anterior importou ou reteve
5. `--apply` sem cópia válida e recente é recusado
6. cópia que não cobre os documentos atuais é recusada
7. aplica, define o marcador, repete as contagens e depois zera
8. `runCardHistory` devolve só contagens
9. dono sem cartão
10. falha na Pluggy não libera nem imprime a mensagem
11. resposta vazia não libera

`server/test/emu/card-sync.test.js`:
- "marcador, ensaio e aplicacao" (9): sem marcador; marcador de outro dono; ensaio sem gravar; `dryRun` vence `apply`; aplicação igual ao ensaio; falha no meio; resposta vazia; rodada normal com marcador; piso técnico
- "por syncConnection" (6): ensaio só do cartão; aplicação só do cartão; `cardHistoryPending`; falha sem gravar nem imprimir; opção desconhecida; dois cartões
- testes anteriores do cartão, agora liberando o cartão antes da rodada

`server/test/emu/card-payments.test.js`: "a rodada do sync do cartao nao trata o pagamento ligado como compra" (agora com marcador).

Seguem abertas as pendências do 06-08 e do 06-18.

**Critérios sem verificação real:** todos os de aceite das três tarefas, a comparação da cópia real com os dados do Admin SDK e a contagem de leituras.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Crítico] A cópia é conferida contra os dados atuais** (`7d6927db`)
- `assertRecentBackup` só confere idade e presença das coleções: uma cópia vazia ou de outro projeto passaria.
- O script agora compara lançamentos e importações do casal, campo a campo, e exige a presença dos cartões. Efeito: mais recusas, de propósito.

**2. [Rule 2 - Crítico] Resposta vazia não libera o cartão** (`deb4fe72`)
- Marcar após uma falha passageira deixaria o sync automático fazer a primeira reclassificação sozinho.

**3. [Rule 2 - Crítico] Opção desconhecida de `cardHistory` e argumento desconhecido são recusados** (`ca8b4854`, `7d6927db`)

**4. [Rule 1 - Bug] Manual antigo contado duas vezes no ensaio com dois cartões** (`ca8b4854`)
- `syncConnection` aceita `claimedManualIds`; sem ele o ensaio contaria diferente da aplicação.

**5. [Pedido do orquestrador] Contagens extras** (`deb4fe72`, `7d6927db`)
- `ambiguous`, o estado deixado por versão anterior (quatro contagens) e `payments`, além das nove do plano.

**6. [Rule 3 - Bloqueio] Testes antigos precisaram do marcador** (`05c738e5`)
- O plano pedia que passassem sem edição, o que é incompatível com a trava. As asserções não mudaram; só o preparo. `card-payments.test.js` está fora de `files_modified`.

**7. Assinatura do guard:** o plano cita `requireCollections`; o parâmetro real é `required`, e foi o usado.

## Riscos conhecidos, não corrigidos

1. **Conta BANK compara com gasto lançado como Cartão.** `findDuplicate` olha só valor e data e pode esconder um saque ou saída em `review/duplicate`. Recomendo excluir `cardKind: 'purchase'` do mapa em `sync.js`. Não corrigi: o plano proíbe outra mudança em `sync.js`.
2. **Enquanto não aplicar, o que o 06-06 já importou fica parado:** pendente não vira confirmada e compra nova não entra.
3. **`reconcileCardPayments` continua rodando sem o marcador**, com `billTotals` incompletos: a ligação do pagamento à fatura é provisória até a aplicação, e o crédito visto no cartão só é gravado depois dela.
4. **A tela não avisa que o histórico está pendente.** `cardHistoryPending` só existe no resumo; `/cartoes` mostra limite sem compras.
5. **Leituras do Spark:** ensaio lê o histórico do casal; a cópia lê tudo; aplicar lê de novo lançamentos e importações. Fazer tudo no mesmo dia pode pesar na cota; medir no 06-14.
6. **Aplicação interrompida deixa gravação parcial** (sem marcador). Repetir completa; voltar atrás depende da cópia anterior à primeira tentativa.
7. **`pluggy-sdk` pede Node `^24.22.1`** e esta máquina tem 24.15.0: atualizar antes de rodar o script de verdade.
8. Os riscos do 06-18 sobre gasto genérico e pendente recriada com outro valor continuam.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova. T-06-62 e T-06-63 mitigados no código (verificação no emulador pendente); T-06-64 saída só com contagens, e o modo histórico não imprime ids; T-06-65 risco 5; nenhum pacote instalado.

## Self-Check: PASSED

Os 6 arquivos criados ou alterados existem e os commits `05c738e5`, `deb4fe72`, `6feb0b92`, `ca8b4854`, `785d11ee` e `7d6927db` estão no histórico. O self-check cobre só arquivos e commits; os testes de emulador seguem pendentes.
