// @ts-check
// Estados do cartao Notificacoes (PUSH-01, D-08) como funcao pura: a tela passa o
// que leu do aparelho e do servidor e recebe um dos estados. Sem relogio, sem acaso
// e sem pacote. Os textos de tela levam acento (sao texto de interface).

/** Os estados possiveis do cartao. */
export const PUSH_STATES = Object.freeze({
  PADRAO: 'padrao',
  VERIFICANDO: 'verificando',
  NAO_SUPORTADO: 'nao-suportado',
  APP_NAO_INSTALADO: 'app-nao-instalado',
  NEGADO: 'negado',
  ATIVO: 'ativo',
  INSCRICAO_PERDIDA: 'inscricao-perdida',
})

/**
 * @typedef {{ configured: boolean, supported: boolean, platform: 'iphone' | 'android' | string,
 *   standalone: boolean, permission: 'default' | 'granted' | 'denied' | 'unsupported' | string,
 *   registered: boolean | null }} PushStateInput
 */

/**
 * Estado do cartao, em ordem de prioridade: iPhone fora do app instalado vence o
 * nao suportado (no Safari sem instalar nao existe PushManager); depois nao
 * configurado ou sem suporte; depois a permissao.
 * @param {Partial<PushStateInput>} [input]
 * @returns {string}
 */
export function pushState(input = {}) {
  const { configured, supported, platform, standalone, permission, registered } = input
  if (platform === 'iphone' && standalone !== true) return PUSH_STATES.APP_NAO_INSTALADO
  if (configured !== true || supported !== true || permission === 'unsupported') {
    return PUSH_STATES.NAO_SUPORTADO
  }
  if (permission === 'denied') return PUSH_STATES.NEGADO
  if (permission === 'granted') {
    if (registered === true) return PUSH_STATES.ATIVO
    if (registered === false) return PUSH_STATES.INSCRICAO_PERDIDA
    return PUSH_STATES.VERIFICANDO
  }
  return PUSH_STATES.PADRAO
}

/**
 * @typedef {{ title: string, body: string, action: 'ativar' | 'reativar' | 'passos-iphone' | null }} StateText
 */

/** @type {Readonly<Record<string, StateText>>} */
const TEXTS = Object.freeze({
  [PUSH_STATES.ATIVO]: Object.freeze({
    title: 'Avisos ativos',
    body: 'Avisos ativos neste aparelho.',
    action: null,
  }),
  [PUSH_STATES.PADRAO]: Object.freeze({
    title: 'Avisos desligados',
    body: 'Ative para receber avisos de limite e de fatura neste aparelho.',
    action: 'ativar',
  }),
  [PUSH_STATES.NEGADO]: Object.freeze({
    title: 'Avisos bloqueados',
    body: 'As notificações estão bloqueadas neste aparelho. Libere nas configurações do aparelho e volte aqui.',
    action: null,
  }),
  [PUSH_STATES.NAO_SUPORTADO]: Object.freeze({
    title: 'Avisos indisponíveis',
    body: 'Este aparelho ou navegador não recebe avisos. No iPhone, atualize o iOS para a versão 16.4 ou mais nova.',
    action: null,
  }),
  [PUSH_STATES.APP_NAO_INSTALADO]: Object.freeze({
    title: 'Instale o app para receber avisos',
    body: 'No iPhone, os avisos só funcionam com o app instalado na tela de início.',
    action: 'passos-iphone',
  }),
  [PUSH_STATES.INSCRICAO_PERDIDA]: Object.freeze({
    title: 'Avisos precisam ser reativados',
    body: 'Este aparelho perdeu a inscrição dos avisos.',
    action: 'reativar',
  }),
  [PUSH_STATES.VERIFICANDO]: Object.freeze({
    title: 'Conferindo os avisos',
    body: 'Conferindo os avisos deste aparelho.',
    action: null,
  }),
})

/**
 * Texto de tela e acao do estado. Estado desconhecido cai no nao suportado.
 * A plataforma fica na assinatura para a tela poder variar o texto sem mudar a
 * chamada; hoje os textos valem para as duas.
 * @param {string} state
 * @param {string} [_platform]
 * @returns {StateText}
 */
export function describeState(state, _platform) {
  const text = TEXTS[state] || TEXTS[PUSH_STATES.NAO_SUPORTADO]
  return { title: text.title, body: text.body, action: text.action }
}

/**
 * Passo a passo do iPhone para instalar o app e liberar os avisos.
 * @returns {string[]}
 */
export function iphoneSteps() {
  return [
    'Toque em Compartilhar no Safari.',
    'Escolha Adicionar à Tela de Início.',
    'Abra o Coinc pelo ícone novo e volte a Configurações.',
  ]
}
