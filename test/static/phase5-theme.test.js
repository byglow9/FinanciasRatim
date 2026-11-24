// Guarda do tema da Fase 5 (plano 05-06, D-08, D-09, IDEN-05): script inline do index.html executado em
// node:vm, paridade com shared/core/theme.js, boot e isolamento do useTheme.
// Rodar: node --test test/static/phase5-theme.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { code, read } from './helpers/phase3-1.js'
import { THEME_COLORS, THEME_KEY } from '../../shared/core/theme.js'

const HTML = read('index.html')

/** Texto do primeiro script inline (sem src) do index.html. */
function inlineScript() {
  const m = /<script>([\s\S]*?)<\/script>/.exec(HTML)
  assert.ok(m, 'index.html sem script inline')
  return m[1]
}

/**
 * Executa o script inline com document, localStorage e matchMedia falsos.
 * @param {{ stored?: string | null, storageThrows?: boolean, systemDark?: boolean, mediaThrows?: boolean }} opt
 */
function run(opt = {}) {
  const classes = new Set()
  const meta = { content: '#f5ecdb', setAttribute(name, value) { if (name === 'content') this.content = value } }
  const root = {
    style: {},
    classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) },
  }
  const document = {
    documentElement: root,
    querySelector: (sel) => (sel === 'meta[name="theme-color"]' ? meta : null),
  }
  const localStorage = {
    getItem(key) {
      if (opt.storageThrows) throw new Error('storage bloqueado')
      assert.equal(key, THEME_KEY)
      return opt.stored ?? null
    },
  }
  const window = {
    matchMedia() {
      if (opt.mediaThrows) throw new Error('sem matchMedia')
      return { matches: opt.systemDark === true }
    },
  }
  const sandbox = { document, localStorage, window }
  vm.runInNewContext(inlineScript(), sandbox)
  return { dark: classes.has('dark'), colorScheme: root.style.colorScheme, themeColor: meta.content }
}

test('index.html: script inline antes de qualquer link e do modulo, titulo Coinc e uma so theme-color', () => {
  const script = HTML.indexOf('<script>')
  assert.ok(script > 0, 'sem script inline')
  assert.ok(script < HTML.indexOf('<link'), 'o script vem antes do primeiro link')
  assert.ok(script < HTML.indexOf('type="module"'), 'o script vem antes do modulo')
  assert.ok(HTML.indexOf('<meta charset') < script, 'o script vem depois do charset')
  assert.ok(HTML.indexOf('name="theme-color"') < script, 'a meta theme-color ja existe quando o script roda')
  assert.equal((HTML.match(/<meta\s+name="theme-color"/g) ?? []).length, 1, 'uma so meta theme-color')
  assert.match(HTML, /<meta name="theme-color" content="#f5ecdb"/)
  assert.match(HTML, /<meta\s+name="color-scheme"\s+content="light dark"/)
  assert.match(HTML, /<title>Coinc<\/title>/)
  assert.doesNotMatch(HTML, /http-equiv/i, 'sem metas http-equiv de cache (o cabecalho do Hosting e a fonte, D-06)')
  assert.doesNotMatch(HTML, /only light/)
})

test('script inline: escuro liga a classe, o color-scheme e a cor da barra', () => {
  assert.deepEqual(run({ stored: 'escuro' }), { dark: true, colorScheme: 'dark', themeColor: '#0a1510' })
  assert.deepEqual(run({ stored: 'escuro', systemDark: false }), { dark: true, colorScheme: 'dark', themeColor: '#0a1510' })
})

test('script inline: claro desliga mesmo com o sistema escuro', () => {
  assert.deepEqual(run({ stored: 'claro', systemDark: true }), { dark: false, colorScheme: 'light', themeColor: '#f5ecdb' })
})

test('script inline: auto segue o sistema nos dois sentidos', () => {
  assert.deepEqual(run({ stored: 'auto', systemDark: true }), { dark: true, colorScheme: 'dark', themeColor: '#0a1510' })
  assert.deepEqual(run({ stored: 'auto', systemDark: false }), { dark: false, colorScheme: 'light', themeColor: '#f5ecdb' })
})

