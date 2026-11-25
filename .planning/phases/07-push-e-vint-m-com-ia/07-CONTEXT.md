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

### Texto e momento dos avisos
- **D-05:** O texto da notificação na tela de bloqueio usa o **tom sem filtro** (frase do Vintém com deboche), **sem valores e sem nomes de lojas**. O dono aceitou que quem olhar o celular leia o palavrão. As frases dos avisos vêm do banco de frases por tom (Fase 4), não da IA, para o texto de tela de bloqueio ser previsível e nunca ter dado financeiro.
- **D-06:** Padrão de partida: **sem horário de silêncio e os três tipos ligados** (80% do limite, estouro de 100% e fatura perto de vencer). O usuário escolhe os tipos e define o silêncio nas Configurações (PUSH-03).
- **D-07:** Cada evento gera uma única notificação, com marcador por categoria e mês que sobrevive a reinício do servidor (PUSH-04).

### Ativar avisos e estados
- **D-08:** O botão de ativar fica **só em Configurações** (cartão Notificações), sem convite na Home e sem tela na primeira abertura. O cartão mostra os cinco estados: não suportado, app não instalado, negado, ativo e inscrição perdida. No iPhone fora do app instalado, mostra o passo a passo de adicionar à tela de início (PUSH-01, PUSH-05).

### Privacidade da IA (já decidido antes, mantido)
- **D-09:** A IA recebe totais por categoria e nomes de lojas; nunca CPF, número de conta ou cartão, nem nome de pessoa (Pix para pessoa vira rótulo genérico). Saída validada (tamanho, texto simples, idioma) antes de aparecer.
- **D-10:** Provedor trocável por configuração do servidor (Cloudflare Workers AI padrão; Groq e Grok candidatos). A escolha final relê, na data, termos de uso de dados e limites, e registra os termos; nenhuma cota fixa no código.

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

- Convite do Vintém na Home para ativar avisos, e tela de convite na primeira abertura: descartados por ora (decisão D-08).

</deferred>

---

*Phase: 07-push-e-vint-m-com-ia*
*Context gathered: 2026-11-25*
