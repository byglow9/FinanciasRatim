---
phase: 03-limites-pode-gastar-e-central
plan: 14
subsystem: lancamento-rapido
tags: [LaunchContext, LaunchSheet, CategoryPicker, previewLaunch, guarda-estatica]
requires: [03-04, 03-08, 03-09, 03-10]
provides:
  - LaunchProvider e useLaunch com { isOpen, tab, open(tab), close() } e guarda de somente leitura
  - CategoryPicker (radiogroup "Categoria", coluna de 64px, circulo de 48px, setas, Home e End)
  - LaunchSheet com abas Gasto, Receita e Porquinho, teclado em centavos, preview do Pode gastar, erro recuperavel e aviso de ciclo passado
  - test/static/phase3-launcher.test.js (7 asserções)
affects: [03-16, 03-18, 03-22]
tech-stack:
  added: []
  patterns: ["conteudo do Sheet em componente filho que desmonta ao fechar, entao o estado nasce limpo a cada abertura", "categoria escolhida derivada (id escolhido, senao outros, senao a primeira) em vez de efeito", "data-autofocus posto na aba ativa por efeito do filho, que roda antes do efeito do Sheet", "Enter global ignora campos de texto e botoes, exceto abas"]
key-files:
  created: [src/contexts/LaunchContext.tsx, src/components/launcher/CategoryPicker.tsx, src/components/launcher/LaunchSheet.tsx, test/static/phase3-launcher.test.js]
  modified: []
decisions:
  - "O sheet usa useCycleBudget(user.person, { enabled: isOpen, currentCycle: true }) no componente externo e passa a view ao formulario; fechado, a view e nula e nenhum numero e inventado"
  - "Com ciclo passado na tela, a data gravada e a de hoje quando o campo Data nao foi alterado; se o usuario escolher outra data no recolhivel, a escolha vale e o toast nao acrescenta o aviso"
  - "Sem rede (navigator.onLine falso) o envio falha antes de gravar, para nao deixar uma escrita na fila do Firestore que duplicaria no Tentar de novo (PR-20)"
  - "A aba Porquinho nao mostra Conta nem Nota: SavingsTransaction nao tem campo de nota e deposito nao tem conta"
  - "Trocar de aba reinicia categoria, descricao, nota e avisos; o valor digitado se mantem"
status: complete
commits: 3
plan_head_before: 0a715e9690f59383579212f478a4296700d94c1c
actuals:
  tokens: 5800
  tasks: 3
  commits: 3
metrics:
  completed: 2026-11-18
requirements-completed: []
---

# Fase 3 Plano 14: Lançamento rápido (LaunchSheet)

Bottom sheet de lançamento com abas Gasto, Receita e Porquinho, teclado numérico em centavos, categoria por ícones, linha de contexto e preview do Pode gastar vindos de `previewLaunch` do núcleo, erro recuperável e toast de confirmação, protegido por guarda estática. A montagem no layout e os pontos de abertura (botão "+", atalhos da Home) são dos planos 18 e 22.

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Tracer: do toque no teclado ao gasto gravado, ao toast e à atualização (aba Gasto) | 9c10b410 | LaunchContext.tsx, CategoryPicker.tsx, LaunchSheet.tsx |
| 2 | Receita, Porquinho, preview, validação, erro e ciclo passado | 05b04211 | LaunchSheet.tsx |
| 3 | Guarda estática do lançamento | 8dd285d3 | phase3-launcher.test.js |

Gate do tracer cumprido (modo interativo, `<verify>` automatizado): `test:static`, `build` e `lint` verdes antes de expandir.

## Resultados dos portões

- `npm run test:core:tz`: 234 passam, 0 falham (UTC e Asia/Tokyo).
- `npm run test:static`: 101 passam, 0 falham, 1 pulado pré-existente (7 testes novos).
- `npm run test:rules`: 12 passam, 0 falham.
- `npm run test:emu`: 58 passam, 0 falham.
- `npm --prefix server test`: 81 passam, 0 falham.
- `npm run build`: passa; aviso de chunk acima de 500 kB é pré-existente.
- `npm run lint`: 0 erros, 2 avisos `react-hooks/incompatible-library` pré-existentes.
- Nenhuma exclusão nos commits; `git diff --stat` do plano lista só os quatro arquivos de `files_modified`.
- Nenhum teste existente quebra de propósito neste plano (só arquivos novos).

## Mitigações

- T-03-44: o valor só entra por `MoneyKeypad` (`applyKeypad`, teto de 8 dígitos) e vira reais por `fromCents`; a guarda proíbe `type="number"`.
- T-03-45: nenhum `ownerId` nos componentes (a guarda confere); o serviço grava o dono.
- T-03-46: descrição e nota só como texto React; a guarda proíbe HTML bruto.
- T-03-47: nenhum `console.*` nos três arquivos (a guarda confere); o `catch` do envio não registra nada.
- T-03-48 (aceito): bloqueio só de interface via `guard('lançar')`.

## Requisitos

Nenhum marcado como concluído. LIM-04 e LIM-09 são resultados visíveis na Home (número "Pode gastar" e atalhos "Novo gasto"/"Nova receita"), que dependem da Home e do dock montados nos planos 16, 18 e 22; aqui existe o sheet, mas nada o abre ainda. IDEN-07 já constava como concluído.

## Deviations from Plan

Nenhum desvio de regra. Escolhas de implementação dentro do plano:

- O plano diz que a data gravada com ciclo passado "é a de hoje"; implementei como "hoje quando o campo Data não foi alterado" (uma data escolhida de propósito no recolhível é respeitada, sem o aviso no toast).
- Sem rede, a falha vem de checar `navigator.onLine` antes de gravar. O cliente Firestore não tem cache persistente e, offline, `addDoc` não resolve nem rejeita; sem essa checagem o CTA ficaria em "Lançando..." e o "Tentar de novo" duplicaria a escrita enfileirada.
- Foco inicial na aba ativa: o `SegmentedControl` não repassa atributos, então o formulário marca a aba selecionada com `data-autofocus` num efeito (roda antes do efeito do `Sheet`).
- Chips "Conta" e "Cartão (em breve)" e o campo Nota só aparecem nas abas Gasto e Receita.

## Known Stubs

Nenhum. O chip "Cartão (em breve)" é intencional (cartão real é a Fase 6), com `aria-disabled`.

## Threat Flags

Nenhum. Sem endpoint, rede nova nem superfície nova além das gravações em `transactions` e `savings` já existentes.

## Verificação não feita

Sem jsdom nem navegador (PR-16): foco inicial, trap de foco, Enter global, rolagem horizontal das categorias, toast e o fluxo de erro offline ficam para o UAT humano. O sheet ainda não está montado no layout (Plano 18), então não há como abri-lo na tela até lá.

## Self-Check: PASSED

- Arquivos existem: LaunchContext.tsx, CategoryPicker.tsx, LaunchSheet.tsx e phase3-launcher.test.js.
- Commits 9c10b410, 05b04211 e 8dd285d3 existem; contagem medida `rev-list 0a715e96..HEAD` = 3.
