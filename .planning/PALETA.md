# Paleta definitiva do Coinki

Fixada a partir da imagem de referencia do dono (`12.png`). Fonte unica: `src/index.css` (`@theme` em hex e
`:root` em tripletes HSL, cada um com o hex no comentario). Espelho para sketches: `.planning/sketches/themes/definitiva.css`.
A guarda `test/static/palette-contrast.test.js` mede todos os pares abaixo e falha se algum cair do minimo
(4,5:1 para texto, 3:1 para elementos nao textuais).

## Tons medidos da imagem

| Nome | Hex | Papel |
|---|---|---|
| Creme | `#f5ecdb` | fundo da pagina (`--background`) e icones sobre a dock |
| Areia | `#bb9a77` | ancora `--color-sand`; apoio decorativo |
| Salvia | `#888b76` | ancora `--color-sage`; eixos dos graficos; base da borda de campo (escurecida) |
| Oliva escuro | `#4c513b` | acao: botoes, item ativo, foco, dock, serie Ele |
| Quase-preto | `#1e1f19` | texto principal (`--foreground`) |

## Tokens

| Token | Hex | Uso |
|---|---|---|
| `--background` | `#f5ecdb` | fundo da pagina |
| `--card`, `--popover` | `#fbf6ea` | cartoes e paineis: mais claros que o fundo, nunca branco puro |
| `--surface-2` | `#fffcf3` | superficie sobre o cartao (chips, linhas internas, pilula ativa dos segmentos) |
| `--foreground` | `#1e1f19` | texto |
| `--muted-foreground` | `#5c604a` | texto secundario (salvia escurecida) |
| `--muted`, `--secondary` | `#ece2cb` | regioes neutras |
| `--accent`, `--track` | `#e6dcc4` | hover e trilhas (anel do medidor, barras de progresso) |
| `--border` | `#e3d6bc` | divisorias decorativas |
| `--input` | `#7a7d66` | borda de campos (>= 3:1) |
| `--primary`, `--ring`, `--color-action` | `#4c513b` | acao e foco |
| `--primary-foreground`, `--color-action-text` | `#fbf6ea` | texto sobre a acao |
| `--destructive`, `--danger` | `#b3382c` | perigo (preenchimento) |
| `--destructive-foreground` | `#fbf6ea` | texto sobre perigo |
| `--brand` | `#3f8a4a` | ok (preenchimento: barras, icones, pontos) |
| `--warn` | `#a8650a` | atencao (preenchimento) |
| `--ok-ink` / `--warn-ink` / `--danger-ink` | `#2e6a34` / `#7c4a12` / `#9c2f23` | texto dos estados |
| `--color-ok-bg` / `-warn-bg` / `-danger-bg` | `#dfe8c8` / `#f6e3b4` / `#f3d5cb` | fundo suave dos estados (chips, avisos) |
| `--color-rhythm-0..4-bg/fg` | ver `index.css` | chips de ritmo (0 melhor, 4 pior) |
| `--color-dock` / `-dock-fg` | `#4c513b` / `#f5ecdb` | dock oliva com icones creme |
| `--color-dock-active` / `-dock-active-fg` | `#f5ecdb` / `#4c513b` | item ativo: pilula creme com icone oliva |
| `--color-fab` / `-fab-fg` | `#788f56` / `#1e1f19` | botao + em verde-folha (oliva-salvia mais claro) com icone quase-preto |
| `--color-ele` / `--color-ela` | `#4c513b` / `#9a4a26` | Ele (oliva) e Ela (siena) no Casal e nos graficos |
| `--color-chart-1..8`, `-axis`, `-grid` | ver `index.css` | series, eixos e grade dos graficos |
| `--color-heat-*`, `--color-pit-*`, `--color-dot-*`, `--color-bill-*` | ver `index.css` | calendario: mapa de calor, post-its, pontinhos, linhas de conta |
| `--color-pig-bg` / `-pig-ink` | `#f4dfe3` / `#9a2e5a` | cartao do Porquinho |

O bloco `.dark` nao mudou (tema escuro e da Fase 5).

## Ajustes em relacao a proposta e por que

