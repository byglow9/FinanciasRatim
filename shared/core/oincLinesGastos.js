// @ts-check
// Falas aprovadas do OINC, grupo de gastos (07.1-02, D-10, D-13): compras por tipo e lugar.
// Dado puro, sem relogio, sem acaso e sem pacote. Cada linha traz: id estavel (cena-NNN), t (modelo com
// encaixes), g (genero de quem le: m, f ou x para qualquer um), risada, fumo, lote, origem ("lote:id" no
// JSON de falas aprovadas) e, quando valem, se (condicoes), exagero e reescrita.
//   lote menor que 4 + sem reescrita: texto aprovado pelo dono, trocando so o fato por encaixe
//   lote 4 + sem reescrita: fala do lote 4 que o dono ja aprovou
//   reescrita: true: texto novo ou alterado, vai para o voto do dono (D-34)
// Falas com g: 'm' tem uma irma g: 'f' no fim da cena, com a mesma origem.

/**
 * @typedef {import('./oincLines.js').OincLine} OincLine
 * @typedef {[string, string, 'm' | 'f' | 'x', boolean, boolean, number, string, { se?: string[], exagero?: boolean, reescrita?: boolean }?]} Row
 */

/**
 * Congela as linhas de uma cena. Campos opcionais (se, exagero, reescrita) so existem quando valem.
 * @param {Row[]} rows
 * @returns {ReadonlyArray<Readonly<OincLine>>}
 */
const list = (rows) =>
  Object.freeze(
    rows.map(([id, t, g, risada, fumo, lote, origem, extra]) => {
      /** @type {OincLine} */
      const line = { id, t, g, risada, fumo, lote, origem }
      if (extra && extra.se) line.se = Object.freeze([...extra.se])
      if (extra && extra.exagero) line.exagero = true
      if (extra && extra.reescrita) line.reescrita = true
      return Object.freeze(line)
    }),
  )

