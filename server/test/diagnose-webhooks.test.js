import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as script from '../scripts/diagnose-webhooks.js'

// Diagnostico de webhooks: sempre com Pluggy e Firestore falsos, sem rede.
const CLIENT_SECRET = 'client-secret-sentinela-ZZ9'
const ITEM_ID = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_ITEM_ID = 'bbbbbbbb-1111-2222-3333-444444444444'
const ACCOUNT_ID = 'cccccccc-1111-2222-3333-444444444444'
const URL_OK = 'https://servidor.exemplo.test/webhooks/pluggy'
const EVENTS = ['item/updated', 'transactions/created', 'transactions/updated', 'transactions/deleted']
const NOW = new Date('2026-11-24T18:00:00Z') // 15:00 em Brasilia

const fullEnv = (extra = {}) => ({
  PLUGGY_CLIENT_ID: 'id-falso',
  PLUGGY_CLIENT_SECRET: CLIENT_SECRET,
  PLUGGY_ITEM_IDS: ITEM_ID,
  ...extra,
})

const webhook = (event, extra = {}) => ({
  id: `wh-${event.replace('/', '-')}-0000`,
  url: URL_OK,
  event,
  createdAt: new Date('2026-11-18T15:00:00Z'),
  updatedAt: new Date('2026-11-18T15:00:00Z'),
  disabledAt: null,
  ...extra,
})
const allWebhooks = () => EVENTS.map((e) => webhook(e))

const ALLOWED_PLUGGY_METHODS = ['fetchWebhooks', 'fetchItem', 'fetchAccounts', 'fetchAllTransactions']

// Pluggy falsa que so conhece metodos de leitura: qualquer outro acesso derruba o teste.
function fakePluggy({ webhooks = allWebhooks(), items, accounts, txs, calls = [], failWebhooks = null, failItem = null } = {}) {
  const impl = {
    async fetchWebhooks() {
      calls.push(['fetchWebhooks'])
      if (failWebhooks) throw failWebhooks
      return { results: webhooks }
    },
    async fetchItem(id) {
      calls.push(['fetchItem', id])
      if (failItem) throw failItem
      return items?.[id] ?? defaultItem(id)
    },
    async fetchAccounts(id) {
      calls.push(['fetchAccounts', id])
      return { results: accounts ?? [defaultAccount()] }
    },
    async fetchAllTransactions(accountId, opts) {
      calls.push(['fetchAllTransactions', accountId, opts])
      return txs ?? defaultTxs()
    },
  }
  return new Proxy(impl, {
    get(target, prop) {
      if (typeof prop === 'symbol') return undefined
      if (!(prop in target)) throw new Error(`metodo fora da lista de leitura: ${String(prop)}`)
      return target[prop]
    },
  })
}

const defaultItem = (id) => ({
  id,
  connector: { name: 'MeuPluggy' },
  status: 'UPDATED',
  executionStatus: 'SUCCESS',
  error: null,
  lastUpdatedAt: new Date('2026-11-24T09:00:00Z'),
  updatedAt: new Date('2026-11-24T09:00:30Z'),
  nextAutoSyncAt: null,
  consentExpiresAt: new Date('2027-11-17T12:00:00Z'),
  consecutiveFailedLoginAttempts: 0,
  webhookUrl: null,
})
const defaultAccount = () => ({ id: ACCOUNT_ID, type: 'BANK', subtype: 'CHECKING_ACCOUNT', name: 'Conta 123456789' })
const tx = (id, createdAt, extra = {}) => ({
  id,
  accountId: ACCOUNT_ID,
  amount: -21.95,
  type: 'DEBIT',
  date: new Date('2026-11-24T00:00:00Z'),
  description: 'PIX ENVIADO - DES: MARIA SILVA 12345678901',
  createdAt: new Date(createdAt),
  status: 'POSTED',
  ...extra,
})
const defaultTxs = () => [
  tx('tx-fast-1111', '2026-11-24T09:00:05Z'),
  tx('tx-slow-2222', '2026-11-24T09:00:20Z'),
  tx('tx-none-3333', '2026-11-23T09:01:00Z'),
]

