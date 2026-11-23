# Fase 5: Identidade Coinc, PWA e onboarding - Mapa de padrões

**Mapeado em:** 2026-11-23
**Arquivos analisados:** 52 (novos e modificados, fora documentos de planejamento)
**Análogos encontrados:** 45 / 52 (7 sem análogo no código; usar RESEARCH.md)

Todos os caminhos de análogo abaixo foram conferidos como **rastreados pelo git** (`git ls-files`). Nenhum é espelho gitignorado. O mapa foi montado a partir de `05-CONTEXT.md`, `05-RESEARCH.md` e `05-UI-SPEC.md`. O nome do app é **Coinc** (não Coinki) e o site é `coinc-financias.web.app`.

## Classificação dos arquivos

### Novos

| Arquivo | Papel | Fluxo de dados | Análogo mais próximo | Qualidade |
|---------|-------|----------------|----------------------|-----------|
| `src/sw.ts` | service worker | event-driven | nenhum (RESEARCH Padrão 2) | sem análogo |
| `tsconfig.sw.json` | config | build | `tsconfig.app.json` | role-match |
| `src/lib/pwa/registerPwa.ts` | utilitário | event-driven | `src/contexts/VintemContext.tsx` (storage em try/catch) + `src/hooks/useReducedMotion.ts` (assinatura de `matchMedia`) | parcial |
| `src/lib/pwa/isBusy.ts` | utilitário | transform (consulta ao DOM) | `src/components/ui/sheet.tsx` (`FOCUSABLE`, `role="dialog"`) | parcial |
| `shared/core/pwaUpdate.js` + `.test.js` | utilitário puro | transform | `shared/core/collapse.js` + `collapse.test.js` | exato |
| `shared/core/theme.js` + `.test.js` | utilitário puro | transform | `shared/core/collapse.js` + `collapse.test.js` | exato |
| `src/hooks/useTheme.ts` | hook | event-driven | `src/hooks/useReducedMotion.ts` | exato |
| `src/hooks/usePwaInstall.ts` | hook | event-driven | `src/hooks/useReducedMotion.ts` | role-match |
| `src/components/onboarding/Onboarding.tsx` | componente | request-response (UI com estado local) | `src/components/auth/LoginForm.tsx` (tela cheia, `min-h-dvh`) + `src/components/ui/sheet.tsx` (foco preso, Esc, modo replay) | role-match |
| `src/components/onboarding/InstallSteps.tsx` | componente | request-response | `src/components/ui/segmented-control.tsx` + `src/components/ui/notice.tsx` | role-match |
| `src/components/brand/CoincMark.tsx` | componente | estático | `src/components/vintem/VintemEmpty.tsx` (wrapper pequeno) | role-match |
| `src/components/brand/BootError.tsx` | componente | estático | `src/pages/SettingsPage.tsx` (ramo `settingsStatus === 'error'`) | exato |
| `src/components/settings/ThemeGroup.tsx` | componente | CRUD local | `src/components/settings/VintemToneCard.tsx` (radiogroup) | exato |
| `src/components/settings/AppCard.tsx` | componente | request-response | `src/components/settings/VintemToneCard.tsx` + `SettingsCard.tsx` | exato |
| `public/icons/*.png`, `icon.svg`, `public/favicon.svg`, `public/favicon.ico` | ativo estático | file-I/O | `public/piggy.svg` (apenas local) | parcial |
| `pwa-assets.config.ts`, `pwa-assets.maskable.config.ts` | config | batch | `vite.config.ts` | role-match |
| `hosting-legacy/index.html` | config | estático | nenhum | sem análogo |
| `.planning/sketches/021-icone-app/index.html` | sketch com autoteste | transform | `.planning/sketches/020-vintem-verde/index.html` (`?test`, `FALHAS`) | exato |
| `scripts/ux-audit/theme.mjs` | script de auditoria | batch (CDP) | `scripts/ux-audit/audit.mjs` + `scripts/ux-audit/cdp.mjs` | exato |
| `test/static/phase5-identity.test.js` | teste | estático | `test/static/phase4-settings.test.js` | exato |
| `test/static/phase5-hosting.test.js` | teste | estático | `test/static/firestore-config.test.js` | exato |
| `test/static/phase5-manifest.test.js` | teste | estático sobre `dist/` | `test/static/firestore-config.test.js` | role-match |
| `test/static/phase5-sw.test.js` | teste | estático | `test/static/phase4-selftest.test.js` | role-match |
| `test/static/phase5-theme.test.js` | teste | estático + `node:vm` | `test/static/phase3-gaps.test.js` | role-match |
| `test/static/phase5-onboarding.test.js` | teste | estático | `test/static/phase3-1-login.test.js` | exato |

### Modificados

| Arquivo | Papel | Fluxo de dados | Análogo/Referência | Qualidade |
|---------|-------|----------------|--------------------|-----------|
| `index.html` | config | estático | ele mesmo + bloco `<head>` do RESEARCH | próprio |
| `vite.config.ts` | config | build | ele mesmo + RESEARCH Padrão 1 | próprio |
| `firebase.json` | config | estático | ele mesmo + RESEARCH Padrão 5 | próprio |
| `.firebaserc` | config | estático | ele mesmo (gerado por `target:apply`) | próprio |
| `package.json`, `tsconfig.json`, `tsconfig.app.json` | config | build | eles mesmos | próprio |
| `src/main.tsx` | entrada | event-driven | ele mesmo | próprio |
| `src/index.css` | config de tema | estático | ele mesmo (blocos `@theme inline`, `:root`, `.dark`, `.vt`) | próprio |
| `src/components/auth/ProtectedRoute.tsx` | guarda | request-response | ele mesmo | próprio |
| `src/components/auth/LoginForm.tsx` | componente | request-response | ele mesmo | próprio |
| `src/components/settings/AppearanceCard.tsx` | componente | CRUD | `VintemToneCard.tsx` | próprio |
| `src/pages/SettingsPage.tsx` | página | request-response | ele mesmo | próprio |
| `test/static/helpers/palette.js`, `palette-contrast.test.js`, `phase3-gaps.test.js` | teste | estático | eles mesmos (quebra intencional) | próprio |
| ROADMAP, REQUIREMENTS, PROJECT.md, `.claude/CLAUDE.md` | documentos | estático | textos atuais | próprio |
| `public/piggy.svg`, `public/vite.svg` | remoção | n/a | n/a | n/a |

