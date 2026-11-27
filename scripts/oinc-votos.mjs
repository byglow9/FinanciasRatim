// Voto do dono em TODAS as falas novas e reescritas do OINC (07.1, D-34), no ritmo dele.
//
//   node scripts/oinc-votos.mjs lote4 --out PASTA    exporta o que ainda nao tem voto, 40 por arquivo
//   node scripts/oinc-votos.mjs pagina ARQUIVO...    um HTML local de voto por arquivo
//   node scripts/oinc-votos.mjs aplicar PASTA        reprovadas e taxa de aprovacao (nao edita codigo)
//   node scripts/oinc-votos.mjs conferir PASTA       falha enquanto houver fala nova sem voto "sim"
//
// Precisa de voto: fala marcada `reescrita: true` e fala `lote: 4`, do app e dos avisos, so no tom
// sem filtro (suave e direto sao neutros). Fica de fora so a que o dono ja aprovou nos lotes 4A a 4C com o MESMO texto (so os valores
// trocados por encaixes). Voto vale para o par id e texto de modelo: texto mudado pede voto de novo.
// Nao usa rede nem variaveis de ambiente; grava so na pasta indicada.
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { OINC_LINES } from '../shared/core/oincLines.js'
import { OINC_PUSH_LINES } from '../shared/core/oincLinesPush.js'

export const PAGE_SIZE = 40

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PHASE_DIR = path.join(REPO_ROOT, '.planning/phases/07.1-falas-do-oinc-com-qualidade')
const EARLIER_VOTES = ['07.1-VOTOS-LOTE-4A.json', '07.1-VOTOS-LOTE-4B.json', '07.1-VOTOS-LOTE-4C.json']

const VOTES_RE = /^lote4-votos-(\d+)\.json$/
// Inclui a copia que o navegador renomeia ("lote4-respondido-01 (1).json").
const ANSWERED_RE = /^lote4-respondido-.*\.json$/
const NUMBERED_RE = /^lote4-(?:votos|respondido)-(\d+)/

const USAGE = [
  'Uso:',
  '  node scripts/oinc-votos.mjs lote4 --out PASTA',
  '  node scripts/oinc-votos.mjs pagina ARQUIVO.json [outros.json]',
  '  node scripts/oinc-votos.mjs aplicar PASTA',
  '  node scripts/oinc-votos.mjs conferir PASTA',
].join('\n')

// ---------------------------------------------------------------------------------------------
// Falas que precisam de voto
// ---------------------------------------------------------------------------------------------

/** Formato dos valores que os lotes 4A a 4C usaram no lugar de cada encaixe. */
const VOTED_VALUE = Object.freeze({
  valor: 'R\\$ \\d{1,3}(?:\\.\\d{3})*(?:,\\d{2})?',
  restante: 'R\\$ \\d{1,3}(?:\\.\\d{3})*(?:,\\d{2})?',
  total: 'R\\$ \\d{1,3}(?:\\.\\d{3})*(?:,\\d{2})?',
  pct: '\\d+%',
  dias: '\\d+ dias?',
  quando: '(?:hoje|ontem)',
  categoria: '\\p{Lu}\\p{L}+',
  meta: '\\p{Ll}+',
})

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** O modelo e o texto ja votado, com os valores no lugar dos encaixes? */
function sameAsVoted(template, voted) {
  let pattern = ''
  for (const [i, part] of template.split(/\{(\w+)\}/).entries()) {
    if (i % 2 === 0) pattern += escapeRe(part)
    else if (Object.hasOwn(VOTED_VALUE, part)) pattern += VOTED_VALUE[part]
    else return false
  }
  return new RegExp(`^${pattern}$`, 'u').test(voted)
}

function loadEarlierVotes() {
  const votes = {}
  for (const file of EARLIER_VOTES) {
    try {
      Object.assign(votes, JSON.parse(readFileSync(path.join(PHASE_DIR, file), 'utf8')).votos)
    } catch {
      // Sem o arquivo, as falas dele voltam a pedir voto: o erro e para o lado seguro.
    }
  }
  return votes
}

function approvedEarlier(line, earlier) {
  const id = /^4:(.+)$/.exec(String(line.origem ?? ''))?.[1]
  const vote = id !== undefined && Object.hasOwn(earlier, id) ? earlier[id] : null
  return vote?.v === 'sim' && sameAsVoted(line.t, vote.texto)
}

