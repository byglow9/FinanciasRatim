# Phase 5: Identidade Coinki, PWA e onboarding - Context

**Gathered:** 2026-11-23
**Status:** Ready for planning

<domain>
## Phase Boundary

O app passa a ter nome novo, endereço novo, instalação no celular (adicionar à tela inicial), tema que segue o aparelho (claro, escuro ou forçado), visual novo conferido em todas as telas e uma entrada nova (onboarding de 3 telas antes do login, mais o login já refeito na Fase 3.1).

**Mudança de nome decidida nesta conversa:** o nome do app passa a ser **Coinc** e o endereço **coinc-financias.web.app** (antes "Coinki" / coinki.web.app em ROADMAP, REQUIREMENTS e PROJECT.md). O planejador deve atualizar esses três documentos e o texto de IDEN-01 e IDEN-02. O ID `coinki` do Hosting e o nome Vintém não mudam por causa disso.

Fora desta fase: cartão (Fase 6), push (Fase 7), Casal multiusuário (Fase 8), IA do Vintém (Fase 7).

</domain>

<decisions>
## Implementation Decisions

### Nome e migração de endereço
- **D-01:** O nome do app é **Coinc** e o site é **coinc-financias.web.app**, no mesmo projeto Firebase (`financias-ratimbum`). Decidido pelo dono após dúvida explícita ("Coinc" escrito duas vezes). — **Reversibility:** costly — o nome vai para manifest, ícones, título, ID do site no Hosting e domínios autorizados.
- **D-02:** Pesquisa do nome em lojas e INPI **dispensada** ("é app pessoal"). Não trava a fase.
- **D-03:** Se o ID de site `coinc` estiver ocupado no Hosting, **parar e perguntar ao dono** antes de reservar outro (sem nome reserva automático).
- **D-03a (decidido em 2026-11-23):** o ID `coinc` estava reservado por outro projeto no Firebase. O dono escolheu o ID **`coinc-financias`**: o site é `coinc-financias` e o endereço é **https://coinc-financias.web.app** (já criado, vazio). O nome do app continua **Coinc**. O alias do alvo no `firebase.json` e no `.firebaserc` segue `coinc` e aponta para o site `coinc-financias`.
- **D-04:** O site antigo (financias-ratimbum.web.app) **redireciona direto** para o novo, **sem página de aviso** (decisão do dono, mais simples que o roadmap).
- **D-05:** O login é refeito uma vez no novo endereço (origem nova: sessão e localStorage não migram). Os dados estão no Firestore e não se perdem. Sem migração de preferências locais por link.
- **D-06:** Domínio novo entra nos domínios autorizados do Auth e em `ALLOWED_ORIGINS` do servidor; cabeçalhos do Hosting corrigidos para o service worker não ficar preso em cache (ver `firebase.json`: regras `**/*.js` e `**/*.css` imutáveis pinariam `/sw.js`).

### Tema escuro
- **D-07:** Direção de cor: o **verde do tema claro fica mais claro** do que o atual e o **tema escuro usa um verde bem escuro** (fundo verde-quase-preto). Sem rosa (a paleta Noite não entra). Valores exatos (hex, contraste) são do UI-SPEC da fase, medidos pelo teste de contraste existente (`test/static/palette-contrast.test.js`).
- **D-08:** Seletor nos Ajustes com **três opções: Automático (padrão, segue o celular), Claro, Escuro**.
- **D-09:** A escolha fica **por aparelho, no localStorage**, aplicada antes do primeiro desenho (sem piscar o tema errado).
- **D-10:** A fase **revisa todas as telas e gráficos no escuro**: Recharts, arco do medidor, alertas, Vintém sobre fundo escuro, estados vazios e de erro.

### Adicionar à tela inicial e atualização
- **D-11:** Não existe suporte instalável hoje; esta fase cria manifest, ícones (inclusive maskable) e service worker. O texto da interface diz **"Adicionar à tela inicial"**, não "instalar".
- **D-12:** Os passos (Android e iPhone) aparecem **na tela de boas-vindas** (a 3ª tela do onboarding).
- **D-13:** Ícone do app: **sketch com 5 versões** para o dono escolher, **3 seguindo as referências** de `.planning/sketches/references/mascote/ref-01-app-icons.png` (silhueta sólida, só dois olhos pequenos, fundo chapado em degradê, cantos arredondados) e **2 livres** à escolha de Claude. Sem moeda no ícone (sketch 020). Sem nome de terceiros nem cópia da arte.
- **D-14:** Atualização: o app **atualiza sozinho ao abrir** (decisão do dono), sem toast de confirmação. **Atenção ao planejador:** o critério de sucesso 3 do roadmap e IDEN-04 dizem "recebe um aviso para atualizar, sem tela branca depois de um deploy". O dono preferiu atualizar sem aviso; garantir **ausência de tela branca** e **não trocar de versão no meio de um lançamento em andamento** (trocar na abertura, não durante o uso), e ajustar o texto de IDEN-04 e do critério 3.
- **D-15:** Offline: **só a casca do app** é cacheada; dados (Firestore, `/api`) sempre da rede, sem cache de saldo velho.

