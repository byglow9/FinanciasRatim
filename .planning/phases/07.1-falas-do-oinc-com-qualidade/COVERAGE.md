# API Coverage — Groq e Cloudflare Workers AI (chat completions)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.

| capability | decision | reason |
|---|---|---|
| Groq: chat completions (formato OpenAI) | INTEGRATE | |
| Groq: listagem de modelos | INTEGRATE | |
| Groq: parâmetro reasoning_effort | INTEGRATE | |
| Groq: cabeçalho retry-after e erro 429 | INTEGRATE | |
| Groq: streaming da resposta | OPT-OUT | fala de uma tirada, resposta única; nada para mostrar em pedaços |
| Groq: tool use e function calling | OPT-OUT | o código escolhe o fato (D-09); o modelo não chama nada |
| Groq: JSON mode e saída estruturada | OPT-OUT | a saída é texto simples, conferido pela régua própria |
| Groq: modelos compostos e busca na web | OPT-OUT | dado do casal não pode ir a ferramenta externa |
| Groq: prompt caching | OPT-OUT | prompt curto e poucos pedidos por dia |
| Groq: batch API | OPT-OUT | sem geração em lote pelo app; o acervo é escrito no repositório (D-13) |
| Groq: arquivos e fine-tuning | OPT-OUT | treino próprio está adiado |
| Groq: áudio (transcrição e voz) | OPT-OUT | o app mostra texto |
| Groq: visão | OPT-OUT | nenhuma imagem é enviada |
| Groq: moderação | OPT-OUT | a régua própria permite palavrão e bloqueia só o que o dono definiu (D-07) |
| Cloudflare: chat completions (formato OpenAI) | INTEGRATE | |
| Cloudflare: busca no catálogo de modelos | INTEGRATE | |
| Cloudflare: parâmetro reasoning_effort | INTEGRATE | |
| Cloudflare: erro 429 de cota diária e de capacidade | INTEGRATE | |
| Cloudflare: streaming da resposta | OPT-OUT | fala curta, resposta única |
| Cloudflare: AI Gateway | OPT-OUT | mais um serviço guardando os dados sem necessidade |
| Cloudflare: fila assíncrona | OPT-OUT | o app usa o acervo quando a IA demora |
| Cloudflare: adaptadores LoRA | OPT-OUT | treino próprio está adiado |
| Cloudflare: embeddings | OPT-OUT | quase cópia é detectada no próprio código, sem vetor |
| Cloudflare: imagem, voz e tradução | OPT-OUT | o app mostra texto em português |

Notas:

- Nenhum provedor novo nem pago entra (D-14). xAI continua opcional e desligado, sem mudança nesta fase.
- O envio de push por FCM já é usado desde a Fase 7 e não ganha capacidade nova.
- Modelos, preços e cotas ficam fora de `server/src/ai`; a escolha vem de variáveis do servidor.