/** Todas as falas do acervo (so sem filtro) e dos avisos (tres tons), na ordem dos modulos. */
function allLines(bank, pushBank) {
  const app = Object.entries(bank).flatMap(([cena, lines]) =>
    lines.map((line) => ({ cena, tom: 'sem-filtro', aviso: false, line })),
  )
  const push = Object.entries(pushBank).flatMap(([cena, tones]) =>
    Object.entries(tones).flatMap(([tom, lines]) => lines.map((line) => ({ cena, tom, aviso: true, line }))),
  )
  return [...app, ...push]
}

// Suave e direto sao avisos neutros: o dono julga so o sem filtro (27/11/2026).
const needsVote = ({ line, tom }, earlier) =>
  tom === 'sem-filtro' && (line.reescrita === true || (line.lote === 4 && !approvedEarlier(line, earlier)))

// ---------------------------------------------------------------------------------------------
// Votos respondidos
// ---------------------------------------------------------------------------------------------

function voteOf(raw) {
  const v = String(raw ?? '').trim().toLowerCase()
  if (v === 'sim') return 'sim'
  return v === 'nao' || v === 'não' ? 'nao' : null
}

const keyOf = (id, modelo) => `${id}\u0000${modelo}`

function filesIn(dir) {
  try {
    return readdirSync(dir).sort()
  } catch (err) {
    if (err?.code === 'ENOENT') return []
    throw err
  }
}

/**
 * Votos dos arquivos respondidos, um por par id e modelo. Votos que se contradizem contam como
 * reprovada: na duvida a fala nao vai ao ar. Arquivo ilegivel para tudo.
 * @returns {{ votes: Map<string, { id: string, modelo: string, voto: 'sim' | 'nao', comentario: string }> } | { error: string }}
 */
function readAnswers(dir) {
  const votes = new Map()
  for (const file of filesIn(dir).filter((f) => ANSWERED_RE.test(f))) {
    let items
    try {
      items = JSON.parse(readFileSync(path.join(dir, file), 'utf8'))
    } catch {
      items = null
    }
    if (!Array.isArray(items)) return { error: `${file} não é um arquivo de voto legível` }
    for (const item of items) {
      const voto = voteOf(item?.voto)
      if (voto === null || typeof item.id !== 'string' || typeof item.modelo !== 'string') continue
      const key = keyOf(item.id, item.modelo)
      const before = votes.get(key)
      votes.set(key, {
        id: item.id,
        modelo: item.modelo,
        voto: before?.voto === 'nao' ? 'nao' : voto,
        comentario: String(item.comentario ?? '').trim() || before?.comentario || '',
      })
    }
  }
  return { votes }
}

// ---------------------------------------------------------------------------------------------
// Exportacao
// ---------------------------------------------------------------------------------------------

