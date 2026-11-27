// @ts-check
// Falas de AVISO (push) do OINC por cena e tom (07.1-09, D-26, D-34, D-35). Mesma voz aprovada do
// acervo (07.1-REGUA-HUMOR.md): esculacho, o corpo do porco, malicia leve, -uxo, risada em parte delas,
// sempre amarrado ao fato e ao prazo. Todas sao `lote: 4`; as sem filtro foram votadas pelo dono no plano 07.1-14.
//
// 'sem-filtro' existe nas 15 cenas. 'suave' e 'direto' so existem nas cenas de conta e compromisso, que
// nao tinham texto: sao informativas, sem a voz nova e sem palavrao. Nas demais cenas esses dois tons
// continuam no banco de aviso de hoje (D-35), que este arquivo nao copia.
//
// Regras de escrita alem da regua do acervo:
//   - {conta}, {titulo} e {loja} nunca abrem uma frase (o texto entra como foi escrito);
//   - {valor} nas cenas de limite e o total gasto na categoria, e {loja} e a da ultima compra: nenhuma
//     fala pode dizer que o total foi gasto na loja;
//   - {hora} so nas cenas de compromisso (a hora da compra nao e confiavel).
// Ids: cena e tres digitos (sem filtro 0xx, suave 1xx, direto 2xx).

/** Avisos sem filtro mudados depois do voto: pedem voto de novo. */
const PENDENTES = new Set()

/**
 * @typedef {import('./oincLines.js').OincLine} OincLine
 * @typedef {[string, string, boolean?, boolean?]} Row  numero, modelo, risada, fumo
 */

/**
 * @param {string} cena
 * @param {Row[]} rows
 * @param {boolean} pendente tom que nao foi a voto: as linhas levam a marca reescrita
 * @returns {ReadonlyArray<Readonly<OincLine>>}
 */
const list = (cena, rows, pendente) =>
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
        // sem filtro ja foi votado; suave e direto nao vao a voto e o aviso nao filtra a marca
        ...(pendente || PENDENTES.has(`${cena}-${n}`) ? { reescrita: true } : {}),
      }),
    ),
  )

/**
 * @param {string} cena
 * @param {{ 'sem-filtro': Row[], suave?: Row[], direto?: Row[] }} byTone
 * @returns {Readonly<Record<string, ReadonlyArray<Readonly<OincLine>>>>}
 */
const scene = (cena, byTone) =>
  Object.freeze(Object.fromEntries(Object.entries(byTone).map(([tone, rows]) => [tone, list(cena, rows, tone !== 'sem-filtro')])))

