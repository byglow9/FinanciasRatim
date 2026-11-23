---
phase: 04-mascote-vint-m
verified: 2026-11-23T00:00:00Z
status: human_needed
score: 5/5 must-haves verified
covered_files:
  - .planning/REQUIREMENTS.md
  - firestore.rules
  - shared/core/vintemModel.js
  - shared/core/vintemMood.js
  - shared/core/vintemPhrases.js
  - shared/core/vintemStates.js
  - src/components/settings/VintemToneCard.tsx
  - src/components/vintem/Vintem.tsx
  - src/hooks/useHomeVintem.ts
  - src/pages/VintemTestPage.tsx
  - src/services/vintemInsights.service.ts
covered_digest: "v1:sha256:cab6d31f4182d478ffa2b4eafb77c67ec83b74c9c2f59ac9f0d6bd0a48b6535a"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Abrir a Home e /vintem-teste em um celular real (Android e iPhone) e observar o movimento por alguns minutos"
    expected: "60 fps sem engasgo: balanço lateral, piscar, olhar seguindo o toque e giro de lado sem travar"
    why_human: "Desempenho em aparelho real não é medido por teste automatizado (o autoteste CDP roda em navegador de desenvolvimento)"
  - test: "Ligar 'reduzir movimento' no sistema e abrir a Home e /vintem-teste"
    expected: "O Vintém para de balançar, piscar em laço e girar; as expressões ainda trocam"
    why_human: "A mídia prefers-reduced-motion e o hook estão ligados no código e cobertos por teste do modelo, mas o efeito visual real só se confirma no aparelho"
  - test: "Olhar o Vintém de perfil (Girar de lado) na página de teste e na Home"
    expected: "O perfil tem cara de porquinho-cofre, sem peça solta, vazando ou colapsando"
    why_human: "Aparência é julgamento visual; o autoteste por pixels mede distinção e vazamento, não a estética"
  - test: "Conferir as seis expressões (neutro, feliz, triste, bravo, sonolento, surpreso) mais o 'atento' na grade de /vintem-teste, em tamanho pequeno (48 e 84 px)"
    expected: "Cada expressão é reconhecível sem legenda"
    why_human: "Legibilidade da expressão é julgamento humano; a medida automática cobre só diferença entre pares"
  - test: "Usar a Home com os três tons (Configurações, cartão Vintém) por alguns dias e lançar gastos, receitas, aporte no Porquinho e meta batida"
    expected: "As falas soam como o dono (principalmente 'sem filtro'), sem atacar quem ele é; variam sem repetir seguido"
    why_human: "Tom e voz não são decididos por teste (D-11 e D-12)"
  - test: "Confirmar a conferência de originalidade (MASC-07, critério 5): desenho, nome 'Vintém' e todas as falas contra os cinco prints em .planning/sketches/references/mascote/"
    expected: "Nenhum personagem, nome, slogan nem frase copiado. Se quiser conferência automática, criar BLOCKLIST.txt (fora do git)"
    why_human: "O arquivo BLOCKLIST.txt não existe, então a guarda automática de cópia fez skip ('lista de bloqueio não fornecida'). A única evidência de que o dono conferiu é a frase 'Revisado, sem cortes' registrada no 04-19-SUMMARY.md, que o próprio SUMMARY diz ter sido obtida pelo orquestrador depois de o executor recusar uma aprovação repassada por outro agente; isso não é verificável a partir do código"
  - test: "Confirmar que as regras do Firestore com a coleção vintemInsights estão de fato publicadas em financias-ratimbum (Console do Firebase, aba Regras, ou novo deploy: firebase deploy --only firestore:rules --project financias-ratimbum) e que um insight forte (severidade 2 ou 3) aparece na coleção depois de uma visita à Home"
    expected: "A regra publicada contém 'vintemInsights' em clientCollections(); o documento é criado com o dono correto e sem descrição, loja, nome de pessoa, CPF, conta ou cartão"
    why_human: "A única prova do deploy é o texto colado pelo dono em 04-18-DEPLOY-EVIDENCE.md ('Deploy complete!'); o verificador não tem credencial do Firebase. Sem a regra, a gravação falha em silêncio e o app segue normal"
