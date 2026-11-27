# Fase 7: o que ainda só o dono e o tempo conferem

Em 2026-11-27 o dono respondeu "Avisos e falas ok" sobre o iPhone. Os itens abaixo não foram respondidos um a um.

## Avisos
- [ ] Limite a 80% e 100%: cada um chega uma vez; salto direto para mais de 100% gera um só. (PUSH-02, PUSH-04)
- [ ] Reiniciar o Railway não repete aviso já enviado. (D-07)
- [ ] Tipo desligado não chega; horário de silêncio segura e entrega depois, uma vez. (PUSH-03, D-21)
- [ ] A primeira fatura que fechar avisa uma vez. (PUSH-02)
- [ ] A outra pessoa não recebe os seus avisos, e você não recebe os dela. (D-14)
- [ ] Depois de uma semana os avisos ainda chegam, com o app aberto, em segundo plano e fechado, e com modo Foco. Repetir no Android. (PUSH-05)
- [ ] O Railway fica sempre ligado (não dorme).

## IA e conteúdo
- [ ] Ler 10 falas sobre lançamentos manuais: nenhuma traz nome de pessoa; nome em minúsculas é risco aceito. (D-20)
- [ ] Revisar a lista de ofensas discriminatórias em `shared/core/aiValidate.js`. (D-22)

## A acompanhar
- Consumo de cota no console do Groq e leituras do Firestore (grátis: 50 mil por dia).
- Termos e limites grátis mudam: reler e repetir o teste lado a lado se a fala piorar ou o provedor recusar. (IA-05)

## Decisões que ainda são suas, fora do escopo desta fase
- Configurações por perfil (tom, avisos, o que cada um vê).
- Trava de tom sério para aperto financeiro grave.
- Convite do Vintém na Home para ativar avisos (descartado pela D-08).

## Pendência de documento
- A nota "Feature 1b" do `.claude/CLAUDE.md` não foi atualizada: o plano 07-19 pede confirmação de que o aviso seguiu chegando no dia seguinte, e ela não está registrada. Se confirmar, atualizo (mensagem só de dados por `fid`, handler próprio, `SILENT_WHEN_FOCUSED = true`).
