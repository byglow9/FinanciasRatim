# Coinc

## What This Is

Coinc (hoje "Financias Ratimbum") é um app web de finanças pessoais em português para um casal: abas Ele/Ela/Porquinho, lançamentos, contas fixas, metas, calendário, relatórios e sincronização automática com o banco (Open Finance via Pluggy/MeuPluggy). A nova direção é um app moderno e instalável no celular (PWA), com um mascote porquinho-cofre, **Vintém**, que conversa com o usuário sobre o mês e o ajuda a respeitar limites de gasto por categoria.

## Core Value

Em segundos o usuário sabe **quanto ainda pode gastar no mês** (com base em limites por categoria) e o Vintém o ajuda a não estourar. Se todo o resto falhar, isso precisa funcionar.

## Requirements

### Validated

- ✓ Lançamentos de entrada e saída por pessoa (Ele/Ela) com categorias — existente
- ✓ Contas fixas com vencimento e controle de pagamento — existente
- ✓ Metas com aportes e Porquinho (poupança compartilhada) — existente
- ✓ Calendário com eventos, notas e modo Agenda — existente
- ✓ Relatórios e dashboard por pessoa, incluindo gasto semanal máximo — existente
- ✓ Modo escuro, nomes de aba configuráveis, categorias editáveis — existente
- ✓ Sincronização bancária via MeuPluggy: importação automática, classificação, detecção de duplicados, nomes de lançamentos limpos (servidor no Railway) — existente
- ✓ Publicado no Firebase Hosting (financias-ratimbum.web.app) — existente; o endereço antigo passa a redirecionar direto para o novo (coinc.web.app), sem página de aviso

### Active

