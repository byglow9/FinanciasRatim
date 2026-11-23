# Fase 5: Identidade Coinc, PWA e onboarding - Pesquisa

**Pesquisado em:** 2026-11-23
**Domínio:** PWA instalável (vite-plugin-pwa + Workbox) sobre Vite 7.3 / React 19, Firebase Hosting multi-site com redirecionamento, tema claro/escuro por aparelho em Tailwind 4, onboarding antes do login
**Confiança geral:** ALTA para PWA, Hosting e Tailwind (lidos no código do pacote, na documentação oficial e por experimento local); MÉDIA para comportamento de iOS e para o que só o Console do Google/Railway confirma (itens em "Premissas")

<user_constraints>
## User Constraints (de 05-CONTEXT.md)

### Decisões travadas
- **D-01:** O nome do app é **Coinc** e o site é **coinc.web.app**, no mesmo projeto Firebase (`financias-ratimbum`). Decidido pelo dono após dúvida explícita ("Coinc" escrito duas vezes). Reversibility: costly.
- **D-02:** Pesquisa do nome em lojas e INPI **dispensada** ("é app pessoal"). Não trava a fase.
- **D-03:** Se o ID de site `coinc` estiver ocupado no Hosting, **parar e perguntar ao dono** antes de reservar outro (sem nome reserva automático).
- **D-04:** O site antigo (financias-ratimbum.web.app) **redireciona direto** para o novo, **sem página de aviso**.
- **D-05:** O login é refeito uma vez no novo endereço (origem nova: sessão e localStorage não migram). Dados no Firestore não se perdem. Sem migração de preferências locais por link.
- **D-06:** Domínio novo entra nos domínios autorizados do Auth e em `ALLOWED_ORIGINS` do servidor; cabeçalhos do Hosting corrigidos para o service worker não ficar preso em cache (`firebase.json`: regras `**/*.js` e `**/*.css` imutáveis pinariam `/sw.js`).
- **D-07:** Verde do tema claro **mais claro** que o atual; tema escuro com **verde bem escuro** (fundo verde-quase-preto). Sem rosa. Valores exatos no UI-SPEC, medidos por `test/static/palette-contrast.test.js`.
- **D-08:** Seletor nos Ajustes com três opções: **Automático (padrão, segue o celular), Claro, Escuro**.
- **D-09:** Escolha **por aparelho, no localStorage**, aplicada antes do primeiro desenho (sem piscar o tema errado).
- **D-10:** A fase **revisa todas as telas e gráficos no escuro** (Recharts, arco do medidor, alertas, Vintém sobre fundo escuro, estados vazios e de erro).
- **D-11:** Não existe suporte instalável hoje; esta fase cria manifest, ícones (inclusive maskable) e service worker. O texto da interface diz **"Adicionar à tela inicial"**, não "instalar".
- **D-12:** Os passos (Android e iPhone) aparecem **na tela de boas-vindas** (3ª tela do onboarding).
- **D-13:** Ícone: **sketch com 5 versões** (3 seguindo as referências, 2 livres); sem moeda no ícone; sem copiar arte de terceiros.
- **D-14:** Atualização: o app **atualiza sozinho ao abrir**, sem toast. Garantir **ausência de tela branca** e **não trocar de versão no meio de um lançamento** (trocar na abertura, não durante o uso); ajustar o texto de IDEN-04 e do critério 3.
- **D-15:** Offline: **só a casca do app** é cacheada; dados (Firestore, `/api`) sempre da rede.
- **D-16:** **3 telas** antes do login; texto é decisão de Claude (já proposto no UI-SPEC).
- **D-17:** Só na primeira abertura de cada aparelho, antes do login, guardado no localStorage.
- **D-18:** Botão **Pular em todas as telas**; pular leva ao login e marca como visto.
- **D-19:** O **Vintém conduz as 3 telas, calado**, com estados diferentes por tela; respeita movimento reduzido.

### Discrição de Claude
- Texto exato das 3 telas e do aviso de redirecionamento/login (aviso curto na tela de login é aceitável, página de aviso separada não).
- Hex dos tokens claros e escuros, desde que passem no teste de contraste.
- As duas variações livres do ícone.

### Ideias adiadas (FORA DE ESCOPO)
Nenhuma. Fora da fase: cartão (Fase 6), push (Fase 7), Casal multiusuário (Fase 8), IA do Vintém (Fase 7).
</user_constraints>

<phase_requirements>
## Requisitos da fase

| ID | Descrição (com a redação nova que o planejador deve gravar) | Suporte da pesquisa |
|----|-------------------------------------------------------------|---------------------|
| IDEN-01 | O app se chama **Coinc** em todas as telas e o endereço público é **coinc.web.app**, no mesmo projeto Firebase | Seção Hosting: `hosting:sites:create coinc`, targets, guarda de nome (grep nas ocorrências reais listadas) |
| IDEN-02 | O site antigo **redireciona direto** para o novo, e Auth e `ALLOWED_ORIGINS` incluem o novo | Seção Hosting: segundo alvo com `redirects`; ordem de implantação; origem do servidor |
| IDEN-03 | Usuário adiciona o Coinc à tela inicial (manifest, ícones com maskable, service worker) e vê os passos Android/iPhone | Seções PWA e Ícones; tela 3 do onboarding e folha em Ajustes (UI-SPEC P-02) |
| IDEN-04 | O app **atualiza sozinho ao abrir**, sem aviso e sem tela branca depois de um deploy | Seção Atualização silenciosa (ciclo de vida do SW, decisão pura, recarga protegida) |
| IDEN-05 | Tema Automático (padrão), Claro ou Escuro, por aparelho | Seção Tema (script inline, `@theme` sem `inline`, `useTheme`) |
| IDEN-06 | Visual novo em todas as telas, inclusive no escuro | Seção Tema + Recharts (já usa `var(--color-*)`) + auditoria CDP |
| IDEN-08 | Onboarding de 3 telas e login novo no visual do Coinc | Seção Onboarding/portão em `ProtectedRoute` |
</phase_requirements>

## Resumo

A fase é majoritariamente **integração e infraestrutura**, não bibliotecas novas. Cinco achados mudam o plano em relação ao que o UI-SPEC e o STACK assumiam. (1) O app **já usa `var(--color-*)` em todo o Recharts** e não usa `Tooltip` nem `Legend` do Recharts (a legenda é um `<ul>` próprio), então o escuro dos gráficos vem de graça quando os tokens trocam. (2) Em Tailwind 4, tokens em hex dentro de `@theme inline` viram **literal nas utilitárias** e a classe `.dark` **não consegue** reescrevê-los (comprovado por experimento): é obrigatório mover os hex para `@theme` sem `inline`. (3) O `registerType: 'autoUpdate'` do plugin recarrega **todas** as janelas na hora (inclusive no meio de um lançamento), o que contradiz D-14; o desenho correto é `registerType: 'prompt'` **sem interface**, com a decisão de quando ativar em uma função pura. (4) O `index-*.js` atual tem **1,82 MB** e o limite padrão de pré-cache é **2 MiB**; desde o plugin 0.20.2 estourar o limite **quebra o build**, então o limite precisa subir já na primeira tarefa. (5) `firebase.json` virando array exige `.firebaserc` com `targets`, e existe um segundo projeto (`amigo`, `financias-xrd`) que não terá esses alvos.

**Recomendação principal:** `vite-plugin-pwa` 2.0.0 com `strategies: 'injectManifest'`, `registerType: 'prompt'` sem UI, `src/sw.ts` só com pré-cache da casca e `NavigationRoute`; ativação do SW decidida por `shared/core/pwaUpdate.js` (testável com `node --test`); tema por script inline + `@theme` sem `inline` + classe `dark` em `<html>`; `firebase.json` em array com alvo `coinc` (cabeçalhos corrigidos) e alvo `legacy` (redirect para `https://coinc.web.app/?origem=antigo`); **ordem de implantação: origem no Railway primeiro, site novo depois, redirect por último.**

## Mapa de responsabilidade por camada

| Capacidade | Camada principal | Secundária | Justificativa |
|------------|------------------|-----------|---------------|
| Servir casca, manifest, sw.js e cabeçalhos de cache | CDN / Hosting | — | `firebase.json` é a única autoridade sobre `Cache-Control` |
| Pré-cache da casca e rota de navegação | Service worker (navegador) | — | `src/sw.ts`; nada de runtime cache de dados (D-15) |
| Decidir quando trocar a versão | Navegador / cliente (módulo puro + registro) | SW (recebe `SKIP_WAITING`) | Depende de estado de UI (Sheet aberto, segundo plano) que só o cliente conhece |
| Tema (resolução antes do desenho) | Navegador (script inline no HTML) | Cliente React (`useTheme`) | Precisa rodar antes do CSS e do bundle |
| Tokens claro/escuro | CSS (`src/index.css`) | — | Troca de variáveis na classe `.dark` em `<html>` |
| Onboarding e portão | Cliente React (`ProtectedRoute`) | localStorage | Chave por aparelho; sem dado no Firestore |
| Redirecionamento do site antigo | CDN / Hosting (site `legacy`) | Cliente (lê `?origem=antigo`) | Redirect 3xx na borda; aviso curto no Login |
| Autorização de origem para a API | API / Backend (`ALLOWED_ORIGINS`, Railway) | Auth (domínios autorizados) | `originGuard` e `cors` recusam origem fora da lista |
| Autenticação | Firebase Auth (cliente) | API (token) | Fluxo não muda; origem nova só exige login de novo |

