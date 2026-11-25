// Guarda estatica das reacoes do Vintem a lancamentos e metas da Fase 4 (MASC-01 a MASC-04, D-05, D-09, D-16,
// UI-SPEC S2 e S4, T-04-15-01 a T-04-15-04).
// Rodar: node --test test/static/phase4-reactions.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, read, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const SHEET = 'src/components/launcher/LaunchSheet.tsx'
const GOALS = 'src/pages/GoalsPage.tsx'
const TOAST = 'src/components/ui/toast.tsx'
const VINTEM_TOAST = 'src/components/vintem/VintemToast.tsx'
const PROVIDER = 'src/contexts/VintemContext.tsx'
const HOME_HOOK = 'src/hooks/useHomeVintem.ts'
const SCREEN_FILES = [SHEET, GOALS, TOAST, VINTEM_TOAST]
// Mesmas formulas proibidas da guarda phase3-final (item d): orcamento so no nucleo.
const BUDGET_FORMULAS = [/\bsafeCents\s*-/, /\bincomeCents\s*-/, /\blimitCents\s*\*\s*80\b/, /\*\s*100\s*>=/]

test('LaunchSheet chama onLaunched depois de bumpData e de toast.show, sem await que bloqueie', () => {
  const src = code(SHEET)
  const bump = src.indexOf('bumpData()')
  const show = src.indexOf('toast.show(message')
  const launched = src.indexOf('vintem.onLaunched(')
  assert.ok(bump >= 0 && show >= 0 && launched >= 0, 'faltam bumpData, toast.show ou onLaunched')
  assert.ok(bump < show && show < launched, 'onLaunched deve vir depois de bumpData e de toast.show')
  assert.match(src, /void vintem\.onLaunched\(/, 'onLaunched nao pode bloquear o fluxo (use void)')
  assert.match(src, /import \{ useVintem \} from "@\/contexts\/VintemContext"/, 'LaunchSheet sem importar useVintem')
  for (const kind of ['"gasto"', '"receita"', '"porquinho-guardou"', '"porquinho-retirou"']) {
    assert.ok(src.includes(kind), `LaunchSheet sem o tipo ${kind}`)
  }
  // A reacao nasce uma vez por gravacao confirmada: nunca antes do await da gravacao.
  const saved = src.lastIndexOf('SAVE_TIMEOUT_MS')
  assert.ok(saved >= 0 && saved < launched, 'onLaunched antes da gravacao confirmada')
})

test('GoalsPage so chama onGoal quando o aporte fecha a meta e mostra o Vintem surpreso no erro de carga', () => {
  const src = code(GOALS)
  assert.match(src, /vintem\.onGoal\(\{ valorCents: toCents\(amount\) \}\)/, 'GoalsPage sem onGoal com o valor do aporte')
  const compare = /toCents\(contributing\.currentAmount\) \+ toCents\(amount\) >= toCents\(contributing\.targetAmount\)/
  assert.match(src, compare, 'a condicao nao compara currentAmount + amount com targetAmount')
  assert.match(src, /if \(closes\) vintem\.onGoal\(/, 'onGoal sem a condicao da meta batida')
  assert.match(src, /<VintemEmpty pose="surpreso" \/>/, 'erro de carga sem VintemEmpty surpreso')
  assert.match(src, /import \{ VintemEmpty \} from '@\/components\/vintem\/VintemEmpty'/)
  // O texto e o botao do erro continuam como estavam.
  assert.ok(src.includes('Não foi possível carregar as metas.'), 'texto de erro alterado')
  assert.ok(src.includes('Tentar de novo'), 'botao Tentar de novo alterado')
  assert.ok(src.indexOf('<VintemEmpty pose="surpreso" />') < src.indexOf('<Notice'), 'o Vintem deve vir acima do Notice')
})

test('toast.tsx tem o item custom claro, Esc e o rotulo do Vintem, e o toast comum segue com fundo de acao', () => {
  const src = code(TOAST)
  assert.match(src, /custom\?: React\.ReactNode/, 'ToastOptions sem custom')
  assert.ok(src.includes('bg-surface-2') && src.includes('border-border'), 'item custom sem superficie clara com borda')
  assert.ok(src.includes('Escape'), 'item custom sem Esc')
  assert.ok(src.includes('aria-label="Dispensar fala do OINC"'), 'sem o rotulo "Dispensar fala do OINC"')
  assert.ok(src.includes('aria-label="Fechar aviso"') && src.includes('bg-action'), 'o toast comum perdeu o fundo de acao')
  // O item custom nunca usa fundo de acao nem fundo escuro (o corpo oliva do Vintem sumiria).
  const custom = src.slice(src.indexOf('if (isCustom)'), src.indexOf('return (', src.indexOf('if (isCustom)') + 20) + 900)
  assert.ok(!/bg-action|bg-primary|bg-black|bg-foreground/.test(custom.split('Fechar aviso')[0]), 'item custom com fundo escuro')
  assert.match(src, /h-11 w-11[^"]*"[\s\S]{0,200}<X /, 'botao x do custom sem h-11 w-11')
  assert.ok(src.includes('bottom-[calc(92px+env(safe-area-inset-bottom))]'), 'o conteiner inferior do toast mudou')
})

test('VintemToast: fala em texto React, sem line-clamp, sem HTML bruto e Vintem decorativo grande e inclinado', () => {
  const src = code(VINTEM_TOAST)
  assert.ok(!/line-clamp/.test(src), 'a fala do toast nunca e truncada')
  assert.ok(!/dangerouslySetInnerHTML|innerHTML/.test(src), 'HTML bruto na fala do toast')
  assert.match(src, /\{text\}/, 'a fala deve entrar como texto React')
  assert.match(src, /size="stage"/, 'Vintem do toast espia em tamanho grande (stage)')
  assert.match(src, /follow=\{false\}/, 'Vintem do toast nao deve seguir o cursor')
  assert.ok(!/<button/.test(src), 'o Vintem do toast nao e interativo')
  assert.match(src, /\.react\(reaction\)/, 'o toast nao roda a reacao em miniatura')
  assert.ok(!/bg-action|bg-primary/.test(src), 'toast do Vintem com fundo de acao')
})

test('o provedor decide pelo nucleo, e melhor esforco e nao registra valor nem nome', () => {
  const src = code(PROVIDER)
  assert.match(src, /reactionForLaunch\(/, 'provedor sem reactionForLaunch')
  assert.match(src, /launchRaw\(/, 'provedor sem launchRaw')
  assert.match(src, /isSpendSpike\(/, 'provedor sem isSpendSpike')
  assert.match(src, /loadBaseline\(/, 'provedor sem a linha de base em cache')
  assert.match(src, /CHEER_MS/, 'provedor sem CHEER_MS')
  assert.match(src, /durationMs: VINTEM_TOAST_MS/, 'toast do Vintem sem duracao propria')
  assert.match(src, /const VINTEM_TOAST_MS = 6000/, 'toast do Vintem nao dura 6 s')
  assert.ok(!/console\./.test(src), 'provedor nao deve registrar nada em console (T-04-15-02)')
  assert.ok(!/dangerouslySetInnerHTML/.test(src), 'HTML bruto no provedor')
  const onLaunched = src.slice(src.indexOf('const onLaunched'), src.indexOf('const onGoal'))
  assert.match(onLaunched, /try \{/, 'onLaunched sem try')
  assert.match(onLaunched, /catch \{/, 'onLaunched sem catch')
  assert.match(onLaunched, /if \(view === null \|\| view\.isPast\) return/, 'onLaunched sem o portao da view')
})

test('o humor de fundo le a comemoracao do provedor so enquanto ela vale', () => {
  const src = code(HOME_HOOK)
  assert.match(src, /cheer\b[^;]*untilMs/, 'useHomeVintem sem a validade da comemoracao')
  assert.match(src, /cheer: cheerKind/, 'a comemoracao nao entra nos fatos de humor')
  const provider = code(PROVIDER)
  assert.match(provider, /kind: 'meta-batida'/, 'onGoal nao arma a comemoracao de meta')
  assert.match(provider, /kind === 'porquinho-guardou'\) setCheer/, 'guardar no Porquinho nao arma a comemoracao')
})

test('nenhuma formula de orcamento nos arquivos de tela e de provedor desta fatia', () => {
  for (const f of [SHEET, GOALS, TOAST, VINTEM_TOAST, PROVIDER, HOME_HOOK]) {
    const src = code(f)
    for (const re of BUDGET_FORMULAS) assert.ok(!re.test(src), `${f} escreve formula de orcamento: ${re}`)
  }
})

test('escala tipografica, pesos, emoji e alvos de toque limpos nos arquivos alterados', () => {
  assert.deepEqual(scaleProblems(SCREEN_FILES), [])
  assert.deepEqual(touchProblems(SCREEN_FILES), [])
  assert.ok(read(VINTEM_TOAST).includes('text-base font-normal'), 'fala do toast fora de 16/400')
})
