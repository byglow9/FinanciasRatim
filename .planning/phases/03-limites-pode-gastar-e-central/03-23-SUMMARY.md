---
phase: 03-limites-pode-gastar-e-central
plan: 23
subsystem: fechamento-da-fase
tags: [guarda-estatica, suite-completa, validacao, uat, limitacoes-aceitas]
requires: [03-11, 03-18, 03-19, 03-21, 03-22]
provides:
  - test/static/phase3-final.test.js (guarda transversal com 9 testes)
  - 03-VALIDATION.md fechado (status ready, nyquist_compliant e wave_0_complete verdadeiros, assinatura com contagens)
  - 03-UAT-GUIDE.md (passos (a) a (m), limitações aceitas e quadro de aprovação do dono)
affects: [verificação da Fase 3]
tech-stack:
  added: []
  patterns: ["guarda estática única para o que atravessa planos (rotas, remoções, fórmula só no núcleo, escala tipográfica)", "lista explícita NEW_AND_REWRITTEN com exceções documentadas no próprio teste"]
key-files:
  created: [test/static/phase3-final.test.js, .planning/phases/03-limites-pode-gastar-e-central/03-UAT-GUIDE.md]
  modified: [.planning/phases/03-limites-pode-gastar-e-central/03-VALIDATION.md]
decisions:
  - "CouplePage.tsx e dialog.tsx ficam fora da guarda de escala tipográfica: são conteúdo legado só realocado (03-18) ou só com acessibilidade acrescentada (03-08); a normalização é IDEN-06 (Fase 5). A exceção está comentada no teste e listada nas limitações do UAT"
  - "A guarda de cobertura dos 15 requisitos ignora o próprio 03-23-PLAN.md (que lista todos) para não ser trivial"
  - "LIM-10 marcado como concluído; LIM-07 mantido pendente"
requirements-completed: [LIM-10]
status: complete
commits: 3
plan_head_before: 5269fd17997fc42f6037e7046926ad658c1f7616
actuals:
  tokens: 6700
  tasks: 3
  commits: 3
metrics:
  completed: 2026-11-18
---

# Fase 3 Plano 23: Fechamento da Fase 3

Guarda estática final, suíte completa verde, mapa de validação assinado e roteiro de UAT humano com as limitações aceitas. Nenhum código de produção foi alterado.

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Guarda estática final da fase | 74bb0098 | test/static/phase3-final.test.js |
| 2 | Suíte completa e fechamento do mapa de validação | d12c944e | 03-VALIDATION.md |
| 3 | Roteiro de UAT humano e limitações aceitas | 2262cd54 | 03-UAT-GUIDE.md |

## Resultados da suíte completa (2026-11-18)

Comando: `. ./scripts/dev-env.sh && npm run test:core:tz && npm run test:static && npm run test:rules && npm run test:emu && npm --prefix server test && npm run build && npm run lint`, tudo com código 0, na primeira rodada, sem correção de teste.

| Etapa | Resultado |
|-------|-----------|
| `test:core:tz` | 234 passam, 0 falham, em UTC e em Asia/Tokyo |
| `test:static` | 173 testes, 172 passam, 0 falham, 1 pulado pré-existente (`no-legacy-auth`, condicional a `DIST_SCAN`) |
| `test:rules` | 12 passam, 0 falham |
| `test:emu` | 58 passam, 0 falham |
| `npm --prefix server test` | 81 passam, 0 falham |
| `build` | verde (aviso de chunk acima de 500 kB pré-existente) |
| `lint` | 0 erros, 2 avisos `react-hooks/incompatible-library` pré-existentes |

Tempo medido: comando rápido (`test:core` e `test:static`) em 1 s, suíte completa em 48 s. `grep -rnE "\.(skip|only)\(" test shared server/test` não encontra nada; a diff dos testes neste plano é só o arquivo novo.

## Guarda final (`phase3-final.test.js`)

Nove testes: (a) as 10 rotas, (b) os cinco módulos do núcleo com seus testes mais `shouldSuppressVerdict` e `CATEGORY_ICONS`, (c) ausência dos seis arquivos removidos e de qualquer import deles, (d) nenhuma expressão de orçamento escrita à mão em `src`, (e) `limitAlerts` em `clientCollections`, na exceção do get e no índice com `ownerId` primeiro, mais o serviço, (f) `lang="pt-BR"`, nenhuma fonte do Google e tema escuro nunca aplicado, (g) as duas fontes e nenhum de `vitest`, `jsdom`, `@testing-library/react`, (h) escala 12/16/28/56, pesos 400/700, sem HTML bruto nem emoji em 61 arquivos novos ou reescritos, (i) os 15 requisitos cobertos por planos anteriores ao 23.

