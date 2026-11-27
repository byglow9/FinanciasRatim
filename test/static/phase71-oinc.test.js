// Guarda estatica do app com o acervo novo do OINC (07.1-07: D-02, D-05, D-09, D-10, D-11, D-12, D-19, D-35).
// Rodar: node --test test/static/phase71-oinc.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { code, exists, listSrc, read } from './helpers/phase3-1.js'
import * as budget from '../../shared/core/budget.js'
import * as categories from '../../shared/core/categories.js'
import * as cycleCore from '../../shared/core/cycle.js'
import * as dayKey from '../../shared/core/dayKey.js'
import * as insightsCore from '../../shared/core/insights.js'
import * as oincFacts from '../../shared/core/oincFacts.js'
import * as oincLines from '../../shared/core/oincLines.js'
import * as oincScenes from '../../shared/core/oincScenes.js'
import * as oincSelect from '../../shared/core/oincSelect.js'
import * as phrasePicker from '../../shared/core/phrasePicker.js'
import * as vintemMood from '../../shared/core/vintemMood.js'
import * as vintemPhrases from '../../shared/core/vintemPhrases.js'
import * as vintemSpring from '../../shared/core/vintemSpring.js'

const CONTEXT = 'src/contexts/VintemContext.tsx'
const HISTORY = 'src/lib/oincHistory.ts'
const SERVICE = 'src/services/oinc.service.ts'
const SHEET = 'src/components/launcher/LaunchSheet.tsx'

/** Corpo (do abre-chaves ate o fecha-chaves correspondente) de `const name = useCallback`. */
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

// ---------------------------------------------------------------------------------------------
// Task 1: acervo em todas as situacoes, com historico e reposicao
// ---------------------------------------------------------------------------------------------