/** Nome e situacao de cada cena para quem vota. */
const SCENE_TEXT = Object.freeze({
  posto: ['Posto de gasolina', 'Abasteceu'],
  farmacia: ['Farmácia', 'Comprou na farmácia'],
  assinaturas: ['Assinaturas', 'Várias assinaturas no mês'],
  'compra-madrugada': ['Compra de madrugada', 'Compra de madrugada'],
  'pix-pessoa': ['Pix para uma pessoa', 'Mandou um Pix'],
  'gasto-minusculo': ['Gasto minúsculo', 'Compra de poucos reais'],
  parcelamento: ['Parcelamento', 'Comprou parcelado'],
  padaria: ['Padaria', 'Passou na padaria'],
  'app-corrida': ['Corrida de app', 'Pediu um carro no app'],
  roupa: ['Roupa', 'Comprou roupa'],
  pet: ['Pet', 'Gasto com bicho'],
  'varias-compras': ['Várias compras', 'Muitas compras no mesmo dia'],
  estorno: ['Estorno', 'Dinheiro devolvido'],
  delivery: ['Delivery', 'Pediu comida'],
  mercado: ['Mercado', 'Compra no mercado'],
  'compra-grande': ['Compra grande', 'Compra de valor alto'],
  compra: ['Compra', 'Compra qualquer'],
  'loja-repete': ['Loja repetida', 'A mesma loja várias vezes na semana'],
  'black-friday': ['Black Friday', 'Gasto na Black Friday'],
  'sexta-noite': ['Sexta à noite', 'App ou gasto na sexta à noite'],
  tabacaria: ['Tabacaria', 'Passou na tabacaria'],
  pod: ['Pod', 'Comprou pod'],
  'renda-extra': ['Renda extra', 'Entrou um dinheiro por fora'],
  'primeiro-dia': ['Primeiro dia do ciclo', 'O ciclo acabou de começar'],
  'vespera-salario': ['Véspera do salário', 'O salário cai amanhã'],
  'semana-sem-gastar': ['Semana sem gastar', 'Dias seguidos sem gasto'],
  salario: ['Salário', 'O salário caiu'],
  'limite-quase': ['Limite quase no fim', 'Uma categoria está perto do limite'],
  'limite-estourou': ['Limite estourado', 'Uma categoria passou do limite'],
  'limite-novo': ['Limite novo', 'Criou um limite'],
  'limite-aumentado': ['Limite aumentado', 'Aumentou um limite'],
  'mes-folgado': ['Mês folgado', 'Sobrando dinheiro para o ritmo'],
  'mes-apertado': ['Mês apertado', 'Gastando acima do ritmo'],
  comparacao: ['Comparação com o mês passado', 'Gastando mais que no mês passado'],
  fatura: ['Fatura do cartão', 'Fatura perto de vencer'],
  'conta-vencendo': ['Conta vencendo', 'Conta vence em poucos dias'],
  'conta-hoje': ['Conta vence hoje', 'Conta vence hoje'],
  'conta-atrasada': ['Conta atrasada', 'Conta passou do vencimento'],
  'aviso-2-dias': ['Conta em 2 dias', 'Conta vence em 1 ou 2 dias'],
  'conta-paga': ['Conta paga', 'Marcou uma conta como paga'],
  compromisso: ['Compromisso', 'Compromisso chegando'],
  aniversario: ['Aniversário', 'Aniversário na agenda'],
  'agenda-notas': ['Agenda e anotações', 'Comentário sobre algo anotado'],
  'meta-nova': ['Meta nova', 'Criou uma meta'],
  'meta-aporte': ['Aporte na meta', 'Colocou dinheiro numa meta'],
  'meta-batida': ['Meta batida', 'Completou uma meta'],
  'meta-parada': ['Meta parada', 'Meta sem aporte há tempo'],
  'meta-status': ['Andamento da meta', 'Como a meta está'],
  'porquinho-encheu': ['Porquinho encheu', 'Guardou no Porquinho'],
  'porquinho-sacou': ['Saque do Porquinho', 'Tirou do Porquinho'],
  'porquinho-recorde': ['Recorde do Porquinho', 'Porquinho no maior valor'],
  'porquinho-status': ['Saldo do Porquinho', 'Quanto há no Porquinho'],
  sumico: ['Sumiço', 'Dias sem lançar nada'],
  entrou: ['Entrou no app', 'Ao abrir o app'],
  'do-nada': ['Fala do nada', 'Mexendo no app, sem nada novo'],
  'app-madrugada': ['App de madrugada', 'App aberto de madrugada'],
  'bom-dia': ['Bom dia', 'App aberto de manhã'],
  'porco-chapaduxo': ['Porco chapaduxo', 'Fala solta do porco'],
  larica: ['Larica', 'Comida tarde da noite'],
  'push-limite-80': ['Aviso de limite quase no fim', 'Categoria perto do limite'],
  'push-limite-100': ['Aviso de limite estourado', 'Categoria passou do limite'],
  'push-fatura-d2': ['Aviso de fatura', 'Fatura vence em 2 dias'],
  'push-fatura-d1': ['Aviso de fatura', 'Fatura vence amanhã'],
  'push-fatura-d0': ['Aviso de fatura', 'Fatura vence hoje'],
  'push-conta-d2': ['Aviso de conta', 'Conta vence em 2 dias'],
  'push-conta-d1': ['Aviso de conta', 'Conta vence amanhã'],
  'push-conta-d0': ['Aviso de conta', 'Conta vence hoje'],
  'push-compromisso-d2': ['Aviso de compromisso', 'Compromisso em 2 dias'],
  'push-compromisso-d1': ['Aviso de compromisso', 'Compromisso amanhã'],
  'push-compra': ['Aviso sobre uma compra', 'Aviso solto sobre uma compra'],
  'push-ritmo': ['Aviso sobre o ritmo', 'Aviso solto sobre o que sobra'],
  'push-meta': ['Aviso sobre meta', 'Aviso solto sobre uma meta'],
  'push-nada': ['Aviso do nada', 'Aviso solto, sem dado'],
})