## Requisitos

- **Marcado como concluído por este plano: LIM-10.** O cartão `CycleIncomeCard` está montado em Configurações (03-19), grava pelo núcleo (`setSalaryDay`), regrava os marcadores de aviso (`rekeyForSalaryDay`) e o ciclo alimenta Home, Central e avisos; a guarda final e a suíte completa confirmam a composição.
- **LIM-07 NÃO marcado.** Todo o código existe (avaliador, sino, aviso da Home, regras e índice publicados), mas o estado "Habilitado" do índice `limitAlerts` no Console do Firebase não foi confirmado (herdado do 03-11). Enquanto estiver "Criando", a leitura falha com `failed-precondition` e nenhum aviso é gravado nem exibido. A prova de "uma vez por limiar e por ciclo" em recarga e em outra aba é do passo (i) do UAT. Marcar só depois do UAT.
- Os demais já constavam como concluídos nos planos 03-02, 03-19, 03-21 e 03-22 (LIM-01 a LIM-06, LIM-08, LIM-09, CENT-01, CENT-02, CENT-05, CENT-06, IDEN-07).
- Nota: a conferência humana (celular, contraste, zoom, dock) de todos eles continua no UAT.

## Pendências para o dono (antes do UAT)

1. **Conferir no Console do Firebase (Firestore, Índices) que o índice de `limitAlerts` está Habilitado.** Está na seção 0.1 do `03-UAT-GUIDE.md`.
2. Rodar o roteiro `03-UAT-GUIDE.md` no celular e no desktop e preencher o quadro final.
3. Decidir a publicação do Hosting depois do UAT. Nada foi publicado neste plano.

## Limitações aceitas registradas no guia

PR-02 (conta fixa paga pelo banco descontada duas vezes), PR-11 (Transações, Relatórios e Calendário por mês-calendário), PR-14 (transferência entre as duas pessoas não detectada), PR-20 (lançamento só online), tema escuro adiado para a Fase 5, escala tipográfica legada em `/casal` e `DialogDescription` (IDEN-06) e cartões da Central só como esqueleto até a Fase 6.

## Deviations from Plan

### Escolha de escopo da guarda de escala (sem regra de desvio)

O plano pede que a escala valha para "todos os componentes, páginas, contextos e hooks criados ou reescritos". Dois arquivos da fase contêm tamanhos legados e ficaram **fora** da lista `NEW_AND_REWRITTEN`:

- `src/pages/CouplePage.tsx` (`text-2xl`, `text-sm`, `text-[10px]`, `font-bold` legados): conteúdo do Dashboard antigo apenas realocado no 03-18, que conscientemente não mexeu nele.
- `src/components/ui/dialog.tsx` (`text-sm` no `DialogDescription`): o 03-08 só acrescentou acessibilidade.

O plano proíbe alterar código de produção, então a correção não coube aqui. O UI-SPEC diz que a escala vale para o Casal; fica como lacuna conhecida, resolvida por IDEN-06 (Fase 5) ou por um plano de lacunas se o dono quiser antes. A exceção está comentada no teste e no guia de UAT.

Fora isso, o plano foi executado como escrito: nenhum teste falhou, nenhum teste foi enfraquecido ou pulado, e nenhum pacote foi instalado.

## Known Stubs

Nenhum novo. Os esqueletos intencionais (Contas e cartões, Cartões da Central, slot do mascote, aviso "em breve" do Casal) já constavam nos planos 03-12, 03-17, 03-18 e 03-21.

## Threat Flags

Nenhum. T-03-86 mitigado (nenhum `skip`, `only` nem asserção removida; VALIDATION só atualizada depois da suíte verde). T-03-87 mitigado (o guia só descreve passos, sem valores, e-mails nem tokens). T-03-88 mitigado (o guia manda usar valores simbólicos e apagar os lançamentos de teste). T-03-89 mitigado (PR-02, PR-11, PR-14 e PR-20 no guia e no quadro final). T-03-SC aceito (nenhum pacote instalado).

## Verificação não feita

Sem navegador nem jsdom (PR-16): tudo o que o `03-UAT-GUIDE.md` lista (360 px, contraste renderizado, zoom de 200%, sheet com teclado, rolagem do dock, perfil somente leitura, avisos sem repetição em outra aba, dado velho real, requisições de rede das fontes) depende do dono. A verificação de contraste automatizada (axe ou equivalente) também não foi executada aqui.

## Self-Check: PASSED

- Arquivos existem: test/static/phase3-final.test.js, 03-VALIDATION.md e 03-UAT-GUIDE.md.
- Commits 74bb0098, d12c944e e 2262cd54 existem; contagem medida `rev-list 5269fd17..HEAD` = 3.
