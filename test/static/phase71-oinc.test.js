// Guarda estatica do app com o acervo novo do OINC (07.1-07: D-02, D-05, D-09, D-10, D-11, D-12, D-19, D-35).
// Rodar: node --test test/static/phase71-oinc.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, exists, read } from './helpers/phase3-1.js'

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