## Pilha padrão

### Principais
| Biblioteca | Versão | Papel | Por que |
|------------|--------|-------|---------|
| vite-plugin-pwa | 2.0.0 (publicada 2026-10-03) | Manifest, build do SW, módulo `virtual:pwa-register` | Peer `vite ^3.1 ... ^8`, Node >= 20.19; `injectManifest` com `src/sw.ts` [VERIFIED: npm view vite-plugin-pwa@2.0.0 peerDependencies engines] |
| workbox-window | 7.4.1 | Registro e eventos do SW na página | Peer obrigatório do plugin [VERIFIED: npm view] |
| workbox-build | 7.4.1 | Injeção do manifesto de pré-cache | Peer obrigatório do plugin [VERIFIED: npm view] |
| workbox-precaching | 7.4.1 (dev) | `precacheAndRoute`, `cleanupOutdatedCaches`, `createHandlerBoundToURL` | Usado dentro de `src/sw.ts` |
| workbox-routing | 7.4.1 (dev) | `NavigationRoute`, `registerRoute` | **Faltava no UI-SPEC.** `NavigationRoute` aceita `denylist?: RegExp[]` [VERIFIED: workbox-routing@7.4.1/NavigationRoute.d.ts:6] |
| workbox-core | 7.4.1 (dev) | `clientsClaim` | **Faltava no UI-SPEC.** Declarar explicitamente: sem isso o `sw.ts` dependeria de hoisting do npm (dependência fantasma). `workbox-precaching` depende de core, routing e strategies na mesma versão [VERIFIED: npm view workbox-precaching@7.4.1 dependencies] |

### De apoio
| Biblioteca | Versão | Papel | Quando usar |
|------------|--------|-------|-------------|
| @vite-pwa/assets-generator | 2.0.0 (dev, publicada 2026-09-12) | PNGs de 192/512/maskable/apple-touch e `favicon.ico` a partir de SVG | Uma vez, depois de o dono escolher o ícone; saída commitada em `public/` |

### Alternativas consideradas
| Em vez de | Poderia usar | Tradeoff |
|-----------|--------------|----------|
| `registerType: 'prompt'` sem UI | `autoUpdate` | `autoUpdate` força `skipWaiting` + `clientsClaim` e recarrega as janelas abertas na hora; a própria documentação avisa que pode perder dados de formulário [CITED: vite-pwa-org.netlify.app/guide/auto-update]. Viola D-14 (não trocar durante lançamento) |
| Gerador de ícones | `sharp` direto em script | `sharp` já vem como dependência do gerador (`^0.35.4`); só vale script próprio se o degradê de borda a borda do maskable não sair do gerador (ver Ícones) |
| `workbox-recipes` / `registerRoute` de runtime | — | Não usar: D-15 proíbe cache de dados |

**Instalação:**
```bash
npm install -D vite-plugin-pwa@2.0.0 workbox-window@7.4.1 workbox-build@7.4.1 workbox-precaching@7.4.1 workbox-routing@7.4.1 workbox-core@7.4.1 @vite-pwa/assets-generator@2.0.0
```
(`workbox-window` é importado pelo módulo virtual no bundle da página; mantê-lo em `devDependencies` é aceito pela documentação do plugin [CITED: vite-pwa-org.netlify.app/frameworks/react: "Add workbox-window as a dev dependency"].)

**Verificação de versão (2026-11-23):** `vite-plugin-pwa` 2.0.0, `workbox-*` 7.4.1 (modificadas 2026-05-04), `@vite-pwa/assets-generator` 2.0.0 (modificada 2026-10-25), `sharp` 0.35.5, `firebase-tools` 15.37.0 [VERIFIED: npm view]. Vite instalado: 7.3.1 com `@vitejs/plugin-react` 5.1.4 [VERIFIED: npm ls]. Nenhum pacote tem `postinstall` [VERIFIED: npm view ... scripts.postinstall vazio].

## Auditoria de legitimidade de pacotes

| Pacote | Registro | Idade | Downloads/sem | Repositório | Veredito | Disposição |
|--------|----------|-------|---------------|-------------|----------|------------|
| vite-plugin-pwa | npm | publicado 2026-10-03 (projeto de vários anos) | 7,46 M | github.com/vite-pwa/vite-plugin-pwa | OK | Aprovado |
| workbox-window | npm | 2026-05-04 | 12,5 M | github.com/googlechrome/workbox | OK | Aprovado |
| workbox-build | npm | 2026-05-04 | 12,4 M | github.com/googlechrome/workbox | OK | Aprovado |
| workbox-precaching | npm | 2026-05-04 | 12,7 M | github.com/googlechrome/workbox | OK | Aprovado |
| workbox-routing | npm | 2026-05 | 12,8 M | github.com/googlechrome/workbox | OK | Aprovado |
| workbox-core | npm | 2026-05 | 13,4 M | github.com/googlechrome/workbox | OK | Aprovado |
| @vite-pwa/assets-generator | npm | 2026-09-12 | 443,7 mil | github.com/vite-pwa/assets-generator | OK | Aprovado |
| sharp (transitivo do gerador) | npm | 0.35.5 | — | — | OK | Só transitivo; não instalar direto |
| firebase-tools | npm | 15.37.0 publicado 2026-11-18 | 5,3 M | github.com/firebase/firebase-tools | **SUS** (motivo "too-new") | **Não instalar como dependência.** O CLI global 15.9.1 já está instalado e autenticado; usar esse |

**Pacotes removidos por SLOP:** nenhum.
**Pacotes sinalizados SUS:** `firebase-tools` (versão recém-publicada). Sem instalação nova, não há checkpoint a inserir; se o plano quiser atualizar o CLI global, inserir `checkpoint:human-verify` antes.

Proveniência: os nomes dos seis pacotes de PWA vêm do STACK.md e do UI-SPEC (ambos já aprovados) e foram confirmados por `gsd-tools query package-legitimacy check` (OK) e pela documentação oficial do plugin. `workbox-routing` e `workbox-core` foram acrescentados por esta pesquisa a partir das dependências declaradas de `workbox-precaching` [VERIFIED: npm view]. O UI-SPEC registra "aprovação do dono pendente" para o `npm install`; manter o portão do plano.

## Padrões de arquitetura

### Diagrama de fluxo

```
Abertura do app (celular)
   |
   v
index.html (no-cache, vindo do Hosting OU do pré-cache do SW)
   |-- <script> inline: lê coinc:tema:v1 + matchMedia -> classe dark, color-scheme, meta theme-color
   |-- CSS + bundle (hash em /assets/**, immutable)
   v
main.tsx --> registerPwa() (virtual:pwa-register, prompt sem UI)
   |                      |
   |                      +--> SW novo achado (waiting)? --> decideUpdate({busy, hidden, msSinceOpen})
   |                                                          |-- 'ativar'  --> updateSW() -> SKIP_WAITING -> controlling -> recarga (1x, protegida)
   |                                                          |-- 'esperar' --> aguarda visibilitychange=hidden ou próxima abertura
   |                                                          '-- 'nada'
   v
App -> ProtectedRoute
   |-- loading ................................ spinner sobre bg-background
   |-- sem sessão e sem coinc:onboarding:v1 ... Onboarding (3 telas) --Pular/Entrar--> grava chave -> LoginForm
   |-- sem sessão e chave presente ............ LoginForm (+ aviso se origem=antigo em sessionStorage)
   '-- com sessão ............................. app (grava a chave em silêncio)

Site antigo financias-ratimbum.web.app --redirect--> https://coinc.web.app/?origem=antigo
Dados: Firestore e API (Railway) sempre pela rede; SW só serve casca (precache) e navegação -> /index.html
Falha de import() / chunk antigo --> vite:preloadError --> 1 recarga (sessionStorage) --> BootError
```

### Estrutura de projeto recomendada
```
src/
├── sw.ts                          # worker: precache + NavigationRoute + SKIP_WAITING
├── lib/pwa/
│   ├── registerPwa.ts             # registerSW, intervalos, visibilitychange, vite:preloadError
│   └── isBusy.ts                  # consulta ao DOM: [role="dialog"][aria-modal="true"] ou campo em edição
├── hooks/useTheme.ts, usePwaInstall.ts
├── components/{onboarding,brand,settings}/...
shared/core/
├── pwaUpdate.js (+ .test.js)      # decideUpdate, decidePreloadError (puro, node --test)
└── theme.js (+ .test.js)          # resolveTheme(pref, systemDark)
pwa-assets.config.ts, pwa-assets.maskable.config.ts
hosting-legacy/index.html          # stub mínimo; o redirect responde antes dele
tsconfig.sw.json
```
Convenção do projeto: lógica pura vai em `shared/core/*.js` com `.test.js` ao lado (importada pelo TS via `@shared/core/...`; `allowJs` está ligado em `tsconfig.app.json`) e roda em `npm run test:core`. Seguir isso para as duas funções puras.

