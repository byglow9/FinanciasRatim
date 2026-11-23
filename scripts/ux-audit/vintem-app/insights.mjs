// Suite dos insights do Vintem na Home: quatro compras de iFood na semana viram a fala de delivery,
// sem dado pessoal na fala nem no cache da linha de base. So dados ficticios da semente.
export const name = 'insights'
export const route = '/'

const BALLOON = `document.querySelector('[data-situation]')`
const SEEN_KEY = 'vintem:seen:v1:ele'
const LIVE = `document.querySelector('p.sr-only[role="status"]')`
// Grava, desde o inicio do documento, se a moeda da reacao de gasto chegou a aparecer (o atributo
// data-vintem-state so mostra o humor de fundo, nunca a reacao curta).
const RECORDER = `(() => {
  window.__coinSeen = false
  setInterval(() => {
    const el = document.querySelector('g[id$="-coinR"]')
    if (el && getComputedStyle(el).display !== 'none') window.__coinSeen = true
  }, 30)
})()`
const CLEAR_KEYS = `(() => {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith('vintem:baseline:v1:') || k.startsWith('vintem:seen:v1:')) localStorage.removeItem(k)
  }
})()`

/** Ano, mes e dia do calendario de Sao Paulo (o app conta os dias nesse fuso). */
function spYMD(now) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type) => Number(parts.find((p) => p.type === type).value)
  return { y: get('year'), m: get('month'), d: get('day') }
}

/** Meio-dia de Sao Paulo (15:00Z) do dia `day` do mes corrente, em ISO. */
function spNoon({ y, m }, day) {
  return new Date(Date.UTC(y, m - 1, day, 15, 0, 0)).toISOString()
}

/**
 * Troca as saidas do ciclo por quatro compras de iFood em dias seguidos da ultima semana (30 a 60 reais),
 * remove os limites por categoria e mantem a renda esperada (o ritmo nao vence a leitura de gasto).
 */
export function extraStorage(seed, now) {
  const ymd = spYMD(now)
  const kept = JSON.parse(seed['db::transactions']).filter((t) => t.type === 'entrada')
  const created = now.toISOString()
  const ifood = [
    [0, 30, 'iFood'],
    [1, 42.5, 'IFOOD *PEDIDO'],
    [2, 55, 'iFood Restaurante'],
    [3, 60, 'ifood'],
  ].map(([back, amount, description], i) => ({
    id: `ins-ifood-${i + 1}`,
    person: 'ele',
    type: 'saida',
    amount,
    description,
    category: 'Alimentacao',
    categoryId: 'alimentacao',
    date: spNoon(ymd, Math.max(1, ymd.d - back)),
    createdAt: created,
  }))

  // Saida importada do banco, de agora, fora do delivery e sem limite: reacao simples de gasto.
  const bank = {
    id: 'ins-bank-1',
    person: 'ele',
    type: 'saida',
    amount: 25.9,
    description: 'Mercado do bairro',
    category: 'Alimentacao',
    categoryId: 'alimentacao',
    source: 'bank',
    date: created,
    createdAt: created,
  }

  const settings = JSON.parse(seed['doc::settings::main'])
  for (const person of Object.keys(settings.personConfig)) settings.personConfig[person].limits = {}

  return {
    ...seed,
    'db::transactions': JSON.stringify([...kept, ...ifood, bank]),
    'doc::settings::main': JSON.stringify(settings),
  }
}

