// Suite dos estados vazios e de erro com o Vintem calado (D-16, UI-SPEC S5, P-02): na semente vazia
// cada tela mostra o Vintem neutro acima do texto ja contratado, sem passar de dois Vintens animados
// por tela, sem botao, sem foco e sem rolagem horizontal a 360 px. So dados ficticios da semente.
export const name = 'empties'
export const route = '/'
export const seed = 'empty'

/** Vintens com area visivel na tela (o hero e as pecas de estado vazio). */
const VISIBLE_VINTENS = `[...document.querySelectorAll('svg.vt')].filter((s) => {
  const r = s.getBoundingClientRect()
  return r.width > 0 && r.height > 0 && getComputedStyle(s).visibility !== 'hidden'
})`

/** Topo (y absoluto) do primeiro elemento cujo texto contem `text`, ou null. */
function topOfText(text) {
  return `(() => {
    const el = [...document.querySelectorAll('p, h2, h3')].find((n) => n.textContent.trim().startsWith(${JSON.stringify(text)}))
    return el ? el.getBoundingClientRect().top + window.scrollY : null
  })()`
}

/** Pecas [data-pose] da pagina: pose, topo, foco e botoes internos. */
const POSES = `[...document.querySelectorAll('[data-pose]')].map((el) => ({
  pose: el.getAttribute('data-pose'),
  top: el.getBoundingClientRect().top + window.scrollY,
  hidden: el.getAttribute('aria-hidden') === 'true',
  inner: el.querySelectorAll('button, a, input, [tabindex], [role="button"]').length,
  focusable: el.tabIndex >= 0,
}))`

/** Confere o que vale para toda peca de estado vazio: calada, decorativa e nao focavel. */
export function checkPieces(check, label, pieces, expectedPoses) {
  check(`${label}-poses`, JSON.stringify(pieces.map((p) => p.pose)) === JSON.stringify(expectedPoses), {
    poses: pieces.map((p) => p.pose),
    expectedPoses,
  })
  check(
    `${label}-calado-decorativo-e-sem-foco`,
    pieces.every((p) => p.hidden && p.inner === 0 && !p.focusable),
    { pieces },
  )
}

/** Navega ate a rota e devolve { pieces, vintens, scroll } da tela. */
export async function snapshot({ page, navigate, route, ready }) {
  await navigate(route, ready)
  return page.evaluate(`({
    pieces: ${POSES},
    vintens: ${VISIBLE_VINTENS}.length,
    scroll: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth },
  })`)
}

export async function run({ page, check, navigate }) {
  // Home sem renda: o hero (neutro, sem segundo Vintem) mais o vazio de "Nenhum limite definido".
  const home = await snapshot({
    page,
    navigate,
    route: '/',
    ready: `document.body.innerText.includes('Nenhum limite definido')`,
  })
  check('home-no-maximo-dois-vintens', home.vintens <= 2, { vintens: home.vintens })
  checkPieces(check, 'home', home.pieces, ['neutro'])

  const limitTop = await page.evaluate(topOfText('Nenhum limite definido'))
  const pieceTop = home.pieces[0]?.top ?? null
  check('home-vintem-acima-do-texto-de-limites', limitTop !== null && pieceTop !== null && pieceTop < limitTop, {
    pieceTop,
    limitTop,
  })
  const noIncome = await page.evaluate(`document.body.innerText.includes('Falta saber quanto entra')`)
  check('home-hero-sem-renda-mantem-o-texto', noIncome, { noIncome })
  check('home-sem-rolagem-horizontal', home.scroll.scrollWidth <= home.scroll.clientWidth, home.scroll)
}