function fakeFirestore({ connections = [], imports = {}, failConnections = null, failImports = null } = {}) {
  return {
    async fetchConnections() {
      if (failConnections) throw failConnections
      return connections
    },
    async fetchImports(ids) {
      if (failImports) throw failImports
      return Object.fromEntries(ids.filter((id) => imports[id]).map((id) => [id, imports[id]]))
    },
  }
}
const defaultConnection = (extra = {}) => ({
  itemId: ITEM_ID,
  lastSyncAt: new Date('2026-11-24T12:00:30Z'),
  lastSyncError: null,
  lastWebhookAt: null,
  lastWebhookEvent: null,
  bankUpdatedAt: new Date('2026-11-24T09:00:00Z'),
  ...extra,
})
const defaultImports = () => ({
  'tx-fast-1111': { createdAt: new Date('2026-11-24T09:00:09Z'), status: 'imported', reason: null },
  'tx-slow-2222': { createdAt: new Date('2026-11-24T12:00:30Z'), status: 'review', reason: 'self_transfer' },
})

function collector() {
  const lines = []
  return {
    lines,
    log: (...a) => lines.push(a.join(' ')),
    logError: (...a) => lines.push(a.join(' ')),
    text: () => lines.join('\n'),
  }
}

async function run({ env = fullEnv(), argv = [], pluggy = fakePluggy(), firestore, createFirestore } = {}) {
  const out = collector()
  // Passar um Firestore falso equivale a ter a credencial no ambiente do dono.
  const finalEnv =
    firestore && !env.FIREBASE_SERVICE_ACCOUNT_FILE
      ? { ...env, FIREBASE_SERVICE_ACCOUNT_FILE: '/fora/do/repo/chave.json' }
      : env
  const code = await script.main({
    env: finalEnv,
    argv,
    now: () => NOW,
    createClient: () => pluggy,
    createFirestore: createFirestore ?? (async () => firestore),
    log: out.log,
    logError: out.logError,
  })
  return { code, out }
}

describe('formatacao e mascaras', () => {
  test('maskId, maskIds, maskDigits e safeUrl', () => {
    assert.equal(script.maskId(ITEM_ID), 'aaaaaaaa')
    assert.equal(script.maskId(undefined), '?')
    assert.equal(script.maskIds(`erro no item ${ITEM_ID}!`), 'erro no item aaaaaaaa...!')
    assert.equal(script.maskDigits('Conta 123456789 e 12'), 'Conta **** e 12')
    assert.equal(script.safeUrl('https://u:senha@servidor.exemplo.test/webhooks/pluggy?token=x#f'), URL_OK)
    assert.equal(script.safeUrl('nao e url'), '(url invalida)')
    assert.equal(script.safeUrl(undefined), '(sem url)')
  })

  test('toDate aceita Date, ISO, numero e Timestamp; rejeita lixo', () => {
    assert.equal(script.toDate(NOW).getTime(), NOW.getTime())
    assert.equal(script.toDate('2026-11-24T18:00:00Z').getTime(), NOW.getTime())
    assert.equal(script.toDate(NOW.getTime()).getTime(), NOW.getTime())
    assert.equal(script.toDate({ toDate: () => NOW }).getTime(), NOW.getTime())
    assert.equal(script.toDate(null), null)
    assert.equal(script.toDate(''), null)
    assert.equal(script.toDate('amanha'), null)
  })

  test('formatLocal usa Brasilia, nao o fuso da maquina', () => {
    assert.equal(script.formatLocal('2026-11-24T17:32:05Z'), '24/11/2026 14:32:05')
    assert.equal(script.formatLocal('2026-11-24T02:59:59Z'), '23/11/2026 23:59:59')
    assert.equal(script.formatLocal(null), '-')
  })

  test('formatTxDate: meia-noite UTC e so data (sem recuar um dia); com hora vira Brasilia', () => {
    assert.equal(script.formatTxDate('2026-11-24T00:00:00.000Z'), '24/11/2026')
    assert.equal(script.formatTxDate('2026-11-24T17:32:05Z'), '24/11/2026 14:32:05')
  })

  test('formatDuration, formatAge e formatMoney', () => {
    assert.equal(script.formatDuration(4000), '4s')
    assert.equal(script.formatDuration(5 * 60 * 1000), '5min')
    assert.equal(script.formatDuration(3 * 3600 * 1000 + 12 * 60 * 1000), '3h12')
    assert.equal(script.formatDuration(50 * 3600 * 1000), '2d2h')
    assert.equal(script.formatAge('2026-11-24T17:00:00Z', NOW), 'ha 1h00')
    assert.equal(script.formatAge('2026-11-24T19:00:00Z', NOW), 'daqui a 1h00')
    assert.equal(script.formatAge(null, NOW), '-')
    assert.equal(script.formatMoney(21.95), 'R$ 21,95')
    assert.equal(script.formatMoney(-21.95), '-R$ 21,95')
    assert.equal(script.formatMoney('abc'), '-')
  })
})

