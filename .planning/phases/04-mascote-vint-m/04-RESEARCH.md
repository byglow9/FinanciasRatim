# Phase 4: Mascote Vintém - Research

**Researched:** 2026-11-19
**Domain:** Animação de personagem SVG por molas em React 19 + TypeScript, máquina de estados derivada de fatos financeiros, detector local de insights, banco de frases em pt-BR, integração com Home, lançamento e Configurações
**Confidence:** HIGH para o que vem do repositório (arquivos lidos nesta sessão); MEDIUM para heurísticas de dados (calibração de "gasto grande", filtro de nome de loja) que dependem do uso real

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Visual do Vintém**
- **D-01:** Corpo **sempre** em **verde-moeda escuro da paleta Moeda** (`#14532d`, o token de ação), com olhos brancos. Sem variantes de cor (preto e creme foram descartados). Contrastes medidos no sketch 020: olho/corpo 9,1:1, corpo/fundo do arco 8,6:1.
- **D-02:** Personalidade no estado neutro: **esperta e debochada** (sobrancelha levantada, meio sorriso, pálpebra mais baixa). **Atenção ao planejar:** no sketch 020 o neutro ficou simétrico e sério; a assimetria debochada (uma pálpebra mais baixa, uma sobrancelha mais alta) precisa ser restaurada na implementação.
- **D-03:** **Estilo escolhido pelo dono: sketch 020, variante B (minimalista)** (`.planning/sketches/020-vintem-verde/index.html?v=b`): bolha sólida, orelhas na silhueta, focinho só como leve relevo, **sem boca desenhada e sem patas visíveis**, a emoção toda nos olhos, sobrancelhas, pálpebras e postura. Os sketches 018 (reprovado) e 019 (reprovado em partes) não valem. Referências de estilo do dono em `.planning/sketches/references/mascote/` (fora do git): direção de estilo apenas, nada copiado.
- **D-04:** O desenho é um porquinho-cofre com partes separadas em grupos SVG com id (olhos, pupilas, pálpebras, sobrancelhas, orelhas, rabo, fenda, corpo, focinho, acessórios) para animar por partes. A **fenda** é só um corte fino e discreto no dorso; **não há moeda saindo do dorso**. A moeda só aparece na animação de lançar gasto (cai e some na fenda) e na festa. Sem emojis; original.
- **D-01b:** O dono está fixando uma **paleta definitiva** (creme, areia, sálvia, oliva `#4c513b`, quase-preto), e a **cor de ação do app muda** do verde `#14532d` para o oliva. O corpo do Vintém **segue o token de ação** (`--color-action`), nunca um hex literal, e os contrastes citados no UI-SPEC (medidos com `#14532d`) devem ser **remedidos com o token novo** durante a implementação. O UI-SPEC e os sketches ficam como estão; quem planeja trata a cor como token.
- **D-06b:** **Faixas de uso do limite e precedência das reações** (fecha o aviso do checker do UI-SPEC): abaixo de 75% = humor do ritmo do mês; **de 75% até menos de 80% = atento** (aviso antes do alerta); **de 80% a 100% = perto do limite** (alerta de 80%); **acima de 100% = estourou** (triste/bravo conforme o tom). Precedência entre reações simultâneas, da maior para a menor: estourou > gasto grande (surpreso) > perto do limite > atento > meta batida ou aporte (feliz) > ritmo > sonolento. Reação de lançamento novo tem prioridade sobre o humor de fundo só durante a janela de poucos segundos (D-09).
- **D-05a:** **Feliz = opção 2 do sketch 020**: olhos em arco de sorriso, com um único brilho que pulsa e gira. As opções 1 e 3 foram descartadas.
- **D-05b:** Os sete estados do sketch 020 valem: neutro, feliz, triste, bravo, sonolento, surpreso e **atento** (sétimo, usado entre 75% e 100% do limite, antes do estouro). Triste (baixo, achatado, orelhas caídas, lágrima) e atento (esticado, orelhas em pé, pupila pequena, gota de suor) são inconfundíveis por postura e silhueta, e o teste de distinção por pares do sketch (limiar de 12% de pixels, a 84px e a 48px) vira teste de regressão. **Pontos fracos conhecidos a melhorar:** o triste parece um disco achatado a 84px e as orelhas dele parecem asas; lágrima e suor não aparecem no perfil; o flip do giro tem um quadro muito fino no meio.
- **D-05c:** **Giro de lado**: perfil de porquinho de verdade (corpo comprido, focinho à frente, uma orelha, um olho, duas patas, rabinho) por flip com leve squash, com tudo recortado pela silhueta do corpo (sem vazamento de orelha em nenhum ângulo).
- **D-05d (animação):** Molas amortecidas em JavaScript (solver em `requestAnimationFrame`, delta limitado), uma mola por parâmetro, com hierarquia pai-filho (corpo, cabeça, orelhas e rabo) para ação sobreposta: orelhas e rabo seguem o corpo com atraso e assentam depois dele. **Piscar por pálpebra**, não por escala do olho: fecha em cerca de 80 ms, segura cerca de 40 ms e abre em cerca de 150 ms com leve overshoot, esperas aleatórias de 2 a 6 s, piscada dupla de vez em quando (cerca de 1 em 8), e também ao mudar de estado e em sacada grande. **Sacadas do olhar** a cada 200 a 600 ms (transição de 50 a 80 ms) com a pupila presa dentro do olho. Antecipação e squash and stretch com volume preservado (tolerância de 8%). Com reduzir movimento ligado, respiração, piscar, deriva e seguir o cursor param, mas as expressões continuam mudando em poses estáticas. Rive e Lottie foram avaliados e descartados (o arquivo `.riv` só se cria no editor; Lottie não reage ao estado).
- **D-05e:** **Ícone de app não faz parte desta fase.** O dono mandou referências de ícones (em `references/mascote/ref-01-app-icons.png`) para serem usadas depois, na Fase 5 (identidade Coinki). Os quadrados de ícone dos sketches 018 e 019 foram reprovados.

**O que dispara cada estado**
- **D-05:** Fatos que mexem no humor: **ritmo do mês**, **% do limite de uma categoria** (limiares de 80% e 100%, os mesmos dos alertas), **lançamento que acabou de entrar** (manual ou importado do banco) e **meta ou Porquinho** (aporte, meta batida, dinheiro novo).
- **D-06:** Quando dois fatos pedem humores diferentes, **o pior vence**: categoria estourada > perto do limite > ritmo acima > no ritmo. Ele nunca fica feliz com algo estourado.
- **D-07:** **Sonolento** quando o usuário fica vários dias sem lançar nada. **Surpreso** quando entra um gasto bem acima do normal da categoria (hipótese inicial: cerca de 3 vezes a média dos últimos ciclos; sem histórico, cai numa fração do limite do mês, a calibrar na pesquisa) ou uma receita inesperada.
- **D-08:** **Dados do banco velhos** deixam o Vintém **neutro** (critério de sucesso do roadmap), reaproveitando a lógica de `StaleNotice`.
- **D-09:** A reação a um lançamento novo (susto, bronca, festa) **dura alguns segundos e volta** ao humor de fundo do mês. O balão fica até o usuário tocar ou até o próximo evento.

**Tom e banco de frases**
- **D-10:** Três tons: suave acolhe, direto informa, sem filtro zoa. O padrão é **sem filtro, com palavrão e deboche pesado**, sem atacar quem o usuário é. Escolha do tom nas Configurações (MASC-05).
- **D-11:** **Dialeto e vocabulário brasileiros de verdade**, coloquiais e com gíria, para **não parecer uma IA falando**. Nada de frase de manual, nada de "Olá! Notei que...".
- **D-12:** **Banco grande de frases**, com muitas variantes por situação e tom, sem repetir as últimas usadas. A Claude escreve o banco e o dono revisa e corta o que não soar como ele, em um checkpoint de revisão antes de fechar a fase. A quantidade exata por situação fica a critério do planejamento (a opção de 5 a 8 foi superada pelo pedido de "várias e várias"), mas cada situação com variante nos três tons.
- **D-13:** As frases usam encaixes de dados reais (`{loja}`, `{categoria}`, `{vezes}`, `{valor}`, `{pct}`, `{dias}`), preenchidos pelo detector de insights.

**Detector de insights (pronto para a IA da Fase 7)**
- **D-14:** O Vintém **entende o que o usuário gastou**, não só ritmo e limite: reconhece, por exemplo, muito iFood na semana, e usa isso para dar bronca e zoar. A leitura é feita por um **detector local de regras, sem IA**, sobre os lançamentos (lojas, categorias, frequência na semana, valor contra a média).
- **D-15:** **A IA fica na Fase 7, mas tudo na Fase 4 é desenhado para ela herdar.** O detector produz **insights estruturados** (tipo, sujeito, métricas, severidade, evidência) que o Vintém pode **guardar**, e o balão de frases consome o mesmo formato. A Fase 7 troca ou complementa a escrita da fala por IA lendo os mesmos insights, com o banco de frases como reserva. O formato do insight é um contrato único, simples e claro, que serve aos dois lados. Insights nunca incluem CPF, números de conta ou cartão nem nomes de pessoas físicas de Pix (restrição de privacidade do PROJECT.md); nomes de lojas são permitidos.

**Onde ele aparece**
- **D-16:** No **arco da Home** (slot central de 84px do `ArcGauge`, que hoje tem um porquinho provisório), **ao lançar um gasto** (reação curta depois de salvar), na **Central de Limites** (um Vintém pequeno com fala sobre a categoria mais crítica) e em **estados vazios e erros**.
- **D-17:** A **página de teste** (MASC-06) é uma **rota oculta**, sem link na navegação, acessível digitando o endereço, também em produção para testar no celular instalado. Controles: porcentagem do limite, seguir o cursor, girar de lado, todos os estados e os três tons.
- **D-18:** **Sem cursor, no celular:** o olhar **segue o toque** por um instante e **deriva sozinho** (olhadas aleatórias e piscar); tocar nele faz ele girar ou falar. Com **reduzir movimento** ligado, o balanço, o piscar, a deriva e o seguir-o-cursor param, mas as expressões continuam mudando (poses estáticas).

### Claude's Discretion
- Estrutura interna do detector, nomes dos tipos de insight e do formato guardado, desde que seja um contrato único e documentado.
- Quantidade exata de frases por situação e tom, e o algoritmo de sorteio sem repetição.
- Duração exata da reação e do balão, curvas de animação.
- Calibração do limiar de "gasto grande" e de "dias sem lançar".

### Deferred Ideas (OUT OF SCOPE)
- Geração de comentários por IA gratuita, cache e reserva de frases (Fase 7; IA-01 a IA-05). A Fase 4 só prepara o contrato de insights.
- Push no celular com falas do Vintém (Fase 7).
- Vintém no onboarding e na tela "Instale no celular" (Fase 5).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MASC-01 | Usuário vê o Vintém (porquinho-cofre original em SVG) na Home com balão de fala | `VintemSlot` como `children` do `ArcGauge` (ArcGauge.tsx:74-77); `VintemBalloon` entre `RhythmPill` e `ShortcutRow` (DashboardPage.tsx:158); arte em JSX estático + motor imperativo (Padrões 1 a 3) |
| MASC-02 | Seis (hoje sete) estados escolhidos por regras a partir do ritmo, do limite e do que o usuário fez | `deriveVintemState` puro em `shared/core` com a precedência de D-06b e janela de reação de D-09 (Padrão 4); entradas reais mapeadas na tabela "De onde vêm os fatos" |
| MASC-03 | Movimento fluido (balanço, piscar), seguir cursor, girar de lado, respeita reduzir movimento | Modelo puro de molas testável em Node + `World` único de rAF + `useReducedMotion` com `useSyncExternalStore` (Padrões 1, 2, 3) |
| MASC-04 | Balão com banco de frases próprias em pt-BR com variantes por tom | `shared/core/vintemPhrases.js` + `phrasePicker` sem repetição + folha de revisão gerada (Padrão 6) |
| MASC-05 | Tom nas Configurações (suave, direto, sem filtro), padrão sem filtro | `VintemToneCard` em `SettingsPage` entre Aparência e Notificações; campo `Settings.vintemTone` por pessoa via `updateSettings` com caminho pontilhado (Padrão 8) |
| MASC-06 | Página de teste com controles (% do limite, seguir cursor, girar de lado) | Rota oculta `/vintem-teste` dentro do `ProtectedRoute`, sem link (Padrão 9); autoteste por CDP |
| MASC-07 | Mascote, nome e textos originais | Teste de conteúdo sobre o banco (sem frases do app de referência: lista de bloqueio fornecida pelo dono) + checkpoint humano de revisão (D-12) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Extraídos de `./CLAUDE.md` e `./.claude/CLAUDE.md` (lidos nesta sessão). O planejador trata como decisões travadas.

