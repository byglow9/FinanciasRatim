// Guarda final e transversal da Fase 5 (plano 05-20): so confere o que atravessa os planos (escala e alvos
// de toque sobre todos os arquivos novos, conjunto fechado de chaves coinc, nenhum HTML bruto, nome do
// mascote, artefatos por requisito IDEN, cache so da casca e ganchos de teste fora de producao). O detalhe
// de cada tela fica nas guardas dos planos (phase5-*.test.js).
// Estado real de fechamento (24/11/2026): onboarding de 4 telas (3 de boas-vindas e a de adicionar a tela
// inicial), Login do sketch 029, tema padrao Claro (D-08 revisada), mascote exibido como OINC (D-25, os
// identificadores seguem vintem*) e redirect 302 do site antigo ja no ar (o 301 e decisao futura, plano 05-21).
// Rodar: node --test test/static/phase5-final.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, code, exists, listSrc, read, scaleProblems, touchProblems } from './helpers/phase3-1.js'
import { THEME_KEY, THEME_COLORS, THEME_DEFAULT, THEME_PREFS } from '../../shared/core/theme.js'
import { PRELOAD_RELOAD_KEY, SW_RELOAD_KEY } from '../../shared/core/pwaUpdate.js'

const PHASE_DIR = '.planning/phases/05-identidade-coinki-pwa-e-onboarding'

/** Arquivos novos da fase que entram na escala tipografica e nos alvos de toque (interface e logica). */
const NEW_UI = [
  'src/components/onboarding/Onboarding.tsx',
  'src/components/onboarding/WelcomeScene.tsx',
  'src/components/onboarding/InstallScene.tsx',
  'src/components/onboarding/OnboardingParts.tsx',
  'src/components/onboarding/onboardingScenes.ts',
  'src/components/onboarding/InstallSteps.tsx',
  'src/components/brand/BootError.tsx',
  'src/components/brand/CoincWordmark.tsx',
  'src/components/settings/ThemeGroup.tsx',
  'src/components/settings/AppCard.tsx',
  'src/components/auth/LoginForm.tsx',
  'src/components/vintem/VintemSay.tsx',
]
const NEW_LOGIC = [
  'src/hooks/useTheme.ts',
  'src/hooks/usePwaInstall.ts',
  'src/lib/pwa/installPrompt.ts',
  'src/lib/pwa/isBusy.ts',
  'src/lib/pwa/registerPwa.ts',
  'src/lib/legacyOrigin.ts',
  'src/lib/onboarding.ts',
  'shared/core/vintemEntrada.js',
  'shared/core/theme.js',
  'shared/core/pwaUpdate.js',
]
const NEW_FILES = [...NEW_UI, ...NEW_LOGIC]

/** Conjunto fechado de chaves de armazenamento do Coinc (todas sob o prefixo coinc:). */
const CLOSED_KEYS = [
  'coinc:tema:v1',
  'coinc:onboarding:v1',
  'coinc:origem-antiga',
  'coinc:recarga:v1',
  'coinc:sw-reload:v1',
  // Fase 7: FID do aparelho, so no localStorage (src/lib/push/messaging.ts).
  'coinc:push:fid',
  // Fase 7 (07-11): sinal local de avisos desativados neste aparelho.
  'coinc:push:off',
]