describe('parseArgs e collectItemIds', () => {
  test('padroes, formas --x N e --x=N, e --show-description', () => {
    assert.deepEqual(script.parseArgs([]), { ok: true, days: 7, limit: 5, showDescription: false })
    assert.deepEqual(script.parseArgs(['--days', '3', '--limit=9', '--show-description']), {
      ok: true,
      days: 3,
      limit: 9,
      showDescription: true,
    })
  })

  test('rejeita desconhecido, fora de faixa e valor faltando', () => {
    for (const argv of [['--foo'], ['--days', '0'], ['--days', '31'], ['--limit', '21'], ['--days'], ['--days=abc'], ['--limit', '-1']]) {
      const r = script.parseArgs(argv)
      assert.equal(r.ok, false, argv.join(' '))
      assert.equal(typeof r.reason, 'string')
    }
  })

  test('collectItemIds junta env e Firestore sem repetir e descarta formato invalido', () => {
    const r = script.collectItemIds({ PLUGGY_ITEM_IDS: `${ITEM_ID}, curto ;${OTHER_ITEM_ID}` }, [ITEM_ID, 'x'.repeat(65)])
    assert.deepEqual(r.ids, [ITEM_ID, OTHER_ITEM_ID])
    assert.equal(r.invalid, 2)
    assert.deepEqual(script.collectItemIds({}, []), { ids: [], invalid: 0 })
  })
})

describe('summarizeWebhooks', () => {
  const codes = (r) => r.findings.map((f) => f.code)

  test('4 eventos ativos na URL esperada: so um achado ok; linhas sem query string', () => {
    const r = script.summarizeWebhooks(allWebhooks(), { expectedUrl: URL_OK })
    assert.deepEqual(codes(r), ['OK'])
    assert.equal(r.rows.length, 4)
    assert.ok(r.rows.every((x) => x.active && x.url === URL_OK))
    assert.ok(script.renderWebhookRows(r.rows).every((l) => l.includes('ativo')))
  })

  test('lista vazia: SEM_WEBHOOKS', () => {
    assert.deepEqual(codes(script.summarizeWebhooks([])), ['SEM_WEBHOOKS'])
    assert.deepEqual(codes(script.summarizeWebhooks(undefined)), ['SEM_WEBHOOKS'])
  })

  test('evento ausente e evento desativado (com disabledAt no texto)', () => {
    const list = [
      webhook('item/updated'),
      webhook('transactions/created', { disabledAt: new Date('2026-11-20T12:00:00Z') }),
    ]
    const r = script.summarizeWebhooks(list)
    const byCode = Object.fromEntries(r.findings.map((f) => [f.code + ':' + f.text.split(':')[0], f]))
    assert.ok(byCode['DESATIVADO:transactions/created'].text.includes('20/11/2026 09:00:00'))
    assert.ok(byCode['AUSENTE:transactions/updated'])
    assert.ok(byCode['AUSENTE:transactions/deleted'])
    assert.ok(!codes(r).includes('OK'))
    const disabledRow = script.renderWebhookRows(r.rows).find((l) => l.includes('transactions/created'))
    assert.match(disabledRow, /DESATIVADO 20\/11\/2026 09:00:00/)
  })

  test('URL diferente da esperada e URLs divergentes sem URL esperada', () => {
    const other = 'https://antigo.exemplo.test/webhooks/pluggy'
    const list = EVENTS.map((e, i) => webhook(e, i === 0 ? { url: other } : {}))
    assert.ok(codes(script.summarizeWebhooks(list, { expectedUrl: URL_OK })).includes('URL_DIFERENTE'))
    assert.ok(codes(script.summarizeWebhooks(list)).includes('URLS_DIVERGENTES'))
  })

  test('duplicado ativo e URL fora das regras (query string), sem vazar a query', () => {
    const list = [
      ...allWebhooks(),
      webhook('item/updated', { id: 'dup' }),
      webhook('transactions/deleted', { id: 'q', url: `${URL_OK}?token=segredo-na-url`, disabledAt: new Date() }),
    ]
    const r = script.summarizeWebhooks(list)
    assert.ok(codes(r).includes('DUPLICADO'))
    const withQuery = script.summarizeWebhooks([...EVENTS.map((e) => webhook(e, { url: `${URL_OK}?token=segredo-na-url` }))])
    assert.ok(codes(withQuery).includes('URL_FORA_DAS_REGRAS'))
    const text = JSON.stringify([r, withQuery]) + script.renderWebhookRows(withQuery.rows).join('\n')
    assert.ok(!text.includes('segredo-na-url'))
  })
})

