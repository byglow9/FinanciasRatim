# Fase 6: roteiro de UAT do cartão de crédito (o que só você e o tempo provam)

Gerado pelo plano 06-15 em 25/11/2026, no estado real de fechamento da fase:

- cartão do Nubank (conta CREDIT do MeuPluggy) conectado, com a área `/cartoes`, a configuração em Ajustes e o 9º destino do dock;
- o dono publicou, importou o histórico completo, reclassificou e conferiu com o app do Nubank no plano 06-14 e aprovou;
- fechamento do cartão no dia 07 e vencimento no dia 14 (configuração do cartão, porque o MeuPluggy devolve esses campos vazios);
- **nada é em tempo real**: o MeuPluggy atualiza cerca de 1 vez por dia (ciclo por volta de 11:46) e não aceita atualização manual. O app diz isso e este roteiro também (D-05, D-14).

O agente já provou por teste e auditoria em Chrome tudo o que dá para provar sem você e sem o calendário. Este roteiro é o que sobra. Cada item diz o que fazer, o que esperar e o que ele cobre. Marque `[x]` e anote qualquer incômodo ao lado.

---

## Parte A: o que depende do tempo e do banco

- [ ] **1. Depois do próximo ciclo diário do MeuPluggy (cerca de 11:46).** Abra `/cartoes` e a lista de Transações do cartão antes e depois do ciclo.
  - **Esperado:** as compras que estavam como pendentes passam a confirmadas, sem aparecer em dobro; o número de compras da fatura aberta não muda por causa disso (só cresce se houve compra nova).
  - **Cobre:** CARD-07.

- [ ] **2. Dia seguinte ao fechamento (08/12) e depois do vencimento (14/12).** Abra `/cartoes`, o Calendário e o sino.
  - **Esperado:** em 08/12 o status da fatura vira **Fechada** e o sino avisa quando a fatura estiver perto de vencer; o vencimento aparece no Calendário no dia 14; se passar do vencimento sem pagamento, o status vira **Atrasada**. A fatura segue o dia de fechamento e de vencimento que você configurou em Ajustes.
  - **Cobre:** CARD-08, CENT-03, CENT-04.

- [ ] **3. Ao pagar a fatura de verdade.** Pague a fatura pelo banco e, depois do próximo ciclo, abra `/cartoes`. Se o pagamento não for detectado, abra a fatura e use **Marcar como paga**.
  - **Esperado:** a fatura vira **Paga**; o saldo da conta cai **só nesse momento** (a compra no cartão nunca baixou o saldo); o pagamento aparece como transferência, não como gasto, e não entra nos limites das categorias.
  - **Cobre:** CARD-04, CARD-06.

- [ ] **4. Primeira compra parcelada no Nubank.** Quando houver uma, depois do ciclo seguinte, rode a sonda somente leitura (`probe-card.js`, a mesma do plano 06-02) e abra a fatura.
  - **Esperado:** registrar se a sonda mostra `installmentNumber` e `totalInstallments` para a compra; a fatura mostra **N/M** (do banco ou estimado, marcado como estimado) e o que sai em cada fatura futura. Conferir se a **regra de data** (compra ou lançamento na fatura) e a heurística de `cardInstallments.js` batem com o app do Nubank; se não baterem, a regra volta ao planejamento.
  - **Cobre:** CARD-05 (marcado **parcial** em `06-VALIDATION.md`: a regra foi desenhada sem nenhuma compra parcelada real, D-06 e D-07).

- [ ] **5. Compra internacional e IOF.** Quando houver uma compra em dólar ou com IOF, abra a fatura.
  - **Esperado:** a compra aparece em reais, com o valor original anotado na linha da fatura, e o IOF em reais (D-08); o total da fatura continua batendo com o app do Nubank.
  - **Cobre:** CARD-02, CARD-03.

- [ ] **6. Lembrete sobre o ritmo do MeuPluggy.** Faça uma compra no cartão e confira o app logo depois.
  - **Esperado:** a compra **não** aparece na hora, e isso é o comportamento certo: ela só chega depois do ciclo diário (D-05, D-14). A interface não promete tempo real.
  - **Cobre:** CARD-01, D-05, D-14.

## Parte B: itens de aparelho e de uso

- [ ] **7. Dock de 9 destinos no celular.** No celular, a 360 px de largura, olhe o dock.
  - **Esperado:** 9 ícones; o 5º, **Cartões**, abre `/cartoes`; nenhum ícone fica cortado e a página não rola para os lados.
  - **Cobre:** CENT-03, CARD-02, D-11.

- [ ] **8. Lançar um gasto como Cartão.** No botão +, aba Gasto, escolha o chip **Cartão** e lance um gasto de teste.
  - **Esperado:** ele conta no **Pode gastar** e nos limites da categoria, **não baixa o saldo da conta**, e aparece na fatura aberta. Depois do ciclo seguinte, se a mesma compra chegar do banco, ela continua **uma só** (a importada adota a lançada à mão, sem duplicar).
  - **Cobre:** CARD-03, CARD-06, CARD-07, D-12.

- [ ] **9. Histórico completo importado.** Com o histórico completo do cartão importado, abra Transações e `/cartoes` e vá aos meses antigos.
  - **Esperado:** os meses antigos do cartão aparecem nas duas telas, cada fatura com seu total; guarde as contagens do ensaio do `card-history.js`; revise os possíveis duplicados que o Coinc **não** uniu (`nearMiss`: lançamento à mão e compra importada com o mesmo valor e data próxima, mas descrição diferente) e apague à mão o que for repetido.
  - **Cobre:** CARD-07, D-13.

---

## Decisões que ainda são suas, fora do escopo desta fase

Estas duas decisões continuam abertas. Nenhuma foi tomada pelo agente e nenhuma trava o fechamento da fase.

1. **O dia do fechamento conta para a fatura que fecha ou para a seguinte?** Hoje a compra feita no próprio dia 07 conta para a fatura que fecha (uma suposição). Confira com uma compra real feita no dia do fechamento e compare com o app do Nubank; se o app a colocar na fatura seguinte, a regra precisa ser trocada (mudança pequena em `cardBills.js`, a planejar depois).
2. **Menu de configuração por usuário.** Hoje os dias de fechamento e vencimento e o apelido do cartão ficam no cartão de Ajustes, para o casal. Se cada pessoa precisar de um menu de configuração próprio (ele e ela), isso é uma decisão pendente e fica para outra fase.

O atalho do cartão no dock, o chip **Cartão** do lançamento manual e o histórico completo sem limite de idade já foram decididos por você (D-11, D-12, D-13) e **não** são decisões abertas.

## A acompanhar

- **Custo de leituras do Firestore do histórico completo (D-13).** O histórico inteiro é mais leitura por abertura de Transações e de `/cartoes`. Confira no console do Firebase se as leituras diárias seguem folgadas dentro da cota gratuita; se chegarem perto, a consulta por janela larga precisa de limite.
- **Possíveis duplicados que o Coinc não uniu (`nearMiss`).** A reconciliação só une quando tem certeza; os casos quase iguais ficam para você olhar (item 9). Se aparecerem muitos, vale refinar a regra de adoção.
