// Guarda estatica dos estados vazios e de erro com o Vintem calado (D-16, UI-SPEC S5, P-02), parte 2:
// sino, Casal, Porquinho, Relatorios e Configuracoes. Rodar: node --test test/static/phase4-empty-more.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const BELL = 'src/components/layout/AlertsBell.tsx'
const COUPLE = 'src/pages/CouplePage.tsx'
const SAVINGS = 'src/pages/SavingsPage.tsx'
const REPORTS = 'src/pages/ReportsPage.tsx'
const SETTINGS = 'src/pages/SettingsPage.tsx'
const EMPTY = 'src/components/vintem/VintemEmpty.tsx'
const EDITED = [BELL, COUPLE, SAVINGS, REPORTS, SETTINGS]

const IMPORT = /import \{ VintemEmpty \} from '@\/components\/vintem\/VintemEmpty'/

/** Pose da peca montada imediatamente acima do titulo de vazio `<p className="text-base font-bold">texto`. */
function emptyPose(src, text) {
  const at = src.indexOf(`>${text}</p>`)
  assert.ok(at >= 0, `texto de vazio ausente: ${text}`)
  const before = src.slice(Math.max(0, at - 200), at)
  const m = /<VintemEmpty pose="(\w+)" \/>(?:\}|\s)*<p className="text-base font-bold"$/.exec(before)
  return m ? m[1] : null
}

/** Pose da peca montada imediatamente acima do Notice de erro com o titulo `title`. */
function errorPose(src, title) {
  const at = src.indexOf(`title="${title}"`)
  assert.ok(at >= 0, `aviso de erro ausente: ${title}`)
  const before = src.slice(Math.max(0, at - 200), at)
  const m = /<VintemEmpty pose="(\w+)" \/>\s*<Notice\s+tone="danger"\s+(?:icon=\{\w+\}\s+)?$/.exec(before)
  return m ? m[1] : null
}

test('cada arquivo editado importa VintemEmpty', () => {
  for (const f of EDITED) assert.match(code(f), IMPORT, `${f} sem o import de VintemEmpty`)
})

test('o sino monta o sonolento so fora da Home, acima do texto de origem', () => {
  const src = code(BELL)
  assert.match(src, /import \{[^}]*\buseLocation\b[^}]*\} from 'react-router-dom'/, 'sino sem useLocation')
  assert.match(src, /const \{ pathname \} = useLocation\(\)/, 'sino sem a leitura de pathname')
  assert.match(
    src,
    /\{pathname !== '\/' && <VintemEmpty pose="sonolento" \/>\}\s*<p className="text-base font-bold">Sem avisos por enquanto<\/p>/,
    'peca sonolenta condicionada a pathname acima de "Sem avisos por enquanto"',
  )
  assert.equal([...src.matchAll(/<VintemEmpty/g)].length, 1, 'o sino monta uma unica peca')
  assert.ok(src.includes('Sem avisos por enquanto'), 'texto do painel vazio mudou')
  assert.ok(src.includes('Você será avisado ao chegar a 80% e ao passar de 100% de um limite.'), 'legenda do painel mudou')
})

test('o Casal monta o neutro no vazio e o surpreso no erro, com os textos de origem', () => {
  const src = code(COUPLE)
  assert.equal(emptyPose(src, 'Sem lançamentos neste período'), 'neutro')
  assert.equal(errorPose(src, 'Não foi possível carregar os números do casal.'), 'surpreso')
  assert.ok(src.includes('Quando vocês lançarem gastos ou receitas, a comparação aparece aqui.'))
  assert.ok(src.includes('Tentar de novo') && src.includes('Confira a conexão e tente de novo.'))
})

test('Porquinho, Relatorios e Configuracoes montam o surpreso nos erros de pagina, com os textos de origem', () => {
  const cases = [
    [SAVINGS, 'Não foi possível carregar o Porquinho.'],
    [REPORTS, 'Não foi possível carregar os relatórios.'],
    [SETTINGS, 'Não foi possível carregar suas configurações.'],
  ]
  for (const [file, title] of cases) {
    const src = code(file)
    assert.equal(errorPose(src, title), 'surpreso', `${file}: "${title}"`)
    assert.ok(src.includes('Tentar de novo'), `${file} sem o botao "Tentar de novo"`)
    assert.ok(src.includes('Confira a conexão e tente de novo.'), `${file} sem o texto do aviso`)
  }
})

test('Relatorios so ganha a peca no erro da pagina (graficos e EmptyState ficam como estao)', () => {
  const src = code(REPORTS)
  assert.equal([...src.matchAll(/<VintemEmpty/g)].length, 1, 'Relatorios com mais de uma peca')
  assert.ok(src.includes('<EmptyState'), 'EmptyState de relatorios sumiu')
})

test('nenhum estado usa a pose triste e as poses ficam nas permitidas', () => {
  const allowed = { [BELL]: ['sonolento'], [COUPLE]: ['neutro', 'surpreso'] }
  for (const f of EDITED) {
    assert.doesNotMatch(code(f), /VintemEmpty[^>]*triste/, `${f} com VintemEmpty triste`)
    const poses = [...code(f).matchAll(/<VintemEmpty pose="(\w+)"/g)].map((m) => m[1])
    assert.ok(poses.length > 0, `${f} sem VintemEmpty`)
    for (const p of poses) assert.ok((allowed[f] ?? ['surpreso']).includes(p), `${f}: pose inesperada ${p}`)
  }
})

test('VintemEmpty segue calado: sem useVintem, sem botao e sem fala', () => {
  const src = code(EMPTY)
  assert.doesNotMatch(src, /useVintem/, 'VintemEmpty nao pode consultar o provedor')
  assert.doesNotMatch(src, /<button|onTap|onClick|tabIndex|speak\(/, 'VintemEmpty nao recebe toque nem fala')
  assert.match(src, /aria-hidden="true"/, 'VintemEmpty precisa ser decorativo')
})

test('escala tipografica e alvos de toque limpos nos cinco arquivos editados', () => {
  assert.deepEqual(scaleProblems(EDITED), [])
  assert.deepEqual(touchProblems(EDITED), [])
})
