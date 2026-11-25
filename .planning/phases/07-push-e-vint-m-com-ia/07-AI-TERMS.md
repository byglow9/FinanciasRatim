# Fase 7: registro dos termos de dados e limites dos provedores de IA

**Data da pesquisa:** 2026-11-25
**Validade:** curta. Modelos grátis, cotas, preços e termos mudam sem aviso; releia as páginas na data da escolha e a cada troca de provedor ou de modelo.
**Requisitos:** IA-05, D-10, D-17 e D-18.

Os trechos abaixo foram copiados da pesquisa da fase (07-RESEARCH.md). As páginas foram lidas por um resumidor, então os trechos entre aspas ainda precisam ser conferidos na página crua (é o que a seção "Releitura na data da escolha" pede).

## O que sai do servidor

Só o resumo do mês montado no servidor: totais e valores por categoria, limites, nomes de lojas, descrição digitada em lançamento manual (passada pelo removedor de nomes, D-20), metas, Porquinho, contas fixas e fatura. Nunca CPF, número de conta ou cartão, nem nome de pessoa. O risco residual de um nome digitado escapar do removedor está aceito pelo dono (D-20).

## Termos de uso de dados

### Cloudflare Workers AI

| Tema | O que a página oficial diz | Fonte | Confiança | Lido em |
|------|----------------------------|-------|-----------|---------|
| Treino | "Cloudflare does not use Customer Content processed by Workers AI to train AI models." | developers.cloudflare.com/workers-ai/platform/data-usage/ | MEDIUM | 2026-11-25 |
| Retenção | "Cloudflare does not retain inputs or outputs after they are no longer needed to process the request." Fica metadado de operação (modelo, tempo, contagem de tokens, latência) sem conteúdo. Conteúdo só é guardado se o cliente ligar logging ou cache do AI Gateway (não usar). | developers.cloudflare.com/workers-ai/platform/data-usage/ | MEDIUM | 2026-11-25 |
| Região | A pesquisa não registrou garantia de região de processamento. | developers.cloudflare.com/workers-ai/platform/data-usage/ | LOW (desconhecido) | 2026-11-25 |

### Groq

| Tema | O que a página oficial diz | Fonte | Confiança | Lido em |
|------|----------------------------|-------|-----------|---------|
| Treino | A página de dados **não responde se treina** com o que recebe. A política de privacidade exclui "Customer Data" e remete a contrato e DPA, que não foram lidos. | console.groq.com/docs/your-data e groq.com/privacy-policy | LOW (desconhecido) | 2026-11-25 |
| Retenção | "By default, Groq does not retain customer data for inference requests." Logs temporários de entrada e saída por até 30 dias para confiabilidade e abuso, com opção de retenção zero e controle em Data Controls. | console.groq.com/docs/your-data | MEDIUM | 2026-11-25 |
| Região | Dados em buckets do Google Cloud nos Estados Unidos. | console.groq.com/docs/your-data | MEDIUM | 2026-11-25 |

### xAI (Grok)

| Tema | O que a página oficial diz | Fonte | Confiança | Lido em |
|------|----------------------------|-------|-----------|---------|
| Treino | "never trains on your API inputs or outputs without your explicit permission" (a página escreve o nome da empresa como "SpaceXSI"). | docs.x.ai/developers/faq/security.md | MEDIUM | 2026-11-25 |
| Retenção | Retenção padrão de 30 dias para auditoria de abuso; retenção zero opcional. | docs.x.ai/developers/faq/security.md | MEDIUM | 2026-11-25 |
| Região | Sem garantia de região. | docs.x.ai/developers/faq/security.md | MEDIUM | 2026-11-25 |

## Limites e custo conhecidos

| Provedor | Limite | Fonte | Confiança | Lido em |
|----------|--------|-------|-----------|---------|
| Cloudflare Workers AI | Cota grátis de 10.000 Neurons por dia, com reinício às 00:00 UTC (21:00 em São Paulo); acima disso, no plano grátis, as chamadas falham com erro. Geração de texto: 300 requisições por minuto. Alguns modelos exigem o plano pago (erro 403, código 5035). | developers.cloudflare.com/workers-ai/platform/pricing/ e /limits/ | MEDIUM | 2026-11-25 |
| Groq | Os limites do plano grátis **não aparecem na página pública** (ela mostra só o plano Developer): só em console.groq.com/settings/limits, na conta do dono. Números de blogs divergem e não foram usados. | console.groq.com/docs/rate-limits | LOW (números desconhecidos) | 2026-11-25 |
| xAI | **Nenhum crédito grátis confirmado** nas páginas oficiais de cobrança, preços e limites. Fica **fora por padrão** (D-17): só entra se o dono confirmar crédito grátis no console dele. | docs.x.ai/docs/models | MEDIUM | 2026-11-25 |

A estimativa de chamadas por dia dentro da cota do Cloudflare vem do teste lado a lado (a tabela de preços em Neurons, com a data, fica só em `server/scripts/ai-compare.js`).

## Aceitação do dono e o que fica de fora

- Já registrado em PROJECT.md: as camadas grátis podem guardar e treinar com o que recebem, e o dono aceitou isso. As três páginas acima são mais favoráveis que esse pior caso, salvo o treino do Groq, que é desconhecido e está coberto pela aceitação.
- O **Gemini grátis está fora**: o Google usa o conteúdo do plano grátis para melhorar produtos (fora de EEE, Suíça e Reino Unido).
- Nenhum modelo, preço ou cota fica fixo no código do servidor: tudo vem das variáveis `AI_*` (D-10). A guarda é `test/static/phase7-terms.test.js`.

---

As quatro seções abaixo são preenchidas no checkpoint humano do plano 07-17. Nunca registrar aqui chave, token, id de conta nem trecho de tela do console que os mostre.

## Releitura na data da escolha

| Provedor | Data da releitura | Conclusão (igual ou o que mudou) |
|----------|-------------------|----------------------------------|
| Cloudflare Workers AI | pendente | pendente |
| Groq | pendente | pendente |
| xAI | pendente (só se for usar) | pendente |

## Teste lado a lado

- Arquivos gerados: pendente
- Taxa de recusa e de fala mansa do modelo escolhido: pendente
- O que o dono concluiu (qual soa como o OINC, quem recusou, quem veio manso): pendente

## Calibragem do prazo do cliente

O app espera a IA nas reações a lançamento e a limite por `AI_REACTION_TIMEOUT_MS` (padrão 2500 ms, aceito de 1500 a 4000 ms; valor fora da faixa volta ao padrão). O relatório do teste traz o prazo recomendado: o p95 arredondado para cima em 250 ms, dentro dessa faixa. Nenhum código muda, só a variável no Railway.

Atenção: a latência do teste é a da chamada ao provedor, medida da máquina do dono e com resumos sintéticos, que são menores que os de um mês cheio. No app ainda entram o trajeto até o Railway e a leitura dos dados, então vale conferir no uso real se muitas reações caem no banco de frases.

| Item | Valor |
|------|-------|
| Modelo medido (primeiro da ordem) | pendente |
| Latência p50 | pendente |
| Latência p95 | pendente |
| `AI_REACTION_TIMEOUT_MS` definido | pendente |
| Data | pendente |

## Decisão do dono

| Item | Valor |
|------|-------|
| `AI_PROVIDERS` (ordem) | pendente |
| `AI_CF_MODEL` | pendente |
| `AI_GROQ_MODEL` | pendente |
| `AI_XAI_MODEL` | pendente (só se for usar) |
| `AI_REQUIRE_PROFANITY` | pendente |
| Data | pendente |
