# Phase 7: Push e Vintém com IA - Context

**Gathered:** 2026-11-25
**Status:** Ready for planning

<domain>
## Phase Boundary

O usuário recebe avisos reais no celular (push via FCM, servidor Express, sem Cloud Functions) e o Vintém comenta os gastos com frases geradas por IA gratuita, sem o app depender dela. Requisitos: PUSH-01 a PUSH-05, IA-01 a IA-05. Os dois blocos são independentes e podem virar planos (ou fases) separados no planejamento.

</domain>

<decisions>
## Implementation Decisions

### Quando o Vintém usa IA
- **D-01:** O Vintém tenta a IA em **quase toda fala** (reações a lançamento, limite, fim de sync, abrir o app no dia), sempre com o banco de frases da Fase 4 como reserva imediata. A IA nunca bloqueia a fala.
- **D-02:** Como quase toda fala consome cota, o cache por situação (~24h, chave dono + mês + hash da situação, com percentuais em faixas de 5 pontos) e o freio global do provedor são obrigatórios, não opcionais.

### Teto da IA
- **D-03:** O dono pediu "sem limite". Decisão: **teto alto e invisível**, 100 falas por pessoa por dia, configurável no servidor (padrão 100). Ao bater o teto, ou quando a cota grátis do provedor acabar, o Vintém usa o banco de frases sem nenhum aviso ao usuário. Cumpre o IA-01 e protege o plano grátis (Cloudflare ~250 a 300 chamadas/dia no total).
- **D-04:** Espera máxima de 4 s por chamada; falha, timeout, 429 ou validação reprovada caem no próximo provedor e depois no banco de frases.

### O que o Vintém fala e como (IA)
- **D-11:** Assuntos, todos os quatro: o gasto que acabou de lançar (citando loja ou categoria), limites e ritmo do mês, **padrões e comparações** (frequência, "terceira vez no iFood esta semana", comparação com o mês passado) e entradas, metas e porquinho. O Vintém tem que **analisar tudo e entender padrões engraçados**, comentando e alfinetando.
- **D-12:** **Fala espontânea, sem gatilho**: mistura de três formas: (a) ao abrir o app, de 1 a 3 vezes por dia, no máximo uma por abertura e sem repetir o assunto no mesmo dia; (b) solta, espiando enquanto o usuário usa o app, de vez em quando; (c) notificação push espontânea, no máximo 1 por dia, respeitando os tipos e o silêncio que o usuário configurar. As frequências exatas ficam ajustáveis por configuração do servidor.
- **D-13:** **Personalidade: sem filtro de verdade.** Palavrão pesado, deboche, "toma no cu porque está fazendo merda", cobrar que melhore em tal e tal coisa, apelidos como "baleia", "tudo que for preciso". O dono pediu isso explicitamente, e o app é só do casal.
- **D-14:** **Travas mantidas** (única exceção ao sem filtro): xinga o **comportamento** e o gasto, nunca discrimina por raça, orientação, religião ou grupo; e **nunca fala de Ele para Ela nem de Ela para Ele**: cada pessoa só recebe fala sobre os próprios gastos e o que é do casal (Porquinho). A trava de aperto grave (tom sério quando houver sinal de dívida perigosa) **não** foi escolhida e não entra.
- **D-15:** **Tamanho varia por situação:** curta (1 frase, até ~140 caracteres) no dia a dia e na notificação; mais longa (até ~2 frases) em estouro de limite, resumo da semana e padrões notados.
- **D-16:** **O que a IA pode saber:** o dono quer acesso a "tudo". Entra um **resumo montado no servidor**: totais e valores exatos por categoria, frequência dos gastos, o que mais está gastando, tendência contra o mês passado, limites e % usado, entradas, metas, porquinho, contas fixas, fatura do cartão, e nomes de lojas. Continua proibido enviar CPF, número de conta ou cartão, e nome de pessoa (Pix para pessoa vira rótulo genérico como "uma pessoa"). Quem monta o resumo é o servidor, nunca o cliente. O dono aceitou que os provedores gratuitos possam guardar e treinar com o que recebem (PROJECT.md).

