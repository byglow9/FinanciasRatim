// Guarda estatica do cliente da fala por IA da Fase 7 (IA-01, IA-03, IA-04, D-01, D-14, D-16).
// Rodar: node --test test/static/phase7-speech-ui.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { code, read } from './helpers/phase3-1.js'

const SERVICE = 'src/services/vintemSpeech.service.ts'
const CONTEXT = 'src/contexts/VintemContext.tsx'
const HOME_HOOK = 'src/hooks/useHomeVintem.ts'
const PEEK_HOOK = 'src/hooks/useVintemPeek.ts'
const TOAST = 'src/components/vintem/VintemToast.tsx'
const BALLOON = 'src/components/vintem/VintemHomeBalloon.tsx'

/** Corpo (do abre-chaves ate o fecha-chaves correspondente) da funcao `name` no texto `src`. */
function body(src, name) {
  const start = src.search(new RegExp(`const ${name} = useCallback`))
  assert.ok(start >= 0, `funcao ${name} nao encontrada`)
  const open = src.indexOf('{', src.indexOf('=>', start))
  let depth = 0
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1
    if (src[i] === '}') {
      depth -= 1
      if (depth === 0) return src.slice(open, i + 1)
    }
  }
  assert.fail(`corpo de ${name} sem fechamento`)
}

