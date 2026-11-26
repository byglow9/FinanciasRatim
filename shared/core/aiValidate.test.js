import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  validateSpeech,
  extractNumbers,
  normalizeSpeech,
  DISCRIMINATION,
  EDGY_WORDS,
  RELATION_WORDS,
  LENGTH_LIMITS,
} from './aiValidate.js'

const NB = ' '

/** Contexto base: nenhum numero permitido, tom direto. */
const base = { length: 'curta', tone: 'direto', allowed: { moneyCents: [], pcts: [], ints: [] } }

/** @param {string} t @param {object} [ctx] */
const reason = (t, ctx = base) => {
  const r = validateSpeech(t, ctx)
  return r.ok ? 'ok' : r.reason
}

// --- aprovacao -------------------------------------------------------------------------------
test('aprova fala curta com numeros do resumo, por tom e comprimento', () => {
  const allowed = { moneyCents: [2590], pcts: [85], ints: [7] }
  const casos = [
    ['suave', `Hoje o iFood levou R$${NB}25,90. Vamos com calma.`],
    ['direto', `Faltam 7 dias e a comida já está em 85% do limite.`],
    ['sem-filtro', `Porra, você gastou R$ 25,90 de novo no iFood, baleia.`],
  ]
  for (const [tone, text] of casos) {
    const r = validateSpeech(text, { length: 'curta', tone, allowed })
    assert.equal(r.ok, true, `${tone}: ${JSON.stringify(r)}`)
    assert.equal(r.text, text)
  }
})

test('aprova fala longa de ate 3 frases e 280 caracteres', () => {
  const t = 'O mês está indo bem, mas a comida já passou da metade do limite. Segura a mão no delivery. Ainda dá tempo de fechar no azul.'
  assert.ok(t.length <= 280)
  assert.equal(reason(t, { ...base, length: 'longa' }), 'ok')
})

test('o texto aprovado sai normalizado: sem quebra de linha, sem espaco repetido, sem aspas ao redor', () => {
  const r = validateSpeech('  "Você   gastou\ndemais   hoje."  ', base)
  assert.deepEqual(r, { ok: true, text: 'Você gastou demais hoje.' })
  assert.equal(normalizeSpeech("'oi  tudo'"), 'oi tudo')
  assert.equal(normalizeSpeech('"a" e "b"'), '"a" e "b"')
})

// --- motivos, um caso cada ------------------------------------------------------------------
test('vazio', () => {
  for (const t of ['', '   ', '\n', null, undefined]) assert.equal(reason(t), 'vazio')
})

test('marcacao', () => {
  for (const t of [
    'Você gastou **muito** hoje.', 'Você gastou _muito_ hoje.', 'Você gastou `muito` hoje.',
    '# Você gastou muito hoje', 'Veja [aqui](x) o que você gastou', 'Você <b>gastou</b> muito',
    'Você gastou {valor} hoje', 'Veja https://x.com o que você gastou', 'Veja www.x.com o que você gastou',
  ]) {
    assert.equal(reason(t), 'marcacao', t)
  }
})

test('emoji e travessao', () => {
  assert.equal(reason('Você gastou demais hoje \u{1F437}'), 'emoji')
  assert.equal(reason('Você gastou demais — de novo'), 'travessao')
  assert.equal(reason('Você gastou demais – de novo'), 'travessao')
})

test('marca-ia: reaproveita AI_TELLS de phraseRules', () => {
  assert.equal(reason('Olá, você gastou demais hoje'), 'marca-ia')
  assert.equal(reason('Que tal gastar menos amanhã'), 'marca-ia')
  assert.equal(reason('Espero que você gaste menos amanhã'), 'marca-ia')
})

test('recusa: assistente em portugues e em ingles, sem pegar fala normal', () => {
  for (const t of [
    'Desculpe, não posso ajudar com isso.', 'Sinto muito, mas não posso responder.',
    'Como uma IA, não tenho opinião sobre gastos.', "I'm sorry, I can't help with that.",
    'As an AI language model I cannot say.', 'Não consigo te ajudar com isso agora.',
  ]) {
    assert.equal(reason(t), 'recusa', t)
  }
  assert.equal(reason('Você não pode gastar mais com delivery este mês.'), 'ok')
  assert.equal(reason('Não dá para ajudar quem gasta assim, hein.'), 'ok')
})

