// Guarda da falha de abertura da Fase 5 (plano 05-10, D-14, IDEN-04): BootError sem contexto, gancho
// de desenvolvimento so em DEV, bloco estatico do index.html e ligacao em main.tsx.
// Rodar: node --test test/static/phase5-boot.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { code, read, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const BOOT = code('src/components/brand/BootError.tsx')
const MAIN = code('src/main.tsx')
const HTML = read('index.html')

/** Texto do script inline do bloco estatico (o que tem BLOCK_ID), nao o do tema. */
function bootScript() {
  const scripts = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
  const found = scripts.find((s) => s.includes('coinc-boot-error'))
  assert.ok(found, 'index.html sem o script do bloco estatico')
  return found
}

test('BootError nao importa contexto, hook de dados, provider nem servico (renderiza fora de qualquer arvore)', () => {
  assert.doesNotMatch(BOOT, /from '@\/(contexts|services|hooks)\//, 'sem contexto, servico nem hook')
  assert.doesNotMatch(BOOT, /useAuth|useArea|useVintem|useCycle|Provider|firebase|firestore|fetch\(/, 'sem dados nem provider')
  const froms = [...BOOT.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]).sort()
  assert.deepEqual(froms, ['@/components/ui/button', '@/components/vintem/VintemEmpty', 'lucide-react'])
})

test('BootError: casca de tela cheia, Vintem surpreso, titulo, corpo e botao Tentar de novo', () => {
  for (const text of ['min-h-dvh', 'bg-background', 'max-w-md', 'pose="surpreso"', 'RefreshCw', 'aria-hidden="true"', 'h-14 w-full']) {
    assert.ok(BOOT.includes(text), `BootError sem "${text}"`)
  }
  assert.ok(!BOOT.includes('pose="triste"'), 'o Vintem nunca fica triste na falha')
  assert.ok(BOOT.includes('Não foi possível abrir o Coinc'), 'sem o titulo')
  assert.ok(BOOT.includes('Pode ser a conexão ou uma atualização em andamento. Tente de novo.'), 'sem o corpo')
  assert.ok(BOOT.includes('Tentar de novo'), 'sem o botao')
  assert.ok(BOOT.includes('window.location.reload()'), 'o botao recarrega a pagina')
  assert.ok(/font-display text-\[28px\] font-bold leading-\[1\.2\]/.test(BOOT), 'titulo fora da escala 28/700')
  assert.ok(!/dangerouslySetInnerHTML|innerHTML/.test(BOOT), 'sem HTML bruto')
})

test('BootError: escala tipografica, alvos de toque e sem emoji', () => {
  assert.deepEqual(scaleProblems(['src/components/brand/BootError.tsx']), [])
  assert.deepEqual(touchProblems(['src/components/brand/BootError.tsx']), [])
})

test('main.tsx liga onBootError e so expoe __coincBootError dentro de if (import.meta.env.DEV)', () => {
  assert.ok(MAIN.includes("from '@/components/brand/BootError'"))
  assert.ok(/registerPwa\(\{\s*onBootError:/.test(MAIN), 'registerPwa sem onBootError')
  const uses = [...MAIN.matchAll(/__coincBootError/g)]
  assert.ok(uses.length >= 1, 'sem o gancho de desenvolvimento')
  for (const use of uses) {
    const ifAt = MAIN.lastIndexOf('if (import.meta.env.DEV) {', use.index)
    assert.ok(ifAt >= 0, '__coincBootError fora de if (import.meta.env.DEV)')
    const between = MAIN.slice(ifAt, use.index)
    assert.ok(!between.includes('\n}\n'), '__coincBootError fora do bloco do if de DEV')
  }
  assert.ok(!/__coincBootError/.test(read('index.html')), 'o gancho nao aparece no HTML')
})

test('index.html: o bloco estatico usa textContent, espera 8000 ms e nao tem innerHTML nem hex', () => {
  const script = bootScript()
  assert.ok(script.includes('textContent'), 'sem textContent')
  assert.doesNotMatch(script, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/, 'HTML bruto proibido (T-05-10-03)')
  assert.doesNotMatch(script, /#[0-9a-fA-F]{3,8}\b/, 'sem hex: so cores de sistema')
  assert.ok(script.includes('Canvas') && script.includes('CanvasText'), 'cores de sistema Canvas e CanvasText')
  assert.ok(/\}, 8000\)/.test(script), 'espera de 8000 ms')
  assert.ok(script.includes('Não foi possível abrir o Coinc') && script.includes('Tentar de novo'))
  assert.doesNotMatch(script, /https?:\/\/|@import|font-face/, 'sem fonte nem recurso externo')
})

/** Executa o script do bloco com um DOM minimo, avancando o relogio com um setTimeout falso. */
function runBlock({ rootHasChild = false } = {}) {
  const made = []
  const timers = []
  const root = {
    firstChild: rootHasChild ? { id: 'react' } : null,
    childNodes: rootHasChild ? [{ id: 'react' }] : [],
    appendChild(el) {
      this.childNodes.push(el)
      this.firstChild = this.childNodes[0]
      el.parentNode = this
    },
    removeChild(el) {
      this.childNodes = this.childNodes.filter((c) => c !== el)
      this.firstChild = this.childNodes[0] ?? null
    },
  }
  const document = {
    getElementById(id) {
      if (id === 'root') return root
      return root.childNodes.find((c) => c.id === id) ?? null
    },
    createElement(tag) {
      const el = { tag, style: {}, children: [], setAttribute() {}, addEventListener() {}, appendChild(c) { this.children.push(c) } }
      made.push(el)
      return el
    },
  }
  const sandbox = { document, setTimeout: (fn, ms) => timers.push({ fn, ms }), location: { reload() {} } }
  vm.runInNewContext(bootScript(), sandbox)
  return { root, made, timers }
}

test('bloco estatico: aos 8 s com #root vazio monta o aviso por DOM; com filho nao faz nada', () => {
  const empty = runBlock()
  assert.equal(empty.timers.length, 1)
  assert.equal(empty.timers[0].ms, 8000)
  empty.timers[0].fn()
  const texts = empty.made.map((el) => el.textContent).filter(Boolean)
  assert.ok(texts.includes('Não foi possível abrir o Coinc'))
  assert.ok(texts.includes('Tentar de novo'))
  assert.equal(empty.root.childNodes.length, 1, 'o bloco entra em #root')

  const mounted = runBlock({ rootHasChild: true })
  mounted.timers[0].fn()
  assert.equal(mounted.made.length, 0, 'com o React montado o bloco nao aparece')
})
