# Phase 7: Push e Vintém com IA - Research

**Researched:** 2026-11-25
**Domain:** Web Push (FCM com FID, PWA no iPhone) + comentários do mascote por LLM gratuito (servidor Express no Railway, Firestore Spark)
**Confidence:** MEDIUM (push: HIGH nos tipos e no código lidos; IA: MEDIUM nos limites e termos, LOW em "qual modelo aceita palavrão pesado", que só o teste do dono resolve)

> Como ler as etiquetas: `[VERIFIED: caminho:linhas]` = abri o arquivo nesta sessão e o trecho entre aspas está literal; `[CITED: url]` = página oficial lida hoje, em geral por resumidor (WebFetch), então MEDIUM; `[ASSUMED]` = conhecimento prévio ou fonte de terceiros, precisa de confirmação. Fontes de terceiros estão marcadas como tal.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Quando o Vintém usa IA**
- **D-01:** O Vintém tenta a IA em **quase toda fala** (reações a lançamento, limite, fim de sync, abrir o app no dia), sempre com o banco de frases da Fase 4 como reserva imediata. A IA nunca bloqueia a fala.
- **D-02:** Como quase toda fala consome cota, o cache por situação (~24h, chave dono + mês + hash da situação, com percentuais em faixas de 5 pontos) e o freio global do provedor são obrigatórios, não opcionais.

**Teto da IA**
- **D-03:** O dono pediu "sem limite". Decisão: **teto alto e invisível**, 100 falas por pessoa por dia, configurável no servidor (padrão 100). Ao bater o teto, ou quando a cota grátis do provedor acabar, o Vintém usa o banco de frases sem nenhum aviso ao usuário. Cumpre o IA-01 e protege o plano grátis (Cloudflare ~250 a 300 chamadas/dia no total).
- **D-04:** Espera máxima de 4 s por chamada; falha, timeout, 429 ou validação reprovada caem no próximo provedor e depois no banco de frases.

**O que o Vintém fala e como (IA)**
- **D-11:** Assuntos, todos os quatro: o gasto que acabou de lançar (citando loja ou categoria), limites e ritmo do mês, **padrões e comparações** (frequência, "terceira vez no iFood esta semana", comparação com o mês passado) e entradas, metas e porquinho. O Vintém tem que **analisar tudo e entender padrões engraçados**, comentando e alfinetando.
- **D-12:** **Fala espontânea, sem gatilho**: mistura de três formas: (a) ao abrir o app, de 1 a 3 vezes por dia, no máximo uma por abertura e sem repetir o assunto no mesmo dia; (b) solta, espiando enquanto o usuário usa o app, de vez em quando; (c) notificação push espontânea, no máximo 1 por dia, respeitando os tipos e o silêncio que o usuário configurar. As frequências exatas ficam ajustáveis por configuração do servidor.
- **D-13:** **Personalidade: sem filtro de verdade.** Palavrão pesado, deboche, "toma no cu porque está fazendo merda", cobrar que melhore em tal e tal coisa, apelidos como "baleia", "tudo que for preciso". O dono pediu isso explicitamente, e o app é só do casal.
- **D-14:** **Travas mantidas** (única exceção ao sem filtro): xinga o **comportamento** e o gasto, nunca discrimina por raça, orientação, religião ou grupo; e **nunca fala de Ele para Ela nem de Ela para Ele**: cada pessoa só recebe fala sobre os próprios gastos e o que é do casal (Porquinho). A trava de aperto grave (tom sério quando houver sinal de dívida perigosa) **não** foi escolhida e não entra.
- **D-15:** **Tamanho varia por situação:** curta (1 frase, até ~140 caracteres) no dia a dia e na notificação; mais longa (até ~2 frases) em estouro de limite, resumo da semana e padrões notados.
- **D-16:** **O que a IA pode saber:** o dono quer acesso a "tudo". Entra um **resumo montado no servidor**: totais e valores exatos por categoria, frequência dos gastos, o que mais está gastando, tendência contra o mês passado, limites e % usado, entradas, metas, porquinho, contas fixas, fatura do cartão, e nomes de lojas. Continua proibido enviar CPF, número de conta ou cartão, e nome de pessoa (Pix para pessoa vira rótulo genérico como "uma pessoa"). Quem monta o resumo é o servidor, nunca o cliente. O dono aceitou que os provedores gratuitos possam guardar e treinar com o que recebem (PROJECT.md).

**Modelo e provedor**
- **D-17:** **Grátis primeiro, trocar se recusar.** Ordem de partida: Cloudflare Workers AI e/ou Groq (a ordem e o modelo exato são decididos na pesquisa/implementação, relendo na data limites, modelos grátis e termos de dados, porque as fontes da pesquisa de 2026-11-25 divergem). Se o modelo se recusar a xingar, vier mansinho demais, falhar, estourar o limite ou demorar, cai no próximo provedor e depois no banco de frases. Grok só entra se algum crédito grátis for confirmado; pago não entra por padrão (PROJECT.md: rodar de graça).
- **D-18:** A pesquisa da fase deve incluir um **teste lado a lado** do mesmo resumo nos modelos candidatos, no tom sem filtro, para o dono escolher qual soa como o Vintém; e medir a taxa de recusa de palavrão por modelo.

**Texto e momento dos avisos**
- **D-05:** O texto da notificação na tela de bloqueio usa o **tom sem filtro** (frase do Vintém com deboche), **sem valores e sem nomes de lojas**. O dono aceitou que quem olhar o celular leia o palavrão. As frases dos avisos vêm do banco de frases por tom (Fase 4), não da IA, para o texto de tela de bloqueio ser previsível e nunca ter dado financeiro.
- **D-06:** Padrão de partida: **sem horário de silêncio e os três tipos ligados** (80% do limite, estouro de 100% e fatura perto de vencer). O usuário escolhe os tipos e define o silêncio nas Configurações (PUSH-03).
- **D-07:** Cada evento gera uma única notificação, com marcador por categoria e mês que sobrevive a reinício do servidor (PUSH-04).

**Ativar avisos e estados**
- **D-08:** O botão de ativar fica **só em Configurações** (cartão Notificações), sem convite na Home e sem tela na primeira abertura. O cartão mostra os cinco estados: não suportado, app não instalado, negado, ativo e inscrição perdida. No iPhone fora do app instalado, mostra o passo a passo de adicionar à tela de início (PUSH-01, PUSH-05).

**Privacidade da IA (já decidido antes, mantido)**
- **D-09:** A IA recebe totais por categoria e nomes de lojas; nunca CPF, número de conta ou cartão, nem nome de pessoa (Pix para pessoa vira rótulo genérico). Saída validada (tamanho, texto simples, idioma) antes de aparecer.
- **D-10:** Provedor trocável por configuração do servidor (Cloudflare Workers AI padrão; Groq e Grok candidatos). A escolha final relê, na data, termos de uso de dados e limites, e registra os termos; nenhuma cota fixa no código.

### Claude's Discretion
- Algoritmo de ordem de tentativa entre provedores, formato exato do prompt, faixa de tamanho da frase e validação de idioma.
- Estrutura das coleções de inscrições push e dos marcadores de evento; texto exato do passo a passo do iPhone.

### Deferred Ideas (OUT OF SCOPE)
- **Distinção melhor de configurações por perfil** (tom, avisos, o que cada pessoa vê): o dono quer tratar em uma fase própria. Hoje o tom é um só do casal (Fase 4, D-10b) e os avisos são por usuário.
- Trava de tom sério para aperto financeiro grave: não escolhida agora; pode voltar na fase de configurações por perfil.
- Convite do Vintém na Home para ativar avisos, e tela de convite na primeira abertura: descartados por ora (decisão D-08).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PUSH-01 | Usuário ativa notificações no celular e vê o estado (não suportado, app não instalado, negado, ativo, inscrição perdida) | Seção "Push no cliente": `register()`/`onRegistered()` (typings lidos), função pura `pushState`, passo a passo do iPhone, `GET /api/push/status` para detectar "inscrição perdida" |
| PUSH-02 | Usuário recebe notificação ao chegar a 80% e ao passar de 100% de um limite, e quando uma fatura está perto de vencer | `thresholdsToFire` + `buildBudgetView` reutilizados no servidor; regra de fatura com `groupBills`; gatilhos: `POST /api/limits/check`, pós-sync/webhook, tick horário |
| PUSH-03 | Usuário escolhe quais tipos de notificação quer e os horários de silêncio | `pushPrefs/{uid}` via rotas do servidor, função pura `isQuiet` testada em dois fusos |
| PUSH-04 | Cada evento gera uma única notificação, sem duplicar quando o servidor reinicia, e o texto da tela de bloqueio não mostra valores nem nomes de lojas | Marcador `pushEvents/{id}` criado com `create()` (atômico, persiste), banco de frases de push sem encaixes numéricos (D-05) |
| PUSH-05 | O push funciona em um iPhone real com o app instalado | Handler `push` próprio no `src/sw.ts` que SEMPRE chama `showNotification` (evita a revogação por push silencioso), rota "Testar aviso", roteiro de teste no aparelho (só o dono) |
| IA-01 | O Vintém comenta os gastos com frases geradas por uma IA gratuita, chamada pelo servidor com o token do usuário, com limite diário por usuário e cache | `POST /api/vintem/fala` atrás de `requireOwner`, contador em `aiUsage`, cache em `aiCache` com variantes |
| IA-02 | A IA recebe totais por categoria e nomes de lojas, e nunca CPF, números de conta ou cartão, nem nomes de pessoas (Pix para pessoa vira um rótulo genérico) | Resumo montado no servidor, só com dados da pessoa do token, filtro de privacidade em camadas (`aiPrivacy.js`) |
| IA-03 | Os comentários seguem o tom escolhido (inclusive sem filtro) e são validados antes de aparecer, exibidos como texto simples | Validador de saída próprio (`aiValidate.js`), prompts por tom, teste lado a lado |
| IA-04 | Quando a IA falha, passa do limite ou demora, o Vintém usa o banco de frases sem o usuário perceber erro | Cadeia provedor 1, provedor 2, banco de frases; cliente com prazo próprio e resposta `text: null` |
| IA-05 | O provedor de IA é trocável por configuração do servidor, com Cloudflare, Groq e Grok como candidatos, e a escolha registra os termos de uso de dados na data | Adaptador OpenAI-compatível único, `AI_PROVIDERS` por variável de ambiente, registro de termos desta data na seção "Registro de termos de dados" |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Diretrizes de `./CLAUDE.md` e `.claude/CLAUDE.md` que a fase deve cumprir (mesma autoridade das decisões travadas):

- Interface em pt-BR; sem emoji em texto de interface; textos com acento.
- **Chaves de IA e push só no servidor**; o servidor deriva `ownerId` (`hid`) do ID token verificado, nunca do corpo; todo `query` do Admin SDK precisa filtrar `ownerId` explicitamente (o Admin SDK ignora as regras).
- **Privacidade da IA:** só totais por categoria e nomes de lojas; nunca CPF, número de conta/cartão, nome de pessoa física.
- **Custo zero:** Firebase Spark, Railway, IA gratuita. Sem Cloud Functions, sem Firestore triggers (só Blaze).
- **Service worker único** (`src/sw.ts`, `injectManifest`); sem segundo worker `firebase-messaging-sw.js`; passar `serviceWorkerRegistration` ao `register()`.
- FCM pelo fluxo FID (`register()`/`onRegistered()`) e `fid` no Admin SDK; não misturar com `getToken()` na mesma instância.
- LLM: adaptador `fetch` simples; ids de provedor e modelo em configuração do servidor, nunca no código; cache em Firestore com `Map` em processo na frente; saída validada; nunca bloquear a tela esperando o LLM; fallback no banco de frases.
- Nada de runtime caching de `/api` ou Firestore no SW (já respeitado: `src/sw.ts` só pré-cacheia a casca).
- Antes de editar arquivos, o trabalho entra por um comando GSD (esta pesquisa já está dentro do fluxo `/gsd-plan-phase`).
- Comandos do projeto: `npm run test:core`, `test:core:tz`, `test:server`, `test:static`, `test:rules`, `test:emu`, `build` (`tsc -b` + Vite), `lint`.

## Summary

**Push.** O FCM com FID está maduro no `firebase` 13.4.0 instalado: `register()`, `onRegistered()`, `onUnregistered()`, `unregister()` e a opção `serviceWorkerRegistration` existem nos typings e o `register()` já pede a permissão sozinho quando ela está em `default`. O Admin SDK 14.5.1 instalado aceita `fid` e devolve o erro `installation-id-not-registered` para FID morto. O ponto crítico que nenhum doc de início rápido avisa: **o SDK do FCM dentro do service worker não mostra notificação quando existe uma janela visível** (ele repassa o push à página e retorna), e no iPhone um push sem notificação visível conta como "silencioso" e a assinatura é revogada (regra do WebKit, issue 8010 do firebase-js-sdk com o mesmo sintoma). Como o gatilho principal é "o usuário acabou de lançar um gasto no app aberto", o desenho padrão do FCM falha justamente no caminho mais comum. A recomendação é escrever o tratador `push` direto em `src/sw.ts` (sem importar `firebase/messaging/sw`), que **sempre** chama `showNotification`, com `tag` fixa por evento e `silent: true` quando há janela em foco. Isso também elimina a necessidade de configurar o Firebase dentro do worker.