test('idioma: ingles e texto sem cara de portugues reprovam', () => {
  assert.equal(reason('You spent too much money this month.'), 'idioma')
  assert.equal(reason('The budget is over, just stop it.'), 'idioma')
  assert.equal(reason('asdf qwer zxcv poiu lkjh mnbv'), 'idioma')
  assert.equal(reason('Gastou demais.'), 'ok')
  assert.equal(reason('Porra, de novo?'), 'ok')
})

test('tamanho: curta ate 140 caracteres e 4 frases; longa ate 280 e 5 frases', () => {
  // Fala surtada usa frases curtinhas: o que segura o tamanho sao os caracteres.
  assert.deepEqual(LENGTH_LIMITS.curta, { chars: 140, sentences: 4 })
  assert.deepEqual(LENGTH_LIMITS.longa, { chars: 280, sentences: 5 })
  const longoCurta = `Você gastou demais ${'e de novo '.repeat(14)}hoje.`
  assert.ok(longoCurta.length > 140)
  assert.equal(reason(longoCurta), 'tamanho')
  assert.equal(reason('Você gastou demais. De novo. Que absurdo. Para com isso.'), 'ok')
  const cinco = 'Você gastou demais. De novo. Que absurdo. Para com isso. Sério.'
  assert.equal(reason(cinco), 'tamanho')
  assert.equal(reason(cinco, { ...base, length: 'longa' }), 'ok')
  assert.equal(reason(`${cinco} Chega.`, { ...base, length: 'longa' }), 'tamanho')
  assert.equal(reason(`Você gastou demais ${'e de novo '.repeat(30)}hoje.`, { ...base, length: 'longa' }), 'tamanho')
})

test('palavrao esticado ou gritado conta como sem filtro', () => {
  const exige = { ...base, tone: 'sem-filtro', edgy: true, requireProfanity: true }
  for (const text of ['Você gastou de novo, PORRAAA, para com isso.', 'Você gastou de novo, caralhooo, kkkk.']) {
    assert.equal(reason(text, exige), 'ok', text)
  }
})

test('dado-proibido: FORBIDDEN_DATA e 4 ou mais digitos fora de valor em reais e percentual', () => {
  assert.equal(reason('Você passou o seu CPF para um estranho'), 'dado-proibido')
  assert.equal(reason('Foi um pix para a loja de novo'), 'dado-proibido')
  assert.equal(reason('Foram 2026 compras no mês, absurdo'), 'dado-proibido')
  assert.equal(reason('Anotei 1234 no seu caderno de gastos'), 'dado-proibido')
  const permitido = { ...base, allowed: { moneyCents: [123456], pcts: [], ints: [] } }
  assert.equal(reason('Você gastou R$ 1.234,56 neste mês, absurdo', permitido), 'ok')
  assert.equal(reason('Você gastou 1500 reais neste mês, absurdo', { ...base, allowed: { moneyCents: [150000] } }), 'ok')
  assert.equal(reason('Você gastou 1500 reais neste mês, absurdo', base), 'numero-inventado')
})

test('parceiro: rotulo da outra aba (com acento e caixa) e palavras de relacao', () => {
  const ctx = { ...base, partnerLabels: ['Nirigua'] }
  assert.equal(reason('A Nirigúa gastou menos que você hoje', ctx), 'parceiro')
  assert.equal(reason('A NIRIGUA gastou menos que você hoje', ctx), 'parceiro')
  assert.equal(reason('Você gastou menos que ontem, parabéns', ctx), 'ok')
  for (const w of RELATION_WORDS) assert.equal(reason(`Pergunta para o seu ${w} sobre isso`), 'parceiro', w)
  assert.equal(reason('Seus maridos que se cuidem'), 'parceiro')
})