1. **Cartao mais claro que o fundo.** O tema anterior tinha o cartao mais escuro que o fundo. Agora cartao `#fbf6ea` sobre fundo `#f5ecdb`; a separacao vem do tom e da sombra, nao de borda.
2. **Texto secundario `#5c604a`, nao a salvia pura.** `#888b76` da 2,98:1 sobre o creme; escurecida para `#5c604a` passa com 5,55:1 no fundo e 6,03:1 no cartao.
3. **Botao + em verde-folha `#788f56`.** O dono nao gostou do marrom; o botao ganhou um verde mais claro, da familia do oliva. Passa de 3:1 contra o fundo (3,05) e o icone quase-preto fica em 4,63:1. Contra a dock oliva a razao e 2,30:1: nao existe cor que de 3:1 ao mesmo tempo contra o creme (luminancia ~0,84) e contra o oliva (~0,08), entao o botao se separa da dock pelo vao de fundo entre os dois e pela sombra. Descartados: `#5d9358` e `#589367` (verdes mais vivos que destoam do oliva), `#7d8f58`, `#7b8d5a`, `#7a8c62` (mais acinzentados) e `#a27b55` (marrom anterior).
4. **Borda de campo `#7a7d66`.** A salvia pura da 2,98:1 sobre o fundo; escurecida passa de 3:1 em fundo, cartao e superficie 2.
5. **Eixos dos graficos com a salvia pura `#888b76`.** Os eixos ficam sobre o cartao (3,24:1), entao a cor medida serve.
6. **Verde, ambar e vermelho semanticos** reescritos em tons quentes (`#3f8a4a`, `#a8650a`, `#b3382c`; tintas `#2e6a34`, `#7c4a12`, `#9c2f23`) para harmonizar com o oliva e passar contraste. O verde de ok ficou distinto do oliva de acao: ok = verde-folha, acao = oliva escuro.
7. **Superficie 2 `#fffcf3`** em vez de branco puro; o interruptor tambem deixou de usar `bg-white`.
8. **Cores em hex literal nos componentes** (graficos, chips, alertas, Porquinho) migraram para tokens; as series dos graficos agora usam `var(--color-chart-N)`.

## Pares de contraste medidos

Coluna "min" e o limite da guarda (4,5 texto, 3 nao textual). Todos passam.

