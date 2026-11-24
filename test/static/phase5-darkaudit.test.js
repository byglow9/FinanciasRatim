// Guarda do plano 05-15 (D-10, IDEN-06): o auditor de tema cobre todas as rotas e telas de entrada, nos dois
// temas e nos dois tamanhos, tem as cinco verificacoes e a lista de excecoes com motivo, e as capturas
// ficam fora do git. A execucao em Chrome e `node scripts/ux-audit/theme.mjs --audit`.
// Rodar: node --test test/static/phase5-darkaudit.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, listSrc, read } from './helpers/phase3-1.js'

const audit = read('scripts/ux-audit/theme.mjs')

const SCREENS = [
  ["'/'", 'home'],
  ["'/transacoes'", 'transacoes'],
  ["'/calendario'", 'calendario'],
  ["'/contas-fixas'", 'contas-fixas'],
  ["'/casal'", 'casal'],
  ["'/relatorios'", 'relatorios-categorias'],
  ["'/metas'", 'metas'],
  ["'/porquinho'", 'porquinho'],
  ["'/configuracoes'", 'configuracoes'],
  ["'/vintem-teste'", 'vintem-teste'],
  ["'login'", 'login'],
  ["'onboarding-1'", 'onboarding-1'],
  ["'onboarding-2'", 'onboarding-2'],
  ["'onboarding-3'", 'onboarding-3'],
  // Plano 05-23: o onboarding passou a quatro telas (S29-09).
  ["'onboarding-4'", 'onboarding-4'],
  ["'falha'", 'falha'],
]

test('o auditor percorre todas as rotas e telas de entrada', () => {
  for (const [needle, id] of SCREENS) {
    assert.ok(audit.includes(`id: '${id}'`), `tela ${id} fora do auditor`)
    assert.ok(audit.includes(needle) || audit.includes(`entry: ${needle}`), `${id} sem ${needle}`)
  }
})

test('Relatorios percorre as quatro abas', () => {
  for (const tab of ['Categorias', 'Comparação', 'Evolução', 'Visão geral']) {
    assert.ok(audit.includes(`tab: '${tab}'`), `aba ${tab} fora do auditor`)
  }
})

test('os dois temas e os dois tamanhos, com toque', () => {
  assert.match(audit, /AUDIT_THEMES = \['claro', 'escuro'\]/)
  assert.match(audit, /width: 360, height: 640/)
  assert.match(audit, /width: 390, height: 844/)
  assert.match(audit, /setTouchEmulationEnabled/)
  assert.match(audit, /coinc:tema:v1/)
})

test('a tela de falha vem do gancho de desenvolvimento do main.tsx', () => {
  assert.ok(audit.includes('__coincBootError'))
  assert.ok(read('src/main.tsx').includes('__coincBootError'), 'o gancho some do main.tsx')
  assert.match(read('src/main.tsx'), /import\.meta\.env\.DEV[\s\S]{0,200}__coincBootError/, 'o gancho precisa ser so de DEV')
})

test('as cinco verificacoes existem com os limites do UI-SPEC S6', () => {
  assert.match(audit, /rolagem horizontal/i, '(a) rolagem horizontal')
  assert.ok(audit.includes("'hidden' || ox === 'clip'") || audit.includes("ox === 'hidden'"), '(a) ignora conteineres hidden e clip')
  assert.match(audit, /size >= 28 \? 3 : 4\.5/, '(b) contraste 4,5 e 3 para 28 px ou mais')
  assert.ok(audit.includes('svg[class*="lucide"]') && audit.includes("'icone'"), '(b) icones com minimo 3')
  assert.ok(audit.includes('const MIN_BLOCK = 64') && /l <= 0\.5/.test(audit), '(c) bloco de 64x64 com luminancia acima de 0,5')
  assert.ok(audit.includes("theme === 'escuro'"), '(c) so no escuro')
  assert.ok(audit.includes('test/static/palette-contrast.test.js') && audit.includes('spawnSync'), '(d) guarda de paleta como subprocesso')
  assert.ok(audit.includes('const MIN_TARGET = 43.5'), '(e) alvo de toque de 43,5 px')
})

test('saida, flags e codigos de saida do auditor', () => {
  for (const flag of ['--audit', '--route', '--theme', '--viewport', '--report-only']) {
    assert.ok(audit.includes(`'${flag}'`), `flag ${flag} ausente`)
  }
  assert.ok(audit.includes('`FALHAS ${failures}`'), 'linha final FALHAS n')
  assert.ok(audit.includes('process.exit(2)'), 'codigo 2 para falha do script')
})

