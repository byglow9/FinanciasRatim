// Guarda estatica dos documentos de planejamento da Fase 5 (D-01, D-02, D-03, D-04, D-12, D-14).
// Rodar: node --test test/static/phase5-docs.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { read } from './helpers/phase3-1.js'

// Nome antigo montado por concatenacao para este teste nao se acusar em varreduras futuras de test/.
const OLD = 'Coi' + 'nki'
const OLD_LOWER = OLD.toLowerCase()

const ROADMAP = '.planning/ROADMAP.md'
const REQUIREMENTS = '.planning/REQUIREMENTS.md'
const PROJECT = '.planning/PROJECT.md'
const CLAUDE = '.claude/CLAUDE.md'
const STACK = '.planning/research/STACK.md'
const DOCS = [ROADMAP, REQUIREMENTS, PROJECT, CLAUDE, STACK]

// Trechos de linha em que o nome antigo ainda pode aparecer (caminhos e identificadores internos).
const EXCEPTIONS = [
  `identidade-${OLD_LOWER}-pwa`,
  `${OLD_LOWER}-skunk`,
  `demo-${OLD_LOWER}`,
  `${OLD_LOWER}:open-alerts`,
]

/** Linha de IDEN-NN de REQUIREMENTS.md (so a linha do requisito, nao a tabela). */
function iden(id) {
  const m = read(REQUIREMENTS).match(new RegExp(`\\*\\*${id}\\*\\*:.*$`, 'm'))
  assert.ok(m, `REQUIREMENTS.md sem a linha de ${id}`)
  return m[0]
}

/** Secao "Phase 5" do ROADMAP, do titulo ate o proximo titulo de fase. */
function phase5() {
  const t = read(ROADMAP)
  const start = t.indexOf('### Phase 5:')
  assert.ok(start >= 0, 'ROADMAP sem a secao Phase 5')
  const next = t.indexOf('\n### Phase ', start + 1)
  return t.slice(start, next < 0 ? undefined : next)
}

test('os cinco documentos dizem Coinc e nenhum cita o endereco antigo', () => {
  for (const f of DOCS) {
    const t = read(f)
    assert.ok(t.includes('Coinc'), `${f} sem "Coinc"`)
    assert.ok(!t.toLowerCase().includes(`${OLD_LOWER}.web.app`), `${f} ainda cita o endereco antigo`)
  }
})

test('o nome antigo so aparece em caminhos, identificadores internos e na linha historica da decisao de nome', () => {
  for (const f of DOCS) {
    read(f)
      .split('\n')
      .forEach((line, i) => {
        if (!line.toLowerCase().includes(OLD_LOWER)) return
        const historica = f === PROJECT && line.includes('**Coinc**') && line.includes('substitui')
        const excecao = EXCEPTIONS.some((e) => line.toLowerCase().includes(e))
        assert.ok(historica || excecao, `${f}:${i + 1} usa o nome antigo fora da lista de excecoes`)
      })
  }
})

test('REQUIREMENTS: redirect direto, atualizacao sozinha, tema automatico e passos no onboarding', () => {
  const i2 = iden('IDEN-02')
  assert.ok(i2.includes('redireciona direto'), 'IDEN-02 sem "redireciona direto"')
  assert.ok(!i2.includes('avisa ou'), 'IDEN-02 ainda promete aviso')

  const i4 = iden('IDEN-04')
  assert.ok(i4.includes('atualiza sozinho'), 'IDEN-04 sem "atualiza sozinho"')
  assert.ok(!i4.includes('aviso para atualizar'), 'IDEN-04 ainda promete aviso para atualizar')

  assert.ok(iden('IDEN-05').includes('Automático'), 'IDEN-05 sem "Automático"')
  // Plano 05-23 (S29-09, D-20 a D-22): o onboarding passou a quatro telas; os passos ficam na ultima.
  assert.ok(iden('IDEN-03').includes('última tela'), 'IDEN-03 sem "última tela"')
  assert.ok(!iden('IDEN-03').includes('terceira tela'), 'IDEN-03 ainda diz "terceira tela"')
  assert.ok(iden('IDEN-08').includes('onboarding curto'), 'IDEN-08 sem "onboarding curto"')
})

test('ROADMAP Phase 5: sem pesquisa de nome como pre-requisito, ID ocupado pergunta ao dono, 302 antes de 301', () => {
  const s = phase5()
  assert.ok(!/pesquisar o nome/i.test(s), 'a Phase 5 ainda manda pesquisar o nome')
  assert.ok(/dispensada/.test(s), 'a Phase 5 nao registra a dispensa da pesquisa (D-02)')
  assert.ok(/parar e perguntar/.test(s), 'a Phase 5 sem "parar e perguntar" para ID ocupado (D-03)')
  const i302 = s.indexOf('302')
  const i301 = s.indexOf('301')
  assert.ok(i302 >= 0 && i301 >= 0 && i302 < i301, 'ordem de producao sem 302 antes de 301')
})

test('ROADMAP Phase 5: criterios 1 e 3 sem aviso, com redirect direto e atualizacao sozinha', () => {
  const s = phase5()
  const c1 = s.match(/^\s*1\. .*$/m)
  const c3 = s.match(/^\s*3\. .*$/m)
  assert.ok(c1 && c3, 'criterios 1 e 3 nao encontrados')
  assert.ok(c1[0].includes('redireciona direto'), 'criterio 1 sem "redireciona direto"')
  assert.ok(!c1[0].includes('avisa ou'), 'criterio 1 ainda promete aviso no site antigo')
  assert.ok(c3[0].includes('atualiza sozinho'), 'criterio 3 sem "atualiza sozinho"')
  assert.ok(!c3[0].includes('aviso para atualizar'), 'criterio 3 ainda promete aviso para atualizar')
})

test('ROADMAP Phase 5: o bloco Plans lista 05-01 ate 05-21 e tambem 05-23', () => {
  const s = phase5()
  // Plano 05-23: o plano do onboarding do sketch 029 entra no bloco Plans.
  for (const n of [...Array.from({ length: 21 }, (_, i) => i + 1), 23]) {
    const id = `05-${String(n).padStart(2, '0')}-PLAN.md`
    assert.ok(s.includes(id), `bloco Plans sem ${id}`)
  }
})
