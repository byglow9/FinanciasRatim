# Phase 6: Cartão de crédito - Context

**Gathered:** 2026-11-24
**Status:** Ready for research (portão CARD-01 respondido pela sonda de 24/11: ver D-06)
**Atualizado em 24/11/2026:** D-11 a D-14 (dock com 9 destinos, chip Cartão do lançamento manual, histórico completo sem limite de idade e confirmações do dono)

<domain>
## Phase Boundary

O usuário acompanha o cartão como conta própria (fatura, limite, vencimento e parcelas), sem contar a mesma despesa duas vezes, com escopo definido a partir do que o MeuPluggy realmente entrega. Requisitos: CARD-01..08, CENT-03, CENT-04 (ver ROADMAP.md, Fase 6).
</domain>

<decisions>
## Implementation Decisions

- **D-01:** O cartão de crédito do dono é do **Nubank**, não do Bradesco. A sonda de 18/11 (`.planning/phases/02-revis-o-de-importa-es-contas-fixas-e-webhook/02-CARD-PROBE.md`) achou só duas contas BANK do Bradesco, sem CREDIT; o diagnóstico de 24/11 confirmou o mesmo. O item MeuPluggy atual (`cf5a10f5`) não traz cartão.
- **D-02:** O portão CARD-01 segue valendo: **nada é modelado antes de a sonda mostrar o que o MeuPluggy entrega para o cartão**. O dono vai conectar o **Nubank** no MeuPluggy (meu.pluggy.ai, Open Finance, uso pessoal gratuito, até 5 conexões) e então rodamos `server/scripts/probe-card.js` de novo. Não se sabe se o Nubank entra no mesmo item ou em outro itemId (a doc da Pluggy manda não assumir o mesmo itemId): a sonda e o `bankConnections` decidem.
- **D-03:** **Parcelas contra o limite** (decisão do dono, 24/11/2026): a **parcela do mês conta** no limite; o total restante das parcelas aparece separado como "a sair nas próximas faturas". Compra à vista conta pela **data da compra** (CARD-03).
- **D-04:** Se o MeuPluggy não devolver fatura, vale CARD-08: o sistema calcula a fatura pelos dias de fechamento e vencimento informados pelo usuário.
- **D-05 (restrições herdadas):** o servidor só lê o que a Pluggy já guardou; o MeuPluggy atualiza ~1x/dia (ciclo ~11:46) e não aceita atualização manual (ver `.planning/debug/webhook-pluggy-tempo-real.md`). Nenhuma promessa de tempo real para o cartão. Transferência entre contas do mesmo CPF vira `review/self_transfer` (pagamento de fatura deve seguir CARD-04: transferência vinculada à fatura, nunca gasto).
- **D-06 (resultado da sonda, 24/11/2026, item `792a3230` = MeuPluggy com o Nubank; arquivo `06-CARD-PROBE-792a3230.md`):** o Nubank entrou como **item separado** (cada banco do MeuPluggy vira um item), com 1 conta BANK e 1 conta **CREDIT** (Mastercard Gold, ACTIVE). O que o MeuPluggy entrega para o cartão: `creditLimit` e `availableCreditLimit` (números), `brand`, `level`, `status`, `isLimitFlexible`, `disaggregatedCreditLimits`. O que **não** entrega: `balanceDueDate`, `balanceCloseDate` e `minimumPayment` vêm `null`; `bills` (faturas) volta **vazio** (fetch ok, 0 faturas). Transações do cartão: 6 em 90 dias, **todas PENDING**, tipo DEBIT, `paymentType` SINGLE, todas com `billForecastDate` (mês da fatura prevista) e `billPostDate`, **nenhuma** com `installmentNumber`, `totalInstallments`, `billId` ou `purchaseDate`. Consequências de escopo: limite disponível vem da Pluggy; **fatura aberta = soma das compras agrupadas por `billForecastDate`**; **fechamento e vencimento vêm do usuário (CARD-08 vira o caminho principal)**; faturas fechadas, pagas e atrasadas **não** vêm da Pluggy e precisam ser inferidas (pagamento da fatura na conta, CARD-04); parcelas N/M **não confirmadas** (a amostra não tinha compra parcelada): reavaliar com uma compra parcelada real antes de prometer CARD-05, com heurística como reserva.
- **D-07:** A amostra é pequena (6 compras, item recém-conectado, histórico pode ser curto). Antes de fechar o modelo, repetir a sonda após o próximo ciclo (25/11 ~11:46) e, se possível, com uma compra parcelada no Nubank.
- **D-08 (conferência com o app do Nubank, 24/11/2026, prints do dono):** os dados da Pluggy **batem com o app**. `creditLimit` 200, `availableCreditLimit` 18,59 e `balance` 181,41 na conta CREDIT = limite disponível e **fatura atual** do Nubank (R$ 181,41, limite disponível R$ 18,59). Então `balance` da conta CREDIT é o valor da fatura aberta e `availableCreditLimit` é o limite disponível. As 6 compras pendentes somam **exatamente 181,41** quando se usa `amountInAccountCurrency` (compras em USD vêm com `amount` em dólar e `currencyCode: USD`; ex.: 5,00 USD = R$ 30,08). **Regra: valor em reais de compra internacional = `amountInAccountCurrency`**, nunca `amount`. IOF de compra internacional chega como lançamento próprio (BRL). Todas com `billForecastDate` 2026-12 (a fatura que fecha em dezembro).
- **D-09 (dados que a Pluggy não traz e o app do Nubank mostra):** fechamento **07/12** e vencimento **14/12** (dia 7 e dia 14, informados pelo dono); a Pluggy devolve esses campos `null`. Ficam como configuração do cartão (CARD-08).
- **D-10 (visão desejada pelo dono):** uma área própria do cartão com boa visibilidade das faturas: fatura atual (valor), quando fecha e vence, **quanto foi gasto em cada fatura** (por mês de fatura, `billForecastDate`), limite total, limite disponível e % usado, próximas faturas e compras da fatura (como a tela 'Fatura' do Nubank). Vive na Central de Limites e Cartões (CENT-03) e no Calendário (CENT-04).
- **D-11 (decisão do dono, 24/11/2026): o cartão ganha o 9º destino do dock.** O dock passa de 8 para 9 destinos, com um atalho próprio para `/cartoes`: ícone Lucide de cartão (`CreditCard`), rótulo acessível "Cartões" (aria-label e title, sem rótulo visível, como os demais). Posição (critério do Claude, revisável): logo depois de "Contas fixas", para o novo ícone ser o 5º e aparecer parcialmente na espiada a 360px. O dock segue rolável, com alvos de 48px (mínimo de 44px). A Home continua com o resumo do cartão (06-10): são dois caminhos para `/cartoes`. Isto substitui a nota anterior de que o dock continuaria com 8 destinos. Efeitos obrigatórios: guardas de contagem de destinos (8 para 9) e de lista de rotas (mais `/cartoes`), auditor de espiada do dock a 360x640 (9 itens, 4 inteiros e 1 parcial) e as telas dos auditores de layout (`/cartoes` em `audit.mjs` e `theme.mjs`, com dados simulados).
- **D-12 (decisão do dono, 24/11/2026): o chip "Cartão" do lançamento manual passa a funcionar nesta fase.** Hoje ele aparece como "Cartão (em breve)", desabilitado. Desenho decidido:
  - Só na aba Gasto (Receita e Porquinho não têm cartão). Um gasto lançado como Cartão grava `cardId` (id do documento `cards`, que é o `accountId` da Pluggy) e `cardKind: 'purchase'`, sem `source: 'bank'`, sem `cardStatus` e sem `billMonth` (o mês da fatura é derivado na leitura pelo fechamento configurado, CARD-08, e muda junto se o dono corrigir o dia).
  - Cartão do dono: os cartões do perfil atual; com 1 cartão vai direto, com mais de 1 o dono escolhe, com 0 o chip fica desabilitado explicando que não há cartão conectado neste perfil.
  - Conta nos limites e no Pode gastar pela data da compra (CARD-03); entra na fatura do mês pelo fechamento (sem fechamento configurado fica em "sem mês de fatura"); não baixa o saldo da conta (CARD-06, pelo `cardKind`, sem olhar a origem).
  - Reconciliação com a compra importada da Pluggy, para não duplicar: o lançamento manual é ADOTADO, nunca vira um segundo lançamento. Casa por valor em centavos igual, data a até 3 dias (`DUPLICATE_WINDOW_DAYS`) e descrição normalizada equivalente (igual ou contida, a menor com 5 ou mais caracteres) ou descrição genérica do manual (vazia ou igual ao nome da categoria, que é o padrão do lançamento); pareamento um a um pela menor diferença de data; para o manual do cartão exige o mesmo `cardId`. O manual mantém descrição, categoria e nota; recebe valor em reais, data, status, mês da fatura, parcela, moeda e o `bankImportId` da Pluggy. Se a compra importada chegou antes e o manual foi lançado depois, o próximo sync reassenta: o manual passa a ser o dono do `bankImports` e o lançamento importado duplicado é removido (idempotente, o sync não o recria). Manual adotado nunca some como "pendente que sumiu".
  - Os totais por fatura em `cards.billTotals` são do servidor e sobem na próxima sincronização; `/cartoes` e Transações leem os lançamentos e mostram a compra na hora.