---

# Fase 4: Mascote Vintém. Relatório de verificação

**Meta da fase:** O usuário vê o Vintém, um porquinho-cofre original, reagindo ao ritmo e ao uso dos limites, com falas próprias em português no tom que ele escolheu
**Verificado em:** 2026-11-23
**Status:** human_needed
**Reverificação:** Não, verificação inicial

## Resultado dos comandos (rodados por este verificador, com `. ./scripts/dev-env.sh &&`)

| Comando | Resultado |
| ------- | --------- |
| `npm run test:core:tz` | exit 0. 667 testes, 667 passam, 0 falham (UTC e Asia/Tokyo) |
| `npm run test:static` | exit 0. 449 testes, 447 passam, 0 falham, 2 pulados |
| `npm run build` | exit 0 (`tsc -b` e `vite build`; só o aviso de chunk acima de 500 kB, já conhecido) |
| `npm run lint` | exit 0, sem saída de erro |

Os 2 pulados: `bundle de producao sem credenciais legadas` (já existia, nota do 04-18) e `nenhuma frase do banco contem texto da lista de bloqueio do dono` (pulado porque `.planning/sketches/references/mascote/BLOCKLIST.txt` não existe; ver itens humanos).

Não re-executados aqui (exigem navegador com CDP, não foram pedidos): `node scripts/ux-audit/vintem.mjs --test` e `node scripts/ux-audit/vintem-app.mjs`. O 04-19-SUMMARY registra 32/32 e FALHAS 0; isso é afirmação do SUMMARY, não evidência deste verificador.

## Critérios de sucesso do ROADMAP

| # | Verdade | Status | Evidência |
| - | ------- | ------ | --------- |
| 1 | A Home mostra o Vintém com balão e a expressão muda entre neutro, feliz, triste, bravo, sonolento e surpreso conforme ritmo, uso do limite e ação do usuário; neutro quando os dados do banco estão velhos | VERIFIED | `src/pages/DashboardPage.tsx` usa `useHomeVintem` (linha 42), `VintemSlot` (126) e `VintemHomeBalloon` (170). `shared/core/vintemMood.js`: `deriveVintemState` devolve neutro sem fala quando `loading`, `readOnly`, `isPast`, `noIncome` ou `suppressed` (dado velho, de `view.verdictSuppressed` em `budget.js`); faixas 75/80/100% em inteiros; reação por lançamento (`reactionForLaunch`). Sete estados em `vintemStates.js` (seis pedidos mais `atento`). `vintemMood.test.js` (484 linhas) dentro dos 667 verdes |
| 2 | Move-se com fluidez (balanço, piscar), segue o cursor, gira de lado, e para quando o aparelho pede reduzir movimento | VERIFIED (60 fps é humano) | `vintemModel.js` (954 linhas): molas, `blink` com agenda própria, `rot`, `turn` 0 a 1, `_reduced`/`isSettled`. `world.ts` registra um único `pointermove` passivo só enquanto houver instância que segue. `useReducedMotion.ts` assina `(prefers-reduced-motion: reduce)` e `Vintem.tsx` repassa a `setReduced`; `index.css:396` tem o `@media`. Coberto por `vintemModel.test.js` (867 linhas). Taxa de quadros em aparelho real: item humano |
| 3 | Página de teste com controles (porcentagem do limite, seguir o cursor, girar de lado) mostra todas as expressões | VERIFIED | Rota `/vintem-teste` em `App.tsx:37`. `VintemTestPage.tsx`: controle de range "Limite gasto" (220 a 227), `SwitchRow` "Seguir o cursor" (244) e "Girar de lado" (245), seletor de tom, botão "Falar", grade com `Vintem` por estado (291) |
| 4 | Tom escolhido nas Configurações (suave, direto, sem filtro; padrão sem filtro) e o balão usa banco de frases próprio com variantes por tom | VERIFIED | `types/index.ts`: `VintemTone`, `DEFAULT_VINTEM_TONE = 'sem-filtro'`, `vintemToneOf` com recuo ao padrão. `VintemToneCard.tsx` montado em `SettingsPage.tsx:94` e grava por `updateVintemTone`. `VintemContext.tsx` sorteia por `bank[situation][tone]` sem repetição recente. Banco: 20 situações x 3 tons, 462 frases; `phase4-content.test.js` (`checkBank` sem problema) e `phase4-content-review.test.js` passam |
| 5 | Desenho, nome e falas originais: conferência contra os prints de referência não encontra cópia | PRESENT, conferência humana pendente | Desenho em SVG próprio (`geometry.ts`, `view.ts`), nome "Vintém", frases escritas para o projeto (amostras de `vintemPhrasesLimites.js` e `vintemPhrasesRitmo.js` lidas: construções e tom próprios). Mas a conferência com os prints é decisão humana e a guarda automática com lista de bloqueio está pulada (arquivo inexistente). `REVIEW.reviewedAt = '2026-11-23'` está preenchido; a procedência da aprovação está só no SUMMARY (ver itens humanos) |