- **Comandos:** `npm run dev`, `npm run build` (`tsc -b && vite build`), `npm run lint`. Testes do núcleo: `npm run test:core`, `npm run test:core:tz` (UTC e `Asia/Tokyo`), `npm run test:static`, `npm run test:rules` (emulador). [VERIFIED: package.json:11-16]
- **Idioma:** interface em pt-BR; textos do mascote originais (PROJECT.md "Originalidade", "Idioma").
- **Privacidade (PROJECT.md):** nunca CPF, número de conta ou cartão, nem nome de pessoa física; nomes de loja são permitidos. Comentários exibidos como **texto simples**.
- **Custo:** rodar de graça (Spark: 50K leituras, 20K escritas por dia). Sem Cloud Functions.
- **Stack do mascote (Feature 2):** SVG inline + CSS, reducer tipado, **um** `pointermove` passivo em `window` com rAF, `useReducedMotion` com `matchMedia` assinado a mudanças; **proibido** SMIL, Lottie, Rive, XState; `motion` adiado.
- **Escopo de dono:** todo `query(` leva `...ownerScope()` primeiro e toda gravação grava `ownerId: ownerId()`; `updateDoc` nunca menciona `ownerId`. Guardado por `test/static/owner-queries.test.js` (auto-descobre `src/services/*`). [VERIFIED: test/static/owner-queries.test.js:1-7]
- **GSD:** edições de repositório só dentro de um fluxo GSD (o executor de fase cumpre).
- **Padrões herdados (UI-SPEC 03/03.1):** escala tipográfica 12/16/28/56, pesos 400/700, sem emoji, ícones Lucide, alvos de toque >= 44px, tema claro único.
- **Convenção de comentários:** código e comentários em português sem acento nos arquivos existentes (`shared/core/*.js`); os textos de interface levam acento. Seguir o estilo local.

## Summary

O sketch 020 mistura **modelo** (molas, alvos, piscar, olhar, reações) e **desenho** (setAttribute) dentro da mesma classe `Vintem`. A decisão estrutural desta pesquisa é **separá-los**: o modelo vira JavaScript puro em `shared/core/` (sem DOM, sem relógio, RNG injetado), o que o coloca sob a mesma esteira de testes que o resto do núcleo (`node --test` em UTC e Tokyo, mais a guarda de pureza que auto-descobre todo `.js` da pasta) e permite provar em Node, de forma determinística, convergência de molas, volume, tempos do piscar, sacadas, movimento reduzido e reações. O desenho (escrever atributos SVG por `ref`) fica em `src/lib/vintem/` em TypeScript e é verificado no Chrome por CDP (distinção por pares, vazamento do giro, contraste), como o sketch já faz. React nunca recebe estado por quadro: um `World` singleton com um único `requestAnimationFrame` avança só as instâncias visíveis (`IntersectionObserver`), pausa com a aba oculta e dorme quando tudo assentou em movimento reduzido.

A "máquina de estados" não é um autômato por eventos: são **fatos** (BudgetView, frescor do banco, somente leitura, dias sem lançar, evento de lançamento) reduzidos por uma função pura com a precedência de D-06b, mais uma janela de reação de poucos segundos (D-09). Todas as entradas já existem no repositório (`useCycleBudget`, `useBankFreshness`, `useReadOnly`, `LaunchSheet.submit`); a única mudança de contrato é **expor `transactions` em `useCycleBudget`** (hoje só devolve `view`), para o detector não refazer leituras. O detector de insights vira um contrato único (`Insight`, versão 1) consumido hoje pelo seletor de frases e amanhã pela IA da Fase 7; ele só mostra nome de loja quando o nome vem de um dicionário de marcas ou passa um filtro conservador, e nunca grava descrição crua.

O banco de frases é dado em `shared/core` (um módulo JS exportando objeto congelado), com ids estáveis, encaixes validados por teste (nenhum `{encaixe}` sai sem preencher, nenhum dado proibido, pt-BR com acento, tamanho de pior caso <= 110 e <= 80), seleção sem repetir as últimas N e uma **folha de revisão gerada** em Markdown para o dono cortar por id. Nenhum pacote novo é necessário. O maior risco de regressão no repositório são guardas estáticas existentes que quebram com mudanças legítimas desta fase (rotas = exatamente 9, índices = exatamente 19, lista de coleções nas regras e na matriz) e que o plano deve atualizar de propósito.

**Primary recommendation:** Portar o sketch como **modelo puro em `shared/core/vintem*.js` + desenhista TS em `src/lib/vintem/`**, com um `World` global de rAF; derivar humor por função pura com a precedência de D-06b; criar o contrato `Insight` v1 e o banco de frases em `shared/core`; integrar por um barramento externo (sem re-render por quadro) com ponto de disparo em `LaunchSheet.submit`.

## Architectural Responsibility Map

O app é uma SPA (Firebase Hosting) + Firestore + servidor Express que só faz sincronia bancária. A Fase 4 não toca o servidor.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Desenho SVG e escrita de atributos por quadro | Browser / Client (`src/lib/vintem`, `src/components/vintem`) | — | DOM só existe no navegador; loop rAF fora do React |
| Solver de molas, piscar, olhar, reações, estados (modelo) | `shared/core` (JS puro) | Browser (consome) | Testável em Node em UTC e Tokyo, sem relógio e sem pacote (guarda de pureza) |
| Humor de fundo e precedência (D-06b) | `shared/core` (JS puro) | Browser (hooks entregam os fatos) | Regra de negócio fica no núcleo, como `rhythm` e `thresholdsToFire` |
| Detector de insights | `shared/core` (JS puro) | Browser (entrega as transações) | Mesmo código poderá rodar no servidor na Fase 7 (o servidor já importa `../../shared/core/*.js`) |
| Banco de frases e seleção | `shared/core` (dado + função pura) | Browser | Reserva offline da IA (IA-04), sem rede |
| Leitura de transações e linha de base | Browser → Firestore (já existente: `getTransactionsInRange`) | Cache local (localStorage) | Evita leituras repetidas (cota Spark) |
| Guardar insights ("guardar") | Firestore (`vintemInsights`, opcional, plano separado) | localStorage (conjunto "já escrito") | Dono do dado = `ownerId`; sem índice composto novo |
| Tom do Vintém | Firestore (documento `settings/main`) | Browser (Context) | Mesmo padrão de `tabNames` e `notificationsEnabled` |
| Rota oculta de teste | Browser (React Router) | — | Só roteamento de cliente; autenticada pelo `ProtectedRoute` |
| Reação ao lançar | Browser (`LaunchSheet` → barramento) | — | O evento nasce no cliente depois da gravação confirmada |

## Standard Stack

### Core

Nenhum pacote novo. Tudo abaixo já está instalado e foi lido neste ambiente.

| Biblioteca | Versão | Papel | Por que é o padrão aqui |
|------------|--------|-------|-------------------------|
| react / react-dom | 19.2.4 | UI, `useSyncExternalStore`, `useId` | [VERIFIED: node -e require('react/package.json').version -> 19.2.4] |
| typescript | 5.9.3 (`erasableSyntaxOnly`, `allowJs`, `include: ["src","shared"]`) | Tipos; o núcleo JS é tipado por JSDoc com `// @ts-check` | [VERIFIED: tsconfig.app.json] |
| vite | 7.3.1 | Build; alias `@` e `@shared` | [VERIFIED: vite.config.ts] |
| `node:test` + `node:assert/strict` | Node 22.23.5 | Testes do núcleo e guardas estáticas | [VERIFIED: node --version -> v22.23.5; package.json `test:core`, `test:static`] |
| lucide-react | ^0.577.0 | Ícones de interface (`message-circle`, `x`, `check`); o Vintém **não** é ícone Lucide | [VERIFIED: package.json] |
| Chrome headless via CDP (`scripts/ux-audit/cdp.mjs`) | Chrome 152.0.7977.75 em `/usr/bin/google-chrome` | Autoteste de pixels e DOM | [VERIFIED: google-chrome --version; cdp.mjs usa `process.env.CHROME_BIN \|\| '/usr/bin/google-chrome'`] |

### Supporting

| Biblioteca | Versão | Papel | Quando usar |
|------------|--------|-------|-------------|
| date-fns + `@shared/core/time.js` | ^4.1.0 | Apenas textos relativos já existentes | O detector usa **só** `zonedParts`/`dayKeyOf`/`daysBetweenParts` do núcleo (fuso de São Paulo), nunca date-fns |
| zod | ^4.3.6 | Opcional: validar o `Insight` lido do Firestore | Só se o plano de persistência quiser validar na leitura |

### Alternatives Considered

| Em vez de | Poderia usar | Tradeoff |
|-----------|--------------|----------|
| Modelo puro em `shared/core` (JS) | Modelo em `src/lib/vintem/*.ts` | TS pode rodar sob `node --test` (Node >= 22.18 remove tipos por padrão, testado aqui com um `.ts` mínimo), mas exigiria imports relativos com `.ts`, novo script de teste e escapar da guarda de pureza e do ciclo UTC/Tokyo. `shared/core` herda tudo isso de graça |
| JS próprio de molas | `motion`, Rive, Lottie, XState | Travado: D-05d e CLAUDE.md. Não reavaliar |
| `node:test` | vitest | `vitest` aparece no CLAUDE.md como recomendação, mas **não está em `package.json`** [VERIFIED: package.json devDependencies]. O runner estabelecido é `node:test`; não introduzir um segundo |

**Installation:** nenhuma.

**Version verification:** nenhum pacote a resolver (`npm view` não se aplica). Versões lidas dos módulos instalados.

## Package Legitimacy Audit

Esta fase **não instala pacote externo**. Nenhuma linha de auditoria; nenhum `checkpoint:human-verify` de instalação é necessário. Se o planejador ou o executor decidir acrescentar um pacote (por exemplo `motion`), a decisão contradiz D-05d e deve voltar ao usuário.

**Packages removed due to [SLOP] verdict:** nenhum (não aplicável)
**Packages flagged as suspicious [SUS]:** nenhum (não aplicável)

## Architecture Patterns

### System Architecture Diagram

```
 FATOS (React, baratos, só quando mudam)                    EVENTOS
 ┌──────────────────────────────────────────────┐   ┌──────────────────────────────┐
 │ useCycleBudget(viewPerson) -> {view, transactions*}│   │ LaunchSheet.submit (após gravar) │
 │ useBankFreshness() -> {suppress}                   │   │ GoalsPage contribute (meta batida)│
 │ useReadOnly() -> {readOnly}                        │   │ toque no Vintém / no balão        │
 │ useArea() -> {settings.vintemTone, categoryDefs}   │   └───────────────┬──────────────┘
 └───────────────────────┬──────────────────────┘                   │ vintemBus.emit(...)
                         │                                          ▼
                         ▼                          ┌────────────────────────────────────┐
        ┌────────────────────────────────┐          │ VintemProvider (tom, fala, histórico) │
        │ shared/core (JS puro, testado) │◄─────────┤  - decide: reação no arco OU toast    │
        │  insights.buildInsights()      │          └───────────────┬────────────────────┘
        │  vintemMood.deriveState()      │                          │
        │  phrasePicker.pick()           │                          ▼
        └───────────────┬────────────────┘          VintemSlot / VintemInlineRow / VintemToast
                        │ {state, situation, slots}        │  (React estático: SVG em JSX)
                        ▼                                  │ ref -> createVintemView(svg)
              texto simples no balão (aria-live)           ▼
                                           ┌──────────────────────────────────────────┐
                                           │ World (singleton, 1 rAF)                 │
                                           │  IntersectionObserver: só visíveis        │
                                           │  visibilitychange: pausa; dt <= 1/30     │
                                           │  step(dt): model.update -> depois draw    │
                                           └───────────────┬──────────────────────────┘
                                                           ▼
                                  VintemModel (shared/core, molas)  ->  pose {números}
                                                           ▼
                                   view.draw(pose): setAttribute com checagem de mudança
```