### Onboarding
- **D-16:** São **3 telas** antes do login. O texto é **decisão de Claude** (dono: "você decide o texto"), proposto no mockup/UI-SPEC e ajustável. Proposta de partida: 1 "Pode gastar" (valor central), 2 "Limites e Vintém", 3 "Adicionar à tela inicial" com os passos de Android e iPhone e o botão de entrar.
- **D-17:** Aparece **só na primeira abertura de cada aparelho, antes do login**, guardado no localStorage (quem já usa o app vê uma vez no endereço novo).
- **D-18:** Botão **Pular em todas as telas**; pular leva ao login e marca como visto.
- **D-19:** O **Vintém conduz as 3 telas, calado** (sem fala e sem IA), com estados diferentes por tela, usando a arte e o motor da Fase 4; respeita movimento reduzido.

### Claude's Discretion
- Texto exato das 3 telas e do aviso de redirecionamento/login (um aviso curto na tela de login após o redirecionamento é aceitável, mas não uma página de aviso separada).
- Hex dos tokens claros e escuros, desde que passem no teste de contraste.
- As duas variações livres do ícone.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap e requisitos
- `.planning/ROADMAP.md` — Fase 5 (meta, critérios, notas de execução)
- `.planning/REQUIREMENTS.md` — IDEN-01 a IDEN-06 e IDEN-08 (nome e endereço mudaram: atualizar)
- `.planning/PROJECT.md` — nome do app e restrições de originalidade

### Decisões herdadas
- `.planning/phases/03-limites-pode-gastar-e-central/03-CONTEXT.md` — D-19 a D-22 (Home A, Lucide, fonte Sora + Bricolage, paleta Moeda)
- `.planning/phases/03.1-redesign-das-abas-no-estilo-da-home-ux-mobile-transa-es-cale/03.1-CONTEXT.md` — visual das abas e Login (sketch 017); onboarding e tema escuro foram deixados para a Fase 5
- `.planning/phases/04-mascote-vint-m/04-CONTEXT.md` e `04-UI-SPEC.md` — motor e estados do Vintém, movimento reduzido

### Design
- `.planning/sketches/MANIFEST.md` — sketches e temas (`themes/moeda.css`)
- `.planning/sketches/017-login/` — login aprovado
- `.planning/sketches/references/mascote/ref-01-app-icons.png` — referência de estilo dos ícones (fora do git)
- `.planning/sketches/references/mascote/README.md` — regra: direção de estilo, sem copiar

### Infra
- `firebase.json` — cabeçalhos do Hosting
- `.planning/research/` (STACK) — vite-plugin-pwa, workbox, `@vite-pwa/assets-generator`, nota do bug de cache do `sw.js`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/vintem/Vintem.tsx` e `VintemSlot`/`VintemEmpty`: o Vintém calado para o onboarding.
- `public/piggy.svg` e o favicon atual em `index.html`: a trocar pelo ícone novo.
- Tokens Moeda e teste de contraste já existentes.

### Established Patterns
- `AuthContext` (Firebase Auth e-mail e senha), login refeito na 3.1.
- localStorage por aparelho já usado para preferências de UI.

### Integration Points
- `index.html`, `vite.config.ts` (plugin PWA e `src/sw.ts`), `firebase.json` (site e cabeçalhos), `server` (`ALLOWED_ORIGINS`), Console do Firebase (domínios autorizados), `src/pages` (rota de onboarding antes do login), `src/pages/SettingsPage.tsx` (seletor de tema).

</code_context>

<specifics>
## Specific Ideas

- Ícones no espírito de `ref-01-app-icons.png`: silhueta sólida, dois olhos pequenos, degradê chapado, sem copiar nenhum dos seis.
- Dono quer o verde claro do tema claro mais claro e um verde bem escuro no tema escuro.

</specifics>


### Redesenho da entrada (decidido em 2026-11-23, depois de ver o app no ar)
O dono abriu o app publicado e não gostou da primeira versão do onboarding e do Login. Estas decisões **substituem** D-16, D-18 e D-19 onde houver conflito (o resto, como D-17, a primeira abertura por aparelho, continua).
- **D-20:** O onboarding não tem cartões nem "seções": o **Vintém grande e centralizado** ocupa a tela, sobre o fundo do app, sem o painel escuro atrás dele. O texto vem **na fala do próprio Vintém** (balão) mais um título curto. Sem blocos empilhados.
- **D-21:** O Vintém **faz mais coisas**: animação própria por tela (aparece, reage, aponta, comemora), usando o motor da Fase 4 (estados e reações). O que ele diz vira o conteúdo da tela.
- **D-22:** As telas podem usar **prints reais do app** (Home, limites, lançar um gasto), em moldura de celular, e o passo de "Adicionar à tela inicial" ganha **ilustração em passos** (celular com marcador), no estilo das referências do dono, mas com visual e textos próprios.
- **D-23:** O **Login** é refeito no visual do app: Vintém, nome Coinc com tipografia própria, campos arredondados, um botão principal grande, link secundário. Direção de estilo: as referências do dono (Skunk) e o resto do app; **nada copiado** (personagem, nome, frases e wordmark são próprios).
- **D-24:** O **ícone/logo do app** sobe de nível: profundidade e acabamento (material, luz, reflexo suave) como nas referências de ícones do dono, sem perder o porquinho verde minimalista que ele escolheu (R1). A decisão sai de uma rodada de pesquisa e de sketches, com ferramentas à escolha (SVG avançado ou render 3D no Blender).
- **Fluxo:** pesquisa e sketches primeiro; o dono escolhe; depois entram os planos de implementação.

<deferred>
## Deferred Ideas

None — a discussão ficou dentro do escopo da fase.

</deferred>

---

*Phase: 5-Identidade Coinki, PWA e onboarding*
*Context gathered: 2026-11-23*