Sem alteração de código: `ALLOWED_ORIGINS` (variável do Railway; `server/src/auth.js` e `server/src/app.js` já aceitam a lista) e domínios autorizados do Auth (Console).

---

## Atribuições de padrão

### `shared/core/pwaUpdate.js` e `shared/core/theme.js` (utilitário puro, transform)

**Análogo:** `shared/core/collapse.js` e `shared/core/collapse.test.js`

Convenção do núcleo: `// @ts-check`, comentário de regra no topo, constantes nomeadas exportadas, JSDoc com tipos, **nenhum import de pacote** (`shared/core/purity.test.js` descobre todo `.js` da pasta e falha se importar pacote ou usar relógio), função pura que devolve a mesma referência quando nada muda.

**Cabeçalho e tipos** (`collapse.js` linhas 1-30):
```js
// @ts-check
// Recolhimento do mes do Calendario ao rolar a agenda (D-08). Redutor puro: ...

/** Rolagem (px) acima da qual o mes recolhe. */
export const COLLAPSE_AT = 24

/**
 * @typedef {{ collapsed: boolean, lock: boolean }} CollapseState
 */
```

**Guarda de entrada inválida** (`collapse.js` linhas 36-40): valor fora do tipo devolve o estado atual, nunca lança.
```js
      const top = action.top
      if (typeof top !== 'number' || !Number.isFinite(top)) return state
```

**Teste ao lado** (`collapse.test.js` linhas 1-22): `node:test` + `assert/strict`, uma constante por caso, um teste por regra, e `assert.equal(..., MESMO_OBJETO)` para a identidade.
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { collapseReducer, COLLAPSE_AT } from './collapse.js'

test('o limiar de recolhimento e 24px', () => {
  assert.equal(COLLAPSE_AT, 24)
})
```

**Aplicar a:**
- `pwaUpdate.js`: `OPEN_WINDOW_MS = 3000`, `decideUpdate({ hasWaiting, msSinceOpen, busy, hidden })` devolvendo `'ativar' | 'esperar' | 'nada'` e `decidePreloadError({ alreadyReloaded })`. O corpo pronto está em RESEARCH Padrão 3; só falta o cabeçalho `// @ts-check` e os `@typedef`. Casos de teste exigidos: sem `waiting`, `hidden`, `busy`, dentro e fora dos 3 s, e preload uma vez e depois erro.
- `theme.js`: `resolveTheme(pref, systemDark)` com conjunto fechado `auto | claro | escuro`; valor desconhecido cai em `auto` (V5 do RESEARCH). Exportar também as constantes de chave (`coinc:tema:v1`) e as cores de `theme-color` (`#0a1510`, `#f5ecdb`) para o teste do script inline comparar.
- Importados pelo TS por `@shared/core/pwaUpdate.js` (alias existe em `vite.config.ts` e `tsconfig.app.json`; `allowJs` ligado). Exemplo real: `src/components/dashboard/LimitAlertNotice.tsx` linhas 6-7 (`import { topAlert, visibleAlerts } from '@shared/core/alerts.js'`).

---

### `src/hooks/useTheme.ts` (hook, event-driven)

**Análogo:** `src/hooks/useReducedMotion.ts` (arquivo inteiro, 26 linhas)

```ts
import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches
}

/** Sem servidor nem janela: assume movimento normal. */
function getServerSnapshot(): boolean {
  return false
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
```

**Como adaptar:**
- Mesmo trio `subscribe` / `getSnapshot` / `getServerSnapshot`. A assinatura do `useTheme` assina **dois** eventos: `matchMedia('(prefers-color-scheme: dark)')` e `window` `storage`. Um listener interno do módulo (o mesmo `Set` de callbacks) notifica as trocas feitas na própria aba, porque `storage` não dispara na aba que gravou.
- `getSnapshot` precisa devolver valor **primitivo estável** (a preferência `'auto' | 'claro' | 'escuro'`), nunca objeto novo a cada chamada, para não gerar laço em `useSyncExternalStore`.
- Leitura e gravação de `localStorage` sempre em `try/catch`, caindo em `'auto'`. Padrão de storage defensivo em `src/contexts/VintemContext.tsx` linhas 106-128:
```ts
function readRecent(): Recent {
  try {
    const raw = sessionStorage.getItem(RECENT_STORAGE_KEY)
    if (!raw) return {}
    ...
  } catch { ... }
}

function writeRecent(recent: Recent): void {
  try {
    sessionStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recent))
  } catch {
    // Sem armazenamento da sessao: so deixa de lembrar as ultimas frases.
  }
}
```
- Valide o valor lido contra o conjunto fechado (`auto/claro/escuro`) antes de usar; qualquer outro texto vale `auto`.
- Aplicar efeitos (classe `dark` em `<html>`, `style.colorScheme`, `meta[name=theme-color]`) num `useEffect` ou direto na função de gravação; o primeiro desenho já foi feito pelo script inline de `index.html`.

### `src/hooks/usePwaInstall.ts` (hook, event-driven)

**Análogo:** `src/hooks/useReducedMotion.ts` (mesmo padrão `useSyncExternalStore` sobre estado de módulo)

- O evento `beforeinstallprompt` dispara cedo e uma vez (RESEARCH Armadilha 8). O **listener nasce em `src/main.tsx`** (antes do `createRoot`) e guarda o evento numa variável de módulo; o hook só lê esse armazenamento por `useSyncExternalStore`. Se o hook registrasse o listener, perderia o evento.
- `isStandalone`: `window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true`, também assinado a `change` como em `useReducedMotion`.
- `platform`: iPhone/iPad por agente de usuário, incluindo iPadOS que se anuncia como Mac com toque (`navigator.maxTouchPoints > 1`).
- O módulo ficará fora de `src/hooks` se o `main.tsx` precisar importá-lo sem puxar React (ex.: `src/lib/pwa/installPrompt.ts` com a variável e o `subscribe`, e o hook só envolve).

---

### `src/lib/pwa/registerPwa.ts` e `src/lib/pwa/isBusy.ts` (utilitário, event-driven)

**Análogos parciais:** `src/contexts/VintemContext.tsx` (storage em try/catch, ver acima), `src/components/ui/sheet.tsx` linhas 5-17 e 114-115 (marcação que o `isBusy` consulta).

