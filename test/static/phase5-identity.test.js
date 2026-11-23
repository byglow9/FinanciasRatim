// Guarda estatica da identidade no Login (IDEN-01, IDEN-02, IDEN-08, D-01, D-04, D-05, P-12).
// Rodar: node --test test/static/phase5-identity.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, code, exists, read, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const LOGIN = 'src/components/auth/LoginForm.tsx'
const MARK = 'src/components/brand/CoincMark.tsx'
const ORIGIN = 'src/lib/legacyOrigin.ts'
const MAIN = 'src/main.tsx'
const AUDIT = 'scripts/ux-audit/identity.mjs'

// Termos montados por concatenacao para o teste nao se acusar.
const OLD_NAME = ['Ratim', 'bum'].join('')
const OLD_REPO = ['Fina', 'ncias'].join('')
const MIDDLE_NAME = ['Coi', 'nki'].join('')
const TERMS = [OLD_NAME, OLD_REPO, MIDDLE_NAME].map((t) => t.toLowerCase())

// Lista fechada de excecoes (P-12): chaves legadas de limpeza de login e identificador interno de alertas.
const EXCEPTIONS = new Set([
  'src/lib/legacyAuthCleanup.ts',
  'src/components/layout/AlertsBell.tsx',
  'src/components/dashboard/LimitAlertNotice.tsx',
])

const TEXT_EXT = /\.(ts|tsx|js|jsx|css|html|svg|json|webmanifest|txt|md)$/i

