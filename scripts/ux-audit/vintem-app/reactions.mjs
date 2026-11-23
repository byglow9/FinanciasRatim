// Suite das reacoes do Vintem a um lancamento (D-05, D-09, D-16, UI-SPEC S2): na Home a fala sai no
// balao e na regiao viva. So dados ficticios da semente (categoria Lazer do perfil "ele": limite de
// R$ 300,00 com R$ 56,00 gastos, bem abaixo de 75%).
export const name = 'reactions'
export const route = '/'

const SITUATIONS = ['lancamento-ok', 'limite-atento', 'limite-perto', 'limite-estourou', 'gasto-grande']
const BALLOON = `document.querySelector('[data-situation]')`
const LIVE = `document.querySelector('p.sr-only[role="status"]')`
const FAB = `document.querySelector('button[aria-label="Novo lançamento"]')`
const DIALOG = `document.querySelector('[role="dialog"]')`

/** Clica no primeiro botao do dialogo cujo texto e exatamente `label` (ou comeca por ele). */
function clickByText(label, selector = 'button') {
  return `(() => {
    const root = ${DIALOG} ?? document
    const el = [...root.querySelectorAll(${JSON.stringify(selector)})].find((b) => b.textContent.trim().startsWith(${JSON.stringify(label)}))
    if (!el) return false
    el.click()
    return true
  })()`
}

/** Abre o sheet, escolhe a categoria, digita o valor pelo teclado de tela e salva. */
export async function launchSpend({ page, sleep, categoryName, digits }) {
  await page.evaluate(`${FAB}?.click()`)
  const opened = await waitFor(page, sleep, `!!${DIALOG} && !!${DIALOG}.querySelector('[role="radio"]')`, 5000)
  if (!opened) return { ok: false, step: 'abrir' }
  await sleep(300)
  const picked = await page.evaluate(clickByText(categoryName, 'button[role="radio"]'))
  if (!picked) return { ok: false, step: 'categoria' }
  for (const d of digits) {
    const typed = await page.evaluate(clickByText(d))
    if (!typed) return { ok: false, step: `tecla ${d}` }
  }
  await sleep(150)
  const saved = await page.evaluate(clickByText('Lançar gasto'))
  return { ok: saved, step: 'salvar' }
}

/** Espera a expressao ficar verdadeira por ate `ms`. */
export async function waitFor(page, sleep, expr, ms) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    if (await page.evaluate(`!!(${expr})`)) return true
    await sleep(100)
  }
  return false
}

export async function run({ page, check, navigate, sleep }) {
  await navigate(route, `${BALLOON}`)

  const entry = await page.evaluate(`({ situation: ${BALLOON}?.getAttribute('data-situation') ?? null, live: ${LIVE}?.textContent ?? '' })`)
  check('fala-de-entrada-nao-e-anunciada', entry.live === '', { live: entry.live })

  // Salva um gasto pequeno em Lazer (limite abaixo de 75%): reacao curta e fala de lancamento-ok.
  const done = await launchSpend({ page, sleep, categoryName: 'Lazer', digits: ['5', '00'] })
  check('gasto-salvo-pelo-sheet', done.ok, done)
  if (!done.ok) return

  const reacted = await waitFor(
    page,
    sleep,
    `${LIVE}?.textContent.length > 0 && ${BALLOON}?.getAttribute('data-situation') === 'lancamento-ok'`,
    3000,
  )
  const seen = await page.evaluate(`({
    situation: ${BALLOON}?.getAttribute('data-situation') ?? null,
    text: ${BALLOON}?.textContent ?? '',
    live: ${LIVE}?.textContent ?? '',
  })`)
  check('balao-mostra-a-situacao-do-lancamento', reacted && SITUATIONS.includes(seen.situation), seen)
  check('fala-do-balao-sem-chaves', seen.text.length > 0 && !/[{}]/.test(seen.text), { text: seen.text })
  check('regiao-viva-recebeu-a-fala', seen.live.length > 0 && !/[{}]/.test(seen.live), { live: seen.live })
}