/** @type {Readonly<Record<string, ReadonlyArray<Readonly<OincLine>>>>} */
export const OINC_GASTOS = Object.freeze({
  posto: list([
    ['posto-001', '{valor} de gasolina. O carro bebeu mais que tu no sábado.', 'x', false, false, 3, '3:s01-1', { se: ['sabado'] }],
    ['posto-002', 'Encheu o tanque com {valor} e me deixou aqui no vazio. Egoistuxo.', 'm', false, false, 3, '3:s01-2'],
    ['posto-003', '{valor} no posto. O carro engoliu mais que eu depois do Natal.', 'x', false, false, 4, '4:l4a-02-1'],
    ['posto-004', 'Abasteceu {valor}. É o tanque ou tu ainda finge que isso é pouco? HIHIHI', 'x', true, false, 4, '4:l4a-02-2'],
    ['posto-005', 'Gasolina de novo, {valor}. Esse carro é um porco maior que eu, só que sem a fofura.', 'x', false, false, 4, '4:l4a-02-3'],
    ['posto-006', '{valor} de combustível. Se a roda falasse, pedia pra tu ir a pé.', 'x', false, false, 4, '4:l4a-02-4'],
    ['posto-007', '{valor} no tanque. Tu enche o carro e esvazia o meu bucho. Troca justa, nenhuma. KKKKKJ', 'x', true, false, 4, '4:l4a-02-5'],
    ['posto-008', 'Encheu o tanque com {valor} e me deixou aqui no vazio. Egoistuxa.', 'f', false, false, 4, '3:s01-2', { reescrita: true }],
  ]),
  farmacia: list([
    ['farmacia-001', '{valor} na farmácia. Se for remédio, melhoras. Se for creme caro, vergonha.', 'x', false, false, 3, '3:s02-1'],
    ['farmacia-002', '{valor} de farmácia. Comprou camisinha ou comprou juízo? Um dos dois faltava. rsrsrs', 'x', true, false, 4, '3:s02-3', { reescrita: true }],
  ]),
  assinaturas: list([
    ['assinaturas-001', 'Um monte de assinatura, {total}. Tu não tem olho pra assistir isso tudo.', 'x', false, false, 4, '3:s03-1', { reescrita: true }],
    ['assinaturas-002', '{total} em assinatura. Tem streaming aí que nem lembra da tua cara.', 'x', false, false, 3, '3:s03-2'],
    ['assinaturas-003', 'Assinou um monte, usa um e meio. O resto é caridade pra bilionário, HIHIHI.', 'x', true, false, 4, '3:s03-3', { reescrita: true }],
  ]),
  'compra-madrugada': list([
    ['compra-madrugada-001', '{valor} às {hora} da manhã. Isso não é compra, é possessão.', 'x', false, false, 3, '3:s04-1'],
    ['compra-madrugada-002', '{hora} da madrugada e o dedinho passeando no carrinho. Vai DORMIR, porra.', 'x', false, false, 4, '3:s04-2', { reescrita: true }],
    ['compra-madrugada-003', 'Compra às {hora}. Quando a caixa chegar tu vai abrir sem saber o que é. huehue', 'x', true, false, 3, '3:s04-3'],
  ]),
  'pix-pessoa': list([
    ['pix-pessoa-001', 'Pix de {valor} pra uma pessoa. Dívida, rolo ou chantagem? Pisca duas vezes.', 'x', false, false, 3, '3:s05-1', { exagero: true }],
    ['pix-pessoa-002', 'Saíram {valor} no Pix. Espero que a criatura pelo menos te mande bom dia.', 'x', false, false, 3, '3:s05-2'],
    ['pix-pessoa-003', '{valor} voando no Pix, e pra mim nunca sobra nem um pixzuxo.', 'x', false, false, 4, '3:s05-3', { reescrita: true }],
  ]),
  'gasto-minusculo': list([
    ['gasto-minusculo-001', '{valor} em {loja}. Anotei. Aqui ninguém passa batido, nem bala.', 'x', false, false, 4, '3:s06-1', { reescrita: true }],
    ['gasto-minusculo-002', '{valor}, é? Começa assim, daqui a pouco tá financiando chiclete.', 'x', false, false, 4, '3:s06-2', { reescrita: true }],
    ['gasto-minusculo-003', '{valor}. Alerta máximo, chamem o exército. Brincadeira. Mas anotei.', 'x', false, false, 4, '3:s06-3', { reescrita: true }],
  ]),
  parcelamento: list([
    ['parcelamento-001', '{vezes} de {valor}. Parabéns, adotou um boleto e ele fica um tempão.', 'x', false, false, 4, '3:s07-1', { reescrita: true }],
    ['parcelamento-002', 'Parcelou em {vezes}. Quando acabar, o produto já tá no lixo e tu ainda pagando.', 'x', false, false, 4, '3:s07-2', { reescrita: true }],
    ['parcelamento-003', '{valor} por mês, tu falou. {vezes}, tu não falou. rsrsrsrs', 'x', true, false, 4, '3:s07-3', { reescrita: true }],
  ]),
  padaria: list([
    ['padaria-001', '{vezes} na padaria. O padeiro já separa teu pão quando ouve o chinelo.', 'x', false, false, 4, '3:s08-1', { reescrita: true }],
    ['padaria-002', '{valor} de padaria. Isso é muito pãozuxo pra uma barriga só.', 'x', false, false, 4, '3:s08-2', { reescrita: true }],
  ]),
  'app-corrida': list([
    ['app-corrida-001', '{valor} de corrida. Tuas pernas pediram baixa por falta de uso.', 'x', false, false, 4, '3:s09-1', { reescrita: true }],
    ['app-corrida-002', '{valor} de corrida. O motorista já sabe até com quem tu brigou.', 'x', false, false, 4, '3:s09-2', { reescrita: true }],
    ['app-corrida-003', 'Corrida de novo? Anda, criatura, o chão é de graça. KKKKKJ', 'x', true, false, 4, '3:s09-3', { reescrita: true }],
  ]),
  roupa: list([
    ['roupa-001', '{valor} em roupa e eu aqui, pelado há anos sem reclamar. Mentira, reclamo.', 'x', false, false, 3, '3:s10-1'],
    ['roupa-002', 'Roupa nova de {valor}. Vai usar pra quê, pra abrir a fatura bem vestido?', 'm', false, false, 3, '3:s10-2'],
    ['roupa-003', '{valor} no pano. Desfila pra mim, vai, quero ver se valeu. rsrsrs', 'x', true, false, 4, '3:s10-3', { reescrita: true }],
    ['roupa-004', 'Roupa nova de {valor}. Vai usar pra quê, pra abrir a fatura bem vestida?', 'f', false, false, 4, '3:s10-2', { reescrita: true }],
  ]),
  pet: list([
    ['pet-001', '{valor} no pet shop. O bicho come melhor que tu, e tá certo ele.', 'x', false, false, 3, '3:s11-1'],
    ['pet-002', 'Gastou {valor} com o outro bicho. E o porco aqui? Nem um biscoito?', 'x', false, false, 3, '3:s11-2'],
    ['pet-003', 'Pet shop, {valor}. Isso é ciúme que tô sentindo, ronc.', 'x', true, false, 3, '3:s11-3'],
  ]),
  'varias-compras': list([
    ['varias-compras-001', 'O banco me entregou compra pra caramba de uma vez, {total}. Tu fez um arrastão?', 'x', false, false, 4, '3:s12-1', { reescrita: true }],
    ['varias-compras-002', 'Compra que não acaba mais, {total}. Vou soltando uma por uma pra tu sofrer parcelado.', 'x', false, false, 4, '3:s12-2', { reescrita: true }],
    ['varias-compras-003', 'Chegou o extrato de {quando}: um bocado de comprinha, {total}. De inha não tem nada, HIHIHI.', 'x', true, false, 4, '3:s12-3', { reescrita: true }],
  ]),
  estorno: list([
    ['estorno-001', 'Voltaram {valor}. Dinheiro que vai e volta, o único relacionamento saudável daqui.', 'x', false, false, 3, '3:s13-1'],
    ['estorno-002', 'Estorno de {valor}. Não comemora gastando, que eu conheço a peça.', 'x', false, false, 3, '3:s13-2'],
  ]),
  delivery: list([
    ['delivery-001', 'HIHIHI mais um {loja}. Teu fogão me ligou chorando, parsa.', 'x', true, false, 4, '2:s01-1', { reescrita: true }],
    ['delivery-002', '{valor} no {loja} de novo, magreluxo? Nem pra engordar tu serve.', 'm', false, false, 2, '2:s01-2'],
    ['delivery-003', 'Ding dong, é o motoboy. De novo, ele já entra sem bater.', 'x', false, false, 4, '2:s01-3', { reescrita: true }],
    ['delivery-004', 'Mais um {loja}. O fogão tá achando que foi demitido.', 'x', false, false, 4, '1:s01-1', { reescrita: true }],
    ['delivery-005', '{valor} de {loja} de novo? Levanta e frita um ovo, caralho.', 'x', false, false, 1, '1:s01-2'],
    ['delivery-006', 'Que lindo, mais um pedido. O motoboy já é praticamente da família.', 'x', false, false, 4, '1:s01-3', { reescrita: true }],
    ['delivery-007', 'Se continuar assim o {loja} te chama pra festa da firma.', 'x', false, false, 1, '1:s01-4'],
    ['delivery-008', 'Mais um {loja}. Eu aqui magreluxo e tu alimentando aplicativo.', 'x', false, false, 4, '1:s01-5', { reescrita: true }],
    ['delivery-009', '{valor} de delivery. O motoboy já é meu cunhado, de tanto vir aqui no cofre.', 'x', false, false, 4, '4:l4b-01-1'],
    ['delivery-010', 'Pediu lanche de novo, {valor}. Tô achando que tu tem relacionamento com o entregador. Põe aliança, hehehe.', 'x', true, false, 4, '4:l4b-01-2', { reescrita: true }],
    ['delivery-011', '{valor} de pizza. Chegou quentinha, grande e na hora. Quem me dera, rsrsrs.', 'x', true, false, 4, '4:l4b-01-3'],
    ['delivery-012', '{valor} de delivery. Meu bucho roncou e o teu também, mas o meu ronca de fome de dindin.', 'x', false, false, 4, '4:l4b-01-4', { reescrita: true }],
    ['delivery-013', 'Delivery {valor}. Vi um hambúrguer passando na minha cabeça, com perna e tudo. Tô chapaduxo de fome.', 'x', false, true, 4, '4:l4b-01-5'],
    ['delivery-014', 'Pediu comida de novo, {valor}. Tua cozinha tá de luto, eu fiz o velório {quando}. KKKKKJ', 'x', true, false, 4, '4:l4b-01-7'],
    ['delivery-015', '{valor} de delivery. Entregaram na porta, rapidinho. Só eu nunca recebo entrega, sou porco carente.', 'x', false, false, 4, '4:l4b-01-8'],
    ['delivery-016', '{valor} no {loja} de novo, magreluxa? Nem pra engordar tu serve.', 'f', false, false, 4, '2:s01-2', { reescrita: true }],
  ]),
  mercado: list([
    ['mercado-001', '{valor}, MANO. Tu comprou comida ou sequestrou o açougueiro?', 'x', false, false, 4, '2:s02-3', { reescrita: true }],
    ['mercado-002', 'Mercado de novo, {valor}. Carrinho cheio, bucho meu vazio, justiça é isso aí.', 'x', false, false, 4, '4:l4a-03-2'],
    ['mercado-003', '{valor} no mercado. Anotei até o pacote de bolacha que tu jura que é da casa. rsrsrs', 'x', true, false, 4, '4:l4a-03-3'],
    ['mercado-004', '{valor} de compras. Se sobrar chocolate, eu aceito como pagamento.', 'x', false, false, 4, '4:l4a-03-5'],
  ]),
  'compra-grande': list([
    ['compra-grande-001', '{valor} na loja de eletrônicos?? Eu aqui comendo moeda de cinco, seu playboy do caralho.', 'm', false, false, 2, '2:s03-1'],
    ['compra-grande-002', 'HIHIHI {valor} de eletrônico. Tomara que vibre, pelo preço... a notificação, porra. rsrsrsrs', 'x', true, false, 2, '2:s03-2'],
    ['compra-grande-003', '{valor}. Ronc. Ronc. Desculpa, é o porco tendo um piripaque.', 'x', true, false, 4, '2:s03-3', { reescrita: true }],
    ['compra-grande-004', 'Puta que pariu, {valor}. Isso aí faz o quê, imprime dinheiro?', 'x', false, false, 1, '1:s03-2'],
    ['compra-grande-005', 'Foi sozinho pra loja? Não pode. Da próxima leva um adulto.', 'm', false, false, 1, '1:s03-4'],
    ['compra-grande-006', '{valor} na loja de eletrônicos?? Eu aqui comendo moeda de cinco, sua playgirl do caralho.', 'f', false, false, 4, '2:s03-1', { reescrita: true }],
    ['compra-grande-007', 'Foi sozinha pra loja? Não pode. Da próxima leva um adulto.', 'f', false, false, 4, '1:s03-4', { reescrita: true }],
  ]),
  compra: list([
    ['compra-001', 'Passou {valor} em {loja} e eu só fiquei sabendo agora. Sou porco, mas tenho sentimentos.', 'x', false, false, 4, '4:novo-compra-1', { reescrita: true }],
    ['compra-002', '{loja}, {valor}. Se foi presente, tá perdoado. Se foi pra ti, tá anotado, hein. HIHIHI', 'x', true, false, 4, '4:novo-compra-2', { reescrita: true }],
  ]),
  'loja-repete': list([
    ['loja-repete-001', '{vezes} no {loja} na semana. O garçom já sabe teu pedido e teus traumas.', 'x', false, false, 4, '2:s17-1', { reescrita: true }],
    ['loja-repete-002', '{total} no {loja}. Tá namorando o garçom e não me contou? rsrsrsrs', 'x', true, false, 2, '2:s17-2'],
    ['loja-repete-003', '{loja} de novo, parsa? Bate ponto lá e pede vale-transporte.', 'x', false, false, 2, '2:s17-3'],
    ['loja-repete-004', '{vezes} no {loja}. Já tem cadeira com seu nome?', 'x', false, false, 4, '1:s17-1', { reescrita: true }],
    ['loja-repete-005', '{total} no mesmo bar. Pede participação nos lucros.', 'x', false, false, 1, '1:s17-2'],
    ['loja-repete-006', '{loja} de novo? Se mudar pra lá economiza o Uber.', 'x', false, false, 1, '1:s17-3'],
    ['loja-repete-007', 'O garçom já sabe seu pedido, sua senha e seus traumas.', 'x', false, false, 1, '1:s17-4'],
    ['loja-repete-008', '{vezes} no {loja} na semana. Isso não é bar, é segundo emprego.', 'x', false, false, 4, '1:s17-5', { reescrita: true }],
  ]),
  'black-friday': list([
    ['black-friday-001', 'Black Friday e tu já gastou {valor} em {loja}. Metade do dobro é golpe, ouviu?', 'x', false, false, 4, '3:s18-1', { reescrita: true }],
    ['black-friday-002', 'É Black Friday. Fecha essa aba. Eu vi a aba. FECHA.', 'x', false, false, 3, '3:s18-2'],
    ['black-friday-003', '{valor} gasto e o site piscando pra ti. Não pisca de volta. HIHIHI', 'x', true, false, 4, '3:s18-3', { reescrita: true }],
  ]),
  'sexta-noite': list([
    ['sexta-noite-001', 'Sextou. É rolê de uma bebida e fingir sono.', 'x', false, false, 4, '3:s17-1', { reescrita: true }],
    ['sexta-noite-002', 'Sexta à noite. Sai, mas volta inteiro, o cartão também.', 'm', false, false, 4, '3:s17-2', { reescrita: true }],
    ['sexta-noite-003', 'Sexta à noite. Beija na boca, que é mais barato que open bar, rsrsrs.', 'x', true, false, 4, '3:s17-3', { reescrita: true }],
    ['sexta-noite-004', 'Sexta à noite. Sai, mas volta inteira, o cartão também.', 'f', false, false, 4, '3:s17-2', { reescrita: true }],
  ]),
  tabacaria: list([
    ['tabacaria-001', '{valor} na tabacaria. Teu pulmão pediu o extrato e chorou.', 'x', false, true, 3, '3:s31-1'],
    ['tabacaria-002', '{valor} em fumaça. Literalmente queimando dinheiro, seu chaminezuxo.', 'm', false, true, 4, '3:s31-2', { reescrita: true }],
    ['tabacaria-003', 'Passou na tabacaria, {valor}. Seda, piteira e zero vergonha na cara, rsrsrs.', 'x', true, true, 3, '3:s31-3'],
    ['tabacaria-004', '{valor} de tabaco. Tá enrolando o dinheiro junto com a seda, né, chaminezuxo?', 'm', false, true, 4, '4:l4a-05-1'],
    ['tabacaria-005', 'Passou na tabacaria, {valor}. Meu cofre fica com a fumaça e tu fica com o cheiro. Divisão justa? Nenhuma.', 'x', false, true, 4, '4:l4a-05-2'],
    ['tabacaria-006', '{valor} em fumaça. Dava um Porquinho gordo, mas tá bom, tá bom, respira aí.', 'x', false, true, 4, '4:l4a-05-4', { reescrita: true }],
    ['tabacaria-007', 'Comprou isqueiro de novo, {valor}. Eles somem igual moeda no meu bucho.', 'x', false, false, 4, '4:l4a-05-5'],
    ['tabacaria-008', '{valor} em fumaça. Literalmente queimando dinheiro, sua chaminezuxa.', 'f', false, true, 4, '3:s31-2', { reescrita: true }],
    ['tabacaria-009', '{valor} de tabaco. Tá enrolando o dinheiro junto com a seda, né, chaminezuxa?', 'f', false, true, 4, '4:l4a-05-1', { reescrita: true }],
  ]),
  pod: list([
    ['pod-001', 'Outro pod de {valor}? Tá respirando salada de fruta a preço de picanha.', 'x', false, true, 3, '3:s32-1'],
    ['pod-002', 'Mais um pod, poduxo. Daqui a pouco tu solta fumaça até pelo boleto.', 'm', false, true, 4, '3:s32-2', { reescrita: true }],
    ['pod-003', '{valor} no pod e depois diz que não sobra pro Porquinho. Sobra sim: vapor. HIHIHI', 'x', true, true, 3, '3:s32-3'],
    ['pod-004', 'Pod novo, {valor}. Daqui a pouco o boleto também vem com sabor de manga, HIHIHI.', 'x', true, true, 4, '4:l4a-05-3'],
    ['pod-005', 'Mais um pod, poduxa. Daqui a pouco tu solta fumaça até pelo boleto.', 'f', false, true, 4, '3:s32-2', { reescrita: true }],
  ]),
})