/** Lista os arquivos de um diretorio (recursivo) que nao sao testes, para varreduras de texto. */
function walkAll(dir, out = []) {
  const abs = path.join(ROOT, dir)
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`
    if (entry.isDirectory()) walkAll(rel, out)
    else if (/\.(ts|tsx|js|jsx|mjs|html)$/.test(entry.name) && !/\.test\.(js|mjs|ts)$/.test(entry.name)) out.push(rel)
  }
  return out
}

const SCAN = [...walkAll('src'), ...walkAll('shared'), 'index.html']

// ---------------------------------------------------------------------------------------------
// (1) arquivos novos: escala tipografica, peso, emoji e alvos de toque
// ---------------------------------------------------------------------------------------------

test('todos os arquivos novos da fase existem', () => {
  for (const f of NEW_FILES) assert.ok(exists(f), `${f} ausente`)
})

test('os arquivos novos passam na escala tipografica 12/16/28/56, pesos 400/700 e sem emoji', () => {
  assert.deepEqual(scaleProblems(NEW_FILES), [])
})

test('os arquivos novos passam nos alvos de toque (nada de iconSm, h-7 w-7 ou h-8 w-8)', () => {
  assert.deepEqual(touchProblems(NEW_FILES), [])
})

// ---------------------------------------------------------------------------------------------
// (2) conjunto fechado de chaves coinc
// ---------------------------------------------------------------------------------------------

test('todo literal "coinc:" em src, shared e index.html pertence ao conjunto fechado de chaves', () => {
  const found = new Map()
  for (const f of SCAN) {
    for (const m of read(f).matchAll(/coinc:[A-Za-z0-9:_-]+/g)) {
      if (!found.has(m[0])) found.set(m[0], [])
      found.get(m[0]).push(f)
    }
  }
  const outside = [...found.keys()].filter((k) => !CLOSED_KEYS.includes(k))
  assert.deepEqual(outside, [], `chave fora do conjunto fechado: ${outside.map((k) => `${k} em ${found.get(k)}`).join('; ')}`)
  for (const key of CLOSED_KEYS) assert.ok(found.has(key), `a chave ${key} do conjunto nao aparece em nenhum arquivo`)
})

test('as constantes do nucleo coincidem com o conjunto e com o que o codigo usa', () => {
  assert.equal(THEME_KEY, 'coinc:tema:v1')
  assert.equal(SW_RELOAD_KEY, 'coinc:sw-reload:v1')
  assert.equal(PRELOAD_RELOAD_KEY, 'coinc:recarga:v1')
  // chaves de onboarding e de origem antiga vivem em constantes locais de lib, e so ali
  assert.match(code('src/lib/onboarding.ts'), /const KEY = 'coinc:onboarding:v1'/)
  assert.match(code('src/lib/legacyOrigin.ts'), /const KEY = 'coinc:origem-antiga'/)
  // o script inline do index.html le a mesma chave do tema
  assert.ok(read('index.html').includes(`localStorage.getItem('${THEME_KEY}')`), 'index.html le outra chave de tema')
  // as chaves do nucleo so aparecem como literal dentro do proprio nucleo (o resto importa a constante)
  for (const f of SCAN.filter((x) => x.startsWith('src/'))) {
    const src = code(f)
    assert.ok(!src.includes(SW_RELOAD_KEY) && !src.includes(PRELOAD_RELOAD_KEY), `${f} repete uma chave do pwaUpdate`)
  }
  const hooks = code('src/hooks/useTheme.ts')
  assert.ok(hooks.includes('THEME_KEY') && !hooks.includes("'coinc:tema:v1'"), 'useTheme deve usar a constante do nucleo')
})

test('tema: padrao Claro, tres preferencias e cores de barra coerentes com o manifest', () => {
  assert.equal(THEME_DEFAULT, 'claro')
  assert.deepEqual([...THEME_PREFS], ['auto', 'claro', 'escuro'])
  const html = read('index.html')
  assert.ok(html.includes(`content="${THEME_COLORS.claro}"`), 'theme-color do HTML fora do claro')
  assert.ok(html.includes("var pref = 'claro'"), 'script inline sem padrao claro')
  const vite = read('vite.config.ts')
  assert.ok(vite.includes(`background_color: '${THEME_COLORS.claro}'`) && vite.includes(`theme_color: '${THEME_COLORS.claro}'`))
})

// ---------------------------------------------------------------------------------------------
// (3) nenhum HTML bruto
// ---------------------------------------------------------------------------------------------

test('nenhum dangerouslySetInnerHTML nem innerHTML nos arquivos novos nem no index.html', () => {
  const bad = []
  for (const f of [...NEW_FILES, 'index.html']) {
    if (/dangerouslySetInnerHTML|\binnerHTML\b/.test(code(f).replace(/<!--[\s\S]*?-->/g, ''))) bad.push(f)
  }
  assert.deepEqual(bad, [])
  const html = read('index.html')
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1].replace(/\/\*[\s\S]*?\*\//g, ''))
  assert.ok(scripts.length >= 2, 'index.html deveria ter o script do tema e o do bloco de falha')
  for (const s of scripts) assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(s), 'script inline com HTML bruto')
})

// ---------------------------------------------------------------------------------------------
// (4) nomes: nenhum nome antigo em interface; o mascote aparece como OINC
// ---------------------------------------------------------------------------------------------

test('a guarda de nome do mascote (OINC, D-25) existe e varre o app; identificadores seguem vintem*', () => {
  const guard = read('test/static/phase5-oinc-name.test.js')
  assert.ok(guard.includes('vintém') && guard.includes("SCAN_DIRS = ['src', 'shared', 'server/src']"))
  assert.ok(exists('src/components/vintem/Vintem.tsx') && exists('src/pages/VintemTestPage.tsx'), 'identificadores vintem* mantidos')
  assert.ok(code('src/components/auth/LoginForm.tsx').includes('VintemSay'))
})

test('a guarda de nome da marca (phase5-identity e phase5-docs) existe e o titulo e Coinc', () => {
  assert.ok(exists('test/static/phase5-identity.test.js') && exists('test/static/phase5-docs.test.js'))
  const html = read('index.html')
  assert.ok(html.includes('<title>Coinc</title>'))
  assert.ok(html.includes('apple-mobile-web-app-title" content="Coinc"'))
  const visible = SCAN.filter((f) => f.startsWith('src/') && /\.tsx$/.test(f))
  const bad = []
  for (const f of visible) {
    for (const line of code(f).split('\n')) {
      if (/['">`]\s*[^'"`<>]*\b(Financias Ratimbum|Ratimbum|Coinki)\b/.test(line)) bad.push(`${f}: ${line.trim().slice(0, 80)}`)
    }
  }
  assert.deepEqual(bad, [], `nome antigo na interface:\n${bad.join('\n')}`)
})