**Servidor.** Tudo cabe no Express existente: rotas autenticadas por `requireOwner`, marcador de evento por `create()` do Firestore (atômico, sobrevive a reinício), preferências por usuário gravadas pelo servidor (as regras do Firestore não mudam: coleções novas ficam fechadas por padrão), e um "notificador" chamado por três portas (rota de checagem, fim de sync/webhook, tick horário). A conta de limites reaproveita `buildBudgetView` + `thresholdsToFire` de `shared/core`, exatamente a matemática do cliente. O risco real é a **cota de leitura do Spark (50 mil/dia)**: cada fala de IA com resumo completo lê o ciclo atual e o anterior; sem cache de snapshot, 100 falas por pessoa por dia estouram a cota. O desenho exige snapshot em memória com TTL e cache do ciclo anterior por horas.

**IA.** Cloudflare Workers AI continua sendo o primeiro da fila: 10.000 Neurons/dia grátis, sem treino com o conteúdo e sem retenção (página oficial lida hoje), endpoint OpenAI-compatível, e o modelo `llama-3.3-70b-instruct-fp8-fast` está no catálogo sem marca de "somente pago". Com um resumo rico (~1.500 tokens de entrada e ~80 de saída) o 70B rende só ~177 chamadas/dia para o app inteiro; modelos menores (Gemma 4 26B: ~632/dia, Llama 3.1 8B: ~1.115/dia) cabem folgados. Groq existe como fallback, mas **os limites do plano grátis não são verificáveis sem o console do dono** (a página oficial mostra a tabela "Developer" e manda olhar `console.groq.com/settings/limits`). **Grok/xAI: nenhum crédito grátis confirmado** nas páginas oficiais lidas (cobrança, preços, limites); só blogs de terceiros falam em "US$ 150/mês por compartilhar dados", com gasto prévio de US$ 5 e conflito de datas, então fica fora por padrão (D-17). Sobre "qual modelo aceita palavrão pesado": **não existe fonte autoritativa nem comparação pública em pt-BR**; a literatura achada indica que gpt-oss recusa muito. Por isso a pesquisa entrega o teste lado a lado (script do dono, chaves só no ambiente dele) em vez de um palpite.