`isBusy` apoia-se na marcação que `Sheet` e `Dialog` **já** emitem (`sheet.tsx` linhas 112-115, `dialog.tsx` 127-128):
```tsx
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
```
```ts
// esquema (RESEARCH Padrão 3)
const busy = !!document.querySelector('[role="dialog"][aria-modal="true"]')
  || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName ?? '')
```
O modo `replay` do Onboarding também usa `role="dialog" aria-modal="true"`, então já conta como ocupado.

Corpo de `registerPwa.ts`: usar o esquema de RESEARCH Padrão 3 (`registerSW` de `virtual:pwa-register`, `onNeedRefresh`, `onNeedReload` com guarda `coinc:sw-reload:v1`, `visibilitychange`, `vite:preloadError`). Pontos concretos:
- Só registrar com `import.meta.env.PROD`.
- Importar a decisão de `@shared/core/pwaUpdate.js` (não reescrever a regra aqui).
- Todo acesso a `sessionStorage` em `try/catch` (padrão acima).
- Tipos: acrescentar `"vite-plugin-pwa/client"` em `types` de `tsconfig.app.json` (hoje `["vite/client"]`).

---

### `src/sw.ts` (service worker, event-driven) — sem análogo

Nenhum worker existe no projeto (`public/` só tinha `piggy.svg` e `vite.svg`; sem `serviceWorker` em `src`). Copiar **literalmente** o corpo de RESEARCH Padrão 2 (`cleanupOutdatedCaches`, `precacheAndRoute(self.__WB_MANIFEST)`, `NavigationRoute` com `denylist: [/^\/__\//, /^\/api\//]`, `clientsClaim`, `message` `SKIP_WAITING`). Regras que o teste `phase5-sw.test.js` deve travar: nenhum `skipWaiting()` incondicional, nenhum `registerRoute` além da `NavigationRoute`, nenhum cache de dados (D-15).

`tsconfig.sw.json` segue o formato de `tsconfig.app.json` (mesmos campos `target`, `module`, `moduleResolution: bundler`, `skipLibCheck`, `strict`), com `lib: ["ES2022", "WebWorker"]`, `include: ["src/sw.ts"]`; `tsconfig.app.json` ganha `"exclude": ["shared/**/*.test.js", "src/sw.ts"]` (hoje só exclui os testes) e `tsconfig.json` ganha a referência:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

---

### `src/components/onboarding/Onboarding.tsx` (componente, estado local)

**Análogo principal:** `src/components/auth/LoginForm.tsx` (tela cheia, coluna `max-w-md`, `min-h-dvh bg-background`)
**Análogo do modo `replay`:** `src/components/ui/sheet.tsx` linhas 61-91 (Esc, foco preso, devolução do foco)

**Casca de tela cheia** (`LoginForm.tsx` linhas 58-60):
```tsx
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-[22px] bg-card px-4 py-6">
```
O onboarding usa a mesma ideia com três faixas (barra superior 48, região do meio `flex-1 overflow-y-auto no-scrollbar`, rodapé `sticky bottom-0 bg-background`). A classe `no-scrollbar` já existe em `src/index.css` (linhas 278-285).

**Botão principal 56 px** (`LoginForm.tsx` linha 154):
```tsx
className="h-14 w-full bg-action text-action-text hover:bg-action/90"
```

**Vintém calado, sem contexto.** `Vintem.tsx` só importa `useReducedMotion`, `createVintemView` e `geometry` (linhas 1-4); **não** usa `VintemContext`, então funciona antes do `ProtectedRoute` montar `VintemProvider`. Props reais (`Vintem.tsx` linhas 20-37): `state`, `size` (`'empty'` = 120x100), `follow`, `decorative` (padrão `true`). Uma instância só, estado trocado por prop:
```tsx
<Vintem state={ESTADO_POR_TELA[step]} size="empty" follow decorative />
```
`ESTADO_POR_TELA = ['neutro', 'atento', 'feliz']` (todos existem em `VintemState`, linha 7). Envolver em `aria-hidden="true"` como faz `VintemEmpty.tsx` linhas 15-21:
```tsx
    <div className="mx-auto flex justify-center" aria-hidden="true" data-pose={pose}>
      <Vintem state={pose} size="empty" />
    </div>
```
Não passar `onTap`/ref e nunca renderizar balão (D-19).

**Foco preso e Esc no `replay`** (copiar de `sheet.tsx` linhas 61-90): a lista `FOCUSABLE` (linha 13), `focusableIn` (15-18) e o `onKeyDown` com `Escape`, `Tab`/`Shift+Tab`, retorno do foco no cleanup (`origin.focus()`). Preferir **extrair** `FOCUSABLE` e `focusableIn` para um util compartilhado só se o plano tolerar mexer em `sheet.tsx`; senão duplicar essas 6 linhas no Onboarding.

**Movimento reduzido:** `useReducedMotion` (`@/hooks/useReducedMotion`). A classe de entrada das telas segue o padrão `anim-*` de `src/index.css` linhas 363-420, com a variante reduzida dentro do mesmo `@media (prefers-reduced-motion: reduce)` (fade de 100 ms, como `.anim-sheet-in, .anim-toast-in { animation: fade-100 100ms ease-out !important }`).

**Gravação da chave `coinc:onboarding:v1`:** só em "Pular" e "Entrar" (P-03), com `try/catch`; `replay` não grava. `localStorage` que lança vale "visto".

**Cuidados com guardas existentes** (`test/static/helpers/phase3-1.js`): `scaleProblems` aceita só `text-[12|16|28|56px]` e pesos 400/700, e proíbe emoji e `dangerouslySetInnerHTML`; `touchProblems` rejeita `size="iconSm"`, `h-7 w-7` e `h-8 w-8`. Usar `text-base`, `text-xs`, `text-[28px]`, `text-[56px]`, `font-bold`/`font-normal`.

---

### `src/components/onboarding/InstallSteps.tsx` (componente)

**Análogos:** `src/components/ui/segmented-control.tsx` (seletor Android/iPhone) e `src/components/ui/notice.tsx` (já é app e sucesso).

Seletor (assinatura real, `segmented-control.tsx` linhas 14-24):
```tsx
<SegmentedControl
  ariaLabel="Aparelho"
  value={device}
  onChange={setDevice}
  options={[{ value: 'android', label: 'Android' }, { value: 'iphone', label: 'iPhone' }]}
/>
```
O componente já cuida de setas, Home, End e de só a aba ativa ser tabulável (linhas 41-52).

