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

  await outsideHome({ page, check, navigate, sleep })
}

const TOAST_BOX = `document.querySelector('div[role="status"][aria-live="polite"]')`

/**
 * Fora da Home (Transacoes) o toast de sucesso entra primeiro e, em seguida na fila, o toast do Vintem:
 * superficie clara (nunca o fundo de acao), botao de dispensar de 44 px e Esc fecha.
 */
async function outsideHome({ page, check, navigate, sleep }) {
  await navigate('/transacoes', `${FAB}`)
  const done = await launchSpend({ page, sleep, categoryName: 'Lazer', digits: ['5', '00'] })
  check('gasto-salvo-fora-da-home', done.ok, done)
  if (!done.ok) return

  const seq = await page.evaluate(`new Promise((resolve) => {
    const out = { successAt: null, vintemAt: null, successBg: null, vintemBg: null, closeW: 0, closeH: 0, text: '', hasClamp: false }
    const t0 = performance.now()
    const id = setInterval(() => {
      const box = ${TOAST_BOX}
      const ok = box?.querySelector('button[aria-label="Fechar aviso"]')
      const close = box?.querySelector('button[aria-label="Dispensar fala do Vint\u00e9m"]')
      if (ok && out.successAt === null) {
        out.successAt = performance.now() - t0
        out.successBg = getComputedStyle(ok.parentElement).backgroundColor
      }
      if (close && out.vintemAt === null) {
        out.vintemAt = performance.now() - t0
        const surface = close.parentElement
        out.vintemBg = getComputedStyle(surface).backgroundColor
        const r = close.getBoundingClientRect()
        out.closeW = r.width
        out.closeH = r.height
        const p = surface.querySelector('p')
        out.text = p?.textContent ?? ''
        out.hasClamp = [...surface.querySelectorAll('*')].some((el) => /line-clamp/.test(el.className?.baseVal ?? el.className ?? ''))
      }
      if (out.vintemAt !== null || performance.now() - t0 > 9000) {
        clearInterval(id)
        resolve(out)
      }
    }, 40)
  })`)
  check('toast-de-sucesso-vem-primeiro', seq.successAt !== null && seq.vintemAt !== null && seq.successAt < seq.vintemAt, seq)
  check('toast-do-vintem-aparece-em-ate-8s', seq.vintemAt !== null && seq.vintemAt < 8000, { vintemAt: seq.vintemAt })
  check(
    'toast-do-vintem-tem-fundo-claro-e-nao-o-de-acao',
    seq.vintemBg !== null && seq.vintemBg !== seq.successBg && seq.vintemBg !== 'rgba(0, 0, 0, 0)',
    { vintemBg: seq.vintemBg, successBg: seq.successBg },
  )
  check('botao-de-dispensar-tem-pelo-menos-44-por-44', seq.closeW >= 43.5 && seq.closeH >= 43.5, { w: seq.closeW, h: seq.closeH })
  check('fala-do-toast-sem-chaves-e-ate-110-caracteres', seq.text.length > 0 && seq.text.length <= 110 && !/[{}]/.test(seq.text), {
    length: seq.text.length,
    text: seq.text,
  })
  check('fala-do-toast-sem-line-clamp', seq.hasClamp === false)

  // Esc fecha o toast do Vintem.
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  const closed = await waitFor(page, sleep, `${TOAST_BOX}?.querySelector('button[aria-label="Dispensar fala do Vint\u00e9m"]') == null`, 1500)
  check('esc-fecha-o-toast-do-vintem', closed)
}
