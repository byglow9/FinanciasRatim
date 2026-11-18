---
phase: 03-limites-pode-gastar-e-central
plan: 17
subsystem: configuracoes-cartoes
tags: [SettingsCard, FieldRow, DayPicker, CycleIncomeCard, AppearanceCard, NotificationsCard, AccountsSkeletonCard, guarda-estatica]
requires: [03-04, 03-08, 03-09, 03-10, 03-13]
provides:
  - SettingsCard (contêiner com âncora, ícone de 44px, título focável com data-section-title e scroll-mt)
  - FieldRow (linha de campo de 56px com valor, chevron e legenda de desabilitado)
  - DayPicker (radiogroup de 1 a 31 em 7 colunas, botões de 44x44, setas)
  - CycleIncomeCard (âncora ciclo: dia do salário com confirmação inline e renda esperada por ciclo ou para todos)
  - AppearanceCard (âncora aparencia: nomes das abas e nota do tema claro, sem interruptor)
  - NotificationsCard (âncora notificacoes: avisos de vencimento, antecedência de 0 a 30 e nota dos avisos de limite)
  - AccountsSkeletonCard (âncora contas: chip em breve, sem campos)
  - test/static/phase3-settings-cycle.test.js (10 asserções)
affects: [03-19, 03-23]
tech-stack:
  added: []
  patterns: ["gravação sempre pelo núcleo (setSalaryDay, setExpectedIncome) e depois updatePersonConfig", "erro do núcleo (sem acento) traduzido para mensagem em português correto na tela", "ressincronização de estado local com as configurações pelo padrão de ajuste durante a renderização"]
key-files:
  created: [src/components/settings/SettingsCard.tsx, src/components/settings/FieldRow.tsx, src/components/settings/DayPicker.tsx, src/components/settings/CycleIncomeCard.tsx, src/components/settings/AppearanceCard.tsx, src/components/settings/NotificationsCard.tsx, src/components/settings/AccountsSkeletonCard.tsx, test/static/phase3-settings-cycle.test.js]
  modified: []
decisions:
  - "Bloqueio de edição vale também no Porquinho: locked = readOnly || user.person !== viewPerson, porque readOnly é falso na aba Porquinho mesmo quando o último perfil visto é o do parceiro"
  - "A renda já recebida (useCycleBudget) só é buscada com o editor de renda aberto, para poupar leituras do Firestore (Spark)"
  - "Trocar o escopo da renda não reinicia o valor digitado; o editor sempre começa na renda base"
  - "Mensagens do núcleo sem acento (Dia do salario invalido, Renda invalida) são mapeadas para texto acentuado na tela"
  - "Nomes das abas vazios são recusados (Informe um nome para cada aba) e limitados a 30 caracteres; antecedência aceita só inteiro de 0 a 30"
  - "Sem rótulo de pessoa fixo: o nome vem de settings.tabNames (area1 para ele, area2 para ela)"
requirements-completed: []
status: complete
commits: 2
plan_head_before: 977987c2a6cb3e40c820246dca2449d791f59204
actuals:
  tokens: 7900
  tasks: 2
  commits: 2
metrics:
  completed: 2026-11-18
---

# Fase 3 Plano 17: Cartões de Configurações do ciclo, aparência e notificações

Sete componentes de Configurações (três blocos comuns e quatro cartões) e uma guarda estática, prontos para o Plano 19 montar a página. O dia do salário grava pelo núcleo com confirmação inline e regrava os marcadores de aviso na chave nova; a renda esperada grava por ciclo ou para todos.

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Tracer: do dia do salário digitado à configuração gravada, aos avisos regravados e ao toast | 5ac079ad | SettingsCard.tsx, FieldRow.tsx, DayPicker.tsx, CycleIncomeCard.tsx, phase3-settings-cycle.test.js |
| 2 | Renda esperada, Aparência, Notificações e esqueleto de Contas e cartões | cf165fbc | CycleIncomeCard.tsx, AppearanceCard.tsx, NotificationsCard.tsx, AccountsSkeletonCard.tsx, phase3-settings-cycle.test.js |