Avisos (assinatura real, `notice.tsx` linhas 6-17): `tone="info"`, `icon={CircleCheck}`, `title="Você já está usando o Coinc como app."`. O `Notice` usa `role="status"` para tons que não são `danger`.

Botão "Adicionar agora": `Button variant="outline"` com `className="h-14 w-full"` e ícone `Download`, só quando `usePwaInstall().canPrompt`.

Lista de passos: `<ol>` com círculo `bg-surface-2` de 32 px; ícones Lucide inline de 20 px com `aria-hidden` (padrão `className="h-5 w-5" aria-hidden="true"` usado por todo o app, ex.: `LoginForm.tsx` linhas 78, 130).

---

### `src/components/settings/ThemeGroup.tsx` e `src/components/settings/AppCard.tsx` (componente, radiogroup e linhas-botão)

**Análogo exato:** `src/components/settings/VintemToneCard.tsx`

**Radiogroup com teclado** (linhas 87-107, 111-158): copiar a estrutura inteira. Diferenças para o tema: sem `useArea`, sem salvar em rede, sem `readOnly` (P-13: o seletor **não** desabilita em somente leitura), sem toast.
```tsx
const activeIndex = Math.max(0, OPTIONS.findIndex((o) => o.value === selected))

const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
  const last = OPTIONS.length - 1
  let target: number | null = null
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') target = activeIndex >= last ? 0 : activeIndex + 1
  else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') target = activeIndex <= 0 ? last : activeIndex - 1
  else if (e.key === 'Home') target = 0
  else if (e.key === 'End') target = last
  if (target === null) return
  e.preventDefault()
  move(target)
}
```
**Linha de opção** (linhas 120-155): `button role="radio" aria-checked tabIndex={checked ? 0 : -1}`, classes `flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`, borda `border-2 border-action` quando marcada, bolinha `bg-action text-action-text` com `Check`. O UI-SPEC pede extrair isto para um `RadioRow` compartilhado entre `VintemToneCard` e `ThemeGroup`; é opcional e não pode mudar o que o teste `phase4-settings.test.js` procura no `VintemToneCard`. Se extrair, rode esse teste.

**Ícone por linha:** `Monitor`, `Sun`, `Moon` (Lucide, 20 px).

**`SettingsCard` do `AppCard`** (`SettingsCard.tsx` linhas 5-20): `<SettingsCard id="aplicativo" icon={Smartphone} title="Aplicativo" subtitle="Coinc na tela inicial">`. O cartão renderiza título focável (`data-section-title`), então a âncora `#aplicativo` funciona com `useHashReveal` (ver `SettingsPage.tsx` linha 31).

**Folha de passos:** `Sheet` (`open`, `onClose`, `title`, `children`) de `@/components/ui/sheet`; o teclado e o foco preso já vêm dele.

**Atribuição ao `AppearanceCard`** (modificado): hoje o subtítulo é `"Nomes das abas e tema"` (linha 70) e há a nota a remover nas linhas 93-95:
```tsx
      <p className="text-xs font-normal text-muted-foreground">
        Tema claro. O tema escuro chega numa próxima fase.
      </p>
```
Mudar para subtítulo "Tema e nomes das abas", inserir `<ThemeGroup />` **acima** de `<h3 className="text-base font-bold">Nomes das abas</h3>` e manter o resto (salvar nomes continua dependente de rede e de `readOnly`).

**`SettingsPage.tsx`:** o teste `phase4-settings.test.js` linhas 12-27 trava a ordem `CycleIncomeCard, CategoriesCard, AccountsSkeletonCard, BankConnections, AppearanceCard, VintemToneCard, NotificationsCard`. Inserir `<AppCard />` **depois** de `<NotificationsCard />` (último cartão, antes do botão "Sair da conta", linhas 93-97) mantém a ordem relativa; adicionar o `AppCard` à verificação de ordem no teste novo. O subtítulo do cabeçalho (linha 43, "Ciclo, categorias, bancos e aparência") pode permanecer.

---

### `src/components/brand/BootError.tsx` (componente, estático)

**Análogo exato:** o ramo de erro de `src/pages/SettingsPage.tsx` linhas 62-81.
```tsx
      <div className="mx-auto w-full max-w-[480px] space-y-4 md:max-w-[560px]">
        {header}
        <VintemEmpty pose="surpreso" />
        <Notice tone="danger" icon={CircleAlert} title="Não foi possível carregar suas configurações."
          action={<Button type="button" variant="outline" size="sm" onClick={() => void reloadSettings()}>Tentar de novo</Button>}>
```
`BootError` é tela cheia (`min-h-dvh bg-background`, coluna `max-w-md`) com `VintemEmpty pose="surpreso"` (nunca `triste`), H1 `font-display text-[28px] font-bold leading-[1.2]`, corpo 16 e `Button` `h-14 w-full` "Tentar de novo" com ícone `RefreshCw` que chama `window.location.reload()`.

**Atenção:** o `BootError` renderiza **fora** de qualquer provider (o bundle pode ter falhado a meio). Não importe contexto nem hook de dados.

---

### `src/components/brand/CoincMark.tsx` (componente, estático)

**Análogo:** `src/components/vintem/VintemEmpty.tsx` (wrapper de poucas linhas). Restrição vinda do teste: `LoginForm.tsx` **não pode conter a palavra `gradient`** (`phase3-1-login.test.js` linha 51). Por isso o degradê vive só no SVG de `public/icons/icon.svg`, e `CoincMark` apenas faz `<img src="/icons/icon.svg" alt="" className="h-14 w-14 rounded-2xl" />` (56x56, `aria-hidden` ou `alt=""`).

---

### `src/components/auth/ProtectedRoute.tsx` (guarda, request-response) — modificar

