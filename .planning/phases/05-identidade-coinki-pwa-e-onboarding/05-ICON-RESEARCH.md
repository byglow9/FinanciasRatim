# Pesquisa: ícone do Coinc com profundidade e acabamento

Data: 2026-11-23. Escopo: pesquisa e testes; nenhum ícone final foi implementado. Ponto de partida: o ícone atual (R1, `.planning/sketches/025-icone-r`), silhueta verde chapada com dois olhos e focinho de pílula sobre creme.

Evidências dos testes (fora do repositório, no scratchpad da sessão):
`/tmp/claude-1000/-home-glow-Documentos-projetos-sitefinancias/b052b316-b40f-4aa7-849a-4081c16d3338/scratchpad/t/` com `t.svg`/`t.png` (efeitos SVG), `g.svg`/`g.png` (grão, brilho, luz de borda), `b.py`/`clay.png` (Blender headless).

## 1. Anatomia do acabamento das referências

Referências: `icones-ref-a/b/c.png` e `../mascote/ref-01-app-icons.png`. Nada abaixo é para copiar: é o vocabulário técnico do efeito.

O que se repete em quase todos os ícones:

| Efeito | O que se vê | Como se decompõe (camadas) |
|---|---|---|
| Volume "argila/borracha" | Personagem parece inflado, sem arestas duras (maçã, fantasma, "blob" roxo em ref-c) | Forma base com gradiente radial deslocado para cima-esquerda (centro claro, borda escura) + sombra interna escura embaixo + brilho suave em cima |
| Luz de borda (rim light) | Contorno fino claro em cima/lados dos tiles pretos e do tile cinza (ref-a/b) | Traço de 1 a 3 px com gradiente linear de branco semitransparente (topo) até transparente (meio) até sombra (base), acompanhando o contorno do squircle |
| Sombra interna (inner shadow) | Parte de baixo do personagem mais escura, borda interna do tile aprofundada | Inverter o alfa da forma, borrar, deslocar para cima, recortar pela própria forma e compor por cima |
| Realce especular | Mancha clara pequena e macia no ombro superior esquerdo (ref-c, apple/ghost) | Elipse branca com opacidade 50 a 70%, desfoque 6 a 10, mais um pontinho nítido menor |
| Oclusão de ambiente (AO) | Cantos e dobras mais escuros (focinho, orelhas, embaixo do corpo) | Formas escuras com baixa opacidade e desfoque, atrás das partes que se sobrepõem |
| Fundo em degradê | Laranja, magenta, azul, roxo com 2 a 3 paradas; às vezes "névoa" interna | Linear 135 graus + um radial grande claro no canto superior para dar "luz" |
| Vidro / translúcido | Alto-falante e ícones escuros (ref-a/b), blobs coloridos (ref-c) | Forma semitransparente com gradiente de opacidade, borda clara, camada atrás desfocada, reflexo diagonal. Em 3D vem de material transmissivo; em 2D é imitação |
| Tile "chassi" | Quadrado arredondado com bisel, parece peça física (ref-a: geladeira, notas) | Tile com gradiente sutil + luz de borda + sombra interna de 1 a 2% + sombra projetada macia embaixo |
| Grão / ruído | Quase imperceptível nas referências claras; só aparece em fundos escuros e degradês | feTurbulence com baixa opacidade, ou textura raster sobreposta; opcional |
| Olhos | Poucos traços: duas formas escuras com 1 reflexo branco pequeno (gatinho preto, fantasma, maçã) | Elipse escura + círculo branco de 15 a 25% do olho; é o que dá "vida" ao volume |
| Poucas formas, alto contraste | Silhueta legível mesmo pequena | Uma forma dominante + 2 a 3 detalhes; o brilho nunca compete com a silhueta |

Conclusão técnica: o "acabamento" é uma pilha de 5 a 8 camadas sobre uma silhueta simples (base com gradiente, AO, sombra interna, realce, luz de borda, sombra projetada). Quase tudo isso é reproduzível em vetor ou raster plano. O que vidro e argila de verdade têm a mais (refração, subsurface, penumbra física) só vem de render 3D.

## 2. Pesquisa de plataforma (fontes web)