Fluxo do caso principal: o usuário salva um gasto, `submit` grava, chama `bumpData()` e emite `launched` no barramento; o `VintemProvider` calcula a reação (`reactionForLaunch`), escolhe a fala (`pick`), e o `VintemSlot` (se montado na Home) roda `model.react('susto')` enquanto o balão recebe o texto e a região viva o anuncia; se não há slot montado, o provider enfileira o `VintemToast`.

### Recommended Project Structure

```
shared/core/
├── vintemSpring.js        # Spring, PARAMS (k,c), blinkEnv, mulberry32  (+ .test.js)
├── vintemStates.js        # KEYS, DEFAULT, STATE_PARAMS (7 estados), stateFromPct (+ .test.js)
├── vintemModel.js         # VintemModel + World puro (alvos, piscar, olhar, reações)  (+ .test.js)
├── vintemMood.js          # deriveVintemState, reactionForLaunch, severidade  (+ .test.js)
├── insights.js            # contrato Insight v1, merchantOf, buildInsights, baseline (+ .test.js)
├── vintemPhrases.js       # banco de frases (dado) + SITUATIONS + TONES
├── phrasePicker.js        # fill, pick sem repetição, limites de tamanho (+ .test.js)
src/lib/vintem/
├── view.ts                # createVintemView(svg): DOM writer (setAttribute com cache)
├── world.ts               # singleton rAF + IntersectionObserver + pointer + visibilidade
├── geometry.ts            # constantes de geometria (paths do corpo, orelha, perfil)
└── selftest.ts            # autoteste por pixels (import dinâmico só com ?test)
src/components/vintem/
├── Vintem.tsx  VintemSlot.tsx  VintemBalloon.tsx  VintemInlineRow.tsx  VintemToast.tsx  VintemEmpty.tsx
src/contexts/VintemContext.tsx      # tom, fala atual, histórico, decisão slot-ou-toast
src/hooks/useReducedMotion.ts
src/services/vintemInsights.service.ts   # opcional (plano separado)
src/components/settings/VintemToneCard.tsx
src/pages/VintemTestPage.tsx
scripts/vintem/review-sheet.mjs     # gera a folha de revisão de frases
scripts/ux-audit/vintem.mjs         # CDP: roda /vintem-teste?test&w=360, exige FALHAS 0
test/static/phase4-*.test.js
```

### Pattern 1: Modelo puro + desenhista (a divisão que decide tudo)

**O quê:** `VintemModel` guarda as molas e calcula alvos/atualiza (portado de `targets()` e `update()` do sketch, linhas 226-290), expõe `model.pose` (objeto de números) e nunca toca DOM. O desenhista TS lê `pose` e escreve atributos (portado de `draw()`/`eyeDraw()`, linhas 291-380).
**Por quê:** os testes 2 a 7 e 11 do sketch (molas, volume, respiração, piscar, olhar, reduzido, reações) viram testes de Node determinísticos com RNG semeado e relógio simulado; só os testes por pixel (8, 9, 10, 12) precisam do Chrome.
**Contrato do modelo:**

```js
// shared/core/vintemModel.js  (// @ts-check)
// Sem DOM, sem relogio: o tempo e simulado (World.t) e o acaso entra por `rand`.
export class VintemModel {
  /** @param {{ state: VintemState, rand: () => number, reduced?: () => boolean, getPointer?: () => Pointer | null, hostRect?: () => Rect | null }} o */
  constructor(o) { /* molas por parametro, flags de reacao, token */ }
  setState(s) {}
  setTurn(on) {}            // gira de lado
  react(kind) {}            // 'spend' | 'susto' | 'bronca' | 'festa' | 'wake'
  touch() {}                // acorda se sonolento, senao so sinaliza
  update(dt) {}             // avanca; usa this.world.t
  snapPose() {}             // pula para o alvo (entrada no viewport, testes)
  get pose() {}             // numeros para o desenhista
}
```

Fonte do sketch para cada bloco (todos lidos nesta sessão): solver `Spring` (linhas 76-82), tabela `P` de (k,c) (84-85), `ST` (93-103), `blinkEnv` (126-134), `targets` (226-281), reações (389-431).

### Pattern 2: `World` singleton com um único rAF

**O quê:** módulo `src/lib/vintem/world.ts` com `register(instance)`/`unregister`. O laço só roda enquanto há instância visível; pausa com `document.hidden`; `dt` limitado a 1/30 s; ordem do quadro: **todas as leituras primeiro** (`model.update`, que pode chamar `getBoundingClientRect` numa sacada), **depois todas as escritas** (`view.draw`), como o sketch faz (`W.step` e `W.render`, linhas 112-118), evitando layout forçado.
**Regras:**
- `IntersectionObserver` por host com `rootMargin: '48px'`; instância fora da tela não avança nem desenha. Ao reentrar depois de mais de 1,5 s fora, `model.snapPose()` antes de continuar (evita "alcançar" a pose na frente do usuário).
- Pausa por `document.hidden`: o rAF já pausa em aba de fundo [CITED: developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame: "requestAnimationFrame() calls are paused in most browsers when running in background tabs"]; ainda assim zerar `last` no `visibilitychange` para o primeiro quadro não herdar um `dt` gigante (o limite de 1/30 s já protege).
- Um `pointermove` passivo e um `pointerdown` passivo em `window`, registrados quando há ao menos uma instância com `follow`, removidos quando não há. Guardar `pointerType`: mouse mantém a última posição; toque/caneta expira em **1,2 s** (D-18).
- Sono: com movimento reduzido e todas as instâncias visíveis assentadas (`model.isSettled()`), cancelar o rAF e religar em `setState`/`react`/`pointer`. Em movimento normal o laço roda sempre (a respiração nunca para).
- `later(ms, fn)` (fila de tempo simulado) mora no `World` puro, com token por instância; `destroy()` marca a instância como morta e as entradas pendentes viram no-op.
- Custo: o desenhista guarda o último valor de cada atributo e só chama `setAttribute` quando muda (o olho em repouso entre sacadas e o corpo quase parado deixam de escrever). Em repouso o custo por instância é de dezenas de escritas por quadro, no pior caso; com duas ou três instâncias (arco, linha de limites, balão) a conta fica abaixo do orçamento de 60 fps em celular intermediário [ASSUMED: estimativa por contagem de escritas, sem medição; UI-SPEC já deixa 60 fps como item manual do UAT].

### Pattern 3: Ponte React (SVG estático em JSX + efeito de montagem)

```tsx
// src/components/vintem/Vintem.tsx (esqueleto)
export function Vintem({ state, size, follow = true, decorative = true }: VintemProps) {
  const rawId = useId()
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '')      // seguro em url(#...) e em seletores
  const svgRef = useRef<SVGSVGElement>(null)
  const viewRef = useRef<VintemViewHandle | null>(null)
  const reduced = useReducedMotion()

  useEffect(() => {                                     // monta e desmonta (StrictMode: simétrico)
    const handle = createVintemView(svgRef.current!, { state, follow })
    viewRef.current = handle
    return () => { handle.destroy(); viewRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- estado inicial só na montagem
  }, [])
  useEffect(() => { viewRef.current?.setState(state) }, [state])
  useEffect(() => { viewRef.current?.setReduced(reduced) }, [reduced])
  return <svg ref={svgRef} viewBox="0 0 240 200" aria-hidden="true" focusable="false" /* ...grupos com id uid-* */ />
}
```

