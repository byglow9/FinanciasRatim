# 03-01 Premissas de produto da Fase 3 (PR-01 a PR-20)

Defaults do pesquisador para fórmula, ciclo, avisos e processo. O dono confirma ou ajusta uma vez (Task 3 do Plano 03-01). O que for ajustado vale para todos os planos seguintes e fica registrado no 03-01-SUMMARY.md.

Itens de maior efeito: PR-01, PR-02, PR-08, PR-09 e PR-11.

| id | premissa | default adotado | origem | planos que implementam | onde mora a constante ou a regra |
|----|----------|-----------------|--------|------------------------|----------------------------------|
| PR-01 | Renda efetiva do ciclo | `max(renda esperada, renda recebida no ciclo)`; sem isso a receita extra não muda o Pode gastar e o texto do sheet fica falso | A1, Open Question 1 | 06 (núcleo), 14 (sheet) | função `incomeForCycle` no núcleo de ciclo em `shared/core/`; legenda condicional da aba Receita no sheet de lançamento |
| PR-02 | Pagamento de conta fixa feito pelo banco | Entra como gasto comum e é descontado duas vezes (fixa mais gasto); aceito e documentado; nenhuma heurística casa os dois e `classify.js` não muda | A2, Open Question 2, D-05 da Fase 2 | 06 (núcleo), 23 (guia UAT) | fórmula do Pode gastar em `shared/core/` (sem casamento); limitação registrada no guia UAT |
| PR-03 | Conta fixa com pessoa `conjunto` | Ignorada no cálculo | A5, Pitfall 9 | 10 | filtro de fixas por pessoa no hook de ciclo (plano 10) e no núcleo |
| PR-04 | Alertas de limite com dado do banco velho e perfil do parceiro | Disparam mesmo com dado velho (LIM-08 só suprime elogio/bronca); gravados só para a pessoa logada, nunca no perfil do parceiro em somente leitura | A6, A7, Pattern 4 | 13 | `alerts.js` no núcleo e hook de alertas (plano 13) |
| PR-05 | Projeção da Sobra | Gasto até hoje + média diária dos dias decorridos × dias restantes; chip "estimativa" no ciclo atual | A8, Open Question 3 | 06 (núcleo), 16 (cartão) | função de projeção em `shared/core/`; cartão da Home |
| PR-06 | Investimentos (saída) | Conta como gasto do dia a dia | A9, Pitfall 10 | 06 | `spentByCategory`/soma de gasto em `shared/core/` |
| PR-07 | Limite de categoria arquivada | Ignorado no ciclo atual (o gasto vai para Gasto geral) e mantido em ciclos passados | A10, Pitfall 10 | 06 | resolução de limites por ciclo em `shared/core/` |
| PR-08 | Troca do dia do salário e marcadores de alerta | Marcadores já enviados são regravados na nova chave do ciclo como `silent`, para o aviso não repetir | A11, Pitfall 7, Open Question 4 | 04 (`rekeyAlerts`), 13 (regravação), 17 (chamada na tela) | `rekeyAlerts` em `alerts.js` no núcleo; chamada na tela de Aparência/Perfil |
| PR-09 | Limite editado no meio do ciclo | Vale já neste ciclo e nos próximos; ciclos passados mantêm o limite da época; "zerar os limites" = reiniciar a contagem de gasto no começo do ciclo, sem apagar limites | P-03, D-10, Open Question 6 | 03, 19 | histórico de limites com `from = cycleKey atual` em `personConfig` (plano 03); editor de limites (plano 19) |
| PR-10 | Dia do salário e renda esperada | Por pessoa, perfil atual | P-08, D-08, D-11, Open Question 7 | 03, 17 | `personConfig.<person>` em `settings/main`; tela de ciclo (plano 17) |
| PR-11 | Escopo de ciclo vs. mês-calendário | Transações, Relatórios e Calendário continuam por mês-calendário; só Home, Central e alertas usam o ciclo | P-09 | sem plano de código | registrado no UAT (inconsistência temporária entre telas até uma fase futura) |
| PR-12 | Lançar com um ciclo passado na tela | Grava com a data de hoje e avisa por toast | P-07 | 14 | sheet de lançamento (plano 14) |
| PR-13 | Avisos de limite | Sem interruptor: sempre ligados em 80% e 100% | P-06 | 17 | constante de limiares em `alerts.js`; tela de ajustes (plano 17) não oferece interruptor |
| PR-14 | Transferência entre as duas pessoas | Não detectável em lançamento importado; o núcleo aceita o campo opcional `transfer: true`, sem interface; D-03 vale para aporte e saque do Porquinho; limitação registrada no UAT | D-03, Pitfall 6, Open Question 5 | 06 (núcleo), 23 (guia UAT) | filtro de transferência na soma de gasto em `shared/core/` |
| PR-15 | `/casal` na Fase 3 | Conteúdo antigo do Dashboard realocado, com aviso "em breve"; aba funcional é Fase 8 | P-04, P-10 | 18 | página `/casal` (plano 18) |
| PR-16 | Testes de interface | Não instalar vitest, jsdom nem testing-library; interface coberta por tsc, lint, guardas estáticas e UAT | Open Question 8, D-11 da Fase 1 | 23 | guardas estáticas `node --test` e guia UAT |
| PR-17 | Preenchimentos verde e laranja | Ficam como no mockup aprovado (2,50:1 e 2,42:1), sem o endurecimento opcional (`#15803d`, `#b45309`) | P-02 | 02 | tokens de cor em `src/index.css` / tema (plano 02) |
| PR-18 | Tema escuro | Tema claro forçado até a Fase 5; interruptor removido de Aparência (já confirmada pelo dono em 2026-11-18) | P-01 | 02, 10 | tema em `src/index.css` e `AppShell`/Aparência (planos 02 e 10) |
| PR-19 | Cortes do ritmo | 75/100/115 por cento, em constante exportada e ajustável | A4, P-13, D-07 | 06 | constante exportada do ritmo em `shared/core/` |
| PR-20 | Gravação online | Sem rede, o lançamento mostra o erro "Não foi possível lançar" | item unresolved do UI-SPEC | 14 | sheet de lançamento (plano 14) |
