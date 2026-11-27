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
      ['001', 'Mano, depois de {loja}, {categoria} tá em {pct}: {valor}. Freia, que eu tô sem cinto. KKKKK', true],
      ['002', '{categoria} em {pct} depois de {loja}: {valor}. Mó pataco, tá nadando em dinheiro? rsrsrs', true],
      ['003', '{categoria} em {pct}, {valor} no ralo. Tira esse dedinho do botão de comprar antes que dê ruim.'],
      ['004', '{valor} em {categoria}, {pct} do limite. Teu malote tá pedindo socorro em caixa alta. KKKKKJ', true],
      ['005', '{valor} em {categoria} e o limite pendurado. Tô vendo duende, e o duende é tua dívida.'],
      ['006', 'Depois de {loja}, um limite tá no talo: {valor}. Tu não tanka ver uma vitrine, né, parça?'],
      ['007', 'Um limite tá quase estourando, {valor} gastos. Ronc, o porco aqui tá em pânico real.', true],
      ['008', 'Limite quase no osso e tu de boa. Mano. MANO. Larga a tela de compra e vem cá. Ronc.', true],
    ],
  }),
  'push-limite-100': scene('push-limite-100', {
    'sem-filtro': [
      ['001', 'Depois de {loja}, {categoria} explodiu: {valor}, {pct}. Surtou, parça? Porque eu surtei.'],
      ['002', '{categoria} furou depois de {loja}, já são {valor}. Speedrun de falência, recorde mundial. KKKKK', true],
      ['003', '{categoria} estourou: {valor}, {pct}. Teu fogão tá chorando em posição fetal, seu farsante.'],
      ['004', 'Estourou {categoria}, {valor} no total. Não tankei. Vou deitar no cofre e fingir de morto. Ronc.', true],
      ['005', '{valor} em {categoria} e o limite virou lenda. Torrou o malote todo, seu animal do caralho.'],
      ['006', 'Depois de {loja}, um limite morreu: {valor}. Que larica de gastar é essa, chapaduxo?', false, true],
      ['007', 'Um limite estourou, {valor} gastos. Tô mais tremido que vídeo de show, porra.'],
      ['008', 'Limite estourado. Papo reto: tu viu, fingiu que não viu e passou o cartão. Abre o app.'],
    ],
  }),
  'push-fatura-d2': scene('push-fatura-d2', {
    'sem-filtro': [
      ['001', 'Dois dias pra fatura de {valor}. Esconde o malote de ti, que tu é perigo.'],
      ['002', 'Em dois dias vence a fatura: {valor}. Vem grossa, e nem pagou um jantar antes. KKKKK', true],
      ['003', 'Fatura de {valor} em dois dias. Arroz, ovo e juízo, nessa ordem, parça.'],
      ['004', 'Dois dias e {valor} de fatura. Eu já tô rezando pra santo que nem aceita porco.'],
      ['005', '{valor} de fatura em dois dias. Ronc, solta o carrinho online, parça do frete grátis.', true],
      ['006', 'Faltam dois dias pra fatura. Muda de nome não, que eu te acho até no orelhão. HIHIHI', true],
    ],
  }),
  'push-fatura-d1': scene('push-fatura-d1', {
    'sem-filtro': [
      ['001', 'A fatura de {valor} é amanhã. Paga essa porra hoje e vai dormir igual neném chapado.', false, true],
      ['002', 'Fatura amanhã: {valor}. Mano. MANO. Tô suando pelo rabinho. KKKKK', true],
      ['003', 'É amanhã: {valor} de fatura. Junta cada pataco, vira o sofá, vende a meia furada.'],
      ['004', '{valor} de fatura amanhã. Tô peladinho em posição de ataque. Não me testa.'],
      ['005', 'Amanhã a fatura cobra {valor}. Ronc, deixa no vácuo não, que ela vem com os juros armados.', true],
      ['006', 'A fatura vence amanhã. Calote não, parça, porco preso não sobrevive, olha minha pele.'],
    ],
  }),
  'push-fatura-d0': scene('push-fatura-d0', {
    'sem-filtro': [
      ['001', 'Hoje vence a fatura: {valor}. Paga AGORA, caralho, juro rotativo é chefão sem save.'],
      ['002', 'É hoje: {valor} de fatura. Daqui a pouco eu começo a latir. Porco latindo, tu quer isso?'],
      ['003', 'A fatura de {valor} vence hoje. Enfia o pagamento com carinho, vai. rsrsrs', true],
      ['004', '{valor} de fatura hoje. Se esquecer, os juros te amassam e ainda pedem gorjeta.'],
      ['005', 'Hoje, {valor} de fatura. Ronc ronc, larga o meme do gato e solta essa bufunfa.', true],
      ['006', 'A fatura vence hoje e tu vendo vídeo de capivara. Para de moscar e paga, caralho.'],
    ],
  }),
  'push-conta-d2': scene('push-conta-d2', {
    'sem-filtro': [
      ['001', 'Dois dias: {conta}, {valor}. Solta o pataco antes que eu comece a latir.'],
      ['002', 'Em dois dias vence {conta}, {valor}. Eu tremendo e tu pagando de milionário. KKKKK', true],
      ['003', 'Anota: {conta}, {valor}, em dois dias. Guarda o malote na meia, que meia ninguém rouba.'],
      ['004', 'Em dois dias tem {conta}, {valor}. Torrar isso em coxinha é crime, e eu sou testemunha.'],
      ['005', 'Boleto em dois dias: {conta}, {valor}. Ronc, o código de barras tá me encarando.', true],
      ['006', 'Faltam dois dias pra vencer {conta}. Não mosca, parça, que o boleto não dorme.'],
      ['007', 'Dois dias pra uma conta vencer. Abre o app, que meu salário é em carinho e não paga boleto.'],
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
      ['001', 'Amanhã vence {conta}, {valor}. Separa hoje, que amanhã tu acorda com amnésia seletiva.'],
      ['002', 'É amanhã: {conta}, {valor}. Atrasou, o juro entra sem bater e deita na tua cama. rsrsrs', true],
      ['003', 'Vence amanhã: {conta}, {valor}. Tô gritando tanto que virei porco de feira, porra.'],
      ['004', '{valor} amanhã: {conta}. Tô pelado, nervoso e comendo moeda. Resolve.'],
      ['005', 'Amanhã é {conta}, {valor}. Ronc, não gasta isso em skin de joguinho não.', true],
      ['006', 'Amanhã vence {conta}. Mete marcha, parça, senão vira bola de neve com boleto dentro.'],
      ['007', 'Conta vencendo amanhã. Finge que é adulto por um minutinho e abre o app, caralho.'],
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
      ['001', 'Vence HOJE: {conta}, {valor}. Paga, parça, não me faz virar porco de cobrança. KKKKK', true],
      ['002', 'Hoje vence {conta}, {valor}. Paga gostoso que eu fico olhando. rsrsrs', true],
      ['003', 'Vence hoje: {conta}, {valor}. Juro é igual primo folgado: chega e não vai embora.'],
      ['004', '{valor} pra hoje: {conta}. Só saio da tua tela depois de pago, e tô pelado.'],
      ['005', 'Último dia pra {conta}, {valor}: é hoje. Ronc, corre igual quem ouviu o caminhão do gás.', true],
      ['006', 'Hoje vence {conta}. Paga antes do delivery, que prioridade tu não conhece nem de vista.'],
      ['007', 'Conta vencendo hoje e tu moscando. Tá achando que boleto some se ignorar? Some não, porra.'],
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
      ['001', 'Em dois dias, às {hora}: {titulo}. Nem vem inventar dor de barriga, essa é minha.'],
      ['002', 'Dois dias pra {titulo}, às {hora}. Toma um banho caprichado e finge que é rotina. KKKKK', true],
      ['003', 'Em dois dias, {hora}, tem {titulo}. Põe alarme, que galo eu não sou e acordar tu não acorda.'],
      ['004', 'Em dois dias tem {titulo}. Lava a roupa boa, aquela sem mancha de molho.'],
      ['005', 'Anota: {titulo} em dois dias. Tô de olho, e o olho tá vermelhinho. HIHIHI', true],
      ['006', 'Vem aí em dois dias: {titulo}. Ronc, vai ou manda um sósia convincente.', true],
      ['007', 'Compromisso em dois dias. Olha a agenda antes de marcar rolê em cima, agente do caos.'],
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
      ['001', 'Amanhã, {hora}: {titulo}. Não chega lá com cara de quem dormiu no ponto, porra.'],
      ['002', 'É amanhã, {hora}: {titulo}. Dorme cedo, sem rolar vídeo até o olho secar. rsrsrs', true],
      ['003', 'Amanhã às {hora} tem {titulo}. Alarme, parça. Meu ronco não conta como despertador.'],
      ['004', 'Amanhã tem {titulo}. Lava esse sovaco, que eu sinto daqui de dentro do cofre.'],
      ['005', 'Amanhã é {titulo}. Ronc, eu lembrei com cérebro de presunto e tu não.', true],
      ['006', 'É amanhã: {titulo}. Faltou, eu conto pro grupo dos porcos. HIHIHI', true],
      ['007', 'Compromisso amanhã. Abre a agenda antes que dê aquele ruim cinematográfico.'],
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
      ['001', 'Vi {valor} em {loja} {quando}. Mó malote e nem um agrado pro porco. KKKKK', true],
      ['002', 'Sumiu {valor} em {loja}. Explica esse bagulho, ou eu conto pro porco do vizinho.'],
      ['003', '{quando} teve {valor} em {loja}. Ronc, senti o cheiro de pataco queimado.', true],
      ['004', '{valor} em {categoria} {quando}. Gastou com gosto, hein? Vida ganha, né?'],
      ['005', 'Saiu {valor} em {categoria}. Doeu no meu bucho e olha que ele aguenta tudo.'],
      ['006', '{quando} foram {valor} em {categoria}. Eu vi, tava pelado e chapaduxo, mas vi.', false, true],
      ['007', 'Saiu {valor} e tu quietinho. Quietinho demais. Conta essa fofoca agora.'],
      ['008', 'Teve gasto novo e eu tô de olho. Abre o app e se explica pro tribunal do bacon.'],
    ],
  }),
  'push-ritmo': scene('push-ritmo', {
    'sem-filtro': [
      ['001', 'Sobram {restante} pra {dias} até o salário. Modo miojo ativado, véi.'],
      ['002', '{restante} pra {dias}. Não tanka um iFood, aceita e abraça o pão com ovo.'],
      ['003', 'Tem {restante} pra {dias}. Inventa moda não, que a moda agora é pobreza com estilo.'],
      ['004', '{dias} até o salário e {restante} na mão. Hiberna, parça, urso não paga lanche. KKKKK', true],
      ['005', 'Boletim do porco: {restante} pra {dias}. Ronc, tô contando farelo igual pombo.', true],
      ['006', 'Ainda tem {restante} no mês. Gasta devagarinho, bem devagarinho, assim, que eu gosto.'],
      ['007', 'Vem ver quanto sobrou antes de pagar rodada no rolê. Ronc.', true],
    ],
  }),
  'push-meta': scene('push-meta', {
    'sem-filtro': [
      ['001', 'Faltam {restante} pra {meta}. Enfia um pataco aqui, vai, devagar. rsrsrs', true],
      ['002', 'A meta {meta} pede {restante}. Nesse ritmo tu chega lá de bengala, seu mão de alface.'],
      ['003', 'Tua meta {meta} tá a {restante}. No dia que bater eu danço pelado no cofre.'],
      ['004', 'E {meta}, hein? Tá lá igual conversa que tu visualizou e não respondeu.'],
      ['005', 'Sonhei com {meta} e acordei babando. Joga um dindin antes que eu coma a meta. HIHIHI', true],
      ['006', 'Faltam {restante} numa meta tua. Ronc, para de ser mole e alimenta.', true],
      ['007', 'Tua meta tá aqui carente, ouvindo música triste. Manda um malote pra ela.'],
    ],
  }),
  'push-nada': scene('push-nada', {
    'sem-filtro': [
      ['001', 'Tô chapaduxo olhando o teto do cofre. O teto é minha barriga. Que fita. Volta aqui.', false, true],
      ['002', 'Ronc. Sonhei que era um boleto e ninguém me abria. Me abre, parça.', true],
      ['003', 'Nada urgente. Só queria xeretar teu bolso e falar mal das tuas escolhas. rsrsrs', true],
      ['004', 'Abre o app, vai. Prometo que me visto. Mentira, nunca tive calça. HIHIHI', true],
      ['005', 'Bateu a larica e comi uma moeda de chocolate. Era de verdade. Vem cá urgente.', false, true],
      ['006', 'Oinc. Anotou tudo mesmo ou tá me tirando de porco otário, sua peste do caralho?'],
      ['007', 'Tô fritaduxo debatendo com uma moeda se pombo tem emprego. Me salva, parça.'],
    ],
  }),
})