- **Apple (HIG e Icon Composer, WWDC25 e WWDC26):** canvas de 1024 x 1024 para iPhone, iPad e Mac. Ícone em camadas (fundo + 1 ou mais camadas de primeiro plano), **entregue sem máscara e sem cantos**: o sistema arredonda e aplica os efeitos Liquid Glass (brilhos especulares, sombras, desfoque, translucidez). Recomenda não "assar" realces e sombras nas camadas, e alerta que complexidade excessiva (muitas formas sobrepostas) é o erro mais comum. O Icon Composer exige macOS Tahoe 26.4 ou superior e só serve para app nativo; **não se aplica a PWA**. Para a nossa PWA a lição é só conceitual: arte em camadas, fundo separado do personagem, forma simples.
  Fontes: [HIG app icons](https://developer.apple.com/design/human-interface-guidelines/app-icons.md), [Icon Composer](https://www.developer.apple.com/icon-composer/), [WWDC25 361](https://developer.apple.com/videos/play/wwdc2025/361), [WWDC25 220](https://developer.apple.com/videos/play/wwdc2025/220), [WWDC26 8012](https://developer.apple.com/videos/play/wwdc2026/8012/).
- **Maskable (web.dev):** conteúdo importante dentro de um círculo central de raio 40% da largura; os 10% externos podem ser cortados. Recomendado 512 x 512. Use `"any maskable"` ou entradas separadas. Fonte: [web.dev maskable](https://web.dev/articles/maskable-icon).
- **Chrome / manifest:** mínimo 192 x 192 e 512 x 512 para Chromium (escala o resto). Fonte: [web.dev add-manifest](https://web.dev/articles/add-manifest), [MDN app icons](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons).
- **iOS / Safari:** ignora os ícones do manifest e usa `<link rel="apple-touch-icon">`; 180 x 180 continua sendo o tamanho útil máximo (60 pt x @3x). Lighthouse pede fundo não transparente; o iOS preenche transparência com preto, então o apple-touch precisa ser **opaco**. Fontes: [RealFaviconGenerator](https://realfavicongenerator.net/blog/apple-touch-icon-is-180x180-pixels-but-is-that-still-true), [Lighthouse apple-touch-icon](https://developer.chrome.com/docs/lighthouse/pwa/apple-touch-icon). A parte "opaco" veio de fonte secundária; vale confirmar em um iPhone real.
- Não foi encontrada fonte oficial de 2025/2026 trazendo mudança nesses requisitos de PWA; manter o que o repositório já faz (192, 512, maskable 512, apple-touch 180 opaco).

## 3. O que funciona nas ferramentas deste ambiente

### 3.1 Pipeline atual: `sharp` 0.35.5 com **librsvg 2.63.2** (não é resvg)

`@vite-pwa/assets-generator` usa o sharp; portanto o que vale é o librsvg. Testei SVGs reais (`t.svg`, `g.svg`) e olhei o PNG:

| Recurso | Resultado | Observação |
|---|---|---|
| `linearGradient` / `radialGradient` (com `cx/cy/r` deslocados) | Funciona | Base do volume. Sem `quality` no PNG para não virar paleta de 8 bits (já configurado). |
| `feGaussianBlur` | Funciona, **com ressalva** | A região padrão do filtro é +10%; um realce borrado fica **cortado em retângulo**. Sempre usar `x="-50%" y="-50%" width="200%" height="200%"`. Depois de corrigido, o realce macio saiu correto. |
| `feDropShadow` | Funciona | Sombra projetada macia embaixo do personagem ficou boa. |
| Sombra interna (`feComponentTransfer` + `feGaussianBlur` + `feOffset` + `feComposite`) | Funciona | Escureceu o ventre da forma como esperado. |
| `feSpecularLighting` + `fePointLight` | Funciona, mas perigoso | Gera brilho convincente de "gel" na borda, só que lava a cor e fica difícil de controlar. Servir como inspiração, preferir realces desenhados à mão. |
| `feTurbulence` (grão) | Funciona, **com ressalva** | Sem `feComposite operator="in"` com o gráfico original, o ruído vaza como retângulo cinza nos cantos (visto em `g.png`). Compor sempre pelo alfa da forma. |
| `mask`, `clipPath` | Funciona | Máscara invertida e clip arredondado corretos. |
| `mix-blend-mode: multiply` (via `style`) | Funciona no teste | O amarelo escureceu o verde (multiplicação) e manteve o creme; mesmo assim, evitar depender disso: usar gradientes com opacidade, que são previsíveis. |
| Luz de borda (traço com gradiente linear branco para transparente para escuro) | Funciona | Ficou com cara de bisel de tile, parecida com a ref-a. |
| Gradiente radial branco com opacidade 0 na borda ("glow") | Funciona | Boa para brilho de fundo e vinheta. |

Conclusão: **dá para fazer toda a pilha de camadas da seção 1 em SVG e passar pelo sharp sem trocar a pipeline.** Riscos: região de filtro, grão vazando, e filtros pesados em 192 px custam pouco, mas o SVG fonte também vai para `public/favicon.svg` (o navegador renderiza com filtros próprios; checar no Chrome e Safari). Mitigação: para o favicon SVG, usar uma versão simplificada ou só o PNG.

### 3.2 Blender

- MCP `blender`: **sem conexão** (`Could not connect to Blender at localhost:9876`; o addon não está com o servidor ligado).
- MCP `blenderwright`: **sem conexão** (`No blenderwright auth token`; falta clicar em Start Server no painel).
- Alternativa que funcionou: o binário local **Blender 5.2.3 LTS** (`/home/glow/.local/bin/blender`) rodando **headless** com `blender -b -P script.py`. Teste: esfera achatada verde macia (Principled BSDF, subsurface 0,35, rugosidade 0,55, subdivisão 2 e 3), duas orelhas, dois olhos escuros e focinho, câmera ortográfica, luzes de área, Cycles 48 amostras na CPU, 512 x 512, **fundo transparente (RGBA)**. Tempo de render: cerca de 5 s. Saída: `.../scratchpad/t/clay.png`. O fluxo está provado: script Python, PNG com alfa, automatizável e sem depender de MCP.
- Qualidade do teste: forma macia e legível, mas **cor lavada** (a transformação de vista padrão e o mundo branco desaturam o verde) e enquadramento alto demais. Acertos necessários: `view_transform = 'Standard'`, mundo mais escuro ou HDRI suave, mais luz de recorte, centralizar a câmera, orelhas de porco (caídas e arredondadas em vez de orelhas de urso) e olhos com reflexo.
- Limite: o resultado é raster. Entra no pipeline como PNG de origem: o gerador de ícones precisa de SVG ou PNG; PNG em 1024 ou 2048 serve (sharp reduz). O favicon SVG deixaria de ser vetorial (usar PNG ou uma versão SVG simplificada à parte).

### 3.3 Outras opções

- `convert` (ImageMagick 6) existe; `inkscape`, `rsvg-convert` e `magick` não. Serve para compor e reduzir PNG, não para gerar a arte.
- Geração de imagem por IA não foi avaliada (originalidade e coerência de mascote ficariam sem controle).
- Dá para **híbrido**: render 3D no Blender do personagem (PNG transparente) + fundo, realces e luz de borda em SVG compostos pelo sharp.

## 4. Três direções

Regras comuns: porquinho verde (#2f6f3e / #3f8a4a), creme (#fbf3df / #f1dcb0), escuro (#0f2a1a), sem moeda, cifrão, letra ou emoji, dois olhos, legível em 32 px, personagem e cores próprios (não copiar nada das referências).

### A. "Argila macia" (3D no Blender, Cycles headless)

- **Referência visual:** maçã e fantasma da ref-c, blob da ref-a; massa inflada, luz macia.
- **Produção:** modelar cabeça de porquinho (esfera achatada, 2 orelhas caídas, focinho largo com narinas, 2 olhos com reflexo), material Principled com subsurface leve, 2 luzes de área + luz de recorte, câmera ortográfica; renderizar 2048 x 2048 com alfa. Fundo e luz de borda do tile em SVG; compor via sharp ou diretamente como PNG no SVG (`<image>` embutida).
- **Risco:** maior. Controle de cor no 3D, escala de esforço (modelagem e iteração), SVG deixa de ser vetorial (favicon e sketch ficam PNG), consistência com o Vintém SVG animado da UI. O MCP do Blender não está ligado; usar o fluxo headless.
- **32 px:** bom se o focinho for grande e o contraste de fundo forte; o volume sutil some e vira cor chapada, então a silhueta precisa funcionar sozinha.
- **Exportação:** 1024 mestre; 192 e 512 "any" com cantos arredondados; maskable 512 com o personagem dentro do círculo de 40% e fundo borda a borda; apple-touch 180 opaco, sem cantos.

### B. "Vidro / gel" translúcido sobre degradê

- **Referência visual:** blobs translúcidos (ref-c), tile escuro com vidro (ref-a/b).
- **Produção:** em SVG, fundo em degradê (verde escuro para verde-musgo, com glow radial), corpo do porco em verde com gradiente de opacidade, borda clara, camada de reflexo diagonal, realce especular, olhos escuros com brilho. Em Blender, vidro de verdade (transmissão) dá mais realismo, mas custa mais e fica pesado em 32 px.
- **Risco:** médio a alto. Translucidez perde a graça sobre fundo claro e em 32 px vira mancha; o fundo escuro conflita com o creme da identidade; "gel" pode ficar genérico. O repositório não tem refração real em SVG (só imitação).
- **32 px:** fraco, a menos que o corpo seja bem opaco no centro.
- **Exportação:** igual à A; maskable pede o corpo no círculo de 40% e fundo cheio.

### C. "Chapado com luz" (SVG em camadas)

- **Referência visual:** maçã da ref-c e tiles da ref-b; poucas formas, mas com volume suave por camadas.
- **Produção:** tudo em um SVG: fundo creme/menta em degradê + glow; sombra projetada; corpo verde com gradiente radial deslocado; AO entre orelha e cabeça; sombra interna embaixo; focinho creme-esverdeado com narinas e realce; olhos escuros com reflexo; realce macio no ombro; luz de borda no tile. Camadas em `<g>` nomeados, permitindo reaproveitar no Vintém animado da UI.
- **Risco:** baixo. Tudo foi validado na seção 3.1; só exige atenção às regiões de filtro e ao grão.
- **32 px:** o melhor das três: silhueta e olhos fortes, camadas finas simplesmente somem sem estragar a leitura. Fazer uma variante "pequena" (sem AO e sem grão) para o favicon.
- **Exportação:** direta, sem mudar a pipeline: `assets-src/icon/icon.svg` (any, cantos), `assets-src/maskable/icon-maskable.svg` (borda a borda, personagem no círculo de 40%, fundo opaco), apple-touch 180 e favicon vêm do mesmo gerador.

## 5. Recomendação

**Seguir com a direção C como entregável principal, usando a A como camada de ganho opcional.**

Motivo: C usa só o que já foi comprovado nesta máquina (SVG para sharp), mantém um SVG vetorial reutilizável pelo mascote animado, escala bem para 32 px, e o salto de qualidade sobre o R1 vem das camadas de luz, sombra interna, AO e luz de borda, que são exatamente o que as referências têm em comum. A (Blender) só vale se, depois de ver o sketch C, o dono ainda achar plano demais; nesse caso, renderizar o personagem em Blender (fluxo headless já provado) e manter fundo e luz de borda em SVG. B fica descartada como principal por perder contraste em 32 px e pelo conflito com o creme.

Próximo passo para o sketch (não feito aqui):

1. Sketch em `.planning/sketches/` com 3 variações de C (fundo creme, fundo menta, fundo verde escuro), cada uma com a pilha de camadas completa e a variante simplificada de 32 px lado a lado.
2. Usar filtros com região ampliada (`-50%` a `200%`) e grão compondo pelo alfa.
3. Testar o favicon SVG no Chrome e Safari e a rasterização de 192, 512, maskable e apple-touch pelo `npm run icons`.
4. Se a A for pedida, ligar o MCP do Blender ou usar `blender -b -P`; corrigir `view_transform = 'Standard'`, enquadramento e orelhas antes de avaliar.
