// Guarda estatica do onboarding de 3 telas (IDEN-08, IDEN-03, D-12, D-16 a D-19, P-02, P-03, P-05).
// Rodar: node --test test/static/phase5-onboarding.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, exists, read, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const ONB = 'src/components/onboarding/Onboarding.tsx'
const LIB = 'src/lib/onboarding.ts'
const ROUTE = 'src/components/auth/ProtectedRoute.tsx'
const CARD = 'src/components/settings/AppCard.tsx'
const AUTH = 'src/contexts/AuthContext.tsx'
const AUDIT = 'scripts/ux-audit/onboarding.mjs'
const FILES = [ONB, LIB, ROUTE, CARD]

test('os arquivos do onboarding existem', () => {
  for (const f of [...FILES, AUDIT]) assert.ok(exists(f), `${f} ausente`)
})

test('Onboarding tem os seis textos de titulo e corpo do contrato (D-16)', () => {
  const src = code(ONB)
  for (const text of [
    'Veja quanto ainda pode gastar',
    'Em um número só, você vê o que ainda dá para gastar no mês, já descontando as contas fixas.',
    'Limites e o Vintém',
    'Defina um limite para cada categoria. O Vintém, seu porquinho, avisa quando você está chegando perto.',
    'Adicionar à tela inicial',
    'Deixe o Coinc na tela do celular e abra como um app, em tela cheia.',
  ]) {
    assert.ok(src.includes(`'${text}'`), `Onboarding sem "${text}"`)
  }
})

test('Onboarding tem os botoes e as props do contrato, com Pular nas tres telas', () => {
  const src = code(ONB)
  for (const text of ['Pular', 'Voltar', 'Continuar', 'Entrar', 'Concluir', 'Fechar']) {
    assert.ok(src.includes(`'${text}'`) || src.includes(`"${text}"`), `Onboarding sem "${text}"`)
  }
  // Um unico botao de saida no topo, fora da condicao da tela: vale nas tres telas.
  assert.match(src, /\{replay \? 'Fechar' : 'Pular'\}/, 'Pular/Fechar fora da barra comum a todas as telas')
  assert.match(src, /mode: OnboardingMode/, 'sem a prop mode')
  assert.match(src, /'first' \| 'replay'/, 'mode sem first e replay')
  assert.match(src, /onFinish/, 'sem onFinish')
  assert.match(src, /aria-label="Voltar"/, 'Voltar sem nome acessivel')
})

test('role dialog, aria-modal e o rotulo so existem no ramo replay', () => {
  const src = code(ONB)
  assert.equal((src.match(/role="dialog"/g) ?? []).length, 1, 'role="dialog" deve aparecer uma vez')
  assert.equal((src.match(/aria-modal="true"/g) ?? []).length, 1, 'aria-modal deve aparecer uma vez')
  assert.match(src, /aria-label="Apresentação do Coinc"/, 'sem o rotulo da apresentacao')
  const replayBranch = /if \(replay\) \{[\s\S]*?role="dialog"[\s\S]*?aria-modal="true"[\s\S]*?\n {2}\}\n/.exec(src)
  assert.ok(replayBranch, 'dialog fora do ramo replay')
  assert.match(src, /<main\b/, 'modo first sem <main>')
  assert.match(src, /Escape/, 'replay sem Esc')
  assert.match(src, /FOCUSABLE/, 'replay sem foco preso')
})

test('titulo focavel, descricao e passo sr-only', () => {
  const src = code(ONB)
  assert.match(src, /tabIndex=\{-1\}/, 'titulo sem tabIndex={-1}')
  assert.match(src, /aria-describedby=/, 'titulo sem aria-describedby')
  assert.match(src, /Passo \$\{step \+ 1\} de \$\{SCREENS\.length\}/, 'sem o texto Passo N de 3')
  assert.match(src, /className="sr-only"/, 'Passo sem sr-only')
  assert.match(src, /<h1\b/, 'sem H1')
})

