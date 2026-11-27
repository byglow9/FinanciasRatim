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
      ['001', 'PLANTÃO: depois de {loja}, {categoria} chega a {pct}. {valor} de pura sem-vergonhice.'],
      ['002', 'Quem é {loja}? {categoria} em {pct}, {valor}. Tá me trocando por isso?'],
      ['003', 'LÁ VEM {categoria}, {pct}, {valor}, cara a cara com o limite... SEGURA, PORRA!'],
      ['004', 'Horóscopo: {categoria} em {pct}, {valor}. Os astros mandam parar, anta.'],
      ['005', 'POV: tu achando que {valor} em {categoria} não é nada. É quase tudo, mula.'],
      ['006', 'Depois de {loja}, um limite no talo: {valor}. Amorzinho, para ou eu mordo.'],
      ['007', 'Um limite quase estourando, {valor}. Beleza. Calmo. AAAAA SOCORRO.'],
      ['008', 'Eles não querem que tu saiba, mas teu limite tá por um fio. Abre o app.'],
    ],
  }),
  'push-limite-100': scene('push-limite-100', {
    'sem-filtro': [
      ['001', 'PLANTÃO: {loja} mata {categoria}. {valor}, {pct}. Porco exige justiça.'],
      ['002', '{categoria} furou depois de {loja}: {valor}. Quem é essa loja pra ti? FALA!'],
      ['003', '{categoria}: {valor}, {pct}. Beleza. EU VOU ME CAGAR ATÉ MORREEEEER.'],
      ['004', 'É GOOOL CONTRA! {categoria} estourou em {valor}. Que jogador de merda.'],
      ['005', '{valor} em {categoria}. Para ou eu chacino tua casa começando pela geladeira.'],
      ['006', 'Depois de {loja}, limite morto: {valor}. No meu tempo isso dava cadeia.'],
      ['007', 'VENDE-SE porco traumatizado. Limite estourado, {valor}. Aceito um pastel.'],
      ['008', 'Limite estourado. Coach: todo mundo tem limite, mas só tu tem esse talento.'],
    ],
  }),
  'push-fatura-d2': scene('push-fatura-d2', {
    'sem-filtro': [
      ['001', 'Fatura de {valor} em dois dias. Paga ou eu faço churrasco das tuas almofadas.'],
      ['002', 'Horóscopo: em dois dias, {valor} de fatura. Mercúrio não vai pagar, mané.'],
      ['003', 'PLANTÃO: fatura de {valor} cerca residência. Faltam dois dias.'],
      ['004', 'Coach: {valor} em dois dias. Todo mundo tem as mesmas 24h, é só querer.'],
      ['005', 'Quem é essa fatura de {valor}? Chega em dois dias e vai dormir aí?'],
      ['006', 'Faltam dois dias pra fatura. Eles não querem que tu saiba, mas eu sei.'],
    ],
  }),
  'push-fatura-d1': scene('push-fatura-d1', {
    'sem-filtro': [
      ['001', 'Amanhã: fatura de {valor}. Paga ou eu chacino teu sofá com requinte.'],
      ['002', '{valor} amanhã. Beleza. Tô ótimo. EU VOU EXPLODIR E VOAR BACON.'],
      ['003', 'LÁ VEM A FATURA, {valor}, chuta amanhã! Cadê o goleiro, porra?'],
      ['004', 'POV: fatura de {valor} amanhã e tu pesquisando tênis. Larga isso.'],
      ['005', 'PLANTÃO: {valor} vencem amanhã. Porco é visto roendo a própria pata.'],
      ['006', 'A fatura vence amanhã. No meu tempo caloteiro virava linguiça.'],
    ],
  }),
  'push-fatura-d0': scene('push-fatura-d0', {
    'sem-filtro': [
      ['001', 'HOJE: fatura de {valor}. PAGA AGORA ou o porco aqui toca fogo no parquinho.'],
      ['002', 'É hoje: {valor}. Amorzinho, paga ou eu como tua família de controles remotos.'],
      ['003', 'Horóscopo de hoje: {valor} de fatura. Foge não, os astros têm teu endereço.'],
      ['004', 'Hoje, {valor} de fatura. VENDE-SE alma de caloteiro, aceito rato no espetinho.'],
      ['005', 'Fatura hoje, {valor}. Coach: o juro nunca dorme. Seja o juro. Mentira, paga.'],
      ['006', 'A fatura vence hoje e tu aí rindo de vídeo. Ri não. Paga, caralho.'],
    ],
  }),
  'push-conta-d2': scene('push-conta-d2', {
    'sem-filtro': [
      ['001', 'Em dois dias: {conta}, {valor}. Paga ou eu chacino teu chinelo.'],
      ['002', 'Dois dias pra {conta}, {valor}. Coach: boleto é só uma oportunidade que cobra.'],
      ['003', 'PLANTÃO: {conta} de {valor} ronda a vizinhança. Faltam dois dias.'],
      ['004', 'Quem é {conta}? {valor} em dois dias e tu nem me apresentou?'],
      ['005', 'Horóscopo: {conta}, {valor}, em dois dias. Ascendente em calote não.'],
      ['006', 'Faltam dois dias pra {conta}. Eles querem teu atraso. Não dá esse gostinho.'],
      ['007', 'Dois dias pra uma conta vencer. Abre o app antes que eu abra tua geladeira.'],
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
      ['001', '{valor} de {conta} vence amanhã. Paga ou eu durmo em cima da tua cara.'],
      ['002', 'Amanhã: {conta}, {valor}. POV: tu jurando que vai lembrar. Vai porra nenhuma.'],
      ['003', 'LÁ VEM {conta}, {valor}, é amanhã, o juro tá aquecendo no banco!'],
      ['004', '{valor} amanhã: {conta}. Beleza. Calmo. VOU RASPAR O COFRE COM O CASCO.'],
      ['005', 'Amanhã é {conta}, {valor}. No meu tempo a gente pagava e nem fazia drama.'],
      ['006', 'Amanhã vence {conta}. VENDE-SE memória fraca, aceito um pastel.'],
      ['007', 'Conta vencendo amanhã. Resolve, ou eu conto teu saldo no grupo da família.'],
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
      ['001', 'HOJE: {conta}, {valor}. Paga ou eu chacino tua casa inteira, com carinho.'],
      ['002', 'Hoje vence {conta}, {valor}. Todo mundo tem as mesmas 24h, é só querer.'],
      ['003', 'PLANTÃO: {conta} de {valor} vence hoje. Suspeito finge que não viu.'],
      ['004', '{valor} pra hoje: {conta}. Tu: depois. Eu: depois é o caralho.'],
      ['005', 'É hoje: {conta}, {valor}. O juro tá te vigiando atrás da cortina. Corre.'],
      ['006', 'Hoje vence {conta}. Horóscopo: paga ou Saturno senta na tua cara.'],
      ['007', 'Conta vencendo hoje. Beleza. Tá tudo bem. PAGA ESSA DESGRAÇAAAA.'],
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
      ['001', 'Em dois dias, {hora}: {titulo}. Falta e eu invado teu sonho fantasiado de boleto.'],
      ['002', 'PLANTÃO: {titulo} em dois dias, {hora}. Alvo ainda não separou a roupa.'],
      ['003', 'Dois dias: {titulo}, {hora}. Quem vai estar lá? Por que eu não fui convidado?'],
      ['004', 'Horóscopo: {titulo} em dois dias. Os astros veem preguiça. Toma banho.'],
      ['005', 'Anota: {titulo} em dois dias. Eles não querem que tu vá. Vai de raiva.'],
      ['006', 'Dois dias pra {titulo}. Coach: comparecer já é vencer na vida, guerreiro.'],
      ['007', 'Compromisso em dois dias. Olha a agenda, ou eu marco outro por cima.'],
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
      ['002', 'Horóscopo: amanhã, {hora}, {titulo}. Ascendente em atraso. Põe alarme.'],
      ['003', 'PLANTÃO: {titulo} amanhã, {hora}. Dono do porco promete dormir cedo. Mentira.'],
      ['004', 'Amanhã tem {titulo}. Toma banho ou eu ligo a mangueira em ti.'],
      ['005', 'É amanhã: {titulo}. POV: tu inventando desculpa às pressas. Nem tenta.'],
      ['006', 'Amanhã é {titulo}? E EU? Fico aqui sozinho, né? Tudo bem. Vai.'],
      ['007', 'Compromisso amanhã. Abre a agenda antes que dê merda cinematográfica.'],
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
      ['001', 'Quem é {loja}? {valor} {quando}. Há quanto tempo isso tá rolando?'],
      ['002', 'PLANTÃO: criatura é vista torrando {valor} com merda em {loja}. Baleia reclama de gorduxo.'],
      ['003', '{quando}: {valor} em {loja}. LÁ VEM O CARTÃO, passou o juízo, É GOL DA FATURA!'],
      ['004', '{valor} em {categoria} {quando}. No meu tempo isso comprava um terreno.'],
      ['005', 'Tu: foi baratinho. Eu: {valor} em {categoria}. Baratinho é teu juízo.'],
      ['006', '{quando}: {valor} em {categoria}. Eles gravaram. Eu também. Paga meu silêncio.'],
      ['007', '{valor}. Beleza. Tô calmo. EU VOU COMER O CARTÃO COM FAROFA.'],
      ['008', 'Teve gasto novo. Quem é? Quanto foi? Ela é mais bonita que eu? Abre o app.'],
    ],
  }),
  'push-ritmo': scene('push-ritmo', {
    'sem-filtro': [
      ['001', 'Horóscopo: {restante} pra {dias}. Signo liso com ascendente em miojo.'],
      ['002', 'Coach: {restante} pra {dias}. Fome é só falta de mentalidade, guerreiro.'],
      ['003', 'VENDE-SE dignidade. Sobrou {restante} pra {dias}. Aceito rato no espetinho.'],
      ['004', 'PLANTÃO: {dias} pro salário, {restante} na mão. Vítima cheira o próprio boleto.'],
      ['005', '{restante} pra {dias}. Beleza. Calmo. VOU LAMBER EMBALAGEM ATÉ O SALÁRIO.'],
      ['006', 'Ainda tem {restante}. Torra tudo e eu chacino teu estoque de bolacha.'],
      ['007', 'Eles não querem que tu veja quanto sobrou. Abre o app e desafia o sistema.'],
    ],
  }),
  'push-meta': scene('push-meta', {
    'sem-filtro': [
      ['001', '{restante} pra {meta}. Deposita ou eu chacino tua planta de estimação.'],
      ['002', 'PLANTÃO: {meta} ainda espera {restante}. Responsável é visto no delivery.'],
      ['003', 'Horóscopo: {meta}, faltam {restante}. Os astros riram da tua cara.'],
      ['004', 'E {meta}? Já esqueceu? Quem é a meta nova? Fala o nome dela.'],
      ['005', 'Coach: sonha com {meta}. Sonhar é de graça, o resto tu se vira. HIHIHI', true],
      ['006', 'VENDE-SE meta usada, faltam {restante}. Aceito até rato no espetinho.'],
      ['007', 'Tu: um dia eu chego lá. Eu: de que jeito, rolando? Abre o app.'],
    ],
  }),
  'push-nada': scene('push-nada', {
    'sem-filtro': [
      ['001', 'PLANTÃO DO BACON: porco abandonado ameaça cantar até tu voltar.'],
      ['002', 'Eles não querem que tu abra esse app. Abre. Rápido. Antes que me desliguem.'],
      ['003', 'Onde tu tava? Com quem? Que app é esse que tá te dando atenção?'],
      ['004', 'VENDE-SE um porco. Motivo: dono sumido. Aceito até rato no espetinho.'],
      ['005', 'Horóscopo: tu ia abrir o app agora. Se não abrir, miojo pra sempre.'],
      ['006', 'Amorzinho, abre o app ou eu chacino tua casa toda. Beijo no coração.'],
      ['007', 'No meu tempo ninguém largava porco no vácuo. Hoje é essa putaria.'],
    ],
  }),
})