/** @type {Readonly<Record<string, Readonly<Record<string, ReadonlyArray<Readonly<OincLine>>>>>>} */
export const OINC_PUSH_LINES = Object.freeze({
  'push-limite-80': scene('push-limite-80', {
    'sem-filtro': [
      ['001', 'PLANTÃO: depois de {loja}, {categoria} chega a {pct}. {valor} de pura sem-vergonhice.'],
      ['002', 'Quem é {loja}? {categoria} em {pct}, {valor}. Tá me trocando por essa merda?'],
      ['003', 'LÁ VEM {categoria}, {pct}, {valor}, cara a cara com o limite... SEGURA, PORRA!'],
      ['004', '{categoria} em {pct}, {valor}. Mó pataco, véi. Para, sua anta. KKKKK', true],
      ['005', 'POV: tu achando que {valor} em {categoria} não é nada, sua toupeira.'],
      ['006', 'Depois de {loja}, um limite no talo: {valor}. Para ou eu mordo tua bunda.'],
      ['007', 'Limite quase estourando, {valor}. Beleza. Calmo. AAAAA PUTA QUE PARIU.'],
      ['008', 'Teu limite tá por um fiozuxo. Abre essa porra de app antes que dê merda.'],
      ['009', '{categoria} em {pct}, {valor}. Mais um rolê e a janta é bolacha água e sal sem a água, pamonha.'],
    ],
  }),
  'push-limite-100': scene('push-limite-100', {
    'sem-filtro': [
      ['001', 'PLANTÃO: {loja} mata {categoria}. {valor}, {pct}. Porco exige justiça, caralho.'],
      ['002', '{categoria} furou depois de {loja}: {valor}. Quem é essa loja pra ti? FALA, PESTE!'],
      ['003', '{categoria}: {valor}, {pct}. Beleza. EU VOU ME CAGAR ATÉ MORREEEEER.'],
      ['004', 'É GOOOL CONTRA! {categoria} estourou em {valor}. Que jogador de merda, hein.'],
      ['005', '{valor} em {categoria}. Para ou eu chacino tua mãe, cabeça de bagre.'],
      ['006', 'Depois de {loja}, limite morto: {valor}. Perdeu toda a aura, seu poço de merda.'],
      ['007', 'Limite estourado, {valor}. F no chat pro teu malotuxo, desgraça. Ronc.', true],
      ['008', 'Limite estourado. Skill issue do caralho, capivara. Vem ver essa vergonha.'],
      ['009', '{categoria} estourou: {valor}. Meteu tudo sem dó e nem pediu licença pro porco. KKKKK', true],
    ],
  }),
  'push-fatura-d2': scene('push-fatura-d2', {
    'sem-filtro': [
      ['001', 'Fatura de {valor} em dois dias. Paga ou eu faço churrasco das tuas cuecas.'],
      ['002', '{valor} de fatura em dois dias. Esconde o malotuxo, sua pamonha.'],
      ['003', 'PLANTÃO: fatura de {valor} cerca residência. Faltam dois dias, família.'],
      ['004', 'Coach: {valor} em dois dias. Todo mundo tem as mesmas 24h, é só querer.'],
      ['005', 'Quem é essa fatura de {valor}? Chega em dois dias e vai dormir na tua cama?'],
      ['006', 'Faltam dois dias pra fatura. Muda de nome não, que eu te acho, peste. HIHIHI', true],
      ['007', '{valor} de fatura em dois dias. Paga essa porra ou eu cago no teu travesseiro.'],
    ],
  }),
  'push-fatura-d1': scene('push-fatura-d1', {
    'sem-filtro': [
      ['001', 'Amanhã: fatura de {valor}. Paga ou eu chacino tua mãe com requinte.'],
      ['002', '{valor} amanhã. Beleza. Tô ótimo. EU VOU EXPLODIR E VOAR BACON NESSA PORRA.'],
      ['003', 'LÁ VEM A FATURA, {valor}, chuta amanhã! Cadê o goleiro, caralho?'],
      ['004', '{valor} de fatura amanhã. Tô peladuxo, tiltado e armado de casco. Não testa.'],
      ['005', 'PLANTÃO: {valor} vencem amanhã. Porco é visto roendo a própria pata.'],
      ['006', 'A fatura vence amanhã. Paga essa porra e dorme igual neném chapado.', false, true],
      ['007', 'Amanhã: {valor} de fatura. Tá achando que é erva, que sobe e some? Paga, caralho.'],
    ],
  }),
  'push-fatura-d0': scene('push-fatura-d0', {
    'sem-filtro': [
      ['001', 'HOJE: fatura de {valor}. PAGA AGORA ou o porco aqui toca fogo no parquinho.'],
      ['002', 'É hoje: {valor}. Paga ou eu como teus controles remotos, pé de chinelo.'],
      ['003', 'Fatura de {valor} vence hoje. Enfia o pagamento sem dó, vai, gostoso. rsrsrs', true],
      ['004', 'Hoje, {valor} de fatura. VENDE-SE alma de caloteiro, aceito vale-coxinha.'],
      ['005', 'Fatura hoje, {valor}. Os juros vão te comer sem beijo, corre, desgraça. Ronc.', true],
      ['006', 'A fatura vence hoje e tu vendo vídeo de capivara. Paga, caralho, paga.'],
      ['007', 'Hoje: {valor} de fatura. Enfia o pagamento inteiro, nada de só a pontinha. rsrsrs', true],
    ],
  }),
  'push-conta-d2': scene('push-conta-d2', {
    'sem-filtro': [
      ['001', 'Em dois dias: {conta}, {valor}. Solta o patacuxo ou eu começo a latir, porra.'],
      ['002', 'Coach: {conta}, {valor}, em dois dias. Trabalhe enquanto os juros dormem.'],
      ['003', 'PLANTÃO: {conta} de {valor} ronda a vizinhança. Faltam dois dias, família.'],
      ['004', 'Quem é {conta}? {valor} em dois dias e tu nem me apresentou, safadeza?'],
      ['005', 'Boletuxo em dois dias: {conta}, {valor}. Foge não, marmota, ele sabe onde tu caga.'],
      ['006', 'Faltam dois dias pra {conta}. Mosca não, anta, os juros tão de olho no teu rabo.'],
      ['007', 'Dois dias pra uma conta vencer. Abre o app antes que eu cague na geladeira.'],
      ['008', 'Em dois dias, {conta}, {valor}. Guarda antes que tu queime tudo no pod, chaminezuxo.', false, true],
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
      ['001', '{valor} de {conta} vence amanhã. Paga ou eu durmo de bunda na tua cara.'],
      ['002', 'Amanhã: {conta}, {valor}. POV: tu jurando que vai lembrar. Vai porra nenhuma.'],
      ['003', 'Amanhã vence {valor} de {conta}. Paga, cabeça de bagre, ou os juros te comem de quatro.'],
      ['004', '{valor} amanhã: {conta}. Beleza. Calmo. VOU RASPAR O COFRE COM O CASCO.'],
      ['005', 'Amanhã é {conta}, {valor}. Gastou em skin? Chacino tua mãe, songamonga.'],
      ['006', 'Amanhã vence {conta}. VENDE-SE memória de ameba, troco num miojo vencido.'],
      ['007', 'Conta vencendo amanhã. Resolve, ou eu posto teu saldo no grupo da família.'],
      ['008', 'Amanhã tem {conta}, {valor}. Paga ou fica sem, olhando pra minha bunda. KKKKK', true],
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
      ['001', 'HOJE: {conta}, {valor}. Paga ou eu chacino tua mãe, sua anta.'],
      ['002', 'Hoje vence {conta}, {valor}. Todo mundo tem as mesmas 24h, é só querer.'],
      ['003', 'PLANTÃO: {conta}, {valor}, vence hoje. Suspeito em choque corre se cagando na avenida.'],
      ['004', 'Pra hoje, {conta}: {valor}. Tu: depois. Eu: depois é o caralho de asa.'],
      ['005', 'É hoje: {conta}, {valor}. Os juros tão atrás da cortina, de pau na mão. Corre.'],
      ['006', 'Hoje vence {conta}. Delivery antes disso e eu viro um porco assassino.'],
      ['007', 'Conta vencendo hoje. Beleza. Tá tudo bem. PAGA ESSA DESGRAÇAAAA.'],
      ['008', 'Hoje: {conta}, {valor}. Sem pagar tu vai morar no meu cofre, e eu peido dormindo.'],
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
      ['001', 'Anota: {titulo}, em dois dias, {hora}. Falta e eu invado teu sonho vestido de boleto.'],
      ['002', 'PLANTÃO: {titulo} em dois dias, {hora}. Alvo segue sem tomar banho.'],
      ['003', 'Dois dias pra {titulo}, {hora}. Quem vai estar lá? Por que eu não fui chamado?'],
      ['004', 'Em dois dias tem {titulo}. Não me inventa caganeira na hora, capivara.'],
      ['005', 'Anota: {titulo} em dois dias. Eles não querem que tu vá. Vai só de raiva.'],
      ['006', 'Dois dias pra {titulo}. Faltar é skill issue do caralho, marmota.'],
      ['007', 'Compromisso em dois dias. Olha a agenda, cabeça de vento, ou eu marco em cima.'],
      ['008', 'Daqui a dois dias: {titulo}, {hora}. Vai sóbrio, chapaduxo, que dá pra sentir o cheiro.', false, true],
      ['009', '{titulo} daqui a {dias}. Anotei no rabicó pra te cobrar.'],
      ['010', 'Tem {titulo} em {dias}. Já pode começar a inventar desculpa, HIHIHI.', true],
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
      ['001', 'Amanhã, {hora}: {titulo}. Se faltar eu como teu sapato direito. Só o direito.'],
      ['002', 'É amanhã, {hora}: {titulo}. Dorme cedo, sem putaria até o olho secar. rsrsrs', true],
      ['003', 'É amanhã: {titulo}, {hora}. Bota o despertador, que tu e o relógio não se falam, anta.'],
      ['004', 'Amanhã tem {titulo}. Toma banho ou eu ligo a mangueira em ti, fedor.'],
      ['005', 'É amanhã: {titulo}. POV: tu inventando desculpa às pressas. Nem tenta, peste.'],
      ['006', 'Amanhã é {titulo}? E EU? Fico aqui de bunda sozinha no cofre? Vai então.'],
      ['007', 'Compromisso amanhã. Abre a agenda antes que dê merda cinematográfica.'],
      ['008', 'Amanhã, {hora}: {titulo}. Hoje nada de larica e farra até tarde, seu zé ruela do rolê.', false, true],
      ['009', 'Amanhã: {titulo}. Separa uma roupa sem mancha de molho, criatura.'],
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
  'push-compromisso-d0': scene('push-compromisso-d0', {
    'sem-filtro': [
      ['001', 'Hoje tem {titulo}, sua anta. Levanta essa bunduxa do sofá.'],
      ['002', '{titulo} é HOJE. Não esquece, que eu não sou tua secretária, porra.'],
    ],
    suave: [
      ['101', 'Hoje, às {hora}, tem {titulo}. Vale se organizar com calma.'],
      ['102', 'Um lembrete com carinho: {titulo} é hoje.'],
      ['103', 'Tem compromisso hoje. Dá uma olhada na agenda quando puder.'],
    ],
    direto: [
      ['201', 'Hoje, às {hora}: {titulo}.'],
      ['202', 'Compromisso hoje: {titulo}.'],
      ['203', 'Há um compromisso hoje. Confira a agenda.'],
    ],
  }),
  'push-compra': scene('push-compra', {
    'sem-filtro': [
      ['001', 'Quem é {loja}? {valor} {quando}. Há quanto tempo essa putaria tá rolando?'],
      ['002', 'PLANTÃO: criatura torra {valor} com merda em {loja}. Baleia reclama de ser gorduxo ainda.'],
      ['003', '{quando}: {valor} em {loja}. LÁ VEM O CARTÃO, passou o juízo, É GOL DA FATURA!'],
      ['004', '{valor} em {categoria} {quando}. No meu tempo isso comprava um terreno, porra.'],
      ['005', 'Tu: foi baratinho. Eu: {valor} em {categoria}. Baratinhuxo é teu cu.'],
      ['006', '{quando}: {valor} em {categoria}. Eu vi pelado e chapaduxo, mas vi. HIHIHI', true, true],
      ['007', '{valor} no cartão depois de jurar que ia parar? EU VOU COMER ESSE CARTÃO COM FAROFA.'],
      ['008', 'Teve gasto novo. Quem é? Quanto foi? É mais gostoso que eu? ABRE O APP.'],
      ['009', 'Mais {valor}. Slk, tu passa o cartão com um tesão que eu nunca recebi. HIHIHI', true],
      ['010', '{valor} em {categoria}? Fumou o juízo junto, foi? Me passa um pouco disso aí.'],
    ],
  }),
  'push-ritmo': scene('push-ritmo', {
    'sem-filtro': [
      ['001', '{restante} pra {dias}. Modo miojuxo ativado, véi, sem aura e sem carne.'],
      ['002', 'Coach: {restante} pra {dias}. Saia da zona de conforto: janta pão dormido, guerreiro.'],
      ['003', 'VENDE-SE dignidade. Sobrou {restante} pra {dias}. Aceito até fiado.'],
      ['004', 'PLANTÃO: {dias} pro salário, {restante} na mão. Vítima cheira o próprio boleto. KKKKK', true],
      ['005', '{restante} pra {dias}. Beleza. Calmo. VOU LAMBER EMBALAGEM ATÉ O SALÁRIO. Ronc.', true],
      ['006', 'Ainda tem {restante}. Torra tudo e eu chacino tua mãe, bem devagarinhuxo.'],
      ['007', 'Vem ver quanto sobrou antes de pagar rodada, pé de chinelo, que eu tô contando farelo. Ronc.', true],
      ['008', '{dias} pro salário e {restante}. Vai lamber panela, que eu já lambi o fundo do cofre. Ronc.', true],
      ['009', '{restante} pra {dias}. Dá pra um miojo ou um beck, tu escolhe. Escolhe o beck, porra.'],
    ],
  }),
  'push-meta': scene('push-meta', {
    'sem-filtro': [
      ['001', '{restante} pra {meta}. Enfia na minha fenda ou eu cago na tua planta, mula. rsrsrs', true],
      ['002', '{meta} ainda pede {restante} e tu no delivery. Eu aqui chupando moeda, cuzão.'],
      ['003', 'Faltam {restante} pra {meta}. Nesse ritmo tu chega lá de bengala, e a bengala fiada.'],
      ['004', 'E {meta}? Tu começou animado e broxou no meio, né? Levanta isso aí. HIHIHI', true],
      ['005', 'Dei um tapa no pod e vi {meta} me chamando. Joga um dindinzuxo antes que passe a onda.', false, true],
      ['006', 'Slk, {restante} pra bater a meta e tu travou. F no chat, pamonha.'],
      ['007', 'Tu: um dia eu chego lá. Eu: como, rolando, baleia? Abre o app. Ronc.', true],
      ['008', 'Bota só a cabecinha em {meta} hoje. Do porco, mente suja. Um dinheirinhuxo já serve.'],
    ],
  }),
  'push-nada': scene('push-nada', {
    'sem-filtro': [
      ['001', 'Tô pelado, carentuxo e há horas olhando pra tela. Abre essa porra de app, mula.'],
      ['002', 'Fumei um negocinho aqui no cofre e tô vendo teu saldo dançar. Vem ver comigo, chapaduxo.', false, true],
      ['003', 'Onde tu tava? Que app filho da puta tá te dando atenção? Eu faço tudo e mais gostoso.'],
      ['004', 'Vem cá meter o dedo em mim. Na tela, mente suja. Tô precisando. huehue', true],
      ['005', 'Tô chapaduxo olhando o teto do cofre. O teto é minha bunda. Que fita. Volta.', false, true],
      ['006', 'Abre o app ou eu chacino tua casa toda, peste. Beijo no focinho. HIHIHI', true],
      ['007', 'Papo reto, tu sumiu e eu perdi toda a aura. Volta antes que eu vire linguiça.'],
      ['008', 'Tiltei de saudade. Fumei, chorei e comi um boleto. Vem cuidar de mim, desgraça.'],
    ],
  }),
})