### Modelo e provedor
- **D-17:** **Grátis primeiro, trocar se recusar.** Ordem de partida: Cloudflare Workers AI e/ou Groq (a ordem e o modelo exato são decididos na pesquisa/implementação, relendo na data limites, modelos grátis e termos de dados, porque as fontes da pesquisa de 2026-11-25 divergem). Se o modelo se recusar a xingar, vier mansinho demais, falhar, estourar o limite ou demorar, cai no próximo provedor e depois no banco de frases. Grok só entra se algum crédito grátis for confirmado; pago não entra por padrão (PROJECT.md: rodar de graça).
- **D-18:** A pesquisa da fase deve incluir um **teste lado a lado** do mesmo resumo nos modelos candidatos, no tom sem filtro, para o dono escolher qual soa como o Vintém; e medir a taxa de recusa de palavrão por modelo.

### Texto e momento dos avisos
- **D-05:** O texto da notificação na tela de bloqueio usa o **tom sem filtro** (frase do Vintém com deboche), **sem valores e sem nomes de lojas**. O dono aceitou que quem olhar o celular leia o palavrão. As frases dos avisos vêm do banco de frases por tom (Fase 4), não da IA, para o texto de tela de bloqueio ser previsível e nunca ter dado financeiro.
- **D-06:** Padrão de partida: **sem horário de silêncio e os três tipos ligados** (80% do limite, estouro de 100% e fatura perto de vencer). O usuário escolhe os tipos e define o silêncio nas Configurações (PUSH-03).
- **D-07:** Cada evento gera uma única notificação, com marcador por categoria e mês que sobrevive a reinício do servidor (PUSH-04).

### Ativar avisos e estados
- **D-08:** O botão de ativar fica **só em Configurações** (cartão Notificações), sem convite na Home e sem tela na primeira abertura. O cartão mostra os cinco estados: não suportado, app não instalado, negado, ativo e inscrição perdida. No iPhone fora do app instalado, mostra o passo a passo de adicionar à tela de início (PUSH-01, PUSH-05).

### Privacidade da IA (já decidido antes, mantido)
- **D-09:** A IA recebe totais por categoria e nomes de lojas; nunca CPF, número de conta ou cartão, nem nome de pessoa (Pix para pessoa vira rótulo genérico). Saída validada (tamanho, texto simples, idioma) antes de aparecer.
- **D-10:** Provedor trocável por configuração do servidor (Cloudflare Workers AI padrão; Groq e Grok candidatos). A escolha final relê, na data, termos de uso de dados e limites, e registra os termos; nenhuma cota fixa no código.

### Decisões da rodada de planejamento (2026-11-25)
- **D-19:** O aviso push **pode citar o nome da categoria** (ex.: "Lazer passou do limite, porra"), nunca valores nem lojas nem nome de pessoa.
- **D-20:** **A descrição digitada nos lançamentos manuais também vai para a IA**, por escolha do dono. Isso afrouxa a recomendação de mandar só categoria e valor, e o servidor não detecta com certeza um nome de pessoa digitado livremente. Mitigação obrigatória: um removedor de nomes feito no servidor antes de montar o resumo (padrões como "Pix para ...", "para/de/com" seguidos de nome próprio, CPF, CNPJ, e-mail, telefone, números longos) trocando por rótulos genéricos ("uma pessoa"); o risco residual fica registrado e aceito pelo dono (o projeto já aceita que as camadas grátis guardem e treinem com o que recebem). CPF, contas e cartões continuam proibidos sem exceção.
- **D-21:** O **push espontâneo é um quarto tipo, ligado por padrão**, que o usuário pode desligar em Configurações. **O silêncio segura e entrega depois**: avisos de limite e fatura que caírem no silêncio esperam e chegam quando ele acabar; o push espontâneo só sai fora do silêncio. O interruptor legado "Avisos de vencimento" vira o tipo `fatura`.
- **D-22:** A régua de ofensas da validação da saída da IA é **própria desta fase**: a régua da Fase 4 proíbe o que a D-13 permite. Bloqueia só ofensa discriminatória (raça, orientação, religião, grupo); palavrão, deboche e apelidos como "baleia" passam.
- **D-23:** Previsão de passos humanos do dono (checkpoints): chave VAPID e API de registros do FCM no Firebase, chaves dos provedores de IA no Railway, rodar o `ai-compare.js` com as próprias chaves e escolher o modelo, e testar no iPhone real. O planejador deve prever um checkpoint humano antes de fixar o modelo padrão.
- **D-24 (2026-11-25, dono):** A IA lê sempre os eventos do calendário (da pessoa e do casal), as anotações (post-its) e o que aconteceu nos últimos dias. Título, local, detalhe e texto passam pelo removedor de nomes; anotação que fala de senha ou chave não sai. Risco aceito: nome no começo da frase ou em minúsculas pode passar, e o serviço grátis pode guardar e treinar com o que recebe.
- **D-25 (2026-11-25, dono, A FAZER):** As notificações têm de falar com o MESMO humor da fala no app (ácido, escrachado, bravo, palavrão, internet, risada estranha, duplo sentido, alternando). Hoje o texto vem de `shared/core/vintemPhrasesPush.js` (D-05). Proposta a confirmar: reescrever esse banco no novo humor, sem trocar por IA, mantendo sem valores nem lojas na tela de bloqueio (D-05, D-19).
- **D-26 (2026-11-25, dono, A FAZER):** As notificações têm um padrão de gatilhos: conta fixa no dia do vencimento (dia limite), limite perto de estourar, compromisso do calendário chegando e coisas do tipo. Limite 80/100 e fatura já existem; **conta fixa e compromisso não existem como aviso** e precisam de plano. A guarda estática `fixed-expense-manual.test.js` (D-02) hoje só deixa o servidor ler contas fixas em `snapshot.js`, e o aviso de conta fixa vai exigir uma exceção só de leitura. Decidir antes: antecedência (véspera e no dia?), horário, e se o título do compromisso pode aparecer na tela de bloqueio.

