// @ts-check
// Banco de frases de AVISO (push) do Vintem (D-05, D-19). O texto da tela de
// bloqueio vem daqui, por tom, e nunca da IA. Dado puro: nenhuma frase tem digito,
// moeda, loja, valor nem nome de pessoa; o unico encaixe permitido e {categoria}
// nas duas situacoes de limite (D-19). Banco separado das 20 situacoes da Fase 4
// (a lista SITUATIONS e o seu teste ficam intactos).
//
// GUIA DE ESTILO: o mesmo de vintemPhrases.js. Voz do Vintem falando com a pessoa,
// curto, coloquial, com acento. Suave acolhe, direto so informa, sem-filtro zoa e
// solta palavrao, sempre xingando o gasto e o habito e nunca quem a pessoa e.
// Ids: prefixo da situacao, tom (su, di, sf) e numero de dois digitos.
// O acaso vem do hash do id do evento (nada de acaso nativo nem relogio).
// Escritas a mao; o dono revisa e corta no gate de producao (plano 07-18).
import { TONES } from './vintemPhrases.js'
import { pick, buildSlots } from './phrasePicker.js'
import { mulberry32 } from './vintemSpring.js'

/** As quatro situacoes de aviso. */
export const PUSH_SITUATIONS = Object.freeze([
  'push-limite-80', 'push-limite-100', 'push-fatura', 'push-espontanea',
])

/**
 * @typedef {{ prefix: string, kind: 'reacao' | 'contexto', slots: ReadonlyArray<string>,
 *   maxLen: number, edgy: boolean }} PushMeta
 */

/**
 * @param {string} prefix
 * @param {string[]} slots
 * @returns {PushMeta}
 */
function meta(prefix, slots) {
  return Object.freeze({
    prefix, kind: 'contexto', slots: Object.freeze(slots), maxLen: 110, edgy: true,
  })
}

/** Metadados por situacao: so as de limite aceitam {categoria} (D-19). */
export const PUSH_META = Object.freeze({
  'push-limite-80': meta('p8', ['categoria']),
  'push-limite-100': meta('p1', ['categoria']),
  'push-fatura': meta('pf', []),
  'push-espontanea': meta('pe', []),
})

/** Titulo fixo da notificacao. */
export const PUSH_TITLE = 'OINC'

/** @param {Array<[string, string]>} rows @returns {ReadonlyArray<{ id: string, t: string }>} */
const list = (rows) => Object.freeze(rows.map(([id, t]) => Object.freeze({ id, t })))