**Estado atual (arquivo inteiro, linhas 10-26):**
```tsx
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return <>{children}</>
}
```
**Mudanças:**
1. `loading`: trocar `min-h-screen` por `min-h-dvh bg-background` (sem fundo no escuro, o spinner apareceria sobre branco).
2. Entre `loading` e `!user`: se `!user` e a chave `coinc:onboarding:v1` ausente (e `localStorage` lê sem lançar), renderizar `<Onboarding mode="first" onFinish={...} />`; depois `<LoginForm />`.
3. Com `user` e chave ausente, gravar em silêncio (P-05), dentro de efeito, nunca durante a renderização.
4. Manter a string `<LoginForm />` literal: `phase3-1-login.test.js` linha 85 faz `assert.match(code('src/components/auth/ProtectedRoute.tsx'), /<LoginForm \/>/)`.
5. `AuthContext` não muda (RESEARCH Padrão 6). Os providers (`VintemProvider`, etc.) ficam dentro do `ProtectedRoute` em `src/App.tsx` linhas 49-61, portanto o Onboarding e o `BootError` não têm acesso a eles.

---

### `src/components/auth/LoginForm.tsx` (componente) — modificar

**Linhas a mudar:**
- Linha 5: remover `PiggyBank` do import; adicionar `Info` (ícone do aviso) e `CircleAlert` se for usar no aviso sem conexão (o arquivo já importa `AlertCircle`, linha 5).
- Linhas 61-67 (bloco da marca): trocar o círculo com `PiggyBank` por `<CoincMark />` e o H1 por "Coinc":
```tsx
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-action">
            <PiggyBank className="size-7" aria-hidden="true" />
          </span>
          <h1 className="font-display text-[28px] font-bold leading-[1.2]">Financias Ratimbum</h1>
```
- Aviso de endereço novo: acima do `<form>` (linha 69), `Notice tone="info"` com ícone `Info`, título "O Coinc mudou de endereço." e texto "Entre de novo por aqui. Seus dados continuam salvos.", exibido só se `sessionStorage` tem `coinc:origem-antiga` igual a `'antigo'`.
- Aviso sem conexão: em `onSubmit` (linhas 49-56), antes de `signIn`, `if (navigator.onLine === false) { setOffline(true); return }`; mostrar `Notice tone="danger"` com a mensagem "Sem conexão. Conecte-se à internet para entrar." junto aos dois avisos de erro existentes (linhas 143-148). Limpar `offline` no início do envio como já se faz com `setAuthFailed(false)` (linha 50).

**Restrições das guardas (`phase3-1-login.test.js`) que o arquivo precisa continuar atendendo:**
- Linha 11-16: `signIn(data.email, data.password)`, `accessError`, `useAuth()`.
- Linha 29-37: nenhuma menção a `err.message`, sem `catch (err)`, sem `console.`, `<Notice tone="danger"` literal.
- Linha 44-52: **sem `gradient`**, `bg-background`, `bg-card` com `rounded-[22px]`, `bg-action text-action-text`, `h-14 w-full`.
- Linha 55-62: a raiz precisa de `min-h-dvh ... bg-background` e **só** usar os fundos `bg-background`, `bg-card`, `bg-surface-2`, `bg-inset`, `bg-transparent`, `bg-action`. Um `Notice` em arquivo separado não entra na varredura; um `div` com `bg-muted` ou similar no `LoginForm` quebraria o teste.
- Linha 76: `scaleProblems` e `touchProblems` limpos.
- Linha 22 da guarda: texto "finanças" no subtítulo permanece.

---

### `src/main.tsx` (entrada) — modificar

**Estado atual (arquivo inteiro, 12 linhas):**
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/sora'
import '@fontsource-variable/bricolage-grotesque/opsz.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```
Acrescentar, **antes** do `createRoot`: (1) captura de `beforeinstallprompt` (variável de módulo); (2) leitura única de `?origem=antigo` com igualdade exata, gravação em `sessionStorage` (`coinc:origem-antiga`) e `history.replaceState` para limpar a URL; (3) `registerPwa()`. Nunca renderizar o valor do parâmetro.

---

### `src/index.css` (tema) — modificar

**Estrutura atual relevante:**
- Linha 3: `@custom-variant dark (&:where(.dark, .dark *));` já existe.
- Linha 5: `@theme inline {` (vai até a linha ~127) mistura tokens `hsl(var(--x))` (podem ficar) com hex (`--color-action` linha 45, `--color-dock` linha 56, `--color-chart-1..8`, `--color-rhythm-*`, `--color-heat-*`, `--color-pit-*`, `--color-dot-*`, `--color-ele/ela`, `--color-bill-*-bg`, `--shadow-float` linha 121). **Os hex precisam sair de `@theme inline`** para `@theme` (ou `@theme static` para os usados só por `var()` em TS, como os `chart-*` e `chart-axis/grid`), senão `.dark` não os reescreve (RESEARCH Padrão 4, experimento comprovado).
- Linhas 129-166 (`@layer base { :root { ... color-scheme: only light` na linha 133): mudar para `color-scheme: light`; atualizar `--primary` e `--ring` para `134.1 40.5% 31%` (`#2f6f3e`).
- Linha 168 em diante (`.dark { ... }` azul-acinzentado do shadcn, ~20 linhas): **substituir inteiro** pelo bloco `.dark` de UI-SPEC "Bloco `.dark` para copiar", mais as redefinições `--color-*: #hex` do tema escuro (tabela "Tema escuro" do UI-SPEC) e `--shadow-float`.
- Linha 247 em diante (`.vt { ... }` dentro de `@layer base`; comentário explicativo nas linhas 242-246): acrescentar `.dark .vt { --vintem-tear: #bae6fd; --vintem-coin: #fde68a; --vintem-sweat: #60a5fa; --vintem-z: #9aa79e; }`. Os hex do `.vt` ficam **apenas** neste arquivo (comentário da linha 244: "Valores hexadecimais existem so aqui, nunca em .ts e .tsx").
- Linhas 396-420 (bloco `@media (prefers-reduced-motion: reduce)`): acrescentar a variante reduzida da classe de entrada do onboarding aqui, com `fade-100`.

**Atenção a guardas:** `palette-contrast.test.js` linhas 75-88 varre `src/**` por hex literal e por `bg|text|border-(white|black)`; qualquer cor nova vira token em `index.css`, nunca no TSX.

---

### `index.html` — modificar

**Estado atual (arquivo inteiro):**
```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    <link rel="icon" type="image/svg+xml" href="/piggy.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="only light" />
    <title>Financias Ratimbum</title>
  </head>
```
Substituir pelo `<head>` de RESEARCH "head final": script inline de tema **logo depois do `charset` e antes de qualquer `link`**, ícones, `color-scheme` `light dark`, **um** `theme-color`, metas `mobile-web-app-capable`/`apple-mobile-web-app-*`, `<title>Coinc</title>`. Remover as três metas `http-equiv` (o cabeçalho do Hosting é a fonte). O plugin injeta o `<link rel="manifest">`.