test('script inline: sem valor guardado o padrao e claro, mesmo com o sistema escuro (D-08 revisada)', () => {
  assert.deepEqual(run({ stored: null, systemDark: true }), { dark: false, colorScheme: 'light', themeColor: '#f5ecdb' })
  assert.deepEqual(run({ stored: null, systemDark: false }), { dark: false, colorScheme: 'light', themeColor: '#f5ecdb' })
  assert.deepEqual(run({ stored: 'auto', systemDark: true }).dark, true, 'auto guardado segue o sistema')
})

test('script inline: localStorage lancando cai no padrao claro; matchMedia lancando cai em claro', () => {
  assert.equal(run({ storageThrows: true, systemDark: true }).dark, false)
  assert.equal(run({ storageThrows: true, systemDark: false }).dark, false)
  assert.deepEqual(run({ stored: 'auto', mediaThrows: true }), { dark: false, colorScheme: 'light', themeColor: '#f5ecdb' })
  assert.deepEqual(run({ storageThrows: true, mediaThrows: true }).dark, false)
  assert.equal(run({ stored: 'escuro', mediaThrows: true }).dark, true, 'escuro forcado nao depende do matchMedia')
})

test('script inline: valor desconhecido vale claro, nunca auto (T-05-06-01)', () => {
  for (const stored of ['xyz', 'Escuro', 'ESCURO', ' escuro', 'Auto', 'AUTO', ' auto', 'auto ', 'dark', '']) {
    assert.equal(run({ stored, systemDark: false }).dark, false, `"${stored}" com sistema claro`)
    assert.equal(run({ stored, systemDark: true }).dark, false, `"${stored}" com sistema escuro`)
  }
})

