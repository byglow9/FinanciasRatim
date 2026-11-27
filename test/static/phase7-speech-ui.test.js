// Guarda estatica do cliente da fala por IA da Fase 7 (IA-01, IA-03, IA-04, D-01, D-14, D-16).
// Rodar: node --test test/static/phase7-speech-ui.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { code, read } from './helpers/phase3-1.js'
import { RESUME_AFTER_MS } from '../../shared/core/oincSelect.js'

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
  assert.match(ctx, /<VintemToastBody text=\{spoken\.text\}/, 'o toast nao recebe a fala como texto')
  assert.match(
    ctx,
    /setSpeech\(\{\s*id: voteId \?\? `ia-\$\{popCounter\.current\}`,\s*text,\s*situation,/,
    'speakText nao guarda o texto puro',
  )
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
  // Sem filtro: a primeira entrada da carga sai pela entrada do provedor (acervo) e nunca pede a IA (D-10, D-35).
  const semFiltro = entry.indexOf("tone === 'sem-filtro'")
  assert.ok(semFiltro >= 0, 'sem o ramo do sem filtro')
  const rest = entry.indexOf('if (openingAsked || bankArrival !== null)')
  assert.ok(rest > semFiltro, 'o ramo de suave e direto precisa vir depois do sem filtro')
  const branch = entry.slice(semFiltro, rest)
  assert.ok(!/speakAi\(|openingAsked/.test(branch), 'o sem filtro pede a IA na entrada')
  assert.equal((hook.match(/\bentrar\(\{/g) ?? []).length, 1, 'entrar chamado fora do ramo do sem filtro')
  assert.ok(branch.includes('entrar({ naHome: true, raw, reserva: entry })'), 'o sem filtro nao pede o acervo')
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
  // o dono tirou o voto da Home; ele continua so no porco de lado
  assert.doesNotMatch(code(BALLOON), /VintemVote/, 'o voto voltou para o balao da Home')
  assert.match(src, /canVote && voteId|spoken\.votavel === true && canVote/, 'o porco de lado perdeu o voto')
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
  assert.match(body(src, 'speakAi'), /if \(answer === 'stale'\) return/)
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
const SENT = { peekFirstMs: 90000, peekMinMs: 120000, peekMaxMs: 240000, peekPerDay: 4, openPerDay: 2, reactionTimeoutMs: 3300 }
// Reserva do cliente (07.1, D-17, D-18): primeira espera de 1 minuto, depois cerca de 3.
const FALLBACK = {
  peekFirstMs: 60000,
  peekMinMs: 150000,
  peekMaxMs: 210000,
  peekPerDay: 200,
  openPerDay: 200,
  reactionTimeoutMs: 2500,
}

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

test('hints de um servidor antigo, sem peekFirstMs, usam 60000 na primeira espera', async () => {
  const { peekFirstMs: _fora, ...old } = SENT
  const { service } = runService({ fetchImpl: json(old) })
  assert.deepEqual({ ...(await service.getVintemHints()) }, { ...SENT, peekFirstMs: 60000 })
})

// ---------------------------------------------------------------------------------------------
// Resposta de /fala com o id da fala (07.1-08): { text, id } ou null.
// ---------------------------------------------------------------------------------------------

const ASK = { situation: 'espiar', timeoutMs: 4000 }

test('askVintem devolve o texto e o id que o servidor mandou, e o corpo continua so com a situacao', async () => {
  const { service, calls } = runService({ fetchImpl: json({ text: '  Oi.  ', id: 'ia-0123456789abcdef' }) })
  assert.deepEqual({ ...(await service.askVintem(ASK)) }, { text: 'Oi.', id: 'ia-0123456789abcdef' })
  assert.equal(calls[0].url, 'https://api.exemplo.test/api/vintem/fala')
  assert.deepEqual(JSON.parse(calls[0].init.body), { situation: 'espiar' })
})

test('askVintem sem id, ou com id fora do formato, devolve o texto com id nulo', async () => {
  for (const id of [undefined, null, 7, '', 'com espaco', '<b>', 'a'.repeat(65)]) {
    const { service } = runService({ fetchImpl: json({ text: 'Oi.', id }) })
    assert.deepEqual({ ...(await service.askVintem(ASK)) }, { text: 'Oi.', id: null }, String(id))
  }
})

test('askVintem devolve null em erro, texto nulo, vazio ou grande demais e sem servidor', async () => {
  const answers = [
    json({ error: 'x' }, 500),
    json({ text: null, id: 'ia-0123456789abcdef' }),
    json({ text: '   ' }),
    json({ text: 'a'.repeat(301) }),
    json(null),
    async () => {
      throw new Error('rede')
    },
  ]
  for (const fetchImpl of answers) {
    const { service } = runService({ fetchImpl })
    assert.equal(await service.askVintem(ASK), null)
  }
  for (const options of [{ api: '' }, { mock: true }]) {
    const { service, calls } = runService({ ...options, fetchImpl: json({ text: 'Oi.' }) })
    assert.equal(await service.askVintem(ASK), null)
    assert.equal(calls.length, 0)
  }
})

test('campo invalido nos hints vale a reserva, e o maximo nunca fica abaixo do minimo', async () => {
  const { service } = runService({
    fetchImpl: json({ peekFirstMs: 0, peekMinMs: 700000, peekMaxMs: 1000, peekPerDay: -1, openPerDay: '9', reactionTimeoutMs: 0 }),
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
  assert.match(peek, /if \(answer === null \|\| answer === 'stale'\) return/, 'espiar mostra sem texto da IA')
  assert.ok(!/\bspeak\(|\bdraw\(|speakAi\(|PHRASES|fallback/.test(peek), 'espiar usa o banco de frases')
  assert.match(peek, /document\.visibilityState !== 'visible' \|\| isBusy\(\)\) return/, 'sem conferir de novo')
  assert.ok(peek.indexOf('isBusy()') < peek.indexOf('speakText('), 'confere depois de mostrar')
  // Mesma regra da reacao: balao na Home, toast do Vintem (com a animacao de espiar) fora dela.
  assert.match(peek, /if \(slot\.current !== null\)/)
  // Voto na fala da IA so no sem filtro e com id do servidor (07.1, D-35).
  assert.match(
    peek,
    /peekToast\(tone === 'sem-filtro' && id !== null \? \{ text, id, votavel: true \} : \{ text \}, 'wake'\)/,
  )
  assert.match(body(src, 'deliver'), /peekToast\(spoken, reaction\)/)
  assert.match(
    src,
    /useVintemPeek\(\{[^}]*viewPerson,\s*espiar: espiarRodizio,\s*entrar,\s*naHome: pathname === '\/',\s*\}\)/,
    'o provedor nao monta a espiada',
  )
  assert.match(src, /canAsk: canAsk && settingsStatus === 'ready'/, 'a espiada nao espera as configuracoes')
})

// ---------------------------------------------------------------------------------------------
// 07.1-08: quem fala em cada ramo (sem filtro pelo acervo; suave e direto como antes).
// ---------------------------------------------------------------------------------------------

test('sem filtro as reacoes e a sincronizacao nao pedem a IA; em suave e direto o pedido continua (D-10, D-35)', () => {
  const src = code(CONTEXT)
  const ai = body(src, 'speakAi')
  assert.match(ai, /if \(tone === 'sem-filtro'\) \{\s*speak\(fallback\)\s*return\s*\}/, 'speakAi pede a IA no sem filtro')
  assert.ok(ai.indexOf("tone === 'sem-filtro'") < ai.indexOf('askGuarded('), 'o portao vem depois do pedido')
  const deliver = body(src, 'deliver')
  assert.match(deliver, /if \(ai !== undefined && tone !== 'sem-filtro'\) \{/, 'deliver pede a IA no sem filtro')
  assert.ok(deliver.indexOf("tone !== 'sem-filtro'") < deliver.indexOf('askGuarded('))
  assert.equal((src.match(/\baskGuarded\(/g) ?? []).length, 3, 'um caminho novo pede a IA')
})

test('a espiada reveza: uma da IA a cada tres so no sem filtro e com canAsk; o resto e acervo (D-10, D-19)', () => {
  const src = code(CONTEXT)
  const turn = body(src, 'espiarRodizio')
  assert.match(turn, /if \(tone !== 'sem-filtro'\) \{\s*await espiar\(ai\)\s*return\s*\}/, 'suave e direto sairam da IA')
  assert.match(turn, /canAsk && peekTurn\.current % IA_A_CADA === 0 && !\(await espiar\(ai\)\)\) return\s*espiarAcervo\(\)/)
  assert.match(src, /const IA_A_CADA = 3/)
  const bank = body(src, 'espiarAcervo')
  assert.match(bank, /pickFact\(/, 'o assunto nao sai de pickFact')
  assert.match(bank, /recentScenes: recentScenes\.current/, 'o sorteio nao evita as ultimas cenas')
  assert.match(src, /const RECENT_SCENES = 5/)
  assert.match(bank, /cena: 'do-nada'/, 'sem a fala do nada')
  assert.ok(!/askGuarded|askVintem|speakAi\(|speakText\(|fetch\(/.test(bank), 'o acervo depende do servidor')
  assert.match(bank, /document\.visibilityState !== 'visible' \|\| isBusy\(\)\) return/)
  assert.ok(bank.indexOf('isBusy()') < bank.indexOf('mostrar('), 'confere depois de mostrar')
})

test('useVintemPeek: sem banco de frases, sem acaso na renderizacao e sem intervalo fixo de espiada', () => {
  const hook = code(PEEK_HOOK)
  assert.ok(!/phrasePicker|vintemPhrases|PHRASES|speak\(|askVintem|fetch\(|console\./.test(hook))
  assert.equal((hook.match(/situation: 'espiar'/g) ?? []).length, 1)
  assert.match(hook, /getVintemHints\(\)/)
  assert.match(hook, /RESUME_AFTER_MS/, 'a volta do segundo plano nao usa o prazo do nucleo')
  assert.match(hook, /peekMinMs \+ Math\.floor\(rand\(\) \* \(peekMaxMs - peekMinMs \+ 1\)\)/)
  assert.ok(!/Math\.random/.test(hook))
  assert.ok(hook.indexOf('mulberry32(Date.now())') > hook.indexOf('if (!canAsk) return'), 'o acaso nasce fora do efeito')
  for (const file of [PEEK_HOOK, CONTEXT, HOME_HOOK]) {
    assert.ok(
      !/150_?000|180_?000|210_?000|300_?000|360_?000|900_?000|\* 60_?000|peek\w+Ms: \d|peekPerDay: \d|openPerDay: \d/.test(code(file)),
      `${file} fixa frequencia`,
    )
  }
})

// Executa o hook de verdade com React, relogio, documento e temporizadores falsos.
const HINTS = { peekFirstMs: 60000, peekMinMs: 150000, peekMaxMs: 210000, peekPerDay: 200 }

function runPeek({ canAsk = true, naHome = true, hints = HINTS, random = 0.5, visibility = 'visible' } = {}) {
  const { outputText } = ts.transpileModule(read(PEEK_HOOK), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const world = { now: 1_000_000, busy: false, asked: [], entries: 0, timers: new Map(), nextId: 0, cleanups: [] }
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
  world.document = Object.assign(target(), { visibilityState: visibility })
  const modules = {
    react: {
      useRef: (value) => ({ current: value }),
      useEffect: (fn) => world.cleanups.push(fn()),
    },
    '@/lib/pwa/isBusy': { isBusy: () => world.busy },
    '@/lib/vintem/stage': { isHomePigVisible: () => false, isHomePigOffScreen: () => false },
    '@/services/vintemSpeech.service': { ASK_TIMEOUT_OPEN_MS: 4000, getVintemHints: async () => hints },
    '@shared/core/oincSelect.js': { RESUME_AFTER_MS },
    '@shared/core/vintemSpring.js': { mulberry32: () => () => random },
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
  exports.useVintemPeek({
    canAsk,
    viewPerson: 'ele',
    naHome,
    espiar: async (ai) => void world.asked.push(ai),
    entrar: () => {
      world.entries += 1
    },
  })
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
  /** Esconde a aba por `ms` e volta. */
  world.away = async (ms) => {
    world.document.visibilityState = 'hidden'
    world.document.emit('visibilitychange')
    assert.equal(world.timers.size, 0, 'temporizador com a aba escondida')
    world.now += ms
    world.document.visibilityState = 'visible'
    world.document.emit('visibilitychange')
    await world.settle()
  }
  /** Toca na tela e dispara o temporizador. */
  world.activeFire = async () => {
    world.window.emit('pointerdown')
    await world.fire()
  }
  world.unmount = () => world.cleanups.forEach((fn) => typeof fn === 'function' && fn())
  return world
}

/** Intervalo seguinte, calculado dos hints do teste como o hook calcula. */
const between = (hints, random) => hints.peekMinMs + Math.floor(random * (hints.peekMaxMs - hints.peekMinMs + 1))

test('useVintemPeek: a primeira espera e a dos hints e as seguintes ficam entre o minimo e o maximo', async () => {
  for (const random of [0, 0.5, 0.999999]) {
    const w = runPeek({ random })
    await w.settle()
    assert.deepEqual(w.delay(), [60000], 'a primeira pergunta sai 1 minuto depois de montar')
    await w.activeFire()
    assert.deepEqual(w.asked, [{ situation: 'espiar', timeoutMs: 4000 }])
    const [next] = w.delay()
    assert.equal(next, between(HINTS, random))
    assert.ok(next >= 150000 && next <= 210000, String(next))
    await w.activeFire()
    assert.equal(w.asked.length, 2)
    assert.deepEqual(w.delay(), [next])
  }
})

test('useVintemPeek: so pergunta com atividade recente, aba visivel e nada aberto', async () => {
  const w = runPeek()
  await w.settle()

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

  // De volta logo, ativo e livre: a primeira espera ainda vale; pergunta uma vez e segue no intervalo.
  w.document.visibilityState = 'visible'
  w.document.emit('visibilitychange')
  await w.settle()
  assert.deepEqual(w.delay(), [60000])
  w.window.emit('touchstart')
  await w.fire()
  assert.deepEqual(w.asked, [{ situation: 'espiar', timeoutMs: 4000 }])
  assert.deepEqual(w.delay(), [between(HINTS, 0.5)])
})

test('useVintemPeek: voltar depois de 5 minutos chama entrar uma vez e reinicia com a primeira espera', async () => {
  assert.equal(RESUME_AFTER_MS, 300000)
  const w = runPeek()
  await w.settle()
  await w.activeFire()
  assert.deepEqual(w.delay(), [between(HINTS, 0.5)])

  // Antes do prazo nao e entrada: segue no intervalo.
  await w.away(RESUME_AFTER_MS - 1)
  assert.equal(w.entries, 0)
  assert.deepEqual(w.delay(), [between(HINTS, 0.5)])

  await w.away(RESUME_AFTER_MS)
  assert.equal(w.entries, 1)
  assert.deepEqual(w.delay(), [60000])

  // Visivel de novo sem ter se escondido nao conta como volta.
  w.now += RESUME_AFTER_MS * 2
  w.document.emit('visibilitychange')
  await w.settle()
  assert.equal(w.entries, 1)
})

test('useVintemPeek: montado fora da Home chama entrar uma vez na carga; na Home quem fala e ela', async () => {
  const outside = runPeek({ naHome: false })
  await outside.settle()
  assert.equal(outside.entries, 1)
  assert.deepEqual(outside.delay(), [60000])
  await outside.activeFire()
  assert.equal(outside.entries, 1)

  const home = runPeek({ naHome: true })
  await home.settle()
  assert.equal(home.entries, 0)

  const partner = runPeek({ canAsk: false, naHome: false })
  await partner.settle()
  assert.equal(partner.entries, 0)
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

  const off = runPeek({ hints: { ...HINTS, peekPerDay: 0 } })
  await off.settle()
  assert.equal(off.timers.size, 0)
})