### Claude's Discretion
- Algoritmo de ordem de tentativa entre provedores, formato exato do prompt, faixa de tamanho da frase e validação de idioma.
- Estrutura das coleções de inscrições push e dos marcadores de evento; texto exato do passo a passo do iPhone.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Produto e restrições
- `.planning/PROJECT.md` — privacidade (agregados e lojas à IA), custo zero, mobile/PWA
- `.planning/REQUIREMENTS.md` — PUSH-01..05, IA-01..05
- `.planning/ROADMAP.md` — Phase 7, critérios de sucesso e notas de execução

### Tom e banco de frases
- `.planning/phases/04-mascote-vint-m/04-CONTEXT.md` — D-10/D-10b (tom sem filtro único do casal), D-12 (banco de frases), D-06b (faixas de uso do limite)

### Stack de push e IA
- `.claude/CLAUDE.md` (seções Feature 1b e Feature 3) — FCM com `register()`/`onRegistered()` e `fid`, `src/sw.ts` único, notificações visíveis, gatilho por `POST /api/limits/check`, adaptador `fetch` de LLM, cache em Firestore, cartão de crédito da Fase 6 para o aviso de fatura

### Cartão (aviso de fatura)
- `.planning/phases/06-cart-o-de-cr-dito/06-CONTEXT.md` — fatura, vencimento e fechamento usados pelo aviso

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/sw.ts`: service worker único (injectManifest) onde entra o tratamento de push.
- `src/contexts/VintemContext.tsx`, `src/services/vintemInsights.service.ts`, `src/hooks/useVintemInsights.ts`: reações e banco de frases já existentes; ponto de entrada da fala por IA.
- `src/components/vintem/VintemToast.tsx` e `VintemSay.tsx`: onde a fala (inclusive a gerada) aparece.
- `server/src/app.js`, `auth.js`, `sync.js`, `card-sync.js`: Express com ID token; sync é o gatilho do aviso de limite e de fatura.

### Established Patterns
- Servidor deriva `ownerId` do token verificado, nunca do corpo.
- Núcleo puro em `shared/core` testado em dois fusos.
- Chaves de IA e push só no servidor.

### Integration Points
- Configurações > Notificações (novo cartão); cadastro de inscrição `pushRegistrations/{fid}`; rota de checagem de limites; rota de fala da IA com cache e contador diário.

</code_context>

<specifics>
## Specific Ideas

- "Quase toda fala" pela IA: o dono quer o Vintém imprevisível e variado.
- Notificação com deboche também na tela de bloqueio, sem dados.

</specifics>

<deferred>
## Deferred Ideas

- **Distinção melhor de configurações por perfil** (tom, avisos, o que cada pessoa vê): o dono quer tratar em uma fase própria. Hoje o tom é um só do casal (Fase 4, D-10b) e os avisos são por usuário.
- Trava de tom sério para aperto financeiro grave: não escolhida agora; pode voltar na fase de configurações por perfil.
- Convite do Vintém na Home para ativar avisos, e tela de convite na primeira abertura: descartados por ora (decisão D-08).

</deferred>

---

*Phase: 07-push-e-vint-m-com-ia*
*Context gathered: 2026-11-25*
