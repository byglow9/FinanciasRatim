// Guarda estatica do onboarding de quatro telas (IDEN-08, IDEN-03, D-12, D-17, D-18, P-02, P-03, P-05).
// Plano 05-23: o visual e a estrutura vem do sketch 029 (D-20 a D-22, que substituem D-16 e D-19): o
// Vintem de entrada fala num balao, o celular mostra o print real do tema e a ultima tela traz os passos.
// Rodar: node --test test/static/phase5-onboarding.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, code, exists, read, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const ONB = 'src/components/onboarding/Onboarding.tsx'
const LIB = 'src/lib/onboarding.ts'
const ROUTE = 'src/components/auth/ProtectedRoute.tsx'
const CARD = 'src/components/settings/AppCard.tsx'
const AUTH = 'src/contexts/AuthContext.tsx'
const AUDIT = 'scripts/ux-audit/onboarding.mjs'
const SCENES = 'src/components/onboarding/onboardingScenes.ts'
const PARTS = 'src/components/onboarding/OnboardingParts.tsx'
const WELCOME = 'src/components/onboarding/WelcomeScene.tsx'
const INSTALL = 'src/components/onboarding/InstallScene.tsx'
const STEPS = 'src/components/onboarding/InstallSteps.tsx'
const NEW_FILES = [SCENES, PARTS, WELCOME, INSTALL]
const SHELL_FILES = [ONB, ...NEW_FILES]
const FILES = [ONB, LIB, ROUTE, CARD, ...NEW_FILES]
const PRINTS_DIR = 'src/assets/onboarding'
const PRINT_NAMES = ['home', 'limites', 'calendario'].flatMap((n) => [`${n}-claro`, `${n}-escuro`])

test('os arquivos do onboarding existem', () => {
  for (const f of [...FILES, AUDIT]) assert.ok(exists(f), `${f} ausente`)
})

