// Suite da Home: o Vintem no arco (slot de 84 px, estado de fundo, sem rolagem horizontal).
export const name = 'home'
export const route = '/'

const STATES = ['neutro', 'feliz', 'triste', 'bravo', 'sonolento', 'surpreso', 'atento']
const SLOT = `document.querySelector('button[aria-label^="Vintém"]')`

export async function run({ page, check, navigate }) {
  await navigate(route, `${SLOT}`)

  const slot = await page.evaluate(`(() => {
    const b = ${SLOT}
    if (!b) return null
    const r = b.getBoundingClientRect()
    const svg = b.querySelector('svg')
    return {
      width: r.width,
      height: r.height,
      label: b.getAttribute('aria-label'),
      state: b.getAttribute('data-vintem-state'),
      svgHidden: svg?.getAttribute('aria-hidden') ?? null,
    }
  })()`)
  check('slot-existe-no-arco', slot !== null, { slot })
  if (slot === null) return
  check('slot-mede-84-por-84', Math.abs(slot.width - 84) <= 0.5 && Math.abs(slot.height - 84) <= 0.5, {
    width: slot.width,
    height: slot.height,
  })
  check('slot-tem-nome-acessivel', slot.label === 'Vintém, toque para ouvir uma fala', { label: slot.label })
  check('arte-decorativa-aria-hidden', slot.svgHidden === 'true', { svgHidden: slot.svgHidden })
  check('estado-e-um-dos-sete', STATES.includes(slot.state), { state: slot.state })

  const scroll = await page.evaluate(
    `({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth })`,
  )
  check('sem-rolagem-horizontal', scroll.scrollWidth <= scroll.clientWidth, scroll)
}