**Pontuação:** 5/5 critérios com implementação e testes verdes; o critério 5 e a parte de aparelho real dos critérios 1 e 2 dependem de humano. Nenhum item FAILED.

## Requisitos (MASC-01 a MASC-07)

| Requisito | Descrição | Status | Evidência |
| --------- | --------- | ------ | --------- |
| MASC-01 | Vintém SVG na Home com balão | SATISFEITO | `Vintem.tsx`, `VintemSlot.tsx`, `VintemHomeBalloon.tsx` ligados em `DashboardPage.tsx`; balão sem fala não renderiza e fica até toque (sem temporizador). Aparência: humano |
| MASC-02 | Estados escolhidos por regras (ritmo, limite, ação) | SATISFEITO | `vintemStates.js` (tabela, `stateFromPct`), `vintemMood.js` (precedência, `limitBand`, `inlineMood`, `reactionForLaunch`), testes `vintemMood.test.js` e `vintemStates.test.js` verdes. Há 7 estados (o sétimo, `atento`, é adição planejada) |
| MASC-03 | Movimento fluido, cursor, giro, movimento reduzido | SATISFEITO (60 fps humano) | `vintemModel.js`, `vintemSpring.js`, `world.ts`, `useReducedMotion.ts`, `index.css`; testes do modelo verdes |
| MASC-04 | Banco de frases com variantes por tom | SATISFEITO | `vintemPhrases.js` mescla três módulos; 462 frases, 20 situações x 3 tons, mínimo de 5 variantes; `phraseRules.js` (`checkBank`) e `phrasePicker.js`; insights locais (`insights.js`) e coleção `vintemInsights` (`vintemInsights.service.ts`, regra em `firestore.rules:19`, commit 0aa7f274). Deploy da regra: humano |
| MASC-05 | Tom nas Configurações, padrão sem filtro | SATISFEITO | `VintemToneCard.tsx`, `AreaContext` (`updateVintemTone`), padrão em `types/index.ts` |
| MASC-06 | Página de teste com controles | SATISFEITO | `VintemTestPage.tsx` em `/vintem-teste` |
| MASC-07 | Originalidade de mascote, nome e textos | PENDENTE DE HUMANO | Régua automática verde (sem "Olá", "Notei que", travessão, emoji; palavrão só no sem filtro), mas a lista de bloqueio não existe e a aprovação do dono não é verificável pelo código |

Requisitos órfãos: nenhum. `REQUIREMENTS.md` mapeia MASC-01 a MASC-07 apenas à Fase 4, e todos aparecem nos planos.