---

### `vite.config.ts` — modificar

**Estado atual (arquivo inteiro):**
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
})
```
Acrescentar `VitePWA({...})` ao array `plugins` com os valores de RESEARCH Padrão 1 (`strategies: 'injectManifest'`, `srcDir: 'src'`, `filename: 'sw.ts'`, `registerType: 'prompt'`, `injectRegister: false`, `maximumFileSizeToCacheInBytes: 3 * 1024 * 1024`, `globPatterns` incluindo `woff2`, `devOptions.enabled: false`) e o `manifest` da tabela "Manifest" do UI-SPEC com ícones escritos à mão (192 `any`, 512 `any`, 512 `maskable` em entradas separadas). Manter os dois aliases.

---

### `firebase.json` e `.firebaserc` — modificar

**Estado atual de `hosting`** (`firebase.json` linhas 5-52): um objeto único com `public: "dist"`, `rewrites`, e `headers` para `**/*.html`, `/`, `/assets/**`, **`**/*.js` e `**/*.css` imutáveis** (as duas últimas regras são as que pinariam `/sw.js`).

Converter `hosting` em **array** com `target: "coinc"` (cabeçalhos corrigidos) e `target: "legacy"` (`public: "hosting-legacy"`, `redirects` para `https://coinc-financias.web.app/?origem=antigo`, tipo `302`), exatamente como em RESEARCH Padrão 5. Manter `firestore` e `emulators` **intactos**: `test/static/firestore-config.test.js` linha 82 compara `rollback.emulators` com `readJson('firebase.json').emulators`.

`.firebaserc` atual:
```json
{
  "projects": {
    "default": "financias-ratimbum",
    "ratimbum": "financias-ratimbum",
    "amigo": "financias-xrd"
  }
}
```
Ganha a chave `targets` gerada por `firebase target:apply` (formato em RESEARCH "Exemplos de código"). Comitar o arquivo resultante. **Pegadinha:** o projeto `amigo` não terá os alvos; documentar no plano (RESEARCH Padrão 5).

`hosting-legacy/index.html` deve ser um arquivo versionado (pasta vazia não entra no git e `ignore: ["**/.*"]` descarta `.gitkeep`).

---

### `pwa-assets.config.ts` e `pwa-assets.maskable.config.ts` (config, batch)

**Análogo:** `vite.config.ts` (`defineConfig` de pacote, caminhos relativos à raiz). Corpo exato em RESEARCH "Config de ícones (esquema)". Rodar à mão (`npx pwa-assets-generator --config ...`) e **comitar os PNGs**; não rodar no build. Sem análogo para o `defineConfig` do gerador.

---

### `.planning/sketches/021-icone-app/index.html` (sketch com autoteste)

**Análogo exato:** `.planning/sketches/020-vintem-verde/index.html`
- Autossuficiente (SVG inline, sem script nem imagem externa).
- Autoteste ativado por `?test` (linha 522): `var HAS_TEST=/[?&]test/.test(location.search);if(!HAS_TEST)return;`
- Resultado impresso e título da aba (linhas 710-713):
```js
$('selftest').textContent='TOTAL '+R.filter(...).length+' | FALHAS '+f+'\n'+R.join('\n')+...
document.title='020 teste FALHAS '+f;window.__done=true;
```
- Em erro do teste: `'FALHAS 1 (erro no teste: '+e.message+')\n'+e.stack`.
- Parâmetro de variante lido de `location.search` (linha 444 usa `var qs=location.search;`). Para o 021: `?v=a` a `?v=e`.

Conteúdo: as cinco versões (A a E) e os oito itens do autoteste estão em UI-SPEC "Ícone do app". Registrar a escolha do dono em uma linha em `.planning/sketches/MANIFEST.md` (`021 | icone-app`). O desenho parte de `src/lib/vintem/geometry.ts` (viewBox 240x200, 6:5).

---

### `scripts/ux-audit/theme.mjs` (script de auditoria, batch/CDP)

**Análogos exatos:** `scripts/ux-audit/audit.mjs` e `scripts/ux-audit/cdp.mjs`

**Subir Vite em MOCK e servir** (`audit.mjs` linhas 5-7 e 63-97):
```js
import { spawn } from 'node:child_process'
import { connect, launchChrome } from './cdp.mjs'
import { buildSeed } from './seed.mjs'

const PORT = 5199
const ORIGIN = `http://127.0.0.1:${PORT}`
...
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    env: { ...process.env, VITE_USE_EMULATOR: 'true', BROWSER: 'none' },
```
**Rotas** (`audit.mjs` linha 15): `const ALL_ROUTES = ['/', '/transacoes', '/contas-fixas', '/porquinho', '/metas', '/relatorios', '/configuracoes', '/calendario', '/casal']`. O `theme.mjs` acrescenta `/vintem-teste`, o Login, as três telas do Onboarding, o `BootError` e as sobreposições da UI-SPEC S6.

**Semear localStorage e forçar o tema** (`audit.mjs` linhas 266-308; `vintem-app.mjs` linhas 95-98 e 187-198): `Page.addScriptToEvaluateOnNewDocument` com uma função de semente que remove chaves `db::`/`doc::`, grava o seed e, para a auditoria de tema, também `coinc:tema:v1`. Para ver o app e não o onboarding, semear também `coinc:onboarding:v1 = '1'` (e a sessão já existe em MOCK).

**Viewport e toque** (`vintem-app.mjs` linhas 187-193): `Emulation.setDeviceMetricsOverride` (360x640 e 390x844) e `Emulation.setTouchEmulationEnabled`.

**Códigos de saída** (`audit.mjs` linha 6): `0 ok, 1 violações, 2 falha do próprio script`. Uma linha JSON por rota, viewport e tema. Sem dependência nova.

**Suites de verificação por seletor** têm padrão em `scripts/ux-audit/vintem-app/settings.mjs` (função `run({ page, check, navigate, sleep })`, seletores `section#vintem`, `[role="radiogroup"][aria-label=...]`); servem de modelo para conferir `[role="radiogroup"][aria-label="Tema do aplicativo"]` e a ausência de rolagem horizontal (`scrollWidth <= clientWidth`).