describe('lotes, atraso e comparacao', () => {
  test('pickRecentTransactions ordena por createdAt desc e limita', () => {
    const picked = script.pickRecentTransactions(defaultTxs(), 2)
    assert.deepEqual(picked.map((t) => t.id), ['tx-slow-2222', 'tx-fast-1111'])
  })

  test('clusterBatches agrupa por gap e ordena do mais novo ao mais velho', () => {
    const batches = script.clusterBatches(defaultTxs())
    assert.equal(batches.length, 2)
    assert.equal(batches[0].count, 2)
    assert.equal(batches[0].start.toISOString(), '2026-11-24T09:00:05.000Z')
    assert.equal(batches[0].end.toISOString(), '2026-11-24T09:00:20.000Z')
    assert.equal(batches[1].count, 1)
    assert.deepEqual(script.clusterBatches([]), [])
    const far = [tx('a', '2026-11-24T09:00:00Z'), tx('b', '2026-11-24T09:31:00Z')]
    assert.equal(script.clusterBatches(far).length, 2)
    assert.equal(script.clusterBatches(far, 40 * 60 * 1000).length, 1)
  })

  test('serverLagMs e classifyLag nos limites', () => {
    assert.equal(script.serverLagMs('2026-11-24T09:00:00Z', '2026-11-24T09:00:04Z'), 4000)
    assert.equal(script.serverLagMs(null, NOW), null)
    assert.equal(script.classifyLag(null), 'sem-importacao')
    assert.equal(script.classifyLag(script.LAG_FAST_MS), 'rapido')
    assert.equal(script.classifyLag(script.LAG_FAST_MS + 1), 'lento')
    assert.equal(script.classifyLag(-5 * 60 * 1000), 'inconsistente')
  })

  test('summarizeLag: webhook, polling, misto e sem amostra', () => {
    assert.match(script.summarizeLag([4000, 9000]), /compativel com webhook/)
    assert.match(script.summarizeLag([3 * 3600 * 1000]), /compativel com polling/)
    assert.match(script.summarizeLag([4000, 3 * 3600 * 1000]), /misto/)
    assert.match(script.summarizeLag([null]), /sem amostras/)
  })

  test('compareConnection: nunca recebeu webhook, webhook em dia, webhook velho, servidor atrasado, sem doc', () => {
    const item = defaultItem(ITEM_ID)
    const hint = (conn) => script.compareConnection({ item, connection: conn, now: NOW }).hints.map((h) => h.code)
    assert.ok(hint(defaultConnection()).includes('NUNCA_RECEBEU_WEBHOOK'))
    assert.deepEqual(
      hint(defaultConnection({ lastWebhookAt: new Date('2026-11-24T09:00:10Z'), lastWebhookEvent: 'item/updated' })),
      ['WEBHOOK_EM_DIA'],
    )
    assert.ok(
      hint(defaultConnection({ lastWebhookAt: new Date('2026-11-20T09:00:00Z') })).includes(
        'WEBHOOK_ANTERIOR_A_ULTIMA_ATUALIZACAO',
      ),
    )
    assert.ok(
      hint(defaultConnection({ bankUpdatedAt: new Date('2026-11-23T09:00:00Z') })).includes('SERVIDOR_ATRASADO'),
    )
    assert.deepEqual(hint(null), ['SEM_DOC_NO_FIRESTORE'])
  })

  test('buildTransactionRow: self_transfer importada nao vira lancamento; sem importacao fica nula', () => {
    const [fast, slow, none] = defaultTxs()
    const imports = defaultImports()
    const a = script.buildTransactionRow(fast, imports[fast.id])
    assert.equal(a.lag, '+4s')
    assert.equal(a.visibleAsEntry, true)
    const b = script.buildTransactionRow(slow, imports[slow.id])
    assert.equal(b.appStatus, 'review/self_transfer')
    assert.equal(b.visibleAsEntry, false)
    assert.ok(script.renderTransactionRows([b], { firestore: true }).join('\n').includes('nao vira lancamento'))
    const c = script.buildTransactionRow(none, undefined)
    assert.equal(c.lag, null)
    assert.equal(c.appStatus, null)
  })
})