// ---------------------------------------------------------------------------------------------
// (5) cada requisito IDEN com seus artefatos
// ---------------------------------------------------------------------------------------------

test('IDEN-01: titulo e Login com Coinc, e firebase.json com o alvo coinc', () => {
  assert.ok(read('index.html').includes('<title>Coinc</title>'))
  const login = code('src/components/auth/LoginForm.tsx')
  assert.ok(login.includes('CoincWordmark'))
  assert.ok(code('src/components/brand/CoincWordmark.tsx').includes('>Coinc</span>'), 'h1 do Login sem o texto Coinc')
  const fb = JSON.parse(read('firebase.json'))
  assert.ok(Array.isArray(fb.hosting) && fb.hosting.some((h) => h.target === 'coinc' && h.public === 'dist'))
  const rc = JSON.parse(read('.firebaserc'))
  assert.deepEqual(rc.targets['financias-ratimbum'].hosting.coinc, ['coinc-financias'])
})

test('IDEN-02: alvo legacy com redirect fixo para o endereco novo e a nota de ALLOWED_ORIGINS na evidencia', () => {
  const fb = JSON.parse(read('firebase.json'))
  const legacy = fb.hosting.find((h) => h.target === 'legacy')
  assert.ok(legacy, 'sem o alvo legacy')
  assert.equal(legacy.redirects.length, 1, 'um so redirect')
  assert.equal(legacy.redirects[0].destination, 'https://coinc-financias.web.app/?origem=antigo')
  assert.equal(legacy.redirects[0].source, '**')
  assert.ok([301, 302].includes(legacy.redirects[0].type), 'tipo de redirect inesperado')
  assert.ok(exists(`${PHASE_DIR}/05-19-DEPLOY-EVIDENCE.md`))
  assert.ok(read(`${PHASE_DIR}/05-17-DEPLOY-EVIDENCE.md`).includes('ALLOWED_ORIGINS'), 'evidencia sem a nota de ALLOWED_ORIGINS')
  assert.ok(code('src/lib/legacyOrigin.ts').includes("'antigo'"), 'sem o tratamento do parametro origem=antigo')
})

