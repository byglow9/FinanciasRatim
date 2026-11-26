import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { composePush, PUSH_SCENES, PUSH_TITLE, hashSeed } from './oincPush.js'
import { OINC_PUSH_LINES } from './oincLinesPush.js'
import { checkLine } from './oincRules.js'
import { PROFANITY } from './phraseRules.js'
import { needsOf, textLength, fill } from './phrasePicker.js'
import { PUSH_PHRASES, PUSH_TITLE as OLD_TITLE, hashSeed as oldHash } from './vintemPhrasesPush.js'
import { formatReais } from './format.js'

const TONES = ['suave', 'direto', 'sem-filtro']
const SCENE_NAMES = [
  'push-limite-80', 'push-limite-100', 'push-fatura-d2', 'push-fatura-d1', 'push-fatura-d0',
  'push-conta-d2', 'push-conta-d1', 'push-conta-d0', 'push-compromisso-d2', 'push-compromisso-d1',
  'push-compra', 'push-ritmo', 'push-meta', 'push-nada',
]
const NEW_TONE_SCENES = [
  'push-conta-d2', 'push-conta-d1', 'push-conta-d0', 'push-compromisso-d2', 'push-compromisso-d1',
]
const LEGACY = {
  'push-limite-80': 'push-limite-80',
  'push-limite-100': 'push-limite-100',
  'push-fatura-d2': 'push-fatura',
  'push-fatura-d1': 'push-fatura',
  'push-fatura-d0': 'push-fatura',
  'push-compra': 'push-espontanea',
  'push-ritmo': 'push-espontanea',
  'push-meta': 'push-espontanea',
  'push-nada': 'push-espontanea',
}

const SLOTS = {
  valor: formatReais(129900),
  restante: formatReais(4550),
  total: formatReais(10000),
  loja: 'iFood',
  categoria: 'Lazer',
  pct: '112%',
  dias: '12 dias',
  meta: 'Viagem',
  conta: 'Internet',
  titulo: 'Dentista',
  hora: '14:30',
  quando: 'ontem',
}

const seeds = Array.from({ length: 60 }, (_, i) => `h1__ele__evento__${i}`)
const bodies = (args) => seeds.map((seed) => composePush({ tone: 'sem-filtro', ...args, seed }).body)
const allLines = Object.entries(OINC_PUSH_LINES).flatMap(([cena, byTone]) =>
  Object.entries(byTone).flatMap(([tone, lines]) => lines.map((line) => ({ cena, tone, line }))),
)

test('as 14 cenas existem, com titulo e hash reexportados do banco de hoje', () => {
  assert.deepEqual(Object.keys(PUSH_SCENES).sort(), [...SCENE_NAMES].sort())
  assert.deepEqual(Object.keys(OINC_PUSH_LINES).sort(), [...SCENE_NAMES].sort())
  assert.equal(PUSH_TITLE, OLD_TITLE)
  assert.equal(hashSeed, oldHash)
})

test('cada cena tem 5 ou mais falas sem filtro, lote 4, ids proprios e ao menos uma sem encaixe', () => {
  const ids = new Set()
  for (const cena of SCENE_NAMES) {
    const lines = OINC_PUSH_LINES[cena]['sem-filtro']
    assert.ok(lines.length >= 5, `${cena}: ${lines.length}`)
    assert.ok(lines.some((l) => l.g === 'x' && needsOf(l.t).length === 0), `${cena}: sem fala sem encaixe`)
  }
  for (const { cena, line } of allLines) {
    assert.equal(line.lote, 4, line.id)
    assert.equal(line.reescrita, true, line.id)
    assert.match(line.id, new RegExp(`^${cena}-\\d{3}$`))
    assert.ok(!ids.has(line.id), `id repetido: ${line.id}`)
    ids.add(line.id)
    for (const name of needsOf(line.t)) assert.ok(PUSH_SCENES[cena].slots.includes(name), `${line.id}: {${name}}`)
  }
})

test('as falas novas passam na regua do acervo', () => {
  const problems = allLines.flatMap(({ cena, line }) =>
    checkLine({ line, cena, meta: { longa: false, slots: PUSH_SCENES[cena].slots, implicito: PUSH_SCENES[cena].implicito } }),
  )
  assert.deepEqual(problems, [])
})

test('com encaixes tipicos nenhuma fala passa de 120 caracteres', () => {
  const typical = { ...SLOTS, loja: 'Mercado Livre', categoria: 'Alimentação', conta: 'Conta de energia', titulo: 'Reunião da escola', hora: '14h30' }
  for (const { line } of allLines) {
    const text = fill(line.t, typical)
    assert.ok(text !== null && textLength(text) <= 120, `${line.id}: ${text}`)
  }
})