Regras: arte em **JSX**, nunca `innerHTML` nem `dangerouslySetInnerHTML` (guarda estática do UI-SPEC #13); ids de `clipPath` únicos por instância com `useId` sanitizado (o formato de `useId` mudou entre as 19.x; sanitizar elimina a dependência do formato [ASSUMED: formato exato em 19.2]); a escrita por quadro usa `ref` e nunca `setState`. O lint do projeto usa `reactHooks.configs.flat.recommended` (eslint-plugin-react-hooks ^7) [VERIFIED: eslint.config.js], cujas regras de pureza/refs proíbem `Math.random()` e leitura de `ref.current` durante a renderização: todo acaso e toda leitura de ref ficam em efeitos e no modelo.

### Pattern 4: Humor derivado por função pura (precedência D-06b + janela D-09)

Não é um autômato por eventos. É `deriveVintemState(facts, reaction, nowMs)`:

```js
// shared/core/vintemMood.js  (resumo do contrato)
/** @typedef {{
 *   loading:boolean, readOnly:boolean, isPast:boolean, noIncome:boolean, suppressed:boolean,
 *   rhythmLevel: 0|1|2|3|4|null, worstPct:number|null, worstCategoryId:string|null, allBelow40:boolean,
 *   daysSinceLast:number|null, goalOrPiggyCheer:boolean, bigSpendCategoryId:string|null, tone:'suave'|'direto'|'sem-filtro'
 * }} MoodFacts */
// Saida: { state, situation, subject } onde situation e uma chave do banco de frases (ou null = calado).
```

Precedência de **situação** (D-06b, da maior para a menor): `limite-estourou` (> 100%) > `gasto-grande` > `limite-perto` (80% a 100%) > `limite-atento` (75% a < 80%) > meta/aporte (`festa`/`porquinho-guardou`) > ritmo (`ritmo-estourou`, `ritmo-atencao`, `ritmo-folgado`) > `sem-lancar`. Precedência de **estado** (D-06, "o pior vence"; UI-SPEC "Regras de humor"): triste(5) > bravo(4) > atento(3) > neutro(2) > feliz(1); `sonolento` e `surpreso` são sobreposições. Fatos que forçam neutro e calado (UI-SPEC e D-08): carregando, sem renda, ciclo passado, `suppressed`, somente leitura.

Faixas por **inteiros**, no estilo do núcleo (sem float): `pct = Math.floor(spent*100/limit)` já vem em `BudgetRow.pct` e **não satura em 100** [VERIFIED: budget.js, doc de `BudgetRow`: "`pct` e inteiro (para baixo) e NAO satura em 100: 45000 de 40000 da 112"]. Cortes: `< 75` ritmo; `75 <= pct < 80` atento; `80 <= pct <= 100` perto; `> 100` estourou. Cuidado com a fronteira: o alerta oficial usa `spent * 100 >= limit * 80` e `spent > limit` [VERIFIED: alerts.js, `thresholdsToFire`: `if (spent * 100 >= limit * 80) reached.push(80)` e `if (spent > limit) reached.push(100)`], então `pct === 100` com `spent === limit` ainda é "perto" e **não** estourou. O estado `estourou` deve usar `row.state === 'over'` (que é `spent > limit`), nunca `pct >= 100`.

Janela de reação (D-09): `Reaction = { kind, state, untilMs } | null`, vive no `VintemProvider`; `deriveVintemState` devolve o estado da reação enquanto `nowMs < untilMs` e o humor de fundo depois. Durações do UI-SPEC: `spend` 1,4 s, `susto` 1,3 s, `bronca` 1,7 s, `festa` 2,3 s. A reação nova cancela a anterior (token).

**Conflito a resolver (Q1):** D-06b diz que "estourou" é "triste/bravo conforme o tom"; o UI-SPEC P-09 fixa por porcentagem (100 a 130% bravo, acima de 130% triste). Recomendação: manter as faixas por porcentagem do UI-SPEC como padrão e deixar o tom **só** trocar a faixa de 100 a 130% (`suave` -> triste; `direto` e `sem-filtro` -> bravo). Está em `[ASSUMED]` até o dono confirmar.

### Pattern 5: Contrato único `Insight` v1 e detector local

```js
// shared/core/insights.js  (// @ts-check)
export const INSIGHT_VERSION = 1

/**
 * Contrato unico (D-15). Quem consome hoje: o seletor de frases. Quem consome na Fase 7: a IA,
 * via toAiPayload (que descarta `evidence`). Nunca carrega descricao crua, CPF, conta, cartao nem
 * nome de pessoa fisica.
 * @typedef {{
 *   v: 1,
 *   id: string,                       // deterministico: `${person}__${cycleKey}__${type}__${subject.key}__${window}`
 *   type: InsightType,
 *   subject: { kind: 'merchant'|'merchant-group'|'category'|'cycle', key: string, label: string|null },
 *   metrics: { count?: number, totalCents?: number, avgCents?: number, ratioPct?: number,
 *              pct?: number, limitCents?: number, spentCents?: number, days?: number, windowDays?: number },
 *   severity: 0|1|2|3,                // 0 nota, 1 leve, 2 aviso, 3 forte
 *   evidence: { txIds: string[], dayKeys: string[] },   // so ids e chaves de dia
 *   cycleKey: string,
 *   day: string                       // dayKey 'YYYY-MM-DD' (sem Date: o nucleo nao usa relogio)
 * }} Insight
 * @typedef {'delivery-heavy'|'merchant-repeat'|'category-over-average'|'spend-spike'
 *   |'days-without-launch'|'limit-near'|'limit-over'|'rhythm'} InsightType
 */
```

Mapa `tipo -> situação do banco de frases` (tabela fixa no mesmo módulo): `delivery-heavy`/`merchant-repeat` -> `delivery-semana` e `loja-repete` (situações **novas**, ver abaixo); `category-over-average` -> `categoria-acima-media`; `spend-spike` -> `gasto-grande`; `days-without-launch` -> `sem-lancar`; `limit-near` -> `limite-perto`; `limit-over` -> `limite-estourou`; `rhythm` -> `ritmo-*`.

**Regras iniciais (constantes exportadas e calibráveis, todas em inteiros):**

| Regra | Condição inicial | Métricas | Severidade |
|-------|------------------|----------|-----------|
| `delivery-heavy` | >= 3 saídas de marca do grupo `delivery` nos últimos 7 dias de calendário (São Paulo) | `count`, `totalCents`, `windowDays: 7` | 3 compras = 1; 4 = 2; >= 5 = 3 |
| `merchant-repeat` | mesma loja (`merchantKey`) >= 3 vezes em 7 dias, excluindo o que `delivery-heavy` já cobre | idem | idem |
| `category-over-average` | gasto da categoria no ciclo, até o dia corrido, >= 130% da média dos 3 ciclos anteriores **proporcional ao mesmo dia**, e diferença >= R$ 50 | `spentCents`, `avgCents`, `ratioPct` | 130% = 1; 160% = 2; >= 200% = 3 |
| `spend-spike` (D-07) | uma saída >= **3x o ticket médio** da categoria (média por lançamento nos 3 ciclos anteriores, >= 5 amostras); sem histórico: >= **30% do limite do mês** da categoria; sem histórico e sem limite: não dispara | `totalCents`, `avgCents`, `ratioPct` | 2 (3 se >= 5x) |
| `days-without-launch` (D-07, P-17) | `daysBetweenParts(zonedParts(ultimo), zonedParts(agora)) >= 3` e dado do banco não velho | `days` | 3 dias = 1; 5 = 2; >= 7 = 3 |
| `limit-near` / `limit-over` | `row.pct` e `row.state` da `BudgetView` (reuso do núcleo, sem refazer conta) | `pct`, `spentCents`, `limitCents` | 2 / 3 |

**Interpretação a confirmar (Q2):** D-07 diz "cerca de 3 vezes a média dos últimos ciclos". Esta pesquisa adota **ticket médio por lançamento** (um gasto isolado contra o gasto típico da categoria). A leitura alternativa, 3 vezes o **total mensal** médio, quase nunca dispararia numa compra única. `[ASSUMED]`; calibrar com o histórico real do dono na primeira execução do detector (ver Pitfall 11).

**Marca/loja e privacidade (`merchantOf`).** As descrições do banco passam por `cleanDescription`, que **gera** textos como "Pix para Maria Silva" e "Pix de João Souza" e "Transferencia de ..." [VERIFIED: classify.js:56-80, `return \`Pix para ${titleCase(name)}\`` e `return \`Pix de ${titleCase(name)}\``]. Lançamento manual sem descrição digitada grava o **nome da categoria** como descrição [VERIFIED: LaunchSheet.tsx: `description: typed || category.name`]. Portanto `merchantOf(tx)` precisa de uma ordem rígida:

1. `normalize(description)` (de `classify.js`); se casa `^pix (para|de) `, `^transferencia`, `^ted\b`, `^doc\b`, contém sequência de **6 ou mais dígitos** (CPF, CNPJ, conta, cartão), contém `@`, ou é igual ao nome de uma categoria: **não é loja** (`label: null`, sem chave legível).
2. Casa o **dicionário de marcas** (`{ key, label, group, test: RegExp }`): iFood (`group: 'delivery'`, cobre `ifood` e `ifd*`), Uber, 99, Rappi, Netflix, Spotify, Mercado Livre, Amazon, Shopee etc. -> `label` do dicionário e `group`.
3. Nome desconhecido só vira `label` se **parece estabelecimento** (contém token como `ltda`, `me`, `mei`, `eireli`, `sa`, `restaurante`, `padaria`, `mercado`, `farmacia`, `posto`, `lanchonete`, `pizzaria`, `supermercado`, `loja`) **e** não tem sequência longa de dígitos. Caso contrário, `label: null` e a chave de agrupamento é um hash (`h:` + FNV-1a do texto normalizado), de modo que **a descrição nunca entra no `id` nem no documento guardado**.

Isto é heurística conservadora para evitar nomes de pessoa física; o dicionário e a lista de tokens são dados em `insights.js` e crescem com o uso. `[ASSUMED]` (Q3: o dono confirma a política de nomes desconhecidos).

**De onde vêm as transações do detector:** o `useCycleBudget` já carrega `current.transactions` (CycleInputs) e hoje devolve só `view`; **expor `transactions`** no retorno (mudança aditiva) evita nova leitura [VERIFIED: useCycleBudget.ts:94-100, retorno `{ view, cycle, loading, error, refetch }`]. A linha de base (3 ciclos anteriores) exige **uma** consulta de intervalo (como `useCycleSeries` faz: `getTransactionsInRange(person, first.start, last.end)` [VERIFIED: useCycleSeries.ts]); guardar só **agregados** (por `categoryId`: `{ cycles, totalAvgCents, ticketAvgCents, samples }`) em `localStorage` com chave `vintem:baseline:v1:{person}:{cycleKey}:{salaryDay}` (ciclos passados não mudam), de modo que a consulta roda no máximo uma vez por ciclo por aparelho. Sem nomes de loja no cache.

### Pattern 6: Banco de frases em dado + seletor puro

**Formato e local:** `shared/core/vintemPhrases.js` exporta um objeto congelado (dado, não código; sem import; a guarda de pureza o aceita). Módulo JS e não JSON porque o `tsconfig.app.json` não habilita `resolveJsonModule` [VERIFIED: tsconfig.app.json, sem a chave] e porque a Fase 7 poderá importá-lo no servidor como já faz com `shared/core/*.js` [VERIFIED: server/src/sync.js:9, `from '../../shared/core/classify.js'`].

```js
export const TONES = Object.freeze(['suave', 'direto', 'sem-filtro'])
export const SITUATIONS = Object.freeze([ 'inicio','toque','lancamento-ok','limite-atento','limite-perto','limite-estourou',
  'gasto-grande','receita','porquinho-guardou','porquinho-retirou','ritmo-folgado','ritmo-atencao','ritmo-estourou',
  'sem-lancar','dados-velhos','central','delivery-semana','loja-repete','categoria-acima-media','meta-batida' ])
export const PHRASES = Object.freeze({
  'limite-perto': {
    suave: [ { id: 'lp-su-01', t: 'Está perto do limite de {categoria}, vale segurar.' } /* ... */ ],
    direto: [ { id: 'lp-di-01', t: '{categoria} chegou a {pct} do limite. Restam {restante}.' } ],
    'sem-filtro': [ /* ... */ ],
  },
})
```

Cada frase: `id` estável legível (usado na folha de revisão e no histórico de repetição), `t` com encaixes `{loja} {categoria} {vezes} {valor} {pct} {dias}` (D-13) mais os auxiliares `{restante}` e `{total}` (valores monetários). Os encaixes exigidos por frase são **deduzidos** por regex (sem campo manual que desalinhe).

**Formatação dos encaixes (reuso do núcleo):** `{valor}`, `{restante}`, `{total}` = `formatMoney(cents)` (devolve `R$` + NBSP + número; o NBSP conta como 1 caractere no teste de tamanho) [VERIFIED: format.js:63, `` `${p.negative ? MINUS : ''}R$${NBSP}${p.integer}...` ``]; `{vezes}` = `plural(n, 'vez', 'vezes')` (já com o número) e `{dias}` = `plural(n, 'dia', 'dias')` [VERIFIED: format.js:219-221]; `{pct}` = `` `${n}%` ``; `{categoria}` e `{loja}` limitados a 24 caracteres por encaixe. Como `{vezes}` e `{dias}` já trazem o número, o exemplo aprovado "Quarto delivery da semana, caralho." (ordinal) **não se escreve com os encaixes de D-13**; escrever "Delivery {vezes} na semana, caralho. Seu fogão é enfeite?" (Q4: acrescentar `{ordinal}` só se o dono insistir na forma ordinal).

**Seleção (`pick`):** `pick({ situation, tone, slots, recent, rand })`: candidatas = frases do tom cujos encaixes todos existem em `slots` (definidos, finitos, não vazios) menos as de `recent`; se vazio, relaxa para "todas as preenchíveis menos a mais recente"; se ainda vazio, devolve `null` (o balão **não aparece**, UI-SPEC). `recent` guarda os últimos `N = min(5, floor(variantes/2))` ids por situação e tom, em memória e em `sessionStorage` (sobrevive a recarga; não precisa ir ao Firestore). Pós-condições verificadas **em tempo de execução** e por teste: nenhum `\{[a-z]+\}` restante; comprimento <= 110 (Home, toast) ou <= 80 (`central`); caso falhe, tenta a próxima candidata.

**Quantidade (discricionária, D-12):** mínimo 8 variantes por (situação × tom) nas situações de reação e 6 nas de contexto, o que dá cerca de 20 situações × 3 tons × 6 a 8 = 360 a 480 frases; com o dono cortando 30% a 40%, sobra margem para o mínimo de 5 sem repetir.

**Revisão eficiente (checkpoint de D-12):** `scripts/vintem/review-sheet.mjs` lê `PHRASES` e escreve `.planning/phases/04-mascote-vint-m/04-PHRASES-REVIEW.md`: uma seção por situação, uma tabela por tom com colunas `id | texto | pior caso (caracteres) | [ ] ok`, mais os encaixes de exemplo já preenchidos (valores fictícios). O dono devolve a lista de ids a **cortar** e reescreve o que quiser no próprio arquivo; o executor aplica no módulo. Gate de fim de fase: `export const REVIEW = { reviewedAt: null }` vira data; `test/static/phase4-content-review.test.js` (adicionado só no plano final) exige `reviewedAt` não nulo.

### Pattern 7: Barramento externo para eventos de lançamento

`VintemContext` expõe `useVintem()` com `onLaunched(payload)`. O `LaunchSheet` **já tem** o que precisa no momento do envio: `view` (antes do gasto), `category`, `cents`, `tab`, `piggyMode` [VERIFIED: LaunchSheet.tsx, `LaunchForm` recebe `view` e tem `tab`, `cents`, `category`]. A reação é calculada por função pura sem nova leitura:

```js
// shared/core/vintemMood.js
// reactionForLaunch({ view, kind, categoryId, cents, bigSpend }) -> { reaction, situation, categoryId } | null
// kind: 'gasto' | 'receita' | 'porquinho-guardou' | 'porquinho-retirou'
// gasto: row = view.spend.rows.find(r => r.categoryId === categoryId)
//   after = row.spentCents + cents ; over = after > row.limitCents ; near = after * 100 >= row.limitCents * 80
//   over -> 'bronca' + 'limite-estourou' ; near -> 'susto' + 'limite-perto' ; bigSpend -> 'susto' + 'gasto-grande'
//   senao 'spend' + 'lancamento-ok'
```

O `bumpData()` já existe no mesmo ponto [VERIFIED: LaunchSheet.tsx, `bumpData(); onClose(); toast.show(message, { icon: Check, detail })`], então o ponto de inserção é logo depois dele. Meta batida: `GoalsPage.tsx:83` (`await contribute(contributing.id, amount, description)`) conhece a meta e o valor; emitir `meta-batida` quando `currentAmount + amount >= targetAmount`.

Bancário **importado** (D-05): o cliente só vê lançamentos novos quando relê (não há `onSnapshot`; `dataVersion` só sobe com ação local [VERIFIED: CycleContext.tsx, `bumpData`]; `LimitAlertsContext` reavalia ao voltar o foco da aba, no máximo a cada 5 minutos [VERIFIED: LimitAlertsContext.tsx, `MIN_FOCUS_INTERVAL_MS = 5 * 60_000`]). Sinal recomendado: guardar em `localStorage` o maior `createdAt` já "visto" por pessoa e, ao carregar a Home, tratar lançamentos de `source === 'bank'` com `createdAt` maior que o visto como "chegou lançamento do banco" (uma única reação por carga, não por lançamento). Os documentos importados trazem `source: 'bank'` e `createdAt` [VERIFIED: sync.js:230-236, `createdAt: Timestamp.now(), source: 'bank'`]; o tipo `Transaction` do cliente **não** declara `source` (os campos vêm do spread de `doc.data()`), então o plano deve acrescentar `source?: 'bank'` ao tipo (aditivo).

### Pattern 8: Tom nas Configurações

- Tipo: `Settings.vintemTone?: Partial<Record<PersonType, 'suave' | 'direto' | 'sem-filtro'>>` e acréscimo opcional em `DEFAULT_SETTINGS` **não** é necessário (ausente = `'sem-filtro'`; `getSettings` tolera documento parcial [VERIFIED: settings.service.ts, `{ id: docSnap.id, ...DEFAULT_SETTINGS, ...docSnap.data() }`]).
- **Por pessoa** (Q5, recomendação) e não por casal: o Vintém fala com a pessoa logada (`user.person`) e o custo é o mesmo. Gravação por caminho pontilhado `updateDoc(settingsRef(), { ['vintemTone.' + person]: tone })`, no estilo de `updatePersonConfig` (`['personConfig.' + person]`) [VERIFIED: settings.service.ts, `transaction.update(settingsRef(), { ['personConfig.' + person]: next })`]. No ramo MOCK, `mSetDoc` faz mescla **rasa** [VERIFIED: settings.service.ts, comentário "mSetDoc faz mescla rasa: o objeto aninhado e montado a mao"], então montar o objeto aninhado à mão.
- Contexto: acrescentar `updateVintemTone(person, tone)` no `AreaContext` seguindo `updateNotifications` (`assertReady()` antes de gravar, depois `setSettings`) [VERIFIED: AreaContext.tsx, `updateNotifications`]. O cartão salva **ao tocar**, com toast "Tom do Vintém: {nome}", e reverte em falha (UI-SPEC S6).
- Posição: entre `<AppearanceCard />` e `<NotificationsCard />` [VERIFIED: SettingsPage.tsx:90-91]. A guarda existente confere apenas a **ordem relativa** dos seis cartões por `indexOf` [VERIFIED: phase3-settings-categories.test.js:49-57], então inserir um sétimo no meio não a quebra; atualizar o texto "seis cartões" do teste por clareza.
- Somente leitura: o `readOnly` do `AreaContext` desabilita as três linhas, como em `AppearanceCard`.

### Pattern 9: Rota oculta

Acrescentar `<Route path="/vintem-teste" element={<VintemTestPage />} />` em `AnimatedRoutes` [VERIFIED: App.tsx, última rota atual `<Route path="/casal" element={<CouplePage />} />` dentro de `AnimatedRoutes`]. Já fica atrás de `ProtectedRoute` (exige login) [VERIFIED: ProtectedRoute.tsx: sem `user` renderiza `LoginForm`]; **recomendação: login apenas** (D-17 manda funcionar em produção para testar no celular), sem restrição adicional por pessoa. Fora do `NavRail`: basta não acrescentar `/vintem-teste` à lista de destinos do dock (o `NavRail` calcula o item ativo com `isActive(href, pathname)` [VERIFIED: NavRail.tsx:40-42, `function isActive(href: string, pathname: string): boolean`]; a guarda estática confirma a ausência da string). `noindex`: `useEffect` que cria `<meta name="robots" content="noindex">` e remove ao desmontar.

**Guarda existente que vai quebrar de propósito:** `test/static/phase3-final.test.js:49` faz `assert.deepEqual(paths, expected)` com **exatamente 9 rotas** [VERIFIED: phase3-final.test.js, `'/', '/transacoes', ... '/casal'` e `assert.deepEqual(paths, expected)`]. O plano precisa **editar esse teste** para 10 rotas (incluindo `/vintem-teste`), e a nova guarda `phase4-*` confirma que `vintem-teste` não aparece em `NavRail`, `SettingsPage`, `ShortcutRow` (UI-SPEC #13).

### Pattern 10: Pontos de montagem (integração)

| Superfície | Arquivo / ponto | Mudança |
|------------|-----------------|---------|
| Arco da Home | `ArcGauge.tsx:74-77`: `<div ... className="absolute left-1/2 flex h-[84px] w-[84px] ... bg-card" style={{ top: 64 }}>{children ?? <PiggyBank .../>}</div>` | Passar `<VintemSlot />` como `children` em `DashboardPage.tsx:114`. **Manter `PiggyBank` no ArcGauge** como padrão: `phase3-home-components.test.js` exige a string `'PiggyBank'` no arquivo [VERIFIED: phase3-home-components.test.js:40] |
| Balão da Home | `DashboardPage.tsx`, depois do bloco `RhythmPill` (linha 158) e antes de `<StaleNotice placement="below" />` | `<VintemBalloon />`; dentro do ramo `view && !noIncome && !past` |
| Seção de limites | `LimitRow.tsx` (`LimitsList`), entre o cabeçalho (`flex items-center justify-between`) e a primeira `LimitRow` | `<VintemInlineRow />` só quando `rows.length > 0` e `!neutralOk` (dado velho) |
| Reação ao salvar | `LaunchSheet.tsx`, em `submit`, logo após `bumpData()` | `vintem.onLaunched({...})` |
| Meta batida | `GoalsPage.tsx:83` | `vintem.onGoal(...)` |
| Estados vazios e erro | Os componentes dos contratos 03 e 03.1 (hero sem renda, "Nenhum limite definido", erro de carga) | `<VintemEmpty pose="neutro" \| "surpreso" \| "sonolento" />` acima do texto existente |
| Provider | `App.tsx`, dentro de `LimitAlertsProvider` e **envolvendo** `LaunchProvider` | `VintemProvider` precisa de `useArea`, `useCycle`, `useAuth` e do toast |
| Toast do Vintém | `ui/toast.tsx` | **Divergência com o UI-SPEC (ver Pitfall 5):** o contêiner real é inferior (`bottom-[calc(92px+env(safe-area-inset-bottom))]`) e o `ToastView` usa `bg-action` (o corpo do Vintém seria invisível). Estender a fila para aceitar um item `custom` com superfície clara |

### Anti-Patterns to Avoid

- **Estado React por quadro** (um `setState` por rAF): re-renderiza a Home 60 vezes por segundo e quebra o orçamento.
- **`innerHTML` para montar o SVG** (como no sketch): proibido pela guarda estática e perde a tipagem.
- **Um rAF por instância**: três laços independentes; usar o `World`.
- **Refazer `useCycleBudget` no `VintemProvider`**: duplica a leitura do ciclo (o `LimitAlertsContext` e o `LaunchSheet` já fazem a sua). Os fatos entram por quem já tem a `view` (Home) ou por props.
- **Usar `pct >= 100` para "estourou"**: a regra oficial é `spent > limit`.
- **Gravar descrição de lançamento ou nome de loja desconhecido no insight/Firestore**: ver `merchantOf`.
- **`Math.random()` ou `Date.now()` dentro de `shared/core`**: `Date.now` é proibido pela guarda de pureza para todo `.js` da pasta; `Math.random` quebra o determinismo dos testes. Injetar `rand` e `now`.
- **Hex literal para a cor do corpo**: o corpo segue `--color-action` (D-01b).

## Don't Hand-Roll

| Problema | Não construir | Usar | Por quê |
|----------|---------------|------|---------|
| Fuso e dia do calendário | `new Date().getDay()`, `date-fns` no detector | `zonedParts`, `dayKeyOf`, `daysBetweenParts` (`shared/core/time.js`, `dayKey.js`, `cycle.js`) | Railway/CI em UTC e o teste em Tokyo; "últimos 7 dias" e "dias sem lançar" erram por até 3 h por noite sem o fuso de São Paulo |
| Dinheiro | Float em reais no detector | `toCents`, `formatMoney`, inteiros | Regra do núcleo: tudo em centavos inteiros |
| Plural | `n === 1 ? ... : ...` espalhado | `plural(n, 'vez', 'vezes')` (`format.js:219`) | Concordância única, já testada |
| Normalização de texto | `toLowerCase()` ad hoc | `normalize` (`classify.js:21`, tira acento e colapsa espaços) | Mesma chave de comparação do resto do app |
| Estado do limite | Refazer `pct`/`state` do zero | `BudgetRow` da `BudgetView` e `limitState` | Fonte única; Home, sheet e alertas já leem dela |
| Alertas 80/100 | Novo disparo de limiar | `thresholdsToFire`/`THRESHOLDS` | O Vintém comenta, não substitui o aviso oficial (UI-SPEC S1) |
| Dado velho do banco | Nova lógica de frescor | `useBankFreshness().suppress` / `view.verdictSuppressed` | Mesma regra que pausa o ritmo (LIM-08) |
| Caixa de texto do balão | `dangerouslySetInnerHTML` | Texto React em `<span>` | Texto simples (PROJECT) e guarda estática |
| `matchMedia` de movimento reduzido | `useEffect` + `useState` manual | `useSyncExternalStore` (um hook compartilhado) | Evita o piscar de valor inicial e a assinatura duplicada; hoje há duas leituras avulsas em `NavRail.tsx:46` e `useSectionReveal.ts:7` |
| Acaso testável | `Math.random` direto no modelo | `rand` injetado + `mulberry32(seed)` | Reprodutibilidade dos testes de piscar e sacada |
| Mola com passo grande | Euler com `dt` livre | Subpassos de 1/240 s e `dt <= 1/30` (já no sketch) | Evita explosão numérica com aba voltando do fundo |

**Key insight:** o que torna este domínio "enganosamente complexo" não é a matemática de molas (30 linhas), é a **soma de estados simultâneos** (reação sobre humor sobre sonolência, movimento reduzido, instância fora da tela, aba oculta). Centralizar isso no modelo puro e testar com relógio simulado evita descobrir os cruzamentos no celular.

## Common Pitfalls

### Pitfall 1: Guardas estáticas existentes que as mudanças legítimas quebram
**What goes wrong:** `phase3-final.test.js` exige exatamente 9 rotas; `firestore-config.test.js:49` exige exatamente 19 índices; `test/rules/matrix.test.js` e `firestore.rules` fixam a lista de coleções do cliente.
**Why:** guardas escritas para travar o escopo das fases anteriores.
**How to avoid:** o plano lista, por arquivo, a edição do teste junto com a mudança que a provoca (rota: 10 rotas; índice: **não criar índice novo**, ver Pitfall 8; coleção `vintemInsights`: `clientCollections()` e `CLIENT_COLS`).
**Warning signs:** `npm run test:static` vermelho logo após acrescentar a rota.

### Pitfall 2: `owner-queries.test.js` auto-descobre `src/services/*`
**What goes wrong:** um novo `vintemInsights.service.ts` sem `...ownerScope()` como primeiro filtro de `query(`, sem `ownerId: ownerId()` em `setDoc`, ou com `ownerId` num `updateDoc`, reprova.
**How to avoid:** copiar o esqueleto de `limitAlerts.service.ts` (ramo MOCK incluso) [VERIFIED: limitAlerts.service.ts, `...ownerScope()` em `query(`, `ownerId: ownerId()` em `transaction.set`].

### Pitfall 3: Variável CSS do Tailwind v4 só é emitida se usada
**What goes wrong:** definir `--vintem-*` em `@theme inline` e referenciá-las só em atributos SVG de JSX (que o Tailwind não varre como CSS) pode deixar a variável **não emitida** no CSS final; o corpo some ou sai preto.
**Why:** [CITED: tailwindcss.com/docs/theme: "By default only used CSS variables will be generated in the final CSS output. If you want to always generate all CSS variables, you can use the `static` theme option"]. O `--color-action` está emitido no `dist` atual porque `bg-action` é muito usado [VERIFIED: dist/assets/index-DKvbqKYr.css contém `--color-action:#14532d;`], mas isso não garante as novas.
**How to avoid:** definir a paleta do Vintém num bloco CSS comum (`@layer base { .vt { ... } }` em `src/index.css`) com `--vintem-body: var(--color-action)` e as derivadas por `color-mix`; ou usar `@theme static` para o grupo `--vintem-*`. O autoteste lê `getComputedStyle(host).getPropertyValue('--vintem-body')` e falha se vazio (o sketch já faz essa leitura para o contraste, linha 629-631).

### Pitfall 4: Paleta derivada precisa ser **recalculada** para o oliva
**What goes wrong:** copiar `--snout:#1f7041`, `--far:#0f4023`, `--ink:#0a2f19` e `--brow:#e4fbec` do sketch (todos matizes do verde `#14532d`) sobre o corpo oliva produz um focinho esverdeado destoante e sobrancelhas esverdeadas.
**How to avoid (valores medidos nesta sessão com luminância relativa WCAG 2.2, corpo `#4c513b`):**

| Token | Receita | Resultado medido |
|-------|---------|------------------|
| `--vintem-body` | `var(--color-action)` | olho branco/corpo **8,24:1**; creme `#fbf8f2`/corpo **7,78:1**; corpo/cartão `#f1ede3` **7,05:1** (passa >= 4,5 e >= 3) |
| `--vintem-snout` | `color-mix(in srgb, var(--color-action) 85%, #fff)` ≈ `#656956` | 1,46:1 sobre o corpo (relevo leve de propósito; original 1,50) |
| `--vintem-ink` (fenda, narinas, pupila, linha da pálpebra) | `color-mix(in srgb, var(--color-action) 55%, #000)` ≈ `#2a2d20` | 1,70:1 sobre o corpo (fenda discreta como D-04; original 1,61) e 14,05:1 sobre o branco do olho |
| `--vintem-far` (pata de lá) | `color-mix(in srgb, var(--color-action) 75%, #000)` ≈ `#3d412f` | 1,28:1 |
| `--vintem-brow` | `#fbf8f2` (creme da paleta) | 7,78:1 sobre o corpo |
| moeda `#fbbf24` e lágrima `#7dd3fc` sobre o corpo | sem mudar | 4,94:1 (>= 3; o UI-SPEC listava 5,46) |

Os valores de `color-mix` acima são **receita sugerida**; o critério de aceite é o teste de contraste (UI-SPEC #12) com as cores **computadas** em execução, não estes hex. Hex literais do sketch que viram token ou derivação: `--snout`, `--nos`/`--pupil`/`--ink`, `--far`, `--brow`, `--zcol` (`#77746a`, o UI-SPEC já prescreve `#66635a`), `.wet #93c5fd`, `.a-sweat #60a5fa` (UI-SPEC: `#2563eb`), `.a-anger #dc2626`, `.a-spark #f59e0b`, `.a-excl #d97706`, `--coin`, `--coinline`; os de acessório e moeda **não** dependem do corpo e ficam como tokens literais próprios.
**Observação de teste:** o rasterizador do sketch copia estilos **computados** para um clone do SVG antes de desenhar (linhas 434-440); como `color-mix` computa para `color(srgb ...)`, o clone continua correto no Chrome [ASSUMED: serialização do computed value de `color-mix` dentro de SVG-como-imagem; o autoteste detecta se algo sair em branco]. O fundo da máscara usa `#fbf8f2` e o limiar 150 na soma RGB: ao mudar o corpo para oliva, a distância corpo-fundo muda e o limiar do teste de máscara **deve ser revalidado** (o sketch assume corpo escuro e fundo claro; o oliva é mais claro que o verde).

### Pitfall 5: O UI-SPEC e o sketch divergem do código real em detalhes que o executor vai tropeçar
- **Toast:** UI-SPEC S4 diz "mesmo contêiner fixo no topo (`top: calc(16px + env(safe-area-inset-top))`)"; o código real é **inferior** e acima do dock: `className="pointer-events-none fixed inset-x-0 bottom-[calc(92px+env(safe-area-inset-bottom))] z-[10001] ..."` e a duração padrão é `DEFAULT_DURATION_MS = 3000` [VERIFIED: toast.tsx:125 e linha 5], não os 5 s citados no UI-SPEC. Decidir (Q6): manter o `VintemToast` no contêiner inferior (menor mudança, mesma região que o toast de sucesso) com 6 s e fundo `surface-2`.
- **Paleta:** o UI-SPEC ainda cita `#14532d` em toda parte; vale o token (D-01b).
- **Toast de sucesso** usa `bg-action text-action-text`: o Vintém não pode ser desenhado dentro dele.

### Pitfall 6: `useId` e `url(#...)`
Ids de `clipPath` gerados por `useId` podem conter caracteres que atrapalham seletores; sanitizar (`replace(/[^a-zA-Z0-9_-]/g, '')`) e prefixar (`vt${n}-`). No sketch o id vinha de um contador (`'vt'+(++UID)`).

### Pitfall 7: StrictMode e efeitos assimétricos
Em desenvolvimento o efeito monta, desmonta e monta de novo. `createVintemView` precisa ser idempotente: o `destroy()` remove a instância do `World`, desliga o `IntersectionObserver` e invalida o token de reações; a segunda montagem cria uma instância nova sem herdar pendências.

### Pitfall 8: Índice composto novo reprova uma guarda e custa deploy
Consulta de `vintemInsights` com `orderBy('createdAt')` exigiria índice composto e mexeria no teste de "exatamente 19". Consultas só com igualdades (`ownerScope()`, `person`, `cycleKey`) **não** exigem índice composto [CITED: firebase.google.com/docs/firestore/query-data/index-overview: "Cloud Firestore can merge the indexes for simple equality filters to build the indexes needed for larger equality queries"; ordenar por outro campo exige índice manual]. Ordenar no cliente (no máximo ~30 documentos).

### Pitfall 9: `formatMoney` devolve espaço não separável
`R$` + U+00A0 + número. Testes de comprimento contam 1 caractere pelo NBSP; comparações de texto com espaço normal falham. O teste do banco deve preencher com `formatMoney` real, não com string montada à mão.

### Pitfall 10: `Math.random` e piscadas "em fase" com a respiração
O sketch mede concentração de fase `R < 0,3` entre o início das piscadas e a respiração (linha 580). Com RNG semeado e a fase própria `ph = rand()*2π`, o teste fica determinístico, mas a semente não pode alinhar fase e agenda; testar com várias sementes.

### Pitfall 11: Calibração do detector sem dados
O histórico utilizável do dono pode ser curto (poucos ciclos com banco sincronizado e limites definidos). Com menos de 5 amostras a regra de ticket médio fica **desligada** e vale o fallback por fração do limite; sem limite não dispara. Expor as constantes (`SPIKE_TICKET_MULT = 3`, `SPIKE_LIMIT_FRACTION_PCT = 30`, `DELIVERY_WEEK_MIN = 3`, `NO_LAUNCH_DAYS = 3`) como export único para calibração sem mexer em telas, no mesmo estilo de `RHYTHM_CUTS` [VERIFIED: budget.js:399, `export const RHYTHM_CUTS = Object.freeze({ folgado: 75, noRitmo: 100, atencao: 115 })`].

### Pitfall 12: Testes de regras exigem emulador e JDK
`npm run test:rules` roda `firebase emulators:exec` e precisa de Java; `java` **não existe** neste ambiente (`command not found`). Se o plano incluir a coleção `vintemInsights`, a matriz de regras só pode ser verificada fora daqui (CI ou outra máquina); registrar como verificação manual do dono ou usar a guarda estática da lista de coleções.

### Pitfall 13: A regra global de movimento reduzido do CSS não alcança o motor
`index.css` zera `animation-duration` e `transition-duration` sob `prefers-reduced-motion` [VERIFIED: index.css:334-340], mas isso não toca laços JS. O motor lê o flag explicitamente (`useReducedMotion` + interruptor de teste) e troca para amortecimento crítico.

## Code Examples

### Solver de mola (portado do sketch, linhas 76-82)

```js
// shared/core/vintemSpring.js (// @ts-check)
export class Spring {
  /** @param {number} v @param {number} k @param {number} c @param {number} [m] */
  constructor(v, k, c, m = 1) { this.x = v; this.v = 0; this.t = v; this.k = k; this.c = c; this.m = m }
  snap(v = this.t) { this.x = this.t = v; this.v = 0 }
  /** @param {number} dt @param {boolean} [critical] amortecimento critico (movimento reduzido) */
  step(dt, critical = false) {
    let { k, c } = this
    if (critical) { k = Math.max(k, 420); c = 2 * Math.sqrt(k * this.m) }
    const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n
    for (let i = 0; i < n; i++) {
      const a = ((this.t - this.x) * k - this.v * c) / this.m
      this.v += a * h
      this.x += this.v * h
    }
  }
}
// zeta = c / (2 * sqrt(k)). Valores [k, c] do UI-SPEC (tabela "Solver"): body 200/11, pos 160/15,
// rot 140/12, head 60/13, look 4000/126, pp 260/21, popIn 360/17, popOut 200/29, ear 150/6.5,
// tail 90/4.5, turn 70/12.5, wake 200/18, droop 90/13, gauge 60/11, bub 300/16.
```

### Curva do piscar (linhas 126-134 do sketch)

```js
export const BLINK = Object.freeze({ close: 0.08, hold: 0.04, open: 0.17, over: 0.07, total: 0.36 })
/** Cobertura 0..1 da palpebra; negativo = overshoot de abertura. */
export function blinkEnv(t) {
  if (t < 0 || t >= BLINK.total) return 0
  if (t < BLINK.close) { const u = t / BLINK.close; return u * u * (3 - 2 * u) }
  if (t < BLINK.close + BLINK.hold) return 1
  const t2 = t - BLINK.close - BLINK.hold
  if (t2 < BLINK.open) return (1 + Math.cos((Math.PI * t2) / BLINK.open)) / 2
  return -0.14 * Math.sin((Math.PI * (t2 - BLINK.open)) / BLINK.over)
}
```

### `useReducedMotion` (um hook assinado a mudanças)

```ts
// src/hooks/useReducedMotion.ts
import { useSyncExternalStore } from 'react'
const QUERY = '(prefers-reduced-motion: reduce)'
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const snapshot = () => window.matchMedia(QUERY).matches
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}
```

### Modelo em teste de Node (relógio simulado, RNG semeado)

```js
// shared/core/vintemModel.test.js (esqueleto)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { VintemModel, World } from './vintemModel.js'
import { mulberry32 } from './vintemSpring.js'

test('volume preservado (sx*sy) em reposo, gasto, festa, susto e trocas', () => {
  const w = new World()
  const m = new VintemModel({ state: 'neutro', rand: mulberry32(7), world: w })
  w.add(m)
  let dev = 0
  const run = (sec) => { for (let i = 0; i < sec * 60; i++) { w.step(1 / 60); dev = Math.max(dev, Math.abs(m.pose.sx * m.pose.sy - 1)) } }
  run(8); m.react('spend'); run(3); m.react('festa'); run(3); m.react('susto'); run(2)
  assert.ok(dev < 0.08, `desvio ${dev}`)
})
```

### Seleção sem repetição

```js
// shared/core/phrasePicker.js (resumo)
export function pick({ situation, tone, slots, recent, rand, maxLen = 110 }) {
  const pool = (PHRASES[situation]?.[tone] ?? []).filter((p) => needsOf(p.t).every((k) => isFilled(slots[k])))
  const fresh = pool.filter((p) => !recent.includes(p.id))
  const order = shuffled(fresh.length ? fresh : pool.filter((p) => p.id !== recent[0]), rand)
  for (const p of order) {
    const text = fill(p.t, slots)
    if (text !== null && !/\{[a-z]+\}/.test(text) && [...text].length <= maxLen) return { id: p.id, text }
  }
  return null // balao nao aparece (UI-SPEC): nunca texto generico
}
```

## State of the Art

| Abordagem antiga | Abordagem atual | Impacto |
|------------------|-----------------|---------|
| Animação por escala do olho para piscar | Pálpebra que desce (cobertura 0..1) com overshoot | Olho não muda de tamanho; teste dedicado |
| `useEffect` + `useState` + `matchMedia` | `useSyncExternalStore` | Sem renderização extra e sem inconsistência em SSR/hidratação |
| Um laço rAF por componente | `World` único + `IntersectionObserver` | Custo constante com várias instâncias |
| Testes de animação só no navegador | Modelo puro com relógio simulado + pixel só onde precisa | Rápido, determinístico, roda em UTC e Tokyo |

**Deprecated/outdated:** o sketch usa `var`, `prototype` e `innerHTML` (tudo a reescrever em módulos ES e JSX); a variante A (boca e patas) e as opções de feliz 1 e 3 saem do código (D-03, D-05a).

## Assumptions Log

| # | Claim | Seção | Risco se errado |
|---|-------|-------|-----------------|
| A1 | Estourou: faixas por porcentagem do UI-SPEC (100-130% bravo, > 130% triste) com o tom só trocando a faixa de 100-130% (`suave` triste) | Pattern 4 | D-06b diz "conforme o tom"; o dono pode querer triste para todo estouro no tom suave ou bravo sempre |
| A2 | "Gasto grande" = >= 3x o **ticket médio** por lançamento da categoria (>= 5 amostras); sem histórico, >= 30% do limite do mês | Pattern 5 | Dispara demais ou de menos; o dono pode ter querido o total mensal |
| A3 | `merchantOf` só exibe nome de loja do dicionário de marcas ou de nome com token de estabelecimento; o resto vira rótulo nulo | Pattern 5 | Frases com `{loja}` aparecem menos; ou, se afrouxado, nome de pessoa física vaza no balão |
| A4 | O exemplo aprovado "Quarto delivery da semana" vira "Delivery {vezes} na semana" (sem ordinal) | Pattern 6 | O dono prefere o ordinal e exige novo encaixe `{ordinal}` |
| A5 | Tom guardado **por pessoa** (`Settings.vintemTone.{ele\|ela}`) em vez de por casal | Pattern 8 | UI-SPEC P-08 decidiu por casal por padrão; trocar depois exige migração de campo |
| A6 | `VintemToast` no contêiner inferior existente, 6 s, fundo claro | Pitfall 5 | O UI-SPEC pede topo e 5 s; divergência visual com o contrato aprovado |
| A7 | 60 fps com 2 a 3 instâncias em celular intermediário (estimativa por contagem de escritas) | Pattern 2 | Quedas de quadro em aparelho fraco; mitigação: reduzir a 30 fps para `inline` e `empty` |
| A8 | Formato de `useId` na 19.2 e sanitização suficiente para `url(#...)` | Pattern 3 | Id inválido quebra o `clipPath` (visível no autoteste) |
| A9 | `color-mix` computado dentro de SVG-como-imagem renderiza igual no Chrome (rasterizador do autoteste) | Pitfall 4 | O autoteste dá pixel em branco e mede errado; fallback: derivar hex no TS a partir do token computado |
| A10 | `situação` extra `limite-atento` (75% a < 80%), `delivery-semana`, `loja-repete`, `categoria-acima-media`, `meta-batida` acrescentadas à lista mínima do UI-SPEC | Pattern 6 | O dono pode não querer comentário nesses casos; é só cortar no checkpoint |
| A11 | `source: 'bank'` e `createdAt` maior que o "visto" como sinal de lançamento importado | Pattern 7 | O servidor muda o campo; a reação do banco nunca dispara (falha silenciosa, sem dano) |

## Open Questions

1. **Estourou: triste ou bravo "conforme o tom"?** (D-06b x UI-SPEC P-09)
   - O que sabemos: UI-SPEC fixa por porcentagem; CONTEXT diz conforme o tom.
   - O que falta: decisão do dono.
   - Recomendação: faixas do UI-SPEC e tom trocando só 100-130%; confirmar no checkpoint.
2. **O que é "a média dos últimos ciclos" no gasto grande?**
   - Sabemos: hipótese "cerca de 3 vezes a média".
   - Falta: se é ticket médio ou total mensal.
   - Recomendação: ticket médio por lançamento; calibrar com o histórico real na primeira semana de uso.
3. **Política de nomes de estabelecimento desconhecidos.**
   - Recomendação: conservadora (A3); o dono amplia o dicionário de marcas depois de ver os rótulos nulos.
4. **Ordinal nas frases ("Quarto delivery da semana").** Recomendação: sem ordinal; acrescentar `{ordinal}` só sob pedido.
5. **Tom por pessoa ou por casal.** Recomendação: por pessoa; é troca de uma linha no tipo.
6. **Toast do Vintém no topo (UI-SPEC) ou no fundo (código real).** Recomendação: fundo.
7. **Persistência dos insights ("guardar").** D-15 fala em "pode guardar". Recomendação: plano **separável** no fim da fase (coleção `vintemInsights`, `setDoc` com id determinístico, regras, matriz); o contrato, o detector e o balão **não dependem** dele. Se o plano for apertado, entregar a fase com insights só em memória e localStorage e deixar a coleção para a Fase 7, que é quem de fato os lê.
8. **Perfil somente leitura (P-10) e ciclo passado (P-13):** o UI-SPEC já traz os defaults; nenhuma pergunta nova.

## Environment Availability

| Dependência | Necessária para | Disponível | Versão | Alternativa |
|-------------|-----------------|-----------|--------|-------------|
| Node | testes do núcleo, scripts | sim | v22.23.5 | — |
| `google-chrome` | autoteste por CDP (`scripts/ux-audit/cdp.mjs`) | sim | 152.0.7977.75 | `CHROME_BIN` |
| Vite dev (porta local) | rota `/vintem-teste` em modo MOCK | sim | 7.3.1 | — |
| Java (JDK) | `npm run test:rules` (emulador Firestore) | **não** (`java: command not found`) | — | Rodar fora deste ambiente; guarda estática da lista de coleções |
| Firebase emulators | regras da coleção `vintemInsights` | não verificado | — | idem |

**Missing dependencies with no fallback:** nenhuma que bloqueie as quatro primeiras camadas (modelo, humor, detector, frases).
**Missing dependencies with fallback:** Java para `test:rules` (só importa se o plano incluir a coleção `vintemInsights`).

## Validation Architecture

`workflow.nyquist_validation` está `true` em `.planning/config.json`. [VERIFIED: config.json]

### Test Framework

| Propriedade | Valor |
|-------------|-------|
| Framework | `node:test` + `node:assert/strict` (Node 22.23.5); autoteste de pixels por CDP no Chrome 152 |
| Arquivo de configuração | nenhum (scripts em `package.json`); acrescentar `test:vintem` opcional |
| Comando rápido | `node --test shared/core/vintem*.test.js shared/core/insights.test.js shared/core/phrasePicker.test.js` |
| Suíte completa | `npm run test:core:tz && npm run test:static && node scripts/ux-audit/vintem.mjs` |

### Phase Requirements → Test Map

| Req | Comportamento | Tipo | Comando automatizado | Arquivo existe? |
|-----|---------------|------|----------------------|-----------------|
| MASC-01 | Slot no arco e balão na Home; `PiggyBank` segue no ArcGauge; SVG `aria-hidden`; região viva montada; nenhum `innerHTML` | estático | `node --test test/static/phase4-home.test.js` | Wave 0 |
| MASC-01 | A página monta inteira e o balão aparece com fala preenchível, a 360px, sem rolagem horizontal | CDP | `node scripts/ux-audit/vintem.mjs` | Wave 0 |
| MASC-02 | Humor: tabela de precedência D-06b, faixas 75/80/100 (fronteira `spent > limit`), neutro calado (carregando, sem renda, passado, suprimido, somente leitura), pior vence, janela de reação | unitário | `node --test shared/core/vintemMood.test.js` (UTC e Tokyo via `test:core:tz`) | Wave 0 |
| MASC-02 | Assimetria do neutro e correções do triste como dados: `cvL - cvR >= .15`, `|ba| >= 5`, triste `sy >= .92`, `ea 70`, `es .72` | unitário | `node --test shared/core/vintemStates.test.js` | Wave 0 |
| MASC-02 | **Distinção por pares:** 21 pares >= 12% dos pixels a 84px e a 48px; controle negativo (neutro só com olhar desviado) < 12% | CDP (pixels) | `node scripts/ux-audit/vintem.mjs` | Wave 0 |
| MASC-03 | Molas assentam em < 3 s, delta grande não explode, amortecimento crítico sem overshoot | unitário | `node --test shared/core/vintemSpring.test.js` | Wave 0 |
| MASC-03 | Volume `sx*sy` < 8% em repouso, gasto, festa, susto e trocas | unitário (relógio simulado) | `node --test shared/core/vintemModel.test.js` | Wave 0 |
| MASC-03 | Piscar: 80/40/150 ms (±15/±15/±25) com overshoot, esperas 2 a 6 s, dupla em 5% a 25%, pisca ao trocar de estado, só a pálpebra se move | unitário | idem | Wave 0 |
| MASC-03 | Sacadas 200-600 ms, transição 45-85 ms sem overshoot, pupila norma <= 1 | unitário | idem | Wave 0 |
| MASC-03 | Movimento reduzido: sem respiração, piscar, deriva, seguir; expressões ainda mudam; reações viram pose estática | unitário | idem | Wave 0 |
| MASC-03 | Reações terminam e voltam ao repouso (`|py| < 2`, overrides vazios); moeda só em `spend` e `festa` | unitário | idem | Wave 0 |
| MASC-03 | Giro sem vazamento (7 estados × 21 ângulos, uma massa, nada na borda); largura >= 50% e área >= 70%; acessórios visíveis no perfil (> 12 px) | CDP (pixels) | `node scripts/ux-audit/vintem.mjs` | Wave 0 |
| MASC-03 | Sem re-render por quadro: nenhum `useState` ligado a rAF; contador de commits do `Profiler` estável em 3 s de repouso | estático + CDP | `phase4-engine.test.js` + `vintem.mjs` | Wave 0 |
| MASC-03 | Aba oculta pausa, fora da tela não avança, `destroy` remove a instância | unitário (World puro) + CDP | `vintemModel.test.js` + `vintem.mjs` | Wave 0 |
| MASC-04 | Cada situação × tom tem >= N variantes; nenhum `{encaixe}` sobra; todas as frases cabem (<= 110 / <= 80) no pior caso; pt-BR com acento; sem dado proibido (regex de CPF/CNPJ, 6+ dígitos, "Pix para/de", e-mail); sem repetir as últimas N | unitário | `node --test shared/core/phrasePicker.test.js` | Wave 0 |
| MASC-04 | Insights: iFood 4x na semana gera `delivery-heavy` com métricas certas; Pix para pessoa nunca vira loja; evidência só tem ids e dias; mesma entrada em UTC e Tokyo dá o mesmo resultado | unitário | `node --test shared/core/insights.test.js` | Wave 0 |
| MASC-05 | Cartão na posição certa em `SettingsPage`, `role="radiogroup"`, 3 opções, padrão `'sem-filtro'`, gravação por caminho pontilhado, somente leitura desabilita | estático | `node --test test/static/phase4-settings.test.js` | Wave 0 |
| MASC-06 | Rota registrada, ausente de `NavRail`/`SettingsPage`/`ShortcutRow`, `noindex`, controles com os rótulos do contrato, alvos >= 44px | estático + CDP | `phase4-testpage.test.js` + `vintem.mjs` | Wave 0 |
| MASC-07 | Nenhuma frase do banco contém a lista de bloqueio do app de referência (frases, nome, slogan fornecidos pelo dono em arquivo local fora do git) | unitário | `phase4-content.test.js` (lê a lista só se existir) | Wave 0 |
| MASC-07 | Revisão humana do banco concluída (`REVIEW.reviewedAt` preenchido) | estático (gate final) | `node --test test/static/phase4-content-review.test.js` (só no plano final) | Wave final |

### Sampling Rate
- **Por commit de tarefa:** o comando rápido (modelo/humor/detector/frases) em menos de 30 s.
- **Por merge de onda:** `npm run test:core:tz && npm run test:static`.
- **Gate de fase:** a suíte completa verde, inclusive `node scripts/ux-audit/vintem.mjs` terminando em `FALHAS 0`, antes de `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `shared/core/vintemSpring.js` + `.test.js` (molas, piscar, `mulberry32`)
- [ ] `shared/core/vintemStates.js` + `.test.js` (7 estados, `stateFromPct`)
- [ ] `shared/core/vintemModel.js` + `.test.js` (modelo e `World`)
- [ ] `shared/core/vintemMood.js` + `.test.js`
- [ ] `shared/core/insights.js` + `.test.js` (inclui fixtures de privacidade)
- [ ] `shared/core/vintemPhrases.js`, `phrasePicker.js` + `.test.js`
- [ ] `test/static/phase4-*.test.js` (home, settings, testpage, engine, content) reaproveitando `test/static/helpers/phase3-1.js` (`code`, `assertIncludes`, `scaleProblems`, `listSrc`)
- [ ] `scripts/ux-audit/vintem.mjs` + `src/lib/vintem/selftest.ts`
- [ ] Atualizar guardas existentes: `phase3-final.test.js` (10 rotas) e, se houver `vintemInsights`, `test/rules/matrix.test.js` (`CLIENT_COLS`)
- Instalação de framework: nenhuma.

### Fica como UAT humano (não automatizável aqui)
- Aparência do perfil, do triste a 84px e do giro "de porquinho de verdade" aos olhos do dono (P-04).
- 60 fps em Android e iPhone reais.
- Revisão e corte do banco de frases ("soa como eu?") no checkpoint de D-12.
- Conferência original contra os prints de referência (critério de sucesso 5 do roadmap).
- Sensação do olhar seguindo o toque no celular (D-18).

## Security Domain

`security_enforcement` está habilitado (`true`, `asvs_level: 1`). [VERIFIED: config.json]

### Applicable ASVS Categories

| Categoria ASVS | Aplica | Controle padrão |
|----------------|--------|-----------------|
| V2 Autenticação | não | Rota de teste herda o `ProtectedRoute` |
| V3 Sessão | não | — |
| V4 Controle de acesso | sim (só se `vintemInsights`) | Regras por dono: `clientCollections()` + `ownsExisting()`/`ownsIncoming()`; `ownerId` imutável |
| V5 Validação de entrada | sim | Texto do balão sempre como filho React (nunca HTML); descrições de lançamento tratadas como não confiáveis no detector (regex de dígitos, prefixo Pix); limite de tamanho por encaixe |
| V6 Criptografia | não | Nada novo; hash FNV-1a do detector é só chave de agrupamento, não segurança |
| V8 Proteção de dados | sim | Privacidade: insight e cache nunca guardam descrição, CPF, conta, cartão ou nome de pessoa; `localStorage` só com agregados por `categoryId` |

### Known Threat Patterns

| Padrão | STRIDE | Mitigação padrão |
|--------|--------|------------------|
| Nome de pessoa física (Pix) vazando para o balão ou para o Firestore | Information Disclosure | `merchantOf` com filtro em ordem rígida; teste de fixtures com "Pix para ...", CPF e e-mail; descrição nunca entra no `id` |
| HTML/script injetado via descrição do lançamento ou nome de categoria exibidos no balão | Tampering / XSS | Texto React; sem `dangerouslySetInnerHTML`; guarda estática em `src/components/vintem` |
| Gravar insight de outro dono | Spoofing / Tampering | `ownerId: ownerId()` na gravação, regra `ownsIncoming()`; guarda `owner-queries` |
| Leitura em massa por consulta sem filtro | Information Disclosure | `...ownerScope()` em todo `query(` (guarda existente) |
| Estouro da cota Spark por releituras do detector | Denial of Service (custo) | Linha de base em cache local por ciclo; insights escritos uma vez por id e por aparelho; nenhuma leitura de insight na Home |
| Rota de teste indexada ou descoberta | Information Disclosure | `noindex`, sem link, atrás do login; a página não lê nem grava dado do usuário (UI-SPEC S7) |

## Sources

### Primary (HIGH confidence)
- Repositório, lido nesta sessão: `04-CONTEXT.md`, `04-UI-SPEC.md` (682 linhas), `REQUIREMENTS.md` (MASC-01..07), `STATE.md`, `.planning/sketches/020-vintem-verde/index.html` (715 linhas), `CLAUDE.md` e `.claude/CLAUDE.md`, `.planning/config.json`.
- Código: `shared/core/{budget,alerts,limits,classify,format,series,bankStatus,purity.test}.js`, `src/components/dashboard/{ArcGauge,RhythmPill,StaleNotice,HomeSections}.tsx`, `src/pages/{DashboardPage,SettingsPage}.tsx`, `src/components/settings/{SettingsCard,AppearanceCard}.tsx`, `src/components/launcher/LaunchSheet.tsx`, `src/components/limits/LimitRow.tsx`, `src/components/ui/{toast,switch,segmented-control,chip}.tsx`, `src/contexts/{AreaContext,CycleContext,LaunchContext,LimitAlertsContext,AuthContext}.tsx`, `src/hooks/{useCycleBudget,useCycleSeries,useBankFreshness,useReadOnly,useNow}.ts`, `src/services/{settings,transactions,limitAlerts}.service.ts`, `src/lib/{cycleData,scope,mockStorage,rhythm}.ts`, `src/types/index.ts`, `firestore.rules`, `firestore.indexes.json`, `server/src/sync.js`, `test/static/{phase3-final,phase3-home-components,phase3-settings-categories,firestore-config,owner-queries}.test.js`, `test/static/helpers/phase3-1.js`, `test/rules/matrix.test.js`, `scripts/ux-audit/cdp.mjs`, `eslint.config.js`, `tsconfig.app.json`, `package.json`.
- Medições locais: contrastes WCAG 2.2 do corpo oliva `#4c513b` e das cores derivadas (script em Node nesta sessão); `node --test` sobre um `.ts` mínimo (Node remove tipos por padrão).

### Secondary (MEDIUM confidence, documentação oficial lida por resumo)
- Firestore, visão geral de índices: https://firebase.google.com/docs/firestore/query-data/index-overview (consultas só com igualdades reutilizam índices; ordenar por outro campo exige índice manual).
- MDN `requestAnimationFrame`: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame (callbacks pausam em abas em segundo plano; mesmo timestamp para callbacks do mesmo quadro).
- Tailwind v4, tema: https://tailwindcss.com/docs/theme (`static` emite todas as variáveis; por padrão só as usadas; `inline` para variáveis que referenciam outras).

### Tertiary (LOW confidence)
- Estimativas de custo por quadro (A7), formato de `useId` (A8) e serialização de `color-mix` no rasterizador (A9): inferência, a confirmar pelo autoteste.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, nada novo e tudo lido nos manifestos.
- Architecture: HIGH para pontos de integração (arquivos, linhas e assinaturas lidos); MEDIUM para a divisão modelo/desenho (decisão de arquitetura desta pesquisa, validada contra a guarda de pureza e os runners existentes).
- Pitfalls: HIGH os derivados de guardas e arquivos reais; MEDIUM os de renderização (`color-mix`, `useId`).
- Detector e calibração: MEDIUM, dependem de dados reais que ainda não existem.

**Research date:** 2026-11-19
**Valid until:** 2026-12-19 (stack estável; revalidar a mudança do token de ação oliva e o formato das descrições do banco se o servidor mudar)

---

## Apêndice A: Arquivos a criar e a modificar

**Criar**
- `shared/core/vintemSpring.js`, `vintemStates.js`, `vintemModel.js`, `vintemMood.js`, `insights.js`, `vintemPhrases.js`, `phrasePicker.js` e um `.test.js` para cada (exceto o de dados, coberto por `phrasePicker.test.js`)
- `src/lib/vintem/{view,world,geometry,selftest}.ts`
- `src/components/vintem/{Vintem,VintemSlot,VintemBalloon,VintemInlineRow,VintemToast,VintemEmpty}.tsx`
- `src/contexts/VintemContext.tsx`, `src/hooks/useReducedMotion.ts`
- `src/components/settings/VintemToneCard.tsx`, `src/pages/VintemTestPage.tsx`
- `src/services/vintemInsights.service.ts` (opcional, plano separado)
- `scripts/vintem/review-sheet.mjs`, `scripts/ux-audit/vintem.mjs`
- `test/static/phase4-{home,settings,testpage,engine,content}.test.js` e, no plano final, `phase4-content-review.test.js`

**Modificar**
- `src/App.tsx` (rota `/vintem-teste`; `VintemProvider` dentro de `LimitAlertsProvider`, envolvendo `LaunchProvider`)
- `src/pages/DashboardPage.tsx` (slot no `ArcGauge`, balão, fatos do humor)
- `src/components/limits/LimitRow.tsx` (linha do Vintém em `LimitsList`)
- `src/components/launcher/LaunchSheet.tsx` (`onLaunched` depois de `bumpData()`)
- `src/pages/GoalsPage.tsx` (meta batida), `src/pages/SettingsPage.tsx` (cartão)
- `src/hooks/useCycleBudget.ts` (expor `transactions`)
- `src/contexts/AreaContext.tsx` e `src/services/settings.service.ts` (`updateVintemTone`)
- `src/types/index.ts` (`Settings.vintemTone`, `Transaction.source?`)
- `src/components/ui/toast.tsx` (item customizado para o `VintemToast`)
- `src/index.css` (bloco `.vt` com a paleta derivada do token de ação)
- `test/static/phase3-final.test.js` (10 rotas); se houver coleção: `firestore.rules` e `test/rules/matrix.test.js`
- Telas com estado vazio ou erro dos contratos 03 e 03.1 (acrescentar `VintemEmpty`)

## Apêndice B: De onde vêm os fatos (assinaturas reais)

| Fato | Origem | Assinatura / campo |
|------|--------|--------------------|
| Ritmo | `view.rhythmLevel` | `RhythmLevel = 0..4`, `null` se suprimido, sem renda ou ciclo passado [VERIFIED: budget.js, `rhythmLevel` em `buildBudgetView`] |
| Cortes do ritmo | `RHYTHM_CUTS` | `{ folgado: 75, noRitmo: 100, atencao: 115 }` (budget.js:399) |
| % por categoria | `view.spend.rows[]` | `{ categoryId, spentCents, limitCents, state: 'ok'\|'warn'\|'over', pct, remainingCents, excessCents, txs }` |
| Limiares dos alertas | `THRESHOLDS` | `[80, 100]` (alerts.js:10) |
| Dado velho | `view.verdictSuppressed` (já inclui `suppress`) e `useBankFreshness()` | `{ items, suppress, hasConnections, loading }` |
| Sem renda, passado | `view.income.hasIncome`, `view.isPast` | booleanos |
| Somente leitura | `useReadOnly()` | `{ readOnly, partnerName, guard }` |
| Tom | `useArea().settings.vintemTone?.[person]` | a criar; ausente = `'sem-filtro'` |
| Último lançamento | `transactions` (a expor em `useCycleBudget`) | `Transaction.date`, `.createdAt`, `.source?` |
| Dias sem lançar | `daysBetweenParts(zonedParts(ultimo), zonedParts(now))` | `cycle.js:96`, `time.js` |
| Lançamento novo | `LaunchSheet.submit` | `tab`, `cents`, `category`, `view` |
| Meta batida | `GoalsPage.tsx:83` | `contribute(goalId, amount, description)` |
| Porquinho | `LaunchSheet` aba `porquinho` | `piggyMode: 'deposito' \| 'saque'` |
| Ciclo e pessoa vistos | `useCycle()` | `{ now, viewPerson, cycleFor, dataVersion, bumpData }` |

## Apêndice C: Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Guardas existentes vermelhas (rota 10, regras/matriz) | alta | baixo | Atualizar o teste junto com a mudança (Pitfall 1) |
| Corpo oliva sem variável emitida ou derivadas esverdeadas | média | alto (visual) | Bloco `.vt` plano + leitura computada no autoteste (Pitfalls 3 e 4) |
| Limiar de máscara do teste de distinção desatualizado com o corpo oliva | média | médio | Revalidar o limiar 150 e o fundo com o token novo; não relaxar o 12% |
| Nome de pessoa física vazando | baixa | alto (privacidade) | `merchantOf` em ordem rígida + fixtures (Pattern 5) |
| Calibração do gasto grande | alta | baixo | Constantes exportadas; fallback desligado sem amostra |
| Escopo (banco grande + revisão humana) alongar a fase | média | médio | Revisão em checkpoint final; plano de persistência separável (Q7) |
| Falta de Java para `test:rules` | certa (este ambiente) | baixo | Só relevante com `vintemInsights`; roda fora daqui |
| Quedas de quadro em aparelho fraco | baixa a média | médio | Cache de atributos; 30 fps para `inline`/`empty` se preciso; UAT em aparelho real |