describe('main', () => {
  test('caminho completo com Firestore: webhooks, item, lotes, atraso, dica; sem vazar segredo, itemId nem numeros', async () => {
    const { code, out } = await run({
      env: fullEnv({ WEBHOOK_URL: URL_OK }),
      firestore: fakeFirestore({ connections: [defaultConnection()], imports: defaultImports() }),
    })
    const text = out.text()
    assert.equal(code, 0)
    assert.match(text, /== Webhooks registrados na Pluggy ==/)
    assert.match(text, /\[ok\] os 4 eventos esperados estao ativos na URL esperada/)
    assert.match(text, /item aaaaaaaa/)
    assert.match(text, /conector MeuPluggy/)
    assert.match(text, /lastUpdatedAt .*24\/11\/2026 06:00:00/)
    assert.match(text, /lotes de createdAt na Pluggy/)
    assert.match(text, /\+4s/)
    assert.match(text, /review\/self_transfer \(nao vira lancamento\)/)
    assert.match(text, /misto: 1 rapida\(s\) e 1 lenta\(s\)/)
    assert.match(text, /nunca recebeu webhook/)
    assert.ok(!text.includes(CLIENT_SECRET))
    assert.ok(!text.includes(ITEM_ID), 'itemId inteiro vazou')
    assert.ok(!text.includes(ACCOUNT_ID), 'accountId inteiro vazou')
    assert.ok(!text.includes('123456789'), 'numero de conta vazou')
    assert.ok(!text.includes('MARIA SILVA'), 'descricao sem --show-description')
  })

  test('--show-description inclui a descricao truncada e com numeros mascarados', async () => {
    const { out } = await run({
      argv: ['--show-description'],
      firestore: fakeFirestore({ connections: [defaultConnection()], imports: defaultImports() }),
    })
    const text = out.text()
    assert.match(text, /descricao/)
    assert.match(text, /PIX ENVIADO - DES: MARIA SIL(?!VA)/) // truncada em 28 caracteres
    assert.ok(!text.includes('12345678901'))
  })

  test('so le: dateFrom usa --days e a Pluggy so recebe as 4 chamadas de leitura', async () => {
    const calls = []
    await run({ argv: ['--days', '3'], pluggy: fakePluggy({ calls }) })
    assert.deepEqual([...new Set(calls.map((c) => c[0]))].sort(), [...ALLOWED_PLUGGY_METHODS].sort())
    const fetchTx = calls.find((c) => c[0] === 'fetchAllTransactions')
    assert.deepEqual(fetchTx[2], { dateFrom: '2026-11-21' })
  })

  test('sem credencial do Firestore: avisa, nunca cria o leitor e segue so com a Pluggy', async () => {
    let created = false
    const { code, out } = await run({
      createFirestore: async () => {
        created = true
        return fakeFirestore()
      },
    })
    const text = out.text()
    assert.equal(code, 0)
    assert.equal(created, false)
    assert.match(text, /sem FIREBASE_SERVICE_ACCOUNT_FILE/)
    assert.match(text, /sem Firestore/)
    assert.ok(!/nunca recebeu webhook/.test(text))
  })

  test('Firestore com erro: degrada com aviso (segredo mascarado) e segue so com a Pluggy', async () => {
    const { code, out } = await run({
      env: fullEnv({ FIREBASE_SERVICE_ACCOUNT_FILE: '/fora/do/repo/chave.json' }),
      createFirestore: async () => {
        throw new Error(`sem permissao ${CLIENT_SECRET}`)
      },
    })
    const text = out.text()
    assert.equal(code, 0)
    assert.match(text, /Firestore indisponivel/)
    assert.match(text, /item aaaaaaaa/)
    assert.ok(!text.includes(CLIENT_SECRET))
  })

  test('itemIds vem tambem do Firestore quando PLUGGY_ITEM_IDS nao existe; doc ausente gera dica', async () => {
    const env = fullEnv({ FIREBASE_SERVICE_ACCOUNT_FILE: '/fora/do/repo/chave.json' })
    delete env.PLUGGY_ITEM_IDS
    const calls = []
    const { out } = await run({
      env,
      pluggy: fakePluggy({ calls }),
      firestore: fakeFirestore({ connections: [defaultConnection({ itemId: OTHER_ITEM_ID })] }),
    })
    assert.deepEqual(calls.filter((c) => c[0] === 'fetchItem').map((c) => c[1]), [OTHER_ITEM_ID])
    const env2 = fullEnv({ FIREBASE_SERVICE_ACCOUNT_FILE: '/fora/do/repo/chave.json' })
    const second = await run({ env: env2, firestore: fakeFirestore({ connections: [] }) })
    assert.match(second.out.text(), /nao ha bankConnections\/\{itemId\}/)
    assert.ok(out.text().length > 0)
  })

  test('erro ao listar webhooks: codigo 1, mas os itens ainda sao lidos', async () => {
    const { code, out } = await run({ pluggy: fakePluggy({ failWebhooks: new Error(`403 ${CLIENT_SECRET}`) }) })
    const text = out.text()
    assert.equal(code, 1)
    assert.match(text, /nao foi possivel listar os webhooks/)
    assert.match(text, /item aaaaaaaa/)
    assert.ok(!text.includes(CLIENT_SECRET))
  })

  test('erro ao ler um item: codigo 1 e mensagem sem segredo nem itemId inteiro', async () => {
    const { code, out } = await run({
      pluggy: fakePluggy({ failItem: new Error(`falhou ${CLIENT_SECRET} em /items/${ITEM_ID}`) }),
    })
    const text = out.text()
    assert.equal(code, 1)
    assert.match(text, /falhou \[oculto\] em \/items\/aaaaaaaa\.\.\./)
    assert.ok(!text.includes(CLIENT_SECRET))
    assert.ok(!text.includes(ITEM_ID))
  })

  test('sem itens para ler: avisa e termina com 0', async () => {
    const env = fullEnv()
    delete env.PLUGGY_ITEM_IDS
    const calls = []
    const { code, out } = await run({ env, pluggy: fakePluggy({ calls }) })
    assert.equal(code, 0)
    assert.match(out.text(), /nenhum item para ler/)
    assert.ok(!calls.some((c) => c[0] === 'fetchItem'))
  })

  test('variavel obrigatoria ausente ou argumento invalido: 1 sem tocar na Pluggy', async () => {
    for (const name of ['PLUGGY_CLIENT_ID', 'PLUGGY_CLIENT_SECRET']) {
      const env = fullEnv()
      delete env[name]
      let created = false
      const out = collector()
      const code = await script.main({
        env,
        argv: [],
        createClient: () => {
          created = true
          return fakePluggy()
        },
        log: out.log,
        logError: out.logError,
      })
      assert.equal(code, 1, name)
      assert.equal(created, false)
      assert.ok(out.lines.some((l) => l.includes(name)))
      assert.ok(!out.text().includes(CLIENT_SECRET))
    }
    const bad = await run({ argv: ['--days', '99'] })
    assert.equal(bad.code, 1)
    assert.match(bad.out.text(), /--days/)
  })

  test('WEBHOOK_URL invalida e ignorada com aviso (sem ecoar a URL)', async () => {
    const { code, out } = await run({ env: fullEnv({ WEBHOOK_URL: 'http://x.exemplo.test/webhooks/pluggy?token=segredo-na-url' }) })
    assert.equal(code, 0)
    assert.match(out.text(), /WEBHOOK_URL ignorada/)
    assert.ok(!out.text().includes('segredo-na-url'))
  })
})