export async function run({ page, check, navigate, sleep }) {
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: RECORDER })
  // Primeira carga so para limpar o marco e o cache que outras suites deixaram no mesmo perfil.
  await navigate(route)
  await page.evaluate(CLEAR_KEYS)
  await navigate(route, BALLOON)

  let entry = null
  for (let i = 0; i < 20 && entry === null; i++) {
    entry = await page.evaluate(`(() => {
      const wrap = ${BALLOON}
      if (!wrap) return null
      return {
        situation: wrap.getAttribute('data-situation'),
        phrase: wrap.getAttribute('data-phrase'),
        text: wrap.querySelector('button span')?.textContent ?? '',
      }
    })()`)
    if (entry === null) await sleep(150)
  }
  check('fala-de-entrada-aparece', entry !== null, { entry })
  if (entry === null) return

  check('fala-de-entrada-e-a-de-delivery-da-semana', entry.situation === 'delivery-semana', {
    situation: entry.situation,
  })
  check('frase-de-delivery-vem-do-grupo-ds', typeof entry.phrase === 'string' && entry.phrase.startsWith('ds'), {
    phrase: entry.phrase,
  })
  check('fala-sem-chaves-abertas', entry.text.length > 0 && !/[{}]/.test(entry.text), { text: entry.text })
  check('fala-sem-pix-nem-seis-digitos', !/pix/i.test(entry.text) && !/\d{6,}/.test(entry.text), { text: entry.text })

  // Cache da linha de base: gravado depois da primeira consulta, so com ids e numeros.
  const cache = await page.evaluate(`(() => {
    const out = {}
    for (const k of Object.keys(localStorage)) if (k.startsWith('vintem:baseline:v1:')) out[k] = localStorage.getItem(k)
    return out
  })()`)
  const keys = Object.keys(cache)
  check('cache-da-linha-de-base-gravado', keys.length === 1, { keys })
  const blob = keys.length > 0 ? `${keys[0]} ${cache[keys[0]]}` : ''
  check('cache-sem-nome-de-loja-nem-descricao', !/ifood|restaurante|pedido|pix/i.test(blob), { keys })
  check('cache-sem-seis-digitos-seguidos', !/\d{6,}/.test(keys[0] ?? ''), { keys })

  // Primeira visita (sem marco): so registra o marco, nenhuma reacao e nada anunciado.
  await sleep(2500)
  const first = await page.evaluate(`({
    coin: window.__coinSeen === true,
    live: ${LIVE}?.textContent ?? null,
    seen: localStorage.getItem('${SEEN_KEY}'),
  })`)
  check('primeira-visita-nao-reage', first.coin === false && first.live === '', first)
  check('primeira-visita-registra-o-marco', /^\d{10,15}$/.test(first.seen ?? ''), { seen: first.seen })

  // Marco antigo e uma saida importada mais nova: uma reacao de gasto, com fala anunciada.
  const oldMark = Date.now() - 24 * 60 * 60 * 1000
  await page.evaluate(`localStorage.setItem('${SEEN_KEY}', '${oldMark}')`)
  await navigate(route, BALLOON)
  let reacted = null
  for (let i = 0; i < 20 && (reacted === null || !reacted.coin || reacted.live === ''); i++) {
    reacted = await page.evaluate(`({
      coin: window.__coinSeen === true,
      live: ${LIVE}?.textContent ?? '',
      situation: ${BALLOON}?.getAttribute('data-situation') ?? null,
    })`)
    if (!reacted.coin || reacted.live === '') await sleep(200)
  }
  check('saida-importada-faz-o-vintem-reagir', reacted.coin === true, reacted)
  check('reacao-anuncia-a-fala', reacted.live.length > 0 && !/[{}]/.test(reacted.live) && !/pix|\d{6,}/i.test(reacted.live), {
    live: reacted.live,
  })
  check('fala-da-reacao-e-a-de-lancamento', reacted.situation === 'lancamento-ok', { situation: reacted.situation })

  // Volta ao repouso em ate 4 s e o marco avanca para a chegada mais nova.
  await sleep(4000)
  const rest = await page.evaluate(`(() => {
    const el = document.querySelector('g[id$="-coinR"]')
    return {
      coinOn: !!el && getComputedStyle(el).display !== 'none',
      seen: Number(localStorage.getItem('${SEEN_KEY}')),
      state: document.querySelector('button[aria-label^="Vintém"]')?.getAttribute('data-vintem-state') ?? null,
    }
  })()`)
  check('reacao-volta-ao-repouso', rest.coinOn === false, rest)
  check('marco-avanca-depois-da-reacao', rest.seen > oldMark, { seen: rest.seen, oldMark })

  // Mesma chegada na carga seguinte: nenhuma reacao nova.
  await navigate(route, BALLOON)
  await sleep(2500)
  const again = await page.evaluate(`({ coin: window.__coinSeen === true, live: ${LIVE}?.textContent ?? '' })`)
  check('chegada-ja-vista-nao-reage-de-novo', again.coin === false && again.live === '', again)
}