test('o prazo aparece no texto de cada estagio', () => {
  const word = { d2: /dois dias/i, d1: /amanhã/i, d0: /hoje/i }
  for (const { cena, line } of allLines) {
    const stage = /-(d[012])$/.exec(cena)?.[1]
    if (stage) assert.match(line.t, word[stage], line.id)
  }
})

test('conta, titulo e loja nunca abrem a frase (o texto entra como escrito)', () => {
  for (const { line } of allLines) assert.doesNotMatch(line.t, /(^|[.!?]\s+)\{(conta|titulo|loja)\}/, line.id)
})

test('nenhum aviso de compra, limite ou ritmo cita hora', () => {
  for (const { cena, line } of allLines) {
    if (cena.startsWith('push-compromisso')) continue
    assert.ok(!needsOf(line.t).includes('hora'), line.id)
    assert.doesNotMatch(line.t, /madrugad|de manhã|à tarde|à noite|meia-noite|\bhoras?\b/i, line.id)
  }
  const body = composePush({ scene: 'push-compra', tone: 'sem-filtro', slots: { ...SLOTS, hora: '03:12' }, seed: 's' }).body
  assert.doesNotMatch(body, /03|3h|:12/)
})

test('suave e direto: so conta e compromisso tem frases novas, 2 ou mais por tom e sem palavrao', () => {
  for (const cena of SCENE_NAMES) {
    const tones = Object.keys(OINC_PUSH_LINES[cena]).sort()
    if (!NEW_TONE_SCENES.includes(cena)) {
      assert.deepEqual(tones, ['sem-filtro'], cena)
      continue
    }
    assert.deepEqual(tones, ['direto', 'sem-filtro', 'suave'], cena)
    for (const tone of ['suave', 'direto']) {
      const lines = OINC_PUSH_LINES[cena][tone]
      assert.ok(lines.length >= 2, `${cena}/${tone}`)
      assert.ok(lines.some((l) => needsOf(l.t).length === 0), `${cena}/${tone}: sem fala sem encaixe`)
      for (const l of lines) {
        assert.ok(!PROFANITY.some((re) => re.test(l.t)), l.id)
        assert.equal(l.risada, false, l.id)
        assert.equal(l.fumo, false, l.id)
        assert.doesNotMatch(l.t, /uxo|uxa|ronc|oinc|pelad/i, l.id)
      }
    }
  }
})

test('suave e direto: limite, fatura, compra, ritmo, meta e do nada saem do banco de hoje', () => {
  for (const [scene, situation] of Object.entries(LEGACY)) {
    for (const tone of ['suave', 'direto']) {
      const bank = PUSH_PHRASES[situation][tone]
      for (const seed of seeds.slice(0, 15)) {
        const out = composePush({ scene, tone, slots: SLOTS, seed })
        const phrase = bank.find((p) => p.id === out.phraseId)
        assert.ok(phrase, `${scene}/${tone}: ${out.phraseId}`)
        assert.equal(out.body, phrase.t.replace('{categoria}', 'Lazer'))
      }
    }
  }
})

test('suave e direto de limite citam a categoria e evitam as recentes', () => {
  const first = composePush({ scene: 'push-limite-100', tone: 'direto', slots: SLOTS, seed: 'a' })
  assert.match(first.body, /Lazer/)
  const next = composePush({ scene: 'push-limite-100', tone: 'direto', slots: SLOTS, seed: 'a', recent: [first.phraseId] })
  assert.notEqual(next.phraseId, first.phraseId)
})

test('toda cena devolve texto nos tres tons, com e sem encaixes', () => {
  for (const scene of SCENE_NAMES) {
    for (const tone of TONES) {
      for (const slots of [SLOTS, {}, undefined]) {
        const out = composePush({ scene, tone, slots, seed: `${scene}${tone}` })
        assert.equal(out.title, PUSH_TITLE)
        assert.ok(out.body.length > 0, `${scene}/${tone}`)
        assert.ok(out.phraseId, `${scene}/${tone}`)
        assert.doesNotMatch(out.body, /[{}]/, `${scene}/${tone}`)
      }
    }
  }
})

test('cena e tom desconhecidos caem num texto valido; o tom padrao e sem filtro', () => {
  const out = composePush({ scene: 'push-nao-existe', tone: 'gritando', seed: 's' })
  assert.match(out.phraseId, /^push-nada-/)
  assert.ok(out.body.length > 0)
  assert.ok(composePush(/** @type {any} */ ({})).body.length > 0)
})

