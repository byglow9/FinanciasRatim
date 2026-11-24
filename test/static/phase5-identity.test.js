// Guarda estatica da identidade no Login (IDEN-01, IDEN-02, IDEN-08, D-01, D-04, D-05, P-12).
// Plano 05-22 (D-23): os testes do Login, do wordmark e da fala foram reescritos de proposito para o
// Login do sketch 029; o fluxo de autenticacao e a regra do nome antigo seguem guardados.
// Rodar: node --test test/static/phase5-identity.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, code, exists, read, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const LOGIN = 'src/components/auth/LoginForm.tsx'
const WORDMARK = 'src/components/brand/CoincWordmark.tsx'
const SAY = 'src/components/vintem/VintemSay.tsx'
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

test('Login: Vintem de entrada unico e decorativo, wordmark no H1, sem subtitulo, sem botao secundario e sem marca antiga', () => {
  const src = code(LOGIN)
  assert.match(src, /import \{ CoincWordmark \} from '@\/components\/brand\/CoincWordmark'/)
  assert.match(src, /<CoincWordmark /)
  assert.equal((src.match(/<Vintem\b/g) || []).length, 1, 'o Login deve ter um so Vintem')
  const tag = src.slice(src.indexOf('<Vintem '), src.indexOf('/>', src.indexOf('<Vintem ')) + 2)
  assert.ok(tag.includes('look="entrada"'), 'Vintem sem look="entrada"')
  assert.ok(tag.includes('decorative'), 'Vintem do Login nao e decorativo')
  assert.ok(!/\bkey=/.test(tag), 'Vintem do Login com key')
  assert.ok(!src.includes('CoincMark') && !src.includes('PiggyBank'), 'marca antiga ou PiggyBank no Login')
  assert.ok(!src.includes('Entre para gerenciar'), 'subtitulo antigo no Login')
  assert.ok(!src.includes('Ver a apresentação'), 'botao secundario no Login')
  assert.ok(!/Esqueci minha senha/i.test(src), 'link de senha esquecida: o app nao tem esse fluxo')
  assert.ok(src.includes('Acesso só para quem foi convidado.'), 'sem o rodape')
  assert.ok(src.indexOf('<Vintem ') < src.indexOf('<CoincWordmark'), 'o Vintem vem antes do wordmark')
  assert.ok(src.indexOf('<CoincWordmark') < src.indexOf('<form'), 'o wordmark vem antes do formulario')
})

test('Login: falas do Vintem com os textos e os papeis do plano 05-22 (alerta em erro, status no endereco novo)', () => {
  const src = code(LOGIN)
  assert.match(src, /import \{ VintemSay \} from '@\/components\/vintem\/VintemSay'/)
  assert.ok(src.includes('Hmm, e-mail ou senha não batem. Confere aí?'), 'sem a fala de credencial errada')
  assert.ok(src.includes('Sem internet por aqui. Liga o Wi-Fi ou os dados e tenta de novo.'), 'sem a fala de sem conexao')
  assert.ok(src.includes('O Coinc mudou de endereço. Entre de novo por aqui. Seus dados continuam salvos.'), 'sem a fala de endereco novo')
  assert.ok(!src.includes('<Notice'), 'faixa de aviso dentro do formulario')
  // Prioridade: conta sem acesso, credencial errada, sem conexao, endereco novo.
  const derive = src.slice(src.indexOf('const say ='), src.indexOf('const credentialError'))
  const order = ['accessError', 'authFailed', 'offline', 'legacyOrigin'].map((t) => derive.indexOf(t))
  assert.ok(order.every((n) => n > -1), 'derivacao da fala fora da ordem esperada')
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'prioridade das falas mudou')
  const roles = [...derive.matchAll(/text: (\w+)[^}]*live: '(alert|status)'/g)].map((m) => `${m[1]}:${m[2]}`)
  assert.deepEqual(roles, ['accessError:alert', 'SAY_CREDENTIALS:alert', 'SAY_OFFLINE:alert', 'SAY_NEW_ADDRESS:status'])
  // Vintem triste no erro, dormindo sem conexao; digitar limpa a fala.
  assert.match(src, /'triste'/)
  assert.match(src, /'dormindo'/)
  assert.ok((src.match(/onChange: clearSay/g) || []).length === 2, 'digitar nos dois campos deve limpar a fala')
  assert.match(src, /aria-describedby=\{describedBy\(/, 'campos sem aria-describedby da fala')
})

