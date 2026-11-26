// @ts-check
// Falas de AVISO (push) do OINC por cena e tom (07.1-09, D-26, D-34, D-35). Mesma voz aprovada do
// acervo (07.1-REGUA-HUMOR.md): esculacho, o corpo do porco, malicia leve, -uxo, risada em parte delas,
// sempre amarrado ao fato e ao prazo. TODAS sao novas, `lote: 4` e `reescrita: true`: nada daqui vai ao
// ar antes do voto do dono (plano 07.1-14).
//
// 'sem-filtro' existe nas 14 cenas. 'suave' e 'direto' so existem nas cenas de conta e compromisso, que
// nao tinham texto: sao informativas, sem a voz nova e sem palavrao. Nas demais cenas esses dois tons
// continuam no banco de aviso de hoje (D-35), que este arquivo nao copia.
//
// Regras de escrita alem da regua do acervo:
//   - {conta}, {titulo} e {loja} nunca abrem uma frase (o texto entra como foi escrito);
//   - {valor} nas cenas de limite e o total gasto na categoria, e {loja} e a da ultima compra: nenhuma
//     fala pode dizer que o total foi gasto na loja;
//   - {hora} so nas cenas de compromisso (a hora da compra nao e confiavel).
// Ids: cena e tres digitos (sem filtro 0xx, suave 1xx, direto 2xx).

/**
 * @typedef {import('./oincLines.js').OincLine} OincLine
 * @typedef {[string, string, boolean?, boolean?]} Row  numero, modelo, risada, fumo
 */

/**
 * @param {string} cena
 * @param {Row[]} rows
 * @returns {ReadonlyArray<Readonly<OincLine>>}
 */
const list = (cena, rows) =>
  Object.freeze(
    rows.map(([n, t, risada = false, fumo = false]) =>
      Object.freeze({
        id: `${cena}-${n}`,
        t,
        g: /** @type {'x'} */ ('x'),
        risada,
        fumo,
        lote: 4,
        origem: `4:novo-${cena}-${n}`,
        reescrita: true,
      }),
    ),
  )

/**
 * @param {string} cena
 * @param {{ 'sem-filtro': Row[], suave?: Row[], direto?: Row[] }} byTone
 * @returns {Readonly<Record<string, ReadonlyArray<Readonly<OincLine>>>>}
 */
const scene = (cena, byTone) =>
  Object.freeze(Object.fromEntries(Object.entries(byTone).map(([tone, rows]) => [tone, list(cena, rows)])))