| Papel | Frente | Fundo | Razao | Min |
|---|---|---|---|---|
| texto | foreground #1e1f19 | background #f5ecdb | 14.15 | 4.5 |
| texto secundario | muted-foreground #5c604a | background #f5ecdb | 5.55 | 4.5 |
| tinta ok | ok-ink #2e6a34 | background #f5ecdb | 5.55 | 4.5 |
| tinta atencao | warn-ink #7c4a12 | background #f5ecdb | 6.29 | 4.5 |
| tinta perigo | danger-ink #9c2f23 | background #f5ecdb | 6.29 | 4.5 |
| acao (borda, foco, icone) | action #4c513b | background #f5ecdb | 7.03 | 3 |
| campo (borda) | input #7a7d66 | background #f5ecdb | 3.61 | 3 |
| foco | ring #4c513b | background #f5ecdb | 7.03 | 3 |
| ok (preenchimento) | brand #3f8a4a | background #f5ecdb | 3.62 | 3 |
| atencao (preenchimento) | warn #a8650a | background #f5ecdb | 3.95 | 3 |
| perigo (preenchimento) | danger #b3382c | background #f5ecdb | 5.09 | 3 |
| texto | foreground #1e1f19 | card #fbf6ea | 15.39 | 4.5 |
| texto secundario | muted-foreground #5c604a | card #fbf6ea | 6.03 | 4.5 |
| tinta ok | ok-ink #2e6a34 | card #fbf6ea | 6.03 | 4.5 |
| tinta atencao | warn-ink #7c4a12 | card #fbf6ea | 6.84 | 4.5 |
| tinta perigo | danger-ink #9c2f23 | card #fbf6ea | 6.85 | 4.5 |
| acao (borda, foco, icone) | action #4c513b | card #fbf6ea | 7.64 | 3 |
| campo (borda) | input #7a7d66 | card #fbf6ea | 3.93 | 3 |
| foco | ring #4c513b | card #fbf6ea | 7.64 | 3 |
| ok (preenchimento) | brand #3f8a4a | card #fbf6ea | 3.94 | 3 |
| atencao (preenchimento) | warn #a8650a | card #fbf6ea | 4.30 | 3 |
| perigo (preenchimento) | danger #b3382c | card #fbf6ea | 5.53 | 3 |
| texto | foreground #1e1f19 | surface-2 #fffcf3 | 16.18 | 4.5 |
| texto secundario | muted-foreground #5c604a | surface-2 #fffcf3 | 6.34 | 4.5 |
| tinta ok | ok-ink #2e6a34 | surface-2 #fffcf3 | 6.34 | 4.5 |
| tinta atencao | warn-ink #7c4a12 | surface-2 #fffcf3 | 7.19 | 4.5 |
| tinta perigo | danger-ink #9c2f23 | surface-2 #fffcf3 | 7.20 | 4.5 |
| acao (borda, foco, icone) | action #4c513b | surface-2 #fffcf3 | 8.04 | 3 |
| campo (borda) | input #7a7d66 | surface-2 #fffcf3 | 4.13 | 3 |
| foco | ring #4c513b | surface-2 #fffcf3 | 8.04 | 3 |
| ok (preenchimento) | brand #3f8a4a | surface-2 #fffcf3 | 4.14 | 3 |
| atencao (preenchimento) | warn #a8650a | surface-2 #fffcf3 | 4.52 | 3 |
| perigo (preenchimento) | danger #b3382c | surface-2 #fffcf3 | 5.82 | 3 |
| texto secundario | muted-foreground #5c604a | muted #ece2cb | 5.05 | 4.5 |
| texto secundario | muted-foreground #5c604a | accent #e6dcc4 | 4.77 | 4.5 |
| texto secundario | muted-foreground #5c604a | track #e6dcc4 | 4.77 | 4.5 |
| texto | foreground #1e1f19 | accent #e6dcc4 | 12.17 | 4.5 |
| botao primario | action-text #fbf6ea | action #4c513b | 7.64 | 4.5 |
| botao destrutivo | destructive-foreground #fbf6ea | destructive #b3382c | 5.53 | 4.5 |
| dock: icone | dock-fg #f5ecdb | dock #4c513b | 7.03 | 4.5 |
| dock: item ativo | dock-active-fg #4c513b | dock-active #f5ecdb | 7.03 | 4.5 |
| dock: pilula ativa sobre o dock | dock-active #f5ecdb | dock #4c513b | 7.03 | 3 |
| dock sobre o fundo | dock #4c513b | background #f5ecdb | 7.03 | 3 |
| botao +: icone | fab-fg #1e1f19 | fab #788f56 | 4.63 | 4.5 |
| botao + sobre o fundo | fab #788f56 | background #f5ecdb | 3.05 | 3 |
| botao + ao lado da dock | fab #788f56 | dock #4c513b | 2.30 | 2.2 (teto fisico, ver ajuste 3) |
| ok: texto no fundo suave | ok-ink #2e6a34 | ok-bg #dfe8c8 | 5.12 | 4.5 |
| atencao: texto no fundo suave | warn-ink #7c4a12 | warn-bg #f6e3b4 | 5.82 | 4.5 |
| perigo: texto no fundo suave | danger-ink #9c2f23 | danger-bg #f3d5cb | 5.34 | 4.5 |
| porquinho: texto no fundo suave | pig-ink #9a2e5a | pig-bg #f4dfe3 | 5.67 | 4.5 |
| ritmo 0 | rhythm-0-fg #24491f | rhythm-0-bg #cfe0b8 | 7.33 | 4.5 |
| ritmo 1 | rhythm-1-fg #2e6a34 | rhythm-1-bg #dfe8c8 | 5.12 | 4.5 |
| ritmo 2 | rhythm-2-fg #7c4a12 | rhythm-2-bg #f6e3b4 | 5.82 | 4.5 |
| ritmo 3 | rhythm-3-fg #8a3f12 | rhythm-3-bg #f6dcc0 | 5.68 | 4.5 |
| ritmo 4 | rhythm-4-fg #9c2f23 | rhythm-4-bg #f3d5cb | 5.34 | 4.5 |
| texto sobre pit-yellow | foreground #1e1f19 | pit-yellow #f3d56b | 11.49 | 4.5 |
| texto sobre pit-blue | foreground #1e1f19 | pit-blue #9fd3d6 | 10.09 | 4.5 |
| texto sobre pit-green | foreground #1e1f19 | pit-green #c3d98a | 10.76 | 4.5 |
| texto sobre pit-pink | foreground #1e1f19 | pit-pink #e3a6c9 | 8.35 | 4.5 |
| texto sobre pit-purple | foreground #1e1f19 | pit-purple #c9bde6 | 9.41 | 4.5 |
| texto sobre heat-1 | foreground #1e1f19 | heat-1 #f8e9df | 14.00 | 4.5 |
| texto sobre heat-2 | foreground #1e1f19 | heat-2 #f3d5cb | 12.01 | 4.5 |
| texto sobre heat-3 | foreground #1e1f19 | heat-3 #ecbfb0 | 9.99 | 4.5 |
| texto sobre heat-4 | foreground #1e1f19 | heat-4 #e2a08d | 7.62 | 4.5 |
| texto sobre heat-pos | foreground #1e1f19 | heat-pos #dfe8c8 | 13.05 | 4.5 |
| texto sobre bill-od-bg | foreground #1e1f19 | bill-od-bg #f8e3da | 13.43 | 4.5 |
| texto sobre bill-soon-bg | foreground #1e1f19 | bill-soon-bg #f8ead2 | 13.98 | 4.5 |
| texto secundario sobre conta vencida | muted-foreground #5c604a | bill-od-bg #f8e3da | 5.27 | 4.5 |
| texto secundario sobre conta em breve | muted-foreground #5c604a | bill-soon-bg #f8ead2 | 5.48 | 4.5 |
| inicial branca sobre Ele | action-text #fbf6ea | ele #4c513b | 7.64 | 4.5 |
| inicial sobre Ela | action-text #fbf6ea | ela #9a4a26 | 5.76 | 4.5 |
| marca ele sobre o cartao | ele #4c513b | card #fbf6ea | 7.64 | 3 |
| marca ela sobre o cartao | ela #9a4a26 | card #fbf6ea | 5.76 | 3 |
| marca dot-in sobre o cartao | dot-in #3f8a4a | card #fbf6ea | 3.94 | 3 |
| marca dot-out sobre o cartao | dot-out #c0392b | card #fbf6ea | 5.04 | 3 |
| marca dot-bill-pending sobre o cartao | dot-bill-pending #b3581a | card #fbf6ea | 4.50 | 3 |
| marca dot-bill-paid sobre o cartao | dot-bill-paid #6e7430 | card #fbf6ea | 4.63 | 3 |
| marca dot-pig sobre o cartao | dot-pig #b8467f | card #fbf6ea | 4.61 | 3 |
| marca dot-goal sobre o cartao | dot-goal #7a5cc0 | card #fbf6ea | 4.73 | 3 |
| marca chart-axis sobre o cartao | chart-axis #888b76 | card #fbf6ea | 3.24 | 3 |
| marca chart-1 sobre o cartao | chart-1 #4c513b | card #fbf6ea | 7.64 | 3 |
| marca chart-2 sobre o cartao | chart-2 #3f8a4a | card #fbf6ea | 3.94 | 3 |
| marca chart-3 sobre o cartao | chart-3 #a8650a | card #fbf6ea | 4.30 | 3 |
| marca chart-4 sobre o cartao | chart-4 #2d6f69 | card #fbf6ea | 5.43 | 3 |
| marca chart-5 sobre o cartao | chart-5 #6b4e7a | card #fbf6ea | 6.50 | 3 |
| marca chart-6 sobre o cartao | chart-6 #787b64 | card #fbf6ea | 4.04 | 3 |
| marca chart-7 sobre o cartao | chart-7 #6e7430 | card #fbf6ea | 4.63 | 3 |
| marca chart-8 sobre o cartao | chart-8 #9a4a26 | card #fbf6ea | 5.76 | 3 |