test('servico: prazo do cliente, try e catch, sem console e nulo sem servidor ou em MOCK', () => {
  const src = code(SERVICE)
  assert.match(src, /AbortSignal\.timeout\(timeoutMs\)/, 'sem AbortSignal.timeout')
  assert.match(src, /try \{/)
  assert.match(src, /catch \{/)
  assert.ok(!/console\./.test(src), 'o servico nao registra nada')
  assert.match(src, /if \(MOCK \|\| !API_URL\) return null/, 'sem o retorno nulo em MOCK e sem URL')
  assert.match(src, /export const ASK_TIMEOUT_REACTION_MS = 2500/)
  assert.match(src, /export const ASK_TIMEOUT_OPEN_MS = 4000/)
  assert.match(src, /\/api\/vintem\/fala/)
  assert.match(src, /Authorization: `Bearer \$\{token\}`/, 'sem o ID token')
})

test('servico: o corpo do pedido so tem situation e categoryId', () => {
  const src = code(SERVICE)
  assert.match(src, /const body: \{ situation: AskSituation; categoryId\?: string \} = \{ situation \}/)
  assert.match(src, /body\.categoryId = categoryId/)
  const keys = [...src.matchAll(/\bbody\.(\w+)\s*=/g)].map((m) => m[1])
  assert.deepEqual(keys, ['categoryId'], 'o corpo ganhou outro campo')
  assert.match(src, /body: JSON\.stringify\(body\)/)
  // A lista de situacoes e fechada.
  assert.match(src, /'lancamento' \| 'limite' \| 'sync' \| 'abertura' \| 'espiar'/)
  // O texto da resposta so volta se for string curta e nao vazia.
  assert.match(src, /typeof text !== 'string'/)
  assert.match(src, /MAX_TEXT_LENGTH = 300/)
})

test('contexto: askVintem so e chamado dentro de askGuarded, usado por speakAi, deliver e espiar', () => {
  const src = code(CONTEXT)
  assert.equal((src.match(/\baskVintem\(/g) ?? []).length, 1, 'askVintem chamado em mais de um lugar')
  assert.ok(body(src, 'askGuarded').includes('askVintem('), 'askVintem fora de askGuarded')
  assert.ok(body(src, 'speakAi').includes('askGuarded('), 'speakAi sem askGuarded')
  assert.ok(body(src, 'deliver').includes('askGuarded('), 'deliver sem askGuarded')
  assert.ok(body(src, 'espiar').includes('askGuarded('), 'espiar sem askGuarded')
  assert.equal((src.match(/\baskGuarded\(/g) ?? []).length, 3, 'askGuarded usado fora de speakAi, deliver e espiar')
})

test('contexto: so a pessoa logada, no proprio perfil e fora do somente leitura pede a IA (D-14)', () => {
  const src = code(CONTEXT)
  assert.match(src, /const canAsk = user !== null && user\.person === viewPerson && !readOnly/)
  const guarded = body(src, 'askGuarded')
  assert.match(guarded, /if \(!canAsk \|\| askInFlight\.current\) return null/, 'askGuarded sem o portao canAsk')
})

test('contexto: a fala da IA e texto React, sem HTML bruto, e o contexto nao registra nada', () => {
  for (const f of [CONTEXT, TOAST, BALLOON, 'src/components/vintem/VintemBalloon.tsx']) {
    const src = code(f)
    assert.ok(!/dangerouslySetInnerHTML|innerHTML|insertAdjacentHTML/.test(src), `${f} com HTML bruto`)
  }
  const ctx = code(CONTEXT)
  assert.ok(!/console\./.test(ctx), 'contexto com console')
  // O texto da IA entra no toast do Vintem como propriedade de texto e no balao pelo estado de fala.
  assert.match(ctx, /<VintemToastBody text=\{text\}/, 'o toast nao recebe a fala como texto')
  assert.match(ctx, /setSpeech\(\{ id: `ia-\$\{popCounter\.current\}`, text, situation/, 'speakText nao guarda o texto puro')
  assert.match(code(TOAST), /\{text\}/)
})

test('contexto: o reflexo de porquinho e de meta continua so do banco de frases', () => {
  const src = code(CONTEXT)
  assert.match(src, /kind === 'gasto' \|\| kind === 'receita'/, 'a IA nao se limita a gasto e receita')
  assert.match(src, /void deliver\('festa', 'meta-batida', \{ valorCents \}\)/, 'meta sem ser so do banco')
})

test('a situacao limite so vale para as tres situacoes de limite do nucleo', () => {
  const src = code(CONTEXT)
  assert.match(
    src,
    /LIMIT_SITUATIONS: ReadonlySet<string> = new Set\(\['limite-atento', 'limite-perto', 'limite-estourou'\]\)/,
    'conjunto de situacoes de limite alterado',
  )
  assert.match(src, /situation: limitSituation \? 'limite' : 'lancamento'/, 'a situacao da IA nao sai do conjunto')
  assert.equal((src.match(/'limite'/g) ?? []).length, 1, "'limite' usado fora da escolha da situacao da IA")
  // A reserva e sempre a frase do banco da situacao decidida pelo nucleo.
  assert.match(src, /deliver\(result\.reaction, result\.situation, raw, ai(, fact)?\)/)
})

test('a situacao sync so vem do gasto importado do banco; o toque nao chama a IA', () => {
  const hook = code(HOME_HOOK)
  assert.equal((hook.match(/situation: 'sync'/g) ?? []).length, 1, 'sync fora do ramo do gasto importado')
  // O hook nao importa servico (guarda da Fase 4): o prazo da abertura e o padrao de speakAi.
  assert.ok(!/vintemSpeech\.service/.test(hook), 'o hook importa o servico da fala')
  assert.match(body(code(CONTEXT), 'speakAi'), /timeoutMs: ai\.timeoutMs \?\? ASK_TIMEOUT_OPEN_MS/, 'speakAi sem o prazo padrao da abertura')
  assert.match(hook, /categoryId: bankArrival\.categoryId/, 'sync sem a categoria da chegada')
  assert.equal((hook.match(/\bspeakAi\(/g) ?? []).length, 2, 'speakAi fora da abertura e do gasto importado')
  const effect = hook.slice(hook.indexOf('const reactedKey'), hook.indexOf('// Toque:'))
  assert.match(effect, /void speakAi\(/, 'speakAi sem void')
  assert.match(
    effect,
    /fallback: \{ situation: result\.situation, raw, announce: true(, \.\.\.scene)? \}/,
    'reserva diferente da fala antiga',
  )
  assert.match(effect, /!enabled \|\| readOnly \|\| view\.isPast/, 'portao do gasto importado alterado')
  // O toque segue so com o banco de frases.
  const tap = hook.slice(hook.indexOf('const onTap'))
  assert.ok(!/speakAi|askVintem/.test(tap), 'o toque chama a IA')
  assert.ok(!/askVintem/.test(hook), 'o hook pede a IA direto')
})

test('abertura: uma pergunta por carga do app, por variavel de modulo, com a fala do banco como reserva', () => {
  const hook = code(HOME_HOOK)
  // As duas marcas sao variaveis de modulo: a da IA (suave e direto) e a da entrada do sem filtro (07.1, D-10).
  assert.match(hook, /^let openingAsked = false/m, 'a marca da abertura precisa ser variavel de modulo')
  assert.match(hook, /^let entradaFalada = false/m, 'a marca da entrada precisa ser variavel de modulo')
  assert.equal((hook.match(/situation: 'abertura'/g) ?? []).length, 1, 'abertura pedida em mais de um lugar')
  assert.equal((hook.match(/openingAsked = true/g) ?? []).length, 1)
  assert.equal((hook.match(/entradaFalada = true/g) ?? []).length, 1)
  const inHook = hook.slice(hook.indexOf('export function useHomeVintem'))
  assert.ok(!/openingAsked = false/.test(inHook), 'a marca da abertura e zerada no hook')
  assert.ok(!/entradaFalada = false/.test(inHook), 'a marca da entrada e zerada no hook')
  const entry = hook.slice(hook.indexOf('const spokenKey'), hook.indexOf('const reactedKey'))
  // Sem filtro: a primeira entrada da carga sai do acervo (entrada: true) e nunca pede a IA (D-10, D-35).
  const semFiltro = entry.indexOf("tone === 'sem-filtro'")
  assert.ok(semFiltro >= 0, 'sem o ramo do sem filtro')
  const rest = entry.indexOf('if (openingAsked || bankArrival !== null)')
  assert.ok(rest > semFiltro, 'o ramo de suave e direto precisa vir depois do sem filtro')
  const branch = entry.slice(semFiltro, rest)
  assert.ok(!/speakAi\(|openingAsked/.test(branch), 'o sem filtro pede a IA na entrada')
  assert.equal((entry.match(/entrada: true/g) ?? []).length, 1, 'entrada: true fora do ramo do sem filtro')
  assert.ok(branch.includes('entrada: true'), 'o sem filtro nao pede o acervo')
  assert.ok(branch.includes('entradaFalada = true'), 'o sem filtro nao marca a entrada')
  // Suave e direto: segunda fala de entrada da mesma carga, ou gasto novo do banco para reagir, so o banco de frases.
  assert.match(entry, /if \(openingAsked \|\| bankArrival !== null\) \{\s*speak\(entry\)\s*return\s*\}/)
  assert.ok(entry.indexOf('openingAsked = true') < entry.indexOf('speakAi('), 'marca depois do pedido')
  assert.match(entry, /void speakAi\(\{ ai: \{ situation: 'abertura' \}, fallback: entry \}\)/, 'sem a reserva da entrada')
  assert.match(entry, /announce: false/, 'a fala de entrada nunca e anunciada')
  // O portao neutro (somente leitura, ciclo passado, sem renda) vem antes de qualquer pedido.
  assert.ok(entry.indexOf('situation === null') < entry.indexOf('speakAi('), 'abertura sem o portao neutro')
  assert.ok(entry.indexOf('situation === null') < semFiltro, 'entrada sem o portao neutro')
})

test('voto: o contexto sorteia a entrada do acervo sem as reprovadas e so o sem filtro tem o botao (D-12, D-35)', () => {
  const src = code(CONTEXT)
  assert.match(src, /const canVote = canAsk\b/, 'canVote precisa ser igual a canAsk')
  // O sorteio do acervo (selectLine) recebe as reprovadas e vale so no sem filtro; a entrada pede a cena entrou.
  assert.match(src, /rejected,/, 'o sorteio nao recebe as reprovadas')
  assert.match(src, /const rejected = \[\.\.\.readRejected\(\), \.\.\.serverRejected\.current\]/, 'reprovadas do aparelho e do servidor')
  assert.match(src, /if \(tone === 'sem-filtro'\) \{/, 'o acervo vale so para o sem filtro')
  assert.match(src, /entrada === true \? \[cena \?\? 'entrou'\]/, 'a entrada nao pede a cena entrou')
  assert.match(body(src, 'rate'), /votar\(id, voto\)/)
  const balloon = code(BALLOON)
  assert.match(balloon, /speech\.votavel === true && canVote/)
  assert.match(balloon, /key=\{speech\.id\}/)
})

test('resposta atrasada ou de outra tela e descartada: geracao e escopo conferidos antes de mostrar', () => {
  const src = code(CONTEXT)
  const guarded = body(src, 'askGuarded')
  assert.match(guarded, /const startedGen = speechGen\.current/, 'askGuarded nao guarda a geracao do pedido')
  assert.match(guarded, /const startedIn = scopeRef\.current/, 'askGuarded nao guarda o escopo do pedido')
  assert.match(
    guarded,
    /scopeRef\.current !== startedIn \|\| speechGen\.current !== startedGen\) return 'stale'/,
    'a resposta nao e conferida contra escopo e geracao',
  )
  // Toda fala mostrada, dispensada ou troca de escopo sobe a geracao.
  const bumps = (src.match(/speechGen\.current \+= 1/g) ?? []).length
  assert.ok(bumps >= 5, `a geracao sobe em poucos lugares (${bumps})`)
  for (const name of ['speak', 'dismiss', 'speakText']) {
    assert.ok(body(src, name).includes('speechGen.current += 1'), `${name} nao sobe a geracao`)
  }
  assert.match(src, /useEffect\(\(\) => \{\s*scopeRef\.current = scopeKey\s*speechGen\.current \+= 1/, 'troca de escopo nao sobe a geracao')
  // As chamadas de speakAi e deliver descartam 'stale' sem mostrar nada.
  assert.match(body(src, 'speakAi'), /if \(text === 'stale'\) return/)
  assert.match(body(src, 'deliver'), /if \(answer === 'stale'\) return/)
})

test('no maximo um pedido a IA em voo por vez e uma unica variavel para isso', () => {
  const src = code(CONTEXT)
  assert.equal((src.match(/useRef\(false\)/g) ?? []).length, 1, 'mais de uma variavel de pedido em voo')
  assert.match(src, /const askInFlight = useRef\(false\)/)
  const guarded = body(src, 'askGuarded')
  assert.match(guarded, /if \(!canAsk \|\| askInFlight\.current\) return null/, 'segundo pedido nao cai no banco')
  assert.match(guarded, /askInFlight\.current = true/)
  assert.match(guarded, /finally \{\s*askInFlight\.current = false/, 'o pedido em voo nao e liberado no finally')
  assert.ok(guarded.indexOf('askInFlight.current = true') < guarded.indexOf('askVintem('), 'em voo marcado depois do pedido')
})

test('a fala da IA e anunciada uma vez so e speakAi nunca lanca, com reserva do banco', () => {
  const src = code(CONTEXT)
  const text = body(src, 'speakText')
  assert.match(text, /lastAnnounced\.current !== text/, 'speakText anuncia o mesmo texto de novo')
  assert.match(text, /setAnnounced\(say \? text : ''\)/)
  const ai = body(src, 'speakAi')
  assert.match(ai, /try \{/, 'speakAi sem try')
  assert.match(ai, /catch \{\s*speak\(fallback\)/, 'speakAi sem reserva no catch')
  assert.match(ai, /speak\(fallback\)/)
  const deliver = body(src, 'deliver')
  assert.match(deliver, /try \{/, 'deliver sem try')
  assert.match(deliver, /catch \{/, 'deliver sem catch')
  const launched = body(src, 'onLaunched')
  assert.match(launched, /await deliver\(/, 'onLaunched nao espera o deliver (que nunca lanca)')
  assert.match(launched, /catch \{/, 'onLaunched perdeu o catch')
})

// ---------------------------------------------------------------------------------------------
// Prazo das reacoes configuravel no servidor (07-16): o valor de GET /hints chega as reacoes.
// O servico e executado de verdade (transpilado), com Firebase, ambiente e fetch falsos.
// ---------------------------------------------------------------------------------------------

function runService({ api = 'https://api.exemplo.test', mock = false, fetchImpl, user = { token: 'tok-1' } } = {}) {
  const source = read(SERVICE).replace(/import\.meta\.env/g, '__env')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const calls = []
  const fakeFetch = async (url, init) => {
    calls.push({ url: String(url), init })
    return fetchImpl(url, init)
  }
  const auth = {
    get currentUser() {
      return user.token ? { getIdToken: async () => user.token } : null
    },
  }
  const modules = { '@/lib/firebase': { auth }, '@/lib/mockStorage': { MOCK: mock } }
  const exports = {}
  const require = (name) => modules[name] ?? assert.fail(`import nao esperado no servico: ${name}`)
  new Function('exports', 'require', '__env', 'fetch', outputText)(exports, require, { VITE_BANK_API_URL: api }, fakeFetch)
  return { service: exports, calls, user }
}

const json = (data, status = 200) => async () => new Response(JSON.stringify(data), { status })
const SENT = { peekMinMs: 120000, peekMaxMs: 240000, peekPerDay: 4, openPerDay: 2, reactionTimeoutMs: 3300 }
const FALLBACK = { peekMinMs: 360000, peekMaxMs: 900000, peekPerDay: 6, openPerDay: 3, reactionTimeoutMs: 2500 }

test('getReactionTimeoutMs devolve o valor que veio dos hints do servidor', async () => {
  const { service, calls } = runService({ fetchImpl: json(SENT) })
  assert.equal(service.getReactionTimeoutMs(), 2500, 'antes dos hints vale o padrao')
  assert.deepEqual({ ...(await service.getVintemHints()) }, SENT)
  assert.equal(service.getReactionTimeoutMs(), 3300, 'o valor dos hints nao chegou as reacoes')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://api.exemplo.test/api/vintem/hints')
  assert.equal(calls[0].init.headers.Authorization, 'Bearer tok-1')
  // Uma vez por carga do app.
  await service.getVintemHints()
  assert.equal(calls.length, 1)
})

test('pedidos simultaneos dos hints dividem uma consulta so', async () => {
  const { service, calls } = runService({ fetchImpl: json(SENT) })
  await Promise.all([service.getVintemHints(), service.getVintemHints()])
  assert.equal(calls.length, 1)
})

test('sem servidor ou em MOCK o prazo e 2500 e os hints sao a reserva, sem rede', async () => {
  for (const options of [{ api: '' }, { mock: true }]) {
    const { service, calls } = runService({ ...options, fetchImpl: json(SENT) })
    assert.deepEqual({ ...(await service.getVintemHints()) }, FALLBACK)
    assert.equal(service.getReactionTimeoutMs(), 2500)
    assert.equal(calls.length, 0)
  }
})

test('erro de rede, 5xx e corpo inesperado nunca lancam; a falha nao fica guardada', async () => {
  const answers = [
    async () => {
      throw new Error('rede')
    },
    json({ error: 'x' }, 500),
    json(null),
    json(SENT),
  ]
  const { service, calls } = runService({ fetchImpl: () => answers.shift()() })
  for (let i = 0; i < 3; i += 1) {
    assert.deepEqual({ ...(await service.getVintemHints()) }, FALLBACK)
    assert.equal(service.getReactionTimeoutMs(), 2500)
  }
  await service.getVintemHints()
  assert.equal(service.getReactionTimeoutMs(), 3300)
  assert.equal(calls.length, 4)
})

test('sem ID token os hints sao a reserva e a consulta acontece quando ele existir', async () => {
  const user = { token: null }
  const { service, calls } = runService({ fetchImpl: json(SENT), user })
  assert.deepEqual({ ...(await service.getVintemHints()) }, FALLBACK)
  assert.equal(calls.length, 0)
  user.token = 'tok-2'
  await service.getVintemHints()
  assert.equal(service.getReactionTimeoutMs(), 3300)
})

test('campo invalido nos hints vale a reserva, e o maximo nunca fica abaixo do minimo', async () => {
  const { service } = runService({
    fetchImpl: json({ peekMinMs: 700000, peekMaxMs: 1000, peekPerDay: -1, openPerDay: '9', reactionTimeoutMs: 0 }),
  })
  assert.deepEqual({ ...(await service.getVintemHints()) }, { ...FALLBACK, peekMinMs: 700000, peekMaxMs: 700000 })
  assert.equal(service.getReactionTimeoutMs(), 2500)
})

test('deliver usa getReactionTimeoutMs, sem prazo fixo nas reacoes, e os hints sao pedidos cedo', () => {
  const src = code(CONTEXT)
  assert.match(
    body(src, 'deliver'),
    /askGuarded\(\{ \.\.\.ai, timeoutMs: getReactionTimeoutMs\(\) \}\)/,
    'deliver nao usa o prazo dos hints',
  )
  assert.match(src, /getReactionTimeoutMs,[\s\S]*?\} from '@\/services\/vintemSpeech\.service'/)
  assert.ok(!/ASK_TIMEOUT_REACTION_MS/.test(src), 'prazo fixo de reacao no contexto')
  assert.ok(!/timeoutMs:/.test(body(src, 'onLaunched')), 'onLaunched fixa o prazo da reacao')
  assert.match(src, /if \(canAsk\) void getVintemHints\(\)/, 'os hints nao sao pedidos antes do primeiro lancamento')
})

// ---------------------------------------------------------------------------------------------
// O Vintem que espia (07-16, D-12 b).
// ---------------------------------------------------------------------------------------------

test('espiar: sem texto da IA nada aparece, sem reserva do banco, e confere de novo antes de mostrar', () => {
  const src = code(CONTEXT)
  const peek = body(src, 'espiar')
  assert.match(peek, /if \(text === null \|\| text === 'stale'\) return/, 'espiar mostra sem texto da IA')
  assert.ok(!/\bspeak\(|\bdraw\(|speakAi\(|PHRASES|fallback/.test(peek), 'espiar usa o banco de frases')
  assert.match(peek, /document\.visibilityState !== 'visible' \|\| isBusy\(\)\) return/, 'sem conferir de novo')
  assert.ok(peek.indexOf('isBusy()') < peek.indexOf('speakText('), 'confere depois de mostrar')
  // Mesma regra da reacao: balao na Home, toast do Vintem (com a animacao de espiar) fora dela.
  assert.match(peek, /if \(slot\.current !== null\)/)
  assert.match(peek, /peekToast\(text, 'wake'\)/)
  assert.match(body(src, 'deliver'), /peekToast\(text, reaction\)/)
  assert.match(src, /useVintemPeek\(\{ canAsk, viewPerson, espiar \}\)/, 'o provedor nao monta a espiada')
})

test('useVintemPeek: sem banco de frases, sem acaso na renderizacao e sem intervalo fixo de espiada', () => {
  const hook = code(PEEK_HOOK)
  assert.ok(!/phrasePicker|vintemPhrases|PHRASES|speak\(|askVintem|fetch\(|console\./.test(hook))
  assert.equal((hook.match(/situation: 'espiar'/g) ?? []).length, 1)
  assert.match(hook, /getVintemHints\(\)/)
  assert.match(hook, /peekMinMs \+ Math\.floor\(rand\(\) \* \(peekMaxMs - peekMinMs \+ 1\)\)/)
  assert.ok(!/Math\.random/.test(hook))
  assert.ok(hook.indexOf('mulberry32(Date.now())') > hook.indexOf('if (!canAsk) return'), 'o acaso nasce fora do efeito')
  for (const file of [PEEK_HOOK, CONTEXT, HOME_HOOK]) {
    assert.ok(!/360_?000|900_?000|\* 60_?000|peekPerDay: \d|openPerDay: \d/.test(code(file)), `${file} fixa frequencia`)
  }
})

// Executa o hook de verdade com React, relogio, documento e temporizadores falsos.
function runPeek({ canAsk = true, hints = { peekMinMs: 360000, peekMaxMs: 900000, peekPerDay: 6 } } = {}) {
  const { outputText } = ts.transpileModule(read(PEEK_HOOK), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const world = { now: 1_000_000, busy: false, asked: [], timers: new Map(), nextId: 0, cleanups: [] }
  const target = () => {
    const listeners = new Map()
    return {
      listeners,
      addEventListener: (type, fn) => listeners.set(type, fn),
      removeEventListener: (type) => listeners.delete(type),
      emit: (type) => listeners.get(type)?.(),
    }
  }
  world.window = target()
  world.document = Object.assign(target(), { visibilityState: 'visible' })
  const modules = {
    react: {
      useRef: (value) => ({ current: value }),
      useEffect: (fn) => world.cleanups.push(fn()),
    },
    '@/lib/pwa/isBusy': { isBusy: () => world.busy },
    '@/services/vintemSpeech.service': { ASK_TIMEOUT_OPEN_MS: 4000, getVintemHints: async () => hints },
    '@shared/core/vintemSpring.js': { mulberry32: () => () => 0.5 },
  }
  const exports = {}
  new Function('exports', 'require', 'window', 'document', 'setTimeout', 'clearTimeout', 'Date', outputText)(
    exports,
    (name) => modules[name] ?? assert.fail(`import nao esperado no hook: ${name}`),
    world.window,
    world.document,
    (fn, ms) => {
      world.nextId += 1
      world.timers.set(world.nextId, { fn, ms })
      return world.nextId
    },
    (id) => world.timers.delete(id),
    { now: () => world.now },
  )
  exports.useVintemPeek({ canAsk, viewPerson: 'ele', espiar: async (ai) => void world.asked.push(ai) })
  world.settle = () => new Promise((resolve) => setImmediate(resolve))
  /** Espera os microtasks, exige um temporizador so e o dispara. */
  world.fire = async () => {
    assert.equal(world.timers.size, 1, 'deveria haver um temporizador')
    const [[id, timer]] = world.timers
    world.timers.delete(id)
    timer.fn()
    await world.settle()
  }
  world.delay = () => [...world.timers.values()].map((t) => t.ms)
  world.unmount = () => world.cleanups.forEach((fn) => typeof fn === 'function' && fn())
  return world
}

test('useVintemPeek: agenda entre os hints e so pergunta com atividade recente, aba visivel e nada aberto', async () => {
  const w = runPeek()
  await w.settle()
  assert.deepEqual(w.delay(), [630000], 'intervalo sorteado entre o minimo e o maximo dos hints')

  // Sem atividade nenhuma: nao pergunta, olha de novo em 30 s.
  await w.fire()
  assert.equal(w.asked.length, 0)
  assert.deepEqual(w.delay(), [30000])

  // Atividade velha (mais de 60 s).
  w.window.emit('pointerdown')
  w.now += 61000
  await w.fire()
  assert.equal(w.asked.length, 0)

  // Lancamento ou edicao aberta.
  w.window.emit('keydown')
  w.busy = true
  await w.fire()
  assert.equal(w.asked.length, 0)

  // Aba escondida na hora de disparar, mesmo sem o evento.
  w.busy = false
  w.document.visibilityState = 'hidden'
  w.window.emit('scroll')
  await w.fire()
  assert.equal(w.asked.length, 0)
  assert.equal(w.timers.size, 0, 'temporizador com a aba escondida')

  // De volta, ativo e livre: pergunta uma vez e reagenda no intervalo dos hints.
  w.document.visibilityState = 'visible'
  w.document.emit('visibilitychange')
  await w.settle()
  w.window.emit('touchstart')
  await w.fire()
  assert.deepEqual(w.asked, [{ situation: 'espiar', timeoutMs: 4000 }])
  assert.deepEqual(w.delay(), [630000])
})

test('useVintemPeek: limpa ao esconder a aba e ao desmontar', async () => {
  const w = runPeek()
  await w.settle()
  w.document.visibilityState = 'hidden'
  w.document.emit('visibilitychange')
  assert.equal(w.timers.size, 0)
  w.document.visibilityState = 'visible'
  w.document.emit('visibilitychange')
  await w.settle()
  assert.equal(w.timers.size, 1)
  w.unmount()
  assert.equal(w.timers.size, 0)
  assert.equal(w.window.listeners.size, 0)
  assert.equal(w.document.listeners.size, 0)
})

test('useVintemPeek: perfil do parceiro ou somente leitura nunca pergunta; teto zero nao agenda', async () => {
  const partner = runPeek({ canAsk: false })
  await partner.settle()
  assert.equal(partner.timers.size, 0)
  assert.equal(partner.window.listeners.size, 0)

  const off = runPeek({ hints: { peekMinMs: 60000, peekMaxMs: 60000, peekPerDay: 0 } })
  await off.settle()
  assert.equal(off.timers.size, 0)
})