---

### Testes estáticos `test/static/phase5-*.test.js`

**Helpers a reutilizar** (`test/static/helpers/phase3-1.js`, não rodam sozinhos): `read`, `exists`, `code` (lê sem comentários), `assertIncludes`, `listSrc`, `scaleProblems`, `touchProblems`. Cabeçalho padrão:
```js
// Guarda estatica ... Rodar: node --test test/static/phase5-onboarding.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const FILE = 'src/components/onboarding/Onboarding.tsx'
```
**Estilo de asserção** (de `phase3-1-login.test.js` e `phase4-settings.test.js`): `assert.match(src, /regex/, 'mensagem em português')`, `assert.ok(src.includes('texto'), 'sem ...')`, `assert.deepEqual(scaleProblems([FILE]), [])`. Teste de ordem por `indexOf` em `phase4-settings.test.js` linhas 12-27 serve para a ordem dos cartões de Ajustes.

**Hosting** (`firestore-config.test.js` linhas 9-12): `ROOT`, `read`, `readJson` locais; ler `firebase.json` e `.firebaserc` por `JSON.parse`. O teste novo deve exigir: `hosting` é array com `target` `coinc` e `legacy`; `/assets/**` imutável; `/sw.js`, `/manifest.webmanifest`, `/` e `**/*.html` com `no-cache`; **nenhuma** regra `**/*.js` ou `**/*.css` imutável; `redirects` do `legacy` para `https://coinc-financias.web.app/?origem=antigo`; `emulators` e `firestore` preservados. O UI-SPEC cita um "`firebase-config.test.js`" que **não existe**; criar este.

**Manifest** (`phase5-manifest.test.js`): lê `dist/manifest.webmanifest` (exige `npm run build` antes). Sem análogo para ler `dist/`; seguir o estilo do `firestore-config.test.js` e pular com `{ skip }` se `dist/` não existir, para `npm run test:static` não depender de build.

**Tema** (`phase5-theme.test.js`): executar o `<script>` inline do `index.html` em `node:vm` com `localStorage` e `matchMedia` falsos (RESEARCH tabela requisito -> teste). Não há análogo de `vm` no repositório; usar `node:vm` direto.

**Nome** (`phase5-identity.test.js`): varrer `src`, `index.html`, `public` por `Ratimbum|Financias|Coinki`, com lista de exceções fixa: `src/lib/legacyAuthCleanup.ts` (chaves `financias_legacy_user`, `financias_auth`), `coinki:open-alerts` em `src/components/layout/AlertsBell.tsx` e `src/components/dashboard/LimitAlertNotice.tsx` linha 11 (P-12). Usar `listSrc('src')` de `helpers/phase3-1.js`.

**Testes que quebram de propósito e precisam ser atualizados na mesma tarefa:**
- `test/static/phase3-gaps.test.js` linhas 61-64:
```js
test('tema claro unico: color-scheme only light no CSS e no HTML', () => {
  assert.match(code('src/index.css'), /color-scheme:\s*only light/)
  assert.match(read('index.html'), /<meta\s+name="color-scheme"\s+content="only light"/)
})
```
  Passa a exigir `color-scheme: light` no `:root`, `color-scheme: dark` no `.dark` e `content="light dark"` no HTML.
- `test/static/palette-contrast.test.js` linhas 10-18 (`t.action === '#4c513b'` e `assert.equal(t.dock, t.action, ...)`): novos valores `#2f6f3e` e `#2c5a38`, **sem** a igualdade `dock === action`. Linhas 22-41 e 51-62 passam a rodar nos dois temas.
- `test/static/helpers/palette.js` `tokens()` (linhas 15-26) corta o CSS em `src.indexOf('.dark {')` e lê só o claro. Virar `tokens(theme = 'light')`: o escuro é o claro com as sobrescritas do bloco `.dark` (hsl e `--color-*`). Manter `luminance`, `contrast` e `PAIRS` como estão e rodar `PAIRS` com os dois mapas. O piso `['botao + ao lado da dock', 'fab', 'dock', 2.2]` (linha ~79) continua 2,2.
- `test/static/phase3-gaps.test.js` linhas 47-58 comparam `--color-action` com `--primary`; ambos mudam juntos (`#2f6f3e` e `134.1 40.5% 31%`).

---

## Padrões compartilhados

### Armazenamento local defensivo (todo acesso novo a `localStorage` e `sessionStorage`)
**Fonte:** `src/contexts/VintemContext.tsx` linhas 106-128 (trecho completo na seção `useTheme`).
**Aplicar a:** `useTheme`, `registerPwa`, `ProtectedRoute` (chave do onboarding), `Onboarding`, `LoginForm` (aviso de origem), `main.tsx`.
Regra: `try/catch` em toda leitura e gravação; falha = valor padrão (`auto`, "visto"), nunca erro. Chaves versionadas com sufixo `:v1`, como `vintem:baseline:v1:` em `src/lib/vintemBaseline.ts` linha 11 (`const CACHE_PREFIX = 'vintem:baseline:v1:'`). Chaves desta fase: `coinc:tema:v1`, `coinc:onboarding:v1`, `coinc:origem-antiga` (sessão), `coinc:recarga:v1` (sessão), `coinc:sw-reload:v1` (sessão). Valores lidos validados contra conjunto fechado antes do uso.

### Primitivos de UI do projeto
**Fonte:** `src/components/ui/` (24 componentes, escritos à mão, sem `components.json`).
**Aplicar a:** todos os componentes novos.
- `Button` (`@/components/ui/button`), `Notice` (`tone`, `icon`, `title`, `action`), `Sheet` (`open`, `onClose`, `title`), `SegmentedControl` (`ariaLabel`, `options`), `Progress`, `Chip`.
- Imports sempre por alias `@/` e `@shared/`; ícones por `lucide-react` com `aria-hidden="true"` (ex.: `LoginForm.tsx` linha 78). Sem emoji.
- Escala tipográfica travada: `text-xs` (12), `text-base` (16), `text-[28px]` (28, com `font-display font-bold leading-[1.2]`), `text-[56px]` (56, com `num-display`); pesos `font-normal` e `font-bold` só. Verificado por `scaleProblems`.
- Alvos de toque >= 44 px (`h-11 w-11`, `min-h-14`, `h-14`); proibido `h-7 w-7`, `h-8 w-8`, `size="iconSm"` (verificado por `touchProblems`).
- Cores só por token Tailwind (`bg-card`, `bg-surface-2`, `bg-inset`, `bg-action`, `text-action-text`, `text-muted-foreground`, `text-danger-ink`); nunca hex em `.ts`/`.tsx` nem `bg-white`/`bg-black` opaco (`palette-contrast.test.js` linhas 75-88).