test('Vintem unico, decorativo, calado e com os tres estados (D-19)', () => {
  const src = code(ONB)
  assert.equal((src.match(/<Vintem\b/g) ?? []).length, 1, 'deve haver exatamente uma ocorrencia de <Vintem')
  const tag = /<Vintem\b[^>]*\/>/.exec(src)
  assert.ok(tag, 'tag do Vintem nao encontrada')
  assert.match(tag[0], /\bdecorative\b/, 'Vintem sem decorative')
  assert.match(tag[0], /\bfollow\b/, 'Vintem sem follow')
  assert.doesNotMatch(tag[0], /key=/, 'o Vintem nao pode ter key (nunca remonta)')
  assert.doesNotMatch(src, /onTap|VintemBalloon|VintemInlineRow|VintemContext|useVintem|VintemProvider/, 'o Vintem do onboarding nao fala')
  for (const state of ['neutro', 'atento', 'feliz']) assert.ok(src.includes(`'${state}'`), `sem o estado ${state}`)
  // O Vintem fica fora de qualquer trecho com key (o que remontaria a instancia entre as telas).
  const before = src.slice(0, src.indexOf('<Vintem'))
  const lastKey = before.lastIndexOf('key={step}')
  const lastClose = before.lastIndexOf('</div>')
  assert.ok(lastKey < 0 || lastClose > lastKey, 'o Vintem esta dentro de um trecho com key={step}')
})

test('markOnboardingSeen so no caminho first e nunca na montagem', () => {
  const src = code(ONB)
  assert.equal((src.match(/markOnboardingSeen\(\)/g) ?? []).length, 1, 'markOnboardingSeen deve ser chamado em um unico lugar')
  assert.match(src, /if \(mode === 'first'\) markOnboardingSeen\(\)/, 'gravacao fora do caminho mode === first')
  // Nenhum useEffect chama a gravacao.
  for (const m of src.matchAll(/useEffect\(\(\) => \{[\s\S]*?\n {2}\}, \[[^\]]*\]\)/g)) {
    assert.doesNotMatch(m[0], /markOnboardingSeen/, 'gravacao dentro de um efeito do Onboarding')
  }
})

test('movimento reduzido, passos de instalacao e animacao so por botoes (D-12)', () => {
  const src = code(ONB)
  assert.match(src, /useReducedMotion/, 'sem useReducedMotion')
  assert.match(src, /<InstallSteps\s*\/>/, 'tela 3 sem InstallSteps')
  assert.match(src, /anim-onboarding-in/, 'sem a classe de entrada')
  assert.doesNotMatch(src, /onTouch|onPointer|onDrag|drag=|swipe/i, 'sem gesto de arrastar entre telas')
  const css = read('src/index.css')
  assert.match(css, /\.anim-onboarding-in\s*\{[^}]*onboarding-in 200ms ease-out/, 'index.css sem a animacao de 200 ms')
  const reduced = /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\n\}\n/.exec(css)
  assert.ok(reduced && /\.anim-onboarding-in[\s\S]*?fade-100 100ms/.test(reduced[0]), 'sem a variante de fade de 100 ms no movimento reduzido')
})