test('draw sorteia do acervo so no sem filtro, com genero, historico e encaixes, e ainda cai em PHRASES', () => {
  const src = code(CONTEXT)
  const draw = body(src, 'draw')
  assert.match(draw, /if \(tone === 'sem-filtro'\) \{/, 'o acervo precisa valer so no sem filtro')
  const gate = draw.indexOf("if (tone === 'sem-filtro')")
  const fallback = draw.indexOf('pick({')
  assert.ok(gate >= 0 && fallback > gate, 'o banco da Fase 4 precisa vir depois do acervo')
  const acervo = draw.slice(gate, fallback)
  assert.match(acervo, /selectLine\(/, 'sem selectLine')
  assert.match(acervo, /slotsFromRaw\(raw\)/, 'sem os encaixes de slotsFromRaw')
  assert.match(acervo, /genderOf\(viewPerson\)/, 'o genero nao vem da pessoa vista')
  assert.match(acervo, /readOincHistory\(viewPerson\)/, 'sem o historico')
  assert.match(acervo, /markOincUsed\(/, 'o uso nao e marcado')
  assert.match(acervo, /conds: conds \?\? \[\]/, 'as condicoes da compra nao chegam ao sorteio')
  assert.match(acervo, /160 : 120/, 'tamanho maximo: 160 em cena longa, 120 nas outras')
  assert.match(acervo, /votavel: true/, 'a fala do acervo precisa ser votavel')
  assert.match(acervo, /mapped/, 'sem a cena da situacao como segunda tentativa')
  assert.match(acervo, /mergeBank\(\s*AIR_BANK/, 'o acervo nao junta as falas geradas')
  // Suave e direto nunca passam pelo acervo: o banco da Fase 4 sai do bloco do sem filtro.
  assert.ok(draw.indexOf('const bank = PHRASES') > gate, 'o banco da Fase 4 sumiu')
  assert.ok(!/console\./.test(draw), 'draw nao registra nada')
})

test('o numero cru nunca vira outro fato: soma e so total e o aporte nao e a meta', () => {
  const src = code(CONTEXT)
  assert.match(src, /VALOR_E_TOTAL: ReadonlySet<string> = new Set\(\['delivery-semana', 'loja-repete'\]\)/)
  const draw = body(src, 'draw')
  assert.match(draw, /encaixes\.total = encaixes\.valor\s*delete encaixes\.valor/, 'a soma continua como valor')
  assert.match(draw, /if \(situation === 'meta-batida'\) delete encaixes\.valor/, 'o aporte vira valor da meta')
  // A entrada sem linha devolve nulo: a Home repete a fala com os encaixes completos.
  assert.match(draw, /if \(entrada === true\) return null/)
})

test('o acervo no ar deixa de fora as falas ainda a votar (D-34)', () => {
  const src = code(CONTEXT)
  assert.match(src, /const AIR_BANK = /, 'sem o acervo no ar')
  assert.match(src, /line\.reescrita !== true/, 'fala a votar nao pode ir ao ar')
  assert.ok(!/OINC_LINES\.entrou|withoutRejected/.test(src), 'a entrada nao sai mais do acervo cru')
})

test('reposicao: uma vez por cena por carga, so de quem pode pedir', () => {
  const src = code(CONTEXT)
  assert.match(src, /const repostas = new Set<string>\(\)/, 'sem o controle por carga')
  const draw = body(src, 'draw')
  assert.match(draw, /canAsk && !repostas\.has\(c\)/, 'a reposicao nao pede canAsk')
  assert.match(draw, /freshCount\(/, 'sem freshCount')
  assert.match(draw, /fresh < 2/, 'a reposicao nao espera a cena ficar com menos de duas')
  assert.match(draw, /repostas\.add\(c\)/, 'a cena nao e marcada')
  assert.match(draw, /void repor\(c\)/, 'repor deve ser chamado sem esperar')
  const service = code(SERVICE)
  assert.match(service, /export async function repor\(cena: string\): Promise<boolean>/, 'sem repor no servico')
  assert.match(service, /\/api\/vintem\/repor/, 'sem a rota de reposicao')
  assert.match(service, /JSON\.stringify\(\{ cena \}\)/, 'repor so manda o nome da cena')
  assert.match(service, /generated: GeneratedLine\[\]/, 'o acervo nao devolve as falas geradas')
})

test('onLaunched leva a cena e os encaixes da compra pela reactionFact, sem guardar a descricao (D-02, D-09)', () => {
  const sheet = code(SHEET)
  assert.match(sheet, /description:\s*typed/, 'LaunchSheet nao passa a descricao digitada')
  const src = code(CONTEXT)
  const launched = body(src, 'onLaunched')
  assert.match(launched, /reactionFact\(/, 'onLaunched sem reactionFact')
  assert.match(launched, /situation: result\.situation/, 'o fato nao usa a situacao decidida pelo nucleo')
  assert.match(launched, /await deliver\(result\.reaction, result\.situation, raw, ai, fact\)/, 'a cena nao chega a fala')
  assert.match(launched, /description,/, 'a descricao nao entra no lancamento em memoria')
  // A descricao so existe dentro de onLaunched: nunca em estado, armazenamento, rede nem console.
  // Fora do corpo sobram so o tipo do argumento e o padrao vazio na assinatura.
  const rest = src.replace(launched, '').replace('description?: string', '').replace("description = ''", '')
  assert.ok(!/\bdescription\b/.test(rest), 'descricao fora de onLaunched')
  assert.ok(!/(setItem|fetch|console|setSpeech|JSON\.stringify)[^\n]*description/.test(launched), 'descricao vai a algum destino')
  for (const f of [CONTEXT, HISTORY, SERVICE]) {
    assert.ok(!/console\./.test(code(f)), `${f} com console`)
  }
  assert.ok(!/description/.test(code(SERVICE)), 'o servico recebe a descricao')
  // Deliver repassa a cena a fala do banco e a do toast.
  const deliver = body(src, 'deliver')
  assert.match(deliver, /speak\(\{ situation, raw, announce: true, \.\.\.scene \}\)/, 'o balao nao recebe a cena')
  assert.match(deliver, /draw\(\{ situation, raw, \.\.\.scene \}\)/, 'o toast nao recebe a cena')
})

test('o historico local valida o que le, usa try e catch nas duas pontas e poda em 400', () => {
  assert.ok(exists(HISTORY), 'sem oincHistory.ts')
  const src = code(HISTORY)
  assert.match(src, /oinc:usadas:v1:/, 'chave do historico')
  assert.equal((src.match(/\btry \{/g) ?? []).length, 2, 'leitura e escrita precisam de try')
  assert.equal((src.match(/\bcatch \{/g) ?? []).length, 2, 'leitura e escrita precisam de catch')
  assert.match(src, /USED_MAX = 400/, 'sem o corte de 400')
  assert.match(src, /Number\.isFinite\(at\)/, 'o instante lido nao e validado')
  assert.match(src, /ID_RE\.test\(id\)/, 'o id lido nao e validado')
  assert.match(src, /Array\.isArray\(parsed\)/, 'o formato lido nao e validado')
  assert.ok(!/console\.|dangerouslySetInnerHTML|innerHTML/.test(src), 'historico com console ou HTML bruto')
  // Sem emoji (guarda da fase 3 vale para o arquivo novo).
  assert.ok(!/\p{Extended_Pictographic}/u.test(read(HISTORY)), 'emoji no historico')
})

// ---------------------------------------------------------------------------------------------
// Task 2: voto na fala que espia fora da Home
// ---------------------------------------------------------------------------------------------

const TOAST = 'src/components/ui/toast.tsx'
const VOTE = 'src/components/vintem/VintemVote.tsx'

test('o rodape do toast fica fora do elemento que dispensa ao toque (D-12)', () => {
  const src = code(TOAST)
  assert.match(src, /footer\?: \(dismiss: \(\) => void\) => React\.ReactNode/, 'ToastOptions sem footer')
  assert.match(src, /footer: options\?\.footer/, 'show nao guarda o footer')
  const custom = src.slice(src.indexOf('if (isCustom)'), src.indexOf('Fechar aviso'))
  const button = custom.indexOf('role="button"')
  const content = custom.indexOf('{item.custom}')
  const footer = custom.indexOf('{item.footer(onDismiss)}')
  assert.ok(button >= 0 && content > button && footer > content, 'falta o botao, a fala ou o rodape')
  // Entre a fala e o rodape o elemento do botao ja fechou: o rodape e irmao, nunca filho.
  assert.match(custom.slice(content, footer), /\{item\.custom\}\s*<\/div>\s*\{item\.footer \? \(/, 'rodape dentro do botao')
  // Tocar no rodape nao dispensa: o unico onClick de dispensar do item custom e o da fala.
  assert.equal((custom.match(/onClick=\{onDismiss\}/g) ?? []).length, 1)
  assert.match(custom.slice(content), /pointer-events-auto/, 'o rodape precisa receber toque')
  // Foco e mouse pausam no recipiente comum, entao valem tambem no rodape.
  assert.ok(custom.indexOf('onMouseEnter') < button && custom.indexOf('onFocus') < button, 'a pausa nao cobre o rodape')
})

test('o toast do porco leva o voto so na fala do acervo e de quem pode votar', () => {
  const src = code(CONTEXT)
  const peek = body(src, 'peekToast')
  assert.match(peek, /spoken\.votavel === true && canVote \? spoken\.id : undefined/, 'sem o portao do voto')
  assert.match(peek, /footer: \(closeToast: \(\) => void\) =>/, 'sem footer')
  assert.match(peek, /<VintemVote\s+key=\{voteId\}/, 'o voto precisa reiniciar a cada fala')
  assert.match(peek, /rate\(voteId, voto\)\s*if \(voto === 'nao'\) closeToast\(\)/, 'so o nao gostei fecha o aviso')
  assert.match(src, /const VINTEM_TOAST_MS = 10000/, 'o aviso precisa dar tempo de votar')
  // A fala da IA so vai a voto no sem filtro e com o id do servidor (D-35).
  assert.match(body(src, 'espiar'), /tone === 'sem-filtro' && id !== null \? \{ text, id, votavel: true \} : \{ text \}/)
})

test('os botoes de voto sao de 44 px, com fundo opaco, sombra e sem animacao propria', () => {
  const src = code(VOTE)
  assert.equal((src.match(/variant="secondary"/g) ?? []).length, 2, 'fundo opaco nos dois botoes')
  assert.equal((src.match(/size="circle"/g) ?? []).length, 2, 'botoes de 44 px')
  assert.equal((src.match(/shadow-float/g) ?? []).length, 2, 'sombra para ler sobre qualquer conteudo')
  assert.equal((src.match(/motion-reduce:transition-none/g) ?? []).length, 2)
  assert.ok(!/anim-|animate-/.test(src), 'sem animacao propria')
  assert.match(src, /align\?: 'start' \| 'center' \| 'end'/, 'sem o lado do porco')
})

// ---------------------------------------------------------------------------------------------
// Task 3: fatos locais da propria pessoa e reacao a compra importada
// ---------------------------------------------------------------------------------------------

const FACTS = 'src/hooks/useOincFacts.ts'
const HOME_HOOK = 'src/hooks/useHomeVintem.ts'

test('useOincFacts devolve vazio fora do proprio perfil e em somente leitura (D-07)', () => {
  const src = code(FACTS)
  assert.match(src, /buildFacts\(/, 'sem buildFacts')
  assert.match(src, /\{ surface: 'app' \}/, 'os fatos sao da superficie do app')
  assert.match(src, /const own = user !== null && user\.person === person && !readOnly/, 'sem o portao do proprio perfil')
  assert.match(src, /if \(!own \|\| !enabled \|\| [^)]*\) return NO_FACTS/, 'fora do proprio perfil a lista nao e vazia')
  // A agenda so e lida para quem pode ter fatos, uma vez por carga e por conta.
  assert.match(src, /const uid = own \? user\.uid : null/)
  assert.match(src, /if \(uid === null\) return/, 'a agenda e lida fora do proprio perfil')
  assert.match(src, /let agenda: \{ uid: string; load: Promise<AgendaEvent\[\]> \} \| null = null/, 'agenda sem cache por carga')
  assert.equal((src.match(/getEventsInRange\(/g) ?? []).length, 1)
  assert.match(src, /\.catch\(\(\) => \[\]\)/, 'falha da agenda aparece na tela')
  assert.match(src, /catch \{\s*return NO_FACTS/, 'montagem dos fatos sem try')
  assert.ok(!/console\.|localStorage|sessionStorage|fetch\(|dangerouslySetInnerHTML/.test(src), 'fatos saem da memoria')
  // Sem o ciclo anterior, nada de afirmar semana sem gastar com o ciclo recem-aberto.
  assert.match(src, /youngCycle && fact\.cena === 'semana-sem-gastar'/)
})

test('nenhum servico envia fatos e o provedor so os guarda em ref', () => {
  for (const f of listSrc('src/services')) {
    assert.ok(!/useOincFacts|OincFacts|oincFacts|buildFacts|setFacts|factsRef/.test(code(f)), `${f} toca nos fatos`)
  }
  const ctx = code(CONTEXT)
  assert.match(ctx, /const factsRef = useRef<OincFacts>\(\[\]\)/, 'os fatos precisam ficar em ref')
  assert.match(ctx, /factsRef\.current = facts/)
  assert.match(ctx, /if \(!canAsk\) factsRef\.current = \[\]/, 'fatos sobrevivem fora do proprio perfil')
  assert.ok(!/(askVintem|askGuarded|votar|repor|fetch)\([^)]*factsRef/.test(ctx), 'fatos vao ao servidor')
  const hook = code(HOME_HOOK)
  assert.match(hook, /useOincFacts\(\{ view, cycle, transactions, person: viewPerson, enabled \}\)/)
  assert.match(hook, /setFacts\(oincFacts\)/, 'os fatos nao sao registrados no contexto')
})

test('a reacao a compra importada acha o lancamento por bankArrival.id e usa reactionFact (D-02, D-09)', () => {
  const hook = code(HOME_HOOK)
  const effect = hook.slice(hook.indexOf('const reactedKey'), hook.indexOf('const reduced = useReducedMotion'))
  assert.match(effect, /transactions\?\.find\(\(t\) => t\.id === bankArrival\.id\)/, 'nao acha o lancamento que chegou')
  assert.match(effect, /reactionFact\(\{ situation: result\.situation, tx: arrived, categoryDefs/, 'sem reactionFact')
  assert.match(effect, /fallback: \{ situation: result\.situation, raw, announce: true, \.\.\.scene \}/, 'a cena nao vai a fala')
})

// ---------------------------------------------------------------------------------------------
// 07.1-08: o provedor executado de verdade (transpilado), com React, servicos e tela falsos e o
// nucleo e o acervo reais. Cobre o que nao da para ver sem navegador: quem fala em cada vez.
// ---------------------------------------------------------------------------------------------

const CORE = {
  '@shared/core/categories.js': categories,
  '@shared/core/cycle.js': cycleCore,
  '@shared/core/dayKey.js': dayKey,
  '@shared/core/insights.js': insightsCore,
  '@shared/core/oincFacts.js': oincFacts,
  '@shared/core/oincLines.js': oincLines,
  '@shared/core/oincScenes.js': oincScenes,
  '@shared/core/oincSelect.js': oincSelect,
  '@shared/core/phrasePicker.js': phrasePicker,
  '@shared/core/vintemMood.js': vintemMood,
  '@shared/core/vintemPhrases.js': vintemPhrases,
  '@shared/core/vintemSpring.js': vintemSpring,
}

/** React minimo: guarda refs e estados entre renderizacoes e roda os efeitos depois de cada uma. */
function fakeReact() {
  const slots = []
  const effects = []
  let at = 0
  const keep = (make) => {
    const i = at
    at += 1
    if (!(i in slots)) slots[i] = make()
    return slots[i]
  }
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    useContext: () => undefined,
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useRef: (value) => keep(() => ({ current: value })),
    useState: (initial) => {
      const box = keep(() => ({ value: initial }))
      return [
        box.value,
        (next) => {
          box.value = next
          box.written?.(next)
        },
      ]
    },
    useEffect: (fn) => effects.push(fn),
  }
  const render = (component) => {
    at = 0
    const out = component()
    effects.splice(0).forEach((fn) => fn())
    return out
  }
  return { react, render, slots }
}

function load(file, modules, globals = {}) {
  const { outputText } = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: file,
  })
  const exports = {}
  const require = (name) => modules[name] ?? assert.fail(`import nao esperado em ${file}: ${name}`)
  new Function('exports', 'require', ...Object.keys(globals), outputText)(exports, require, ...Object.values(globals))
  return exports
}

function runProvider({ tone = 'sem-filtro', answer = null } = {}) {
  const world = { answer, busy: false, asked: [], toasts: [], used: [], spoken: [], reactions: [], votes: [], dataVersion: 0 }
  const { react, render, slots } = fakeReact()
  const jsx = (type, props) => ({ type, props })
  const modules = {
    ...CORE,
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-router-dom': { useLocation: () => ({ pathname: '/metas' }) },
    '@/types': { vintemToneOf: (settings) => settings.vintemTone },
    '@/components/vintem/VintemToast': { VintemToastBody: 'VintemToastBody' },
    '@/components/ui/toast': { useToast: () => ({ show: (_message, options) => world.toasts.push(options) }) },
    '@/services/vintemSpeech.service': {
      askVintem: async (ai) => {
        world.asked.push(ai)
        return world.answer
      },
      ASK_TIMEOUT_OPEN_MS: 4000,
      getReactionTimeoutMs: () => 2500,
      getVintemHints: async () => ({}),
    },
    '@/hooks/useVintemPeek': {
      useVintemPeek: (args) => {
        world.peek = args
      },
    },
    '@/services/oinc.service': {
      fetchAcervo: async () => ({ rejected: [], generated: [] }),
      readRejected: () => [],
      repor: async () => false,
      votar: async (id, voto) => void world.votes.push([id, voto]),
    },
    '@/lib/pwa/isBusy': { isBusy: () => world.busy },
    '@/lib/vintem/stage': { isHomePigVisible: () => false, isHomePigOffScreen: () => false },
    '@/lib/oincHistory': {
      readOincHistory: () => ({ seen: {}, lastRisada: false }),
      markOincUsed: (_person, id) => world.used.push(id),
    },
    '@/components/vintem/VintemVote': { VintemVote: 'VintemVote' },
    '@/lib/vintemBaseline': { loadBaseline: async () => null },
    './AreaContext': {
      useArea: () => ({
        settings: { vintemTone: tone },
        settingsStatus: 'ready',
        categoryDefs: [],
        personConfigFor: () => ({ salaryDay: 5 }),
        readOnly: false,
      }),
    },
    './AuthContext': { useAuth: () => ({ user: { person: 'ele' } }) },
    './CycleContext': {
      useCycle: () => ({ viewPerson: 'ele', now: new Date(), dataVersion: world.dataVersion }),
    },
  }
  const provider = load(CONTEXT, modules, {
    document: { visibilityState: 'visible' },
    sessionStorage: { getItem: () => null, setItem: () => {} },
  })
  world.render = () => {
    world.value = render(() => provider.VintemProvider({ children: null })).props.value
  }
  world.render()
  // O primeiro estado do provedor e a fala do balao.
  slots.find((s) => 'value' in s).written = (speech) => speech && world.spoken.push(speech)
  /** Registra o slot do arco: a partir daqui e a Home. */
  world.home = () => world.value.registerSlot({ react: (r) => world.reactions.push(r) })
  world.espiar = () => world.peek.espiar({ situation: 'espiar', timeoutMs: 4000 })
  world.toastText = (i) => world.toasts[i].custom.props.text
  return world
}

/** Cena do acervo (ou 'fase4') de um id de fala. */
function sceneOf(id) {
  for (const [cena, lines] of Object.entries(oincLines.OINC_LINES)) {
    if (lines.some((line) => line.id === id)) return cena
  }
  return 'fase4'
}

const fact = (cena, prioridade, slots = {}) => ({ cena, prioridade, slots, conds: [], key: `t:${cena}`, txId: null, via: 'acervo' })
const IA = { text: 'Fala da IA.', id: 'ia-0123456789abcdef' }
const settle = () => new Promise((resolve) => setImmediate(resolve))

test('sem filtro: duas vezes o acervo e a terceira a IA, que leva o id e os botoes de voto', async () => {
  const w = runProvider({ answer: IA })
  for (let i = 0; i < 6; i += 1) await w.espiar()
  assert.equal(w.asked.length, 2, 'a IA e so uma a cada tres')
  assert.equal(w.toasts.length, 6)
  assert.deepEqual([w.toastText(2), w.toastText(5)], ['Fala da IA.', 'Fala da IA.'])
  for (const i of [0, 1, 3, 4]) assert.notEqual(w.toastText(i), 'Fala da IA.')
  const vote = w.toasts[2].footer(() => {})
  vote.props.onVote('sim')
  assert.deepEqual(w.votes, [['ia-0123456789abcdef', 'sim']])
  assert.deepEqual(w.reactions, [])
})

test('sem filtro: IA sem resposta cai no acervo, e sem servidor o porco fala em todas as vezes', async () => {
  const w = runProvider({ answer: null })
  for (let i = 0; i < 6; i += 1) await w.espiar()
  assert.equal(w.asked.length, 2)
  assert.equal(w.toasts.length, 6)
  assert.deepEqual([...new Set(w.used.map(sceneOf))], ['do-nada'], 'sem fatos o porco fala do nada')
})

test('o assunto da espiada sai dos fatos, sem repetir a cena logo em seguida e sem a cena de entrada', async () => {
  const w = runProvider()
  w.value.setFacts([fact('mes-folgado', 40), fact('sumico', 45), fact('porco-chapaduxo', 8), fact('entrou', 5)])
  for (let i = 0; i < 3; i += 1) await w.espiar()
  assert.deepEqual([...w.used.map(sceneOf)].sort(), ['mes-folgado', 'porco-chapaduxo', 'sumico'])
})

test('cena sem linha no ar cai no do nada, e a vez seguinte tenta outro assunto', async () => {
  const w = runProvider()
  w.value.setFacts([fact('bom-dia', 90)])
  await w.espiar()
  assert.deepEqual(w.used.map(sceneOf), ['do-nada'])
})

test('fatos de antes de uma mudanca nos dados nao viram fala: conta ja paga nao e cobrada (D-01)', async () => {
  const w = runProvider()
  w.value.setFacts([fact('sumico', 45)])
  w.dataVersion = 1
  w.render()
  await w.espiar()
  assert.deepEqual(w.used.map(sceneOf), ['do-nada'])
  w.value.setFacts([fact('sumico', 45)])
  await w.espiar()
  assert.equal(sceneOf(w.used[1]), 'sumico')
})

test('com formulario aberto nem a espiada nem a entrada aparecem', async () => {
  const w = runProvider()
  w.busy = true
  await w.espiar()
  w.peek.entrar()
  assert.equal(w.toasts.length, 0)
})

test('suave e direto: a espiada e so da IA, sem reserva e sem voto (D-35)', async () => {
  for (const tone of ['suave', 'direto']) {
    const silent = runProvider({ tone })
    for (let i = 0; i < 3; i += 1) await silent.espiar()
    assert.equal(silent.asked.length, 3)
    assert.equal(silent.toasts.length, 0, 'sem texto nada aparece')

    const spoken = runProvider({ tone, answer: IA })
    await spoken.espiar()
    assert.equal(spoken.toastText(0), 'Fala da IA.')
    assert.equal(spoken.toasts[0].footer, undefined)
    spoken.home()
    await spoken.espiar()
    assert.equal(spoken.spoken[0].text, 'Fala da IA.')
    assert.ok(!('votavel' in spoken.spoken[0]), 'voto fora do sem filtro')
  }
})

test('sem filtro, na Home: a fala da IA vai ao balao com o id do servidor e votavel', async () => {
  const w = runProvider({ answer: IA })
  w.home()
  for (let i = 0; i < 3; i += 1) await w.espiar()
  const last = w.spoken.at(-1)
  assert.deepEqual([last.id, last.text, last.votavel], [IA.id, IA.text, true])
  assert.equal(w.reactions.length, 3)
  assert.equal(w.toasts.length, 0)
})

test('entrada no sem filtro: o fato urgente vence; sem ele, a cena entrou; nunca pede a IA (D-17)', () => {
  const urgent = runProvider()
  urgent.value.setFacts([fact('primeiro-dia', 85), fact('entrou', 5)])
  urgent.peek.entrar()
  assert.deepEqual(urgent.used.map(sceneOf), ['primeiro-dia'])

  const calm = runProvider()
  calm.value.setFacts([fact('sumico', 45), fact('entrou', 5)])
  calm.peek.entrar()
  assert.deepEqual(calm.used.map(sceneOf), ['entrou'])

  const empty = runProvider()
  empty.peek.entrar()
  assert.deepEqual(empty.used.map(sceneOf), ['entrou'])
  assert.equal(urgent.asked.length + calm.asked.length + empty.asked.length, 0)
})

test('entrada em suave e direto: situacao inicio pelo banco de sempre, sem voto e sem IA', () => {
  for (const tone of ['suave', 'direto']) {
    const w = runProvider({ tone, answer: IA })
    w.value.setFacts([fact('primeiro-dia', 85)])
    w.peek.entrar()
    assert.equal(w.asked.length, 0)
    assert.equal(w.used.length, 0, 'acervo fora do sem filtro')
    assert.ok(vintemPhrases.PHRASES.inicio[tone].some((p) => p.t === w.toastText(0)), w.toastText(0))
    assert.equal(w.toasts[0].footer, undefined)
  }
})

/** Visao de um ciclo com renda e folga, para a reacao ao lancamento. */
function budgetView() {
  const now = new Date()
  return budget.buildBudgetView({
    now,
    cycle: cycleCore.cycleOf(now, 5),
    config: { salaryDay: 5, expectedIncomeCents: 500000, limits: {} },
    transactions: [],
    bills: [],
    payments: [],
    categoryDefs: [],
  })
}

const LAUNCH = { kind: 'gasto', cents: 8000, description: 'posto shell', person: 'ele' }

test('reacao a um gasto no sem filtro fala daquela compra pelo acervo, sem IA (D-09, D-10)', async () => {
  const w = runProvider({ answer: IA })
  await w.value.onLaunched({ ...LAUNCH, view: budgetView() })
  assert.equal(w.asked.length, 0)
  assert.deepEqual(w.used.map(sceneOf), ['posto'])
  w.value.onGoal({ valorCents: 5000 })
  await settle()
  assert.equal(w.asked.length, 0)
  assert.equal(w.toasts.length, 2)
  // Sincronizacao do banco: a Home chama speakAi, que no sem filtro vai direto a fala de reserva.
  await w.value.speakAi({
    ai: { situation: 'sync' },
    fallback: { situation: 'lancamento-ok', cena: 'posto', slots: { valor: 'R$ 80,00', quando: 'hoje' }, conds: ['hoje'] },
  })
  assert.equal(w.asked.length, 0)
  assert.equal(sceneOf(w.used.at(-1)), 'posto')
})

test('reacao e sincronizacao em suave e direto continuam pedindo a IA, como antes (D-35)', async () => {
  const w = runProvider({ tone: 'direto', answer: IA })
  await w.value.onLaunched({ ...LAUNCH, view: budgetView() })
  assert.deepEqual(w.asked, [{ situation: 'lancamento', categoryId: null, timeoutMs: 2500 }])
  assert.equal(w.toastText(0), 'Fala da IA.')
  await w.value.speakAi({ ai: { situation: 'sync' }, fallback: { situation: 'lancamento-ok' } })
  assert.deepEqual(w.asked[1], { situation: 'sync', timeoutMs: 4000 })
})

// A primeira Home da carga: o hook executado de verdade.
function runHome({ tone = 'sem-filtro' } = {}) {
  const world = { facts: [], entries: [], opened: [], registered: [] }
  const { react, render } = fakeReact()
  const view = budgetView()
  const cycle = cycleCore.cycleOf(new Date(), 5)
  const hook = load(HOME_HOOK, {
    ...CORE,
    react,
    '@/contexts/AreaContext': { useArea: () => ({ categoryDefs: [] }) },
    '@/contexts/CycleContext': { useCycle: () => ({ now: new Date(), viewPerson: 'ele', isCurrent: true }) },
    '@/contexts/VintemContext': {
      useVintem: () => ({
        tone,
        speak: () => true,
        speakAi: async (args) => void world.opened.push(args),
        entrar: (args) => world.entries.push(args),
        canVote: true,
        slot: { current: null },
        cheer: null,
        setFacts: (facts) => world.registered.push(facts),
      }),
    },
    '@/hooks/useOincFacts': { useOincFacts: () => world.facts },
    '@/hooks/useReducedMotion': { useReducedMotion: () => false },
    '@/hooks/useVintemInsights': { useVintemInsights: () => ({ insights: [], ready: true, bankArrival: null }) },
  })
  world.render = () =>
    render(() => hook.useHomeVintem({ view, cycle, transactions: [], enabled: true, readOnly: false }))
  return world
}

test('a primeira Home da carga espera os fatos e entra uma vez so pelo provedor (D-17)', () => {
  const w = runHome()
  w.render()
  assert.equal(w.entries.length, 0, 'entrou antes de os fatos chegarem')
  w.facts = [fact('entrou', 5)]
  w.render()
  w.render()
  assert.equal(w.entries.length, 1)
  assert.equal(w.entries[0].naHome, true)
  assert.ok(w.entries[0].reserva.situation, 'sem a fala de reserva')
  assert.equal(w.entries[0].raw.dias.constructor, Number)
  assert.equal(w.opened.length, 0, 'o sem filtro pediu a IA na entrada')
})

test('em suave e direto a primeira Home segue pedindo a abertura a IA, sem esperar fatos', () => {
  const w = runHome({ tone: 'suave' })
  w.render()
  assert.equal(w.entries.length, 0)
  assert.equal(w.opened.length, 1)
  assert.deepEqual({ ...w.opened[0].ai }, { situation: 'abertura' })
})
