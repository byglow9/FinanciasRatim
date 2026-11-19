# Phase 4: Mascote Vintém - Context

**Gathered:** 2026-11-19
**Status:** Pronto para planejar (estilo do desenho escolhido: sketch 020, variante B)

<domain>
## Phase Boundary

O usuário vê o Vintém, um porquinho-cofre original em SVG, reagindo ao ritmo do mês e ao uso dos limites, com balão de fala e falas próprias em português brasileiro no tom que escolheu. A fase entrega: o desenho com seis estados, o movimento, o detector local de insights que alimenta as falas, o banco de frases por tom, a escolha de tom nas Configurações e uma página de teste com controles.

Requisitos: MASC-01 a MASC-07. Fora desta fase: comentários gerados por IA e push (Fase 7), identidade Coinki e PWA (Fase 5), cartão de crédito (Fase 6), Casal e multiusuário (Fase 8).

</domain>

<decisions>
## Implementation Decisions

### Visual do Vintém
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

### O que dispara cada estado
- **D-05:** Fatos que mexem no humor: **ritmo do mês**, **% do limite de uma categoria** (limiares de 80% e 100%, os mesmos dos alertas), **lançamento que acabou de entrar** (manual ou importado do banco) e **meta ou Porquinho** (aporte, meta batida, dinheiro novo).
- **D-06:** Quando dois fatos pedem humores diferentes, **o pior vence**: categoria estourada > perto do limite > ritmo acima > no ritmo. Ele nunca fica feliz com algo estourado.
- **D-07:** **Sonolento** quando o usuário fica vários dias sem lançar nada. **Surpreso** quando entra um gasto bem acima do normal da categoria (hipótese inicial: cerca de 3 vezes a média dos últimos ciclos; sem histórico, cai numa fração do limite do mês, a calibrar na pesquisa) ou uma receita inesperada.
- **D-08:** **Dados do banco velhos** deixam o Vintém **neutro** (critério de sucesso do roadmap), reaproveitando a lógica de `StaleNotice`.
- **D-09:** A reação a um lançamento novo (susto, bronca, festa) **dura alguns segundos e volta** ao humor de fundo do mês. O balão fica até o usuário tocar ou até o próximo evento.

### Tom e banco de frases
- **D-10:** Três tons: suave acolhe, direto informa, sem filtro zoa. O padrão é **sem filtro, com palavrão e deboche pesado**, sem atacar quem o usuário é. Escolha do tom nas Configurações (MASC-05).
- **D-11:** **Dialeto e vocabulário brasileiros de verdade**, coloquiais e com gíria, para **não parecer uma IA falando**. Nada de frase de manual, nada de "Olá! Notei que...".
- **D-12:** **Banco grande de frases**, com muitas variantes por situação e tom, sem repetir as últimas usadas. A Claude escreve o banco e o dono revisa e corta o que não soar como ele, em um checkpoint de revisão antes de fechar a fase. A quantidade exata por situação fica a critério do planejamento (a opção de 5 a 8 foi superada pelo pedido de "várias e várias"), mas cada situação com variante nos três tons.
- **D-13:** As frases usam encaixes de dados reais (`{loja}`, `{categoria}`, `{vezes}`, `{valor}`, `{pct}`, `{dias}`), preenchidos pelo detector de insights.

### Detector de insights (pronto para a IA da Fase 7)
- **D-14:** O Vintém **entende o que o usuário gastou**, não só ritmo e limite: reconhece, por exemplo, muito iFood na semana, e usa isso para dar bronca e zoar. A leitura é feita por um **detector local de regras, sem IA**, sobre os lançamentos (lojas, categorias, frequência na semana, valor contra a média).
- **D-15:** **A IA fica na Fase 7, mas tudo na Fase 4 é desenhado para ela herdar.** O detector produz **insights estruturados** (tipo, sujeito, métricas, severidade, evidência) que o Vintém pode **guardar**, e o balão de frases consome o mesmo formato. A Fase 7 troca ou complementa a escrita da fala por IA lendo os mesmos insights, com o banco de frases como reserva. O formato do insight é um contrato único, simples e claro, que serve aos dois lados. Insights nunca incluem CPF, números de conta ou cartão nem nomes de pessoas físicas de Pix (restrição de privacidade do PROJECT.md); nomes de lojas são permitidos.