Gate do tracer cumprido (modo interativo, `human_verify_mode` end-of-phase, `<verify>` só automatizado): `test:static`, `build` e `lint` reexecutados verdes antes da Tarefa 2.

## Como funciona

- **Dia do salário:** o CTA "Salvar dia do salário" só pede confirmação se o dia mudou; "Mudar dia" chama `setSalaryDay`, `updatePersonConfig` e, nessa ordem, `rekeyForSalaryDay(pessoa, diaAntigo, diaNovo)`, fecha o sheet e mostra "Salvo". "Manter dia atual" descarta. Os limites não são tocados (PR-09).
- **Renda esperada:** `MoneyValue` + `MoneyKeypad`, escopo em radiogroup ("Todos os ciclos" ou "Só este ciclo ({faixa})"), "Já entrou neste ciclo" vindo da BudgetView. Grava `setExpectedIncome(config, cents, chaveDoCicloVisto | null)`.
- **Somente leitura:** linhas desabilitadas com "Volte ao seu perfil para editar"; campos e botões dos cartões 5 e 6 também.
- **Aparência e Notificações:** um botão de salvar por cartão ("Salvar nomes das abas", "Salvar avisos"), com toast "Salvo" e `Notice` de erro de gravação.

## Deviations from Plan

### Auto-added Issues

**1. [Rule 2 - Segurança de interface] Bloqueio também no Porquinho**
- **Found during:** Tarefa 1
- **Issue:** `readOnly` do AreaContext é falso na aba Porquinho, mesmo quando `viewPerson` (último perfil visto) é o do parceiro; o cartão deixaria editar o dia e a renda do parceiro.
- **Fix:** `locked = readOnly || (user && user.person !== viewPerson)` em CycleIncomeCard.
- **Files modified:** src/components/settings/CycleIncomeCard.tsx
- **Commit:** 5ac079ad

**2. [Rule 2 - Validação] Nomes das abas e antecedência**
- **Found during:** Tarefa 2
- **Issue:** a página antiga aceitava nome de aba vazio e `Number(texto)` sem faixa; o plano pede validação de 0 a 30 só para a antecedência.
- **Fix:** nome vazio recusado e limitado a 30 caracteres; antecedência só inteiro de 0 a 30, com erro em português sob o campo (`role="alert"`).
- **Files modified:** AppearanceCard.tsx, NotificationsCard.tsx
- **Commit:** cf165fbc

Fora isso, o plano foi executado como escrito. `SettingsPage.tsx` ficou intacta (`git diff --stat` só lista arquivos novos de `files_modified`). Nenhum teste existente foi quebrado, então não houve teste a atualizar.

## Requisitos

Nenhum requisito marcado como concluído. Os cartões ainda não estão montados: `SettingsPage.tsx` só os recebe no Plano 19, então o usuário ainda não consegue escolher o dia nem a renda em Configurações.
- LIM-10: fecha quando o Plano 19 montar o cartão (o `rekeyForSalaryDay` já é chamado aqui).
- LIM-06: depende também da Home diferenciar entrada recebida e esperada (Planos 20 e 22).
- CENT-05: depende dos seis cartões na página, incluindo Categorias e Bancos (Plano 19).

## Threat Flags

Nenhuma superfície nova além do modelo do plano. T-03-59 mitigada (toda gravação passa por `setSalaryDay` e `setExpectedIncome`); T-03-60 (confirmação inline e `rekeyForSalaryDay`); T-03-61 (nomes só como texto React, guarda contra HTML bruto); T-03-63 (guarda contra `console.*`).

## Known Stubs

Nenhum. O cartão de Contas e cartões é esqueleto intencional (D-15, "em breve"), sem dados falsos; o cartão de crédito real é Fase 6.

## Verificação final

| Comando | Resultado |
|---------|-----------|
| `npm run test:core:tz` | 234/234 em UTC e 234/234 em Asia/Tokyo |
| `npm run test:static` | 128 passam, 0 falham, 1 ignorado (129) |
| `npm run test:rules` | 12/12 |
| `npm run test:emu` | 58/58 |
| `npm --prefix server test` | 81/81 |
| `npm run build` | verde |
| `npm run lint` | 0 erros (2 avisos já existentes, em EventForm e NoteForm) |

## Self-Check: PASSED
