// Guarda final e transversal da Fase 6 (plano 06-15): so confere o que atravessa os planos do cartao de
// credito (cobertura dos requisitos CARD e CENT, regras e indice, modulos do nucleo, ausencia de emoji,
// dock de 9 destinos, servidor sem campo do titular, historico com ensaio e copia de seguranca, sync e
// webhook intactos). O detalhe de cada tela fica nas guardas por plano (phase6-*.test.js).
// Rodar: node --test test/static/phase6-final.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, code, exists, listSrc, read } from './helpers/phase3-1.js'

const PHASE_DIR = '.planning/phases/06-cart-o-de-cr-dito'
const EMOJI = /\p{Extended_Pictographic}|\p{Emoji_Presentation}|\u{FE0F}/u

/** Requisitos que a fase prometeu. */
const REQUIREMENTS = ['CARD-01', 'CARD-02', 'CARD-03', 'CARD-04', 'CARD-05', 'CARD-06', 'CARD-07', 'CARD-08', 'CENT-03', 'CENT-04']

/** Arquivos novos da fase que ficam de fora de qualquer emoji (pastas inteiras entram por listSrc). */
const NEW_UI = [
  'src/pages/CardsPage.tsx',
  'src/components/settings/AccountsCard.tsx',
  'src/components/settings/CardSettingsSheet.tsx',
  'src/components/dashboard/HomeCardSummary.tsx',
  'src/components/launcher/CardPicker.tsx',
  ...listSrc('src/components/cards'),
]

/** Modulos novos do nucleo puro. */
const CORE_MODULES = [
  'cards', 'cardBills', 'cardTx', 'cardInstallments', 'cardReconcile', 'cardPayments', 'cardCalendar', 'cardManual', 'cardAdopt',
].map((n) => `shared/core/${n}.js`)

// ---------------------------------------------------------------------------------------------
// (1) cobertura dos requisitos pelos planos
// ---------------------------------------------------------------------------------------------

/** Planos de implementacao: os de fechamento (06-14 e 06-15) listam todos os requisitos e provariam nada. */
function implementationPlans() {
  return fs
    .readdirSync(path.join(ROOT, PHASE_DIR))
    .filter((n) => /^06-\d\d-PLAN\.md$/.test(n) && !/^06-(14|15)-/.test(n))
}

function planRequirements(name) {
  const fm = read(`${PHASE_DIR}/${name}`).match(/^---\n([\s\S]*?)\n---/)
  assert.ok(fm, `${name} sem frontmatter`)
  const line = fm[1].match(/^requirements:\s*\[([^\]]*)\]/m)
  assert.ok(line, `${name} sem o campo requirements`)
  return line[1].split(',').map((s) => s.trim()).filter(Boolean)
}

test('os planos de implementacao cobrem CARD-01 a CARD-08, CENT-03 e CENT-04', () => {
  const plans = implementationPlans()
  assert.ok(plans.length >= 10, `poucos planos de implementacao: ${plans.length}`)
  const covered = new Set(plans.flatMap(planRequirements))
  const missing = REQUIREMENTS.filter((r) => !covered.has(r))
  assert.deepEqual(missing, [], `requisito sem plano: ${missing}`)
})

// ---------------------------------------------------------------------------------------------
// (2) regras e indice
// ---------------------------------------------------------------------------------------------