test('IDEN-03: manifest configurado, passos, tela de adicionar do onboarding, cartao e os cinco icones', () => {
  const vite = read('vite.config.ts')
  for (const text of ["name: 'Coinc'", "display: 'standalone'", "lang: 'pt-BR'", "purpose: 'maskable'", "strategies: 'injectManifest'"]) {
    assert.ok(vite.includes(text), `vite.config.ts sem ${text}`)
  }
  for (const f of ['src/components/onboarding/InstallSteps.tsx', 'src/components/onboarding/InstallScene.tsx', 'src/components/settings/AppCard.tsx']) {
    assert.ok(exists(f), `${f} ausente`)
  }
  for (const f of [
    'public/icons/pwa-192x192.png',
    'public/icons/pwa-512x512.png',
    'public/icons/maskable-icon-512x512.png',
    'public/icons/apple-touch-icon-180x180.png',
    'public/icons/icon.svg',
  ]) {
    assert.ok(exists(f) && fs.statSync(path.join(ROOT, f)).size > 0, `icone ${f} ausente ou vazio`)
  }
  assert.ok(exists('public/favicon.svg') && exists('public/favicon.ico'))
})

test('IDEN-04: sw.ts sem ativacao automatica nem rota de dados, registerPwa, pwaUpdate e BootError', () => {
  const sw = code('src/sw.ts')
  assert.ok(sw.includes('SKIP_WAITING'))
  assert.ok(!/skipWaiting\(\)\s*[;\n]\s*(?!\})/.test(sw.replace(/self\.addEventListener\('message'[\s\S]*$/, '')), 'skipWaiting fora do ouvinte de mensagem')
  assert.ok(exists('src/lib/pwa/registerPwa.ts') && exists('shared/core/pwaUpdate.js') && exists('src/components/brand/BootError.tsx'))
  assert.ok(read('vite.config.ts').includes("registerType: 'prompt'"))
})

test('IDEN-05: theme.js, useTheme, ThemeGroup e o script inline', () => {
  for (const f of ['shared/core/theme.js', 'src/hooks/useTheme.ts', 'src/components/settings/ThemeGroup.tsx']) assert.ok(exists(f), `${f} ausente`)
  assert.ok(read('index.html').includes('classList.add(\'dark\')'))
  assert.ok(code('src/components/settings/AppearanceCard.tsx').includes('ThemeGroup'))
})