test('toda excecao do auditor tem motivo e vale para uma verificacao', () => {
  const block = audit.slice(audit.indexOf('const AUDIT_EXCEPTIONS = ['), audit.indexOf('/** Telas percorridas.'))
  const ids = [...block.matchAll(/^\s{4}id: '([a-z0-9-]+)'/gm)].map((m) => m[1])
  const reasons = [...block.matchAll(/^\s{4}reason: '([^']+)'/gm)].map((m) => m[1])
  const checks = [...block.matchAll(/^\s{4}check: '([a-z-]+)'/gm)].map((m) => m[1])
  assert.ok(ids.length >= 3, 'lista de excecoes vazia')
  assert.equal(reasons.length, ids.length, 'excecao sem motivo')
  assert.equal(checks.length, ids.length, 'excecao sem verificacao')
  for (const reason of reasons) assert.ok(reason.length >= 40, `motivo curto demais: ${reason}`)
  for (const check of checks) assert.ok(['contraste', 'bloco-claro'].includes(check), `verificacao desconhecida: ${check}`)
  assert.ok(ids.includes('widget-pluggy') && ids.includes('cor-de-categoria-de-evento'), 'excecoes de terceiros e de dado do usuario')
  assert.ok(audit.includes('terceiros'), 'a excecao do Pluggy cita o motivo')
})

test('o auditor nao sai do 127.0.0.1 nem le .env', () => {
  assert.ok(!/https?:\/\/(?!127\.0\.0\.1)/.test(audit.replace(/^\s*\/\/.*$/gm, '')), 'URL externa no auditor')
  assert.ok(!/readFile(Sync)?\([^)]*\.env/.test(audit), 'leitura de .env')
  assert.ok(!audit.includes('process.env.VITE_FIREBASE'), 'chave de Firebase lida')
})

test('as capturas ficam fora do git', () => {
  assert.ok(audit.includes('captures'), 'diretorio de capturas')
  const ignore = read('.gitignore')
  assert.ok(ignore.split('\n').some((l) => l.trim() === '.planning/phases/05-identidade-coinki-pwa-e-onboarding/captures/'), '.gitignore sem o diretorio de capturas')
})

test('a pizza separa as fatias pela cor do cartao e nenhum componente de relatorio tem hex literal', () => {
  const pie = code('src/components/reports/CategoryPieChart.tsx')
  assert.ok(pie.includes('stroke="var(--color-card)"'), 'fatias sem o traco do cartao')
  assert.ok(!/stroke="none"/.test(pie) && !/stroke="transparent"/.test(pie), 'traco transparente nas fatias')
  const files = listSrc('src/components/reports')
  assert.ok(files.length >= 3, 'componentes de relatorio nao encontrados')
  for (const f of files) assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(code(f)), `hex literal em ${f}`)
})

// ---------------------------------------------------------------------------------------------------------
// Plano 05-16 (D-10, IDEN-06): sobreposicoes de interface abertas nos dois temas.
// A execucao em Chrome e `node scripts/ux-audit/theme.mjs --overlays`.
// ---------------------------------------------------------------------------------------------------------

const OVERLAY_IDS = [
  'lancador-com-teclado',
  'acoes-da-linha',
  'confirmacao-de-apagar',
  'select-aberto',
  'folha-de-evento',
  'folha-de-nota',
  'editor-de-categoria',
  'seletor-de-icone',
  'dialogo',
  'painel-do-sino',
  'painel-do-ciclo',
  'menu-de-perfil',
  'toast',
  'toast-do-vintem',
]

const overlayBlock = () => audit.slice(audit.indexOf('const OVERLAY_LIST = ['), audit.indexOf('async function runOverlays('))

test('o auditor tem o modo --overlays e a lista nomeada de sobreposicoes', () => {
  assert.ok(audit.includes("'--overlays'"), 'flag --overlays ausente')
  assert.ok(audit.includes('const OVERLAY_LIST = ['), 'constante OVERLAY_LIST ausente')
  assert.ok(audit.includes('async function runOverlays('), 'runOverlays ausente')
  assert.match(audit, /opts\.overlays\)\s*\{\s*auditFailures = await/, 'main nao despacha o modo --overlays')
})

