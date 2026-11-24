# Itens adiados (fora do escopo dos planos da Fase 5)

## 05-22: autoteste por pixels da Fase 4 falha antes de qualquer mudança do plano

`node scripts/ux-audit/vintem.mjs --test` termina em `FALHAS 4` no commit `e23c04fb` (HEAD antes do plano 05-22, conferido num worktree limpo), com os mesmos números do HEAD depois do plano. As quatro falhas são do autoteste de pixels do Vintém do app:

- limiar da máscara revalidado: o corpo e o focinho passam com folga de pelo menos 2 vezes -> 199 e 277
- a esclera fica abaixo do limiar e só entra pelo preenchimento de buracos -> 718
- distinção: os 21 pares diferem em pelo menos 12% a 84 px (menor: bravo x sonolento 11,3%)
- distinção: os 21 pares diferem em pelo menos 12% a 48 px (menor: bravo x sonolento 8,8%; neutro x feliz 11,5%)

Causa provável (não investigada, fora do escopo): deriva do ambiente de captura (Chrome 152) ou dos tokens de cor da Fase 5 (verde de ação mais claro) sobre o limiar da máscara. O plano 05-22 não altera o Vintém do app (modelo, geometria, tabelas de estados e critérios do autoteste intactos), e o Vintém de entrada é uma variante separada (`look="entrada"`). Nenhum critério foi relaxado. Encaminhar para um plano de manutenção da Fase 4/5.