const SAMPLE = Object.freeze({
  valor: 'R$ 87',
  loja: 'Amazon',
  categoria: 'Lazer',
  pct: '85%',
  dias: '3 dias',
  vezes: '3 vezes',
  meta: 'Viagem',
  conta: 'Internet',
  titulo: 'Dentista',
  restante: 'R$ 320',
  total: 'R$ 640',
  hora: '14h30',
  quando: 'hoje',
})

/** Valores de exemplo que fazem sentido na cena. */
const SCENE_SAMPLE = Object.freeze({
  posto: { valor: 'R$ 180' },
  assinaturas: { valor: 'R$ 39,90', total: 'R$ 164', loja: 'Netflix' },
  'compra-madrugada': { hora: '2h40' },
  'gasto-minusculo': { valor: 'R$ 3,50' },
  delivery: { valor: 'R$ 58', loja: 'iFood' },
  'compra-grande': { valor: 'R$ 1.100' },
  'renda-extra': { valor: 'R$ 300' },
  'primeiro-dia': { dias: '30 dias' },
  'vespera-salario': { dias: '1 dia' },
  'semana-sem-gastar': { dias: '7 dias' },
  salario: { valor: 'R$ 3.200' },
  'limite-estourou': { pct: '120%', categoria: 'Delivery', loja: 'iFood' },
  'mes-folgado': { pct: '55%' },
  'mes-apertado': { pct: '8%' },
  comparacao: { pct: '40%' },
  fatura: { valor: 'R$ 1.287,90', conta: 'Principal' },
  'aviso-2-dias': { dias: '2 dias' },
  aniversario: { titulo: 'Aniversário' },
  'agenda-notas': { titulo: 'Promessa' },
  'meta-batida': { pct: '100%' },
  'porquinho-recorde': { total: 'R$ 2.400' },
  sumico: { dias: '8 dias' },
  'app-madrugada': { hora: '2h40' },
  larica: { hora: '23h10', loja: 'iFood' },
  'push-limite-80': { valor: 'R$ 255', loja: 'iFood', categoria: 'Delivery' },
  'push-limite-100': { valor: 'R$ 336', pct: '112%', loja: 'iFood', categoria: 'Delivery' },
  'push-fatura-d2': { valor: 'R$ 1.287,90' },
  'push-fatura-d1': { valor: 'R$ 1.287,90' },
  'push-fatura-d0': { valor: 'R$ 1.287,90' },
  'push-compra': { loja: 'iFood', categoria: 'Delivery' },
})

/** Conta ou compromisso presos a um tema levam o nome do tema. */
const THEME_SAMPLE = Object.freeze({
  internet: { conta: 'Internet' },
  luz: { conta: 'Luz' },
  agua: { conta: 'Água' },
  aluguel: { conta: 'Aluguel' },
  academia: { conta: 'Academia', titulo: 'Academia' },
  dentista: { titulo: 'Dentista' },
  medico: { titulo: 'Médico' },
  aniversario: { titulo: 'Aniversário' },
})

const COND_TEXT = Object.freeze({
  hoje: 'no próprio dia',
  ontem: 'sobre ontem',
  amanha: 'na véspera',
  sexta: 'só na sexta',
  sabado: 'só no sábado',
  domingo: 'só no domingo',
  'fim-de-semana': 'só no fim de semana',
  madrugada: 'só de madrugada',
})

const condsOf = (line) => [line.se ?? []].flat()

function situationOf({ cena, tom, aviso, line }) {
  const parts = [SCENE_TEXT[cena]?.[1] ?? cena]
  if (aviso) parts.push(`aviso na tela do celular, tom ${tom === 'sem-filtro' ? 'sem filtro' : tom}`)
  if (line.g === 'm') parts.push('só para homem')
  if (line.g === 'f') parts.push('só para mulher')
  for (const cond of condsOf(line)) {
    parts.push(cond.startsWith('tema:') ? `só quando o tema é ${cond.slice(5)}` : (COND_TEXT[cond] ?? cond))
  }
  return parts.join(', ')
}