test('os textos das quatro telas vem do sketch 029 e a ultima nao diz instalar (S29-11, D-11)', () => {
  const src = code(SCENES)
  for (const text of [
    'Seu mês, num número',
    'Oi, eu sou o Vintém! Eu cuido das suas contas e digo quanto ainda dá para gastar no mês.',
    'Um teto por categoria',
    'Dê um teto para cada categoria. Se você chegar perto, eu aviso antes de estourar.',
    'Tudo no calendário',
    'As contas fixas e os eventos ficam no calendário. Eu aviso antes de vencer.',
    'Coinc na tela inicial',
    'Abre em tela cheia, como um app.',
  ]) {
    assert.ok(src.includes(`'${text}'`), `onboardingScenes sem "${text}"`)
  }
  assert.equal((src.match(/^\s+id: '[a-z0-9]+',$/gm) ?? []).length, 4, 'o onboarding tem quatro telas (S29-09)')
  assert.doesNotMatch(src, /instal/i, 'o titulo da ultima tela nunca diz instalar (D-11)')
  // As telas antigas do 05-14 (cartao "Pode gastar" com valor ficticio) nao existem mais.
  for (const f of SHELL_FILES) {
    const c = code(f)
    for (const old of ['R$ 1.240', 'Veja quanto ainda pode gastar', 'Limites e o Vintém', 'Exemplo', 'Clapperboard']) {
      assert.ok(!c.includes(old), `${f} ainda tem "${old}" do visual antigo`)
    }
  }
  assert.doesNotMatch(code(ONB), /<Chip\b|<Progress\b|bg-card p-4"[\s\S]{0,80}<Vintem/, 'cartao antigo atras do Vintem')
})

test('Onboarding tem os botoes e as props do contrato, com Pular, Agora nao e Fechar na barra comum (S29-15)', () => {
  const src = code(ONB)
  for (const text of ['Pular', 'Agora não', 'Voltar', 'Continuar', 'Já adicionei', 'Entrar', 'Concluir', 'Fechar']) {
    assert.ok(src.includes(`'${text}'`) || src.includes(`>${text}<`) || new RegExp(`^\\s*${text}$`, 'm').test(src), `Onboarding sem "${text}"`)
  }
  // Um unico botao de saida no topo, fora da condicao da tela: vale em todas as telas.
  assert.match(src, /\{replay \? 'Fechar' : isLast && !isApp \? 'Agora não' : 'Pular'\}/, 'barra comum sem Fechar, Agora nao e Pular (Pular quando ja e app)')
  // Plano 05-23 (S29-15, D-12): o botao principal da ultima tela e Ja adicionei (Entrar quando ja e app, Concluir no replay).
  assert.match(src, /isLast \? \(replay \? 'Concluir' : isApp \? 'Entrar' : 'Já adicionei'\) : 'Continuar'/, 'botao principal da ultima tela fora do contrato')
  assert.match(src, /usePwaInstall\(\)/, 'a casca nao sabe se ja e app')
  assert.match(src, /mode: OnboardingMode/, 'sem a prop mode')
  assert.match(src, /'first' \| 'replay'/, 'mode sem first e replay')
  assert.match(src, /onFinish/, 'sem onFinish')
  assert.match(src, /tabIndex=\{step === 0 \? -1 : undefined\}/, 'Voltar da tela 1 deve sair do foco')
  assert.match(src, /step === 0 && 'invisible'/, 'Voltar da tela 1 deve ficar invisivel')
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

test('titulo focavel, descricao e Passo N de 4 sr-only', () => {
  const src = code(ONB)
  assert.match(src, /tabIndex=\{-1\}/, 'titulo sem tabIndex={-1}')
  assert.match(src, /aria-describedby=/, 'titulo sem aria-describedby')
  assert.match(src, /Passo \$\{step \+ 1\} de \$\{SCENES\.length\}/, 'sem o texto Passo N de SCENES.length')
  assert.match(src, /className="sr-only"/, 'Passo sem sr-only')
  assert.match(src, /<h1\b/, 'sem H1')
  assert.match(src, /font-display text-\[28px\] font-bold leading-\[1\.2\]/, 'titulo fora do estilo de 28/700')
})

test('quatro pontos de progresso e o botao principal de 56 px', () => {
  const src = code(ONB)
  assert.match(src, /SCENES\.map\(\(s, index\)/, 'os pontos nao seguem SCENES (quatro)')
  assert.match(src, /h-1\.5 rounded-full/, 'ponto fora do contrato')
  assert.match(src, /index === step \? 'w-5 bg-action' : 'w-1\.5 bg-input'/, 'ponto ativo fora do contrato')
  assert.doesNotMatch(src, /transition/, 'os pontos nao tem transicao')
  assert.match(src, /h-14 w-full bg-action text-action-text/, 'botao principal fora do contrato')
})

test('um Vintem de entrada por cena, decorativo e sem seguir o ponteiro; nenhum na casca (S29-16)', () => {
  const scene = code(WELCOME)
  assert.equal((scene.match(/<Vintem\b/g) ?? []).length, 1, 'WelcomeScene deve ter exatamente um <Vintem')
  const tag = /<Vintem\b[^>]*\/>/.exec(scene)
  assert.ok(tag, 'tag do Vintem nao encontrada')
  assert.match(tag[0], /look="entrada"/, 'Vintem sem look="entrada"')
  assert.match(tag[0], /\bdecorative\b/, 'Vintem sem decorative')
  assert.match(tag[0], /follow=\{false\}/, 'Vintem sem follow={false}')
  assert.match(tag[0], /size="stage"/, 'Vintem sem size="stage"')
  assert.doesNotMatch(code(ONB), /<Vintem\b/, 'a casca nao monta Vintem: cada cena monta o seu')
  // A cena e remontada por passo, com key.
  assert.match(code(ONB), /<WelcomeScene key=\{step\}/, 'cena sem key por passo')
  for (const f of SHELL_FILES) {
    assert.doesNotMatch(code(f), /onTap|VintemBalloon|VintemInlineRow|VintemContext|useVintem|VintemProvider/, `${f}: o Vintem do onboarding nao usa contexto nem balao do app`)
    assert.doesNotMatch(code(f), /\bfetch\(|https?:\/\/|XMLHttpRequest/, `${f}: sem rede nem URL externa (T-05-23-01)`)
  }
  // O Vintem esta dentro de um trecho aria-hidden (decorativo e nao focavel).
  assert.match(scene, /className="onb-vintem" aria-hidden="true"/, 'Vintem fora do trecho aria-hidden')
  // Os estados do roteiro existem e a fala nao acompanha o ponteiro.
  for (const state of ['neutro', 'atento', 'feliz']) assert.ok(code(SCENES).includes(`'${state}'`), `sem o estado ${state}`)
  assert.match(scene, /react\('susto'\)/, 'tela 2 sem o susto')
  assert.match(scene, /react\('festa'\)/, 'tela 3 sem a festa')
  assert.match(scene, /gazeTo/, 'sem olhar guiado')
})

test('InstallScene: mesmos textos e mesmo hook do 05-11, passos tocaveis e Adicionar agora so com canPrompt (D-11, D-12, D-22)', () => {
  const src = code(INSTALL)
  assert.match(src, /usePwaInstall\(\)/, 'cena sem usePwaInstall')
  assert.match(src, /import \{ ADDED_TEXT, ALREADY_APP_TEXT, DEVICE_OPTIONS \} from '@\/components\/onboarding\/InstallSteps'/, 'cena sem os textos compartilhados')
  assert.match(src, /\{canPrompt \? \(\s*<Button[\s\S]*?Adicionar agora/, 'Adicionar agora fora da condicao canPrompt')
  assert.equal((src.match(/Adicionar agora/g) ?? []).length, 1, 'Adicionar agora deve aparecer uma vez')
  assert.match(src, /outcome === 'accepted'/, 'so o resultado aceito mostra o texto de adicionado')
  assert.match(src, /ALREADY_APP_TEXT/, 'sem o texto de ja e app')
  assert.match(src, /ariaLabel="Aparelho"/, 'seletor sem ariaLabel="Aparelho"')
  assert.match(src, /aria-pressed=\{on\}/, 'passos sem aria-pressed')
  assert.match(src, /data-platform=\{device\}/, 'sem data-platform')
  assert.match(src, /data-step=\{step\}/, 'sem data-step')
  for (const text of [
    'Abra o menu do Chrome', 'Adicionar à tela inicial', 'Confirme em Adicionar',
    'Compartilhar, no Safari', 'Adicionar à Tela de Início', 'Toque em Adicionar',
  ]) assert.ok(src.includes(`'${text}'`), `InstallScene sem o passo "${text}"`)
  assert.match(src, /min-h-11 w-full/, 'passo sem alvo de 44 px')
  // Um so Vintem de entrada, decorativo e sem seguir o ponteiro.
  assert.equal((src.match(/<Vintem\b/g) ?? []).length, 1, 'InstallScene deve ter exatamente um <Vintem')
  const tag = /<Vintem\b[^>]*\/>/.exec(src)
  assert.ok(tag, 'tag do Vintem nao encontrada')
  assert.match(tag[0], /look="entrada"/)
  assert.match(tag[0], /\bdecorative\b/)
  assert.match(tag[0], /follow=\{false\}/)
  // Avanco automatico unico, cancelado no primeiro toque e desligado com movimento reduzido.
  assert.match(src, /if \(reduced \|\| isStandalone\) return/, 'temporizadores ligados com movimento reduzido')
  assert.match(src, /stopAuto\(\)/, 'o toque nao encerra o avanco automatico')
  assert.match(src, /AUTO_AT = \[1\.2, 4\.3, 7\.4\]/, 'tempos do avanco automatico')
  assert.doesNotMatch(src, /setInterval/, 'avanco automatico em laco')
  assert.doesNotMatch(src, /disabled=\{[^}]*(step|reduced)/, 'botao desabilitado esperando animacao')
  // A casca exporta os mesmos textos que Ajustes usa.
  const steps = code(STEPS)
  for (const name of ['ADDED_TEXT', 'ALREADY_APP_TEXT', 'DEVICE_OPTIONS']) assert.match(steps, new RegExp(`export const ${name}\\b`), `InstallSteps sem export de ${name}`)
})

test('o roteiro so liga temporizadores na montagem, apaga ao desmontar e some com movimento reduzido', () => {
  const scene = code(WELCOME)
  assert.match(scene, /if \(reduced\) return/, 'cena liga temporizador com movimento reduzido')
  assert.match(scene, /clearTimeout/, 'cena nao apaga os temporizadores')
  assert.match(scene, /clearInterval/, 'cena nao apaga o intervalo do olhar')
  assert.match(scene, /useState<SceneState>\(reduced \? scene\.finalState : 'neutro'\)/, 'cena reduzida nao nasce na pose final')
  assert.match(scene, /data-scene=\{scene\.id\}/, 'sem data-scene')
  assert.match(scene, /data-vintem-state=\{vstate\}/, 'sem data-vintem-state')
  const parts = code(PARTS)
  assert.match(parts, /if \(reduced\) return/, 'balao ou lente com temporizador no movimento reduzido')
  assert.match(parts, /const typed = reduced \? text\.length : count/, 'balao reduzido sem a fala inteira')
})

test('balao: texto completo para leitor de tela, espacador invisivel de altura e texto digitado por cima', () => {
  const src = code(PARTS)
  assert.match(src, /<span className="sr-only" data-say-full>/, 'balao sem o texto completo em sr-only')
  assert.match(src, /aria-hidden="true" className="invisible block"/, 'balao sem espacador invisivel')
  assert.match(src, /data-say-typed/, 'balao sem o texto digitado')
  assert.match(src, /anim-vintem-say/, 'balao sem a entrada anim-vintem-say')
  assert.match(src, /bg-action[^"]*text-action-text/, 'balao fora do verde de acao')
  assert.doesNotMatch(src, /dangerouslySetInnerHTML|innerHTML/, 'balao com HTML bruto')
})

test('prints: seis WebP importados de @/assets/onboarding, trocados por tema, ate 60 KB e fora de public/', () => {
  const src = code(PARTS)
  for (const name of PRINT_NAMES) {
    assert.ok(src.includes(`'@/assets/onboarding/${name}.webp'`), `OnboardingParts sem o import de ${name}`)
    const file = path.join(ROOT, PRINTS_DIR, `${name}.webp`)
    assert.ok(fs.existsSync(file), `${name}.webp ausente`)
    assert.ok(fs.statSync(file).size <= 60 * 1024, `${name}.webp passa de 60 KB`)
    assert.ok(!exists(`public/${name}.webp`) && !exists(`public/onboarding/${name}.webp`), `${name}.webp em public/`)
  }
  assert.match(src, /useTheme\(\)/, 'o print nao acompanha o tema')
  assert.match(src, /resolved === 'escuro'/, 'print sem a troca claro e escuro')
  assert.match(src, /alt=""/, 'print com alt')
  assert.match(src, /aria-hidden="true"/, 'moldura sem aria-hidden')
  assert.match(src, /draggable=\{false\}/, 'print arrastavel')
  assert.match(src, /decoding="sync"/, 'print sem decoding sync')
  const vite = read('vite.config.ts')
  assert.doesNotMatch(vite, /webp/, 'o pre-cache nao lista webp (D-15): so a casca')
})

test('aneis e lente: retangulos do print em porcentagem, lente com Progress e tom de aviso a partir de 80%', () => {
  const src = code(PARTS)
  assert.match(src, /\/ PRINT_SIZE\.w\) \* 100/, 'anel sem conversao em porcentagem')
  assert.match(src, /<Progress\b/, 'lente sem Progress')
  assert.match(src, /tone=\{hot \? 'warn' : 'ok'\}/, 'lente sem o tom de aviso')
  assert.match(src, /text-warn-ink/, 'lente sem o texto de aviso')
  assert.match(src, /Intl\.NumberFormat\('pt-BR'/, 'lente sem Intl.NumberFormat pt-BR')
  // Sem requestAnimationFrame: a guarda do laco unico da Fase 4 so o permite em world.ts, ArcGauge e useSectionReveal.
  assert.doesNotMatch(src, /requestAnimationFrame/, 'contagem com requestAnimationFrame fora do laco unico')
  assert.match(src, /performance\.now\(\)/, 'contagem por tempo decorrido')
  const cenas = code(SCENES)
  assert.match(cenas, /HOME_RING: PrintRect = \[40, 236, 310, 112\]/, 'anel do Pode gastar fora das coordenadas do sketch')
  for (const d of ['{ day: 8, cx: 36, cy: 316 }', '{ day: 14, cx: 354, cy: 316 }', '{ day: 19, cx: 247, cy: 368 }', '{ day: 23, cx: 88, cy: 420 }']) {
    assert.ok(cenas.includes(d), `onboardingScenes sem ${d}`)
  }
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

test('movimento reduzido, passos na ultima tela e navegacao so por botoes (D-12)', () => {
  const src = code(ONB)
  assert.match(src, /useReducedMotion/, 'sem useReducedMotion')
  assert.match(src, /reduced=\{reduced\}/, 'a cena nao recebe o movimento reduzido')
  assert.match(src, /<InstallScene reduced=\{reduced\} \/>/, 'ultima tela sem a cena de adicionar a tela inicial')
  assert.doesNotMatch(src, /InstallSteps/, 'a casca nao usa mais InstallSteps (so Ajustes)')
  assert.match(src, /anim-onboarding-in/, 'sem a classe de entrada')
  assert.doesNotMatch(src, /onTouch|onPointer|onDrag|drag=|swipe/i, 'sem gesto de arrastar entre telas')
  const css = read('src/index.css')
  assert.match(css, /\.anim-onboarding-in\s*\{[^}]*onboarding-in 200ms ease-out/, 'index.css sem a animacao de 200 ms')
  const reduced = /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\n\}\n/.exec(css)
  assert.ok(reduced && /\.anim-onboarding-in[\s\S]*?fade-100 100ms/.test(reduced[0]), 'sem a variante de fade de 100 ms no movimento reduzido')
  // Plano 05-23: a queda do Vintem e o brilho viram so fade com movimento reduzido.
  assert.match(css, /\.onb-drop\s*\{[^}]*onb-drop 520ms/, 'index.css sem a queda do Vintem (520 ms)')
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.onb-drop,\s*\.onb-halo \{\s*animation: fade-100 100ms ease-out !important/, 'sem o fade da queda no movimento reduzido')
  assert.match(css, /\.onb-ring,\s*\.onb-lens,\s*\.onb-marker,\s*\.onb-sheet \{\s*transition: none !important/, 'aneis, lente, marcador e folhas com transicao no movimento reduzido')
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

test('AppCard tem Rever a apresentacao em modo replay (As telas de boas-vindas, D-17)', () => {
  const src = code(CARD)
  for (const text of ['Rever a apresentação', 'As telas de boas-vindas']) assert.ok(src.includes(text), `AppCard sem "${text}"`)
  assert.doesNotMatch(src, /As 3 telas/, 'AppCard ainda diz 3 telas')
  assert.match(src, /<Onboarding mode="replay"/, 'AppCard sem mode="replay"')
  assert.doesNotMatch(src, /markOnboardingSeen|readOnboardingSeen/, 'o replay nao toca na marca')
})

test('arquivos do onboarding sem hex, sem emoji, na escala 12/16/28/56 e com alvos de toque de 44 px', () => {
  assert.deepEqual(scaleProblems(FILES), [])
  assert.deepEqual(touchProblems(FILES), [])
  for (const f of [ONB, ROUTE, CARD, ...NEW_FILES]) {
    assert.doesNotMatch(code(f), /#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(\d/, `${f} com cor literal`)
    assert.doesNotMatch(code(f), /gradient/, `${f} com degrade`)
  }
})

test('index.css tem o bloco do plano 05-23 com as variaveis do celular e do anel nos dois temas', () => {
  const css = read('src/index.css')
  for (const v of ['--onb-bezel', '--onb-bezline', '--onb-ring', '--onb-marker', '--onb-marker-ink']) {
    assert.ok(css.includes(`${v}:`), `index.css sem ${v}`)
  }
  assert.match(css, /--onb-bezel: #0e1311;/, 'celular do tema claro')
  assert.match(css, /\.dark \{\s*--onb-bezel: #1b2822;/, 'celular do tema escuro')
  assert.match(css, /\.onb-halo \{[^}]*radial-gradient/, 'o degrade do onboarding vive em index.css')
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