- [ ] **Identidade Coinc**: renomear o app, novo endereço coinc.web.app (o antigo redireciona direto), PWA adicionável à tela inicial (manifest, ícones, service worker, passos para Android e iPhone no onboarding e em Ajustes), atualização silenciosa ao abrir, novos tokens visuais. A paleta de cores é decidida por mockups (2 ou 3 propostas) antes de aplicar.
- [ ] **Tema**: Automático (segue o celular), com Claro e Escuro nas Configurações, escolhido por aparelho.
- [ ] **Mascote Vintém**: porquinho-cofre original em SVG animado (movimento lateral fluido, piscar, olhar que segue o cursor, girar de lado), com estados neutro, feliz, triste, bravo, sonolento e surpreso, balão de fala e página de teste com controles.
- [ ] **Home "Pode gastar"**: valor grande com arco de medidor ao redor do Vintém, status de ritmo ("No ritmo"), atalhos (Gasto, Receita, Fixos, Limites), "O mês em uma conta" (Entra, Fixos, Dia a dia, Sobra, com projeção) e resumo de fixos. A Home é individual por pessoa.
- [ ] **Limites por categoria**: cada categoria tem teto mensal; "limite do mês" é a soma; fixos ficam fora do limite do dia a dia; categoria expansível com seus lançamentos; alertas dentro do app ao chegar perto do limite e ao estourar.
- [ ] **Configurações modernas**: ajustes em cartões com ícone (Contas e cartões com dia de fechamento e vencimento, Categorias com ícone e limite divididas em Gastos/Receitas, Bancos conectados, Aparência, Notificações).
- [ ] **Central de Limites e Cartões** (seção/página própria, com resumo na Home que leva até ela): num só lugar, o estado de cada limite por categoria (gasto, teto, % usado, ajustar) e de cada cartão (fatura aberta, fecha/vence, limite disponível, próximas faturas, parcelas a vir, status pago/aberto/atrasado). Os vencimentos de fatura também aparecem no Calendário e nos alertas. Onde ela fica na navegação (aba própria, dentro de "Mais" ou dentro da Home) é decidido com mockups.
- [ ] **Contas Fixas com página própria** (mantida), com resumo e atalho na Home. **Marcar como paga é manual e nunca cria lançamento** (hoje já é assim e continua), para não duplicar. Quando o banco importar o pagamento de uma conta fixa, o lançamento é **vinculado à fixa** (sugestão automática por valor, descrição e data, confirmada na revisão de importações): ele deixa de contar no "Dia a dia"/limites e conta só como fixo, sem duplicar, e pode marcar a fixa como paga.
- [ ] **Webhook da Pluggy**: o servidor recebe os eventos `item/updated`, `transactions/created`, `transactions/updated` e `transactions/deleted` (URL pública HTTPS do Railway, autenticada por cabeçalho secreto) e sincroniza na hora, em vez de só consultar de 6 em 6 horas. Alimenta também os alertas e o push ("entrou um gasto novo"). O polling atual fica como reserva. Precisa de teste real no plano pessoal (MeuPluggy), porque as páginas oficiais não confirmam que os eventos chegam nele.
- [ ] **Revisão de importações bancárias**: tela para os itens `review` (duplicado, transferência própria, pagamento de fatura, estorno), com importar, ignorar e vincular a lançamento manual.
- [ ] **Cartão de crédito**: começar com um teste real para ver o que o MeuPluggy entrega (`creditData`, parcelas, faturas); depois salvar no servidor, separar o gasto no cartão do saldo da conta e mostrar fatura aberta, limite disponível, vencimento e parcelas. Compra no cartão conta no limite **pela data da compra**, com aviso separado do que vai sair em cada fatura.
- [ ] **Vintém com IA gratuita**: comentários customizados sobre os gastos (elogio, bronca, alerta) gerados por um modelo gratuito chamado pelo servidor, com cache e frases prontas como reserva. **Tom sem filtro:** o Vintém pode dar bronca pesada, xingar e constranger (app pessoal, escolha do dono), além de elogiar; o nível do tom fica ajustável nas Configurações. **Dados enviados à IA:** totais por categoria e também **nomes de lojas/estabelecimentos** (decisão do dono); continuam fora CPF, números de conta/cartão e nomes de pessoas físicas de Pix. O provedor é escolhido nessa fase, atrás de uma camada trocável: candidatos Cloudflare Workers AI (grátis, sem treino segundo a documentação), Groq (reserva) e **Grok (xAI)**, que o dono quer testar por ser menos filtrado (o grátis dele não está confirmado e os créditos "grátis" citados exigem aceitar treino com os prompts).
- [ ] **Push no celular**: notificações reais (ex.: "chegou a 80% do limite de Lazer"), com ressalva de que no iPhone só funcionam com o app instalado na tela inicial.
- [ ] **Visão do casal**: Home continua individual; uma aba/modo "Casal" reúne totais, limites e gastos de Ele + Ela. O formato exato ainda está em aberto.
- [ ] **Onboarding e login novos** no visual do Coinc, em coinc.web.app (3 telas de boas-vindas, a terceira com os passos de adicionar à tela inicial; login mais limpo).
- [ ] **Multiusuário (amigo com contas separadas)**: `ownerId` em todos os dados, filtro por usuário, regras do Firestore, migração do histórico e do login dele (projeto `financias-xrd`).

### Out of Scope

- Copiar o app de referência — o personagem, o nome, o slogan, as frases, o código e o layout 1:1 ficam de fora. Só usamos como inspiração. O mascote, o nome e os textos são próprios.
- Método de envelopes (estilo YNAB) — mais rígido e trabalhoso; o modelo escolhido é limite simples por categoria.
- Conectar direto ao Open Finance sem agregador — exige ser instituição autorizada pelo Banco Central; usamos o MeuPluggy.
- Uso comercial / contas de terceiros no plano gratuito do MeuPluggy — só uso pessoal e contas do mesmo titular.

## Context

- **Stack atual:** React 19, TypeScript, Vite 7, Tailwind v4 (tokens em `src/index.css`), Firebase/Firestore, React Router 7, Recharts. Sem biblioteca de animação e sem PWA. Servidor Node/Express separado em `server/` (Railway), com Pluggy SDK e firebase-admin.
- **Dados:** coleções Firestore globais, sem campo de dono. Regras abertas (`allow read, write: if true`). Autenticação local por usuário/senha de variáveis de ambiente, com suporte a e-mail/senha do Firebase.
- **Bancos:** plano gratuito do MeuPluggy, até 5 conexões do mesmo titular, atualização a cada 24 horas, autorização válida por cerca de 1 ano. Quem conecta é o Bradesco da aba "Nirigue".
- **Cartão:** o servidor hoje trata compras, pagamento de fatura e estorno de forma básica, descarta parcelas futuras e não guarda limite nem fatura. Não confirmado que o MeuPluggy entrega faturas.
- **Referências visuais:** `~/Documentos/referencias/coinki-skunk/` (11 prints e `LEIA-ME.md`), fora do repositório.
- **Pesquisa de mercado:** Organizze (compartilhamento de casal, Open Finance pago), Mobills (sincronização paga), Minhas Economias (grátis), Copilot (melhor design), YNAB (envelopes), Monarch (casais, flex).
- **Ideias futuras (não entram agora):** sugerir contas fixas detectando recorrência no extrato; resumo semanal do Vintém; sobra do limite vira reserva no Porquinho; regras de categoria editáveis; exportar CSV e backup; Vintém comemora metas; sequência de dias e evolução do mascote (descartados por enquanto em favor de só comentar).