test('script inline e shared/core/theme.js usam a mesma chave e as mesmas cores', () => {
  const script = inlineScript()
  assert.ok(script.includes(`'${THEME_KEY}'`), 'chave do script diverge de THEME_KEY')
  assert.ok(script.includes(`'${THEME_COLORS.escuro}'`), 'cor do escuro diverge')
  assert.ok(script.includes(`'${THEME_COLORS.claro}'`), 'cor do claro diverge')
  assert.match(HTML, new RegExp(`name="theme-color" content="${THEME_COLORS.claro}"`), 'a meta nasce com a cor do claro')
  const hexes = new Set(script.match(/#[0-9a-fA-F]{3,6}\b/g))
  assert.deepEqual([...hexes].sort(), [THEME_COLORS.claro, THEME_COLORS.escuro].sort(), 'o script so tem as duas cores do tema')
})

test('main.tsx chama initTheme antes de createRoot, depois das fontes e do CSS', () => {
  const src = code('src/main.tsx')
  assert.match(src, /import \{ initTheme \} from '\.\/hooks\/useTheme'/)
  assert.ok(src.indexOf('initTheme()') > 0, 'main.tsx nao chama initTheme()')
  assert.ok(src.indexOf('initTheme()') < src.indexOf('createRoot('), 'initTheme() antes do createRoot')
  assert.ok(src.indexOf("import './index.css'") < src.indexOf('initTheme()'))
})

test('useTheme nao importa servico nem contexto de dados e nao tem hex literal (D-09, T-05-06-04)', () => {
  const src = code('src/hooks/useTheme.ts')
  assert.doesNotMatch(src, /from '@\/(services|contexts)\//, 'sem servico nem contexto')
  assert.doesNotMatch(src, /from '\.\.\/(services|contexts)\//)
  assert.doesNotMatch(src, /firebase|firestore|fetch\(|AreaContext|useArea/i, 'nada de rede nem dados')
  assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b/, 'sem hex literal')
  assert.match(src, /THEME_KEY/)
  assert.match(src, /addEventListener\('storage'/, 'sincroniza abas pelo evento storage')
  assert.match(src, /prefers-color-scheme: dark/)
  assert.match(src, /useSyncExternalStore/)
})

test('useTheme: o padrao (sem valor, falha de leitura, servidor) e o claro, nunca auto', () => {
  const src = code('src/hooks/useTheme.ts')
  assert.match(src, /THEME_DEFAULT/, 'usa a constante do padrao')
  assert.doesNotMatch(src, /return 'auto'/, 'nenhum retorno de auto como padrao')
  assert.doesNotMatch(src, /getServerPref = \(\): ThemePref => 'auto'/)
  assert.match(src, /getServerPref = \(\): ThemePref => THEME_DEFAULT/)
})

test('AreaContext nao forca mais o tema claro', () => {
  const src = code('src/contexts/AreaContext.tsx')
  assert.doesNotMatch(src, /classList\.remove\('dark'\)/, 'o AreaContext desfaria o escuro')
})

// ---- Plano 05-06, tarefa 2: seletor Tema nos Ajustes ----

const GROUP = 'src/components/settings/ThemeGroup.tsx'
const CARD = 'src/components/settings/AppearanceCard.tsx'

test('ThemeGroup: radiogroup Tema do aplicativo com Automatico, Claro e Escuro na ordem do contrato', () => {
  const src = code(GROUP)
  assert.ok(src.includes('role="radiogroup"') && src.includes('aria-label="Tema do aplicativo"'))
  assert.ok(src.includes('role="radio"') && src.includes('aria-checked'))
  assert.ok(src.includes('min-h-14'))
  assert.ok(src.includes('Vale só neste aparelho.'))
  assert.ok(src.includes('>Tema</h3>'), 'h3 Tema')
  const order = ['Automático', 'Claro', 'Escuro'].map((t) => src.indexOf(`name: '${t}'`))
  assert.ok(order.every((n) => n > 0), 'as tres opcoes')
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'ordem Automatico, Claro, Escuro')
  for (const text of ['Segue o tema do celular', 'Sempre claro', 'Sempre escuro']) assert.ok(src.includes(text), text)
  for (const icon of ['Monitor', 'Sun', 'Moon', 'Check']) assert.match(src, new RegExp(`\\b${icon}\\b`))
  assert.match(src, /tabIndex=\{checked \? 0 : -1\}/, 'so a opcao marcada e tabulavel')
  for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End']) assert.ok(src.includes(`'${key}'`), key)
})

test('ThemeGroup: preferencia do aparelho, nunca desabilitada, sem aviso, sem rede e sem dados do casal (P-13, D-09)', () => {
  const src = code(GROUP)
  assert.doesNotMatch(src, /disabled|readOnly|aria-disabled|useArea|useToast|show\(|fetch\(|firebase|service/i)
  assert.match(src, /useTheme\(\)/)
  assert.match(src, /setPref/)
  assert.doesNotMatch(src, /\bdark:/, 'o escuro vem da troca de variaveis, nao de classe dark: em componente')
  assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b/, 'sem hex literal')
  assert.doesNotMatch(src, /transition/, 'sem transicao de cor ao trocar de tema')
})

test('AppearanceCard: ThemeGroup acima dos nomes, subtitulo novo e nota antiga removida', () => {
  const src = code(CARD)
  assert.match(src, /import \{ ThemeGroup \} from '@\/components\/settings\/ThemeGroup'/)
  assert.ok(src.includes('subtitle="Tema e nomes das abas"'))
  assert.ok(src.indexOf('<ThemeGroup />') > 0)
  assert.ok(src.indexOf('<ThemeGroup />') < src.indexOf('<h3 className="text-base font-bold">Nomes das abas</h3>'))
  assert.ok(!src.includes('Tema claro.'), 'a nota Tema claro foi removida')
  assert.ok(!src.includes('chega numa próxima fase'))
  // O que nao e tema segue como era: salvar nomes e somente leitura desabilitam so os nomes.
  assert.ok(src.includes('Salvar nomes das abas') && src.includes('disabled={readOnly || saving}'))
})

test('ThemeGroup e AppearanceCard: escala tipografica, alvos de toque e sem emoji', async () => {
  const { scaleProblems, touchProblems } = await import('./helpers/phase3-1.js')
  assert.deepEqual(scaleProblems([GROUP, CARD]), [])
  assert.deepEqual(touchProblems([GROUP, CARD]), [])
})