test('CoincWordmark: h1 com sr-only Coinc, svg aria-hidden, cinco paths e nenhum HTML bruto', () => {
  const src = code(WORDMARK)
  assert.match(src, /<h1 /)
  assert.match(src, /<span className="sr-only">Coinc<\/span>/)
  assert.match(src, /<svg[^>]*aria-hidden="true"/)
  assert.match(src, /focusable="false"/)
  assert.match(src, /fill-ok-ink/)
  assert.equal((src.match(/\bkey: '/g) || []).length, 5, 'o wordmark deve ter cinco glifos')
  assert.match(src, /<path key=\{g\.key\}/)
  assert.ok(!/innerHTML|dangerouslySetInnerHTML|<img|<text|font-family/.test(src), 'HTML bruto, imagem ou texto no wordmark')
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(src), 'hex no wordmark')
})

test('VintemSay: absoluto, sem captura de toque, papel pela prop e texto React', () => {
  const src = code(SAY)
  assert.ok(src.includes('absolute') && src.includes('pointer-events-none'), 'fala sem absolute e pointer-events-none')
  assert.match(src, /role=\{live\}/)
  assert.ok(src.includes('anim-vintem-say'), 'sem a animacao da fala')
  assert.ok(src.includes('bg-warn-ink text-warn-bg') && src.includes('bg-action text-action-text'), 'tons da fala')
  assert.ok(!/innerHTML|dangerouslySetInnerHTML|<button|onClick/.test(src), 'fala interativa ou HTML bruto')
})

test('Login: aviso de endereco novo condicionado a hasLegacyOrigin e limpo no sucesso', () => {
  const src = code(LOGIN)
  assert.ok(src.includes('hasLegacyOrigin') && src.includes('clearLegacyOrigin'), 'sem hasLegacyOrigin/clearLegacyOrigin')
  assert.ok(src.includes('O Coinc mudou de endereço.'), 'sem o titulo do aviso')
  assert.ok(src.includes('Entre de novo por aqui. Seus dados continuam salvos.'), 'sem o texto do aviso')
  // 05-22: o aviso e fala do Vintem (acima do formulario), nao mais uma faixa.
  assert.ok(src.indexOf('O Coinc mudou de endereço.') < src.indexOf('<form'), 'aviso abaixo do formulario')
  // clearLegacyOrigin vem depois do signIn com sucesso (dentro do try).
  const afterSignIn = src.slice(src.indexOf('await signIn('))
  assert.ok(afterSignIn.indexOf('clearLegacyOrigin()') > -1 && afterSignIn.indexOf('clearLegacyOrigin()') < afterSignIn.indexOf('catch'), 'limpeza fora do caminho de sucesso')
})

test('Login: sem conexao testa navigator.onLine antes do signIn e nao mostra credencial errada', () => {
  const src = code(LOGIN)
  assert.ok(src.includes('Sem internet por aqui. Liga o Wi-Fi ou os dados e tenta de novo.'), 'sem a mensagem de falta de conexao')
  const online = src.indexOf('navigator.onLine === false')
  assert.ok(online > -1, 'sem navigator.onLine')
  assert.ok(online < src.indexOf('await signIn('), 'navigator.onLine depois do signIn')
  const block = src.slice(online, src.indexOf('await signIn('))
  assert.match(block, /return/, 'nao retorna antes do signIn')
  assert.ok(src.includes('Hmm, e-mail ou senha não batem. Confere aí?'), 'mensagem fixa de credencial errada sumiu')
})

test('Login: so os fundos permitidos, sem o termo do degrade e ProtectedRoute com <LoginForm /> literal', () => {
  const src = code(LOGIN)
  assert.ok(!/gradient/.test(src), 'termo proibido no Login')
  const root = src.slice(src.indexOf('return ('))
  // 05-22: tons de erro e de aviso dos campos entram no conjunto permitido.
  const allowed = new Set(['bg-background', 'bg-card', 'bg-surface-2', 'bg-inset', 'bg-transparent', 'bg-action', 'bg-danger-bg', 'bg-warn-bg', 'bg-warn-ink'])
  for (const m of root.matchAll(/\bbg-[a-z0-9-]+/g)) assert.ok(allowed.has(m[0]), `fundo inesperado: ${m[0]}`)
  assert.match(code('src/components/auth/ProtectedRoute.tsx'), /<LoginForm \/>/)
})

test('CoincMark saiu (nada o usa mais) e o icone do app segue em public/icons/icon.svg', () => {
  // 05-22 (D-23): o Login deixou de usar a imagem do icone; o manifest e o favicon seguem usando o arquivo.
  assert.ok(!exists('src/components/brand/CoincMark.tsx'), 'CoincMark.tsx ainda existe')
  assert.ok(exists('public/icons/icon.svg'), 'icone do app ausente')
  const files = [...listText('src'), 'index.html']
  assert.deepEqual(files.filter((f) => read(f).includes('CoincMark')), [])
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
  assert.deepEqual(scaleProblems([LOGIN, WORDMARK, SAY]), [])
  assert.deepEqual(touchProblems([LOGIN, WORDMARK, SAY]), [])
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
