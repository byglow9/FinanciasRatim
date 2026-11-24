// assertRecentBackup (D-13): cartao de seguranca recente antes de reclassificar em massa.
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { assertRecentBackup } from '../scripts/lib/backup-guard.js'

const NOW = new Date('2026-11-25T12:00:00Z')
const HOURS = 3_600_000
const SECRET = 'SEGREDO-DESCRICAO-123'

describe('assertRecentBackup', () => {
  let dir

  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-guard-'))
  })

  after(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  function write(name, snapshot) {
    const file = path.join(dir, name)
    fs.writeFileSync(file, typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot))
    return file
  }

  const snap = (over = {}) => ({
    meta: { exportedAt: new Date(NOW.getTime() - 2 * HOURS).toISOString(), version: 1 },
    collections: {
      transactions: [{ id: 't1', data: { description: SECRET } }, { id: 't2', data: {} }],
      bankImports: [{ id: 'b1', data: {} }],
      settings: [],
    },
    ...over,
  })

  function refuses(file, pattern) {
    assert.throws(
      () => assertRecentBackup(file, { now: NOW }),
      (err) => {
        assert.match(err.message, pattern)
        // nunca imprime conteudo do arquivo nem o caminho
        assert.ok(!err.message.includes(SECRET))
        assert.ok(!err.message.includes(dir))
        return true
      }
    )
  }

  test('aceita arquivo no formato do export-firestore e devolve so contagens', () => {
    const out = assertRecentBackup(write('ok.json', snap()), { now: NOW })
    assert.deepEqual(out.counts, { transactions: 2, bankImports: 1 })
    assert.equal(out.ageHours, 2)
    assert.ok(!JSON.stringify(out).includes(SECRET))
  })

  test('aceita no limite de 24 horas', () => {
    const file = write('edge.json', snap({ meta: { exportedAt: new Date(NOW.getTime() - 24 * HOURS).toISOString(), version: 1 } }))
    assert.equal(assertRecentBackup(file, { now: NOW }).ageHours, 24)
  })

  test('recusa arquivo ausente, sem caminho informado e JSON invalido', () => {
    refuses(path.join(dir, 'nao-existe.json'), /ausente/)
    assert.throws(() => assertRecentBackup(undefined, { now: NOW }), /obrigatoria/)
    refuses(write('ruim.json', `{ "x": "${SECRET}" ,, }`), /JSON/)
  })

  test('recusa versao desconhecida e formato sem meta ou colecoes', () => {
    refuses(write('v2.json', snap({ meta: { exportedAt: new Date(NOW.getTime() - HOURS).toISOString(), version: 2 } })), /versao/)
    refuses(write('vazio.json', {}), /formato/)
    refuses(write('lista.json', []), /formato/)
  })

  test('recusa exportedAt invalido, com mais de 24 horas ou no futuro', () => {
    refuses(write('semdata.json', snap({ meta: { version: 1 } })), /invalida/)
    refuses(write('datalixo.json', snap({ meta: { version: 1, exportedAt: 'ontem' } })), /invalida/)
    refuses(write('velho.json', snap({ meta: { version: 1, exportedAt: new Date(NOW.getTime() - 25 * HOURS).toISOString() } })), /mais de 24 horas/)
    refuses(write('futuro.json', snap({ meta: { version: 1, exportedAt: new Date(NOW.getTime() + HOURS).toISOString() } })), /futuro/)
  })

  test('recusa colecao obrigatoria ausente', () => {
    refuses(write('sem-imports.json', snap({ collections: { transactions: [{ id: 't1', data: { d: SECRET } }] } })), /bankImports/)
    refuses(write('sem-tx.json', snap({ collections: { bankImports: [] } })), /transactions/)
  })
})
