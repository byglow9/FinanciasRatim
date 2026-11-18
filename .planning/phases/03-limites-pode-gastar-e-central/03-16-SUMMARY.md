---
phase: 03-limites-pode-gastar-e-central
plan: 16
subsystem: home-cartoes-e-avisos
tags: [MonthInOneCard, CentralSummaryCard, FixedMonthCard, ShortcutRow, ReadOnlyBanner, StaleNotice, LimitAlertNotice, guarda-estatica]
requires: [03-04, 03-06, 03-08, 03-09, 03-10, 03-13]
provides:
  - MonthInOneCard (O mês em uma conta, com chip estimativa e link Defina a renda)
  - CentralSummaryCard (link inteiro para /limites com contagens por estado)
  - FixedMonthCard (id fx, até 4 contas, Marcar pago, vazio com Nova conta fixa)
  - ShortcutRow (4 atalhos redondos; lançar fica aria-disabled em somente leitura)
  - ReadOnlyBanner (Perfil de {Nome}, somente leitura)
  - StaleNotice (aviso neutro de dado velho por useBankFreshness, placement top/below)
  - LimitAlertNotice (aviso não lido mais grave, Ver aviso e dispensar de 44px)
  - test/static/phase3-home-cards.test.js (10 asserções)
affects: [03-20, 03-21, 03-22]
tech-stack:
  added: []
  patterns: ["cartões só exibem a BudgetView, sem fórmula de orçamento", "StaleNotice divide aviso (top) e linha discreta (below) pela prop placement", "atalho somente leitura usa aria-disabled e não disabled, para o toque ainda mostrar o toast"]
key-files:
  created: [src/components/dashboard/MonthInOneCard.tsx, src/components/dashboard/CentralSummaryCard.tsx, src/components/dashboard/FixedMonthCard.tsx, src/components/dashboard/ShortcutRow.tsx, src/components/dashboard/ReadOnlyBanner.tsx, src/components/dashboard/StaleNotice.tsx, src/components/dashboard/LimitAlertNotice.tsx, test/static/phase3-home-cards.test.js]
  modified: []
decisions:
  - "Entra sem renda (income.hasIncome falso) mostra o link Defina a renda no lugar da legenda e o valor R$ 0"
  - "StaleNotice tem uma mensagem de reserva (Os dados do banco podem estar incompletos) para níveis de aviso fora dos quatro do UI-SPEC (status OUTDATED ou PARTIAL_SUCCESS)"
  - "LimitAlertNotice singulariza o complemento (+1 aviso, +2 avisos) e usa o texto como título 16/700 do Notice"
  - "O link Gerenciar contas fixas aparece também no estado vazio, como no cabeçalho do UI-SPEC"
requirements-completed: []
status: complete
commits: 2
plan_head_before: 6f25ad910887930a5d86b63c75e0d56850b34712
actuals:
  tokens: 5700
  tasks: 2
  commits: 2
metrics:
  completed: 2026-11-18
---

# Fase 3 Plano 16: Cartões, atalhos e avisos da Home e da Central

Sete componentes de apresentação da Home e da Central, todos só exibindo a `BudgetView` do núcleo, mais a guarda estática que protege cópia, acessibilidade e as regras de tipografia. Nada está montado ainda: a Home (Planos 20 e 22) e a Central (Plano 21) os usam.

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Tracer: O mês em uma conta, Central e Contas fixas do mês | bac58573 | MonthInOneCard.tsx, CentralSummaryCard.tsx, FixedMonthCard.tsx, phase3-home-cards.test.js |
| 2 | Atalhos, somente leitura, dado velho e aviso de limite | bea00a5f | ShortcutRow.tsx, ReadOnlyBanner.tsx, StaleNotice.tsx, LimitAlertNotice.tsx, phase3-home-cards.test.js |

O gate do tracer foi cumprido (modo interativo, `<verify>` automatizado): `test:static`, `build` e `lint` verdes antes de expandir.

## Resultados dos portões

- `npm run test:core:tz`: 234 passam, 0 falham (UTC e Asia/Tokyo).
- `npm run test:static`: 118 passam, 0 falham, 1 pulado pré-existente (10 testes novos em `phase3-home-cards.test.js`).
- `npm run test:rules`: 12 passam, 0 falham.
- `npm run test:emu`: 58 passam, 0 falham.
- `npm --prefix server test`: 81 passam, 0 falham.
- `npm run build`: passa; aviso de chunk acima de 500 kB é pré-existente.
- `npm run lint`: 0 erros, 2 avisos `react-hooks/incompatible-library` pré-existentes.
- Nenhuma exclusão nos commits. `BankStatusNotice.tsx`, `DashboardPage.tsx` e `bank-ui-copy.test.js` intactos (a guarda confere que `BankStatusNotice` ainda existe). Nenhum teste existente quebra de propósito neste plano (só arquivos novos).

## Mitigações

- T-03-91: nomes de conta fixa e de categoria só como texto React; a guarda falha se o atributo de HTML bruto aparecer em qualquer um dos sete componentes.
- T-03-92: `StaleNotice` usa `useBankFreshness` (mesma regra `shouldSuppressVerdict` do núcleo); a guarda confere a ligação, os textos e a ordem de gravidade.
- T-03-93: nenhum `console.*` nos componentes; a guarda varre os mesmos arquivos, junto com emoji, texto branco e fontes fora da escala.

## Requisitos

Nenhum marcado como concluído. Os componentes existem, mas nada os monta: LIM-05 a LIM-09 e CENT-01/CENT-06 só se cumprem quando a Home (Planos 20 e 22) e a Central (Plano 21) os usarem. IDEN-07 já constava como concluído.

## Deviations from Plan

Nenhum desvio de regra. Duas correções internas durante a escrita, sem efeito no entregue: a guarda do atalho acusou o próprio `aria-disabled={...}` e o nome do prop `disabled` do componente interno (prop renomeado para `dimmed`; regex ajustada para ignorar `aria-disabled`).

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. Sem endpoint, rede nova nem coleção nova.

## Verificação não feita

Sem jsdom nem navegador (PR-16): foco no título `fx` após a rolagem, alvo de 44px em 360px, truncamento de nomes longos, o evento `coinki:open-alerts` abrindo o sino e o toast do atalho em somente leitura ficam para o UAT humano depois da montagem na Home. `LimitAlertNotice` aponta para `/limites#cat-{id}`, rota que só existe com o Plano 21.

## Self-Check: PASSED

- Arquivos existem: os sete componentes e `phase3-home-cards.test.js`.
- Commits bac58573 e bea00a5f existem; contagem medida `rev-list 6f25ad91..HEAD` = 2.
