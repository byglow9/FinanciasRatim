// Guarda estatica do app com o acervo novo do OINC (07.1-07: D-02, D-05, D-09, D-10, D-11, D-12, D-19, D-35).
// Rodar: node --test test/static/phase71-oinc.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, exists, listSrc, read } from './helpers/phase3-1.js'

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
  // A fala da IA nao tem id de acervo e nao vai a voto.
  assert.match(body(src, 'espiar'), /peekToast\(\{ text \}, 'wake'\)/)
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
