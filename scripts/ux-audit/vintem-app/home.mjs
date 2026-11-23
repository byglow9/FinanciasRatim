// Suite da Home: o Vintem no arco (slot de 84 px, estado de fundo, sem rolagem horizontal).
export const name = 'home'
export const route = '/'

const STATES = ['neutro', 'feliz', 'triste', 'bravo', 'sonolento', 'surpreso', 'atento']
const SLOT = `document.querySelector('button[aria-label^="Vintém"]')`

export async function run({ page, check, navigate, sleep }) {
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

  // Fala de entrada: aparece sozinha, uma por visita, sem texto de encaixe aberto.
  const BALLOON = `document.querySelector('[data-situation]')`
  const LIVE = `document.querySelector('p.sr-only[role="status"]')`
  let entry = null
  for (let i = 0; i < 20 && entry === null; i++) {
    entry = await page.evaluate(`(() => {
      const wrap = ${BALLOON}
      if (!wrap) return null
      return {
        situation: wrap.getAttribute('data-situation'),
        phrase: wrap.getAttribute('data-phrase'),
        text: wrap.querySelector('button span')?.textContent ?? '',
      }
    })()`)
    if (entry === null) await sleep(150)
  }
  check('fala-de-entrada-aparece-em-ate-3s', entry !== null, { entry })
  if (entry !== null) {
    check('fala-de-entrada-tem-situacao-e-frase', Boolean(entry.situation) && Boolean(entry.phrase), entry)
    check('fala-de-entrada-sem-chaves-abertas', entry.text.length > 0 && !/[{}]/.test(entry.text), { text: entry.text })
  }

  // Regiao viva: sempre montada, vazia depois da fala de entrada (ela nunca e anunciada).
  const live = await page.evaluate(`(() => {
    const el = ${LIVE}
    if (!el) return null
    return { role: el.getAttribute('role'), polite: el.getAttribute('aria-live'), text: el.textContent }
  })()`)
  check('regiao-viva-existe-com-role-e-aria-live', live !== null && live.role === 'status' && live.polite === 'polite', { live })
  check('regiao-viva-vazia-depois-da-entrada', live !== null && live.text === '', { live })

  // Tocar no balao o remove (sem temporizador: antes disso ele fica).
  if (entry !== null) {
    await sleep(2500)
    const stays = await page.evaluate(`!!${BALLOON}`)
    check('balao-fica-sem-temporizador-de-sumico', stays, {})
    const dismissed = await page.evaluate(`(() => {
      const b = document.querySelector('button[aria-label="Dispensar fala do Vintém"]')
      if (!b) return false
      b.click()
      return true
    })()`)
    await sleep(300)
    const gone = await page.evaluate(`!${BALLOON}`)
    check('tocar-no-balao-remove', dismissed && gone, { dismissed, gone })
  }
}