/** @type {Readonly<Record<string, Record<string, ReadonlyArray<{ id: string, t: string }>>>>} */
export const PUSH_PHRASES = Object.freeze({
  // Chegou perto do limite da categoria (sem numero: nada de percentual nem valor).
  'push-limite-80': Object.freeze({
    suave: list([
      ['p8-su-01', 'Estamos chegando perto do limite de {categoria}. Com calma ainda dá pra fechar o mês bem.'],
      ['p8-su-02', '{categoria} está quase no teto. Um respiro agora ajuda o resto do mês.'],
      ['p8-su-03', 'O limite de {categoria} está logo ali. Vamos segurar um pouquinho?'],
      ['p8-su-04', 'Quase lá no limite de {categoria}, mas ainda dá tempo de ajustar o ritmo.'],
      ['p8-su-05', 'Passando só pra avisar com carinho: {categoria} está perto do limite.'],
      ['p8-su-06', 'Tem categoria chegando perto do limite. Dá uma olhadinha no app quando puder.'],
      ['p8-su-07', 'Uma das suas categorias está quase no teto. Sem pressa, mas vale ir com calma.'],
    ]),
    direto: list([
      ['p8-di-01', '{categoria} está perto do limite.'],
      ['p8-di-02', 'O limite de {categoria} está próximo.'],
      ['p8-di-03', 'Atenção: {categoria} chegou perto do teto do mês.'],
      ['p8-di-04', '{categoria} entrou na zona de alerta do limite.'],
      ['p8-di-05', 'Falta pouco para o limite de {categoria}.'],
      ['p8-di-06', 'Uma categoria está perto do limite. Abra o app para ver qual.'],
      ['p8-di-07', 'Você está perto do limite em uma categoria.'],
    ]),
    'sem-filtro': list([
      ['p8-sf-01', 'Porra, {categoria} já está quase no limite. Segura essa mão.'],
      ['p8-sf-02', 'Caralho, {categoria} está colada no limite. Respira antes de gastar mais.'],
      ['p8-sf-03', 'Que merda de ritmo em {categoria}, o limite já está na cara. Freia aí.'],
      ['p8-sf-04', '{categoria} perto do teto. Mais um deslize e o estouro vem cobrar, hein.'],
      ['p8-sf-05', 'O limite de {categoria} está logo ali e o seu dedo ainda coça. Segura.'],
      ['p8-sf-06', 'Tem categoria colada no limite, porra. Abre o app e vê qual antes de piorar.'],
      ['p8-sf-07', 'Já tem limite quase no fim e você nem percebeu. Dá uma olhada, caralho.'],
    ]),
  }),
  // Passou do limite da categoria.
  'push-limite-100': Object.freeze({
    suave: list([
      ['p1-su-01', '{categoria} passou do limite, mas acontece. Dá pra segurar o resto do mês.'],
      ['p1-su-02', 'O limite de {categoria} ficou pra trás. Sem drama, agora é recomeçar com calma.'],
      ['p1-su-03', '{categoria} escapou do combinado. Respira, dá pra compensar nos outros gastos.'],
      ['p1-su-04', 'Passamos do limite de {categoria}. Acontece com todo mundo, segue com cuidado.'],
      ['p1-su-05', '{categoria} fugiu um pouquinho do combinado. Vamos segurar daqui pra frente.'],
      ['p1-su-06', 'Uma categoria passou do limite. Tudo bem, dá pra ajustar o resto do mês.'],
      ['p1-su-07', 'O limite de uma categoria ficou pra trás. Respira e dá uma olhada no app.'],
    ]),
    direto: list([
      ['p1-di-01', '{categoria} passou do limite.'],
      ['p1-di-02', 'Limite de {categoria} estourou.'],
      ['p1-di-03', 'O teto de {categoria} foi ultrapassado.'],
      ['p1-di-04', '{categoria} ultrapassou o limite do mês.'],
      ['p1-di-05', 'Você passou do limite de {categoria}.'],
      ['p1-di-06', 'Uma categoria passou do limite. Abra o app para ver qual.'],
      ['p1-di-07', 'Um limite foi ultrapassado. Veja os detalhes no app.'],
    ]),
    'sem-filtro': list([
      ['p1-sf-01', '{categoria} estourou o limite, porra. Aí o mês vai ficar bonito, hein.'],
      ['p1-sf-02', 'Caralho, passou do limite de {categoria}. Esse cartão está pegando fogo.'],
      ['p1-sf-03', 'Estourou {categoria}. Que merda, hein, o limite era pra respeitar.'],
      ['p1-sf-04', 'Limite de {categoria} foi pro saco. Bosta de controle, agora aguenta o resto do mês.'],
      ['p1-sf-05', 'Fodeu: {categoria} passou do teto e o mês ainda nem acabou.'],
      ['p1-sf-06', '{categoria} ultrapassou o limite. Desgraça de gasto, e ainda tem mês pela frente.'],
      ['p1-sf-07', 'Passou de um limite, porra. Abre o app e vê onde foi o rombo.'],
      ['p1-sf-08', 'Estourou uma categoria e você nem piscou. Caralho, vê isso no app.'],
    ]),
  }),
  // Fatura do cartao perto de vencer (sem valor e sem data).
  'push-fatura': Object.freeze({
    suave: list([
      ['pf-su-01', 'Tem uma fatura do cartão perto de vencer. Vale dar uma olhada com calma.'],
      ['pf-su-02', 'Passando pra lembrar com carinho: a fatura do cartão está chegando no vencimento.'],
      ['pf-su-03', 'A fatura do cartão vence logo. Se organizar agora, fica tudo tranquilo.'],
      ['pf-su-04', 'Uma fatura está quase vencendo. Dá tempo de se preparar sem correria.'],
      ['pf-su-05', 'O vencimento da fatura está chegando. Respira, dá pra resolver com calma.'],
      ['pf-su-06', 'Fatura do cartão se aproximando. Uma olhadinha no app já ajuda.'],
    ]),
    direto: list([
      ['pf-di-01', 'Fatura do cartão perto de vencer.'],
      ['pf-di-02', 'Uma fatura vence em breve. Confira no app.'],
      ['pf-di-03', 'O vencimento da fatura está próximo.'],
      ['pf-di-04', 'Fatura do cartão com vencimento chegando.'],
      ['pf-di-05', 'Sua fatura está perto do vencimento. Veja no app.'],
      ['pf-di-06', 'Há uma fatura a pagar nos próximos dias.'],
    ]),
    'sem-filtro': list([
      ['pf-sf-01', 'A fatura do cartão está pra vencer, porra. Paga antes de virar problema.'],
      ['pf-sf-02', 'Caralho, o vencimento da fatura está chegando. Não deixa pra última hora.'],
      ['pf-sf-03', 'Fatura quase vencendo e tudo na maior calma. Que merda seria atrasar, hein.'],
      ['pf-sf-04', 'O cartão vai cobrar logo. Dá uma olhada na fatura antes que a coisa fique feia.'],
      ['pf-sf-05', 'Fatura chegando no vencimento. Porra, não vai esquecer de pagar.'],
      ['pf-sf-06', 'Atrasar fatura é dar de bandeja o dinheiro pros juros. Olha o vencimento, caralho.'],
    ]),
  }),
  // Cutucada do Vintem sem assunto financeiro especifico.
  'push-espontanea': Object.freeze({
    suave: list([
      ['pe-su-01', 'Passei só pra dizer oi. Está tudo bem por aí?'],
      ['pe-su-02', 'OINC por aqui. Quando der, dá uma espiada no mês, sem pressa.'],
      ['pe-su-03', 'Um cafuné do seu porquinho: você está indo bem.'],
      ['pe-su-04', 'Lembrando que cada gasto anotado é um passo pra um mês mais leve.'],
      ['pe-su-05', 'Respira fundo, o mês é longo e dá pra fazer dar certo.'],
      ['pe-su-06', 'Seu porquinho está de olho e torcendo por você.'],
    ]),
    direto: list([
      ['pe-di-01', 'Abra o app e confira como está o mês.'],
      ['pe-di-02', 'OINC avisa: o app está esperando você.'],
      ['pe-di-03', 'Já faz um tempo. Vale conferir seus lançamentos.'],
      ['pe-di-04', 'Passe no app para ver como está o mês.'],
      ['pe-di-05', 'Seus lançamentos recentes merecem uma conferida.'],
      ['pe-di-06', 'Hora de dar uma olhada no mês pelo app.'],
    ]),
    'sem-filtro': list([
      ['pe-sf-01', 'O porquinho está de olho, caralho. Vem ver como anda esse mês.'],
      ['pe-sf-02', 'Sumiu, é? Abre o app e vê o que a sua carteira andou aprontando, porra.'],
      ['pe-sf-03', 'Que merda ficar no escuro: abre o app e vê como está o mês.'],
      ['pe-sf-04', 'Seu porquinho está com saudade e com raiva, porra. Vem lançar o que gastou.'],
      ['pe-sf-05', 'Se esconder do app não paga conta, caralho. Dá uma olhada no mês.'],
      ['pe-sf-06', 'Quanto mais você enrola, mais a bagunça cresce. Abre o app, caralho.'],
    ]),
  }),
})