describe('createFirestoreReader (so get/getAll)', () => {
  const snap = (id, data) => ({ id, exists: Boolean(data), data: () => data })

  test('fetchConnections devolve so campos de frescor, sem ownerId nem contas', async () => {
    const db = {
      collection: (name) => ({
        async get() {
          assert.equal(name, 'bankConnections')
          return {
            docs: [
              snap(ITEM_ID, {
                ownerId: 'dono-secreto',
                accounts: [{ id: 'x', name: 'Conta 99999999' }],
                lastSyncAt: { toDate: () => NOW },
                lastWebhookAt: null,
                bankUpdatedAt: { toDate: () => NOW },
                status: 'UPDATED',
              }),
            ],
          }
        },
      }),
    }
    const rows = await script.createFirestoreReader(db).fetchConnections()
    assert.equal(rows.length, 1)
    assert.equal(rows[0].itemId, ITEM_ID)
    assert.equal(rows[0].lastSyncAt.getTime(), NOW.getTime())
    assert.equal(rows[0].lastWebhookAt, null)
    assert.ok(!JSON.stringify(rows).includes('dono-secreto'))
    assert.ok(!JSON.stringify(rows).includes('99999999'))
  })

  test('fetchImports le em lotes de 300 via getAll e ignora docs inexistentes', async () => {
    const batches = []
    const db = {
      collection: () => ({ doc: (id) => ({ id }) }),
      async getAll(...refs) {
        batches.push(refs.length)
        return refs.map((r) =>
          r.id === 'id-0'
            ? snap(r.id, { createdAt: { toDate: () => NOW }, status: 'imported', reason: null, description: 'nao deve sair' })
            : snap(r.id, undefined),
        )
      },
    }
    const ids = Array.from({ length: 301 }, (_, i) => `id-${i}`)
    const found = await script.createFirestoreReader(db).fetchImports(ids)
    assert.deepEqual(batches, [300, 1])
    assert.deepEqual(Object.keys(found), ['id-0'])
    assert.equal(found['id-0'].status, 'imported')
    assert.ok(!JSON.stringify(found).includes('nao deve sair'))
    assert.deepEqual(await script.createFirestoreReader(db).fetchImports([]), {})
  })

  test('hasFirestoreCredential', () => {
    assert.equal(script.hasFirestoreCredential({}), false)
    assert.equal(script.hasFirestoreCredential({ FIREBASE_SERVICE_ACCOUNT_FILE: '/x.json' }), true)
    assert.equal(script.hasFirestoreCredential({ FIRESTORE_EMULATOR_HOST: 'localhost:8080' }), true)
  })
})

