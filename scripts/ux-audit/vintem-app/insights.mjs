// Suite dos insights do Vintem na Home: quatro compras de iFood na semana viram a fala de delivery,
// sem dado pessoal na fala nem no cache da linha de base. So dados ficticios da semente.
export const name = 'insights'
export const route = '/'

const BALLOON = `document.querySelector('[data-situation]')`
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

  const settings = JSON.parse(seed['doc::settings::main'])
  for (const person of Object.keys(settings.personConfig)) settings.personConfig[person].limits = {}

  return {
    ...seed,
    'db::transactions': JSON.stringify([...kept, ...ifood]),
    'doc::settings::main': JSON.stringify(settings),
  }
}

export async function run({ page, check, navigate, sleep }) {
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
}