### Padrão 1: vite.config.ts
```ts
// Fonte: vite-pwa-org.netlify.app/guide/inject-manifest + tipos de vite-plugin-pwa@2.0.0 (index.d.ts)
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.ts',
  registerType: 'prompt',          // sem UI: a decisão é nossa (shared/core/pwaUpdate.js)
  injectRegister: false,           // registramos em main.tsx; evita script injetado
  manifest: { /* valores do UI-SPEC "Manifest"; icons escritos à mão */ },
  injectManifest: {
    globPatterns: ['**/*.{js,css,html,woff2,svg,png,ico,webmanifest}'],
    maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,   // index-*.js atual: 1.816.567 bytes
  },
  devOptions: { enabled: false },
})
```
- `injectRegister` aceita `'inline' | 'script' | 'script-defer' | 'auto' | null | false` [VERIFIED: vite-plugin-pwa@2.0.0 dist/index.d.ts:332].
- O limite de pré-cache: `showMaximumFileSizeToCacheInBytesWarning` padrão `false` e, **desde 0.20.2, o plugin lança erro se o aviso de tamanho aparecer** [VERIFIED: dist/index.d.ts:430]. `dist/assets/index-Bxrf_PsU.js` tem 1.816.567 bytes (limite padrão do Workbox: 2 MiB = 2.097.152) [VERIFIED: ls -la dist/assets]. As Fases 6 e 7 vão engordar o bundle: subir o limite agora e, se passar de ~2,5 MB, separar o Recharts com `manualChunks`.
- Fontes `woff2` ficam em `/assets/*.woff2` (hash) e precisam estar no `globPatterns` para a casca abrir sem rede.
- `manifest.id`, `lang`, `display`, `orientation`, ícones: exatamente a tabela "Manifest" do UI-SPEC (ícones 192 `any`, 512 `any`, 512 `maskable` em entradas separadas).

