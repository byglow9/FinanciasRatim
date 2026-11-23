// Suite do cartao de tom do Vintem em Configuracoes (MASC-05, UI-SPEC S6): radiogroup de tres tons, padrao
// sem filtro, previa "Exemplo" que acompanha a selecao e teclado. So dados ficticios da semente.
export const name = 'settings'
export const route = '/configuracoes#vintem'

const CARD = `document.querySelector('section#vintem')`
const GROUP = `${CARD}?.querySelector('[role="radiogroup"][aria-label="Tom do Vintém"]')`
const PREVIEW = `${CARD}?.querySelector('button[aria-label="Dispensar fala do Vintém"]')?.querySelector('span')?.textContent ?? ''`

const EXAMPLES = {
  suave: 'Está perto do limite de Lazer, vale segurar.',
  direto: 'Lazer chegou a 82% do limite. Restam R$ 90.',
  'sem-filtro': 'Quarto delivery da semana, caralho. Seu fogão é enfeite?',
}

async function pressKey(page, key, vk) {
  const base = { key, code: key, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base })
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
}

export async function run({ page, check, navigate, sleep }) {
  await navigate(route, `${GROUP}`)

  const radios = await page.evaluate(`(() => {
    const g = ${GROUP}
    if (!g) return null
    return [...g.querySelectorAll('[role="radio"]')].map((r) => ({
      name: r.querySelector('span.text-base')?.textContent ?? '',
      checked: r.getAttribute('aria-checked') === 'true',
      chip: /padrão/.test(r.textContent ?? ''),
      tab: r.tabIndex,
    }))
  })()`)
  check('radiogroup-tem-3-radios', Array.isArray(radios) && radios.length === 3, { radios })
  if (!Array.isArray(radios) || radios.length !== 3) return

  const semFiltro = radios.find((r) => r.name === 'Sem filtro')
  check('sem-campo-salvo-sem-filtro-esta-marcado', semFiltro?.checked === true && radios.filter((r) => r.checked).length === 1, { radios })
  check('chip-padrao-na-linha-sem-filtro', semFiltro?.chip === true && radios.filter((r) => r.chip).length === 1, { radios })
  check('so-a-opcao-marcada-e-tabulavel', radios.every((r) => (r.checked ? r.tab === 0 : r.tab === -1)), { radios })

  const preview = await page.evaluate(PREVIEW)
  check('previa-mostra-o-exemplo-do-sem-filtro', preview === EXAMPLES['sem-filtro'], { preview })
  check('rotulo-exemplo-presente', await page.evaluate(`/(^|\\n)Exemplo(\\n|$)/.test(${CARD}?.innerText ?? '')`), {})

  const scroll = await page.evaluate(
    `({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth })`,
  )
  check('sem-rolagem-horizontal', scroll.scrollWidth <= scroll.clientWidth, scroll)

  // Escolher "Suave": a previa troca, o aviso aparece e a selecao fica marcada.
  await page.evaluate(`(() => {
    const r = [...${GROUP}.querySelectorAll('[role="radio"]')].find((el) => el.textContent.includes('Suave'))
    r.click()
  })()`)
  await sleep(600)
  const afterSuave = await page.evaluate(`({
    preview: ${PREVIEW},
    toast: document.body.innerText.includes('Tom do Vintém: Suave'),
    checked: [...${GROUP}.querySelectorAll('[role="radio"][aria-checked="true"]')].map((r) => r.textContent),
  })`)
  check('escolher-suave-troca-o-texto-da-previa', afterSuave.preview === EXAMPLES.suave, { preview: afterSuave.preview })
  check('escolher-suave-mostra-o-aviso', afterSuave.toast === true, { toast: afterSuave.toast })
  check('escolher-suave-marca-so-suave', afterSuave.checked.length === 1 && afterSuave.checked[0].includes('Suave'), { checked: afterSuave.checked })

  // Teclado: seta para baixo vai a "Direto", End vai a "Sem filtro", Home volta a "Suave".
  await page.evaluate(`[...${GROUP}.querySelectorAll('[role="radio"]')].find((el) => el.textContent.includes('Suave')).focus()`)
  const selected = () =>
    page.evaluate(`[...${GROUP}.querySelectorAll('[role="radio"][aria-checked="true"]')].map((r) => r.querySelector('span.text-base')?.textContent)`)
  await pressKey(page, 'ArrowDown', 40)
  await sleep(600)
  const afterDown = await selected()
  check('seta-para-baixo-move-para-direto', afterDown.length === 1 && afterDown[0] === 'Direto', { afterDown })
  check('previa-acompanha-o-teclado', (await page.evaluate(PREVIEW)) === EXAMPLES.direto, {})
  await pressKey(page, 'End', 35)
  await sleep(600)
  const afterEnd = await selected()
  check('end-move-para-sem-filtro', afterEnd.length === 1 && afterEnd[0] === 'Sem filtro', { afterEnd })
  await pressKey(page, 'Home', 36)
  await sleep(600)
  const afterHome = await selected()
  check('home-move-para-suave', afterHome.length === 1 && afterHome[0] === 'Suave', { afterHome })
}