function exampleText({ cena, line }) {
  const values = { ...SAMPLE, ...SCENE_SAMPLE[cena] }
  for (const cond of condsOf(line)) {
    if (cond.startsWith('tema:')) Object.assign(values, THEME_SAMPLE[cond.slice(5)])
    if (cond === 'amanha') values.dias = '1 dia'
  }
  return line.t.replace(/\{(\w+)\}/g, (all, name) => values[name] ?? all)
}

function itemOf(entry) {
  return {
    id: entry.line.id,
    cenario: SCENE_TEXT[entry.cena]?.[0] ?? entry.cena,
    situacao: situationOf(entry),
    texto: exampleText(entry),
    voto: '',
    comentario: '',
    lote: 4,
    modelo: entry.line.t,
    tom: entry.tom,
  }
}

function exportRound({ lines, earlier, dir, say }) {
  const answers = readAnswers(dir)
  if (answers.error) return { error: answers.error }
  const pending = lines.filter(
    (entry) => needsVote(entry, earlier) && !answers.votes.has(keyOf(entry.line.id, entry.line.t)),
  )
  if (pending.length === 0) {
    say('Nada a votar: toda fala nova já tem voto nesta pasta.')
    return {}
  }
  mkdirSync(dir, { recursive: true })
  let next = 1 + Math.max(0, ...filesIn(dir).map((f) => Number(NUMBERED_RE.exec(f)?.[1] ?? 0)))
  const written = []
  for (let at = 0; at < pending.length; at += PAGE_SIZE) {
    const name = `lote4-votos-${String(next).padStart(2, '0')}.json`
    const items = pending.slice(at, at + PAGE_SIZE).map(itemOf)
    writeFileSync(path.join(dir, name), `${JSON.stringify(items, null, 2)}\n`, { flag: 'wx' })
    written.push(name)
    next += 1
  }
  say(`${pending.length} fala(s) a votar em ${written.length} arquivo(s): ${written[0]} a ${written.at(-1)}`)
  return {}
}

// ---------------------------------------------------------------------------------------------
// Pagina de voto
// ---------------------------------------------------------------------------------------------

/**
 * Script da pagina. Todo texto entra por textContent: o conteudo (inclusive o de modelo de IA) nunca
 * vira marcacao. O voto parcial fica no navegador, preso ao id e ao texto.
 */
const PAGE_SCRIPT = `
const { nome, baixar, itens } = JSON.parse(document.getElementById('dados').textContent)
const CHAVE = 'oinc-votos:' + nome
let guardado = {}
try { guardado = JSON.parse(localStorage.getItem(CHAVE)) || {} } catch { guardado = {} }
const estado = itens.map((item) => {
  const antes = Object.prototype.hasOwnProperty.call(guardado, item.id) ? guardado[item.id] : null
  const vale = antes && antes.texto === item.texto
  return { voto: vale ? antes.voto : item.voto || '', comentario: vale ? antes.comentario : item.comentario || '' }
})
const faltam = () => estado.filter((e) => e.voto !== 'sim' && e.voto !== 'nao').length
function progresso() {
  document.getElementById('progresso').textContent = (itens.length - faltam()) + ' de ' + itens.length + ' votadas'
}
function guardar(i) {
  guardado[itens[i].id] = { texto: itens[i].texto, voto: estado[i].voto, comentario: estado[i].comentario }
  try {
    localStorage.setItem(CHAVE, JSON.stringify(guardado))
  } catch {
    document.getElementById('aviso').textContent = 'Este navegador não guarda o voto parcial: baixe antes de fechar.'
  }
  progresso()
}
function el(tag, classe, texto) {
  const no = document.createElement(tag)
  no.className = classe
  if (texto !== undefined) no.textContent = texto
  return no
}
itens.forEach((item, i) => {
  const cartao = el('section', 'cartao')
  const botoes = el('div', 'botoes')
  const par = [['sim', 'Sim'], ['nao', 'Não']].map(([valor, rotulo]) => {
    const botao = el('button', 'voto ' + valor, rotulo)
    botao.setAttribute('type', 'button')
    botao.addEventListener('click', () => {
      estado[i].voto = valor
      pintar()
      guardar(i)
    })
    return [valor, botao]
  })
  function pintar() {
    for (const [valor, botao] of par) botao.setAttribute('aria-pressed', String(estado[i].voto === valor))
  }
  const comentario = el('textarea', 'comentario')
  comentario.setAttribute('rows', '1')
  comentario.setAttribute('placeholder', 'comentário (se quiser)')
  comentario.value = estado[i].comentario
  comentario.addEventListener('input', () => {
    estado[i].comentario = comentario.value
    guardar(i)
  })
  botoes.append(...par.map(([, botao]) => botao))
  cartao.append(
    el('p', 'cenario', (i + 1) + '. ' + item.cenario),
    el('p', 'situacao', item.situacao),
    el('p', 'texto', item.texto),
    botoes,
    comentario,
  )
  pintar()
  document.getElementById('lista').append(cartao)
})
document.getElementById('baixar').addEventListener('click', () => {
  const saida = itens.map((item, i) => ({ ...item, voto: estado[i].voto, comentario: estado[i].comentario }))
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([JSON.stringify(saida, null, 2) + '\\n'], { type: 'application/json' }))
  link.download = baixar
  link.click()
  const n = faltam()
  document.getElementById('aviso').textContent =
    (n > 0 ? 'Baixado, mas faltam ' + n + ' sem voto. ' : 'Baixado. ') + 'Salve ' + baixar + ' na mesma pasta deste arquivo.'
})
progresso()
`

