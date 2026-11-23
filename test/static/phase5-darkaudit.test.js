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