describe('guarda estatica: somente leitura', () => {
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const code = fs
    .readFileSync(path.join(ROOT, 'scripts', 'diagnose-webhooks.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

  test('chama so metodos de leitura da Pluggy', () => {
    const called = new Set([...code.matchAll(/\bpluggy\.([A-Za-z]+)\(/g)].map((m) => m[1]))
    assert.deepEqual([...called].sort(), [...ALLOWED_PLUGGY_METHODS].sort())
  })

  test('nao tem operacao de escrita na Pluggy nem no Firestore', () => {
    for (const word of [
      'createItem',
      'updateItem',
      'deleteItem',
      'createWebhook',
      'updateWebhook',
      'deleteWebhook',
      'createConnectToken',
      'batch(',
      'commit(',
      'bulkWriter',
      'runTransaction',
    ]) {
      assert.ok(!code.includes(word), `diagnose-webhooks.js contem ${word}`)
    }
    assert.ok(!/\.(set|update|delete|create)\(/.test(code), 'escrita em referencia de documento')
  })

  test('firebase-admin so entra por import dinamico, depois de checar a credencial', () => {
    assert.ok(!/from\s+['"]firebase-admin/.test(code))
    assert.ok(!/from\s+['"]\.\/lib\/admin\.js['"]/.test(code))
    assert.ok(/await import\(\s*['"]\.\/lib\/admin\.js['"]\s*\)/.test(code))
  })

  test('nao despeja objetos crus (console.dir, util.inspect, JSON.stringify de item)', () => {
    assert.ok(!code.includes('console.dir'))
    assert.ok(!code.includes('util.inspect'))
    assert.ok(!code.includes('JSON.stringify'))
  })
})