### Padrão 2: src/sw.ts
```ts
// Fonte: vite-pwa-org.netlify.app/guide/inject-manifest; workbox-window@7.4.1 (Workbox.js:25 SKIP_WAITING_MESSAGE)
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>
}

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
// Navegação (SPA) cai no index.html pré-cacheado, que casa com os JS/CSS pré-cacheados da mesma versão.
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/__\//, /^\/api\//] }))
clientsClaim()

// Sem skipWaiting automático: o cliente decide quando (D-14).
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})
```
- `workbox-precaching` **não** tipa `__WB_MANIFEST`; a interseção acima é necessária [VERIFIED: grep em workbox-precaching@7.4.1/*.d.ts não acha `__WB_MANIFEST`; `PrecacheEntry` em _types.d.ts:9].
- **Não** registrar nenhuma outra rota: Firestore (`firestore.googleapis.com`), `VITE_BANK_API_URL` (Railway) e o widget do Pluggy são outras origens e seguem direto à rede (D-15). O `denylist` cobre `/__/` (rotas reservadas do Hosting, usadas pelo Auth) e `/api/` por segurança.
- Documentação do Workbox: `cleanupOutdatedCaches()` só remove caches de formato antigo do Workbox; a remoção de arquivos de versões antigas do **próprio** pré-cache acontece sozinha na ativação [CITED: developer.chrome.com/docs/workbox/modules/workbox-precaching]. Manter a chamada (recomendação do plugin).
- Tipagem: `tsconfig.app.json` hoje tem `lib: ["ES2022","DOM","DOM.Iterable"]` e `types: ["vite/client"]`. Criar `tsconfig.sw.json` (`lib: ["ES2022","WebWorker"]`, `include: ["src/sw.ts"]`), excluir `src/sw.ts` do app e referenciar no `tsconfig.json` (usa `tsc -b`). Um teste local mostrou que `DOM` + `WebWorker` no mesmo `lib` compila limpo com `skipLibCheck` [VERIFIED: experimento tsc 5.9 no scratchpad], então a separação é para não vazar globais do worker no código do app, não por erro. Acrescentar `"vite-plugin-pwa/client"` em `types` do app para `virtual:pwa-register` [CITED: vite-pwa-org.netlify.app/frameworks/react].

### Padrão 3: atualização silenciosa (IDEN-04, D-14)

**Como o ciclo de vida do SW ajuda:** o SW novo, depois de instalado, fica `waiting` até todas as janelas do app fecharem; na próxima abertura a navegação já usa o novo [ASSUMED: comportamento padrão da especificação de service workers, não relido nesta sessão]. Logo, "atualizar ao abrir" acontece **de graça** se o app foi fechado. O caso que exige código é o PWA que fica em segundo plano por dias (comum em Android e iOS).

Fatos do pacote (lidos em `dist/client/build/register.js` do 2.0.0):
- Em `prompt`, o evento `waiting` do `workbox-window` chama `onNeedRefresh`; `updateSW()` envia `messageSkipWaiting()` (`{ type: 'SKIP_WAITING' }`) e o listener `controlling` (só `isUpdate`) chama `onNeedReload` se existir, senão `window.location.reload()` [VERIFIED: register.js, trecho `showSkipWaitingPrompt` e `Workbox.js:25,453-457`].
- `onNeedReload` existe nas opções [VERIFIED: vite-plugin-pwa@2.0.0 types/index.d.ts:9], o que permite a **recarga protegida contra laço**.
- O parâmetro de `updateSW(reloadPage)` é ignorado na v2 (`_reloadPage`); a recarga vem do evento `controlling`.
- Heurística do workbox-window: se reconstruir e registrar dentro de 1 minuto, o update pode ser tratado como "externo" e mostrar "offline ready" no lugar de "need refresh" [CITED: vite-pwa-org.netlify.app/frameworks/react]. Só afeta testes manuais seguidos; esperar >1 min entre deploys de teste.

Função pura (testável com `node --test`):
```js
// shared/core/pwaUpdate.js
export const OPEN_WINDOW_MS = 3000
/** @returns {'ativar' | 'esperar' | 'nada'} */
export function decideUpdate({ hasWaiting, msSinceOpen, busy, hidden }) {
  if (!hasWaiting) return 'nada'
  if (hidden) return 'ativar'          // recarga invisível: ninguém está olhando
  if (busy) return 'esperar'           // Sheet/Dialog aberto ou campo em edição
  return msSinceOpen <= OPEN_WINDOW_MS ? 'ativar' : 'esperar'
}
/** @returns {'recarregar' | 'erro'} */
export const decidePreloadError = ({ alreadyReloaded }) => (alreadyReloaded ? 'erro' : 'recarregar')
```
Registro (`src/lib/pwa/registerPwa.ts`), esquema:
```ts
import { registerSW } from 'virtual:pwa-register'
import { decideUpdate, decidePreloadError } from '@shared/core/pwaUpdate.js'

let waiting = false
let openedAt = Date.now()
const evaluate = () => {
  const d = decideUpdate({ hasWaiting: waiting, msSinceOpen: Date.now() - openedAt,
    busy: isBusy(), hidden: document.visibilityState === 'hidden' })
  if (d === 'ativar') { waiting = false; void updateSW(true) }
}
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() { waiting = true; evaluate() },
  onNeedReload() { guardedReload() },            // sessionStorage 'coinc:sw-reload:v1' com carimbo < 10 s: não recarrega
  onRegisteredSW(_url, r) {
    if (!r) return
    setInterval(() => { if (navigator.onLine && !r.installing) void r.update() }, 60 * 60 * 1000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') { openedAt = Date.now(); if (navigator.onLine) void r.update() }
      else evaluate()
    })
  },
})
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault()
  if (decidePreloadError({ alreadyReloaded: sessionStorage.getItem('coinc:recarga:v1') === '1' }) === 'recarregar') {
    sessionStorage.setItem('coinc:recarga:v1', '1'); location.reload()
  } else showBootError()
})
```
- Padrão de verificação periódica e `fetch` condicional do `sw.js`: [CITED: vite-pwa-org.netlify.app/guide/periodic-sw-updates]. Aqui basta `r.update()` (o navegador já refaz a busca do `sw.js` ignorando cache HTTP do script principal [ASSUMED]).
- `vite:preloadError`: o Vite emite o evento quando um `import()` dinâmico falha, `event.payload` traz o erro e `preventDefault()` impede o lançamento; o exemplo oficial recarrega a página [CITED: vite.dev/guide/build#load-error-handling]. **Neste app só existe um `import()` dinâmico** (`src/pages/VintemTestPage.tsx:74`, chunk `selftest-*.js`), e não há `React.lazy`/rotas fatiadas [VERIFIED: grep `lazy(|import(` em src]. Portanto o risco real de "chunk antigo" é pequeno; o que evita tela branca de verdade é a combinação **index.html pré-cacheado ↔ assets pré-cacheados da mesma versão** + **recarga imediata no `controlling`**. Limpar `coinc:recarga:v1` depois de ~10 s de boot saudável.
- Endurecimento opcional (decisão do planejador): script inline pequeno em `index.html` que, se `#root` continuar vazio após ~8 s, mostra um bloco estático "Não foi possível abrir o Coinc / Tentar de novo". Cobre o único caso que `vite:preloadError` não cobre (o bundle principal não carregar).
- `isBusy()`: `Sheet` e `Dialog` já renderizam `role="dialog"` e `aria-modal="true"` [VERIFIED: src/components/ui/sheet.tsx:114-115, dialog.tsx:127-128], então uma consulta ao DOM (`document.querySelector('[role="dialog"][aria-modal="true"]')`) mais "elemento focado é `input`/`textarea`/`select`" cobre o critério do UI-SPEC sem acoplar contextos.
- Em dev (`devOptions.enabled: false`) o SW não registra; em modo MOCK nada muda. Registrar só se `import.meta.env.PROD`.

### Padrão 4: Tema (IDEN-05/06, D-07 a D-10)

**Achado que muda a implementação.** Em Tailwind 4, `@theme inline` com valor literal faz a utilitária usar **o valor**, não a variável. Experimento (Tailwind 4.2.1, scratchpad), com `@theme inline { --color-inl: #111111 }`, `@theme { --color-plain: #222222 }`, `@theme static { --color-stat: #333333 }` e `.dark { --color-inl: #eee; --color-plain: #ddd; --color-stat: #ccc }`:
```
.bg-inl   { background-color: #111111; }          <- .dark NÃO consegue trocar
.bg-plain { background-color: var(--color-plain); } <- troca
.bg-stat  { background-color: var(--color-stat); }  <- troca
.bg-hsl   { background-color: hsl(var(--hx)); }     <- troca (hsl(var(--x)) em inline continua OK)
```
[VERIFIED: experimento local `npx @tailwindcss/cli`]. O mesmo experimento mostrou que uma variável `--color-*` só referenciada por `var(--color-x)` dentro de um `.tsx` (o caso do Recharts) **é emitida** em `:root` mesmo em `@theme` simples. Mesmo assim, para os grupos usados só por `var()` em TS (séries `chart-*`, `--color-chart-axis/grid`, `--color-ele/ela`, `--color-brand/warn`) usar `@theme static` é o seguro, porque variável não referenciada não é gerada [CITED: tailwindcss.com/docs/theme: "By default only used CSS variables will be generated... use the static theme option"].

Regras de implementação:
1. `src/index.css` hoje: `@custom-variant dark (&:where(.dark, .dark *));` já existe (linha 3) e `@theme inline {` (linha 5) mistura tokens `hsl(var(--x))` (podem ficar em `inline`) com hex (`--color-action: #4c513b;` linha 45, `--color-dock: #4c513b;` linha 56, etc.), que **precisam sair** para `@theme` (ou `@theme static`). O bloco `.dark {` atual (linha 168) tem valores azul-acinzentados herdados do shadcn e **deve ser substituído** pelo bloco do UI-SPEC ("Bloco `.dark` para copiar") mais os hex do escuro.
2. A classe `dark` vai em **`<html>`** (não em wrapper): `--color-muted-foreground: hsl(var(--muted-foreground))` está em `@theme inline` e é lida via `var(--color-muted-foreground)` pelo Recharts; ela é avaliada no elemento onde é definida (`:root`), então só vê o `--muted-foreground` do escuro se `.dark` estiver no mesmo elemento [CITED: tailwindcss.com/docs/theme, explicação do `inline`].
3. Tailwind lê o tema pelo `@import "tailwindcss"` em `index.css`; **`tailwind.config.js` é legado inerte** (não há `@config` em `index.css`) [VERIFIED: grep `@config` sem resultado]. Não editar.
4. Camadas: tokens de `@theme` ficam na camada `theme`; `.dark` dentro de `@layer base` vem depois e ganha sem disputa de especificidade (confirmado pelo CSS gerado do experimento: bloco `.dark` aparece após o `:root`).
5. Script inline em `index.html`, **antes de qualquer `<link>`/bundle**, síncrono:
```html
<script>
(function () {
  var pref = 'auto';
  try { pref = localStorage.getItem('coinc:tema:v1') || 'auto'; } catch (e) {}
  var dark = pref === 'escuro';
  if (pref !== 'escuro' && pref !== 'claro') {
    try { dark = window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) {}
  }
  var root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  var m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', dark ? '#0a1510' : '#f5ecdb');
})();
</script>
```
   Padrão equivalente ao recomendado pela documentação ("best to add inline in `head` to avoid FOUC") [CITED: tailwindcss.com/docs/dark-mode]. Falha de `localStorage` cai em automático (o `try` separado preserva o `matchMedia`). Não há CSP no Hosting; se um dia houver, o script inline precisa de hash.
6. `index.html` atual: `color-scheme` = `only light` (linha 10) e `<title>Financias Ratimbum</title>` (linha 11), três metas `Cache-Control/Pragma/Expires`, `<link rel="icon" ... href="/piggy.svg">` (linha 8). Todas mudam (UI-SPEC "Mecânica do tema").
7. `useTheme`: `useSyncExternalStore` sobre `matchMedia('(prefers-color-scheme: dark)')` (mesmo padrão de `src/hooks/useReducedMotion.ts`) + evento `storage`; função pura `resolveTheme(pref, systemDark)` em `shared/core/theme.js`.
8. **Recharts:** nenhum `Tooltip` nem `Legend` do Recharts em `src/components/reports/*` [VERIFIED: grep]; todas as cores são `var(--color-*)` (`COLORS = ['var(--color-chart-1)', ...]`, `TICK = { fontSize: 12, fill: 'var(--color-muted-foreground)' }`, `CartesianGrid stroke="var(--color-chart-grid)"`, `axisLine={{ stroke: 'var(--color-chart-axis)' }}`) [VERIFIED: ComparisonBarChart.tsx:12-14,144-145, CategoryPieChart.tsx:11]. As fatias usam `stroke="none"` (CategoryPieChart.tsx:85); o UI-SPEC pede separar por `--card`: é ajuste pequeno, opcional. Logo, o trabalho de "gráficos no escuro" é **definir os tokens e conferir nas capturas**, não reescrever componentes.
9. Guardas existentes que **quebram de propósito** e precisam ser atualizadas na mesma onda: `test/static/phase3-gaps.test.js:61-64` (exige `color-scheme: only light` no CSS e no HTML) e `test/static/palette-contrast.test.js` (afirma `dock === action` e valores `#4c513b`); o helper `test/static/helpers/palette.js` `tokens()` corta o CSS em `src.indexOf('.dark {')`, então precisa virar `tokens(theme)` lendo o novo bloco `.dark` sobre o claro.

### Padrão 5: Hosting multi-site e redirecionamento (IDEN-01/02, D-03 a D-06)

Estado atual: o projeto tem **um só site**, `financias-ratimbum` [VERIFIED: `firebase hosting:sites:list --project financias-ratimbum` em 2026-11-23]. `https://coinc.web.app` responde **404 "Site Not Found"** [VERIFIED: curl -I]; isso é compatível com "livre", mas **não prova** disponibilidade (site criado e nunca publicado responde igual). A prova é o próprio `firebase hosting:sites:create coinc`; se falhar por ID em uso, D-03 manda parar e perguntar. Regras de ID: rótulo de hostname válido, <= 30 caracteres, único globalmente; o site padrão não pode ser apagado [CITED: firebase.google.com/docs/hosting/multisites].

Comandos (CLI global 15.9.1 já autenticado):
```bash
firebase hosting:sites:create coinc --project financias-ratimbum
firebase target:apply hosting coinc coinc --project financias-ratimbum
firebase target:apply hosting legacy financias-ratimbum --project financias-ratimbum
firebase deploy --only hosting:coinc --project financias-ratimbum
```
`firebase target:apply` grava `targets` em `.firebaserc`, que hoje só tem `projects` (`default`, `ratimbum`, `amigo`) e nenhum `targets` [VERIFIED: .firebaserc]. Comitar o `.firebaserc` atualizado.

`firebase.json` (array; manter `firestore` e `emulators` intactos, pois `test/static/firestore-config.test.js:82` compara `rollback.emulators` com `readJson('firebase.json').emulators`):
```json
"hosting": [
  {
    "target": "coinc",
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }],
    "headers": [
      { "source": "/sw.js", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
      { "source": "/manifest.webmanifest", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
      { "source": "/", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
      { "source": "**/*.html", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
      { "source": "/assets/**", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] }
    ]
  },
  {
    "target": "legacy",
    "public": "hosting-legacy",
    "redirects": [{ "source": "**", "destination": "https://coinc.web.app/?origem=antigo", "type": 302 }]
  }
]
```
- **Regras a apagar** do `firebase.json` atual: `**/*.js` e `**/*.css` com `public, max-age=31536000, immutable` (linhas 44-49 e 53-58); `/sw.js` cairia na primeira [VERIFIED: firebase.json:44-48 `"source": "**/*.js"` ... `"value": "public, max-age=31536000, immutable"`]. A documentação diz que regras casam "na ordem em que são definidas" mas não detalha conflito de chaves [CITED: firebase.google.com/docs/hosting/full-config]; **removendo as regras sobrepostas o problema deixa de existir**, e `/sw.js` nem está sob `/assets/**`. O Hosting aplica 1 hora de cache por padrão quando não há cabeçalho (o exemplo da documentação cita "Overrides the default 1 hour browser cache"), por isso `/sw.js` precisa do `no-cache` explícito.
- `no-store` do `no-cache, no-store, must-revalidate` atual dos HTML impede o cache do navegador mas também o bfcache; `no-cache` basta, porque o SW é quem serve o HTML pré-cacheado. (Recomendação; manter o valor antigo também funciona.)
- Ordem de resposta do Hosting: namespaces reservados `/__/*`, depois **redirects**, depois arquivo estático exato, depois rewrites [CITED: firebase.google.com/docs/hosting/full-config]. Então o `**` do site `legacy` pega tudo antes de qualquer arquivo.
- Redirect: aceita destino absoluto, `type` 301 ou 302, `source` glob ou `regex` [CITED: firebase.google.com/docs/hosting/full-config]. **Recomendação:** subir com `302` e trocar para `301` só depois de o dono entrar com sucesso no endereço novo, porque 301 é guardado pelo navegador por tempo indeterminado e dificulta reverter (D-04 pede "redireciona direto", o que 302 já cumpre). O doc não diz se a query original é anexada; como o destino já tem `?origem=antigo`, conferir com `curl -I "https://financias-ratimbum.web.app/transacoes?x=1"` após o deploy. Opcional: preservar caminho (`/:path*`); o UI-SPEC manda para a raiz, manter.
- Site `legacy` precisa de `public` existente: usar uma pasta versionada `hosting-legacy/index.html` (pasta vazia não entra no git, e `ignore` descarta arquivos que começam com ponto, como `.gitkeep`).
- **Pegadinha do segundo projeto:** `firebase.json` com `target` só funciona se o projeto tiver `targets` aplicados. `--project amigo` (`financias-xrd`, usado por `build:amigo`) **vai falhar** em `deploy --only hosting` até aplicar targets nele, ou até usar outro arquivo (`firebase.amigo.json`). Como a Fase 8 trata o amigo, não bloquear: documentar no plano e, se o amigo ainda faz deploy hoje, aplicar `target:apply hosting coinc <site-do-amigo> --project amigo` [ASSUMED: não verificado como o amigo publica hoje; o README só cita `dev:amigo` e `build:amigo`].
- Cota de Hosting (10 GB, 360 MB/dia) é do projeto inteiro [CITED: STACK.md, firebase.google.com pricing]; o site `legacy` quase não consome.
- Teste antes de apontar o dono: `firebase hosting:channel:deploy preview --only coinc` gera URL temporária para conferir `curl -I` de `/sw.js`, `/manifest.webmanifest` e HTML sem tocar o site vivo [ASSUMED: canais de preview disponíveis no plano Spark].

**Ordem de implantação obrigatória (D-06 + risco de 403):**
1. Adicionar `https://coinc.web.app` a `ALLOWED_ORIGINS` no Railway (lista separada por vírgula; manter a origem antiga até o redirect valer). Sem isso a API responde `403 Origem nao autorizada` [VERIFIED: server/src/auth.js:12-15 `if (origin !== undefined && !origins.includes(origin)) { return res.status(403).json({ error: 'Origem nao autorizada' }) }`; `app.use(cors({ origin: origins }))` em server/src/app.js:34; `app.use('/api', originGuard(origins), requireOwner(verifyToken))` em app.js:77]. A variável é lida só na inicialização (`server/src/index.js:23`), então **a mudança exige reinício** do serviço no Railway [VERIFIED: leitura em tempo de boot, index.js:23].
2. Domínios autorizados do Auth e restrição da chave de API (ver Pegadinhas), ambos no Console.
3. Deploy do site `coinc` e conferência.
4. Só então ativar o redirect do site `legacy`.

### Padrão 6: Onboarding e portão (IDEN-08, D-16 a D-19)

Código atual a mudar:
- `src/components/auth/ProtectedRoute.tsx`: `if (loading) { ...min-h-screen... }` (linha 13), `if (!user) { return <LoginForm /> }` (linha 22). O portão entra entre os dois: `!user` e `onboardingVisto === false` => `<Onboarding mode="first" onFinish={...} />`; depois `LoginForm`. Com `user` e chave ausente, gravar em silêncio (P-05). `localStorage` lançando => tratar como visto.
- `App.tsx` **não muda de estrutura**: `ProtectedRoute` já envolve tudo e fica dentro de `AuthProvider`; o portão é decidido ali, sem nova rota (UI-SPEC: onboarding **não** é rota, é estado do portão). `VintemProvider` e demais providers ficam dentro do `ProtectedRoute` e **não existem** quando o onboarding aparece, então o `Vintem` do onboarding precisa funcionar sem `VintemContext` (confirmar no `Vintem.tsx`: o UI-SPEC o usa `decorative`, sem balão e sem `onTap`).
- `AuthContext` **não precisa mudar** (fluxo de login inalterado). Única exceção: a mensagem de rede. `mapAuthError('auth/network-request-failed')` devolve "Falha de conexao. Verifique sua internet" mas o `LoginForm` mostra sempre `AUTH_FAILED_MESSAGE` fixa; o UI-SPEC S2 resolve isso no formulário (checar `navigator.onLine === false` antes de chamar `signIn`).
- `LoginForm.tsx:65` tem `<h1 ...>Financias Ratimbum</h1>` e importa `PiggyBank` do Lucide; trocar por `CoincMark` + "Coinc". A guarda `phase3-1-login.test.js` proíbe a palavra `gradient` no arquivo (por isso `CoincMark` em arquivo próprio).
- Parâmetro `?origem=antigo`: ler **uma vez no boot** (`main.tsx`), gravar `coinc:origem-antiga` em `sessionStorage`, limpar com `history.replaceState`. **Comparar por igualdade exata** com `'antigo'`; nunca renderizar o valor.
- iPhone: o app adicionado à tela inicial usa armazenamento **separado** do Safari (localStorage e sessão do Firebase não são compartilhados), então quem fez o onboarding no Safari verá o onboarding e o login de novo na primeira abertura do ícone [ASSUMED: comportamento conhecido do WebKit, não confirmado em fonte primária nesta sessão]. A tela 3 em modo standalone já mostra "Você já está usando o Coinc como app" (S4), que cobre isso.
- Ordem de chaves e nomes (todas já definidas no UI-SPEC): `coinc:tema:v1`, `coinc:onboarding:v1`, `coinc:origem-antiga` (sessão), `coinc:recarga:v1` (sessão), `coinc:sw-reload:v1` (sessão, proposta desta pesquisa).

### Padrão 7: Ícones (IDEN-03)

Gerador (v2.0.0): saída vai **na mesma pasta da imagem de origem**; preset `minimal2023Preset` gera `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png` e `favicon.ico` (48) [VERIFIED: dist/presets/minimal-2023.mjs; dist/utils `defaultAssetName`; CLI doc: "All PWA assets will be generated in the same source folder"]. Padrões internos: `transparent` com `padding: .05` e fundo transparente; `maskable` e `apple` com `padding: .3` e fundo `white` [VERIFIED: dist/utils-*.mjs `defaultPngOptions`]. **Isso conflita com o UI-SPEC** (o `any` deve ser a arte inteira sem margem; maskable e apple-touch de borda a borda com a margem já desenhada no SVG). Portanto:
- Config 1 `pwa-assets.config.ts`, imagem `public/icons/icon.svg`: preset customizado `{ transparent: { sizes: [192, 512], padding: 0, favicons: [[48, 'favicon.ico']] } }`.
- Config 2 `pwa-assets.maskable.config.ts`, imagem em **outra pasta** (ex.: `assets-src/maskable/icon-maskable.svg`, fora de `public/`): `{ maskable: { sizes: [512], padding: 0 }, apple: { sizes: [180], padding: 0 } }`; copiar os dois PNGs para `public/icons/`. Pastas diferentes evitam colisão de nomes (`maskable-icon-512x512.png` seria sobrescrito se as duas imagens dividissem pasta).
- Como o fundo do preset é uma cor sólida (`resizeOptions.background`), o degradê só sai porque o **SVG já traz o degradê de borda a borda**; com `padding: 0` o gerador apenas rasteriza. Se a rasterização do degradê falhar, o fallback do UI-SPEC (sharp direto) vale.
- CLI: `npx pwa-assets-generator --config pwa-assets.config.ts` (`-c`) e `--manifest=false` para não imprimir entrada de manifest [VERIFIED: dist/cli.mjs opções `-c`, `-m`]. Rodar manualmente e **commitar os PNGs**; não gerar a cada build (reprodutível e sem sharp no CI).
- O apple-touch precisa ser opaco (iOS pinta transparência de preto); autoteste: ler o PNG e checar canal alfa 255 nos cantos.
- **Dependência de ordem:** o manifest referencia arquivos que precisam existir no build. O portão humano do ícone (sketch 021) não pode bloquear o resto: gerar ícones **provisórios** a partir do Vintém atual para destravar PWA e Hosting, e trocar pelo definitivo depois da escolha do dono (a troca só regenera PNGs).

### Anti-padrões a evitar
- **`registerType: 'autoUpdate'`**: recarrega janelas abertas sem consultar o uso (D-14).
- **`skipWaiting()` incondicional no SW**: mesmo efeito, e ainda troca o SW debaixo de uma página aberta, com `cleanupOutdatedCaches` removendo os arquivos antigos que essa página ainda pode pedir.
- **`@theme inline` com hex para tokens que mudam no escuro**: `.dark` não tem efeito (experimento acima).
- **Classe `dark` em wrapper em vez de `<html>`**: quebra tudo que usa `var(--color-*)` derivado de `hsl(var(--x))` (Recharts).
- **Runtime caching** de qualquer coisa: D-15 e a regra "saldo velho" do projeto.
- **Redirect 301 no primeiro deploy**: irreversível na prática.
- **Gravar a chave do onboarding ao montar** (e não ao Pular/Entrar): contraria P-03.

## Não reinventar

| Problema | Não construir | Usar | Por quê |
|----------|---------------|------|---------|
| Pré-cache versionado e limpeza da versão antiga | Lista própria de arquivos e `caches.open` manual | `precacheAndRoute(self.__WB_MANIFEST)` | Revisão por hash, instalação atômica, remoção na ativação |
| Registro, evento `waiting`/`controlling`, `SKIP_WAITING` | `navigator.serviceWorker` cru | `virtual:pwa-register` (workbox-window) | Casos de borda (atualização externa, primeira instalação) já tratados |
| Manifest e `<link rel="manifest">` | JSON manual e tag manual | Opção `manifest` do plugin | Gera `/manifest.webmanifest` e injeta o link |
| PNGs de ícone | Exportar à mão no editor | `@vite-pwa/assets-generator` (config acima) | Tamanhos e nomes reproduzíveis; falha se a fonte mudar |
| Roteamento SPA no SW | `fetch` handler próprio | `NavigationRoute` + `createHandlerBoundToURL` | Respeita `denylist` e a revisão do `index.html` |
| Tema por media query | Dois conjuntos de classes `dark:` | Troca de variáveis na classe `.dark` | O app **não usa nenhum `dark:`** hoje (grep sem ocorrências) e tem centenas de classes de token |
| Detecção "já é app" | Heurística por tela | `matchMedia('(display-mode: standalone)')` + `navigator.standalone` | Cobre Android e iOS |

**Ideia central:** a parte difícil (ciclo de vida do SW, hash de cache, instalação atômica) já está resolvida pelo Workbox; o que é nosso é só a **política** de quando trocar a versão, e essa política cabe em uma função pura de 6 linhas.

## Armadilhas comuns

### Armadilha 1: `sw.js` preso em cache por regra `**/*.js` imutável
**O que dá errado:** o SW nunca atualiza; o usuário fica numa versão antiga por até um ano.
**Causa:** `firebase.json` atual tem `**/*.js` e `**/*.css` com `immutable` (linhas 44-58).
**Como evitar:** apagar as duas regras; `no-cache` explícito em `/sw.js` e `/manifest.webmanifest`; só `/assets/**` imutável.
**Sinais:** `curl -I https://coinc.web.app/sw.js` mostrando `max-age=31536000` ou `max-age=3600`.

### Armadilha 2: build quebra por limite de pré-cache
**O que dá errado:** `vite build` falha com aviso de `maximumFileSizeToCacheInBytes` (vira erro desde 0.20.2).
**Causa:** `index-*.js` = 1.816.567 bytes, perto de 2 MiB, e as Fases 6 e 7 só crescem.
**Como evitar:** `maximumFileSizeToCacheInBytes: 3 * 1024 * 1024` já na primeira tarefa; vigiar o tamanho.

### Armadilha 3: tema escuro "não pega" nas utilitárias
**Causa:** hex dentro de `@theme inline`. **Evitar:** mover para `@theme`/`@theme static`. **Sinal:** `bg-action` continua verde claro no escuro e o teste de paridade acusa tokens sem equivalente.

### Armadilha 4: tela branca depois de deploy
**Causa possível:** SW novo assume uma página velha e os arquivos antigos já saíram do pré-cache; o Hosting responde o `rewrite` `**` -> `/index.html` (HTML com status 200) a um `/assets/velho.js` inexistente, o navegador rejeita por tipo MIME e o app fica em branco.
**Como evitar:** ativação só pela decisão pura; recarga imediata no `controlling` com guarda contra laço; `vite:preloadError` com uma recarga; opcional o aviso estático se `#root` ficar vazio. **Teste manual de UAT:** publicar versão A, abrir e deixar em segundo plano, publicar B (esperar >1 min), reabrir.

### Armadilha 5: 403 da API no domínio novo
**Causa:** `ALLOWED_ORIGINS` sem `https://coinc.web.app` (lido só no boot do servidor). **Evitar:** passo 1 da ordem de implantação + reinício. **Sinal:** requisições de `VITE_BANK_API_URL` com `403 {"error":"Origem nao autorizada"}` no Console do navegador. Não imprimir todas as variáveis do Railway (têm segredos): editar só `ALLOWED_ORIGINS` pelo painel, ou `railway variables` filtrando, e nunca colar saída bruta.

### Armadilha 6: login falha no domínio novo por restrição da chave de API
**Causa:** se a chave do navegador (`VITE_FIREBASE_API_KEY`) tem restrição de referenciador HTTP no Google Cloud, `coinc.web.app/*` precisa constar [ASSUMED: não verificável sem acesso ao Console; chaves criadas automaticamente pelo Firebase costumam vir sem restrição]. Domínios autorizados do Auth: `signInWithEmailAndPassword` em si não consulta a lista (ela vale para popup/redirect OAuth, links por e-mail e URLs de continuação de redefinição de senha) [ASSUMED: inferência a partir de documentação de fluxos de redirect/e-mail-link; não há página oficial que afirme isso para e-mail e senha]. Mesmo assim D-06 manda incluir: é um clique e evita surpresa quando a redefinição de senha for usada.

### Armadilha 7: splash e barra de status no iPhone
O manifest `background_color` **não** define a tela de abertura no iOS; sem `apple-touch-startup-image` por tamanho de aparelho a abertura aparece em branco até a página pintar, e imagens de abertura por data/blob URL pararam de renderizar a partir do iOS 17.5.1 [CITED: web.dev/learn/pwa/enhancements; bugs.webkit.org/show_bug.cgi?id=280262]. Recomendação: **aceitar a abertura simples** (o script de tema e o CSS pintam rápido) e não gerar splash por aparelho; o UI-SPEC já aceita (P-04). `apple-mobile-web-app-status-bar-style` = `default` (UI-SPEC) mantém a barra opaca; `black-translucent` exigiria `viewport-fit=cover`. O `viewport` atual é `width=device-width, initial-scale=1.0` e o app já usa `env(safe-area-inset-*)` em TopBar, NavRail, Sheet e Toast; sem `viewport-fit=cover` esses insets valem 0. Decisão para o dono olhar no aparelho (UAT), padrão: não adicionar.

### Armadilha 8: instalação no Android e `beforeinstallprompt`
O evento dispara cedo e uma única vez por carga; o UI-SPEC manda registrar o listener em `main.tsx` antes de o React montar e guardar o evento no módulo. Se o `usePwaInstall` só ouvisse depois de montar, perderia o evento.

### Armadilha 9: site antigo com SW ou dados
O site antigo **não tem** service worker nem manifest hoje [VERIFIED: public/ só tem piggy.svg e vite.svg; sem `serviceWorker` em src]. Nada a "desregistrar" ao redirecionar.

### Armadilha 10: `firebase.json` em array e o teste
`firestore-config.test.js` lê `firebase.json` (emulators). Converter só `hosting` e manter o resto. O UI-SPEC cita um "`firebase-config.test.js` atualizado" que **não existe**; criar `test/static/phase5-hosting.test.js` (ou estender o `firestore-config`).

## Inventário de estado de execução (rename)

| Categoria | Itens encontrados | Ação necessária |
|-----------|-------------------|-----------------|
| Dados armazenados | Nenhum dado usa "Ratimbum/Coinki" como chave (Firestore guarda `ownerId` e `hid`). `localStorage` do domínio antigo não migra (D-05). | Nenhuma migração; só aviso no Login |
| Config de serviço vivo | Console do Firebase: domínios autorizados do Auth; possível restrição da chave de API (Google Cloud); Railway: `ALLOWED_ORIGINS` | Edição manual (checkpoint humano) antes do deploy |
| Estado registrado no SO | Nenhum (app web) | Nenhuma |
| Segredos / variáveis | `VITE_FIREBASE_AUTH_DOMAIN` continua o domínio do projeto (`...firebaseapp.com`); nenhum nome de variável muda | Nenhuma alteração de nome. Confirmar que `.env` de produção segue válido |
| Artefatos de build | `dist/` antigo; `public/piggy.svg` e `public/vite.svg` sem uso | Rebuild; remover os dois SVG quando nada referenciar. Ocorrências de texto de interface com nome antigo: `LoginForm.tsx:65`, `index.html:11`; chaves legadas `financias_legacy_user`, `financias_auth` (`legacyAuthCleanup.ts:3-4`) e `coinki:open-alerts` (`AlertsBell.tsx:24`, `LimitAlertNotice.tsx:11`) **ficam** (P-12) [VERIFIED: grep em src, index.html, public] |

Documentos a reescrever (CONTEXT): ROADMAP (Fase 5, critérios 1 a 3), REQUIREMENTS (IDEN-01, 02, 04, 05, 03), PROJECT.md e `.claude/CLAUDE.md` (gerado de PROJECT.md, ainda diz "Coinki"). IDs internos `demo-coinki` em `package.json` (`test:rules`, `test:emu`) são ID de projeto de emulador, não interface: não mudar.

## Exemplos de código

### `.firebaserc` esperado após `target:apply`
```json
{
  "projects": { "default": "financias-ratimbum", "ratimbum": "financias-ratimbum", "amigo": "financias-xrd" },
  "targets": {
    "financias-ratimbum": { "hosting": { "coinc": ["coinc"], "legacy": ["financias-ratimbum"] } }
  }
}
```
(formato gerado por `firebase target:apply`; conferir após rodar [ASSUMED: formato exato do arquivo gerado, comando oficial documentado].)

### Config de ícones (esquema)
```ts
// pwa-assets.config.ts
import { defineConfig } from '@vite-pwa/assets-generator/config'
export default defineConfig({
  preset: { transparent: { sizes: [192, 512], padding: 0, favicons: [[48, 'favicon.ico']] } },
  images: ['public/icons/icon.svg'],
})
```
```ts
// pwa-assets.maskable.config.ts
import { defineConfig } from '@vite-pwa/assets-generator/config'
export default defineConfig({
  preset: { maskable: { sizes: [512], padding: 0 }, apple: { sizes: [180], padding: 0 } },
  images: ['assets-src/maskable/icon-maskable.svg'],
})
```
`defineConfig` e `minimal2023Preset` são exportados de `@vite-pwa/assets-generator/config` [VERIFIED: dist/config.mjs linha de export]. Se a forma `preset` com chaves parciais não passar na tipagem, partir de `{ ...minimal2023Preset, ... }`.

### `<head>` final (esquema; valores do UI-SPEC)
```html
<meta charset="UTF-8" />
<script>/* tema: ver Padrão 4 */</script>
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" href="/favicon.ico" sizes="48x48" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180x180.png" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light dark" />
<meta name="theme-color" content="#f5ecdb" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="Coinc" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<title>Coinc</title>
```
O plugin injeta o `<link rel="manifest">` no build.

## Estado da arte

| Antigo | Atual | Impacto |
|--------|-------|---------|
| `vite-plugin-pwa` 0.x com `generateSW` | 2.0.0 (2026-10-03) com `injectManifest` e `onNeedReload` | Controle fino da recarga; peer `workbox-* ^7.4.1` |
| Service worker de FCM separado (`firebase-messaging-sw.js`) | Um só `sw.ts` | Fase 7 reaproveita o `sw.ts`; manter o arquivo pronto para receber o handler de push |
| Tema por `prefers-color-scheme` direto no CSS | Classe `.dark` + `@custom-variant dark` + script inline | Permite forçar claro/escuro (D-08) |

**Obsoleto:** `tailwind.config.js` neste projeto (Tailwind 4 não o lê sem `@config`); `<meta http-equiv="Cache-Control">` (o cabeçalho HTTP do Hosting é a fonte).

## Registro de premissas

| # | Afirmação | Seção | Risco se errada |
|---|-----------|-------|-----------------|
| A1 | SW em `waiting` ativa sozinho na próxima abertura quando todas as janelas fecharam | Padrão 3 | Baixo: o gatilho `hidden` e a avaliação na abertura cobrem o resto |
| A2 | O navegador revalida o `sw.js` principal ignorando o cache HTTP | Padrão 3 | Baixo: `no-cache` explícito no Hosting cobre |
| A3 | `signInWithEmailAndPassword` não consulta os domínios autorizados | Armadilha 6 | Baixo: D-06 já manda incluir o domínio |
| A4 | A chave de API do navegador pode ter restrição de referenciador | Armadilha 6 | Médio: login falha no domínio novo até ajustar no Console |
| A5 | iOS não compartilha localStorage/sessão entre Safari e o app da tela inicial | Padrão 6 | Baixo: apenas decide se o onboarding reaparece |
| A6 | Abertura simples no iOS (sem imagens de splash) é aceitável | Armadilha 7 | Baixo: estético; dono confere no UAT |
| A7 | `viewport-fit=cover` é desnecessário com status bar `default` | Armadilha 7 | Baixo: estético |
| A8 | Canais de preview do Hosting funcionam no Spark | Padrão 5 | Baixo: usar conferência em produção com redirect desligado |
| A9 | O amigo (`--project amigo`) não depende do `hosting` do `firebase.json` hoje | Padrão 5 | Médio: deploy dele quebra até aplicar targets |
| A10 | 302 antes de 301 é preferível para o redirect | Padrão 5 | Baixo: decisão de reversibilidade |
| A11 | Formato exato do `.firebaserc` gerado por `target:apply` | Exemplos | Baixo |
| A12 | `Content-Type` do `.webmanifest` no Hosting é aceito pelo Chrome | Validação | Baixo: conferir por `curl -I` |

## Perguntas em aberto

1. **O ID `coinc` está livre?**
   - Sabemos: `https://coinc.web.app` dá 404 "Site Not Found" e o projeto só tem o site padrão.
   - Falta: só `hosting:sites:create` confirma.
   - Recomendação: primeira tarefa de infraestrutura; se falhar, **parar e perguntar ao dono** (D-03).
2. **Como o amigo publica hoje (`financias-xrd`)?**
   - Falta confirmar se ele usa este `firebase.json`.
   - Recomendação: tratar como nota no plano; não bloquear (Fase 8).
3. **Restrição de referenciador na chave de API e lista de domínios do Auth.**
   - Só o Console responde; checkpoint `human-action` antes do deploy.
4. **Política de recarga em segundo plano no iOS.**
   - Páginas ocultas podem ser congeladas antes do `location.reload()`; o efeito é só a troca ocorrer na abertura seguinte. Validar no UAT com iPhone real.

## Disponibilidade de ambiente

| Dependência | Necessária para | Disponível | Versão | Alternativa |
|-------------|-----------------|-----------|--------|-------------|
| Node | build, testes | Sim | v22.23.5 (atende Vite 7, plugin `>=20.19`, servidor `>=22.23.4`; Dockerfile usa `node:22.23.5-slim`) | — |
| npm | instalação | Sim | 10.9.9 | — |
| Firebase CLI | sites, targets, deploy | Sim, autenticado | 15.9.1 global (`hosting:sites:list` funcionou) | — (não instalar `firebase-tools` 15.37.0: SUS "too-new") |
| Chrome | auditoria CDP (`scripts/ux-audit`) | Sim | `/usr/bin/google-chrome` (padrão de `cdp.mjs`) | `CHROME_BIN` |
| curl | conferir cabeçalhos | Sim | — | — |
| Railway CLI | `ALLOWED_ORIGINS` | Instalado (`/usr/local/bin/railway`), login não verificado | — | Painel do Railway (preferido, evita listar segredos) |
| Dispositivo Android e iPhone reais | UAT (instalação, maskable, splash, tema) | Não verificável aqui | — | Emulação do Chrome DevTools só cobre o manifest; **UAT do dono é obrigatório** |
| gcloud | restrição da chave de API | Não | — | Console do Google Cloud (manual) |

**Bloqueantes sem alternativa:** nenhum.
**Com alternativa:** Railway e Console exigem passo humano; aparelhos reais só pelo dono.

## Arquitetura de validação

### Framework de teste
| Propriedade | Valor |
|-------------|-------|
| Framework | `node:test` (Node 22.23.5): guardas estáticas em `test/static`, núcleo em `shared/core` |
| Arquivo de configuração | nenhum (scripts do `package.json`) |
| Comando rápido | `node --test test/static/phase5-*.test.js` e `npm run test:core` |
| Suíte completa | `npm run test:static && npm run test:core && npm run build` |
| Linha de base | `npm run test:static`: 449 testes, 447 passam, 2 ignorados, ~1 s [VERIFIED: execução em 2026-11-23] |

Vitest **não está instalado** no projeto (o STACK o planeja para outras fases); esta fase **não precisa dele**: a lógica pura vai em `shared/core/*.js` e o resto é guarda estática ou auditoria CDP.

### Requisito -> teste
| Req | Comportamento | Tipo | Comando automatizado | Arquivo existe? |
|-----|---------------|------|----------------------|-----------------|
| IDEN-01 | Nenhum `Ratimbum`/`Financias`/`Coinki` em interface; título e manifest "Coinc" | estático | `node --test test/static/phase5-identity.test.js` | ❌ Wave 0 |
| IDEN-01 | Site `coinc` existe e responde com a casca | manual/curl | `firebase hosting:sites:list` + `curl -I https://coinc.web.app` | manual |
| IDEN-02 | `firebase.json` com alvo `legacy` e redirect para `https://coinc.web.app/?origem=antigo`; targets no `.firebaserc` | estático | `node --test test/static/phase5-hosting.test.js` | ❌ Wave 0 |
| IDEN-02 | Redirecionamento real e `ALLOWED_ORIGINS` | manual/curl | `curl -sI https://financias-ratimbum.web.app/` (esperar `location:`); chamada à API do domínio novo sem 403 | manual |
| IDEN-03 | Manifest gerado: nome, `lang`, `display`, 192/512 `any` e 512 `maskable` separados; arquivos existem com as dimensões declaradas; apple-touch opaco | estático sobre `dist/` | `npm run build && node --test test/static/phase5-manifest.test.js` | ❌ Wave 0 |
| IDEN-03 | Tela com passos e folha em Ajustes | estático + CDP | `node --test test/static/phase5-onboarding.test.js`; `node scripts/ux-audit/audit.mjs --route /configuracoes` | ❌ Wave 0 |
| IDEN-03 | Instalar e abrir em tela cheia com ícone próprio | manual (UAT) | Android Chrome real e iPhone Safari real | manual |
| IDEN-04 | `decideUpdate` (abertura <= 3 s sem uso ativa; em uso espera; `hidden` ativa; sem `waiting` não faz nada) e `decidePreloadError` (1 recarga, depois erro) | unitário | `node --test shared/core/pwaUpdate.test.js` | ❌ Wave 0 |
| IDEN-04 | `sw.ts` sem `skipWaiting` automático, com `SKIP_WAITING`, sem `registerRoute` de dados; `registerType: 'prompt'`; limite de pré-cache | estático | `node --test test/static/phase5-sw.test.js` | ❌ Wave 0 |
| IDEN-04 | Cabeçalhos: `/assets/**` imutável; `/sw.js`, `/manifest.webmanifest`, HTML `no-cache`; sem regra `**/*.js` nem `**/*.css` imutável | estático + curl | `phase5-hosting.test.js`; após deploy `curl -sI https://coinc.web.app/sw.js` | ❌ Wave 0 |
| IDEN-04 | Deploy A -> B sem tela branca e sem trocar no meio de um lançamento | manual (UAT) | procedimento da Armadilha 4 | manual |
| IDEN-05 | `resolveTheme(pref, systemDark)`; script inline aplicado com `localStorage` semeado (executar o script do `index.html` em `node:vm` com `localStorage`/`matchMedia` falsos) | unitário | `node --test shared/core/theme.test.js test/static/phase5-theme.test.js` | ❌ Wave 0 |
| IDEN-05 | `index.html` sem `only light`, com `color-scheme` `light dark`, script antes do bundle, um só `theme-color` | estático | `phase5-theme.test.js`; atualizar `phase3-gaps.test.js:61-64` | ⚠ atualizar |
| IDEN-06 | Paridade `.dark`; contraste dos 101 pares nos dois temas; hierarquia de superfícies; Vintém nos dois temas | estático | `node --test test/static/palette-contrast.test.js` (reescrito com `tokens(theme)`) | ⚠ atualizar |
| IDEN-06 | Todas as rotas e sobreposições nos dois temas a 360x640 e 390x844 | CDP | `node scripts/ux-audit/theme.mjs` | ❌ Wave 0 |
| IDEN-08 | 3 telas, "Pular" nas três, chave só em Pular/Entrar, `replay` não grava, Vintém montado uma vez e `decorative`, estados `neutro/atento/feliz`; `LoginForm` sem `gradient` e com `CoincMark` | estático | `node --test test/static/phase5-onboarding.test.js test/static/phase3-1-login.test.js` | ❌ Wave 0 (login existe) |
| IDEN-08 | Layout sem rolagem horizontal; alvos >= 43,5 px; foco no `h1` | CDP | `node scripts/ux-audit/audit.mjs --routes all --viewport 360x640` com o onboarding acrescentado | ⚠ ajustar |
| Sketch do ícone | Autoteste do sketch termina em `FALHAS 0` | autoteste do HTML | abrir `.planning/sketches/021-icone-app/index.html?test` (CDP) | ❌ Wave 0 |

### Taxa de amostragem
- **Por commit de tarefa:** `node --test test/static/phase5-*.test.js` e o `.test.js` de `shared/core` tocado (menos de 2 s).
- **Por onda:** `npm run test:static && npm run test:core && npm run build` (o build valida limite de pré-cache e gera `sw.js`/manifest).
- **Portão da fase:** suíte completa verde + `theme.mjs` + `curl -I` dos cabeçalhos + UAT do dono em Android e iPhone antes de `/gsd-verify-work`.

### Lacunas da Wave 0
- [ ] `shared/core/pwaUpdate.js` e `.test.js`; `shared/core/theme.js` e `.test.js`
- [ ] `test/static/phase5-{identity,hosting,manifest,sw,theme,onboarding}.test.js`
- [ ] `test/static/helpers/palette.js`: `tokens(theme)` e `PAIRS` nos dois temas (quebra de `palette-contrast.test.js` e `phase3-gaps.test.js:61-64` é **intencional**, atualizar na mesma tarefa)
- [ ] `scripts/ux-audit/theme.mjs` (CDP) e inclusão do onboarding/BootError nas rotas de auditoria
- [ ] `.planning/sketches/021-icone-app/index.html` com autoteste
- [ ] Instalar: `npm install -D ...` (portão `human-verify` do UI-SPEC)

## Domínio de segurança

Aplicável (`security_enforcement` ativo, ASVS nível 1).

### Categorias ASVS aplicáveis
| Categoria ASVS | Aplica | Controle padrão |
|----------------|--------|-----------------|
| V2 Autenticação | sim (origem nova) | Firebase Auth inalterado; chave de API/domínios conferidos no Console |
| V3 Sessão | sim | Sessão por origem; o login é refeito uma vez (D-05); nada de token em `localStorage` próprio |
| V4 Controle de acesso | não muda | Rules do Firestore e `requireOwner` (token) intocados |
| V5 Validação de entrada | sim | `?origem=` comparado por igualdade exata e nunca renderizado; valores de `localStorage` (`coinc:tema:v1`) validados contra o conjunto fechado `auto/claro/escuro` |
| V6 Criptografia | não | Nada novo |
| V14 Configuração | sim | Cabeçalhos do Hosting, lista fechada de origens (`ALLOWED_ORIGINS`), sem cache de dados no SW |

### Ameaças conhecidas para esta pilha
| Padrão | STRIDE | Mitigação padrão |
|--------|--------|------------------|
| Open redirect no site antigo | Spoofing | Destino **estático** no `firebase.json`; nenhum parâmetro vira destino |
| SW servindo dado financeiro velho ou de outro usuário | Information disclosure | Somente pré-cache da casca e `NavigationRoute`; nenhum `registerRoute` de runtime; Firestore e API em outras origens ficam fora do SW |
| Troca de usuário no mesmo aparelho vendo cache do anterior | Information disclosure | Cache só tem arquivos públicos do build (sem dado de usuário) |
| Origem não autorizada chamando a API | Elevation of privilege | `originGuard` + `cors` com lista fechada e `requireOwner` (token Firebase) [VERIFIED: server/src/auth.js, app.js:34,77] |
| SW malicioso por XSS | Tampering | `sw.js` só do mesmo domínio; HTML sem `dangerouslySetInnerHTML` novo; manter conteúdo sempre como texto React |
| Chave de API do Firebase exposta | Information disclosure | É pública por desenho; proteção real são Rules + Auth; restrição de referenciador é defesa extra |

## Fontes

### Primárias (confiança ALTA)
- Código do pacote `vite-plugin-pwa@2.0.0` (tarball lido): `dist/client/build/register.js`, `dist/index.d.ts` (`injectRegister`, `registerType`, `showMaximumFileSizeToCacheInBytesWarning`), `types/index.d.ts` (`onNeedReload`)
- Código de `workbox-window@7.4.1` (`Workbox.js:25,453-457`), `workbox-precaching@7.4.1` e `workbox-routing@7.4.1` (tipos)
- Código de `@vite-pwa/assets-generator@2.0.0` (`dist/presets/minimal-2023.mjs`, `dist/utils-*.mjs`, `dist/cli.mjs`)
- npm registry (`npm view`) e `gsd-tools query package-legitimacy check` em 2026-11-23
- Experimentos locais: Tailwind 4.2.1 (`@theme inline` vs `@theme` vs `@theme static` com `.dark`) e `tsc` 5.9 (DOM + WebWorker)
- Firebase: Hosting full-config e multisites (firebase.google.com/docs/hosting/full-config, /multisites); `firebase hosting:sites:list` e `curl -I` reais
- Arquivos do repositório lidos nesta sessão: `firebase.json`, `.firebaserc`, `index.html`, `vite.config.ts`, `package.json`, `src/index.css`, `src/App.tsx`, `src/main.tsx`, `ProtectedRoute.tsx`, `AuthContext.tsx`, `LoginForm.tsx`, `server/src/{auth,app,index}.js`, `Dockerfile`, testes estáticos

### Secundárias (confiança MÉDIA)
- vite-pwa-org.netlify.app (guias inject-manifest, auto-update, prompt-for-update, periodic-sw-updates, frameworks/react, assets-generator/cli), lidos por resumidor
- developer.chrome.com/docs/workbox/modules/workbox-precaching, vite.dev/guide/build, tailwindcss.com/docs/{theme,dark-mode}, lidos por resumidor

### Terciárias (confiança BAIXA, a validar)
- Busca web sobre splash/status bar do iOS (web.dev/learn/pwa/enhancements; bugs.webkit.org/show_bug.cgi?id=280262; fóruns Apple/Discourse): nenhuma fonte primária atual para iOS 18+
- Busca web sobre domínios autorizados do Auth (inferência)

## Metadados

**Detalhamento de confiança:**
- Pilha padrão: ALTA (versões, peers e tipos lidos no registro e no tarball)
- Arquitetura (SW, tema, Hosting): ALTA (comportamento do plugin e do Tailwind comprovado por leitura de código e experimento)
- Armadilhas de iOS, Console do Google e Railway: MÉDIA/BAIXA (dependem de verificação manual)

**Data da pesquisa:** 2026-11-23
**Válido até:** 2026-12-23 (vite-plugin-pwa e Workbox estáveis; reconferir `npm view` se o `npm install` for adiado)

## PESQUISA CONCLUÍDA

**Fase:** 5 - Identidade Coinc, PWA e onboarding
**Confiança:** ALTA (infra e build) / MÉDIA (iOS e itens de Console)
