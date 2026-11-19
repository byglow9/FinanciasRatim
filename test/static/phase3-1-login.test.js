// Guarda estatica do Login da Fase 3.1 (variante A do sketch 017, UX-07, UX-08, D-18, P-10).
// Rodar: node --test test/static/phase3-1-login.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const FILE = 'src/components/auth/LoginForm.tsx'

test('o fluxo de autenticacao nao muda: signIn e accessError do useAuth', () => {
  const src = code(FILE)
  assert.match(src, /useAuth\(\)/)
  assert.match(src, /\bsignIn\b/)
  assert.match(src, /\baccessError\b/)
  assert.match(src, /signIn\(data\.email, data\.password\)/)
})

test('campos com autoComplete correto, aria-invalid e botao de senha com aria-label', () => {
  const src = code(FILE)
  assert.ok(src.includes('autoComplete="username"'), 'sem autoComplete="username"')
  assert.ok(src.includes('autoComplete="current-password"'), 'sem autoComplete="current-password"')
  assert.ok(src.includes('aria-invalid'), 'sem aria-invalid')
  assert.match(src, /aria-label=\{showPassword \? 'Ocultar senha' : 'Mostrar senha'\}/)
})

test('erro de autenticacao e fixo e generico; o texto cru do provedor nunca aparece', () => {
  const src = code(FILE)
  assert.ok(src.includes('E-mail ou senha incorretos.'), 'sem a mensagem fixa')
  assert.ok(!src.includes('err.message'), 'exibe err.message')
  assert.doesNotMatch(src, /catch \((err|e|error)\)/, 'o catch nao deve usar o erro do provedor')
  assert.match(src, /<Notice tone="danger"/, 'sem Notice danger')
  assert.ok(!/console\./.test(src), 'console.* no Login (credenciais)')
})

test('textos com acento e validacao por campo', () => {
  const src = code(FILE)
  for (const text of ['Informe o e-mail', 'E-mail inválido', 'Informe a senha', 'finanças']) {
    assert.ok(src.includes(text), `sem "${text}"`)
  }
  assert.ok(!src.includes('E-mail invalido') && !src.includes('Senha obrigatoria'), 'texto sem acento antigo')
})

test('visual Moeda: sem degrade verde, fundo unico, botao de acao de 56px', () => {
  const src = code(FILE)
  assert.ok(!/gradient/.test(src), 'degrade')
  assert.ok(!/from-green|to-emerald|via-/.test(src), 'degrade verde')
  assert.ok(src.includes('bg-background'), 'sem fundo Moeda')
  assert.ok(src.includes('bg-card') && src.includes('rounded-[22px]'), 'sem cartao Moeda')
  assert.ok(src.includes('bg-action text-action-text'), 'botao sem tokens de acao')
  assert.match(src, /h-14 w-full/, 'botao Entrar nao tem 56px')
})

test('fundo de uma cor so: a tela inteira usa bg-background, sem faixas atras do cartao', () => {
  const src = code(FILE)
  const root = src.slice(src.indexOf('return ('))
  assert.match(root, /min-h-dvh[^"]*bg-background/, 'a raiz nao cobre a tela com bg-background')
  // Fora do cartao e dos campos, nenhum outro fundo de bloco pode existir atras do cartao.
  const bgs = [...root.matchAll(/\bbg-[a-z0-9-]+/g)].map((m) => m[0])
  const allowed = new Set(['bg-background', 'bg-card', 'bg-surface-2', 'bg-transparent', 'bg-action'])
  for (const bg of bgs) assert.ok(allowed.has(bg), `fundo inesperado: ${bg}`)
  assert.ok(!/\b(from|via|to)-/.test(root), 'degrade ou faixa de cor')
})

test('campos modernos: 56px, rotulo visivel, icone no inicio, foco na cor de acao, olho de 44px', () => {
  const src = code(FILE)
  assert.match(src, /relative h-14 /, 'campo sem 56px')
  assert.ok(src.includes('focus-within:border-action') && src.includes('focus-within:ring-action'), 'sem anel de foco de acao')
  assert.ok(src.includes('rounded-btn'), 'sem cantos arredondados do token')
  assert.ok(src.includes('bg-surface-2'), 'sem fundo preenchido')
  assert.ok(src.includes('<Mail') && src.includes('<Lock'), 'sem icones no inicio dos campos')
  assert.ok(src.includes('htmlFor="email"') && src.includes('htmlFor="password"'), 'rotulo nao associado')
  assert.match(src, /size="icon"/, 'botao de mostrar senha sem size icon (44px)')
  assert.ok(src.includes('aria-pressed'), 'botao de senha sem aria-pressed')
})

test('escala 12/16/28/56 e alvos de 44px limpos', () => {
  assert.deepEqual(scaleProblems([FILE]), [])
  assert.deepEqual(touchProblems([FILE]), [])
})

test('AuthContext e ProtectedRoute continuam usando o mesmo contrato', () => {
  assert.match(code('src/components/auth/ProtectedRoute.tsx'), /<LoginForm \/>/)
  assert.match(code('src/contexts/AuthContext.tsx'), /accessError/)
})