/**
 * Hash FNV-1a de 32 bits, inteiro sem sinal. Semeia o mulberry32 sem acaso nativo.
 * @param {string} texto
 * @returns {number}
 */
export function hashSeed(texto) {
  let h = 0x811c9dc5
  const s = String(texto)
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Normaliza situacao e tom desconhecidos para valores validos.
 * @param {string} situation
 * @param {string} tone
 * @returns {{ situation: string, tone: string }}
 */
function normalize(situation, tone) {
  return {
    situation: PUSH_SITUATIONS.includes(situation) ? situation : 'push-espontanea',
    tone: TONES.includes(tone) ? tone : 'sem-filtro',
  }
}

/**
 * Monta titulo e corpo do aviso. Escolha deterministica pelo seed (id do evento).
 * Sem frase possivel, devolve a primeira frase sem encaixe do tom (nunca vazio).
 * @param {{ situation: string, tone: string, categoryName?: string, seed: string }} args
 * @returns {{ title: string, body: string, phraseId: string }}
 */
export function buildPushPayload({ situation, tone, categoryName, seed }) {
  const norm = normalize(situation, tone)
  const slots = buildSlots({ categoria: categoryName })
  const chosen = pick({
    situation: norm.situation,
    tone: norm.tone,
    slots,
    recent: [],
    rand: mulberry32(hashSeed(seed)),
    bank: /** @type {any} */ (PUSH_PHRASES),
    maxLen: PUSH_META[/** @type {keyof typeof PUSH_META} */ (norm.situation)].maxLen,
  })
  if (chosen) return { title: PUSH_TITLE, body: chosen.text, phraseId: chosen.id }

  const plain = (PUSH_PHRASES[norm.situation][norm.tone] || []).find((p) => !/[{}]/.test(p.t))
    || PUSH_PHRASES['push-espontanea'][norm.tone].find((p) => !/[{}]/.test(p.t))
    || PUSH_PHRASES['push-espontanea'].direto[0]
  return { title: PUSH_TITLE, body: plain.t, phraseId: plain.id }
}
