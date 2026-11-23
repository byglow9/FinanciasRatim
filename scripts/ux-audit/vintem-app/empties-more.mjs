// Suite dos estados vazios e de erro com o Vintem calado, parte 2 (D-16, UI-SPEC S5, P-02): sino sem
// avisos (sonolento, so fora da Home) e Casal sem lancamentos (neutro). Na semente vazia, sem passar de
// dois Vintens animados por tela, sem foco e sem rolagem horizontal a 360 px. So dados ficticios da semente.
import { checkPieces, snapshot } from './empties.mjs'

export const name = 'empties-more'
export const route = '/transacoes'
export const seed = 'empty'

/** Vintens com area visivel na tela (peca de vazio, painel do sino e hero). */
const VISIBLE_VINTENS = `[...document.querySelectorAll('svg.vt')].filter((s) => {
  const r = s.getBoundingClientRect()
  return r.width > 0 && r.height > 0 && getComputedStyle(s).visibility !== 'hidden'
}).length`

/** Topo (y absoluto) do primeiro elemento cujo texto comeca com `text`, ou null. */
function topOfText(text) {
  return `(() => {
    const el = [...document.querySelectorAll('p, h2, h3')].find((n) => n.textContent.trim().startsWith(${JSON.stringify(text)}))
    return el ? el.getBoundingClientRect().top + window.scrollY : null
  })()`
}

/** Pecas [data-pose] dentro do painel do sino (role=dialog "Avisos"). */
const BELL_POSES = `[...document.querySelectorAll('[role="dialog"][aria-label="Avisos"] [data-pose]')].map((el) => ({
  pose: el.getAttribute('data-pose'),
  top: el.getBoundingClientRect().top + window.scrollY,
  hidden: el.getAttribute('aria-hidden') === 'true',
  inner: el.querySelectorAll('button, a, input, [tabindex], [role="button"]').length,
  focusable: el.tabIndex >= 0,
}))`

/** Abre o painel do sino pelo botao da barra superior e espera o titulo do vazio. */
async function openBell({ page, sleep }) {
  await page.evaluate(`document.querySelector('button[aria-label="Avisos"]').click()`)
  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    if (await page.evaluate(`document.body.innerText.includes('Sem avisos por enquanto')`)) break
    await sleep(100)
  }
  await sleep(300)
}

export async function run(ctx) {
  const { page, check, navigate } = ctx

  // Fora da Home: o sino mostra o sonolento acima do texto, e a tela soma no maximo dois Vintens.
  await navigate('/transacoes', `document.body.innerText.includes('Nenhuma transação neste ciclo')`)
  await openBell(ctx)
  const bell = await page.evaluate(BELL_POSES)
  checkPieces(check, 'sino', bell, ['sonolento'])
  const textTop = await page.evaluate(topOfText('Sem avisos por enquanto'))
  check('sino-vintem-acima-do-texto', textTop !== null && bell[0]?.top < textTop, { pieceTop: bell[0]?.top ?? null, textTop })
  const bellText = await page.evaluate(`document.body.innerText.includes('Você será avisado ao chegar a 80%')`)
  check('sino-mantem-os-textos', bellText, { bellText })
  const total = await page.evaluate(VISIBLE_VINTENS)
  check('sino-no-maximo-dois-vintens', total <= 2, { vintens: total })
  const scrollBell = await page.evaluate(
    `({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth })`,
  )
  check('sino-sem-rolagem-horizontal', scrollBell.scrollWidth <= scrollBell.clientWidth, scrollBell)

  // Na Home o painel vazio nao monta Vintem (o hero e o vazio de limites ja somam dois).
  await navigate('/', `document.body.innerText.includes('Nenhum limite definido')`)
  await openBell(ctx)
  const homeBell = await page.evaluate(BELL_POSES)
  check('home-sino-sem-vintem', homeBell.length === 0, { pieces: homeBell })
  const homeText = await page.evaluate(`document.body.innerText.includes('Sem avisos por enquanto')`)
  check('home-sino-mantem-o-texto', homeText, { homeText })
  const homeTotal = await page.evaluate(VISIBLE_VINTENS)
  check('home-no-maximo-dois-vintens', homeTotal <= 2, { vintens: homeTotal })

  await runCouple(ctx)
}

/** Casal sem lancamentos: uma peca neutra acima do texto, nenhum outro Vintem e sem rolagem lateral. */
export async function runCouple({ page, check, navigate }) {
  const text = 'Sem lançamentos neste período'
  const snap = await snapshot({
    page,
    navigate,
    route: '/casal',
    ready: `document.body.innerText.includes(${JSON.stringify(text)})`,
  })
  checkPieces(check, 'casal', snap.pieces, ['neutro'])
  check('casal-nenhum-vintem-alem-do-vazio', snap.vintens === 1, { vintens: snap.vintens })
  const textTop = await page.evaluate(topOfText(text))
  const pieceTop = snap.pieces[0]?.top ?? null
  check('casal-vintem-acima-do-texto', textTop !== null && pieceTop !== null && pieceTop < textTop, { pieceTop, textTop })
  const legend = await page.evaluate(`document.body.innerText.includes('a comparação aparece aqui')`)
  check('casal-mantem-a-legenda', legend, { legend })
  check('casal-sem-rolagem-horizontal', snap.scroll.scrollWidth <= snap.scroll.clientWidth, snap.scroll)
}