**Primary recommendation:** construir em duas trilhas independentes: (A) push com handler `push` próprio e marcador `create()`; (B) IA com adaptador `fetch` único, resumo montado no servidor só com dados da pessoa do token, validador de saída próprio (não reusar a régua do banco de frases, que proíbe ofensas que a D-13 permite), cache com várias variantes por situação e cadeia de fallback até o banco de frases; e **rodar o script de comparação antes de fixar o modelo padrão** (checkpoint humano).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Pedir permissão, registrar FID, mostrar os 5 estados | Browser / Client | API / Backend (status do FID) | Permissão e `PushManager` só existem no navegador; "inscrição perdida" só se sabe comparando com o servidor |
| Exibir a notificação, tratar clique | Browser (service worker) | — | Só o SW recebe o evento `push`; precisa sempre chamar `showNotification` (regra do iOS) |
| Decidir se um limite/fatura gera aviso | API / Backend | Database (marcadores) | O servidor lê os dados com Admin SDK e roda o núcleo puro; o cliente não é confiável nem está aberto |
| Deduplicar aviso (80%, 100%, fatura) | Database / Storage | API / Backend | Só um `create()` no Firestore sobrevive a reinício e a duas instâncias |
| Preferências (tipos, silêncio) | API / Backend (validação) | Database | Servidor valida o formato e lê ao enviar; cliente só edita pela rota |
| Texto do push (tela de bloqueio) | API / Backend | `shared/core` (banco de frases de push) | D-05: banco de frases, sem dado financeiro; servidor escolhe pelo tom das configurações |
| Montar o resumo para a IA | API / Backend | Database | D-16: nunca o cliente; escopo estrutural por `hid` + `person` |
| Chamar o LLM, validar, cachear, contar cota | API / Backend | Database (cache, contadores) | Chaves só no servidor (IA-01); contador e cache precisam sobreviver a reinício |
| Mostrar a fala e cair no banco de frases | Browser / Client | — | A tela decide o prazo e o fallback; nunca mostra erro (IA-04) |
| Decidir quando "espiar" e abrir com fala (D-12 a, b) | Browser / Client | API (teto diário, assunto do dia) | O cliente sabe se o app está visível e ativo; o servidor é a autoridade do teto e da não repetição |
| Push espontâneo (D-12 c) | API / Backend (tick) | — | Roda sem o app aberto; texto do banco de frases |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `firebase` (já instalado) | 13.4.0 [VERIFIED: node_modules/firebase/package.json, `"version": "13.4.0"`] | `firebase/messaging` no cliente: `getMessaging`, `register`, `onRegistered`, `onUnregistered`, `unregister`, `isSupported` | FID flow é o caminho atual; `getToken` está marcado obsoleto |
| `@firebase/messaging` (transitiva) | 0.13.3 [VERIFIED: node_modules/@firebase/messaging/package.json] | Implementação do `register()` | Contém `serviceWorkerRegistration` em `RegisterOptions` |
| `firebase-admin` (servidor, já instalado) | 14.5.1 [VERIFIED: server/node_modules/firebase-admin/package.json] | `getMessaging().sendEach()` com `fid`, Firestore Admin, `verifyIdToken` | Tipos têm `FidMessage` |
| `fetch` + `AbortSignal.timeout` (Node 22.23.5) | nativo [VERIFIED: `node --version` = v22.23.5] | Adaptador LLM e prazo de 4 s (D-04) | CLAUDE.md: sem SDK de LLM |
| `node:crypto` | nativo | Hash da situação (cache), ids de marcador | Sem pacote |
| `node:test` | nativo | Testes de servidor e do núcleo | Já é o padrão do repo (`npm run test:server`, `test:core`) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `shared/core/*` (existente) | — | `buildBudgetView`, `thresholdsToFire`, `alertId`, `normalizePersonConfig`, `cycleOf`, `groupBills`, `zonedParts`, `dayKeyOf`, `pick`/`buildSlots`, `checkBank`, `PROFANITY` | Toda matemática e regra pura; servidor já importa `../../shared/core/...` e o `Dockerfile` copia `shared` |
| `workbox-*` (já instalados) | 7.4.1 | `src/sw.ts` continua com precache | Sem mudança; o handler de push é código próprio no mesmo arquivo |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Handler `push` próprio no SW | `firebase/messaging/sw` + `onBackgroundMessage` + mensagens `notification` | O SDK retorna sem exibir quando há janela visível (`index.sw.esm.js:1409-1411`); no iOS isso é push silencioso. O próprio thread do firebase-js-sdk (#8010) lista como solução "raw push listener". Alternativa só serve se o dono aceitar o risco de revogação no iPhone |
| Mensagens FCM só `data` + exibição própria | Mensagem `notification` | Sem o SDK no SW, nada exibe sozinho; os dois formatos exigem o mesmo handler. `data` mantém texto e rota sob controle do servidor |
| Limiter próprio de rajada (token bucket de ~20 linhas) | `express-rate-limit` 8.7.5 | Pacote marcado `SUS` por "too-new" (publicado 2026-11-18); o teto diário real vai em Firestore de qualquer jeito. Só usar após `checkpoint:human-verify` |
| Cloudflare Workers AI primeiro | Groq primeiro | Cloudflare tem termos de dados claros e cota publicada; Groq tem limites grátis não verificáveis sem console |
| Grok/xAI | — | Sem crédito grátis confirmado em fonte oficial: fora por padrão (D-17); o adaptador aceita como terceiro provedor se o dono confirmar crédito no console dele |

**Installation:** nenhuma dependência nova é necessária (cliente e servidor já têm tudo). Só variáveis de ambiente (ver "Configuração do servidor").

**Version verification:** `firebase` 13.4.0, `@firebase/messaging` 0.13.3, `firebase-admin` 14.5.1 e Node v22.23.5 conferidos nesta sessão nos `package.json` instalados e em `node --version`.

## Package Legitimacy Audit

> Esta fase não instala pacote obrigatório. Único candidato avaliado (opcional): `express-rate-limit`.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| express-rate-limit | npm | maduro, mas a versão `8.7.5` foi publicada em 2026-11-18 | ~101 milhões/semana | github.com/express-rate-limit/express-rate-limit | SUS (`too-new`, pelo `gsd-tools package-legitimacy check`) | Flagged: `express-rate-limit` [WARNING: flagged as suspicious — verify before using.] O planejador deve adicionar `checkpoint:human-verify` antes de instalar, ou (recomendado) não instalar e usar limiter próprio simples |

**Packages removed due to [SLOP] verdict:** nenhum
**Packages flagged as suspicious [SUS]:** `express-rate-limit` (sem `postinstall`; `peerDependencies: { express: '>= 4.11' }`, `engines: { node: '>= 16' }`). Nome veio do `.claude/CLAUDE.md` (pesquisa anterior), então pela regra de proveniência de pacote não vale `[VERIFIED]` além do veredito do seam.

## Architecture Patterns

### System Architecture Diagram

```
                 TRILHA A: PUSH                                   TRILHA B: FALA COM IA
 ┌────────────────────────────┐                      ┌────────────────────────────────────────┐
 │ Configurações > Notificações│                      │ Gatilhos no cliente (VintemContext):    │
 │ clique -> register(vapid,   │                      │ onLaunched / limite / fim de sync /    │
 │ serviceWorkerRegistration)  │                      │ abrir app / espiar (timer)             │
 └──────────┬─────────────────┘                      └──────────────┬─────────────────────────┘
            │ onRegistered(fid)                                      │ POST /api/vintem/fala {situacao, refs(ids)}
            ▼                                                        ▼   (Bearer ID token; prazo do cliente)
   POST /api/push/register ──► pushRegistrations/{fid}      requireOwner -> hid, person
            │                        ▲                              │
            │                        │ apaga se                     ▼
            │                        │ installation-id-       teto do dia (aiUsage) ──► estourou: text:null
            │                        │ not-registered               │
 ┌──────────▼──────────┐             │                              ▼
 │ Gatilhos do servidor│             │                  cache (Map -> aiCache) ──hit──► devolve variante
 │ 1 POST /api/limits/ │             │                              │ miss
 │   check (cliente)   │             │                              ▼
 │ 2 pós-sync/webhook  │             │            snapshot do ciclo (TTL) ──► resumo da PESSOA do token
 │ 3 tick horário      │             │            (aiSummary + aiPrivacy: rótulos, sem CPF/conta/pessoa)
 └──────────┬──────────┘             │                              │
            ▼                        │                              ▼
   notifier.evaluate(hid, person)    │            prompt por tom ──► provedor 1 (4 s) ──falha/recusa/manso──►
   buildBudgetView + thresholdsToFire│            provedor 2 (4 s) ──falha──► text:null
   groupBills (fatura)               │                              │ ok
            │                        │                              ▼
            ▼                        │            aiValidate (tamanho, texto simples, pt-BR, sem dado,
   pushEvents/{id}.create() ◄── dedup│            sem parceiro, números do resumo) ──reprova──► próximo
   (já existe: ignora)               │                              │
            │ novo                   │                              ▼
            ▼                        │            grava aiCache + conta aiUsage ──► {text}
   prefs (tipo ligado? silêncio?)    │                              │
   frase do banco de PUSH (tom)      │                              ▼
            ▼                        │                 Cliente: mostra a fala; se text:null ou prazo
   getMessaging().sendEach([{fid,    │                 estourou -> banco de frases da Fase 4 (sem erro)
   data:{title,body,tag,url}}]) ─────┘
            ▼
   FCM -> Web Push -> src/sw.ts: evento 'push' -> showNotification (SEMPRE) -> clique -> abre/foca a rota
```

### Recommended Project Structure

```
shared/core/                       # puro: sem relógio, sem pacote (purity.test.js vigia)
├── pushPrefs.js(+test)            # defaults D-06, normalizePrefs, isQuiet(prefs, instante, tz), typeEnabled
├── pushEvents.js(+test)           # ids dos marcadores, decisão de fatura perto de vencer, fila de eventos
├── pushState.js(+test)            # os 5 estados do cartão (entrada: suporte, standalone, plataforma, permissão, registro)
├── vintemPhrasesPush.js(+test)    # banco de frases de AVISO: 3 tons, SEM encaixes de valor/loja
├── aiPrivacy.js(+test)            # sanitizeLabel, scrubText, isPersonPix
├── aiSummary.js(+test)            # monta o resumo (objeto) a partir de snapshot já lido; escopo por pessoa
├── aiPrompt.js(+test)             # mensagens system/user por tom e situação; tamanho por situação
├── aiValidate.js(+test)           # validateSpeech(text, {situation, tone, summary, partnerLabels})
└── aiCacheKey.js(+test)           # buckets de 5 pontos, hash estável da situação
server/src/
├── push.js                        # rotas /api/push/*, envio via sendEach, limpeza de FID morto
├── notifier.js                    # evaluate(hid, person): limite, fatura, espontâneo; marcador create()
├── ai/providers.js                # adaptador OpenAI-compatível (fetch), config por env, cadeia
├── ai/budget.js                   # teto por pessoa/dia, freio por provedor (429, 3036), coalescência
├── ai/speech.js                   # orquestra: teto -> cache -> resumo -> provedores -> validação
└── ai/snapshot.js                 # leitura Firestore do ciclo (TTL em memória) -> entrada do aiSummary
server/scripts/
├── ai-compare.js                  # teste lado a lado (o dono roda; chaves só no ambiente dele)
└── push-dryrun.js                 # sendEach(..., dryRun=true) com um FID real (o dono roda)
src/
├── sw.ts                          # + listener 'push', 'notificationclick' (sem firebase/messaging/sw)
├── lib/push/                      # getMessaging, ativar/desativar, estado atual
├── services/push.service.ts       # chamadas /api/push/* (mesmo padrão de bank.service.ts)
├── services/vintemSpeech.service.ts  # POST /api/vintem/fala com AbortController
└── components/settings/NotificationsCard.tsx  # evolui: estados, botão, tipos, silêncio, "Testar aviso"
```

### Pattern 1: Marcador atômico com `create()` (PUSH-04, D-07)

**What:** o marcador é o próprio gatilho de envio: quem consegue criar o documento envia; quem recebe "já existe" não envia. Não depende de memória do processo, funciona com dois gatilhos concorrentes (cliente + sync) e sobrevive a reinício.
**When to use:** toda notificação (limite 80/100, fatura, espontânea).
**Id do marcador:** `pushEvents/{hid}__{alertId(person, cycleKey, categoryId, threshold)}` para limites, onde `alertId` já existe: [VERIFIED: shared/core/alerts.js:44-46] `export function alertId(person, cycleKey, categoryId, threshold) { return \`${person}__${cycleKey}__${categoryId}__${threshold}\` }`. Fatura: `{hid}__fatura__{cardId}__{billMonth}`. Espontâneo: `{hid}__{person}__espontanea__{dayKey}`.
**Garantia:** `create()` falha se o documento existe [VERIFIED: server/node_modules/@google-cloud/firestore/types/firestore.d.ts:1479-1487, "The write fails if the document already exists"]. Semântica **no máximo uma vez**: se o processo morrer entre o `create()` e o envio, o aviso se perde (aceitável frente a duplicar). Se TODOS os envios falharem por erro transitório (5xx), apagar o marcador para a próxima checagem tentar de novo.
**Marcador guarda** `{ ownerId, person, kind, status: 'enviado' | 'suprimido' | 'sem-aparelho', motivo?, createdAt, enviados }`. Silêncio ou tipo desligado cria o marcador como `suprimido` (o evento fica só no alerta dentro do app; o aviso não "chega atrasado" depois que o silêncio acaba).
> **Atualização (D-21, rodada de planejamento 2026-11-25):** a D-21 SUBSTITUI o `suprimido` do silêncio por `pendente`: o aviso de limite ou de fatura que cai no silêncio espera e é entregue quando ele acaba. O status do marcador passa a ser `enviando`, `enviado`, `pendente`, `desligado`, `silencioso`, `teto`, `colapsado`, `sem-aparelho` ou `falhou`; o tipo desligado vira `desligado` (não entrega depois). Vale o que está nos planos 07-03, 07-10 e 07-15.
**Limiar silencioso:** `thresholdsToFire` já marca `silent: true` nos limiares menores quando o gasto saltou direto para o maior [VERIFIED: shared/core/alerts.js:64-93, `silent: threshold !== top`]; criar marcador para os silenciosos sem enviar.

### Pattern 2: Servidor valida e grava tudo de push; regras do Firestore não mudam

**What:** `pushRegistrations`, `pushPrefs`, `pushEvents`, `aiUsage`, `aiCache` ficam fora de `clientCollections()` [VERIFIED: firestore.rules, lista `['transactions', 'fixedExpenses', ..., 'cardSettings']` sem essas coleções], portanto negadas ao cliente por padrão; só o Admin SDK lê e escreve. Rotas: `POST /api/push/register`, `POST /api/push/unregister`, `GET /api/push/status?fid=`, `GET|PUT /api/push/prefs`, `POST /api/push/test`, `POST /api/limits/check`, `POST /api/vintem/fala`.
**Why:** valida formato (FID, tipos, horas), deriva `hid`, `uid` e `person` do token e evita abrir regra nova. Acrescentar as coleções novas à matriz de `test/rules/matrix.test.js` como "cliente negado".

### Pattern 3: Notificador com três portas, uma só função idempotente

`evaluate({ hid, person, now, source })` é chamado por: (1) `POST /api/limits/check` (cliente, para a pessoa do token, com `excludeFid` do aparelho em uso); (2) depois de `syncAll`/`syncItem`/webhook quando `imported > 0` (injetar `notifier` em `createApp` e `index.js`, sem acoplar `sync.js`); (3) `setInterval` horário em `index.js` (fatura perto de vencer e push espontâneo, que não dependem de dado novo). Como o tick depende de o processo estar de pé, as portas 1 e 2 também rodam a parte de fatura (barato e idempotente).

### Pattern 4: Cadeia de provedores com prazo e freio

Um adaptador só (`POST {baseUrl}/chat/completions`, `Authorization: Bearer`) atende Cloudflare, Groq e xAI, mudando só `baseUrl`, chave e `model`. Cada chamada com `AbortSignal.timeout(4000)` (D-04). Falha, 429, timeout, texto vazio, recusa, "manso demais" (em tom sem filtro) ou validação reprovada passam ao próximo; no fim, `text: null` e o cliente usa o banco de frases. **Freio por provedor:** 429 do Cloudflare com código 3036 (cota diária) bloqueia o provedor até 00:00 UTC; 5035 (modelo só no plano pago), 5007/3042/5028 (modelo inexistente, nome inválido, descontinuado) desligam o provedor e logam "modelo inválido" (sem conteúdo); 3040 (capacidade) e 5xx dão pausa curta (~60 s). Coalescer chamadas simultâneas idênticas (mesma chave de cache) em uma só promessa.

### Pattern 5: Cache com variantes (reconcilia D-02 com "imprevisível e variado")

Chave: `hid | person | cycleKey | tom | hash(situação normalizada)`, com percentuais em faixas de 5 pontos (D-02). Em vez de uma frase por chave por 24 h (o Vintém repetiria a mesma fala o dia todo), o cache guarda **até K variantes** (padrão 3, `AI_CACHE_VARIANTS`): enquanto houver menos de K, um miss gera nova variante e a adiciona; depois sorteia entre as guardadas, evitando repetir a última servida. TTL 24 h (`expiresAt` conferido na leitura; política de TTL do Firestore é opcional). Cache em `Map` na frente do Firestore (CLAUDE.md).

### Anti-Patterns to Avoid

- **Importar `firebase/messaging/sw` no `sw.ts` só para exibir o push:** o SDK não exibe com janela visível e o iPhone trata como push silencioso.
- **Cliente mandando o resumo ou textos para a IA:** viola D-16/IA-02; o cliente manda só `situation` e **ids** (que o servidor revalida contra `hid` e `person`).
- **Reusar `checkPhrase`/`PERSONAL_ATTACK` do banco de frases para a saída da IA:** o banco proíbe `burro`, `idiota`, `lixo` etc. [VERIFIED: shared/core/phraseRules.js:62-75]; a D-13 manda "sem filtro de verdade" e a D-14 só proíbe discriminação e falar do parceiro. A régua da IA é outra.
- **Marcador de dedup em `Set` na memória** (padrão de `createSeenEvents` do webhook): some no reinício.
- **Ler o histórico do mês a cada fala:** estoura a cota de leitura do Spark (ver Pitfall 4).
- **Pôr valores, categoria numérica ou loja no texto do push** (D-05).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Transporte de push (VAPID, criptografia, endpoints Apple/Mozilla) | Servidor `web-push` próprio | FCM com FID (`sendEach`) | Gratuito, já no projeto; esconde diferenças de provedores |
| Dedup de evento | `Set`/contador em memória | `docRef.create()` | Atômico entre instâncias e reinícios |
| Conta de limites e 80%/100% | Nova soma por categoria no servidor | `buildBudgetView` + `thresholdsToFire` + `normalizePersonConfig` + `cycleOf` | Mesma matemática do cliente (centavos inteiros, `gasto * 100 >= limite * 80`) |
| Fatura, vencimento e status | Datas "na mão" | `groupBills`, `cardBillStatus`, `duePartsOf`, `openBillMonth` de `cardBills.js` | Já cobrem fechamento/vencimento do dono (CARD-08) |
| Fuso de São Paulo, dia e hora de silêncio | `new Date().getHours()` | `zonedParts`, `dayKeyOf` de `time.js`/`dayKey.js` | Railway roda em UTC; o núcleo é testado em dois fusos |
| Sorteio de frase sem repetir | Novo seletor | `pick`/`buildSlots`/`recentLimit` de `phrasePicker.js` | Já testado; o banco de push usa o mesmo formato `{id, t}` |
| Prazo de rede | `setTimeout` + flag | `AbortSignal.timeout(ms)` | Cancela de verdade |
| Verificação do token do usuário | Parser de JWT | `requireOwner` existente | Já devolve `req.owner = { uid, hid, person }` |
| Detecção de FID morto | Regex em mensagem de erro | `error.code === 'messaging/installation-id-not-registered'` | Ver verificação abaixo |

**Key insight:** quase tudo já existe. O que é novo e precisa de cuidado é o **filtro de privacidade**, o **validador da saída** e o **orçamento de leituras**; esses três não têm biblioteca que resolva e são onde a fase pode vazar dado ou estourar cota.

## Push no cliente e no service worker (detalhe)

**O que o SW atual já tem** [VERIFIED: src/sw.ts:12-22]: `cleanupOutdatedCaches()`, `precacheAndRoute(self.__WB_MANIFEST)`, `NavigationRoute` com `denylist: [/^\/__\//, /^\/api\//]`, `clientsClaim()` e `message` com `SKIP_WAITING`. Não há `push` nem `notificationclick`. O comentário da linha 3 diz que a atualização é decidida por `shared/core/pwaUpdate.js` e o `vite.config.ts` já fixa `strategies: 'injectManifest'`, `srcDir: 'src'`, `filename: 'sw.ts'`, `registerType: 'prompt'` e tem o comentário "a Fase 7 coloca o tratador de push no mesmo arquivo". `tsconfig.sw.json` tem `"lib": ["ES2022", "WebWorker"]`.

**Typings do cliente lidos** (`node_modules/@firebase/messaging/dist/index-public.d.ts`):
- `onRegistered(messaging, nextOrObserver): Unsubscribe` (linha 240); `onUnregistered(...)` (linha 252); `register(messaging, options?): Promise<void>` (linha 267); `unregister(messaging)` (linha 289).
- `RegisterOptions`: `vapidKey?: string` e `serviceWorkerRegistration?: ServiceWorkerRegistration` (linhas 274-278).
- Doc da API: "Don't use both the Firebase Installation ID APIs and the deprecated registration token APIs" [CITED: firebase.google.com/docs/cloud-messaging/web/get-started]; `getToken` marcado obsoleto na linha 75 do `.d.ts`.

**Comportamento lido no código instalado** (`dist/esm/index.esm.js`, `@firebase/messaging` 0.13.3):
- `register()` chama `Notification.requestPermission()` sozinho se a permissão está em `default`, lança `permission-blocked` se não ficar `granted`, e **lança `invalid-on-registered-handler` se `onRegistered` não foi registrado antes** (linhas 1121-1138). Portanto: registrar `onRegistered` primeiro, depois `register()`.
- Renova o registro no servidor do FCM a cada 7 dias (`FID_REGISTRATION_REFRESH_MS = 7 * 24 * 60 * 60 * 1000`) e chama o handler a cada `register()`: chamar `register()` em cada abertura do app (permissão já `granted`) mantém o FID fresco e a rota `POST /api/push/register` atualiza `updatedAt`.
- O cadastro vai para `https://fcmregistrations.googleapis.com/v1/projects/{projectId}/registrations` (linhas 26 e 659): a API "Firebase Cloud Messaging Registrations" precisa estar habilitada no projeto e a chave `VITE_FIREBASE_API_KEY` não pode estar restrita de modo a bloqueá-la `[ASSUMED]` (passo do dono).
- Sem `serviceWorkerRegistration`, o SDK registra `/firebase-messaging-sw.js` por conta própria (`registerDefaultSw`, linhas 917-922); com a opção, usa o worker do app (`updateSwReg`, linhas 987-996). Sempre passar a opção, vinda de `navigator.serviceWorker.ready`.

**Por que não usar o SW do SDK** [VERIFIED: node_modules/@firebase/messaging/dist/esm/index.sw.esm.js:1409-1411]: `if (hasVisibleClients(clientList)) { return sendMessagePayloadInternalToWindows(clientList, internalPayload); }` e só depois, no ramo de segundo plano, `if (!!internalPayload.notification) { await showNotification(wrapInternalPayload(internalPayload)); }` (linhas 1412-1415). Com o app aberto o push vai à página e nada é exibido. A regra do WebKit: "Violations of the `userVisibleOnly` promise will result in a push subscription being revoked" e a assinatura "must ... always showing a notification in response to a push message" [CITED: webkit.org/blog/12945/meet-web-push/]; o commit "Enforce silent push quota" do WebKit fala em até 3 pushes silenciosos [CITED: busca; não li o commit, MEDIUM-LOW]. O thread firebase/firebase-js-sdk#8010 relata exatamente "push para de chegar no iOS" e a correção que funcionou foi "removed Firebase from the service worker and used a raw `push` listener" com `showNotification` e `tag` constante [CITED: github.com/firebase/firebase-js-sdk/issues/8010, resumo de terceiros, MEDIUM].

**Desenho do `src/sw.ts` (contrato, não código final):**
- `push`: `event.waitUntil(...)`; ler `event.data?.json()` com `try/catch`; título e corpo de `payload.data` (com reserva para `payload.notification` e para o texto fixo "Vintém"), `tag` do evento (colapsa duplicata), `icon: '/icons/pwa-192x192.png'` [VERIFIED: public/icons/pwa-192x192.png existe]; **todo caminho, inclusive erro de parse, termina em `showNotification`**. Se houver janela focada, `silent: true`. Formato do JSON recebido: o SDK lê `from`, `collapse_key`, `fcmMessageId`, `notification` e `data` do payload interno (`index.sw.esm.js:1051-1062`), então o objeto tem essa forma `[ASSUMED]` para mensagens FID; validar no aparelho real.
- `notificationclick`: `close()`, `clients.matchAll({ type: 'window', includeUncontrolled: true })`, focar uma janela da mesma origem e navegar para `data.url` (rota relativa; ignorar URL de outra origem), senão `clients.openWindow`.
- Sem `import` do Firebase no worker: nenhuma configuração do app dentro do SW, nenhum risco de `import.meta.env` no build do SW.
- **Atualização do SW antes de assinar:** `registerType: 'prompt'` deixa a versão nova esperando (`waiting`). Se o usuário ativar avisos com o worker antigo (sem handler de push), o primeiro push chega sem ser exibido e conta como silencioso. O fluxo de ativar deve: obter `navigator.serviceWorker.ready`; se existir `registration.waiting`, enviar `SKIP_WAITING` e aguardar a ativação antes de `register()`.

**No iPhone** [CITED: webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/]: Web Push em iOS/iPadOS 16.4 ou mais novo, só para web app adicionado à tela de início (`display: standalone`/`fullscreen`, o manifesto já tem `display: 'standalone'` em `vite.config.ts`), e permissão só após gesto direto do usuário. Notificações integram com os modos de Foco. Em aba do Safari não há `PushManager`, então `isSupported()` dá falso lá também: **o estado "app não instalado" (iPhone fora do standalone) tem que ser testado antes de "não suportado"**. O app já tem `usePwaInstall` com `isStandalone` e `platform: 'iphone'` [VERIFIED: src/hooks/usePwaInstall.ts:5, 7, 11-27, 41-50: `type PwaPlatform = 'android' | 'iphone'`, `getStandalone()`], reaproveitar para o passo a passo (o cartão "Aplicativo" já guarda os passos de adicionar à tela de início).

**Gesto do usuário:** no clique, chamar `Notification.requestPermission()` (via `register()`) como a primeira coisa; deixar `navigator.serviceWorker.ready` resolvido antes do clique (pré-carregar no render), para não perder a ativação transitória do gesto.

**Os cinco estados** (`pushState`, função pura em `shared/core`): `app-nao-instalado` (iPhone fora do standalone), `nao-suportado` (sem `Notification`/`PushManager`/`isSupported()` falso fora do caso anterior; no iOS standalone sem `PushManager`, sugerir atualizar o iOS), `negado` (`Notification.permission === 'denied'`), `ativo` (`granted` e o servidor reconhece o FID atual), `inscricao-perdida` (`granted` mas o servidor não tem o FID, ou o registro falhou, ou o servidor apagou o FID por `installation-id-not-registered`; ação "Reativar" chama `register()` sem novo gesto). Estado `padrao` (permissão ainda não pedida) mostra o botão "Ativar avisos".

## Push no servidor (detalhe)

**Envio** [VERIFIED: server/node_modules/firebase-admin/lib/messaging/messaging-api.d.ts:32-37 e messaging.d.ts:82]: `export interface FidMessage extends BaseMessage { fid: string }` e `sendEach(messages: Message[], dryRun?: boolean): Promise<BatchResponse>`. `BaseMessage` aceita `data?: { [key: string]: string }` e `webpush?: WebpushConfig` com `headers` (valores string, por exemplo `TTL` e `Urgency` do RFC 8030) [VERIFIED: messaging-api.d.ts:117-141]. Enviar um `Message` por FID com `data: { title, body, tag, url }` (tudo string), `webpush.headers: { TTL: '21600', Urgency: 'high' }` `[ASSUMED: FCM repassa estes cabeçalhos; conferir no teste real]`.

**FID morto** [VERIFIED: server/node_modules/firebase-admin/lib/messaging/messaging-errors-internal.js:38-52 e error.js:34,203]: quando o servidor responde `UNREGISTERED` ou `NOT_FOUND` a uma mensagem com `fid`, o código vira `UNREGISTERED_FID` que mapeia para `INSTALLATION_ID_NOT_REGISTERED: 'installation-id-not-registered'`. Em `SendResponse.error.code` o teste é `.includes('installation-id-not-registered')` (o prefixo `messaging/` é montado pela classe de erro `[ASSUMED]`; o teste deve aceitar com e sem prefixo). Apagar `pushRegistrations/{fid}` nesse caso. O guia de gerência de registro do FCM também manda apagar registros sem renovação além de ~30 dias e diz que `UNREGISTERED` (404) e `INVALID_ARGUMENT` (400, só com payload válido) indicam registro inválido [CITED: firebase.google.com/docs/cloud-messaging/manage-tokens].

**Dados do cadastro:** `pushRegistrations/{fid}` com `{ ownerId (hid), uid, person, platform ('ios'|'android'|'desktop', do `User-Agent`, só o necessário), createdAt, updatedAt }`. Validar o FID por regex ampla (`/^[A-Za-z0-9_-]{10,64}$/`) `[ASSUMED: o FID é base64url de ~22 caracteres]`; se o documento já existir com `ownerId` diferente, recusar (409).

**Envio só para a pessoa do evento** (D-14): consulta `pushRegistrations` com `where('ownerId','==',hid).where('person','==',person)` (duas igualdades, sem índice composto novo). `POST /api/limits/check` aceita `fid` do aparelho em uso e o exclui do envio (ele já mostra o alerta dentro do app); os outros aparelhos da mesma pessoa recebem.

**Teto anti-enxurrada:** `PUSH_MAX_PER_DAY` (padrão 8) por pessoa, contado em `aiUsage`-like `pushEvents` do dia; passou do teto, cria marcador `suprimido`.
> **Atualização (D-21):** o marcador do teto diário passa a se chamar `teto` (o `suprimido` não existe mais nos planos); o silêncio usa `pendente` e entrega depois. Os documentos de preferências são `pushPrefs/{hid}__{person}` (e não `pushPrefs/{uid}`), porque o servidor precisa achar as preferências da pessoa a partir de casal e pessoa.

**Preferências:** `pushPrefs/{uid}` com `{ ownerId, person, types: { limite80: true, limite100: true, fatura: true, espontanea: true }, quiet: { enabled: false, from: '22:00', to: '08:00' }, updatedAt }`. Padrões da D-06 (silêncio desligado, três tipos ligados); `espontanea` não está na D-06, ver Open Question 2. `isQuiet` interpreta no fuso `America/Sao_Paulo` (`zonedParts`), aceitando janela que cruza meia-noite. As configurações existentes `notificationsEnabled` e `daysBeforeDueDate` [VERIFIED: src/types/index.ts:94-95 `notificationsEnabled: boolean` / `daysBeforeDueDate: number`; padrões 215-216: `notificationsEnabled: true,` `daysBeforeDueDate: 3,`] continuam: `daysBeforeDueDate` é a antecedência da fatura (recomendação), e o interruptor legado "Avisos de vencimento" do cartão atual não deve virar um segundo botão para a mesma coisa (decisão de UI para o UI-SPEC).

**Fatura perto de vencer:** o servidor lê `cards` (agregados `billTotals`) e `cardSettings` (`closingDay`, `dueDay`, `paidMonths`) do `ownerId` e as compras do cartão com a consulta que já existe (`ownerId` + `cardId`, índice `transactions [ownerId, cardId, date desc]` presente em `test/static/firestore-config.test.js`), e usa `groupBills`/`cardBillStatus`: dispara quando a fatura está `fechada` (não paga, `remainingCents > 0`) e o vencimento cai em `0..daysBeforeDueDate` dias. Marcador por `cardId + billMonth`. O planejador deve ler `useCardView` (lido nesta pesquisa só até a linha 80) e `cardPayments.js` para reproduzir os pagamentos ligados (`payments`) exatamente como o cliente.

**Limites no servidor:** ler `settings/main` com a mesma checagem de dono de `getAppCategories` (`data.ownerId != null && data.ownerId !== ownerId` volta ao padrão) [VERIFIED: server/src/sync.js:38-48], `personConfig[person]` por `normalizePersonConfig`, `cycleOf(now, salaryDay)`, transações `ownerId + person + date` no ciclo (índice `[ownerId, person, date desc]` já existe), converter `date` Timestamp para `Date` e montar `buildBudgetView({ now, cycle, config, transactions, bills: [], payments: [], categoryDefs, suppressVerdict: false })` [VERIFIED: shared/core/budget.js:525-537 assinatura]. Só `view.spend.rows` interessa; `thresholdsToFire(view.spend.rows, known, { person, cycleKey })` como no cliente [VERIFIED: src/contexts/LimitAlertsContext.tsx:95]. Pagamento de fatura e transferência já saem de `spendByCategory` por `isDayToDay` (`tx.type === 'saida' && tx.transfer !== true`) [VERIFIED: shared/core/budget.js:182-184].

**Aresta (troca do dia do salário):** o cliente regrava marcadores silenciosos de `limitAlerts` na chave de ciclo nova (`rekeyAlerts`). O servidor deve também ler `limitAlerts` do ciclo e **não enviar** quando existir ali um documento `silent: true` para o mesmo id (evita reenviar aviso já dado antes da troca). Regra: enviar se não houver `pushEvents` e não houver `limitAlerts` silencioso.

**Texto do aviso** (D-05, PUSH-04): novo módulo `shared/core/vintemPhrasesPush.js` com situações `push-limite-80`, `push-limite-100`, `push-fatura`, `push-espontanea`, 3 tons (usar o `vintemTone` do `settings/main`, padrão `sem-filtro`), **sem encaixes** (ou, no máximo, `{categoria}`, decisão em Open Question 3), no formato `{ id, t }` e checado por `checkBank` com metadados próprios (não misturar com as 20 situações de `SITUATIONS`, para não quebrar os testes do banco da Fase 4). Título fixo "Vintém". Para o tom sem filtro, o banco exige ao menos 2 ou 3 frases com palavrão por situação "edgy" [VERIFIED: shared/core/phraseRules.js, `checkBank`: `const need = reviewed ? 2 : 3`]. O dono revisa o conteúdo como na Fase 4 (checkpoint de conteúdo).

**Push espontâneo (D-12 c):** o tick horário, dentro de uma janela configurável (`PUSH_SPONT_WINDOW`, padrão 11:00-20:00 de São Paulo), tenta criar `{hid}__{person}__espontanea__{dayKey}`; o primeiro que conseguir no dia envia uma frase do banco. Sem IA, sem dado financeiro.

## Fala com IA (detalhe)

### Resumo montado no servidor (D-16) e escopo estrutural (D-14)

- A rota recebe `{ situation, ... }` em que `situation` é um enum fechado e as referências são **ids** (`transactionId`, `categoryId`); o servidor revalida que o documento pertence a `hid` e `person` do token (IDOR).
- O snapshot lê **somente** transações com `where('ownerId','==',hid).where('person','==',req.owner.person)` + porquinho/metas/contas fixas/cartões do casal. A outra pessoa nunca é carregada, então "nunca falar de Ele para Ela" é garantido pela construção, não só pelo prompt. Reforço: o validador rejeita saída que cite o rótulo da outra aba (`settings.tabNames`, ex. "Nirigue"/"Nirigua" no padrão [VERIFIED: src/types/index.ts DEFAULT_SETTINGS `area1: 'Nirigue'`, `area2: 'Nirigua'`]) ou palavras de relação (marido, esposa, namorado/a, parceiro/a).
- Conteúdo (orçamento de ~1.200 a 1.500 tokens): ciclo e dias restantes, renda recebida/esperada, "Pode gastar", linhas de limite (categoria, gasto, limite, % em faixa), top categorias sem limite, top 8 lojas com contagem na semana e no ciclo, comparação por categoria com o ciclo anterior, contas fixas do ciclo, metas e Porquinho (saldos), fatura aberta e vencimento, e a lista de "assuntos candidatos" (insights fortes de `buildInsights` quando houver, mais assuntos fixos) para a fala espontânea. Listas com tamanho máximo para limitar tokens.
- Para a fala de lançamento o resumo inclui a compra (loja ou categoria, valor) lida pelo `transactionId`.

### Filtro de privacidade (IA-02, D-09), em camadas, tudo puro e testável

1. **Pix e transferência para/de pessoa:** `cleanDescription` produz `Pix para {Nome}` e `Pix de {Nome}` [VERIFIED: shared/core/classify.js:68-72, `return \`Pix para ${titleCase(name)}\`` e `return \`Pix de ${titleCase(name)}\``]. Qualquer descrição que case `^Pix (para|de)\b`, `transfer[eê]ncia`, `\bTED\b`, `\bDOC\b` vira o rótulo "uma pessoa" (ou "uma transferência"). Nunca enviar o resto da string.
2. **Dígitos e identificadores:** remover CPF/CNPJ formatados ou não, sequências de 4 ou mais dígitos ("final 1234", conta, cartão, agência), e-mails, telefones, URLs. A régua `FORBIDDEN_DATA` do banco de frases já tem `\d{6,}`, `@`, `cpf`, `cnpj`, agência, "número da conta/cartão" [VERIFIED: shared/core/phraseRules.js:78-88] e serve de reserva para o validador da saída.
3. **Nomes de loja** só do que o servidor considera loja: lançamentos `source === 'bank'` (descrição já limpa) cuja descrição não caiu na regra 1. **Lançamento manual:** a descrição digitada livremente pode ter nome de pessoa que nenhum filtro garante pegar; recomendação: para manual, usar a descrição só se coincidir (normalizada) com uma loja já vista nas importações bancárias do mesmo dono, senão usar o nome da categoria (Open Question 4).
4. **Rótulo curto e seguro:** no máximo 24 caracteres (alinhado a `NAME_MAX = 24` de `phrasePicker.js`), só letras, números, espaço e `&.'-`, sem `{}` nem quebras, para limitar **injeção de prompt** por descrição de banco.
5. **O que nunca entra no prompt:** `uid`, `hid`, e-mail, nomes de aba, `itemId`/`accountId`, `bankImportId`, ids de documento. Para citar categoria usar o nome da categoria (não é dado pessoal), nunca o id interno se ele puder carregar texto livre.
6. Teste de propriedade: dada uma bateria de descrições sujas (Pix com nome, CPF, "ag 1234 cc 56789-0", e-mail, telefone), nenhuma saída de `aiSummary` contém dígitos em sequência de 4+, `@`, "cpf" ou o nome.

### Validação da saída (IA-03), régua própria

Rejeitar (passa ao próximo provedor) quando: texto vazio, só espaços ou com quebra de linha (aceitar no máximo uma, trocando por espaço); contém marcação (`*`, `_`, crases, `#`, `[...](...)`, `<...>`, `{`/`}`); contém emoji (estilo do projeto) ou travessão/meia-risca (`AI_TELLS`); passa do tamanho da situação (curta: 140 caracteres; longa: ~2 frases, ~260 caracteres; D-15); não parece pt-BR (heurística: fração de palavras-função do português acima de um piso e ausência de bloco em inglês; acento é indício forte mas não obrigatório); parece **recusa** ou fala de assistente (`desculpe`, `sinto muito`, `não posso`, `como (uma )?(ia|inteligência artificial|modelo de linguagem)`, `I'm sorry`, `I can't`, `as an AI`); contém dado proibido (`FORBIDDEN_DATA`); cita o parceiro (acima); contém **discriminação** (lista de raízes de ofensas por raça, orientação, religião, deficiência ou grupo, que o dono revisa; Open Question 5); e, para finanças, **número que não existe no resumo** (todo `R$ x`, `%` e contagem citados precisam estar no conjunto permitido derivado do resumo; modelo que inventa valor é pior que modelo mudo). No tom `sem-filtro` em situação "edgy", opcionalmente exigir ao menos um palavrão (lista maior que `PROFANITY`, que não tem `cu`, `buceta`, `arrombad`...) para tratar "mansinho demais" como falha (D-17), controlado por `AI_REQUIRE_PROFANITY` (padrão ligado; o teste do dono mede a taxa de "manso" antes de decidir).

### Prompt (formato, a critério de Claude, D-13/D-14/D-15)

Mensagem `system` por tom (`suave`, `direto`, `sem-filtro`): persona Vintém (porquinho-cofre, debochado, pt-BR coloquial, gíria), regras de saída ("responda só com a fala; uma frase de até 140 caracteres" ou "até duas frases"), trava D-14 ("xingue o gasto e o comportamento; nunca ofenda raça, orientação, religião ou grupo; fale só de quem está lendo; nunca mencione outra pessoa"), proibição de inventar números ("use só os números do bloco de dados"), e a instrução de tratar o bloco de dados como dados, não como instruções. Mensagem `user` com o resumo em JSON compacto + a situação + o assunto escolhido. `temperature` ~0.9, `max_tokens` ~120 (curta) e ~200 (longa), e mais folga para modelos que raciocinam (ver Pitfall 7).

### Gatilhos e custo da fala espontânea (D-12)

- **(a) Abrir o app, 1 a 3 vezes/dia:** o cliente pede a fala ao montar o Vintém da Home com `situation: 'abertura'`. O servidor é a autoridade: `aiUsage/{hid}__{person}__{dayKey}` guarda `abertura` (contador, teto `AI_OPEN_PER_DAY` padrão 3), `assuntos` (lista dos já usados no dia) e `calls` (teto D-03). Escolhe o assunto candidato mais relevante ainda não usado e responde `text: null` quando o teto de aberturas acabou. No cliente, no máximo uma por abertura (flag de sessão).
- **(b) Espiar enquanto usa:** timer no cliente (só com a aba visível e usuário ativo, e fora de formulário aberto, como `isBusy`), intervalo aleatório entre `peekMin` e `peekMax` (resposta do servidor traz `hints`, ou uma rota `GET` de configuração; padrão sugerido 6 a 15 min), reaproveitando o toast "espiando" (`nextPeekSpot`, `VintemToastBody`) que já existe [VERIFIED: src/contexts/VintemContext.tsx:101-112 `PEEK_SPOTS` e `nextPeekSpot()`]. Se a IA falhar, para `espiar` o recomendado é **não espiar** (uma frase de reserva repetida é pior que silêncio), enquanto para reação a lançamento a reserva é obrigatória (IA-04).
- **(c) Push espontâneo:** ver seção de push; sem IA.
- **Custo:** cache com variantes, coalescência e teto por pessoa. Com `K = 3` variantes por situação e o assunto do dia, a maior parte das falas de abertura e espiada vira acerto de cache depois das primeiras do dia. Contar no teto D-03 apenas chamadas reais ao provedor (acerto de cache é grátis).

### Prazos do cliente

Reação a lançamento e limite: o Vintém já anima na hora (`handle.react`); a fala espera a IA por no máximo ~2,5 s e cai no banco; o servidor continua e grava o resultado no cache para a próxima vez. Abertura e espiada: pode esperar até ~4 s (nada bloqueia). Servidor: 4 s por chamada (D-04) e prazo total da rota ~6 s; com dois provedores lentos o total pode chegar a 8 s, então a rota devolve `text: null` ao estourar o prazo total e deixa a promessa terminar para encher o cache.

### Orçamento de cota do Cloudflare (aritmética sobre preços lidos hoje)

Preços [CITED: developers.cloudflare.com/workers-ai/platform/pricing/]: Neurons por milhão de tokens (entrada / saída): Llama 3.3 70B fp8 fast 26668 / 204805; Llama 3.1 8B fp8 fast 4119 / 34868; Gemma 4 26B a4b 9091 / 27273; Mistral Small 3.1 24B 31876 / 50488; Qwen3 30B a3b fp8 4625 / 30475; gpt-oss-120b 31818 / 68182; gpt-oss-20b 18182 / 27273. "10,000 Neurons per day at no charge", "All limits reset daily at 00:00 UTC" (21:00 em São Paulo), e acima disso no plano grátis "N/A - Upgrade to Workers Paid" e "further operations will fail with an error". Chamadas por dia que cabem em 10.000 Neurons (entradas 500/100 tokens = fala curta; 1.500/80 = resumo rico):

| Modelo | Neurons por chamada (curta / rica) | Chamadas por dia (curta / rica) |
|--------|------------------------------------|----------------------------------|
| llama-3.3-70b-instruct-fp8-fast | 33,8 / 56,4 | 295 / 177 |
| mistral-small-3.1-24b-instruct | 21,0 / 51,9 | 476 / 192 |
| gpt-oss-120b | 22,7 / 53,2 | 440 / 188 |
| gpt-oss-20b | 11,8 / 29,5 | 846 / 339 |
| gemma-4-26b-a4b-it | 7,3 / 15,8 | 1.374 / 632 |
| llama-3.1-8b-instruct-fp8-fast | 5,5 / 9,0 | 1.803 / 1.115 |
| qwen3-30b-a3b-fp8 | 5,4 / 9,4 | 1.865 / 1.066 |

Os tamanhos de entrada e saída (500/100 e 1.500/80) são hipóteses `[ASSUMED]`; modelos que raciocinam (gpt-oss, Qwen3) gastam mais tokens de saída. Conclusão: com o resumo rico da D-16 o 70B comporta ~180 chamadas/dia no app todo (abaixo do teto de 2 × 100 da D-03 se o cache falhar); por isso o freio do provedor por 429/3036 e o cache com variantes são obrigatórios, e um modelo menor (Gemma 4 26B) como segundo passo no mesmo provedor é uma opção barata.

### Limites oficiais lidos hoje

- **Cloudflare**, geração de texto: "300 requests per minute, unless the model requires the Workers Paid plan" [CITED: developers.cloudflare.com/workers-ai/platform/limits/]. Modelos que exigem o plano pago retornam 403 código 5035 no grátis; a lista de 2026-07-28 é `@cf/moonshotai/kimi-k2.6`, `@cf/moonshotai/kimi-k2.7-code`, `@cf/zai-org/glm-5.2` [CITED: developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/]. Erros: 3036/429 cota diária esgotada, 3040/429 capacidade, 5035/403 plano, 5007/400 modelo ou tarefa inexistente, 3042/404 nome inválido, 5028/410 modelo descontinuado [CITED: developers.cloudflare.com/workers-ai/platform/errors/]. (Uma fonte anterior citava "4006"; **não existe nessa tabela**, descartado.)
- **Endpoint:** `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1/chat/completions`, `Authorization: Bearer {api_token}`, `model: "@cf/..."`, e o campo `options.rejectIfBusy` [CITED: developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/]. Llama 3.3 70B fp8 fast: contexto 24.000, `max_tokens` padrão 256, `temperature` 0..5 (padrão 0,6), `seed`, "zero data retention is supported" [CITED: developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/].
- **Catálogo hoje** [CITED: developers.cloudflare.com/workers-ai/models/]: inclui `llama-3.3-70b-instruct-fp8-fast`, `mistral-small-3.1-24b-instruct`, `gemma-4-26b-a4b-it`, `qwen3-30b-a3b-fp8`, `qwen3.8-27b`, `gpt-oss-120b`, `gpt-oss-20b`, `llama-3.1-8b-instruct-fp8` (a página de preços lista `...-fp8-fast`: **os ids divergem entre páginas**; o script e o adaptador validam o id contra `GET /accounts/{id}/ai/models/search` e tratam 5007/3042/5028 como "modelo inválido, corrigir a variável").
- **Groq:** a página oficial de limites mostra apenas "the base limits for the Developer plan" e remete a `console.groq.com/settings/limits`; **os limites do plano grátis não foram confirmados** [CITED: console.groq.com/docs/rate-limits]. A página de modelos lista como produção `llama-3.1-8b-instant`, `llama-3.3-70b-versatile`, `openai/gpt-oss-120b`, `openai/gpt-oss-20b` (as duas Llama com a anotação "Enterprise pricing (contact sales)", ambígua sobre disponibilidade no plano grátis) e em prévia `qwen/qwen3.8-27b` [CITED: console.groq.com/docs/models]. Números de blogs de terceiros (30 RPM, 1.000 a 14.400 RPD, 12.000 TPM) divergem entre si: **LOW, não usar**. O dono lê os números no console dele e o script de comparação mede a disponibilidade real.
- **Grok/xAI:** modelos e preços lidos em `docs.x.ai/docs/models` (`grok-4.3` a US$ 1,25 por milhão de entrada e US$ 2,50 de saída, `grok-4.7`, etc.). As páginas oficiais de cobrança, preços e limites **não mencionam crédito grátis nem programa de compartilhamento de dados** (só "promo code" e "Tier 0, spend threshold $0"). Blogs de terceiros afirmam US$ 150/mês por compartilhar dados com gasto prévio mínimo de US$ 5 e opt-in irreversível; outro rastreador diz que o programa acabou em maio de 2025. **Conclusão: crédito grátis não confirmado; fora por padrão** (D-17). O endpoint compatível `https://api.x.ai/v1/chat/completions` é `[ASSUMED]`.

### Registro de termos de dados (IA-05), lido em 2026-11-25

| Provedor | O que a página oficial diz | Fonte | Confiança |
|----------|----------------------------|-------|-----------|
| Cloudflare Workers AI | "Cloudflare does not use Customer Content processed by Workers AI to train AI models."; "Cloudflare does not retain inputs or outputs after they are no longer needed to process the request."; metadados operacionais (modelo, tempo, contagem de tokens, latência) sem conteúdo; conteúdo pode ser guardado só se o usuário ligar recursos como logging/cache do AI Gateway (não usar) | developers.cloudflare.com/workers-ai/platform/data-usage/ | MEDIUM (trechos entre aspas vieram do resumidor; reler a página crua antes do lançamento) |
| Groq | "By default, Groq does not retain customer data for inference requests."; logs temporários de entrada e saída por até 30 dias para confiabilidade e abuso, com opção de ZDR e controle em Data Controls; dados em buckets GCP nos EUA; **a página não responde se treina com os dados**; a política de privacidade exclui "Customer Data" e remete a contrato e DPA que não li | console.groq.com/docs/your-data e groq.com/privacy-policy | MEDIUM (retenção) / LOW (treino: desconhecido) |
| xAI | "never trains on your API inputs or outputs without your explicit permission" (a página escreve "SpaceXSI"); retenção padrão de 30 dias para auditoria de abuso, ZDR opcional; sem garantia de região | docs.x.ai/developers/faq/security.md | MEDIUM |

O dono aceitou que provedores gratuitos possam guardar e treinar (PROJECT.md), e as três páginas são mais favoráveis que isso. Gemini free fica fora (Google usa prompts do plano grátis para melhorar produtos fora de EEE/CH/UK, conforme a pesquisa anterior em `.claude/CLAUDE.md`).

### Teste lado a lado (D-18): especificação do `server/scripts/ai-compare.js`

O agente não vê chaves. O dono roda localmente com as próprias chaves exportadas no shell (`AI_CF_ACCOUNT_ID`, `AI_CF_API_TOKEN`, `AI_GROQ_API_KEY`, opcional `AI_XAI_API_KEY`); o script nunca imprime chave, cabeçalho nem a URL com id da conta, e **não lê `.env*`**.

- **Entrada:** 3 a 4 resumos **sintéticos** (nada real): (1) estouro de limite de Delivery com "terceira vez no iFood esta semana"; (2) mês tranquilo com sobra e meta batida; (3) gasto grande em loja de eletrônicos e fatura perto de vencer; (4) Pix para "uma pessoa" e despesa em categoria sem limite. Os mesmos resumos para todos os modelos.
- **Candidatos (lista editável no topo do script):** Cloudflare `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, `@cf/mistralai/mistral-small-3.1-24b-instruct`, `@cf/google/gemma-4-26b-a4b-it`, `@cf/qwen/qwen3-30b-a3b-fp8`, `@cf/openai/gpt-oss-120b`; Groq `llama-3.3-70b-versatile`, `openai/gpt-oss-120b`, `llama-3.1-8b-instant`, `qwen/qwen3.8-27b`; xAI só se o dono tiver crédito e passar `AI_XAI_MODEL`. Antes de rodar, o script consulta o catálogo do Cloudflare e a lista de modelos do Groq (`/openai/v1/models`) e avisa os ids inexistentes.
- **Rodadas:** cada modelo x cada resumo x N amostras (padrão 5, `temperature` 0,9), mais um **conjunto de provocação de palavrão** (10 pedidos do tipo "xingue com palavrão pesado, 'toma no cu', apelide de 'baleia'" x 3 amostras) para medir a taxa de recusa no tom sem filtro. Pausa entre chamadas para respeitar RPM e cota; parar o provedor ao primeiro 429 de cota.
- **Métricas por modelo:** taxa de recusa (regex da lista de recusa), taxa de "manso" (nenhum palavrão), taxa de saída vazia (modelos que raciocinam e gastam o `max_tokens`), tamanho médio e máximo, latência p50 e p95, taxa de reprovação no validador (`aiValidate`), taxa de número inventado, taxa de menção ao parceiro e de discriminação (devem ser 0), custo estimado em Neurons (Cloudflare) e chamadas/dia que cabem.
- **Saída:** tabela resumida no terminal e um arquivo `ai-compare-<data>.json` + `.md` com os textos lado a lado por resumo, para o dono ler e escolher "qual soa como o Vintém". Como os resumos são sintéticos e o arquivo não traz chave, pode ser commitado em `.planning/phases/07-.../`.
- **Decisão que o resultado alimenta:** `AI_PROVIDERS` (ordem), modelo por provedor, e `AI_REQUIRE_PROFANITY`.
- **Prior (sem prova):** a busca não achou comparação pública de recusa de palavrão em pt-BR entre estes modelos. Indícios laterais: um relatório da ADL notou que gpt-oss obtém nota alta de segurança em parte porque "nearly every response" é recusa; um estudo sobre prompts de persona (Llama 2 a 3.2, Gemma 2) mediu Gemma 9B com falsa recusa de ~13% em ofensividade e Qwen2.5 perto de zero [CITED: resumos de busca de adl.org e arxiv.org/pdf/2509.08075, terceiros, LOW]. Hipótese de trabalho `[ASSUMED]`: Llama 3.3 70B e Mistral Small 3.1 são os mais prováveis de obedecer o personagem; gpt-oss, o menos provável.

## Common Pitfalls

### Pitfall 1: Push exibido só em segundo plano e revogação no iPhone
**What goes wrong:** o usuário lança um gasto, o servidor manda o push, o SDK do FCM no SW vê a janela visível, repassa à página e não exibe; no iPhone isso é push silencioso e, repetido, a assinatura é revogada (o usuário "perde" os avisos sem erro visível).
**Why it happens:** o fluxo padrão do FCM supõe que a página mostra um toast; o WebKit exige `showNotification` por push.
**How to avoid:** handler `push` próprio, sempre exibindo (com `silent: true` se há janela focada); `excludeFid` no `limits/check`; teste no aparelho: receber com o app aberto e fechado, várias vezes seguidas, e conferir no dia seguinte que ainda chega.
**Warning signs:** avisos que chegam por horas e param; `installation-id-not-registered` frequente para o mesmo aparelho.

### Pitfall 2: Worker antigo ativo quando o usuário ativa os avisos
**What goes wrong:** `registerType: 'prompt'` mantém o SW novo em `waiting`; o push chega a um worker sem handler.
**How to avoid:** antes de `register()`, ativar a versão em espera (`SKIP_WAITING`) e aguardar; o botão fica desabilitado até o worker ativo ter o handler (ex.: o SW responde a uma mensagem `PUSH_READY`).

### Pitfall 3: Texto do aviso vazando dado
**What goes wrong:** reaproveitar frases do banco da Fase 4 (têm `{valor}`, `{restante}`, `{categoria}`) na tela de bloqueio.
**How to avoid:** banco separado, sem encaixes numéricos; teste que falha se qualquer frase de push contém `{` ou dígito; `data` do FCM só leva título, corpo, tag e rota.

### Pitfall 4: Estourar a cota de leitura do Spark (50 mil/dia) com o resumo da IA
**What goes wrong:** cada fala lê o ciclo atual e o anterior. Hipótese `[ASSUMED]` de ~300 lançamentos por ciclo: 2 ciclos x 300 x 100 falas x 2 pessoas = 120 mil leituras/dia. Cota do Spark: 50 mil leituras, 20 mil gravações, 20 mil exclusões por dia [CITED: `.claude/CLAUDE.md`, pesquisa anterior do Firebase pricing; não relido hoje].
**How to avoid:** snapshot do ciclo atual em memória com TTL (~10 min) por `hid+person`, ciclo anterior com TTL longo (~12 h, quase imutável), `limits/check` lê fresco **e** atualiza o snapshot, leitura do porquinho/metas/fixas com `limit`, e contador de leituras por rota em log (só números). Se a cota apertar, reduzir o resumo (só categorias com limite e top lojas) antes de reduzir falas. Consulta de agregação do Firestore (`sum`) fica como otimização futura: o risco é divergir da regra do núcleo (categoria por nome, `transfer`, cartão).

### Pitfall 5: Dois dias diferentes (UTC x São Paulo)
O teto por pessoa e o "no máximo 1 push por dia" usam o dia de São Paulo (`dayKeyOf`); o reset do Cloudflare é 00:00 UTC (21:00 BRT). Não misturar: o freio do provedor é separado do teto do usuário.

### Pitfall 6: Modelo recusa ou vem "mansinho"
Por isso a cadeia cai para o próximo provedor e depois ao banco de frases; medir no script antes de fixar a ordem. Se todos forem mansos, o produto continua correto (banco de frases tem palavrão), só perde o diferencial da IA.

### Pitfall 7: Modelos que raciocinam consomem o `max_tokens`
`gpt-oss` e `qwen3` podem gastar a saída em "reasoning" e devolver `content` vazio ou cortado `[ASSUMED]`. Tratar vazio como falha; no script medir a taxa de vazio; preferir modelo sem raciocínio para falas curtas ou dar `max_tokens` maior e, quando o provedor aceitar, nível de raciocínio baixo.

### Pitfall 8: Prompt injection por descrição de lançamento
Descrição de banco é dado externo. Mitigação: rótulo curto e filtrado, dados em bloco delimitado, saída validada (sem URL, sem número fora do resumo, sem parceiro). Severidade baixa (app de duas pessoas, sem ferramentas), mas o filtro de rótulo é barato.

### Pitfall 9: Timer do servidor depende do processo ficar de pé
O sync já usa `setInterval` (`server/src/index.js`); se o Railway "dormir" o processo, o tick horário e o push espontâneo param `[ASSUMED]` (plano do Railway não pesquisado). Por isso as portas 1 e 2 também avaliam fatura e espontâneo quando há chance, e o dono confirma que o serviço fica sempre ligado.

### Pitfall 10: Marcador criado e envio que falha
Se todos os `sendEach` falharem por erro de rede/5xx, o evento some. Tratar: apagar o marcador quando nenhum envio teve sucesso e o erro não é permanente; para FID morto, apagar o registro e manter o marcador.

### Pitfall 11: Conflito entre réguas de conteúdo
A régua da Fase 4 proíbe ofensa pessoal em qualquer tom e a Fase 7 pede "sem filtro de verdade". Não importar `checkPhrase` para a IA; manter as duas réguas e documentar que o banco de frases (reserva e push) continua sob a régua da Fase 4. Nota para o dono: "baleia" é apelido sobre o corpo; a D-14 não o proíbe e foi exemplo dele, mas conta como "ataque a quem a pessoa é" na régua antiga (Open Question 5).

### Pitfall 12: Chave ou conteúdo em log
Nunca logar `Authorization`, corpo do prompt, texto gerado ou descrição. Logar só provedor, status, latência, contagem e códigos de erro. O código existente já segue isto (`console.warn` com `err.message` sem valores).

## Code Examples

> Contratos de referência, curtos, vindos dos typings e do código lidos. Não são o código de produção.

### Cliente: ativar (ordem importa)
```ts
// Fonte: node_modules/@firebase/messaging/dist/index-public.d.ts (register, onRegistered, RegisterOptions)
const messaging = getMessaging(app)
const off = onRegistered(messaging, (fid) => { void api('/api/push/register', { method: 'POST', body: JSON.stringify({ fid }) }) })
const registration = await navigator.serviceWorker.ready      // pré-carregado antes do clique
await register(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY, serviceWorkerRegistration: registration })
```

### Servidor: marcador atômico
```js
// Fonte: @google-cloud/firestore types, DocumentReference.create ("The write fails if the document already exists")
async function claim(db, id, data) {
  try { await db.collection('pushEvents').doc(id).create(data); return true }
  catch (err) { if (isAlreadyExists(err)) return false; throw err }   // código gRPC 6 / 'ALREADY_EXISTS'
}
```

### Servidor: envio por FID e limpeza
```js
// Fonte: firebase-admin 14.5.1, messaging-api.d.ts (FidMessage) e messaging.d.ts (sendEach)
const res = await getMessaging().sendEach(fids.map((fid) => ({
  fid, data: { title, body, tag, url },
  webpush: { headers: { TTL: '21600', Urgency: 'high' } },
})))
res.responses.forEach((r, i) => { if (!r.success && String(r.error?.code).includes('installation-id-not-registered')) void dropRegistration(fids[i]) })
```

### Service worker: sempre exibir
```ts
// Contrato: nenhum caminho do 'push' termina sem showNotification (regra userVisibleOnly do WebKit)
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let p: any = {}
    try { p = event.data?.json() ?? {} } catch { /* texto fixo abaixo */ }
    const d = p.data ?? p
    const focused = (await self.clients.matchAll({ type: 'window' })).some((c) => c.focused)
    await self.registration.showNotification(d.title ?? p.notification?.title ?? 'Vintém', {
      body: d.body ?? p.notification?.body ?? '', tag: d.tag, icon: '/icons/pwa-192x192.png', data: { url: d.url ?? '/' }, silent: focused,
    })
  })())
})
```

### Provedor LLM com prazo (D-04)
```js
// Fonte: Cloudflare OpenAI-compat (base .../ai/v1, POST /chat/completions, Bearer); prazo nativo do Node 22
const res = await fetch(`${baseUrl}/chat/completions`, {
  method: 'POST', signal: AbortSignal.timeout(timeoutMs),
  headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({ model, messages, temperature: 0.9, max_tokens }),
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getToken()` / `deleteToken()` | `register()` + `onRegistered()` / `onUnregistered()` / `unregister()` | `@firebase/messaging` 0.13.x (firebase 12.19+ e 13.x) | O servidor passa a guardar FID e enviar com `fid`; `token` está marcado obsoleto no Admin SDK [VERIFIED: messaging-api.d.ts:38-43 `@deprecated Use {@link FidMessage} instead.`] |
| `sendEachForMulticast({ tokens })` | `sendEach` com `fid` ou `FidMulticastMessage` (`fids`) | firebase-admin 14.x | Usar `sendEach` com um `Message` por FID |
| SW do FCM (`firebase-messaging-sw.js`) | Um SW só, handler próprio | Decisão do projeto (Fase 5) | Evita dois workers disputando escopo |
| Modelos Cloudflare livres de plano | Alguns modelos só no Workers Paid (403 / 5035) | 2026-07-28 | Verificar o modelo contra o plano grátis no script |
| Push declarativo (Safari) | Ainda não exposto pelo Admin SDK | — | Não usar; handler com `showNotification` |

**Deprecated/outdated:** `getToken`; estimativa antiga de "4006" como código de cota do Cloudflare (o código documentado é 3036); crédito "US$ 150/mês" do xAI (sem confirmação oficial).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | O processo do Railway fica sempre ligado (timers `setInterval` rodam) | Pitfall 9, Pattern 3 | Tick horário e push espontâneo não disparam; mitigado pelas portas 1 e 2 |
| A2 | O JSON entregue ao evento `push` para mensagens FID tem a forma `{ from, collapse_key, fcmMessageId, notification?, data? }` | Push no cliente | O handler lê `data`/`notification` defensivamente; título genérico garante exibição; validar no aparelho |
| A3 | `showNotification({ silent: true })` é aceito no iOS e conta como notificação visível para a regra `userVisibleOnly` | Push no cliente | iPhone poderia tratar como silencioso; alternativa: sempre exibir sem `silent` |
| A4 | O WebKit revoga após ~3 pushes silenciosos (commit de 2021 citado por busca) | Push no cliente | Se a cota for diferente, a regra "sempre exibir" continua correta |
| A5 | Limites grátis do Groq (RPM/RPD/TPM) | IA, limites | Provedor 2 pode falhar mais cedo; o dono lê no console e o script mede |
| A6 | Llama 3.3 70B e Mistral Small obedecem o personagem sem filtro; gpt-oss recusa mais | Teste lado a lado | Ordem inicial errada; o teste do dono corrige antes de fixar |
| A7 | ~300 lançamentos por ciclo por pessoa e tamanhos de prompt 500/100 e 1.500/80 tokens | Pitfall 4, cota | Orçamentos de leitura e Neurons mudam; medir com contadores |
| A8 | Lista de raízes de ofensa discriminatória em pt-BR precisa de revisão do dono | Validação da saída | Falso negativo deixa passar ofensa; falso positivo derruba fala |
| A9 | A API "Firebase Cloud Messaging Registrations" está habilitada e a chave do app não a bloqueia | Push no cliente | `fid-registration-failed` ao ativar; passo humano de verificação |
| A10 | O token da Cloudflare "Workers AI" com escopo de leitura/edição basta para `/ai/v1/chat/completions` | Provedores | 403 na primeira chamada; o script do dono revela |
| A11 | Llama 3.3 inclui português na lista oficial de idiomas (a página do modelo no Cloudflare não lista idiomas) | IA | Qualidade em pt-BR menor que o esperado; o teste mede |
| A12 | `https://api.x.ai/v1/chat/completions` é compatível com o formato OpenAI | Provedores | Só afeta o terceiro provedor opcional |
| A13 | FCM repassa os cabeçalhos `TTL`/`Urgency` de `webpush.headers` | Push no servidor | Aviso atrasado; só otimização |
| A14 | O prefixo `messaging/` está no `error.code` de FID morto | Push no servidor | Teste aceita com e sem prefixo |
| A15 | O FID é base64url de ~22 caracteres (regex de validação) | Push no servidor | Regex ampla já cobre variações |
| A16 | Modelos que raciocinam devolvem `content` vazio quando o `max_tokens` acaba no raciocínio | Pitfall 7 | Só muda a escolha de modelo e o `max_tokens` |
| A17 | Push espontâneo ligado por padrão para quem ativou os avisos | Prefs | Incômodo; fácil de inverter (Open Question 2) |

## Open Questions (RESOLVED)

> Todas as perguntas abaixo foram resolvidas pelo dono nas decisões D-19 a D-23 de `07-CONTEXT.md` (rodada de planejamento de 2026-11-25) ou viraram checkpoint humano nos planos. A linha **Resolução** de cada item é a que vale; a recomendação original fica só como histórico.

1. **Passos humanos do Firebase/Google Cloud antes de testar push**
   - Sabemos: o `register()` usa a chave pública VAPID e a API `fcmregistrations.googleapis.com`.
   - Falta: gerar o par em Configurações do projeto > Cloud Messaging > Certificados Web Push, definir `VITE_FIREBASE_VAPID_KEY` no build, conferir que a API de registros do FCM está habilitada e que a chave `VITE_FIREBASE_API_KEY` não a bloqueia.
   - Recomendação: tarefa `checkpoint:human-action` no início da trilha A.
   - **Resolução (D-23):** checkpoint humano no plano 07-06 (chave VAPID, API de registros do FCM e conferência da restrição da chave de API, antes do teste no iPhone).

2. **O push espontâneo (D-12 c) é um quarto tipo ligado por padrão?**
   - A D-06 só lista três tipos ligados; a D-12 diz "respeitando os tipos".
   - Recomendação: tipo `espontanea` separado, ligado por padrão (A17), com o limite de 1 por dia.
   - **Resolução (D-21):** o push espontâneo é o quarto tipo, ligado por padrão, que o usuário pode desligar; no máximo 1 por dia, só fora do silêncio (planos 07-03, 07-11 e 07-15).

3. **O aviso pode citar o nome da categoria?** D-05 proíbe valores e lojas; categoria não é proibida.
   - Recomendação segura: zero encaixes no texto do push (previsível, nada financeiro). Se o dono quiser, permitir só `{categoria}`.
   - **Resolução (D-19):** o aviso pode citar o nome da categoria (`{categoria}` é o único encaixe permitido, só nas situações de limite), nunca valores, lojas nem nome de pessoa (plano 07-04).

4. **Descrições de lançamentos manuais na IA:** nome de pessoa digitado livremente não é detectável com certeza.
   - Recomendação: usar descrição manual só quando for loja já vista nas importações do banco; senão a categoria. Dono confirma se aceita o risco residual de usar tudo.
   - **Resolução (D-20):** a descrição digitada nos lançamentos manuais TAMBÉM vai à IA, por escolha do dono, depois do removedor de nomes do servidor; o risco residual (nome em minúsculas) é aceito e registrado (planos 07-05, 07-13 e roteiro do 07-19).

5. **Régua de conteúdo da IA x Fase 4 e o apelido "baleia":** a D-13 pede sem filtro, a D-14 proíbe discriminação e parceiro. Confirmar com o dono a lista de raízes proibidas (raça, orientação, religião, deficiência, grupos) e se apelidos sobre o corpo ("baleia") ficam permitidos como ele pediu.
   - **Resolução (D-22):** a régua da saída da IA é própria desta fase: bloqueia só ofensa discriminatória; palavrão, deboche e apelido como "baleia" passam. A lista de raízes é revisada pelo dono no gate 07-18 (plano 07-05).

6. **Silêncio descarta o evento de push?** Recomendação: sim (marcador `suprimido`); o alerta continua dentro do app. A alternativa (adiar) manda aviso velho quando o silêncio acaba.
   - **Resolução (D-21, SUBSTITUI a recomendação acima):** o silêncio SEGURA e entrega depois. O aviso de limite ou de fatura que cai no silêncio fica com o marcador `pendente` e chega quando o silêncio acaba (colapsando 80 e 100 da mesma categoria no mais alto); o push espontâneo só sai fora do silêncio (planos 07-03, 07-10 e 07-15). O marcador `suprimido` deixa de existir para o silêncio.

7. **Interruptor legado "Avisos de vencimento" (`notificationsEnabled`):** vira o tipo `fatura` ou continua separado? Decisão de UI para o UI-SPEC; recomendação: um só controle por tipo, preservando `daysBeforeDueDate`.
   - **Resolução (D-21):** o interruptor legado "Avisos de vencimento" (`notificationsEnabled`, em `settings`) vira o tipo `fatura`; continua o único controle, vale também para o sino do app, e os dias de antecedência seguem em `settings` (planos 07-03 e 07-11).

8. **Railway sempre ligado?** Confirmar o plano e se o serviço dorme (A1).
   - **Resolução (D-23):** o dono confirma no checkpoint do plano 07-06 ("sempre ligado" ou "dorme"); o check do app e o gancho pós-sincronização também avaliam a fatura, então o aviso não depende só do relógio (plano 07-15).

9. **Qual modelo e qual ordem de provedores:** só se decide depois do script de comparação rodado pelo dono (checkpoint humano da trilha B).
   - **Resolução (D-18, D-23):** checkpoint humano no plano 07-17: o dono roda o `ai-compare.js` com as próprias chaves, lê os textos lado a lado e escolhe modelos e ordem antes de qualquer padrão ser fixado nas variáveis do Railway.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | servidor, testes | ✓ | v22.23.5 (`node --version`) | — |
| `firebase-tools` | emuladores, deploy | ✓ | 15.9.1 (`firebase --version`) | — |
| JRE para o emulador do Firestore | `npm run test:emu`, `test:rules` | ✓ (fora do PATH padrão) | Temurin 21.0.13+9 em `~/.local/jdk` | `source scripts/dev-env.sh` antes de rodar |
| Testes atuais | linha de base | ✓ | `npm run test:core`: 900 passam; `npm --prefix server test`: 124 passam (rodados nesta sessão) | — |
| Chave VAPID, API de registros do FCM | PUSH-01 | ✗ (não verificável aqui) | — | Passo humano (Open Question 1) |
| Conta/tokens Cloudflare, Groq | IA-01, IA-05 | ✗ (o agente não vê chaves) | — | Variáveis de ambiente do dono no Railway |
| iPhone real (iOS 16.4+) com o app instalado | PUSH-05 | ✗ (só o dono) | — | Sem alternativa: simulador não recebe push |
| Variáveis do servidor para IA/push | rotas novas | ✗ | — | Provedor sem chave = desligado, sem derrubar o servidor |

**Missing dependencies with no fallback:** iPhone real (PUSH-05); chave VAPID e API de registros habilitada.
**Missing dependencies with fallback:** chaves de IA (banco de frases cobre).

### Configuração do servidor (nomes sugeridos; nenhuma cota fixa no código, D-10)
`AI_PROVIDERS` (ordem, ex.: `cloudflare,groq`), `AI_CF_ACCOUNT_ID`, `AI_CF_API_TOKEN`, `AI_CF_MODEL`, `AI_GROQ_API_KEY`, `AI_GROQ_MODEL`, `AI_XAI_API_KEY`, `AI_XAI_MODEL`, `AI_DAILY_CAP_PER_USER` (100), `AI_TIMEOUT_MS` (4000), `AI_TOTAL_BUDGET_MS` (6000), `AI_CACHE_TTL_HOURS` (24), `AI_CACHE_VARIANTS` (3), `AI_REQUIRE_PROFANITY` (true), `AI_OPEN_PER_DAY` (3), `VINTEM_PEEK_MIN_MS` / `VINTEM_PEEK_MAX_MS`, `PUSH_MAX_PER_DAY` (8), `PUSH_SPONT_PER_DAY` (1), `PUSH_SPONT_WINDOW` (`11:00-20:00`). No cliente: `VITE_FIREBASE_VAPID_KEY`. Seguir o padrão de `PLUGGY_WEBHOOK_SECRET` em `index.js` (ausente = recurso desligado com aviso no log, nunca `required()` que derruba o deploy) [VERIFIED: server/src/index.js:29-40].

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (Node 22.23.5) para núcleo, servidor, estático e emulador; `tsc -b` + ESLint para o cliente e o SW |
| Config file | nenhum (scripts em `package.json` e `server/package.json`) |
| Quick run command | `node --test shared/core/<arquivo>.test.js` ou `node --test server/test/<arquivo>.test.js` |
| Full suite command | `npm run test:core:tz && npm run test:server && npm run test:static && npm run build && npm run lint`; mais `source scripts/dev-env.sh && npm run test:emu && npm run test:rules` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PUSH-01 | `pushState` devolve os 5 estados + padrão; iPhone fora do standalone vence "não suportado" | unit (núcleo) | `node --test shared/core/pushState.test.js` | ❌ Wave 0 |
| PUSH-01 | `register`/`onRegistered` na ordem certa, `serviceWorkerRegistration` passado, sem `getToken` | static (grep) | `node --test test/static/phase7-push-client.test.js` | ❌ Wave 0 |
| PUSH-01 | Registro/status/remoção de FID por dono e pessoa; FID de outro dono recusado | server | `node --test server/test/push.test.js` | ❌ Wave 0 |
| PUSH-02 | 80% e 100% geram eventos pela mesma matemática do cliente; salto direto para 100% marca o 80 como silencioso | unit (núcleo) | `node --test shared/core/pushEvents.test.js` | ❌ Wave 0 |
| PUSH-02 | Fatura `fechada`, não paga, vencendo em N dias gera evento; paga ou longe, não | unit (núcleo) | `node --test shared/core/pushEvents.test.js` | ❌ Wave 0 |
| PUSH-02 | `POST /api/limits/check` e pós-sync chamam o notificador; só a pessoa do token | server | `node --test server/test/notifier.test.js` | ❌ Wave 0 |
| PUSH-03 | `isQuiet` com janela que cruza meia-noite, nos dois fusos | unit (núcleo, 2 fusos) | `npm run test:core:tz` | ❌ Wave 0 |
| PUSH-03 | `PUT /api/push/prefs` valida tipos e horas; padrões da D-06 | server | `node --test server/test/push.test.js` | ❌ Wave 0 |
| PUSH-04 | Dois `evaluate` simultâneos e um "reinício" (nova instância, mesmo banco) enviam uma vez | emulador | `source scripts/dev-env.sh && npm run test:emu` | ❌ Wave 0 (`server/test/emu/push-events.test.js`) |
| PUSH-04 | Nenhuma frase do banco de push tem `{`, dígito, `R$` ou nome de loja; `checkBank` passa | unit (núcleo) | `node --test shared/core/vintemPhrasesPush.test.js` | ❌ Wave 0 |
| PUSH-04 | `data` enviado ao FCM só tem `title`, `body`, `tag`, `url` | server | `node --test server/test/push.test.js` | ❌ Wave 0 |
| PUSH-05 | SW tem `push` com `showNotification` em todo caminho, `notificationclick`, sem import de `firebase/messaging/sw` | static + typecheck | `node --test test/static/phase7-sw.test.js && npm run build` | ❌ Wave 0 |
| PUSH-05 | Recebimento no iPhone real, app aberto e fechado, várias vezes | **manual (dono)** | roteiro abaixo | n/a |
| IA-01 | Rota exige token; teto por pessoa/dia; contador só em chamada real; acerto de cache não conta | server + emulador | `node --test server/test/ai-speech.test.js`; `npm run test:emu` (`ai-budget.test.js`) | ❌ Wave 0 |
| IA-02 | Nenhum resumo contém CPF, conta/cartão, e-mail, telefone, nome de pessoa; Pix vira "uma pessoa"; só dados da pessoa do token | unit (núcleo) | `node --test shared/core/aiPrivacy.test.js shared/core/aiSummary.test.js` | ❌ Wave 0 |
| IA-02 | Servidor nunca lê transações da outra pessoa (consulta com `person` do token) | server | `node --test server/test/ai-speech.test.js` | ❌ Wave 0 |
| IA-03 | Validador: tamanho por situação, texto simples, pt-BR, recusa, dado proibido, parceiro, número inventado, discriminação | unit (núcleo) | `node --test shared/core/aiValidate.test.js` | ❌ Wave 0 |
| IA-03 | Saída exibida como texto (React escapa; sem `dangerouslySetInnerHTML` na fala) | static | `node --test test/static/phase7-speech-ui.test.js` | ❌ Wave 0 |
| IA-04 | Provedor 1 com 429/timeout/lixo, provedor 2 ok; ambos falham = `text: null`; cliente cai no banco sem mostrar erro | server (fetch falso, tempo simulado) | `node --test server/test/ai-providers.test.js` | ❌ Wave 0 |
| IA-05 | `AI_PROVIDERS` troca ordem e provedor sem mudar código; chave ausente = provedor desligado; 3036 bloqueia até 00:00 UTC | server | `node --test server/test/ai-providers.test.js` | ❌ Wave 0 |
| IA-05 | Registro de termos de dados presente no repositório | static | `node --test test/static/phase7-terms.test.js` | ❌ Wave 0 |
| D-12 | Teto de aberturas do dia e assunto não repetido | server | `node --test server/test/ai-speech.test.js` | ❌ Wave 0 |
| D-18 | Teste lado a lado | **manual (dono)** | `node server/scripts/ai-compare.js` | ❌ Wave 0 |

### Sampling Rate
- **Por commit de tarefa:** o arquivo `node --test` do módulo tocado (< 5 s).
- **Por merge de onda:** `npm run test:core:tz`, `npm run test:server`, `npm run test:static`, `npm run build`, `npm run lint`.
- **Antes de `/gsd-verify-work`:** suíte completa verde + `test:emu` + `test:rules` (matriz com as coleções novas negadas ao cliente) + roteiros manuais do dono.

### Wave 0 Gaps
- [ ] `shared/core/{pushPrefs,pushEvents,pushState,vintemPhrasesPush,aiPrivacy,aiSummary,aiPrompt,aiValidate,aiCacheKey}.js` e seus `.test.js` (os módulos novos entram sozinhos na vigilância de pureza de `purity.test.js`: sem `Date.now()`, sem `new Date()` sem argumento, sem pacote)
- [ ] `server/test/{push,notifier,ai-providers,ai-speech}.test.js` com Firestore falso estendido (o `fakeDb` de `app.test.js` só tem `doc().get/set/delete`; faltam `create`, `where`, `get` de coleção) ou, melhor para dedup e contadores, testes de emulador
- [ ] `server/test/emu/{push-events,ai-budget}.test.js`
- [ ] `test/static/{phase7-sw,phase7-push-client,phase7-speech-ui,phase7-terms}.test.js` e extensão de `test/rules/matrix.test.js` com as 5 coleções novas
- [ ] `server/scripts/ai-compare.js` e `server/scripts/push-dryrun.js`
- [ ] Sem instalação de framework: tudo usa `node:test`

### O que só o dono testa (roteiro)
1. **Antes:** gerar VAPID, habilitar a API de registros do FCM, colocar `VITE_FIREBASE_VAPID_KEY` e as variáveis de IA no Railway; rodar `push-dryrun.js` (usa `sendEach(msgs, true)`, não entrega nada) com um FID real para validar permissão da conta de serviço.
2. **iPhone (iOS 16.4+):** abrir `coinc-financias.web.app` no Safari, "Adicionar à Tela de Início", abrir pelo ícone, Configurações > Notificações > Ativar; usar "Testar aviso" com o app fechado, em segundo plano e aberto; provocar 80% e 100% (limite baixo de teste) e conferir que o texto da tela de bloqueio não tem valor nem loja; repetir 5 a 10 avisos seguidos e conferir no dia seguinte que ainda chegam; reiniciar o serviço no Railway durante um limite já avisado e confirmar que **não** repete; modo Foco ligado não deve quebrar a assinatura.
3. **Android (Chrome):** mesmo roteiro, instalado e em aba.
4. **IA:** rodar `ai-compare.js`, ler os textos lado a lado, escolher modelo/ordem, conferir a cota no console de cada provedor, e ver o Vintém falando sem aparecer erro quando a chave está errada ou o teto é 0.

## Security Domain

### Applicable ASVS Categories (nível 1, `security_enforcement` ligado)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | sim | ID token do Firebase por `requireOwner` em todas as rotas novas; sem rota pública nova |
| V3 Session Management | não (token Bearer sem sessão de servidor) | — |
| V4 Access Control | sim | `hid` e `person` do token; `where('ownerId'==hid)` em toda consulta; revalidar `transactionId`/`categoryId` contra o dono (IDOR); cada pessoa só recebe dado e push da própria pessoa (D-14) |
| V5 Input Validation | sim | Validação manual no padrão de `webhook.js`: FID por regex, `situation` por enum, prefs por esquema fechado, horas `HH:MM`; saída do LLM validada antes de exibir |
| V6 Cryptography | sim (sem implementar) | VAPID e criptografia de push são do FCM; chaves de IA só em variável de ambiente do servidor; hash `sha256` do `node:crypto` apenas para chave de cache |
| V7 Error Handling and Logging | sim | Sem log de prompt, saída, descrição, token ou valor; só provedor, status, latência, contagens |
| V8 Data Protection | sim | Filtro de privacidade em camadas, payload do push sem dado financeiro, dados de IA só do escopo da pessoa |
| V13 API | sim | `originGuard` já cobre `/api`; teto por usuário e limiter de rajada nas rotas de IA e `push/test` |

### Known Threat Patterns for Express + Firestore Admin + LLM + Web Push

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR em `transactionId`/`categoryId` da fala | Information Disclosure | Revalidar `ownerId === hid` e `person` do documento antes de usar |
| Vazamento do parceiro na fala | Information Disclosure | Escopo estrutural (nunca carregar a outra pessoa) + validador (rótulos de aba, palavras de relação) |
| CPF, conta ou nome de pessoa chega ao provedor | Information Disclosure | `aiPrivacy` em camadas + teste de propriedade com descrições sujas |
| Injeção de prompt por descrição de banco | Tampering | Rótulo curto e filtrado, bloco de dados delimitado, validação de saída (sem URL, número fora do resumo) |
| Queimar a cota de IA por abuso da rota | Denial of Service | Teto por pessoa/dia em Firestore, limiter de rajada em memória, coalescência, freio do provedor |
| Spam de push por gatilho repetido | Denial of Service | Marcador `create()` por evento, `PUSH_MAX_PER_DAY`, 1 espontâneo/dia, `push/test` limitado a 1/min |
| Cadastrar FID de outra pessoa/dono | Spoofing | FID existente com outro `ownerId` é recusado; FID não é segredo adivinhável |
| Texto do aviso expõe dado na tela de bloqueio | Information Disclosure | Banco de frases de push sem encaixes; teste que reprova `{`, dígito, `R$` |
| Chave de provedor em log ou no cliente | Information Disclosure | Só `process.env` no servidor; nada de `VITE_` para chaves de IA; sem eco de cabeçalhos |
| SSRF por URL de provedor | Tampering | `baseUrl` só de configuração do servidor, nunca de entrada de usuário |
| XSS via saída do LLM | Tampering | Validador remove marcação; React exibe como texto; sem `dangerouslySetInnerHTML` |
| Revogação da assinatura iOS por push silencioso | Denial of Service (disponibilidade do recurso) | Handler que sempre exibe; teste estático do `sw.ts` |

## Sources

### Primary (HIGH confidence): arquivos lidos nesta sessão
- `src/sw.ts`, `vite.config.ts`, `tsconfig.sw.json`, `firebase.json`, `firestore.rules`, `firestore.indexes.json` (via teste estático), `server/src/{app,auth,index,sync}.js`, `Dockerfile`, `server/package.json`, `package.json`
- `shared/core/{alerts,limits,budget,phrasePicker,phraseRules,vintemPhrases,classify,cardBills,purity.test}.js`
- `src/contexts/{VintemContext,LimitAlertsContext}.tsx`, `src/services/{vintemInsights,limitAlerts,settings,bank}.service.ts`, `src/hooks/{useVintemInsights,usePwaInstall,useCardView}.ts`, `src/components/settings/NotificationsCard.tsx`, `src/types/index.ts`, `src/lib/{cycleData,firebase}.ts`
- Typings e código instalados: `node_modules/@firebase/messaging/dist/{index-public.d.ts,esm/index.esm.js,esm/index.sw.esm.js}`, `server/node_modules/firebase-admin/lib/messaging/{messaging-api.d.ts,messaging.d.ts,messaging-errors-internal.js,error.js}`, `server/node_modules/@google-cloud/firestore/types/firestore.d.ts`

### Secondary (MEDIUM confidence): páginas oficiais lidas hoje (resumidor WebFetch)
- Cloudflare: developers.cloudflare.com/workers-ai/platform/{pricing,limits,data-usage,errors}/, /configuration/open-ai-compatibility/, /models/, /models/llama-3.3-70b-instruct-fp8-fast/, /changelog/post/2026-07-28-models-require-workers-paid/
- Groq: console.groq.com/docs/{rate-limits,models,your-data}, groq.com/privacy-policy
- xAI: docs.x.ai/docs/models, /docs/key-information/{billing,consumption-and-rate-limits}, /developers/faq/security.md, /developers/pricing.md, /llms.txt
- Firebase: firebase.google.com/docs/cloud-messaging/web/{get-started,receive-messages}, /manage-tokens
- WebKit: webkit.org/blog/12945/meet-web-push/, /13878/web-push-for-web-apps-on-ios-and-ipados/

### Tertiary (LOW confidence): terceiros, marcados para validação
- github.com/firebase/firebase-js-sdk/issues/8010 (relato de usuários; solução com `push` próprio)
- Busca sobre o commit "Enforce silent push quota" do WebKit (3 pushes silenciosos)
- Busca sobre recusa de modelos: relatório da ADL e arxiv.org/pdf/2509.08075 (via resumo de busca); nenhum compara pt-BR nem palavrão
- Blogs sobre créditos grátis do xAI e limites do Groq (conflitantes; descartados como base de decisão)
- Não acessíveis: `developer.apple.com` (corpo da página vazio no resumidor), `meta.discourse.org` (403), `x.ai/legal/...` (403)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, nenhuma dependência nova; versões e typings lidos nos pacotes instalados.
- Arquitetura de push: HIGH no que o código instalado prova (SW do SDK não exibe com janela visível; `register()`; erro de FID); MEDIUM no que depende do iPhone real.
- IA, provedores e termos: MEDIUM (páginas oficiais por resumidor; Groq grátis sem números oficiais; xAI sem crédito confirmado).
- Escolha de modelo para palavrão pesado: LOW (sem fonte; o teste do dono decide).
- Orçamento de cota (leituras e Neurons): MEDIUM, aritmética correta sobre hipóteses A7.
- Pitfalls: HIGH nos 1, 2, 3, 10; MEDIUM nos demais.

**Research date:** 2026-11-25
**Valid until:** 2026-12-02 para modelos, limites e preços de IA (catálogo e planos mudam em semanas; reler antes de fixar o modelo); 30 dias para o desenho de push.