test('regiao do meio rola so na vertical, com barra e rodape parados', () => {
  const src = code(ONB)
  assert.match(src, /flex-1[^"]*overflow-y-auto[^"]*overscroll-contain[^"]*no-scrollbar|no-scrollbar[^"]*flex-1[^"]*overflow-y-auto[^"]*overscroll-contain/, 'regiao do meio sem a rolagem so vertical')
  assert.match(src, /sticky bottom-0 [^"]*bg-background/, 'rodape sem sticky bottom-0 bg-background')
  assert.match(src, /env\(safe-area-inset-top\)/, 'barra sem area segura no topo')
  assert.match(src, /env\(safe-area-inset-bottom\)/, 'rodape sem area segura na base')
  assert.match(src, /h-14 w-full bg-action text-action-text/, 'botao principal fora do contrato')
  assert.match(src, /max-w-md/, 'sem a coluna max-w-md')
})

test('ProtectedRoute: carregando, onboarding, LoginForm literal e gravacao silenciosa', () => {
  const src = code(ROUTE)
  const order = ['if (loading)', 'mode="first"', '<LoginForm />', '</>'].map((t) => {
    const at = src.indexOf(t)
    assert.ok(at >= 0, `ProtectedRoute sem ${t}`)
    return at
  })
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'ordem carregando, onboarding, login, app quebrada')
  assert.match(src, /min-h-dvh bg-background/, 'carregamento sem min-h-dvh bg-background')
  assert.doesNotMatch(src, /min-h-screen/, 'carregamento ainda usa min-h-screen')
  const effect = /useEffect\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\)/.exec(src)
  assert.ok(effect && /markOnboardingSeen\(\)/.test(effect[0]), 'a gravacao silenciosa nao esta em um efeito')
  assert.match(effect[0], /user/, 'a gravacao silenciosa nao depende da sessao')
  assert.doesNotMatch(src.replace(effect[0], ''), /markOnboardingSeen\(\)/, 'gravacao fora do efeito (durante a renderizacao)')
  assert.match(src, /readOnboardingSeen\(\)/, 'portao sem readOnboardingSeen')
})

test('o AuthContext nao muda por causa do onboarding', () => {
  assert.doesNotMatch(code(AUTH), /onboarding/i, 'AuthContext conhece o onboarding')
})

test('src/lib/onboarding.ts: so presenca, try e catch, falha conta como visto', () => {
  const src = code(LIB)
  assert.match(src, /coinc:onboarding:v1/, 'chave errada')
  assert.equal((src.match(/\btry\b/g) ?? []).length, 2, 'leitura e gravacao em try e catch')
  assert.match(src, /catch \{\s*return true\s*\}/, 'falha de leitura deve contar como visto')
  assert.match(src, /getItem\(KEY\) !== null/, 'so a presenca da chave importa')
  assert.match(src, /setItem\(KEY, '1'\)/, 'grava 1')
})

test('AppCard tem Rever a apresentacao em modo replay', () => {
  const src = code(CARD)
  for (const text of ['Rever a apresentação', 'As 3 telas de boas-vindas']) assert.ok(src.includes(text), `AppCard sem "${text}"`)
  assert.match(src, /<Onboarding mode="replay"/, 'AppCard sem mode="replay"')
  assert.doesNotMatch(src, /markOnboardingSeen|readOnboardingSeen/, 'o replay nao toca na marca')
})

test('arquivos novos sem hex, sem emoji, na escala 12/16/28/56 e com alvos de toque de 44 px', () => {
  assert.deepEqual(scaleProblems(FILES), [])
  assert.deepEqual(touchProblems(FILES), [])
  for (const f of [ONB, ROUTE, CARD]) {
    assert.doesNotMatch(code(f), /#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(\d/, `${f} com cor literal`)
    assert.doesNotMatch(code(f), /gradient/, `${f} com degrade`)
  }
})

test('o executor onboarding.mjs cobre os cenarios, a porta 5193 e termina em FALHAS n', () => {
  const src = read(AUDIT)
  assert.match(src, /PORT = 5193/, 'porta errada')
  assert.match(src, /127\.0\.0\.1/, 'sem 127.0.0.1')
  assert.match(src, /console\.log\(`FALHAS \$\{failed\.length\}`\)/, 'sem a linha final FALHAS n')
  assert.doesNotMatch(src, /readFile[^\n]*\.env|dotenv/, 'o executor le .env')
  for (const text of ['--smoke', 'prefers-reduced-motion', 'Rever a apresentação', 'Storage.prototype', '10, 21, 16', 'Passo']) {
    assert.ok(src.includes(text), `executor sem ${text}`)
  }
})
