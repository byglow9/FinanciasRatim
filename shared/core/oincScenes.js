// @ts-check
// Catalogo fechado de cenas do OINC (07.1, D-13): o que o acervo, o seletor de fatos e o push podem
// comentar. Dado puro, sem relogio, sem acaso e sem pacote. Cada cena tem:
//   longa      pode ter fala mais longa (D-02): so estouro de limite e comparacao
//   frequente  cena do dia a dia, que precisa de mais modelos no acervo
//   slots      encaixes que os modelos da cena podem usar (so os de OINC_SLOTS que fazem sentido)
//   implicito  condicao que o modelo ja afirma no texto (ex.: "sexta a noite"); o seletor so liga a
//              cena quando a condicao e verdadeira, para a fala nunca inventar fato

/** Encaixes que um modelo pode usar (os nomes dentro das chaves). */
export const OINC_SLOTS = Object.freeze([
  'valor', 'loja', 'categoria', 'pct', 'dias', 'vezes', 'meta', 'conta', 'titulo', 'restante', 'total', 'hora', 'quando',
])

/** Temas de conta e compromisso reconhecidos pelo nome. */
export const OINC_TEMAS = Object.freeze([
  'internet', 'luz', 'agua', 'aluguel', 'dentista', 'medico', 'academia', 'aniversario',
])

/** Condicoes que um modelo pode exigir: de calendario e de tema. */
export const OINC_CONDS = Object.freeze([
  'hoje', 'ontem', 'amanha', 'sexta', 'sabado', 'domingo', 'fim-de-semana', 'madrugada',
  ...OINC_TEMAS.map((tema) => `tema:${tema}`),
])

/**
 * @typedef {{ longa: boolean, frequente: boolean, slots: ReadonlyArray<string>, implicito: ReadonlyArray<string> }} OincScene
 */

/**
 * @param {string[]} slots
 * @param {{ longa?: boolean, frequente?: boolean, implicito?: string[] }} [flags]
 * @returns {Readonly<OincScene>}
 */
const scene = (slots, flags = {}) =>
  Object.freeze({
    longa: flags.longa === true,
    frequente: flags.frequente === true,
    slots: Object.freeze([...slots]),
    implicito: Object.freeze([...(flags.implicito ?? [])]),
  })

/** @type {Readonly<Record<string, Readonly<OincScene>>>} */
export const OINC_SCENES = Object.freeze({
  // Gastos por lugar e tipo
  posto: scene(['valor', 'loja', 'quando'], { frequente: true }),
  farmacia: scene(['valor', 'loja', 'quando']),
  assinaturas: scene(['valor', 'total', 'loja']),
  'compra-madrugada': scene(['valor', 'loja', 'hora'], { implicito: ['madrugada'] }),
  'pix-pessoa': scene(['valor', 'quando']),
  'gasto-minusculo': scene(['valor', 'loja', 'vezes']),
  parcelamento: scene(['valor', 'vezes', 'loja']),
  padaria: scene(['valor', 'loja', 'vezes', 'quando']),
  'app-corrida': scene(['valor', 'vezes', 'quando']),
  roupa: scene(['valor', 'loja']),
  pet: scene(['valor', 'loja']),
  'varias-compras': scene(['vezes', 'total', 'quando']),
  estorno: scene(['valor', 'loja']),
  delivery: scene(['valor', 'loja', 'vezes', 'total', 'quando'], { frequente: true }),
  mercado: scene(['valor', 'loja', 'vezes', 'total', 'quando'], { frequente: true }),
  'compra-grande': scene(['valor', 'loja', 'categoria']),
  compra: scene(['valor', 'loja', 'categoria', 'quando']),
  'loja-repete': scene(['loja', 'vezes', 'total']),
  'black-friday': scene(['valor', 'loja']),
  'sexta-noite': scene(['valor', 'loja', 'total'], { implicito: ['sexta'] }),
  tabacaria: scene(['valor', 'loja']),
  pod: scene(['valor', 'loja', 'vezes']),
  // Entradas e ritmo do ciclo
  'renda-extra': scene(['valor', 'quando']),
  'primeiro-dia': scene(['restante', 'dias']),
  'vespera-salario': scene(['restante', 'dias'], { implicito: ['amanha'] }),
  'semana-sem-gastar': scene(['dias', 'restante']),
  salario: scene(['valor', 'restante']),
  // Limites e leitura do mes
  'limite-quase': scene(['categoria', 'pct', 'restante', 'dias'], { frequente: true }),
  'limite-estourou': scene(['categoria', 'pct', 'valor', 'total', 'dias', 'loja'], { longa: true, frequente: true }),
  'limite-novo': scene(['categoria', 'valor']),
  'limite-aumentado': scene(['categoria', 'valor']),
  'mes-folgado': scene(['restante', 'dias', 'pct'], { frequente: true }),
  'mes-apertado': scene(['restante', 'dias', 'pct'], { frequente: true }),
  comparacao: scene(['categoria', 'valor', 'total', 'pct'], { longa: true }),
  // Contas e agenda
  fatura: scene(['valor', 'conta', 'dias']),
  'conta-vencendo': scene(['conta', 'valor', 'dias']),
  'conta-hoje': scene(['conta', 'valor'], { implicito: ['hoje'] }),
  'conta-atrasada': scene(['conta', 'valor', 'dias']),
  'aviso-2-dias': scene(['conta', 'valor', 'dias']),
  'conta-paga': scene(['conta', 'valor']),
  compromisso: scene(['titulo', 'hora', 'dias']),
  aniversario: scene(['titulo', 'dias']),
  'agenda-notas': scene(['titulo', 'dias']),
  // Metas e Porquinho
  'meta-nova': scene(['meta', 'valor']),
  'meta-aporte': scene(['meta', 'valor', 'pct']),
  'meta-batida': scene(['meta', 'valor']),
  'meta-parada': scene(['meta', 'dias', 'pct']),
  'meta-status': scene(['meta', 'pct', 'restante']),
  'porquinho-encheu': scene(['valor', 'total']),
  'porquinho-sacou': scene(['valor', 'total']),
  'porquinho-recorde': scene(['total']),
  'porquinho-status': scene(['total', 'valor']),
  // Sem gatilho de lancamento
  sumico: scene(['dias']),
  entrou: scene(['restante', 'dias']),
  'do-nada': scene(['restante', 'dias']),
  'app-madrugada': scene(['restante', 'hora'], { implicito: ['madrugada'] }),
  'bom-dia': scene(['restante', 'dias']),
  'porco-chapaduxo': scene(['restante', 'dias']),
  larica: scene(['valor', 'loja', 'hora']),
})