## O que ficou de fora

- **Areia pura e salvia pura como texto**: nao servem sobre o creme (2,24:1 e 2,98:1). Ficam como ancoras (`--color-sand`, `--color-sage`) e decoracao; a salvia exata so nos eixos dos graficos.
- **Tema escuro**: continua da Fase 5; o bloco `.dark` nao foi tocado.
- **Cores de categoria escolhidas pelo usuario** (`DEFAULT_EVENT_CATEGORY_COLORS`, cores de categoria): sao dado do usuario, nao tema.
- **Pontinhos e mapa de calor** sao medidos contra o cartao; sobre uma celula colorida do mapa de calor ganham o anel escuro de 1px ja existente, que nao entra na tabela.
- **Veladuras** (`bg-black/NN` na dobra do post-it e no escuro atras de Sheet e dialogo): sao sombra, nao cor de tema.

## Pendencias da Fase 4 (nao alteradas aqui)

O mascote Vintem (Fase 4) usa a cor de acao `#14532d` no UI-SPEC e nos sketches. A acao agora e o oliva `#4c513b`
(texto sobre ela `#fbf6ea`). Para a Fase 4 seguir a paleta, atualizar: o corpo do Vintem (UI-SPEC da Fase 4 e os
sketches do mascote) para `#4c513b`; olhos e detalhes escuros para `#1e1f19`; brilhos e fundo de bolha para `#fbf6ea`/`#f5ecdb`;
qualquer verde `#16a34a`/`#14532d` de moeda ou estado para `--brand` `#3f8a4a` (ok) e a ficha de contraste acima;
`.planning/sketches/themes/moeda.css` segue como historico (a nova referencia e `definitiva.css`).