test('regras: cards so leitura e cardSettings entre as colecoes do cliente, sem if true', () => {
  const rules = code('firestore.rules')
  assert.ok(!/if\s+true/.test(rules), 'regra aberta (if true)')
  const client = rules.match(/function clientCollections\(\)\s*\{\s*return\s*\[([\s\S]*?)\];/)
  assert.ok(client, 'sem clientCollections')
  assert.ok(/'cardSettings'/.test(client[1]), 'cardSettings fora das colecoes do cliente')
  assert.ok(!/'cards'/.test(client[1]), 'cards nao pode ser escrito pelo cliente')
  const readOnly = rules.match(/match \/\{col\}\/\{id\}\s*\{\s*allow read: if[^;]*\[([^\]]*)\][^;]*;/)
  assert.ok(readOnly, 'sem o bloco somente leitura')
  assert.ok(/'cards'/.test(readOnly[1]), 'cards fora das colecoes somente leitura')
  assert.ok(!/allow (create|update|delete|write)[^;]*'cards'/.test(rules), 'cards com escrita do cliente')
})

test('indice de transactions por ownerId, cardId e date descendente, com ownerId primeiro', () => {
  const idx = JSON.parse(read('firestore.indexes.json')).indexes
  const hit = idx.find(
    (i) =>
      i.collectionGroup === 'transactions' &&
      i.fields.length === 3 &&
      i.fields[0].fieldPath === 'ownerId' &&
      i.fields[1].fieldPath === 'cardId' &&
      i.fields[2].fieldPath === 'date' &&
      i.fields[2].order === 'DESCENDING'
  )
  assert.ok(hit, 'sem o indice das compras do cartao')
})

// ---------------------------------------------------------------------------------------------
// (3) nucleo: modulos existem, sao puros e tem teste
// ---------------------------------------------------------------------------------------------

test('os modulos novos do nucleo existem, tem teste e so importam caminhos relativos', () => {
  for (const f of CORE_MODULES) {
    assert.ok(exists(f), `${f} ausente`)
    assert.ok(exists(f.replace(/\.js$/, '.test.js')), `${f} sem teste`)
    const src = code(f)
    const specs = [...src.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1])
    for (const spec of specs) assert.match(spec, /^\.\.?\//, `${f} importa pacote: ${spec}`)
    assert.ok(!/\b(Date\.now|new Date\(\))/.test(src.replace(/=\s*new Date\(\)/g, '')), `${f} le o relogio sem ser por parametro`)
  }
  assert.ok(exists('shared/core/purity.test.js'), 'a guarda de pureza do nucleo sumiu')
})

// ---------------------------------------------------------------------------------------------
// (4) nenhum emoji nos arquivos novos
// ---------------------------------------------------------------------------------------------

test('nenhum arquivo novo da fase contem emoji', () => {
  assert.ok(NEW_UI.length >= 11, 'a lista de arquivos novos encolheu')
  const bad = []
  for (const f of [...NEW_UI, ...CORE_MODULES]) {
    assert.ok(exists(f), `${f} ausente`)
    if (EMOJI.test(read(f))) bad.push(f)
  }
  assert.deepEqual(bad, [], `emoji em: ${bad}`)
})

// ---------------------------------------------------------------------------------------------
// (5) dock de 9 destinos, Cartoes depois de Contas fixas (D-11)
// ---------------------------------------------------------------------------------------------

test('o dock tem exatamente 9 destinos e Cartoes fica depois de Contas fixas e antes de Metas (D-11)', () => {
  const src = code('src/components/layout/NavRail.tsx')
  const block = src.match(/const DESTINATIONS: Destination\[\] = \[([\s\S]*?)\n\]/)
  assert.ok(block, 'sem a lista DESTINATIONS')
  const hrefs = [...block[1].matchAll(/href: '([^']+)'/g)].map((m) => m[1])
  assert.equal(hrefs.length, 9, `o dock deve ter 9 destinos, tem ${hrefs.length}`)
  const fixed = hrefs.indexOf('/contas-fixas')
  const cards = hrefs.indexOf('/cartoes')
  const goals = hrefs.indexOf('/metas')
  assert.ok(fixed >= 0 && cards === fixed + 1 && goals === cards + 1, `ordem do dock: ${hrefs}`)
  assert.match(block[1], /href: '\/cartoes', label: 'Cartões', icon: CreditCard/)
})

// ---------------------------------------------------------------------------------------------
// (6) servidor: nada do titular, historico com ensaio e copia, sync e webhook intactos
// ---------------------------------------------------------------------------------------------

test('card-sync.js e card-payments.js nao referenciam chaves do titular (D-13 e privacidade)', () => {
  const HOLDER = /\b(holderName|holder|taxNumber|cpf|cnpj|additionalCards|cardNumber|accountNumber|titular|documentNumber)\b/i
  for (const f of ['server/src/card-sync.js', 'server/src/card-payments.js']) {
    assert.ok(!HOLDER.test(code(f)), `${f} referencia campo do titular`)
  }
})

test('o historico do cartao so se aplica com ensaio e copia de seguranca recente (D-13)', () => {
  assert.ok(exists('server/scripts/card-history.js'), 'sem o script do historico')
  const script = code('server/scripts/card-history.js')
  assert.match(script, /apply\s*=\s*false/, 'o ensaio deve ser o padrao')
  assert.ok(script.includes('--backup'), 'sem a exigencia de --backup')
  assert.ok(script.includes('assertRecentBackup'), 'sem a checagem da copia recente')
  // a copia e exigida antes de qualquer gravacao do modo aplicar
  const run = script.slice(script.indexOf('export async function runCardHistory'))
  const applyAt = run.indexOf('if (apply === true)')
  const backupAt = run.indexOf('assertBackupFile(')
  const syncAt = run.search(/syncCardTransactions|refreshCardAggregates/)
  assert.ok(applyAt >= 0 && backupAt > applyAt, 'a copia nao e exigida dentro do modo aplicar')
  assert.ok(syncAt < 0 || backupAt < syncAt, 'a copia de seguranca vem depois da gravacao')
  assert.ok(exists('server/scripts/lib/backup-guard.js'), 'sem o guarda de copia')
  assert.ok(code('server/src/card-sync.js').includes('historyBaselineAt'), 'card-sync nao le historyBaselineAt')
})

test('webhook.js e app.js nao referenciam o cartao e a interface nao promete tempo real (D-14)', () => {
  for (const f of ['server/src/webhook.js', 'server/src/app.js']) {
    assert.ok(!/card-sync|card-payments|card-probe|cardSync|syncCard/i.test(code(f)), `${f} referencia o cartao`)
  }
  const bad = []
  for (const f of NEW_UI) {
    if (/tempo real|em tempo|ao vivo/i.test(code(f))) bad.push(f)
  }
  assert.deepEqual(bad, [], `promessa de tempo real em: ${bad}`)
})

// ---------------------------------------------------------------------------------------------
// (7) interface: so servicos, sem esqueleto antigo, chip do lancamento (D-12)
// ---------------------------------------------------------------------------------------------

test('a interface do cartao nao importa firebase direto (so servicos)', () => {
  const bad = []
  for (const f of NEW_UI) {
    for (const m of code(f).matchAll(/from\s+["']([^"']+)["']/g)) {
      if (/^firebase(\/|$)/.test(m[1]) || /lib\/firebase/.test(m[1])) bad.push(`${f}: ${m[1]}`)
    }
  }
  assert.deepEqual(bad, [], `import direto de firebase: ${bad}`)
})

test('AccountsSkeletonCard.tsx nao existe mais', () => {
  assert.ok(!exists('src/components/settings/AccountsSkeletonCard.tsx'))
})

test('LaunchSheet usa manualCardFields, sem rotulo provisorio, e o cartao so aparece na aba Gasto (D-12)', () => {
  const src = code('src/components/launcher/LaunchSheet.tsx')
  assert.ok(src.includes('manualCardFields'), 'LaunchSheet sem manualCardFields')
  assert.doesNotMatch(src, /em breve/i, 'rotulo provisorio do chip Cartao')
  assert.match(src, /const onCard = tab === "gasto" && /, 'o cartao so vale na aba Gasto')
  assert.match(src, /tab === "gasto" \? \(\s*<div[^>]*>\s*<p[^>]*>Categoria<\/p>\s*<div[^>]*>\s*<Chip[\s\S]*?Cartão/, 'chip fora do bloco da aba Gasto')
})

// ---------------------------------------------------------------------------------------------
// (8) auditores e guardas por plano
// ---------------------------------------------------------------------------------------------

test('audit.mjs e theme.mjs listam /cartoes', () => {
  assert.ok(code('scripts/ux-audit/audit.mjs').includes("'/cartoes'"), 'audit.mjs sem /cartoes')
  assert.ok(code('scripts/ux-audit/theme.mjs').includes("'/cartoes'"), 'theme.mjs sem /cartoes')
})

test('as guardas por plano da fase continuam na suite (nada foi apagado para fechar a fase)', () => {
  for (const g of ['audit', 'bill-detail', 'calendar', 'cards-ui', 'dock', 'launch', 'settings', 'transactions']) {
    assert.ok(exists(`test/static/phase6-${g}.test.js`), `phase6-${g}.test.js ausente`)
  }
  for (const f of ['server/test/emu/card-sync.test.js', 'server/test/emu/card-history.test.js', 'server/test/emu/card-payments.test.js', 'server/test/backup-guard.test.js']) {
    assert.ok(exists(f), `${f} ausente`)
  }
})
