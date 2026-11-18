// Guarda estatica das lacunas do UAT e da revisao de codigo da Fase 3 (tarefa rapida 261118-mkh).
// So texto-fonte, sem jsdom. Rodar: node --test test/static/phase3-gaps.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const exists = (f) => fs.existsSync(path.join(ROOT, f))
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')
// Remove comentarios para nao dar falso positivo em texto explicativo.
const strip = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const code = (f) => strip(read(f))

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}
const srcFiles = () =>
  walk(path.join(ROOT, 'src')).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.css'))

// HSL "h s% l%" para RGB 0-255.
function hslToRgb(h, s, l) {
  s /= 100
  l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255))
}

// ---------------------------------------------------------------- Tarefa 1: botoes de acao

test('tokens de acao em hex literal e sem divergir de --primary', () => {
  const css = code('src/index.css')
  const action = css.match(/--color-action:\s*(#[0-9a-fA-F]{6})\s*;/)
  const text = css.match(/--color-action-text:\s*(#[0-9a-fA-F]{6})\s*;/)
  assert.ok(action, '--color-action precisa ser hex literal')
  assert.ok(text, '--color-action-text precisa ser hex literal')
  assert.equal(text[1].toLowerCase(), '#ffffff')

  const primary = css.match(/--primary:\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*;/)
  assert.ok(primary, '--primary precisa seguir como triplete HSL')
  const [r, g, b] = hslToRgb(Number(primary[1]), Number(primary[2]), Number(primary[3]))
  const hex = action[1]
  const want = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  for (const [i, v] of [r, g, b].entries()) {
    assert.ok(Math.abs(v - want[i]) <= 1, `canal ${i} de --color-action diverge de --primary (${v} x ${want[i]})`)
  }
})

test('tema claro unico: color-scheme light no CSS e no HTML', () => {
  assert.match(code('src/index.css'), /color-scheme:\s*light/)
  assert.match(read('index.html'), /<meta\s+name="color-scheme"\s+content="light"/)
})

test('nenhum arquivo de src usa bg-primary solido nem text-primary-foreground', () => {
  for (const f of srcFiles()) {
    const src = strip(fs.readFileSync(f, 'utf8'))
    const rel = path.relative(ROOT, f)
    assert.doesNotMatch(src, /(?<![\w-])bg-primary(?![/\w-])/, `${rel} usa bg-primary solido (use bg-action)`)
    assert.doesNotMatch(src, /text-primary-foreground/, `${rel} usa text-primary-foreground (use text-action-text)`)
    assert.doesNotMatch(src, /bg-primary\/(90|80)/, `${rel} usa hover de bg-primary (use bg-action)`)
  }
})

test('o ramo ativo do NavRail usa bg-action text-action-text', () => {
  assert.match(code('src/components/layout/NavRail.tsx'), /bg-action text-action-text/)
})

test('iconSm tem rounded-md e Marcar pago movel nao combina size=icon com h-8/h-7', () => {
  assert.match(code('src/components/ui/button.tsx'), /iconSm:\s*"[^"]*rounded-md/)
  const list = code('src/components/fixed-expenses/FixedExpenseList.tsx')
  assert.match(list, /size="iconSm"/)
  assert.doesNotMatch(list, /size="icon"[\s\S]{0,80}?h-(7|8) w-(7|8)/)
  assert.doesNotMatch(list, /h-7 w-7/)
  assert.doesNotMatch(list, /'shrink-0 h-8 w-8/)
})

test('LaunchSheet compacto: chips na linha da categoria e teclado/CTA por altura de tela', () => {
  const sheet = code('src/components/launcher/LaunchSheet.tsx')
  const keypad = code('src/components/ui/money-keypad.tsx')
  // Chips de forma de pagamento dividem a linha do rotulo Categoria (sem linha propria).
  assert.match(sheet, /justify-between[^>]*>\s*<p[^>]*>Categoria<\/p>\s*<div[^>]*>\s*<Chip/)
  // Teclas e CTA diminuem em tela baixa, nunca abaixo do alvo de 44px (h-11).
  assert.match(keypad, /max-height:760px[^"]*h-12/)
  assert.match(keypad, /max-height:700px\)\]:h-11/)
  assert.match(sheet, /max-height:760px\)\]:h-12/)
  assert.doesNotMatch(keypad, /\bh-(8|9|10)\b/)
  // O Sheet compartilhado nao foi alterado para esconder a rolagem.
  assert.match(code('src/components/ui/sheet.tsx'), /max-h-\[92dvh\] overflow-y-auto/)
})

// ---------------------------------------------------------------- Tarefa 2: Central removida

test('Central de Limites removida: sem arquivos, sem rota e dock de 8 destinos sem Gauge', () => {
  assert.ok(!exists('src/pages/LimitsPage.tsx'))
  assert.ok(!exists('src/components/dashboard/CentralSummaryCard.tsx'))
  const app = code('src/App.tsx')
  assert.doesNotMatch(app, /\/limites|LimitsPage/)
  assert.equal([...app.matchAll(/<Route\s+path=/g)].length, 9)
  const dock = code('src/components/layout/NavRail.tsx')
  assert.doesNotMatch(dock, /\bGauge\b/)
  assert.equal([...dock.matchAll(/\{ href: '/g)].length, 8)
})

// ---------------------------------------------------------------- Tarefa 2: seletor de ciclo unico

const PAGES = ['src/pages/TransactionsPage.tsx', 'src/pages/CalendarPage.tsx', 'src/pages/FixedExpensesPage.tsx']

test('Transacoes, Calendario e Contas Fixas seguem o ciclo do topo, sem seletor de mes proprio', () => {
  for (const f of PAGES) {
    const src = code(f)
    assert.doesNotMatch(src, /MonthSelector/, `${f} ainda usa o MonthSelector`)
    assert.doesNotMatch(src, /setSelectedMonth/, `${f} ainda guarda mes proprio`)
    assert.match(src, /const selectedMonth = useCycleMonth\(\)/, `${f} nao deriva o mes do ciclo`)
  }
  // Casal e Relatorios seguem com o seletor de grade (pendencia da Fase 3.1): o componente fica.
  assert.ok(exists('src/components/shared/MonthSelector.tsx'))
})

test('o mes do ciclo e memoizado por cycle.key (sem laco de refetch)', () => {
  const hook = code('src/hooks/useCycleMonth.ts')
  assert.match(hook, /useMemo\(\(\) => cycleMonthDate\(cycle\), \[cycle\.key\]\)/)
  const lib = code('src/lib/cycleMonth.ts')
  assert.match(lib, /export function cycleMonthDate\b/)
  assert.match(lib, /cycle\.startParts\.year, cycle\.startParts\.month - 1, 1/)
})

test('CycleSelector redesenhado: lista por ano com periodo, Atual e Check, sem truncar o rotulo', () => {
  const src = code('src/components/layout/CycleSelector.tsx')
  for (const needle of [
    'role="listbox"',
    'role="option"',
    'role="group"',
    'aria-selected',
    'w-[min(320px,calc(100vw-32px))]',
    'rounded-[22px]',
    'h-12 w-full',
    '<Chip tone="ok">Atual</Chip>',
    '<Check ',
    '<ChevronDown',
    'dayMonth(cycle.startParts)',
    'setOffset(-index)',
    "'Home'",
    "'End'",
    "'Escape'",
  ]) {
    assert.ok(src.includes(needle), `CycleSelector sem ${needle}`)
  }
  // O rotulo nao trunca e nao ha aritmetica de data no fuso do host.
  assert.doesNotMatch(src, /\btruncate\b[^'"]*text-base font-bold/)
  assert.doesNotMatch(src, /new Date\(|date-fns/)
})

test('Calendario: legenda e + na linha do alternador, grade alta e detalhe do dia mantido', () => {
  const page = code('src/pages/CalendarPage.tsx')
  const tabsAt = page.indexOf('<Tabs ')
  const infoAt = page.indexOf('<Info ')
  const plusAt = page.indexOf('<Plus ')
  const gridAt = page.indexOf('{loading ? (')
  assert.ok(tabsAt > 0 && infoAt > tabsAt && plusAt > infoAt && gridAt > plusAt, 'ordem: alternador, legenda, +, grade')
  assert.doesNotMatch(page, /sm:hidden absolute/, 'o + nao e mais absoluto nem so do celular')
  for (const f of ['src/components/calendar/MonthCalendar.tsx', 'src/components/calendar/AgendaCalendar.tsx']) {
    const src = code(f)
    assert.match(src, /min-h-\[max\(320px,calc\(100dvh-296px\)\)\]/, `${f}: a grade nao cresce com a janela`)
    assert.match(src, /grid-rows-6/)
    assert.doesNotMatch(src, /aspect-square/, `${f}: celula quadrada impede a grade de ocupar a tela`)
    // O detalhe do dia segue como painel abaixo da grade (nao virou Sheet) e rola ate ele.
    assert.doesNotMatch(src, /ui\/sheet/)
    assert.match(src, /scrollIntoView/)
    assert.match(src, /size="iconSm"/)
  }
})

test('Contas Fixas mantem os tres cartoes de total e o + Nova, sem seletor de mes', () => {
  const src = code('src/pages/FixedExpensesPage.tsx')
  for (const needle of ['Total Mensal', 'Pagas', 'Pendentes', 'Nova']) {
    assert.ok(src.includes(needle), `FixedExpensesPage sem ${needle}`)
  }
  assert.doesNotMatch(src, /MonthSelector/)
})

// ---------------------------------------------------------------- Tarefa 3: CR-01 e WR-01

test('CR-01: o contexto expoe settingsStatus e reloadSettings e todo gravador checa o estado', () => {
  const src = code('src/contexts/AreaContext.tsx')
  assert.match(src, /type SettingsStatus = 'loading' \| 'ready' \| 'error'/)
  assert.match(src, /settingsStatus: SettingsStatus/)
  assert.match(src, /reloadSettings: \(\) => Promise<void>/)
  // O catch de carga marca erro, nunca cai em padroes.
  assert.match(src, /catch \{[\s\S]*?setSettingsStatus\('error'\)/)
  assert.doesNotMatch(src, /console\.error\('Error loading settings/)
  for (const writer of ['updateTabNames', 'updateCategoryDefs', 'updatePersonConfig', 'updateNotifications', 'updateTheme']) {
    const at = src.indexOf(`const ${writer} = async`)
    assert.ok(at > 0, `contexto sem ${writer}`)
    const body = src.slice(at, at + 400)
    assert.match(body, /assertReady\(\)/, `${writer} nao checa o estado antes de gravar`)
  }
  assert.match(src, /if \(statusRef\.current !== 'ready'\) throw settingsNotReadyError\(\)/)
})

test('CR-01: Home e Configuracoes mostram erro com Tentar de novo; hook e avaliador so rodam com ready', () => {
  const home = code('src/pages/DashboardPage.tsx')
  assert.match(home, /settingsStatus === 'error'/)
  assert.match(home, /Não foi possível carregar suas configurações\./)
  assert.match(home, /reloadSettings\(\)/)
  const settings = code('src/pages/SettingsPage.tsx')
  assert.match(settings, /settingsStatus === 'loading'/)
  assert.match(settings, /settingsStatus === 'error'/)
  assert.match(settings, /Tentar de novo/)
  assert.match(code('src/hooks/useCycleBudget.ts'), /enabled && settingsStatus === 'ready'/)
  const alerts = code('src/contexts/LimitAlertsContext.tsx')
  assert.match(alerts, /settingsStatus === 'ready'/)
  assert.doesNotMatch(alerts, /settingsLoading/)
})

test('WR-01: o servico grava por transacao e caminho pontilhado sobre o documento atual', () => {
  const src = code('src/services/settings.service.ts')
  assert.match(src, /runTransaction\(db,/)
  assert.match(src, /transaction\.get\(settingsRef\(\)\)/)
  assert.match(src, /\['personConfig\.' \+ person\]: next/)
  assert.match(src, /updater: \(current: PersonConfig\) => PersonConfig/)
  assert.match(src, /updater: \(current: CategoryDef\[\]\) => CategoryDef\[\]/)
  assert.match(src, /reconcileCategoryDefs\(data\.categories/)
  assert.match(src, /categoryDefs: next, categories: activeCategoryNames\(next\)/)
  // O contexto usa a mesma reconciliacao do nucleo e guarda o valor devolvido, nao o snapshot velho.
  const ctx = code('src/contexts/AreaContext.tsx')
  assert.match(ctx, /reconcileCategoryDefs\(settings\.categories/)
  assert.match(ctx, /const config = await savePersonConfig\(who, updater\)/)
  assert.match(ctx, /const defs = await saveCategoryDefs\(updater\)/)
})

test('WR-01: nenhum gravador recebe lista ou no calculado a partir do estado do contexto', () => {
  for (const f of ['src/components/settings/CategoryEditorSheet.tsx', 'src/components/settings/CycleIncomeCard.tsx']) {
    const src = code(f)
    assert.doesNotMatch(src, /updatePersonConfig\(\s*person,\s*(next|nextConfig)\b/, `${f} grava no pronto`)
    assert.doesNotMatch(src, /updateCategoryDefs\(\s*nextDefs\b/, `${f} grava a lista pronta`)
  }
  const sheet = code('src/components/settings/CategoryEditorSheet.tsx')
  assert.match(sheet, /updateCategoryDefs\(\(cur\) => buildDefs\(cur\)\.defs\)/)
  assert.match(sheet, /updateCategoryDefs\(\(cur\) => archiveCategory\(cur, archivedId\)\)/)
  assert.match(sheet, /updatePersonConfig\(person, \(cur\) => setCategoryLimit\(cur,/)
  const income = code('src/components/settings/CycleIncomeCard.tsx')
  assert.match(income, /updatePersonConfig\(person, \(cur\) => setSalaryDay\(cur, dayDraft\)\)/)
  assert.match(income, /updatePersonConfig\(person, \(cur\) => setExpectedIncome\(cur, incomeCents, scopeKey\)\)/)
  // Erro de regra lancado dentro do atualizador aparece sob o campo, nao como falha de conexao.
  assert.match(sheet, /isRuleError\(err\)/)
  assert.match(income, /isRuleError\(err\)/)
})

// ---------------------------------------------------------------- Tarefa 3: WR-03, WR-07 e WR-08

test('WR-03: bumpData depois de limite, renda, dia do salario e de lancar, editar ou apagar em Transacoes', () => {
  const sheet = code('src/components/settings/CategoryEditorSheet.tsx')
  assert.match(sheet, /if \(limitChanged\) bumpData\(\)/)
  const income = code('src/components/settings/CycleIncomeCard.tsx')
  assert.equal((income.match(/\bbumpData\(\)/g) ?? []).length, 2, 'renda e dia do salario chamam bumpData')
  // No dia do salario o avaliador roda DEPOIS do rekey (marcadores ja na chave nova).
  assert.ok(income.indexOf('await rekeyForSalaryDay(') < income.lastIndexOf('bumpData()'), 'bumpData do dia vem depois do rekey')
  const tx = code('src/pages/TransactionsPage.tsx')
  assert.match(tx, /await update\(editingTransaction\.id, data\)[\s\S]*await add\(data\)[\s\S]*bumpData\(\)/)
  assert.match(tx, /await remove\(id\)\s*bumpData\(\)/)
  assert.match(tx, /onDelete=\{handleDelete\}/)
  // O gatilho nao mora em useTransactions (Casal e Relatorios tambem o usam).
  assert.doesNotMatch(code('src/hooks/useTransactions.ts'), /bumpData/)
  // Virada de ciclo com a aba aberta reavalia.
  const alerts = code('src/contexts/LimitAlertsContext.tsx')
  assert.match(alerts, /const cycleKey = person \? cycleOf\(now, personConfigFor\(person\)\.salaryDay\)\.key : ''/)
  assert.match(alerts, /\[evaluate, dataVersion, cycleKey\]/)
})

test('WR-07: markAsPaid grava por setDoc com ID deterministico e a interface trava o duplo toque', () => {
  const svc = code('src/services/fixedExpenses.service.ts')
  assert.match(svc, /paymentDocId\(fixedExpenseId, year, month\)/)
  assert.match(svc, /await setDoc\(doc\(db, PAY_COL, id\)/)
  const markAt = svc.indexOf('export async function markAsPaid')
  assert.doesNotMatch(svc.slice(markAt, svc.indexOf('export async function unmarkAsPaid')), /addDoc\(/)
  const hook = code('src/hooks/useFixedExpenses.ts')
  assert.match(hook, /pendingToggles = useRef\(new Set<string>\(\)\)/)
  assert.match(hook, /if \(pendingToggles\.current\.has\(expenseId\)\) return/)
  assert.match(hook, /payments\.filter\(\s*\(p\) => p\.fixedExpenseId === expenseId/, 'desmarcar apaga todos os pagamentos da conta')
  assert.match(hook, /Promise\.all\(existingPayments\.map\(\(p\) => unmarkAsPaid\(p\.id\)\)\)/)
  const sections = code('src/components/dashboard/HomeSections.tsx')
  // O estado de pendencia vem antes do retorno antecipado (regra dos hooks).
  assert.ok(sections.indexOf('useState<ReadonlySet<string>>') < sections.indexOf('if (!view)'))
  assert.match(sections, /finally \{\s*setPendingKeys/)
  assert.match(sections, /pendingKeys=\{pendingKeys\}/)
  const card = code('src/components/dashboard/FixedMonthCard.tsx')
  assert.match(card, /disabled=\{readOnly \|\| pending\}/)
  assert.match(card, /aria-busy=\{pending \|\| undefined\}/)
})

test('WR-08: LaunchSheet grava com prazo e ID estavel; os servicos aceitam o ID e gravam por setDoc', () => {
  const sheet = code('src/components/launcher/LaunchSheet.tsx')
  assert.match(sheet, /import \{ withTimeout \} from "@shared\/core\/async\.js"/)
  assert.match(sheet, /SAVE_TIMEOUT_MS = 8000/)
  assert.equal((sheet.match(/withTimeout\(/g) ?? []).length, 2, 'gasto/receita e porquinho usam o prazo')
  assert.match(sheet, /docIds\.current\.tx \?\?= newTransactionId\(\)/)
  assert.match(sheet, /docIds\.current\.savings \?\?= newSavingsId\(\)/)
  assert.match(sheet, /Sem confirmação do servidor\. Confira em Transações antes de tentar de novo\./)
  assert.match(sheet, /\} finally \{\s*setSaving\(false\)/, 'saving sempre e liberado')
  for (const [f, fn] of [
    ['src/services/transactions.service.ts', 'newTransactionId'],
    ['src/services/savings.service.ts', 'newSavingsId'],
  ]) {
    const src = code(f)
    assert.match(src, new RegExp(`export function ${fn}\\(\\)`))
    assert.match(src, /id\?: string/)
    assert.match(src, /await setDoc\(doc\(db, COL, docId\)/)
  }
})