test('a lista cobre toda sobreposicao do UI-SPEC S6', () => {
  const block = overlayBlock()
  const ids = [...block.matchAll(/^\s{4}id: '([a-z0-9-]+)'/gm)].map((m) => m[1])
  for (const id of OVERLAY_IDS) assert.ok(ids.includes(id), `sobreposicao ${id} fora da lista`)
  assert.equal(new Set(ids).size, ids.length, 'id repetido na lista')
  assert.ok(block.includes("aria-label=\"Novo lançamento\"") || audit.includes('button[aria-label="Novo lançamento"]'), 'lancador sem o botao de novo lancamento')
  assert.ok(block.includes('Avisos') && block.includes('Ciclos') && block.includes('Perfil'), 'paineis do sino, do ciclo e do perfil')
  assert.ok(block.includes('Fechar aviso') && block.includes('Dispensar fala do OINC'), 'toast comum e toast do Vintem')
})

test('cada sobreposicao declara a raiz medida e a veladura quando existe', () => {
  const block = overlayBlock()
  const roots = [...block.matchAll(/^\s{4}root: /gm)].length
  const veils = [...block.matchAll(/^\s{4}veil: /gm)].length
  const opens = [...block.matchAll(/^\s{4}open: async/gm)].length
  assert.equal(roots, OVERLAY_IDS.length, 'toda sobreposicao precisa de root')
  assert.equal(veils, OVERLAY_IDS.length, 'toda sobreposicao precisa declarar veil (ou null)')
  assert.equal(opens, OVERLAY_IDS.length, 'toda sobreposicao precisa de open')
})

test('as sobreposicoes rodam nos dois temas e tamanhos com as cinco verificacoes mais a veladura preta', () => {
  const run = audit.slice(audit.indexOf('async function runOverlays('), audit.indexOf('function withTimeout('))
  assert.ok(run.includes('AUDIT_THEMES') && run.includes('AUDIT_VIEWPORTS'), 'dois temas e dois tamanhos')
  assert.ok(run.includes('pageAudit.toString()'), 'mesmas verificacoes de pagina das telas')
  assert.ok(run.includes('runHexGuard()'), 'guarda de hex literal')
  assert.ok(run.includes('veilBad'), 'veladura conferida')
  assert.ok(run.includes('`sobreposicao-${overlay.id}-${theme}.png`'), 'uma captura por sobreposicao e tema')
  assert.ok(audit.includes('veilSel') && /c\.r <= 8 && c\.g <= 8 && c\.b <= 8 && c\.a >= 0\.2/.test(audit), 'veladura preta e translucida')
  assert.ok(audit.includes('rootExpr'), 'escopo da medicao na sobreposicao')
})

test('o Dialog sem consumidor no app e montado a partir do modulo real, nao de uma copia', () => {
  assert.ok(audit.includes('async function mountDialogHarness('), 'montagem do Dialog ausente')
  assert.ok(audit.includes("import('/src/components/ui/dialog.tsx')"), 'o Dialog vem do modulo do app')
  assert.ok(audit.includes("import('/src/components/ui/button.tsx')"), 'os botoes do Dialog vem do Button do app')
})

test('a veladura do Dialog e dos Sheets continua preta nos dois temas (UI-SPEC S6, P-09)', () => {
  const dialog = code('src/components/ui/dialog.tsx')
  const sheet = code('src/components/ui/sheet.tsx')
  assert.match(dialog, /bg-black\/80/, 'veladura do dialog')
  assert.match(sheet, /bg-\[rgba\(0,0,0,\.35\)\]/, 'veladura do sheet')
  for (const [name, src] of [['dialog', dialog], ['sheet', sheet]]) {
    assert.ok(!/\bdark:/.test(src), `${name} usa prefixo dark:`)
    assert.ok(!/bg-white\b/.test(src), `${name} com bg-white`)
    assert.ok(/bg-popover/.test(src), `${name} sem bg-popover no painel`)
  }
})

test('o texto de acao verde em painel escuro usa token de tinta, nao o verde de superficie', () => {
  // --primary no escuro (#2c7f4b) e superficie de botao; como texto sobre bg-popover nao chega a 4,5. A tinta ok-ink chega.
  assert.ok(!/text-primary\b/.test(code('src/components/ui/select.tsx')), 'opcao marcada do Select com text-primary')
  assert.ok(!/text-primary\b/.test(code('src/components/layout/AlertsBell.tsx')), 'Marcar todos como lidos com text-primary')
  assert.match(code('src/components/ui/select.tsx'), /text-ok-ink/)
  assert.match(code('src/components/layout/AlertsBell.tsx'), /text-ok-ink/)
})
