# Phase 2: Revisão de importações, contas fixas e webhook - Context

**Gathered:** 2026-11-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Fase **reduzida pelo dono** (2026-11-17). Entrega apenas: (a) dados do banco chegando na hora por **webhook** da Pluggy, com o polling como reserva (REV-06); (b) o usuário vê **quando foi a última atualização** do banco e se o **consentimento** está vencido ou prestes a vencer, com ação para reconectar (REV-07); (c) marcar conta fixa como paga continua **manual e nunca cria lançamento** (REV-03, já é assim hoje; só não pode regredir). Mais a trilha paralela do teste somente leitura do cartão.

**Fora do escopo por decisão do dono:** tela/fila de revisão de importações (REV-01, REV-02), vínculo de pagamento importado com conta fixa (REV-04) e tratamento de estorno como crédito (REV-05).

</domain>

<decisions>
## Implementation Decisions

### Escopo (decisão do dono)
- **D-01:** Não haverá tela de revisão de importações nem ações de importar/ignorar/vincular. Resposta do dono: "nao vai ter nada duplicado ué, n precisa desse negocio de revisao". — **Reversibility:** reversible — a tela pode ser feita numa fase futura sem migração; os registros em `bankImports` continuam guardando `status` e `reason`.
- **D-02:** Não haverá vínculo entre lançamento importado e conta fixa. Marcar a fixa como paga é sempre manual, em Contas fixas, "serve pra melhor controle dele". Isso é REV-03 e já é o comportamento atual: não pode criar lançamento nem regredir.
- **D-03:** Estorno não tem tratamento especial nesta fase (o dono não reconhece o tema). Nenhuma mudança de comportamento; o que `classify` faz hoje permanece.
- **D-04:** Os itens que hoje estão em `review` não serão resolvidos por esta fase. O dono vai apagar as transações e recomeçar do zero quando for usar de verdade ("nao se importe com transações duplicadas e coisas assim").
- **D-05:** Sem tela de revisão, a lógica de classificação existente em `shared/core/classify.js` (duplicado, transferência própria, pagamento de fatura) fica **inalterada**: itens que ela manda para `review` continuam sendo gravados em `bankImports` com `status: 'review'` e **não viram lançamento**. Nenhum código novo para eles. Sem mensagem "N para revisar" que leve a lugar nenhum: o texto em `BankConnections.tsx` pode deixar de contar/mostrar "para revisar".

### Webhook e atualização do banco (REV-06)
- **D-06:** Webhooks da Pluggy (`item/updated`, `transactions/created`, `transactions/updated`, `transactions/deleted`), autenticados por cabeçalho secreto, sincronizam na hora; evento reenviado não duplica nada; o polling atual continua sempre ativo como reserva.
- **D-07:** Precisa de teste real no MeuPluggy para saber se os eventos chegam; se não chegarem, o polling segue como único caminho e isso é registrado, sem bloquear a fase.

### Última atualização e consentimento (REV-07)
- **D-08:** O app mostra "atualizado há X" e o estado do consentimento (vencido ou perto de vencer, com ação para reconectar). Detalhes de onde mostrar ficam com o planejador.

### Claude's Discretion
- Nome do cabeçalho secreto, rota do webhook, formato de idempotência e como guardar o segredo (variável de ambiente no Railway).
- Onde exatamente aparece "última atualização"/consentimento (provavelmente Configurações > Bancos e um indicador discreto na Home).
- Limiar de "prestes a vencer" (sugestão: 30 dias) e texto do aviso.
- Como conduzir o teste somente leitura do cartão (sem dados sensíveis em log; limite de cerca de 4 consultas por mês por CPF por banco).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planejamento
- `.planning/ROADMAP.md` — Fase 2 (escopo reduzido; trilha paralela do cartão)
- `.planning/REQUIREMENTS.md` — REV-03, REV-06, REV-07 (REV-01, 02, 04, 05 descartados em 2026-11-17)
- `.planning/PROJECT.md` — seções "Webhook da Pluggy" e "Cartão de crédito"
- `.planning/phases/01-funda-o-de-dados-e-acesso/01-CONTEXT.md` — decisões da Fase 1 (token do Firebase no servidor, `ownerId`, `createApp`)

### Código
- `server/src/app.js`, `server/src/auth.js` — fábrica `createApp` e autenticação por token; o webhook precisa de rota própria autenticada por cabeçalho secreto, fora do token do Firebase
- `server/src/sync.js` — `syncAll`, `bankImports`, polling
- `shared/core/classify.js` — classificação e `findDuplicate` (não mudar)
- `src/components/settings/BankConnections.tsx`, `src/services/bank.service.ts` — tela de bancos e cliente do servidor
- `src/services/fixedExpenses.service.ts` — pagamento manual de fixas

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/src/sync.js` `syncAll`: já sincroniza por dono (`hid`) e serializa execuções; o webhook deve chamá-lo para o item afetado.
- `server/src/app.js` `createApp(deps)`: injeção de dependências facilita testar a rota do webhook.
- `BankConnections.tsx`: lugar natural para "última atualização" e consentimento.

### Established Patterns
- Testes do servidor com `node:test`; emulador para integração (`server/test/emu`).
- Escopo de dono sempre via `ownerId`/`hid`; o webhook não traz token do usuário, então precisa mapear `itemId` → dono pela coleção `bankConnections`.

### Integration Points
- Railway já roda o servidor novo (https://financiasratim-production.up.railway.app); o webhook usa essa URL pública HTTPS.

</code_context>

<specifics>
## Specific Ideas

O dono vai apagar as transações e começar do zero quando usar de verdade; não há migração de itens em revisão.

</specifics>

<deferred>
## Deferred Ideas

- Tela de revisão de importações (REV-01, REV-02) — descartada por ora; reavaliar se aparecerem duplicados reais no uso.
- Vínculo de pagamento importado com conta fixa (REV-04) — descartado; pagamento fica manual.
- Estorno como crédito na categoria (REV-05) — descartado; o dono não reconhece o tema.

</deferred>

---

*Phase: 2-Revisão de importações, contas fixas e webhook*
*Context gathered: 2026-11-17*
