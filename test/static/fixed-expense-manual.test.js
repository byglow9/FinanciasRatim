// Guarda estatica de REV-03 / D-02: marcar conta fixa como paga e sempre manual. Grava so em
// fixedExpensePayments; nunca cria nem altera lancamento, e o servidor e o nucleo compartilhado
// nao conhecem contas fixas (o banco nunca cria nem vincula esse pagamento).
// Rodar: node --test test/static/fixed-expense-manual.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
// Remove comentarios de bloco e de linha para nao dar falso positivo em texto explicativo.
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')

function walk(dir, exts, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue
      walk(full, exts, out)
    } else if (exts.some((e) => entry.name.endsWith(e))) out.push(full)
  }
  return out
}

const SERVICE = 'src/services/fixedExpenses.service.ts'
const HOOK = 'src/hooks/useCycleBills.ts'

test('markAsPaid grava em PAY_COL e nao toca lancamentos', () => {
  const text = read(SERVICE)
  const start = text.indexOf('export async function markAsPaid')
  const end = text.indexOf('export async function unmarkAsPaid')
  assert.ok(start >= 0 && end >= 0 && start < end, 'cabecalhos de markAsPaid e unmarkAsPaid nao encontrados em ordem')
  const body = code(text.slice(start, end))
  assert.ok(body.trim().length > 0, 'o trecho de markAsPaid nao pode ser vazio')
  assert.ok(body.includes('PAY_COL'), 'markAsPaid precisa gravar em PAY_COL')
  for (const word of ['transactions', 'addTransaction', 'TRANSACTIONS']) {
    assert.ok(!body.includes(word), `markAsPaid menciona ${word}`)
  }
})

test('PAY_COL continua sendo a colecao fixedExpensePayments', () => {
  assert.match(code(read(SERVICE)), /const PAY_COL\s*=\s*'fixedExpensePayments'/)
})

test('o hook de contas fixas por ciclo nao importa o servico de lancamentos e usa markAsPaid', () => {
  const src = code(read(HOOK))
  assert.ok(!/@\/services\/transactions\.service/.test(src), 'useCycleBills importa transactions.service')
  assert.ok(src.includes('markAsPaid('), 'o hook precisa chamar markAsPaid(')
  assert.ok(src.includes('unmarkAsPaid('), 'o hook precisa chamar unmarkAsPaid(')
})

test('servidor e nucleo compartilhado nao mencionam contas fixas', () => {
  const files = [
    ...walk(path.join(ROOT, 'server', 'src'), ['.js']),
    ...walk(path.join(ROOT, 'shared', 'core'), ['.js']),
  ]
  assert.ok(files.length >= 8, `a varredura deveria achar ao menos 8 arquivos .js, achou ${files.length}`)
  // Unica excecao (Fase 7, D-16): a carga do resumo da IA le as contas e os pagamentos para a fala
  // conhecer o mes. Leitura apenas; a guarda abaixo garante que nunca grava nelas.
  const readOnly = 'server/src/ai/snapshot.js'
  const hits = files
    .filter((f) => /fixedExpense/i.test(code(fs.readFileSync(f, 'utf8'))))
    .map((f) => path.relative(ROOT, f))
    .filter((f) => f !== readOnly)
  assert.deepEqual(hits, [], 'nada no servidor nem em shared/core pode tocar contas fixas (D-02)')
})

test('a carga do resumo da IA so le contas fixas e pagamentos, nunca grava', () => {
  const src = code(read('server/src/ai/snapshot.js'))
  assert.ok(/fixedExpense/i.test(src), 'a excecao so vale enquanto o arquivo le contas fixas')
  assert.ok(!/\)\s*\.(set|create|update|delete)\s*\(|\.add\s*\(/.test(src), 'snapshot.js nao pode gravar no Firestore')
  assert.ok(!/\bbatch\b|runTransaction|bulkWriter/i.test(src), 'snapshot.js nao pode gravar em lote')
})