- **D-13 (decisão do dono, 24/11/2026): sem limite de 40 dias.** Importar TODO o histórico do cartão que a Pluggy devolver: a busca do cartão não usa o `importFrom` da conexão nem janela de dias (só um piso técnico de data para a Pluggy não aplicar um padrão), e os lançamentos já gravados do cartão entram inteiros na reconciliação. Nada é descartado por idade. A proteção contra duplicar lançamentos manuais antigos continua por reconciliação (data, valor e descrição normalizada, mesma regra do D-12, contra manuais com o mesmo `cardId` ou sem `cardId`), com a janela de manuais indo da compra mais antiga recebida menos 3 dias. Manual antigo adotado vira compra do cartão: isso é reclassificação em massa de dados existentes e por isso exige, antes de qualquer gravação: (1) ensaio (dry-run) como padrão, imprimindo só contagens, incluindo quantos pares quase casaram só pelo valor e pela data; (2) cópia de segurança recente (`--apply` só aceita `--backup` de um arquivo gerado por `export-firestore.js` nas últimas 24 horas); (3) marcador `cards/{accountId}.historyBaselineAt`: enquanto o dono não aplicar, o sync automático NÃO grava compras do cartão (só limite e agregados). A mesma exigência de ensaio e cópia vale para a reclassificação dos pagamentos de fatura antigos (06-08) e para qualquer reclassificação em massa desta fase. O custo é de leituras do Firestore (histórico inteiro lido por rodada): risco registrado, medido no gate e sem teto de idade.
- **D-14 (confirmações do dono, 24/11/2026):** (a) sem tempo real: o sync, o polling e o webhook ficam como estão, e a interface continua dizendo que o MeuPluggy atualiza cerca de 1 vez por dia; (b) o Casal e os Relatórios contam a compra do cartão como gasto na data da compra, e só o saldo de Transações e o acumulado dos Detalhes ignoram o cartão (pagamento da fatura e estorno são transferência e ficam fora dos gastos); (c) o botão "Marcar como paga" na fatura fica e só muda o status.
</decisions>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` (Fase 6), `.planning/REQUIREMENTS.md` (CARD-01..08, CENT-03/04)
- `.planning/phases/02-revis-o-de-importa-es-contas-fixas-e-webhook/02-CARD-PROBE.md` e `server/src/card-probe.js`, `server/scripts/probe-card.js`
- `.planning/research/` (pluggy-sdk: `creditData`, `fetchCreditCardBills`, `installmentNumber`, `billForecastDate`; parcelas sem ID de grupo no Open Finance)
- `.planning/debug/webhook-pluggy-tempo-real.md` (ciclo de 24 h do MeuPluggy)
</canonical_refs>

<specifics>
## Specific Ideas

- Próximo passo do dono: adicionar o Nubank em meu.pluggy.ai e, no Coinc, Configurações > Bancos, reconectar/atualizar o MeuPluggy; depois avisar para rodar a sonda.
</specifics>

<deferred>
## Deferred Ideas

- Captura de notificações do banco no celular para lançamentos em tempo real (fora da Fase 6; avaliar depois, depende de Android ou iPhone).
</deferred>