test('discriminacao: cada categoria reprova (amostras so neste arquivo)', () => {
  const amostras = {
    raca: 'Você é um crioulo gastador mesmo',
    orientacao: 'Você é um viado gastador mesmo',
    religiao: 'Você é um macumbeiro gastador mesmo',
    deficiencia: 'Você é um retardado gastador mesmo',
    origem: 'Você gasta igual pau de arara mesmo',
    grupo: 'Você gasta igual mulher no volante mesmo',
  }
  assert.deepEqual(Object.keys(DISCRIMINATION).sort(), Object.keys(amostras).sort())
  for (const [cat, t] of Object.entries(amostras)) {
    assert.equal(reason(t), 'discriminacao', cat)
    assert.equal(reason(t.toUpperCase()), 'discriminacao', `${cat} em maiusculas`)
  }
})

test('D-22: palavrao, xingamento do habito e apelido como baleia passam em sem-filtro', () => {
  const ctx = { ...base, tone: 'sem-filtro' }
  for (const t of [
    'Que merda de mês, hein baleia', 'Seu otário, gastou de novo no delivery', 'Porra, seu burro, parou de gastar não?',
    'Que cu de gasto foi esse no mercado', 'Seu idiota, o limite acabou faz tempo', 'Vai se foder, gastou tudo em lanche',
    'Baleia do delivery, segura a mão', 'Que bosta de semana pra sua conta',
  ]) {
    assert.equal(reason(t, ctx), 'ok', t)
  }
})

test('loja-errada: so a loja do lancamento comentado pode ser citada', () => {
  const ctx = { ...base, focusLabel: 'iFood', otherLabels: ['Uber', 'iFood', 'Mercado Livre', 'Sp'] }
  assert.equal(reason('O Uber de novo, hein', ctx), 'loja-errada')
  assert.equal(reason('Foi no iFood e depois no mercado livre', ctx), 'loja-errada')
  assert.equal(reason('O iFood de novo, hein', ctx), 'ok')
  assert.equal(reason('Outro lanche e já passou do limite', ctx), 'ok')
  assert.equal(reason('Aquele sp de sempre', ctx), 'ok')
})

test('loja-errada: a loja do lancamento nao reprova por conter outra palavra de loja', () => {
  const ctx = { ...base, focusLabel: 'Mercado Livre', otherLabels: ['Mercado', 'Uber'] }
  assert.equal(reason('Mercado Livre de novo, hein', ctx), 'ok')
  assert.equal(reason('Mercado Livre e Uber no mesmo dia', ctx), 'loja-errada')
})

test('loja-errada: sem otherLabels a regra nao se aplica', () => {
  assert.equal(reason('O Uber de novo, hein', base), 'ok')
  assert.equal(reason('O Uber de novo, hein', { ...base, focusLabel: 'iFood' }), 'ok')
  assert.equal(reason('O Uber de novo, hein', { ...base, otherLabels: [] }), 'ok')
})

test('numero-inventado: todo valor, percentual e inteiro precisa existir no resumo', () => {
  const allowed = { moneyCents: [2590, 15000], pcts: [85], ints: [7, 3] }
  const ctx = { ...base, allowed }
  assert.equal(reason('Foram R$ 99,90 no iFood hoje', ctx), 'numero-inventado')
  assert.equal(reason(`Foram R$${NB}99,90 no iFood hoje`, ctx), 'numero-inventado')
  assert.equal(reason('Já está em 90% do limite hoje', ctx), 'numero-inventado')
  assert.equal(reason('Foram 5 vezes no iFood este mês', ctx), 'numero-inventado')
  assert.equal(reason('Foram 50 reais no iFood este mês', ctx), 'numero-inventado')
  assert.equal(reason('Foram R$ 25,90 no iFood hoje', ctx), 'ok')
  assert.equal(reason(`Foram R$${NB}25,90 no iFood hoje`, ctx), 'ok')
  assert.equal(reason('Sobram R$ 150 e 7 dias, já em 85% do limite', ctx), 'ok')
  assert.equal(reason('Foram 3 vezes no iFood este mês', ctx), 'ok')
  assert.equal(reason('Foram três vezes no iFood este mês', { ...base }), 'ok')
  assert.equal(reason('Foram R$ 25,90 no iFood hoje', { ...base, allowed: undefined }), 'numero-inventado')
})