### Onde ele aparece
- **D-16:** No **arco da Home** (slot central de 84px do `ArcGauge`, que hoje tem um porquinho provisório), **ao lançar um gasto** (reação curta depois de salvar), na **Central de Limites** (um Vintém pequeno com fala sobre a categoria mais crítica) e em **estados vazios e erros**.
- **D-17:** A **página de teste** (MASC-06) é uma **rota oculta**, sem link na navegação, acessível digitando o endereço, também em produção para testar no celular instalado. Controles: porcentagem do limite, seguir o cursor, girar de lado, todos os estados e os três tons.
- **D-18:** **Sem cursor, no celular:** o olhar **segue o toque** por um instante e **deriva sozinho** (olhadas aleatórias e piscar); tocar nele faz ele girar ou falar. Com **reduzir movimento** ligado, o balanço, o piscar, a deriva e o seguir-o-cursor param, mas as expressões continuam mudando (poses estáticas).

### Claude's Discretion
- Estrutura interna do detector, nomes dos tipos de insight e do formato guardado, desde que seja um contrato único e documentado.
- Quantidade exata de frases por situação e tom, e o algoritmo de sorteio sem repetição.
- Duração exata da reação e do balão, curvas de animação.
- Calibração do limiar de "gasto grande" e de "dias sem lançar".

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos e roadmap
- `.planning/ROADMAP.md` (Phase 4) — objetivo e critérios de sucesso do mascote
- `.planning/REQUIREMENTS.md` (MASC-01 a MASC-07) — requisitos da fase
- `.planning/PROJECT.md` — restrições de privacidade e originalidade, tom sem filtro

### Design
- `.planning/sketches/020-vintem-verde/index.html` (variante `?v=b`) — **desenho aprovado**, sete estados, motor de molas, piscar, sacadas, giro e autoteste de distinção; é o ponto de partida da implementação
- `.planning/sketches/references/mascote/README.md` e `ref-0*.png` — referências de estilo do dono (fora do git, só direção de estilo)
- `.planning/sketches/019-vintem-fluido/index.html` — só o histórico; o motor de molas foi herdado dele
- `.planning/sketches/themes/moeda.css` — paleta Moeda
- `.planning/phases/03-limites-pode-gastar-e-central/03-UI-SPEC.md` — tokens, escala tipográfica (12/16/28/56) e primitivos herdados
- `.planning/phases/03-limites-pode-gastar-e-central/03-CONTEXT.md` (D-17 a D-22) — paleta, sem emojis, Lucide, fontes
- `.planning/phases/03.1-redesign-das-abas-no-estilo-da-home-ux-mobile-transa-es-cale/03.1-UI-SPEC.md` — contrato de UI mais recente

### Pesquisa de stack
- `.claude/CLAUDE.md` seção "Feature 2: Animated SVG mascot (Vintém)" — SVG inline, CSS, reducer tipado, `pointermove` único com rAF, reduced motion

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/dashboard/ArcGauge.tsx`: slot central de 84px, hoje com porquinho provisório (a Fase 4 troca pelo Vintém).
- `src/components/dashboard/RhythmPill.tsx` e `src/lib/rhythm.ts` (`RHYTHM_LEVELS`, `arcToneFor`): níveis de ritmo, base dos estados.
- `shared/core/budget.js` (`rhythm`, `RHYTHM_CUTS`, `safeToSpend`) e `shared/core/alerts.js` (`THRESHOLDS` 80/100): regras puras já testadas em UTC e Tokyo.
- `src/components/dashboard/StaleNotice.tsx`: detecção de dados velhos, para o estado neutro.
- `src/components/settings/` (`AppearanceCard`, `NotificationsCard`, etc.): onde entra o seletor de tom.

### Established Patterns
- Núcleo puro em `shared/core/*.js`, sem relógio e sem pacote, com testes em UTC e Tokyo; o detector de insights e o seletor de frases seguem esse padrão.
- Guardas estáticas em `test/static/` por tela, com helper compartilhado.
- Sketches HTML offline com autoteste `?test&w=360` terminando em `FALHAS 0`.

### Integration Points
- Home (`HomeSections`), Central de Limites, teclado de lançamento (reação ao salvar), estados vazios e erros, `SettingsPage` (tom) e uma nova rota oculta de teste.

</code_context>

<specifics>
## Specific Ideas

- Exemplo do dono: perceber "muito iFood na semana" e dar bronca com base nisso; ele quer que o Vintém entenda os gastos de verdade e zoe com o que foi comprado.
- Referência de tom nos exemplos aprovados: "Quarto delivery da semana, caralho. Seu fogão é enfeite?", e no tom suave "Está perto do limite de Lazer, vale segurar".
- Frase de exemplo usada no sketch 018: "Esse café de novo? Sua carteira pediu socorro."

</specifics>

<deferred>
## Deferred Ideas

- Geração de comentários por IA gratuita, cache e reserva de frases (Fase 7; IA-01 a IA-05). A Fase 4 só prepara o contrato de insights.
- Push no celular com falas do Vintém (Fase 7).
- Vintém no onboarding e na tela "Instale no celular" (Fase 5).

</deferred>

---

*Phase: 4-Mascote Vintém*
*Context gathered: 2026-11-19*
