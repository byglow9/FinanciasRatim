---
phase: 03-limites-pode-gastar-e-central
plan: 19
subsystem: configuracoes-categorias
tags: [CategoryEditorSheet, CategoriesCard, IconPicker, SettingsPage, limite-mensal, guarda-estatica]
requires: [03-04, 03-08, 03-09, 03-10, 03-12, 03-17]
provides:
  - IconPicker (radiogroup de 6 colunas com os 16 ícones do núcleo) e ColorPalette (bolinhas de 32px com alvo de 44px)
  - CategoryEditorSheet (nome, ícone, cor, limite mensal só em Gastos, salvar e arquivar com confirmação inline)
  - CategoriesCard (âncora categorias: Gastos, Receitas e Calendário, "+ Nova", limite do ciclo ou "Definir")
  - SettingsPage reescrita em seis cartões com âncoras, foco por hash (useHashReveal) e "Sair da conta"
  - test/static/phase3-settings-categories.test.js (9 asserções) e T1 de category-ids apontando para os três arquivos novos
affects: [03-20, 03-21, 03-22, 03-23]
tech-stack:
  added: []
  patterns: ["gravação sempre pelo núcleo (addCategory, renameCategory, setCategoryMeta, archiveCategory, setCategoryLimit) e depois updateCategoryDefs e updatePersonConfig", "erro do núcleo (sem acento) traduzido para português acentuado sob o campo certo, com role alert", "reinício do formulário a cada abertura pelo padrão de ajuste durante a renderização", "guarda estática que varre src e exige setCategoryLimit só no editor (D-21)"]
key-files:
  created: [src/components/settings/IconPicker.tsx, src/components/settings/CategoryEditorSheet.tsx, src/components/settings/CategoriesCard.tsx, test/static/phase3-settings-categories.test.js]
  modified: [src/pages/SettingsPage.tsx, test/static/category-ids.test.js]
decisions:
  - "A chave do ciclo do limite é cycleOf(now, salaryDay da pessoa editada).key, nunca o ciclo visto na tela (PR-09: vale já neste ciclo)"
  - "A configuração da pessoa grava antes das definições: um limite órfão é inofensivo e a nova tentativa fica idempotente; a ordem inversa deixaria categoria criada sem limite e a nova tentativa cairia em Categoria já existe"
  - "O limite só vai para a configuração quando difere do vigente da própria categoria (cobre também a reativação de arquivada que tinha limite antigo)"
  - "Bloqueio de edição vale também no Porquinho: locked = readOnly || user.person !== viewPerson, como no CycleIncomeCard"
  - "Categorias de evento (aba Calendário) não são por pessoa, então ficam editáveis mesmo em somente leitura; só Gastos e Receitas travam"
requirements-completed: [LIM-01, CENT-05]
status: complete
commits: 3
plan_head_before: 4e3dada9ecfa0c236e80bf38c2fbda3f9bd18785
actuals:
  tokens: 17000
  tasks: 3
  commits: 3
metrics:
  completed: 2026-11-18
---

# Fase 3 Plano 19: Categorias com limite mensal e Configurações em seis cartões

O limite mensal por categoria e por pessoa agora se edita só em Configurações > Categorias (com ícone e cor), arquivar nunca apaga, e a página de Configurações virou seis cartões com âncoras, foco por hash e "Sair da conta".

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Tracer: do limite digitado à categoria e à configuração gravadas (IconPicker e CategoryEditorSheet) | 6b3f1082 | IconPicker.tsx, CategoryEditorSheet.tsx |
| 2 | Cartão Categorias com Gastos, Receitas e Calendário | 0ad8b643 | CategoriesCard.tsx |
| 3 | Página de Configurações em seis cartões, T1 atualizado e guarda estática | 2983268f | SettingsPage.tsx, category-ids.test.js, phase3-settings-categories.test.js |

Gate do tracer cumprido (modo interativo, `human_verify_mode` end-of-phase, `<verify>` só automatizado): `test:static`, `build` e `lint` reexecutados verdes antes da Tarefa 2.

## Como funciona

- **Editor:** categoria nova = `addCategory(defs, nome, cor, { icon, kind })` e o id por `resolveCategoryId`, seguido de `setCategoryMeta` (a reativação de arquivada ignora a cor no núcleo). Edição = `renameCategory` (se o nome mudou) e `setCategoryMeta`. Em Gastos, `setCategoryLimit(config, id, chaveDoCicloAtual, limiteOuNulo)` e `updatePersonConfig`; depois `updateCategoryDefs`. Erros do núcleo aparecem sob o campo (nome, ícone ou limite) em `text-danger-ink` com `role="alert"`; limite zero com "Sem limite" desligado também é recusado; falha de gravação mostra o `Notice` de perigo com a mensagem fixa. Sucesso fecha o sheet e mostra o toast "Salvo".
- **Arquivar:** botão de texto "Arquivar categoria" abre no próprio sheet a confirmação com "Arquivar" (destructive) e "Manter"; confirmar usa `archiveCategory` e `updateCategoryDefs`. Nada consulta lançamentos nem bloqueia (D-08). O limite da arquivada some do ciclo atual e continua nos passados por conta do núcleo (PR-07).
- **Cartão Categorias:** `SegmentedControl` Gastos | Receitas | Calendário. Gastos mostram "limite mensal" ou "sem limite" e à direita o valor do ciclo atual da pessoa ou "Definir"; Receitas não mostram limite. Calendário preserva `useEventCategories` (listar, adicionar, editar, remover) com a paleta de `DEFAULT_EVENT_CATEGORY_COLORS`.
- **Página:** Ciclo e renda, Categorias, Contas e cartões, Bancos conectados (legenda "MeuPluggy · Atualizado há {tempo}" com o dado mais antigo entre as conexões), Aparência e Notificações, mais "Sair da conta". Sem interruptor de tema, sem `handleSave` único.
- **Testes quebrados de propósito:** o T1 de `category-ids.test.js` (lia SettingsPage) agora lê editor, cartão e página em conjunto, exige `addCategory`, `renameCategory` e `archiveCategory` importados do núcleo, `updateCategoryDefs`, `renameCategory(`, `archiveCategory(` e "Arquivar categoria", e mantém as negativas. Não foi preciso mexer em `bank-ui-copy` (continua verde).