/** Lista arquivos de texto de um diretorio (relativo a raiz), recursivamente. */
function listText(dir) {
  const out = []
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`
    if (entry.isDirectory()) out.push(...listText(rel))
    else if (TEXT_EXT.test(entry.name)) out.push(rel)
  }
  return out
}

test('nenhum texto em src, index.html e public traz o nome antigo ou o intermediario (excecoes fechadas)', () => {
  const files = [...listText('src'), ...listText('public'), 'index.html']
  const hits = []
  for (const f of files) {
    if (EXCEPTIONS.has(f)) continue
    const text = read(f).toLowerCase()
    for (const term of TERMS) if (text.includes(term)) hits.push(`${f}: ${term}`)
  }
  assert.deepEqual(hits, [])
  for (const f of EXCEPTIONS) assert.ok(exists(f), `excecao inexistente: ${f}`)
})

test('Login: marca do app, H1 Coinc, sem PiggyBank e subtitulo com finanças', () => {
  const src = code(LOGIN)
  assert.match(src, /import \{ CoincMark \} from '@\/components\/brand\/CoincMark'/)
  assert.match(src, /<CoincMark \/>/)
  assert.match(src, /<h1 className="font-display text-\[28px\] font-bold leading-\[1\.2\]">Coinc<\/h1>/)
  assert.ok(!src.includes('PiggyBank'), 'PiggyBank ainda no Login')
  assert.ok(src.includes('Entre para gerenciar suas finanças'), 'sem o subtitulo')
})

test('Login: aviso de endereco novo condicionado a hasLegacyOrigin e limpo no sucesso', () => {
  const src = code(LOGIN)
  assert.ok(src.includes('hasLegacyOrigin') && src.includes('clearLegacyOrigin'), 'sem hasLegacyOrigin/clearLegacyOrigin')
  assert.ok(src.includes('O Coinc mudou de endereço.'), 'sem o titulo do aviso')
  assert.ok(src.includes('Entre de novo por aqui. Seus dados continuam salvos.'), 'sem o texto do aviso')
  assert.match(src, /<Notice tone="info" icon=\{Info\}/, 'aviso sem tom info e icone Info')
  // O aviso fica acima do formulario.
  assert.ok(src.indexOf('O Coinc mudou de endereço.') < src.indexOf('<form'), 'aviso abaixo do formulario')
  // clearLegacyOrigin vem depois do signIn com sucesso (dentro do try).
  const afterSignIn = src.slice(src.indexOf('await signIn('))
  assert.ok(afterSignIn.indexOf('clearLegacyOrigin()') > -1 && afterSignIn.indexOf('clearLegacyOrigin()') < afterSignIn.indexOf('catch'), 'limpeza fora do caminho de sucesso')
})

test('Login: sem conexao testa navigator.onLine antes do signIn e nao mostra credencial errada', () => {
  const src = code(LOGIN)
  assert.ok(src.includes('Sem conexão. Conecte-se à internet para entrar.'), 'sem a mensagem de falta de conexao')
  const online = src.indexOf('navigator.onLine === false')
  assert.ok(online > -1, 'sem navigator.onLine')
  assert.ok(online < src.indexOf('await signIn('), 'navigator.onLine depois do signIn')
  const block = src.slice(online, src.indexOf('await signIn('))
  assert.match(block, /return/, 'nao retorna antes do signIn')
  assert.ok(src.includes('E-mail ou senha incorretos.'), 'mensagem fixa de credencial errada sumiu')
})

test('Login: so os seis fundos permitidos, sem o termo do degrade e ProtectedRoute com <LoginForm /> literal', () => {
  const src = code(LOGIN)
  assert.ok(!/gradient/.test(src), 'termo proibido no Login')
  const root = src.slice(src.indexOf('return ('))
  const allowed = new Set(['bg-background', 'bg-card', 'bg-surface-2', 'bg-inset', 'bg-transparent', 'bg-action'])
  for (const m of root.matchAll(/\bbg-[a-z0-9-]+/g)) assert.ok(allowed.has(m[0]), `fundo inesperado: ${m[0]}`)
  assert.match(code('src/components/auth/ProtectedRoute.tsx'), /<LoginForm \/>/)
})

test('CoincMark: img do icone do app, 56 por 56, decorativa (alt vazio)', () => {
  const src = code(MARK)
  assert.match(src, /<img src="\/icons\/icon\.svg" alt="" className="h-14 w-14 rounded-2xl" \/>/)
  assert.ok(exists('public/icons/icon.svg'), 'icone do app ausente')
})

test('legacyOrigin: igualdade estrita, replaceState, sem innerHTML, sessionStorage em try, valor nunca devolvido', () => {
  const src = code(ORIGIN)
  assert.match(src, /params\.get\(PARAM\) === FLAG/, 'comparacao nao e estrita com a constante')
  assert.ok(src.includes("const FLAG = 'antigo'"), 'constante da marca mudou')
  assert.ok(src.includes('history.replaceState'), 'sem replaceState')
  assert.ok(!/innerHTML|dangerouslySetInnerHTML|location\.(href|assign|replace)\s*=|location\.(assign|replace)\(/.test(src), 'escrita de HTML ou navegacao')
  // Todo acesso a sessionStorage esta dentro de try.
  assert.equal(src.match(/sessionStorage\./g).length, src.match(/try \{[^}]*sessionStorage\./g).length, 'sessionStorage fora de try')
  // O valor do parametro nunca e retornado: so funcoes void e booleana.
  assert.ok(!/return\s+params\.get|return\s+[a-z]*\.get\(/.test(src), 'devolve o valor do parametro')
  assert.match(src, /export function captureLegacyOrigin\(\): void/)
  assert.match(src, /export function hasLegacyOrigin\(\): boolean/)
  assert.match(src, /export function clearLegacyOrigin\(\): void/)
})

test('main.tsx chama captureLegacyOrigin antes do createRoot e a ordem de imports segue', () => {
  const src = code(MAIN)
  assert.match(src, /import \{ captureLegacyOrigin \} from '@\/lib\/legacyOrigin'/)
  const call = src.indexOf('captureLegacyOrigin()\n')
  assert.ok(call > -1, 'sem a chamada')
  assert.ok(call < src.indexOf('createRoot(document'), 'depois do createRoot')
  assert.ok(src.indexOf('initTheme()\n') < call && src.indexOf('captureInstallPrompt()\n') < call, 'ordem: initTheme, captureInstallPrompt, captureLegacyOrigin')
})

test('escala 12/16/28/56 e alvos de 44px limpos nos arquivos novos', () => {
  assert.deepEqual(scaleProblems([LOGIN, MARK]), [])
  assert.deepEqual(touchProblems([LOGIN, MARK]), [])
})

test('public/piggy.svg e public/vite.svg nao existem e nada os referencia', () => {
  for (const f of ['public/piggy.svg', 'public/vite.svg']) assert.ok(!exists(f), `${f} ainda existe`)
  const files = [...listText('src'), ...listText('public'), 'index.html']
  const hits = files.filter((f) => /piggy\.svg|vite\.svg/.test(read(f)))
  assert.deepEqual(hits, [])
})


test('executor identity.mjs: porta 5194, so 127.0.0.1 e linha final FALHAS', () => {
  const src = read(AUDIT)
  assert.match(src, /const PORT = 5194/)
  assert.ok(src.includes('127.0.0.1') && !src.includes('0.0.0.0'), 'fora de 127.0.0.1')
  assert.ok(src.includes('`FALHAS ${'), 'sem a linha final FALHAS n')
  assert.ok(!/readFileSync\([^)]*\.env/.test(src), 'le .env*')
})
