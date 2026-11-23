// Suite da gravacao dos insights fortes do Vintem (plano 04-18, D-15): o mesmo cenario de iFood da suite
// insights vira um documento em db::vintemInsights so com ids, chaves e numeros, uma vez por aparelho
// e ciclo. So dados ficticios da semente; o ramo MOCK do servico faz a gravacao no localStorage.
import { extraStorage as insightsStorage } from './insights.mjs'

export const name = 'persist'
export const route = '/'

/**
 * Mesmo cenario de iFood da suite insights, so que com ids de lancamento sem o nome da loja: o documento
 * guarda ids de lancamento como evidencia, e a conferencia de "sem nome de loja" olha o texto inteiro.
 */
export function extraStorage(seed, now) {
  const out = insightsStorage(seed, now)
  const txs = JSON.parse(out['db::transactions']).map((t) => ({ ...t, id: t.id.replace('ins-ifood-', 'ins-ped-') }))
  return { ...out, 'db::transactions': JSON.stringify(txs) }
}

const BALLOON = `document.querySelector('[data-situation]')`
const COL_KEY = 'db::vintemInsights'
const CLEAR_KEYS = `(() => {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith('vintem:baseline:v1:') || k.startsWith('vintem:seen:v1:') || k.startsWith('vintem:written:v1:')) {
      localStorage.removeItem(k)
    }
  }
})()`
const READ_STORE = `(() => {
  const written = {}
  for (const k of Object.keys(localStorage)) if (k.startsWith('vintem:written:v1:')) written[k] = localStorage.getItem(k)
  return { raw: localStorage.getItem('${COL_KEY}'), written }
})()`

const ALLOWED_KEYS = [
  'cycleKey',
  'day',
  'evidenceDays',
  'evidenceTxIds',
  'id',
  'metrics',
  'person',
  'severity',
  'subjectKey',
  'subjectKind',
  'type',
  'updatedAt',
  'v',
]

export async function run({ page, check, navigate, sleep }) {
  // Primeira carga so para limpar marco, cache e o registro de ids gravados de outras suites.
  await navigate(route)
  await page.evaluate(CLEAR_KEYS)
  await navigate(route, BALLOON)

  // Em ate 5 s o insight forte de delivery vira documento.
  let store = null
  let docs = []
  for (let i = 0; i < 25; i++) {
    store = await page.evaluate(READ_STORE)
    try {
      docs = JSON.parse(store.raw ?? '[]')
    } catch {
      docs = []
    }
    if (Array.isArray(docs) && docs.length > 0) break
    await sleep(200)
  }
  check('insight-forte-vira-documento', Array.isArray(docs) && docs.length > 0, { count: docs.length })
  if (!Array.isArray(docs) || docs.length === 0) return

  const delivery = docs.find((d) => d.type === 'delivery-heavy')
  check('documento-de-delivery-tem-severidade-alta-e-chave-delivery', Boolean(delivery) && [2, 3].includes(delivery.severity) && delivery.subjectKey === 'delivery', {
    delivery: delivery ?? null,
  })
  check('todo-documento-tem-severidade-2-ou-3', docs.every((d) => d.severity === 2 || d.severity === 3), {
    severities: docs.map((d) => d.severity),
  })
  check('documento-so-tem-campos-permitidos', docs.every((d) => Object.keys(d).every((k) => ALLOWED_KEYS.includes(k))), {
    keys: [...new Set(docs.flatMap((d) => Object.keys(d)))],
  })
  check('id-do-documento-e-deterministico-e-sem-barra', docs.every((d) => /^ele__\d{4}-\d{2}__[a-z0-9-]+__[a-z0-9:_-]+__[a-z0-9-]+$/i.test(d.id)), {
    ids: docs.map((d) => d.id),
  })

  // Nada pessoal: sem loja, Pix nem 6 digitos seguidos no documento nem no registro de ids gravados.
  const text = `${store.raw} ${JSON.stringify(store.written)}`
  check('armazenamento-sem-nome-de-loja', !/ifood|restaurante|pedido|mercado/i.test(text), {})
  check('armazenamento-sem-pix', !/pix/i.test(text), {})
  check('armazenamento-sem-seis-digitos-seguidos', !/\d{6,}/.test(text), {})

  const writtenKeys = Object.keys(store.written)
  const writtenIds = writtenKeys.length === 1 ? JSON.parse(store.written[writtenKeys[0]]) : []
  check('ids-gravados-ficam-no-registro-do-aparelho', writtenKeys.length === 1 && docs.every((d) => writtenIds.includes(d.id)), {
    writtenKeys,
  })

  // Mesma visita de novo: o registro impede nova gravacao (a semente zera a colecao a cada carga).
  await navigate(route, BALLOON)
  await sleep(2500)
  const again = await page.evaluate(READ_STORE)
  check('mesmo-id-nao-e-gravado-de-novo-no-aparelho', JSON.parse(again.raw ?? '[]').length === 0, { raw: again.raw })
}