### Foco, Esc e foco preso
**Fonte:** `src/components/ui/sheet.tsx` linhas 13-18 e 61-90.
**Aplicar a:** `Onboarding` em modo `replay`. A `Sheet` de "Adicionar à tela inicial" já traz tudo isso.

### Radiogroup acessível
**Fonte:** `src/components/settings/VintemToneCard.tsx` linhas 87-158.
**Aplicar a:** `ThemeGroup` (e, se extraído, a `RadioRow`).

### Movimento reduzido
**Fonte:** `src/hooks/useReducedMotion.ts` e `src/index.css` linhas 396-420.
**Aplicar a:** `Onboarding` (transições e Vintém), pontinhos de progresso (sem transição), seletor de tema (sem animação).

### Cabeçalhos de cache e cache do SW (D-06, D-15)
**Fonte:** `firebase.json` atual (a corrigir) e RESEARCH Padrão 5.
**Aplicar a:** `firebase.json`, `src/sw.ts`, `phase5-hosting.test.js`, `phase5-sw.test.js`. Regra única: só `/assets/**` imutável; `/sw.js`, `/manifest.webmanifest`, `/` e HTML `no-cache`; o SW nunca registra rota de dados.

### Origem autorizada no servidor
**Fonte:** `server/src/auth.js` linhas 12-15 e `server/src/app.js` linhas 34 e 77; leitura única na inicialização em `server/src/index.js` (`parseOrigins(required('ALLOWED_ORIGINS'))`).
**Aplicar a:** passo de implantação, **sem código novo**. Incluir `https://coinc-financias.web.app` em `ALLOWED_ORIGINS` no Railway e **reiniciar** o serviço antes de ativar o redirect; sem isso a API responde `403 {"error":"Origem nao autorizada"}`. Não imprimir as variáveis do Railway (têm segredo).

### Testes do núcleo e estáticos
**Fonte:** `package.json` scripts `test:core` (`node --test "shared/**/*.test.js"`) e `test:static` (`node --test "test/static/*.test.js"`).
**Aplicar a:** todo `.test.js` novo. Linha de base: 449 testes (447 passam, 2 ignorados). Comando de onda: `npm run test:static && npm run test:core && npm run build`.

---

## Sem análogo no código

Usar RESEARCH.md/UI-SPEC.md como fonte:

| Arquivo | Papel | Fluxo de dados | Motivo |
|---------|-------|----------------|--------|
| `src/sw.ts` | service worker | event-driven | Nenhum worker existe; corpo em RESEARCH Padrão 2 |
| `hosting-legacy/index.html` | config | estático | Primeiro site secundário do Hosting; stub mínimo, o redirect responde antes |
| `pwa-assets.config.ts`, `pwa-assets.maskable.config.ts` | config | batch | Primeiro uso do gerador de ícones; RESEARCH "Config de ícones" |
| `public/icons/*.png`, `favicon.ico` | ativo | file-I/O | Gerados a partir do SVG escolhido no sketch 021 (portão humano) |
| Script inline de tema em `index.html` | script | transform | Primeiro script inline; corpo em RESEARCH Padrão 4, item 5 |
| `phase5-theme.test.js` (uso de `node:vm`) | teste | transform | Nenhum teste existente executa script de HTML em `vm` |
| `phase5-manifest.test.js` (leitura de `dist/`) | teste | file-I/O | Nenhum teste lê o build; tratar ausência de `dist/` com `skip` |

---

## Observações para o planejador

1. **Documentos a reescrever** (CONTEXT): ROADMAP (Fase 5, critérios 1 a 3), REQUIREMENTS (IDEN-01 a 05 e 08), PROJECT.md e `.claude/CLAUDE.md` ("Coinki" vira "Coinc", `coinc-financias.web.app`, atualização silenciosa em lugar de aviso, site antigo redireciona direto). Não mudar `demo-coinki` em `package.json` (ID de emulador).
2. **Ordem de onda sugerida pelas dependências:** (a) `npm install` aprovado + `maximumFileSizeToCacheInBytes` (senão o build quebra com o bundle de 1,82 MB); (b) `shared/core/{pwaUpdate,theme}.js` e testes; (c) tokens em `index.css` + `palette.js` + testes de paleta/gaps (quebra intencional, mesma tarefa); (d) `index.html`, `useTheme`, `ThemeGroup`; (e) sketch 021 como `checkpoint:human-verify` com ícones provisórios para não bloquear (RESEARCH Padrão 7); (f) `Onboarding`, `ProtectedRoute`, `LoginForm`; (g) `sw.ts`, `registerPwa`, `vite.config.ts`; (h) `firebase.json`, `.firebaserc`, `ALLOWED_ORIGINS`, deploy do site `coinc-financias`, redirect por último.
3. **Pontos que o código atual não cobre e o plano precisa decidir:** onde fica o armazenamento do evento `beforeinstallprompt` (módulo em `src/lib/pwa/`); extração opcional de `FOCUSABLE`/`focusableIn` do `sheet.tsx`; extração opcional de `RadioRow`.
4. **Pontos sensíveis nas guardas:** `LoginForm.tsx` sem `gradient` e só com os seis fundos permitidos; `ProtectedRoute.tsx` com `<LoginForm />` literal; ordem dos cartões de Ajustes; nenhum hex em `src/**` fora de `index.css`; `emulators` de `firebase.json` intactos.

## Metadados

**Escopo de busca por análogos:** `src/components/{auth,settings,ui,vintem,dashboard,layout}`, `src/hooks`, `src/contexts`, `src/lib`, `src/pages`, `shared/core`, `test/static` (+ `helpers`), `scripts/ux-audit`, `server/src`, `.planning/sketches`, `firebase.json`, `.firebaserc`, `vite.config.ts`, `index.html`, `tsconfig*.json`.
**Arquivos lidos:** 38.
**Data de extração:** 2026-11-23