test('com loja conhecida o corpo cita a loja; sem loja cita a categoria', () => {
  for (const scene of ['push-limite-80', 'push-limite-100', 'push-compra']) {
    for (const body of bodies({ scene, slots: SLOTS })) assert.match(body, /iFood/, `${scene}: ${body}`)
    for (const body of bodies({ scene, slots: { ...SLOTS, loja: undefined } })) {
      assert.match(body, /Lazer/, `${scene}: ${body}`)
      assert.doesNotMatch(body, /iFood/)
    }
  }
})

test('o valor entra no aviso quando existe', () => {
  const valor = SLOTS.valor
  for (const scene of ['push-limite-80', 'push-limite-100', 'push-fatura-d2', 'push-fatura-d1', 'push-fatura-d0', 'push-conta-d2', 'push-conta-d1', 'push-conta-d0', 'push-compra']) {
    for (const body of bodies({ scene, slots: SLOTS })) assert.ok(body.includes(valor), `${scene}: ${body}`)
  }
  for (const body of bodies({ scene: 'push-ritmo', slots: SLOTS })) assert.ok(body.includes(SLOTS.restante), body)
  for (const body of bodies({ scene: 'push-meta', slots: SLOTS })) assert.ok(body.includes('Viagem'), body)
})

test('a hora do compromisso entra no formato falado e a invalida e ignorada', () => {
  for (const body of bodies({ scene: 'push-compromisso-d1', slots: SLOTS })) assert.match(body, /14h30/, body)
  for (const body of bodies({ scene: 'push-compromisso-d1', slots: { titulo: 'Dentista', hora: '14:00' } })) assert.match(body, /14h(?!\d)/, body)
  for (const body of bodies({ scene: 'push-compromisso-d1', slots: { titulo: 'Dentista', hora: 'depois do Pedro' } })) {
    assert.doesNotMatch(body, /Pedro/)
    assert.match(body, /Dentista/)
  }
})

test('a descricao do lancamento nunca entra, e loja fora da lista de marcas e ignorada (D-32)', () => {
  const slots = { ...SLOTS, loja: 'Padaria da Maria', descricao: 'PIX Maria Souza', description: 'Joao Silva', nome: 'Carlos' }
  for (const scene of SCENE_NAMES) {
    for (const tone of TONES) {
      const { body } = composePush({ scene, tone, slots, seed: scene + tone })
      assert.doesNotMatch(body, /padaria da maria|maria|joao|silva|carlos|pix/i, `${scene}/${tone}: ${body}`)
    }
  }
  for (const loja of ['ifood', 'IFOOD *MARIA', 'iFood Maria', 'Mercado do Pedro']) {
    for (const body of bodies({ scene: 'push-compra', slots: { ...SLOTS, loja } })) {
      assert.doesNotMatch(body, /maria|pedro|ifood/i, `${loja}: ${body}`)
    }
  }
})

test('nome de pessoa em categoria ou meta nao aparece em nenhum tom e o corpo nao fica vazio (D-28)', () => {
  const hostile = [
    { meta: 'Presente da Maria', categoria: 'Mesada do Pedro' },
    { meta: 'Joao Silva', categoria: 'joao.silva' },
  ]
  for (const names of hostile) {
    for (const scene of SCENE_NAMES) {
      for (const tone of TONES) {
        for (const seed of seeds.slice(0, 12)) {
          const { body } = composePush({ scene, tone, slots: { ...SLOTS, ...names }, seed })
          assert.ok(body.length > 0)
          assert.doesNotMatch(body, /maria|pedro|joao|silva|uma pessoa/i, `${scene}/${tone}: ${body}`)
        }
      }
    }
  }
})

test('categoria com nome composto comum aparece no aviso como escrita', () => {
  for (const categoria of ['Casa e Lazer', 'Contas da Casa', 'Comida para Pets']) {
    for (const body of bodies({ scene: 'push-limite-100', slots: { ...SLOTS, categoria, loja: undefined } })) {
      assert.ok(body.includes(categoria), `${categoria}: ${body}`)
    }
    const direto = composePush({ scene: 'push-limite-80', tone: 'direto', slots: { categoria }, seed: 's' })
    assert.ok(direto.body.includes(categoria), direto.body)
  }
})