## Resultados dos portões

- `npm run test:core:tz`: 234 passam, 0 falham, em UTC e em Asia/Tokyo.
- `npm run test:static`: 144 passam, 0 falham, 1 pulado pré-existente (145 testes, com os 9 da guarda nova).
- `npm run test:rules`: 12 passam, 0 falham.
- `npm run test:emu`: 58 passam, 0 falham.
- `npm --prefix server test`: 81 passam, 0 falham.
- `npm run build`: passa (aviso de chunk acima de 500 kB pré-existente).
- `npm run lint`: 0 erros, 2 avisos `react-hooks/incompatible-library` pré-existentes.
- Verificação visual em navegador não foi feita (o `<verify>` é só automatizado); a conferência em celular real é do UAT do Plano 23.

## Deviations from Plan

### Ajustes de encaixe (sem regra de desvio, só adaptação ao que existe)

**1. "+ Nova" fica numa linha de ferramentas dentro do cartão, não no cabeçalho**
- **Por quê:** `SettingsCard` (Plano 17) não tem espaço para ação no cabeçalho e o plano pede os cartões do Plano 17 intactos (só os seis arquivos de `files_modified`).
- **O que foi feito:** primeira linha do corpo com a contagem ("{n} categoria(s)") à esquerda e o botão "+ Nova" (44px) à direita. Na aba Calendário o botão foca o campo de nome do formulário.
- **Arquivos:** src/components/settings/CategoriesCard.tsx. **Commit:** 0ad8b643.

**2. `BankConnections` embutido sem cabeçalho duplicado**
- **Por quê:** o componente traz o próprio `Card` com o título "Bancos conectados"; dentro do `SettingsCard` apareceria um cartão dentro de outro com o título repetido, e o plano proíbe mexer em `BankConnections.tsx`.
- **O que foi feito:** um contêiner com variantes arbitrárias do Tailwind (`-mx-4 -mb-4 [&>div]:bg-transparent [&>div>div:first-child]:hidden`) esconde o cabeçalho interno e o fundo, sem tocar no arquivo. É dependente da estrutura atual (Card com CardHeader como primeiro filho).
- **Arquivos:** src/pages/SettingsPage.tsx. **Commit:** 2983268f.

### Auto-added Issues

**3. [Rule 2 - Segurança de interface] Bloqueio também no Porquinho e no limite de arquivada reativada**
- **Found during:** Tarefa 1
- **Issue:** `readOnly` é falso na aba Porquinho mesmo com o último perfil visto sendo o do parceiro (mesma lacuna do Plano 17); e reativar uma categoria arquivada por `addCategory` pode trazer um limite antigo que o formulário não conhecia.
- **Fix:** `locked = readOnly || (user && user.person !== viewPerson)` no editor e no cartão; o limite grava quando difere do vigente da própria categoria.
- **Files modified:** CategoryEditorSheet.tsx, CategoriesCard.tsx
- **Commit:** 6b3f1082, 0ad8b643

**4. [Rule 2 - Tratamento de erro] Falha ao gravar categoria de evento**
- **Found during:** Tarefa 2
- **Issue:** o código antigo da aba de eventos não tratava erro de gravação (promessa rejeitada sem aviso).
- **Fix:** captura e `Notice` de perigo "Não foi possível salvar. Confira a conexão e tente de novo.".
- **Files modified:** CategoriesCard.tsx
- **Commit:** 0ad8b643

## Requisitos

- **Concluídos:** LIM-01 (limite por categoria e por pessoa editado só em Configurações > Categorias, sem bloqueio; o "quanto passou" já é exibido pelo `LimitRow`) e CENT-05 (Configurações em seis cartões com ícone; Contas e cartões segue esqueleto até a Fase 6, conforme D-15 e UI-SPEC).
- **Não concluído:** CENT-02 continua pendente. A Central (página que exibe o estado de cada limite e leva a `/configuracoes#categorias`) ainda não existe; este plano só entrega o destino do atalho.

## Known Stubs

Nenhum. "Contas e cartões" é um esqueleto intencional definido no UI-SPEC e resolvido na Fase 6.

## Threat Flags

Nenhum. T-03-69 mitigado (toda gravação passa pelo núcleo, erros em português, guarda estática exige `setCategoryLimit` só no editor); T-03-70 (somente texto React, sem HTML bruto, coberto pela guarda); T-03-71 (`useHashReveal` resolve só por `getElementById`); T-03-72 (confirmação inline antes de arquivar, `archiveCategory` nunca remove); T-03-74 (sem `console.*`, mensagem de erro fixa). T-03-73 e T-03-SC aceitos conforme o plano; nenhum pacote instalado.

## Self-Check: PASSED

- Arquivos existem: IconPicker.tsx, CategoryEditorSheet.tsx, CategoriesCard.tsx, SettingsPage.tsx, category-ids.test.js, phase3-settings-categories.test.js.
- Commits 6b3f1082, 0ad8b643 e 2983268f existem; contagem medida `rev-list 4e3dada9..HEAD` = 3.