const PAGE_STYLE = `
:root { color-scheme: light dark }
body { font: 16px/1.4 system-ui, sans-serif; margin: 0 auto; max-width: 40rem; padding: 0 1rem 7rem }
.cartao { border: 1px solid #8886; border-radius: 12px; margin: 0 0 1rem; padding: .75rem 1rem }
.cartao p { margin: .25rem 0 }
.cenario { font-weight: 700 }
.situacao { font-size: .85rem; opacity: .75 }
.texto { font-size: 1.15rem; overflow-wrap: anywhere }
.botoes { display: flex; gap: .5rem; margin: .5rem 0 }
button { border: 2px solid #8888; border-radius: 10px; background: none; color: inherit; font: inherit; min-height: 48px; cursor: pointer }
.voto { flex: 1 }
.sim[aria-pressed="true"] { background: #1a7f37; border-color: #1a7f37; color: #fff }
.nao[aria-pressed="true"] { background: #b42318; border-color: #b42318; color: #fff }
textarea { box-sizing: border-box; width: 100%; font: inherit }
footer { position: fixed; left: 0; right: 0; bottom: 0; background: Canvas; border-top: 1px solid #8886; padding: .5rem 1rem; text-align: center }
footer p { margin: .25rem 0 }
#baixar { width: 100%; max-width: 40rem }
`

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)

