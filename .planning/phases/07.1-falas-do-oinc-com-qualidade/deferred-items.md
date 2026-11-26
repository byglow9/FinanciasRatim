# Fase 07.1: itens adiados

## npm run build falha em shared/core/aiPrompt.js

- Visto na execucao do 07.1-07 (2026-11-26).
- `shared/core/aiPrompt.js(235,24): error TS7006: Parameter 'c' implicitly has an 'any' type.`
- Entrou com o plano 07.1-05, que rodava em paralelo; fora do escopo do 07.1-07 e nao alterado por ele.
- `npx vite build` empacota; o que falha e o `tsc -b` do `npm run build`.
- Ajuste esperado: anotar o tipo do parametro em JSDoc. Conferir se o 07.1-05 ja corrigiu antes de mexer.