/** @type {Readonly<Record<string, Readonly<Record<string, ReadonlyArray<Readonly<OincLine>>>>>>} */
export const OINC_PUSH_LINES = Object.freeze({
  'push-limite-80': scene('push-limite-80', {
    'sem-filtro': [
      ['001', 'Depois de {loja}, {categoria} tá em {pct}: {valor} no total. Segura esse dedinho, porra.'],
      ['002', '{categoria} em {pct} depois de {loja}, somando {valor}. Agora é só a pontinha, hein. rsrsrs', true],
      ['003', '{categoria} em {pct}, {valor} gastos. Tá quase no talo: janta pão e agradece.'],
      ['004', 'Já foram {valor} em {categoria}, {pct} do limite. Fecha essa carteiruxa, parsa. HIHIHI', true],
      ['005', '{valor} em {categoria} e o limite já tá suando. Alivia, que eu não aguento tanto aperto.'],
      ['006', 'Depois de {loja}, um limite tá quase no fim: {valor} no total. Alivia, porra.'],
      ['007', 'Um limite tá quase estourando, {valor} gastos. Ronc, segura esse malote.', true],
      ['008', 'Tem limite quase estourando e tu aí de boa. Ronc... abre o app antes da merda.', true],
    ],
  }),
  'push-limite-100': scene('push-limite-100', {
    'sem-filtro': [
      ['001', 'Depois de {loja}, {categoria} estourou: {valor}, {pct} do limite. Que fogo é esse, caralho?'],
      ['002', '{categoria} furou o limite depois de {loja}, já são {valor}. Meteu fundo, hein. rsrsrs', true],
      ['003', '{categoria} estourou: {valor}, {pct} do limite. Levanta essa bunda e cozinha em casa.'],
      ['004', 'Passou do limite de {categoria}, {valor} no total. Quem enfiou o pé foi tu, ronc.', true],
      ['005', '{valor} em {categoria} e o limite foi pro saco. Eu aqui lambendo o cofre, porra.'],
      ['006', 'Depois de {loja}, um limite estourou: {valor} no total. Que larica de gastar é essa?', false, true],
      ['007', 'Um limite estourou, {valor} gastos. Tô tremendo aqui dentro, e não é de tesão.'],
      ['008', 'Limite estourado, porra. Abre o app e vem olhar essa lambança comigo.'],
    ],
  }),
  'push-fatura-d2': scene('push-fatura-d2', {
    'sem-filtro': [
      ['001', 'Faltam dois dias pra fatura de {valor}. Separa o malote antes que vire juros, porra.'],
      ['002', 'Em dois dias vence a fatura: {valor}. Ela vem grossa, vai se preparando. rsrsrs', true],
      ['003', 'A fatura de {valor} vence em dois dias. Hoje a janta é em casa, comandante.'],
      ['004', 'Faltam dois dias e {valor} de fatura. Aviso cedo, que chorar pelado já basta eu.'],
      ['005', '{valor} de fatura vencendo em dois dias. Ronc, guarda a grana e solta o carrinho.', true],
      ['006', 'Faltam dois dias pra fatura vencer. Nem tenta sumir, que eu sei onde tu mora. HIHIHI', true],
    ],
  }),
  'push-fatura-d1': scene('push-fatura-d1', {
    'sem-filtro': [
      ['001', 'A fatura de {valor} vence amanhã. Paga essa porra hoje e dorme gostoso.'],
      ['002', 'Amanhã vence a fatura: {valor}. Enrola, que os juros vêm te encoxar. rsrsrs', true],
      ['003', 'É amanhã: {valor} de fatura. Junta o dindin agora, antes que vire sanduíche.'],
      ['004', '{valor} de fatura vencendo amanhã. Tô suando aqui no cofre, peladinho e tenso.'],
      ['005', 'Amanhã a fatura cobra {valor}. Ronc... não deixa ela no vácuo, que ela morde.', true],
      ['006', 'A fatura vence amanhã. Paga logo, que eu me recuso a ser porco de calote.'],
    ],
  }),
  'push-fatura-d0': scene('push-fatura-d0', {
    'sem-filtro': [
      ['001', 'Hoje vence a fatura: {valor}. Paga AGORA, porra, antes que vire juros.'],
      ['002', 'É hoje: {valor} de fatura. Último aviso antes de eu fazer escândalo pelado.'],
      ['003', 'A fatura de {valor} vence hoje. Enfia logo esse pagamento, vai. rsrsrs', true],
      ['004', '{valor} de fatura vencendo hoje. Se esquecer, os juros comem tu e depois eu.'],
      ['005', 'Vence hoje, {valor} de fatura. Ronc ronc, larga tudo e entrega essa bufunfa.', true],
      ['006', 'A fatura vence hoje e tu rolando a tela. Paga, caralho.'],
    ],
  }),
  'push-conta-d2': scene('push-conta-d2', {
    'sem-filtro': [
      ['001', 'Faltam dois dias: {conta}, {valor}. Separa a grana e esconde de ti.'],
      ['002', 'Em dois dias vence {conta}, {valor}. Eu já tô tremendo e tu fingindo costume. rsrsrs', true],
      ['003', 'Anota aí: {conta}, {valor}, vence em dois dias. Guarda esse malote, porra.'],
      ['004', 'Daqui a dois dias tem {conta}, {valor}. Não torra tudo em besteiruxa antes.'],
      ['005', 'Boleto em dois dias: {conta}, {valor}. Ronc, já tô suando nas bochechas.', true],
      ['006', 'Faltam dois dias pra vencer {conta}. Olha a data e não me mata de vergonha.'],
      ['007', 'Faltam dois dias pra uma conta vencer. Abre o app, que eu não pago por ti.'],
    ],
    suave: [
      ['101', 'Daqui a dois dias vence {conta}, {valor}. Dá tempo de se organizar com calma.'],
      ['102', 'Um lembrete com carinho: {conta}, de {valor}, vence em dois dias.'],
      ['103', 'Uma conta vence em dois dias. Quando der, dá uma olhada no app com calma.'],
    ],
    direto: [
      ['201', 'Vence em dois dias: {conta}, {valor}.'],
      ['202', 'Faltam dois dias para o vencimento de {conta}: {valor}.'],
      ['203', 'Há uma conta que vence em dois dias. Confira no app.'],
    ],
  }),
  'push-conta-d1': scene('push-conta-d1', {
    'sem-filtro': [
      ['001', 'Amanhã vence {conta}, {valor}. Separa o malote hoje, porra.'],
      ['002', 'É amanhã: {conta}, {valor}. Se atrasar, os juros entram sem bater na porta. rsrsrs', true],
      ['003', 'Vence amanhã: {conta}, {valor}. Não me faz repetir, que eu já tô rouco de gritar.'],
      ['004', '{valor} saindo amanhã: {conta}. Tô aqui pelado e preocupado, paga isso.'],
      ['005', 'Amanhã tem {conta}, {valor}. Ronc, deixa a grana quietinha até lá.', true],
      ['006', 'Amanhã vence {conta}. Dá um jeito antes que vire bola de neve.'],
      ['007', 'Tem conta vencendo amanhã. Abre o app e resolve, caralho.'],
    ],
    suave: [
      ['101', 'Amanhã vence {conta}, {valor}. Se já separou o dinheiro, está tudo certo.'],
      ['102', 'Um lembrete com carinho: {conta}, de {valor}, vence amanhã.'],
      ['103', 'Uma conta vence amanhã. Dá uma olhada no app quando puder.'],
    ],
    direto: [
      ['201', 'Vence amanhã: {conta}, {valor}.'],
      ['202', 'O vencimento de {conta} é amanhã: {valor}.'],
      ['203', 'Há uma conta que vence amanhã. Confira no app.'],
    ],
  }),
  'push-conta-d0': scene('push-conta-d0', {
    'sem-filtro': [
      ['001', 'É hoje: {conta}, {valor}. Paga agora, porra, e marca como paga.'],
      ['002', 'Hoje vence {conta}, {valor}. Enfia logo esse pagamento, vai. rsrsrs', true],
      ['003', 'Vence hoje: {conta}, {valor}. Se passar batido, os juros fazem festa na tua carteira.'],
      ['004', '{valor} pra hoje: {conta}. Só saio da tua tela depois de pago, e tô pelado.'],
      ['005', 'Último dia pra {conta}, {valor}: é hoje. Ronc, corre.', true],
      ['006', 'Hoje vence {conta}. Resolve isso antes de pensar em delivery.'],
      ['007', 'Tem conta vencendo hoje e tu aí de bobeira. Abre o app, caralho.'],
    ],
    suave: [
      ['101', 'Hoje vence {conta}, {valor}. Se já pagou, é só marcar no app.'],
      ['102', 'Um lembrete com carinho: {conta}, de {valor}, vence hoje.'],
      ['103', 'Uma conta vence hoje. Dá uma olhada no app quando puder.'],
    ],
    direto: [
      ['201', 'Vence hoje: {conta}, {valor}.'],
      ['202', 'O vencimento de {conta} é hoje: {valor}.'],
      ['203', 'Há uma conta que vence hoje. Confira no app.'],
    ],
  }),
  'push-compromisso-d2': scene('push-compromisso-d2', {
    'sem-filtro': [
      ['001', 'Daqui a dois dias, às {hora}: {titulo}. Não vai fingir que esqueceu, porra.'],
      ['002', 'Faltam dois dias pra {titulo}, às {hora}. Separa a roupa e toma um banho. rsrsrs', true],
      ['003', 'Em dois dias, às {hora}, tem {titulo}. Põe despertador, que eu não sou galo.'],
      ['004', 'Em dois dias tem {titulo}. Se arruma, que pelado aqui só eu.'],
      ['005', 'Anota: {titulo} daqui a dois dias. Tô de olho, e não é só no teu saldo. HIHIHI', true],
      ['006', 'Vem aí em dois dias: {titulo}. Ronc, ensaia uma desculpa boa ou comparece.', true],
      ['007', 'Tem compromisso em dois dias. Olha a agenda antes de marcar rolê em cima.'],
    ],
    suave: [
      ['101', 'Daqui a dois dias, às {hora}, tem {titulo}. Dá para se preparar com calma.'],
      ['102', 'Um lembrete com carinho: {titulo} é daqui a dois dias.'],
      ['103', 'Tem compromisso daqui a dois dias. Dá uma olhada na agenda quando puder.'],
    ],
    direto: [
      ['201', 'Em dois dias, às {hora}: {titulo}.'],
      ['202', 'Daqui a dois dias: {titulo}.'],
      ['203', 'Há um compromisso em dois dias. Confira a agenda.'],
    ],
  }),
  'push-compromisso-d1': scene('push-compromisso-d1', {
    'sem-filtro': [
      ['001', 'Amanhã, às {hora}: {titulo}. Não me aparece lá com cara de travesseiro, porra.'],
      ['002', 'É amanhã às {hora}: {titulo}. Dorme cedo hoje, sem safadeza. rsrsrs', true],
      ['003', 'Amanhã às {hora} tem {titulo}. Bota o despertador, que eu ronco alto e não acordo.'],
      ['004', 'Amanhã tem {titulo}. Lava esse sovaco e vai arrasar.'],
      ['005', 'Não esquece: {titulo} é amanhã. Ronc, eu lembrei e tu não.', true],
      ['006', 'É amanhã: {titulo}. Se faltar, eu conto pros outros porcos. HIHIHI', true],
      ['007', 'Tem compromisso amanhã. Abre a agenda antes que dê merda.'],
    ],
    suave: [
      ['101', 'Amanhã, às {hora}, tem {titulo}. Vale deixar tudo separado com calma.'],
      ['102', 'Um lembrete com carinho: {titulo} é amanhã.'],
      ['103', 'Tem compromisso amanhã. Dá uma olhada na agenda quando puder.'],
    ],
    direto: [
      ['201', 'Amanhã, às {hora}: {titulo}.'],
      ['202', 'Compromisso amanhã: {titulo}.'],
      ['203', 'Há um compromisso amanhã. Confira a agenda.'],
    ],
  }),
  'push-compra': scene('push-compra', {
    'sem-filtro': [
      ['001', 'Vi {valor} em {loja} {quando}. Nem me chamou pra espiar a sacolinha. rsrsrs', true],
      ['002', 'Sumiu {valor} em {loja}. Foi bom pelo menos? Conta tudo, que eu sou curioso.'],
      ['003', '{quando} teve {valor} em {loja}. Ronc, senti o cheiro da grana indo embora.', true],
      ['004', '{valor} em {categoria} {quando}. Enfiou gostoso, hein? Agora sossega o facho.'],
      ['005', 'Saiu {valor} em {categoria}. Meu bucho sentiu daqui, porra.'],
      ['006', '{quando} foram {valor} em {categoria}. Eu vi, tava pelado mas vi. HIHIHI', true],
      ['007', 'Saiu {valor} da carteira e tu nem piscou. Vem me contar essa história, parsa.'],
      ['008', 'Teve gasto novo e eu tô de olho. Abre o app e me explica, porra.'],
    ],
  }),
  'push-ritmo': scene('push-ritmo', {
    'sem-filtro': [
      ['001', 'Sobram {restante} com {dias} pela frente até o salário. Janta pão com vontade.'],
      ['002', '{restante} pra {dias}. Segura o fogo, que o malote tá magreluxo.'],
      ['003', 'Tem {restante} e {dias} pela frente. Não inventa moda, porra.'],
      ['004', '{dias} até o salário e {restante} na mão. Dorme mais, que dormindo não gasta. rsrsrs', true],
      ['005', 'Resumo do porco: {restante} pra {dias}. Ronc, tô pelado e contando os trocados.', true],
      ['006', 'Ainda tem {restante} no limite do mês. Gasta devagarinho, que assim eu gosto.'],
      ['007', 'Passa aqui ver quanto ainda dá pra gastar antes de inventar moda. Ronc.', true],
    ],
  }),
  'push-meta': scene('push-meta', {
    'sem-filtro': [
      ['001', 'Faltam {restante} pra bater {meta}. Mete uma moedinha, vai, que eu gosto. rsrsrs', true],
      ['002', 'A meta {meta} ainda pede {restante}. Larga o delivery e me alimenta, porra.'],
      ['003', 'Tua meta {meta} tá a {restante} de acontecer. Eu aplaudo pelado quando chegar.'],
      ['004', 'E a meta {meta}, hein? Tá lá carente, esperando teu dindin.'],
      ['005', 'Pensando em {meta} aqui. Enfia um dindin nela antes que esfrie. HIHIHI', true],
      ['006', 'Faltam {restante} pra bater uma meta tua. Ronc, enfia um dindin nela.', true],
      ['007', 'Tua meta tá carente aqui no cofre. Joga um dindin nela e me faz feliz.'],
    ],
  }),
  'push-nada': scene('push-nada', {
    'sem-filtro': [
      ['001', 'Psiu. Tava cochilando pelado e lembrei de ti. Vem ver teu mês.'],
      ['002', 'Ronc... passa aqui. Tô carente e teu extrato tá me olhando estranho.', true],
      ['003', 'Nada urgente. Só queria te ver e xeretar teu bolso, porra. rsrsrs', true],
      ['004', 'Abre o app, vai. Prometo que me visto. Mentira. HIHIHI', true],
      ['005', 'Tô chapaduxo aqui dentro e com saudade. Vem me ver antes que eu durma.', false, true],
      ['006', 'Oinc. Anotou tudo mesmo ou tá me escondendo gasto, hein?'],
      ['007', 'Tô fritaduxo no cofre, conversando com uma moeda. Vem me salvar, parsa.'],
    ],
  }),
})