function pageHtml(nome, baixar, itens) {
  // "<" vira < dentro do JSON: nenhum texto consegue fechar o bloco de dados.
  const dados = JSON.stringify({ nome, baixar, itens }).replace(/</g, '\\u003c')
  const hash = createHash('sha256').update(PAGE_SCRIPT).digest('base64')
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'sha256-${hash}'">
<title>Voto das falas: ${escapeHtml(nome)}</title>
<style>${PAGE_STYLE}</style>
</head>
<body>
<h1>Voto das falas do OINC</h1>
<p>${escapeHtml(nome)}. Toque em Sim ou Não em cada fala. No fim, baixe os votos.</p>
<main id="lista"></main>
<footer>
<p id="progresso"></p>
<button type="button" id="baixar">baixar votos</button>
<p id="aviso" role="status"></p>
</footer>
<script type="application/json" id="dados">${dados}</script>
<script>${PAGE_SCRIPT}</script>
</body>
</html>
`
}

/** Nome do arquivo respondido de cada arquivo de voto. */
function answeredName(base) {
  const numbered = VOTES_RE.exec(`${base}.json`)
  return numbered ? `lote4-respondido-${numbered[1]}.json` : `${base}-respondido.json`
}

function buildPages({ files, cwd, say, fail }) {
  const pages = []
  for (const given of files) {
    const file = path.resolve(cwd, given)
    let items
    try {
      items = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
      items = null
    }
    const ok = Array.isArray(items) && items.every((i) => typeof i?.id === 'string' && typeof i?.texto === 'string')
    if (!ok) return fail(`${path.basename(file)} não é um arquivo de voto`)
    pages.push({ file, items })
  }
  for (const { file, items } of pages) {
    const base = path.basename(file).replace(/\.json$/i, '')
    const out = path.join(path.dirname(file), `${base}.html`)
    writeFileSync(out, pageHtml(base, answeredName(base), items))
    say(`Abra no navegador: ${out}`)
  }
  return 0
}

// ---------------------------------------------------------------------------------------------
// Aplicar e conferir
// ---------------------------------------------------------------------------------------------

function report({ lines, dir, say, fail }) {
  const answers = readAnswers(dir)
  if (answers.error) return fail(answers.error)
  // Voto antigo em suave ou direto nao conta: o dono nao julgou essas falas.
  const neutras = new Set(lines.filter((e) => e.tom !== 'sem-filtro').map((e) => e.line.id))
  const votes = [...answers.votes.values()].filter((v) => !neutras.has(v.id))
  if (votes.length === 0) return fail('nenhum voto nos arquivos lote4-respondido-*.json desta pasta')
  const inRepo = new Map(lines.map((e) => [keyOf(e.line.id, e.line.t), e.line]))
  const approved = votes.filter((v) => v.voto === 'sim')
  const rejected = votes.filter((v) => v.voto === 'nao')
  const note = (v) => (v.comentario ? `  ${v.comentario}` : '')

  say(`${approved.length} aprovadas de ${votes.length} votadas (${Math.floor((approved.length * 100) / votes.length)}%)`)
  if (approved.length * 10 < votes.length * 8) say('Atenção: abaixo de 8 em cada 10.')
  say(`\nReprovadas (${rejected.length}), tirar do repositório:`)
  for (const v of rejected) {
    say(`  ${v.id}${inRepo.has(keyOf(v.id, v.modelo)) ? ' (ainda no repositório)' : ' (já saiu ou mudou)'}${note(v)}`)
  }
  const marked = approved.filter((v) => inRepo.get(keyOf(v.id, v.modelo))?.reescrita === true)
  say(`\nAprovadas ainda com a marca reescrita (${marked.length}), tirar a marca:`)
  if (marked.length > 0) say(`  ${marked.map((v) => v.id).join(' ')}`)
  const commented = approved.filter((v) => v.comentario)
  if (commented.length > 0) {
    say(`\nComentários nas aprovadas (${commented.length}):`)
    for (const v of commented) say(`  ${v.id}${note(v)}`)
  }
  return 0
}

function check({ lines, earlier, dir, say, fail }) {
  const answers = readAnswers(dir)
  if (answers.error) return fail(answers.error)
  const open = lines
    .filter((e) => needsVote(e, earlier))
    .map((e) => ({ id: e.line.id, voto: answers.votes.get(keyOf(e.line.id, e.line.t))?.voto ?? null }))
    .filter((x) => x.voto !== 'sim')
  if (open.length === 0) {
    say('Conferido: toda fala nova do repositório tem voto "sim".')
    return 0
  }
  for (const x of open) say(`  ${x.id} ${x.voto === 'nao' ? 'reprovada' : 'sem voto'}`)
  return fail(`${open.length} fala(s) nova(s) sem voto "sim": nada disto pode ser publicado`)
}

// ---------------------------------------------------------------------------------------------
// Linha de comando
// ---------------------------------------------------------------------------------------------

/**
 * `bank`, `pushBank` e `approvedBefore` so mudam nos testes.
 * @returns {number} codigo de saida
 */
export function main({
  argv = process.argv.slice(2),
  cwd = process.cwd(),
  bank = OINC_LINES,
  pushBank = OINC_PUSH_LINES,
  approvedBefore,
  log = console.log,
  logError = console.error,
} = {}) {
  const say = (text) => log(text)
  const fail = (text) => {
    logError(`[oinc-votos] ${text}`)
    return 1
  }
  const [mode, ...rest] = argv
  const usage = () => {
    logError(USAGE)
    return 1
  }
  if (mode === 'pagina') return rest.length > 0 ? buildPages({ files: rest, cwd, say, fail }) : usage()

  const wantsOut = mode === 'lote4'
  const valid = wantsOut ? rest.length === 2 && rest[0] === '--out' : ['aplicar', 'conferir'].includes(mode) && rest.length === 1
  if (!valid) return usage()

  const dir = path.resolve(cwd, rest.at(-1))
  const lines = allLines(bank, pushBank)
  const earlier = approvedBefore ?? loadEarlierVotes()
  if (mode === 'aplicar') return report({ lines, dir, say, fail })
  if (mode === 'conferir') return check({ lines, earlier, dir, say, fail })
  const out = exportRound({ lines, earlier, dir, say })
  return out.error ? fail(out.error) : 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main()
}
