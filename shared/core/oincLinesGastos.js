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
    ['posto-008', 'Encheu o tanque com {valor} e me deixou aqui no vazio. Egoistuxa.', 'f', false, false, 4, '3:s01-2'],
    ['posto-009', '{valor} de gasolina. Teu carro tá mais bem alimentado que eu, e olha que o gordinho aqui sou eu.', 'x', false, false, 4, '4:novo-posto-1'],
    ['posto-010', '{valor} no posto. Esse carro bebe igual tio no churrasco, e quem fica de ressaca é o meu bucho. rsrsrs', 'x', true, false, 4, '4:novo-posto-2'],
    ['posto-011', '{valor} de gasolina. Frentista feliz, carro cheio, porco vazio. Ronc, que injustiça.', 'x', true, false, 4, '4:novo-posto-3'],
    ['posto-012', '{valor} de combustível. Tanta vontade de encher o tanque e nenhuma de encher o Porquinho, safaduxo.', 'm', false, false, 4, '4:novo-posto-4'],
    ['posto-013', '{valor} de combustível. Tanta vontade de encher o tanque e nenhuma de encher o Porquinho, safaduxa.', 'f', false, false, 4, '4:novo-posto-4'],
  ]),
  farmacia: list([
    ['farmacia-001', '{valor} na farmácia. Se for remédio, melhoras. Se for creme caro, vergonha.', 'x', false, false, 3, '3:s02-1'],
    ['farmacia-002', '{valor} de farmácia. Comprou camisinha ou comprou juízo? Um dos dois faltava. rsrsrs', 'x', true, false, 4, '3:s02-3'],
    ['farmacia-003', '{valor} na farmácia. Traz um remédio pra porco também, que eu tô vendo o cofre girar.', 'x', false, false, 4, '4:novo-farmacia-1'],
    ['farmacia-004', '{valor} na farmácia. Foi vitamina, pomada ou aquele creme que promete milagre? Fala logo, hehehe.', 'x', true, false, 4, '4:novo-farmacia-2'],
    ['farmacia-005', '{valor} de farmácia. Tomara que tenha remédio pra dedo nervoso no cartão.', 'x', false, false, 4, '4:novo-farmacia-3'],
  ]),
  assinaturas: list([
    ['assinaturas-001', 'Um monte de assinatura, {total}. Tu não tem olho pra assistir isso tudo.', 'x', false, false, 4, '3:s03-1'],
    ['assinaturas-002', '{total} em assinatura. Tem streaming aí que nem lembra da tua cara.', 'x', false, false, 3, '3:s03-2'],
    ['assinaturas-003', 'Assinou um monte, usa um e meio. O resto é caridade pra bilionário, HIHIHI.', 'x', true, false, 4, '3:s03-3'],
    ['assinaturas-004', 'Assinatura de {valor} caindo de novo. Dá preguiça cancelar, né? Preguiça cara pra caralho.', 'x', false, false, 4, '4:novo-assinaturas-1'],
    ['assinaturas-005', '{valor} de assinatura. Tu assiste dormindo e eu pago em sofrimento, com ronco e tudo.', 'x', false, false, 4, '4:novo-assinaturas-2'],
  ]),
  'compra-madrugada': list([
    ['compra-madrugada-001', '{valor} às {hora} da manhã. Isso não é compra, é possessão.', 'x', false, false, 3, '3:s04-1'],
    ['compra-madrugada-002', '{hora} da madrugada e o dedinho passeando no carrinho. Vai DORMIR, porra.', 'x', false, false, 4, '3:s04-2'],
    ['compra-madrugada-003', 'Compra às {hora}. Quando a caixa chegar tu vai abrir sem saber o que é. huehue', 'x', true, false, 3, '3:s04-3'],
    ['compra-madrugada-004', '{valor} de madrugada. Isso não é compra, é sonambulismo com limite no cartão, caralho.', 'x', false, false, 4, '4:novo-compra-madrugada-1'],
    ['compra-madrugada-005', '{valor} na calada da noite. Ronc, até a coruja falou pra tu ir dormir.', 'x', true, false, 4, '4:novo-compra-madrugada-2'],
  ]),
  'pix-pessoa': list([
    ['pix-pessoa-001', 'Pix de {valor} pra uma pessoa. Dívida, rolo ou chantagem? Pisca duas vezes.', 'x', false, false, 3, '3:s05-1', { exagero: true }],
    ['pix-pessoa-002', 'Saíram {valor} no Pix. Espero que a criatura pelo menos te mande bom dia.', 'x', false, false, 3, '3:s05-2'],
    ['pix-pessoa-003', '{valor} voando no Pix, e pra mim nunca sobra nem um pixzuxo.', 'x', false, false, 4, '3:s05-3'],
    ['pix-pessoa-004', 'Saiu {valor} no Pix. Eu sou porco, mas fofoqueiro também. Pra quem foi? HIHIHI', 'x', true, false, 4, '4:novo-pix-pessoa-1'],
    ['pix-pessoa-005', '{valor} de Pix pra alguém. Se for dívida, paga com gosto. Se for presente, que seja pra mim. rsrsrs', 'x', true, false, 4, '4:novo-pix-pessoa-2'],
  ]),
  'gasto-minusculo': list([
    ['gasto-minusculo-001', '{valor} em {loja}. Mó pataquinho, mas eu lambi o extrato e senti o gosto.', 'x', false, false, 4, '3:s06-1'],
    ['gasto-minusculo-002', '{valor}, é? Começa assim, daqui a pouco tá financiando chiclete.', 'x', false, false, 4, '3:s06-2'],
    ['gasto-minusculo-003', '{valor}. SOCORRO, o malote! Ah não, é só farelo. Quase tive um piripaque de graça.', 'x', false, false, 4, '3:s06-3'],
    ['gasto-minusculo-004', 'Gastinho de {valor}. Eu engordei foi de miúdo em miúdo, e o mês emagrece igual. rsrsrs', 'x', true, false, 4, '4:novo-gasto-minusculo-1'],
    ['gasto-minusculo-005', 'Só {valor}? Isso eu acho no sofá, junto com um salgadinho de outra era. huehue', 'x', true, false, 4, '4:novo-gasto-minusculo-2'],
  ]),
  parcelamento: list([
    ['parcelamento-001', '{vezes} de {valor}. Esse boleto vai morar contigo e nem ajuda no aluguel.', 'x', false, false, 4, '3:s07-1'],
    ['parcelamento-002', 'Parcelou em {vezes}. Quando acabar, o produto já tá no lixo e tu ainda pagando.', 'x', false, false, 4, '3:s07-2'],
    ['parcelamento-003', '{valor} por mês, {vezes}. Relacionamento mais longo que muito namorico por aí. rsrsrs', 'x', true, false, 4, '3:s07-3'],
    ['parcelamento-004', 'Parcelou {vezes} de {valor}. Teu eu do futuro me mandou áudio chorando. Não tankei.', 'x', false, false, 4, '4:novo-parcelamento-1'],
    ['parcelamento-005', '{vezes} de {valor}. Parcela é tipo carrapato: gruda quietinha e só percebe quando já chupou tudo. KKKKKJ', 'x', true, false, 4, '4:novo-parcelamento-2'],
  ]),
  padaria: list([
    ['padaria-001', '{vezes} na padaria. O padeiro já separa teu pão quando ouve o chinelo.', 'x', false, false, 4, '3:s08-1'],
    ['padaria-002', '{valor} de padaria. Isso é muito pãozuxo pra uma barriga só.', 'x', false, false, 4, '3:s08-2'],
    ['padaria-003', '{valor} na padaria. Cheiro de pão quente me deixa chapaduxo, traz um pro porco.', 'x', false, true, 4, '4:novo-padaria-1'],
    ['padaria-004', 'Padaria, {valor}. Quem sai de lá só com o pão que foi buscar? Ninguém. Bolinho entrou de gaiato, rsrsrs.', 'x', true, false, 4, '4:novo-padaria-2'],
    ['padaria-005', '{valor} de padaria. Eu aqui sonhando com pão e tu comprando. Divide aí, sou porco de boa vontade, hehehe.', 'x', true, false, 4, '4:novo-padaria-3'],
  ]),
  'app-corrida': list([
    ['app-corrida-001', '{valor} de corrida. Tuas pernas pediram baixa por falta de uso.', 'x', false, false, 4, '3:s09-1'],
    ['app-corrida-002', '{valor} de corrida. O motorista já sabe teu CEP, teu signo e teu ex.', 'x', false, false, 4, '3:s09-2'],
    ['app-corrida-003', 'Corrida de novo? Anda, criatura, o chão é de graça. KKKKKJ', 'x', true, false, 4, '3:s09-3'],
    ['app-corrida-004', '{valor} de corrida. Se foi pressa, tudo bem. Se foi preguiça, o chão continua de graça, porra.', 'x', false, false, 4, '4:novo-app-corrida-1'],
    ['app-corrida-005', '{valor} no app de corrida. Tá aí uma coisa que anda mais que eu: teu dinheiro. HIHIHI', 'x', true, false, 4, '4:novo-app-corrida-2'],
  ]),
  roupa: list([
    ['roupa-001', '{valor} em roupa e eu aqui, pelado há anos sem reclamar. Mentira, reclamo.', 'x', false, false, 3, '3:s10-1'],
    ['roupa-002', 'Roupa nova de {valor}. Vai usar pra quê, pra abrir a fatura bem vestido?', 'm', false, false, 3, '3:s10-2'],
    ['roupa-003', '{valor} no pano. Desfila pra mim, vai, quero ver se valeu. rsrsrs', 'x', true, false, 4, '3:s10-3'],
    ['roupa-004', 'Roupa nova de {valor}. Vai usar pra quê, pra abrir a fatura bem vestida?', 'f', false, false, 4, '3:s10-2'],
    ['roupa-005', '{valor} de roupa nova. Eu aqui pelado que nem porco bom e tu se vestindo com o meu dindin. HIHIHI', 'x', true, false, 4, '4:novo-roupa-1'],
  ]),
  pet: list([
    ['pet-001', '{valor} no pet shop. O bicho come melhor que tu, e tá certo ele.', 'x', false, false, 3, '3:s11-1'],
    ['pet-002', 'Gastou {valor} com o outro bicho. E o porco aqui? Nem um biscoito?', 'x', false, false, 3, '3:s11-2'],
    ['pet-003', 'Pet shop, {valor}. Isso é ciúme que tô sentindo, ronc.', 'x', true, false, 3, '3:s11-3'],
    ['pet-004', '{valor} com o pet. Ele é fofo, eu sei, mas eu também sou, e ninguém me compra petisco.', 'x', false, false, 4, '4:novo-pet-1'],
    ['pet-005', 'Pet shop de {valor}. O bicho sai de lá cheiroso e eu aqui, fedendo a moeda velha. KKKKKJ', 'x', true, false, 4, '4:novo-pet-2'],
  ]),
  'varias-compras': list([
    ['varias-compras-001', 'O banco me entregou compra pra caramba de uma vez, {total}. Tu fez um arrastão?', 'x', false, false, 4, '3:s12-1'],
    ['varias-compras-002', 'Compra que não acaba mais, {total}. Vou soltando uma por uma pra tu sofrer parcelado.', 'x', false, false, 4, '3:s12-2'],
    ['varias-compras-003', 'Chegou o extrato de {quando}: um bocado de comprinha, {total}. De inha não tem nada, HIHIHI.', 'x', true, false, 4, '3:s12-3'],
    ['varias-compras-004', 'Apareceu {total} em compras de uma vez só. O banco despejou tudo junto, igual caminhão de entulho.', 'x', false, false, 4, '4:novo-varias-compras-1'],
    ['varias-compras-005', 'Um monte de compra de uma vez, {total}. Tu foi na loja ou a loja veio em ti? rsrsrs', 'x', true, false, 4, '4:novo-varias-compras-2'],
  ]),
  estorno: list([
    ['estorno-001', 'Voltaram {valor}. Dinheiro que vai e volta, o único relacionamento saudável daqui.', 'x', false, false, 3, '3:s13-1'],
    ['estorno-002', 'Estorno de {valor}. Não comemora gastando, que eu conheço a peça.', 'x', false, false, 3, '3:s13-2'],
    ['estorno-003', 'Voltou {valor}. Saiu e entrou de novo, do jeito que eu gosto. Agora deixa quietinho no Porquinho.', 'x', false, false, 4, '4:novo-estorno-1'],
    ['estorno-004', '{valor} de estorno. Aposto que o dedinho já tá coçando pra gastar de novo, huehuehue.', 'x', true, false, 4, '4:novo-estorno-2'],
    ['estorno-005', 'Estornaram {valor}. Isso que é boa notícia: o dinheiro desistiu de fugir. Segura ele, porra. HIHIHI', 'x', true, false, 4, '4:novo-estorno-3'],
  ]),
  delivery: list([
    ['delivery-001', 'HIHIHI mais um {loja}. Teu fogão me ligou chorando, parsa.', 'x', true, false, 4, '2:s01-1'],
    ['delivery-002', '{valor} no {loja} de novo, magreluxo? Nem pra engordar tu serve.', 'm', false, false, 2, '2:s01-2'],
    ['delivery-003', 'Ding dong, é o motoboy. De novo, ele já entra sem bater.', 'x', false, false, 4, '2:s01-3'],
    ['delivery-004', 'Mais um {loja}. O fogão tá achando que foi demitido.', 'x', false, false, 4, '1:s01-1'],
    ['delivery-005', '{valor} de {loja} de novo? Levanta e frita um ovo, caralho.', 'x', false, false, 1, '1:s01-2'],
    ['delivery-006', 'Que lindo, mais um pedido. O motoboy já é praticamente da família.', 'x', false, false, 4, '1:s01-3'],
    ['delivery-007', 'Se continuar assim o {loja} te chama pra festa da firma.', 'x', false, false, 1, '1:s01-4'],
    ['delivery-008', 'Mais um {loja}. Eu aqui magreluxo e tu alimentando aplicativo.', 'x', false, false, 4, '1:s01-5'],
    ['delivery-009', '{valor} de delivery. O motoboy já é meu cunhado, de tanto vir aqui no cofre.', 'x', false, false, 4, '4:l4b-01-1'],
    ['delivery-010', 'Pediu lanche de novo, {valor}. Tô achando que tu tem relacionamento com o entregador. Põe aliança, hehehe.', 'x', true, false, 4, '4:l4b-01-2'],
    ['delivery-011', '{valor} no delivery. Se chegou quentinho, grande e na hora, quem me dera, rsrsrs.', 'x', true, false, 4, '4:l4b-01-3', { reescrita: true }],
    ['delivery-012', '{valor} de delivery. Meu bucho roncou e o teu também, mas o meu ronca de fome de dindin.', 'x', false, false, 4, '4:l4b-01-4'],
    ['delivery-013', 'Delivery {valor}. Vi um hambúrguer passando na minha cabeça, com perna e tudo. Tô chapaduxo de fome.', 'x', false, true, 4, '4:l4b-01-5'],
    ['delivery-014', 'Pediu comida de novo, {valor}. Tua cozinha tá de luto, eu fiz o velório {quando}. KKKKKJ', 'x', true, false, 4, '4:l4b-01-7'],
    ['delivery-015', '{valor} de delivery. Entregaram na porta, rapidinho. Só eu nunca recebo entrega, sou porco carente.', 'x', false, false, 4, '4:l4b-01-8'],
    ['delivery-016', '{valor} no {loja} de novo, magreluxa? Nem pra engordar tu serve.', 'f', false, false, 4, '2:s01-2'],
  ]),
  mercado: list([
    ['mercado-001', '{valor}, MANO. Tu comprou comida ou sequestrou o açougueiro?', 'x', false, false, 4, '2:s02-3'],
    ['mercado-002', 'Mercado de novo, {valor}. Carrinho cheio, bucho meu vazio, justiça é isso aí.', 'x', false, false, 4, '4:l4a-03-2'],
    ['mercado-003', '{valor} no mercado. Anotei até o pacote de bolacha que tu jura que é da casa. rsrsrs', 'x', true, false, 4, '4:l4a-03-3'],
    ['mercado-004', '{valor} de compras. Se sobrar chocolate, eu aceito como pagamento.', 'x', false, false, 4, '4:l4a-03-5'],
    ['mercado-005', '{valor} de compras. Acha que eu não vi o pacote de biscoito que entrou escondido? Porco vê tudo, até pelado.', 'x', false, false, 4, '4:novo-mercado-1'],
    ['mercado-006', 'Mercado: {valor}. A geladeira vai ficar cheia e o Porquinho continua magro. Faz essa conta, porra.', 'x', false, false, 4, '4:novo-mercado-2'],
    ['mercado-007', '{valor} no mercado. Comida em casa é bom, mas eu só como dindin, tá? Deposita aí. Ronc.', 'x', true, false, 4, '4:novo-mercado-3'],
    ['mercado-008', '{valor} de mercado e eu aqui na dieta forçada. Porco pelado não passa fome, só passa vontade, HIHIHI.', 'x', true, false, 4, '4:novo-mercado-4'],
    ['mercado-009', 'Compras de {valor}. Se tiver bolacha recheada nesse carrinho, eu quero a metade. Sou pequeno, mas sou justo.', 'x', false, false, 4, '4:novo-mercado-5'],
    ['mercado-010', '{valor} no mercado. Eu gosto de comida porque tô chapaduxo. De preço eu não gosto nem chapado.', 'x', false, true, 4, '4:novo-mercado-6'],
    ['mercado-011', '{valor} de mercado. Quero conferir a nota e achar o item que tu jura que era essencial. AHAHAHA', 'x', true, false, 4, '4:novo-mercado-7'],
    ['mercado-012', '{valor} no mercado. Comprou pepino também, né? Pra salada, claro. Salada. rsrsrs', 'x', true, false, 4, '4:novo-mercado-8'],
  ]),
  'compra-grande': list([
    ['compra-grande-001', '{valor} de uma vez?? Eu aqui comendo moeda de cinco, seu playboy do caralho.', 'm', false, false, 4, '2:s03-1', { reescrita: true }],
    ['compra-grande-002', 'HIHIHI {valor} numa compra só. Tomara que vibre, pelo preço... a notificação, porra. rsrsrsrs', 'x', true, false, 4, '2:s03-2', { reescrita: true }],
    ['compra-grande-003', '{valor}. Ronc. Ronc. Desculpa, é o porco tendo um piripaque.', 'x', true, false, 4, '2:s03-3'],
    ['compra-grande-004', 'Puta que pariu, {valor}. Isso aí faz o quê, imprime dinheiro?', 'x', false, false, 1, '1:s03-2'],
    ['compra-grande-005', 'Foi sozinho pra loja? Não pode. Da próxima leva um adulto.', 'm', false, false, 1, '1:s03-4'],
    ['compra-grande-006', '{valor} de uma vez?? Eu aqui comendo moeda de cinco, sua playgirl do caralho.', 'f', false, false, 4, '2:s03-1', { reescrita: true }],
    ['compra-grande-007', 'Foi sozinha pra loja? Não pode. Da próxima leva um adulto.', 'f', false, false, 4, '1:s03-4'],
  ]),
  compra: list([
    ['compra-001', 'Passou {valor} em {loja} e eu só fiquei sabendo agora. Sou porco, mas tenho sentimentos.', 'x', false, false, 4, '4:novo-compra-1'],
    ['compra-002', '{loja}, {valor}. Se foi presente, tá perdoado. Se foi pra ti, tá anotado, hein. HIHIHI', 'x', true, false, 4, '4:novo-compra-2'],
    ['compra-003', 'Compra de {valor}. Se foi gostosa, aproveita. Se foi besteira, vem chorar aqui no meu bucho, safaduxo.', 'm', false, false, 4, '4:novo-compra-3'],
    ['compra-004', 'Gastou {valor}. Eu não julgo, só anoto. Tá, eu julgo um pouquinho. HIHIHI', 'x', true, false, 4, '4:novo-compra-4'],
    ['compra-005', '{valor} gastos. Eu vi, tá? Porco cochila pelado, mas com um olho aberto.', 'x', false, false, 4, '4:novo-compra-5'],
    ['compra-006', 'Compra de {valor}. Se foi gostosa, aproveita. Se foi besteira, vem chorar aqui no meu bucho, safaduxa.', 'f', false, false, 4, '4:novo-compra-3'],
  ]),
  'loja-repete': list([
    ['loja-repete-001', '{vezes} no {loja} na semana. O garçom já sabe teu pedido e teus traumas.', 'x', false, false, 4, '2:s17-1'],
    ['loja-repete-002', '{total} no {loja}. Tá namorando o garçom e não me contou? rsrsrsrs', 'x', true, false, 2, '2:s17-2'],
    ['loja-repete-003', '{loja} de novo, parsa? Bate ponto lá e pede vale-transporte.', 'x', false, false, 2, '2:s17-3'],
    ['loja-repete-004', '{vezes} no {loja}. Isso não é compra, é namorico. Cadê meu chifruxo de ouro? KKKKK', 'x', true, false, 4, '1:s17-1'],
    ['loja-repete-005', '{total} no mesmo bar. Pede participação nos lucros.', 'x', false, false, 1, '1:s17-2'],
    ['loja-repete-006', '{loja} de novo? Se mudar pra lá economiza o Uber.', 'x', false, false, 1, '1:s17-3'],
    ['loja-repete-007', 'O garçom já sabe seu pedido, sua senha e seus traumas.', 'x', false, false, 1, '1:s17-4'],
    ['loja-repete-008', '{vezes} no {loja} na semana. Pede carteira assinada lá, parça, que tu já bate ponto.', 'x', false, false, 4, '1:s17-5'],
    ['loja-repete-009', '{loja} de novo, é? Já te deram cartão fidelidade ou só um abraço e a conta? HIHIHI', 'x', true, false, 4, '4:novo-loja-repete-1'],
  ]),
  'black-friday': list([
    ['black-friday-001', 'Black Friday e já foram {valor} em {loja}. Mó promoçãozuxa, e o pobre sou eu.', 'x', false, false, 4, '3:s18-1'],
    ['black-friday-002', 'É Black Friday. Fecha essa aba. Eu vi a aba. FECHA.', 'x', false, false, 3, '3:s18-2'],
    ['black-friday-003', '{valor} gasto e o site piscando pra ti. Não pisca de volta. HIHIHI', 'x', true, false, 4, '3:s18-3'],
    ['black-friday-004', 'Black Friday e já foram {valor}. O preço caiu, mas teu saldo caiu junto, caralho.', 'x', false, false, 4, '4:novo-black-friday-1'],
    ['black-friday-005', 'Black Friday, {valor} gastos. Quem economiza gastando é igual porco que emagrece comendo: dá nisso, hehehe.', 'x', true, false, 4, '4:novo-black-friday-2'],
  ]),
  'sexta-noite': list([
    ['sexta-noite-001', 'Sextou. Uma bebida, um vexame e um pix que tu não lembra. Roteiro clássico.', 'x', false, false, 4, '3:s17-1'],
    ['sexta-noite-002', 'Sexta à noite. Sai, mas volta inteiro, o cartão também.', 'm', false, false, 4, '3:s17-2'],
    ['sexta-noite-003', 'Sexta à noite. Beija na boca, que é mais barato que open bar, rsrsrs.', 'x', true, false, 4, '3:s17-3'],
    ['sexta-noite-004', 'Sexta à noite. Sai, mas volta inteira, o cartão também.', 'f', false, false, 4, '3:s17-2'],
    ['sexta-noite-005', 'Sexta à noite e a carteira de pijama. Deixa ela dormir, parça, pelo amor do bacon.', 'x', false, false, 4, '4:novo-sexta-noite-1'],
  ]),
  tabacaria: list([
    ['tabacaria-001', '{valor} na tabacaria. Teu pulmão pediu o extrato e chorou.', 'x', false, true, 3, '3:s31-1'],
    ['tabacaria-002', '{valor} em fumaça. Literalmente queimando dinheiro, seu chaminezuxo.', 'm', false, true, 4, '3:s31-2'],
    ['tabacaria-003', 'Passou na tabacaria, {valor}. Seda, piteira e zero vergonha na cara, rsrsrs.', 'x', true, true, 3, '3:s31-3'],
    ['tabacaria-004', '{valor} de tabaco. Tá enrolando o dinheiro junto com a seda, né, chaminezuxo?', 'm', false, true, 4, '4:l4a-05-1'],
    ['tabacaria-005', 'Passou na tabacaria, {valor}. Meu cofre fica com a fumaça e tu fica com o cheiro. Divisão justa? Nenhuma.', 'x', false, true, 4, '4:l4a-05-2'],
    ['tabacaria-006', '{valor} em fumaça. Dava um Porquinho gordo, mas tá bom, tá bom, respira aí.', 'x', false, true, 4, '4:l4a-05-4'],
    ['tabacaria-007', 'Comprou isqueiro de novo, {valor}. Eles somem igual moeda no meu bucho.', 'x', false, false, 4, '4:l4a-05-5'],
    ['tabacaria-008', '{valor} em fumaça. Literalmente queimando dinheiro, sua chaminezuxa.', 'f', false, true, 4, '3:s31-2'],
    ['tabacaria-009', '{valor} de tabaco. Tá enrolando o dinheiro junto com a seda, né, chaminezuxa?', 'f', false, true, 4, '4:l4a-05-1'],
    ['tabacaria-010', '{valor} na tabacaria. Meu cofre tá cheirando a fumaça e eu tô chapaduxo só de ficar perto, HIHIHI.', 'x', true, true, 4, '4:novo-tabacaria-1'],
  ]),
  pod: list([
    ['pod-001', 'Outro pod de {valor}? Tá respirando salada de fruta a preço de picanha.', 'x', false, true, 3, '3:s32-1'],
    ['pod-002', 'Mais um pod, poduxo. Daqui a pouco tu solta fumaça até pelo boleto.', 'm', false, true, 4, '3:s32-2'],
    ['pod-003', '{valor} no pod e depois diz que não sobra pro Porquinho. Sobra sim: vapor. HIHIHI', 'x', true, true, 3, '3:s32-3'],
    ['pod-004', 'Pod novo, {valor}. Daqui a pouco o boleto também vem com sabor de manga, HIHIHI.', 'x', true, true, 4, '4:l4a-05-3'],
    ['pod-005', 'Mais um pod, poduxa. Daqui a pouco tu solta fumaça até pelo boleto.', 'f', false, true, 4, '3:s32-2'],
  ]),
})