test('IDEN-06: bloco .dark, .dark .vt e o auditor theme.mjs', () => {
  const css = read('src/index.css')
  assert.ok(/^\s*\.dark\s*\{/m.test(css), 'sem o bloco .dark')
  assert.ok(css.includes('.dark .vt'), 'sem .dark .vt')
  assert.ok(exists('scripts/ux-audit/theme.mjs'))
  assert.ok(read('scripts/ux-audit/theme.mjs').includes('--audit'))
})

test('IDEN-08: onboarding de quatro passos (3 de boas-vindas e a de adicionar), portao e Login novo', () => {
  for (const f of [
    'src/components/onboarding/Onboarding.tsx',
    'src/components/onboarding/WelcomeScene.tsx',
    'src/components/onboarding/InstallScene.tsx',
    'src/components/onboarding/OnboardingParts.tsx',
    'shared/core/vintemEntrada.js',
    'src/components/brand/CoincWordmark.tsx',
    'src/components/vintem/VintemSay.tsx',
  ]) {
    assert.ok(exists(f), `${f} ausente`)
  }
  const scenes = read('src/components/onboarding/onboardingScenes.ts')
  const ids = [...scenes.slice(scenes.indexOf('ONBOARDING_SCENES'), scenes.indexOf('PRINT_SIZE')).matchAll(/id: '([a-z0-9]+)'/g)].map((m) => m[1])
  assert.deepEqual(ids, ['o1', 'o2', 'o3', 'ia'], 'devem ser tres cenas de boas-vindas e a de adicionar a tela inicial')
  const onb = code('src/components/onboarding/Onboarding.tsx')
  assert.ok(onb.includes('InstallScene') && onb.includes('WelcomeScene') && onb.includes('SCENES.length'), 'casca sem as cenas')
  assert.match(onb, /LAST\s*=\s*SCENES\.length - 1/, 'a ultima posicao deve ser a tela de adicionar (indice 3)')
  const gate = code('src/components/auth/ProtectedRoute.tsx')
  assert.ok(gate.includes('Onboarding') && gate.includes('readOnboardingSeen') && gate.includes('markOnboardingSeen'))
  const login = code('src/components/auth/LoginForm.tsx')
  for (const text of ['CoincWordmark', 'VintemSay']) assert.ok(login.includes(text), `LoginForm sem ${text}`)
  assert.ok(code('src/components/vintem/Vintem.tsx').includes('entrada'), 'Vintem sem o look de entrada')
})

test('as guardas por plano da fase continuam na suite (nada foi apagado para fechar a fase)', () => {
  for (const g of [
    'boot', 'darkaudit', 'docs', 'hosting', 'icons', 'identity', 'install', 'manifest', 'oinc-name', 'onboarding', 'sw', 'theme', 'tokens',
  ]) {
    assert.ok(exists(`test/static/phase5-${g}.test.js`), `phase5-${g}.test.js ausente`)
  }
  for (const f of ['shared/core/pwaUpdate.test.js', 'shared/core/theme.test.js', 'shared/core/vintemEntrada.test.js']) {
    assert.ok(exists(f), `${f} ausente`)
  }
  for (const x of ['theme', 'pwa', 'install', 'onboarding', 'identity', 'icon-sketch', 'vintem']) {
    assert.ok(exists(`scripts/ux-audit/${x}.mjs`), `executor ${x}.mjs ausente`)
  }
})

// ---------------------------------------------------------------------------------------------
// (6) cache so da casca (D-15) e atualizacao sem texto nem aviso (D-14)
// ---------------------------------------------------------------------------------------------

test('o service worker so tem a casca: uma unica rota, sem ouvinte de fetch nem cache de dados', () => {
  const sw = code('src/sw.ts')
  assert.equal([...sw.matchAll(/registerRoute\(/g)].length, 1, 'sw.ts deve ter uma so rota (a de navegacao)')
  assert.ok(sw.includes('NavigationRoute'))
  assert.ok(!/addEventListener\('fetch'/.test(sw), 'sem ouvinte de fetch')
  assert.ok(!/StaleWhileRevalidate|NetworkFirst|CacheFirst|runtimeCaching|firestore|googleapis|\/api\//.test(sw.replace(/denylist:[^\n]*/, '')), 'sem cache de dados')
  assert.ok(!read('vite.config.ts').includes('runtimeCaching'))
})

test('registerPwa nao importa nada de interface (sem toast, aviso ou botao de atualizar)', () => {
  const src = code('src/lib/pwa/registerPwa.ts')
  const froms = [...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1])
  for (const from of froms) {
    assert.ok(!/components|react|contexts|hooks|toast/i.test(from), `registerPwa importa ${from}`)
  }
  assert.ok(!/toast|alert\(|confirm\(|prompt\(/i.test(src), 'registerPwa com aviso ao usuario')
})

test('pre-cache nao inclui as imagens do onboarding (webp fica fora da lista de padroes)', () => {
  const globs = read('vite.config.ts').match(/globPatterns:\s*\[([^\]]*)\]/)?.[1] ?? ''
  assert.ok(!/webp/.test(globs), 'webp no pre-cache')
})

// ---------------------------------------------------------------------------------------------
// (7) rota de teste e gancho de falha fora de producao
// ---------------------------------------------------------------------------------------------

test('o gancho de falha so existe dentro de import.meta.env.DEV e nunca no HTML', () => {
  const hits = SCAN.filter((f) => code(f).includes('__coincBootError') || read(f).includes('__coincBootError'))
  assert.deepEqual(hits, ['src/main.tsx'], `gancho fora do main.tsx: ${hits}`)
  const main = code('src/main.tsx')
  const at = main.indexOf('__coincBootError')
  const ifAt = main.lastIndexOf('if (import.meta.env.DEV) {', at)
  assert.ok(ifAt >= 0 && !main.slice(ifAt, at).includes('\n}\n'), 'gancho fora do bloco de DEV')
})

test('a rota oculta /vintem-teste nao tem link em NavRail, Ajustes nem atalhos', () => {
  for (const f of ['src/components/layout/NavRail.tsx', 'src/pages/SettingsPage.tsx', 'src/components/dashboard/ShortcutRow.tsx']) {
    assert.ok(!/vintem-teste/.test(code(f)), `${f} aponta para a rota oculta`)
  }
  const users = SCAN.filter((f) => /vintem-teste/.test(code(f)))
  assert.deepEqual(users, ['src/App.tsx'], `a rota so e declarada em App.tsx (e por trás do portao): ${users}`)
})