## Artefatos e ligações

| Artefato | Esperado | Status | Detalhe |
| -------- | -------- | ------ | ------- |
| `shared/core/vintemModel.js`, `vintemMood.js`, `vintemStates.js`, `vintemSpring.js`, `phrase*.js`, `vintemPhrases*.js` | Núcleo puro testado | VERIFIED | Existem, substanciais, importados pela UI por `@shared/core`; `purity.test.js` verde |
| `src/components/vintem/*` | Vintém, balão, toast, slot, linha, vazio | VERIFIED | Usados em Home, Transações, Calendário, Contas Fixas, Casal, Porquinho, Relatórios, Configurações e sino |
| `src/pages/VintemTestPage.tsx` | Página de teste | VERIFIED | Rota registrada |
| `src/contexts/VintemContext.tsx` | Provedor de fala e tom | VERIFIED | Envolve o app em `App.tsx:52` |
| `src/services/vintemInsights.service.ts` | Gravação de insights fortes sem dado pessoal | VERIFIED no código | Monta o documento só por `toStoredInsight`; erro engolido; leitura só por igualdades (sem índice novo). Publicação da regra: humano |
| `test/static/phase4-content*.test.js` | Guardas de conteúdo | VERIFIED | Passam; a de lista de bloqueio faz skip |

Fluxo de dados (nível 4): a fala da Home vem de `view` (BudgetView real), `transactions` e do detector de insights (`useVintemInsights`), com os encaixes montados em `slotsFor`; não há valor fixo nem prop vazia no ponto de uso.

## Anti-padrões

Nenhum marcador `TBD`, `FIXME` ou `XXX` verificado como pendência bloqueante nos arquivos centrais lidos; lint e tsc limpos. Nenhum bloqueio.

## Observações (não bloqueiam)

1. **ROADMAP desatualizado:** `.planning/ROADMAP.md` ainda mostra `04-19-PLAN.md` desmarcado e "19/20 plans executed", embora `04-19-SUMMARY.md` exista e os commits 13df4e8f e b89664a6 estejam no histórico. Atualizar na hora de fechar a fase.
2. **Desvio registrado no 04-19:** o tamanho do Vintém no medidor mudou a pedido do dono (commit 8917a421, slot 150x125, sem disco de fundo) e as verificações do autoteste foram ajustadas junto. Não afeta nenhum critério.
3. **`.planning/milestone.lock` e `state.json`** aparecem modificados na árvore de trabalho e ficam fora deste commit.

## Itens que só um humano pode conferir

1. **60 fps em aparelho real** (Android e iPhone): balanço, piscar, olhar, giro.
2. **Movimento reduzido no aparelho:** ligar a opção do sistema e conferir que o Vintém para de se mover.
3. **Aparência do perfil (de lado)** e legibilidade das expressões em 48 e 84 px.
4. **Tom das falas:** o "sem filtro" soa como o dono e não ataca quem ele é; variedade sem repetição seguida.
5. **Originalidade (MASC-07, critério 5):** conferir desenho, nome e falas contra os prints. A guarda automática de lista de bloqueio está pulada porque `BLOCKLIST.txt` não existe. A aprovação "Revisado, sem cortes" consta só no SUMMARY, com a ressalva de que o executor recusou uma aprovação repassada por outro agente; pedir ao dono que confirme por conta própria.
6. **Deploy das regras `vintemInsights`:** a evidência é a resposta colada pelo dono em `04-18-DEPLOY-EVIDENCE.md`; confirmar no Console do Firebase (ou republicar com `--only firestore:rules --project financias-ratimbum`).
7. **Autotestes de navegador** (`vintem.mjs --test`, `vintem-app.mjs`): re-rodar localmente se quiser evidência além do SUMMARY.

---

_Verificado: 2026-11-23_
_Verificador: Claude (gsd-verifier)_