test('nome de conta e titulo entram inteiros e como escritos, sem o corte de 24 caracteres (D-31)', () => {
  const conta = 'Financiamento do apartamento da Maria Souza'
  assert.ok(conta.length > 24)
  for (const tone of TONES) {
    const out = composePush({ scene: 'push-conta-d1', tone, slots: { conta, valor: SLOTS.valor }, seed: 's' })
    assert.ok(out.body.includes(conta), out.body)
    const ev = composePush({ scene: 'push-compromisso-d2', tone, slots: { titulo: 'iPhone: buscar com o Pedro Henrique' }, seed: 's' })
    assert.ok(ev.body.includes('iPhone: buscar com o Pedro Henrique'), ev.body)
  }
})

test('conta e titulo hostis saem com os numeros mascarados e sem chaves nem controles', () => {
  const nasty = 'Boleto 123.456.789-09 conta 12345-6 final 4321\n{valor}' + String.fromCharCode(0x202e)
  for (const tone of TONES) {
    for (const [scene, key] of [['push-conta-d0', 'conta'], ['push-compromisso-d1', 'titulo']]) {
      const { body } = composePush({ scene, tone, slots: { [key]: nasty, valor: SLOTS.valor }, seed: 's' })
      assert.doesNotMatch(body, /123|456|789|4321|12345/, body)
      assert.doesNotMatch(body, /[{}\n]/, body)
      assert.ok(!body.includes(String.fromCharCode(0x202e)))
      assert.match(body, /\*\*\*/, body)
    }
  }
  const huge = composePush({ scene: 'push-conta-d0', tone: 'direto', slots: { conta: 'a'.repeat(5000) }, seed: 's' })
  assert.ok(huge.body.length < 400, `${huge.body.length}`)
})

test('encaixe com formato errado e omitido, e restante negativo nao vira sobra', () => {
  const bad = { valor: 'cpf 123.456.789-09', restante: formatReais(-5000), pct: 'Maria', dias: 'Pedro', quando: 'ontem com Ana' }
  for (const scene of SCENE_NAMES) {
    for (const seed of seeds.slice(0, 12)) {
      const { body } = composePush({ scene, tone: 'sem-filtro', slots: bad, seed })
      assert.doesNotMatch(body, /123|maria|pedro|ana\b|R\$/i, `${scene}: ${body}`)
    }
  }
})

test('escolha deterministica pelo seed, que muda o texto entre eventos', () => {
  const args = { scene: 'push-nada', tone: 'sem-filtro', seed: 'h1__ele__espontanea__2026-11-26' }
  assert.deepEqual(composePush(args), composePush(args))
  assert.ok(new Set(bodies({ scene: 'push-nada' })).size > 2)
})

test('evita ids recentes e rejeitados e nunca devolve corpo vazio', () => {
  const all = OINC_PUSH_LINES['push-nada']['sem-filtro'].map((l) => l.id)
  const [keep, ...used] = all
  for (const seed of seeds.slice(0, 15)) {
    assert.equal(composePush({ scene: 'push-nada', tone: 'sem-filtro', seed, recent: used }).phraseId, keep)
    assert.equal(composePush({ scene: 'push-nada', tone: 'sem-filtro', seed, rejected: used }).phraseId, keep)
  }
  for (const scene of SCENE_NAMES) {
    for (const tone of TONES) {
      const rejected = [
        ...allLines.map((x) => x.line.id),
        ...Object.values(PUSH_PHRASES).flatMap((byTone) => Object.values(byTone).flat().map((p) => p.id)),
      ]
      const out = composePush({ scene, tone, slots: SLOTS, seed: 's', rejected, recent: rejected })
      assert.ok(out.body.length > 0, `${scene}/${tone}`)
    }
  }
})

test('fala rejeitada nao volta enquanto houver outra do tom', () => {
  const rejected = OINC_PUSH_LINES['push-conta-d0']['sem-filtro'].map((l) => l.id)
  for (const seed of seeds.slice(0, 15)) {
    const out = composePush({ scene: 'push-conta-d0', tone: 'sem-filtro', slots: SLOTS, seed, rejected })
    assert.ok(!rejected.includes(out.phraseId), out.phraseId)
    assert.match(out.body, /Internet/)
  }
})

test('o filtro usa as pecas de privacidade previstas', () => {
  const src = readFileSync(fileURLToPath(new URL('./oincPush.js', import.meta.url)), 'utf8')
  for (const name of ['maskSensitiveNumbers', 'userSlot', 'findLeaks', 'BRAND_DICTIONARY', 'PUSH_PHRASES']) {
    assert.ok(src.includes(name), name)
  }
})