## Constraints

- **Privacidade**: à IA gratuita vão totais por categoria e nomes de lojas (autorizado pelo dono), nunca CPF, números de conta/cartão nem nomes de pessoas físicas; chaves só no servidor. As camadas grátis podem guardar e treinar com o que recebem, e o dono aceitou isso.
- **Custo**: o projeto deve rodar de graça (Firebase Spark/Hosting, Railway, MeuPluggy gratuito, IA gratuita) — uso pessoal.
- **Originalidade**: nada copiado da referência; mascote e textos próprios.
- **Compatibilidade**: manter o que já funciona (abas Ele/Ela/Porquinho, abas de seção, calendário, metas, sync bancária); renome sem perder dados nem trocar o projeto Firebase.
- **Idioma**: interface em português do Brasil.
- **Mobile**: foco no celular instalado como PWA; navegação com muitas abas precisa de decisão (barra de 5 espaços com "Mais", ou outra) tomada com mockups.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Nome do app: **Coinc**, decidido e confirmado pelo dono (2026-11-17 e 2026-11-23, D-01) — substitui o nome provisório Coinki. Pesquisa em lojas e INPI dispensada (D-02, "é app pessoal"); o ID `coinc` é conferido no Hosting e, se estiver ocupado, para-se e pergunta-se ao dono (D-03) | Antes se evitava "coinc" por já existir; o dono confirmou duas vezes que quer esse nome | ✓ Decidido |
| Mascote porquinho-cofre "Vintém", original | Continua o porquinho do site e não copia a referência | — Pending |
| Paleta definida por mockups | Referência é preto/branco/laranja; nosso site é verde; ver propostas antes | — Pending |
| Tema segue o celular, com override | Referência só tem claro; nosso site tem os dois | — Pending |
| Limite simples por categoria | Simples e igual ao que agradou na referência | — Pending |
| Compra no cartão conta pela data da compra | Mostra o comportamento real e o mascote reage na hora | — Pending |
| Central própria de Limites e Cartões, com resumo na Home | Controle detalhado de limites e faturas (vencimentos, status) precisa de um lugar dedicado | — Pending |
| Marcar fixa como paga não gera lançamento; lançamento do banco se vincula à fixa | Evita contar o mesmo dinheiro duas vezes (fixos fora do Dia a dia) | — Pending |
| Contas Fixas mantém página própria | Mais separado, prático e intuitivo, com resumo na Home | — Pending |
| Home individual + visão/aba "Casal" | Formato exato em aberto | — Pending |
| Endereço coinc.web.app no mesmo projeto Firebase | Muda a URL sem mexer nos dados | — Pending |
| Site antigo redireciona direto, sem página de aviso (D-04) | Mais simples que avisar; o login é refeito uma vez na origem nova (D-05) | — Pending |
| App atualiza sozinho ao abrir, sem aviso (D-14) | Sem tela branca e sem trocar de versão no meio de um lançamento | — Pending |
| IA gratuita via servidor, com nomes de lojas e tom sem filtro (bronca, xingamento) | App pessoal; o dono autorizou os dois. Continuam fora CPF, contas e nomes de pessoas | — Pending |
| Push no celular | Quer notificações reais; iPhone exige app instalado | — Pending |
| Navegação mobile decidida depois, com mockups | Muitas abas; "5 espaços + Mais" é a hipótese | — Pending |
| Revisão de importações e amigo multiusuário viram fases próprias | Hoje os 7 itens `review` ficam presos; amigo exige `ownerId` | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-11-17 after initialization*
