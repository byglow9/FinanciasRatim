// Suite da linha do Vintem em "Limites do mes" na Home (D-16, UI-SPEC S3): Vintem de 48 px e balao curto
// sobre a categoria mais critica. So dados ficticios da semente.
export const name = 'limits'
export const route = '/'

const SECTION = `document.querySelector('section#lm')`
const ROW_BUTTON = `${SECTION}?.querySelector('button[aria-label^="Vintém"]')`
const ROW_BALLOON = `${SECTION}?.querySelector('button[aria-label="Dispensar fala do Vintém"]')`
const LIVE = `document.querySelector('p.sr-only[role="status"]')`

export async function run({ page, check, navigate, sleep }) {
  await navigate(route, `${ROW_BUTTON}`)

  const row = await page.evaluate(`(() => {
    const b = ${ROW_BUTTON}
    if (!b) return null
    const r = b.getBoundingClientRect()
    const balloon = ${ROW_BALLOON}
    const text = balloon?.querySelector('span')?.textContent ?? ''
    return { width: r.width, height: r.height, hasBalloon: !!balloon, text }
  })()`)
  check('linha-existe-no-cabecalho-de-limites', row !== null, { row })
  if (row === null) return
  check('vintem-da-linha-mede-48-por-48', Math.abs(row.width - 48) <= 0.5 && Math.abs(row.height - 48) <= 0.5, {
    width: row.width,
    height: row.height,
  })
  check('balao-tem-texto-curto-e-sem-chaves', row.hasBalloon && row.text.length > 0 && row.text.length <= 80 && !/[{}]/.test(row.text), {
    length: row.text.length,
    text: row.text,
  })

  // A linha vem antes da primeira linha de categoria (entre o cabecalho e a lista).
  const order = await page.evaluate(`(() => {
    const sec = ${SECTION}
    const b = ${ROW_BUTTON}
    const list = sec?.querySelector('ul')
    if (!sec || !b || !list) return null
    return !!(b.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING)
  })()`)
  check('linha-vem-antes-da-lista', order === true, { order })

  const scroll = await page.evaluate(
    `({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth })`,
  )
  check('sem-rolagem-horizontal', scroll.scrollWidth <= scroll.clientWidth, scroll)

  // Tocar no Vintem da linha troca a fala em ate 2 s, nao gira de lado e nao toca a regiao viva.
  const before = row.text
  const sampled = await page.evaluate(`new Promise((resolve) => {
    const btn = ${ROW_BUTTON}
    const side = btn.querySelector('g[id$="-side"]')
    let profile = false
    let changed = null
    let live = ''
    btn.click()
    const t0 = performance.now()
    const id = setInterval(() => {
      if (side && getComputedStyle(side).display !== 'none') profile = true
      const text = ${ROW_BALLOON}?.querySelector('span')?.textContent ?? ''
      if (changed === null && text !== '' && text !== ${JSON.stringify(before)}) changed = performance.now() - t0
      live += ${LIVE}?.textContent ?? ''
      if (performance.now() - t0 > 1800) {
        clearInterval(id)
        resolve({ profile, changed, live })
      }
    }, 40)
  })`)
  check('tocar-no-vintem-troca-a-fala-em-ate-2s', sampled.changed !== null && sampled.changed < 2000, { changed: sampled.changed })
  check('tocar-no-vintem-da-linha-nao-gira', sampled.profile === false, { profile: sampled.profile })
  check('fala-da-linha-nao-vai-a-regiao-viva', sampled.live === '', { live: sampled.live })

  // Tocar no balao dispensa e a linha some.
  const dismissed = await page.evaluate(`(() => {
    const b = ${ROW_BALLOON}
    if (!b) return false
    b.click()
    return true
  })()`)
  await sleep(300)
  const gone = await page.evaluate(`!${ROW_BUTTON} && !${ROW_BALLOON}`)
  check('tocar-no-balao-remove-a-linha', dismissed && gone, { dismissed, gone })
}