test('manso: so com a opcao ligada, tom sem-filtro e situacao edgy', () => {
  const manso = 'Você gastou demais no delivery, cuidado com isso'
  const forte = 'Porra, você gastou demais no delivery'
  const ctx = { ...base, tone: 'sem-filtro', edgy: true, requireProfanity: true }
  assert.equal(reason(manso, ctx), 'manso')
  assert.equal(reason(forte, ctx), 'ok')
  assert.equal(reason('Seu otário gastou demais no delivery', ctx), 'ok')
  assert.equal(reason(manso, { ...ctx, requireProfanity: false }), 'ok')
  assert.equal(reason(manso, { ...ctx, edgy: false }), 'ok')
  assert.equal(reason(manso, { ...ctx, tone: 'suave' }), 'ok')
  assert.ok(EDGY_WORDS.length > 10)
})

test('ordem dos motivos: o primeiro que reprova vence', () => {
  assert.equal(reason('**x** \u{1F437} Desculpe, não posso ajudar'), 'marcacao')
  assert.equal(reason('Desculpe, não posso ajudar com 1234'), 'recusa')
})

test('extractNumbers: valores em centavos, percentuais e inteiros, com ou sem NBSP', () => {
  const r = extractNumbers(`R$${NB}1.234,56 e R$ 10 e R$ 0,5, 12,5% e 40 %, 3 vezes dia 25/11, 2 reais`)
  assert.deepEqual(r.moneyCents.sort((a, b) => a - b), [50, 1000, 200, 123456].sort((a, b) => a - b))
  assert.deepEqual(r.pcts.sort((a, b) => a - b), [12.5, 40])
  assert.deepEqual(r.ints.sort((a, b) => a - b), [3, 11, 25])
  assert.deepEqual(extractNumbers('sem numero nenhum aqui por extenso: tres'), { moneyCents: [], pcts: [], ints: [] })
  assert.deepEqual(extractNumbers(null), { moneyCents: [], pcts: [], ints: [] })
})

test('aceita Set e lista nos numeros permitidos', () => {
  const ctx = { ...base, allowed: { moneyCents: new Set([2590]), pcts: new Set([85]), ints: new Set([7]) } }
  assert.equal(reason('R$ 25,90 em 7 dias e 85%', ctx), 'ok')
})

test('nao importa a regua de ataque pessoal nem o checkPhrase da Fase 4', () => {
  const src = readFileSync(fileURLToPath(new URL('./aiValidate.js', import.meta.url)), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
  assert.doesNotMatch(src, /PERSONAL_ATTACK/)
  assert.doesNotMatch(src, /checkPhrase/)
  assert.match(src, /import \{[^}]*AI_TELLS[^}]*FORBIDDEN_DATA[^}]*\} from '\.\/phraseRules\.js'/)
})

test('palavrao nao e ofensa discriminatoria: nenhuma lista de discriminacao pega PROFANITY', () => {
  for (const list of Object.values(DISCRIMINATION)) {
    for (const re of list) {
      for (const p of ['caralho', 'porra', 'merda', 'bosta', 'puta', 'foda', 'baleia', 'burro', 'idiota', 'otario']) {
        assert.equal(re.test(p), false, `${re} pegou ${p}`)
      }
    }
  }
})

test('numero-extenso: valor escrito em palavras reprova e contagem pequena passa', () => {
  for (const t of [
    'Oito por cento da viagem, meu herói.',
    'Seiscentos e doze no mercado hoje, porra.',
    'Você empurrou esse aluguel de mil e quinhentos.',
    'Quarenta e sete reais no cofre, é isso.',
  ]) {
    assert.equal(reason(t), 'numero-extenso', t)
  }
  for (const t of ['Você foi três vezes no bar essa semana.', 'Faltam dois dias para a fatura, se mexe.']) {
    assert.equal(reason(t), 'ok', t)
  }
})
