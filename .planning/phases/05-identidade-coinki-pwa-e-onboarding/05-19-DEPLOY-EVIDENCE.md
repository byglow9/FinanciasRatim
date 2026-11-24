# 05-19 Evidência de produção: redirect do site antigo (302)

Data: 2026-11-24. Deploy feito pelo dono: `firebase deploy --only hosting:legacy --project financias-ratimbum` (resposta literal: "pronto ja publiquei"; a linha "Deploy complete" não foi colada). Conferido só por leitura (`curl -sI`, sem seguir redirects).

## Resultados (https://financias-ratimbum.web.app)

| Caminho | Resposta | location |
|---------|----------|----------|
| `/` | 302 | `https://coinc-financias.web.app/?origem=antigo` |
| `/transacoes?x=1` | 302 | `https://coinc-financias.web.app/?origem=antigo&x=1` (a query original É anexada) |
| `/configuracoes` | 302 | destino fixo |
| `/assets/qualquer.js` | 302 | destino fixo |
| `/%2f%2fexemplo.invalid` | 302 | destino fixo |
| `/https://exemplo.invalid` | 307 | `/https:/exemplo.invalid` (relativo, mesmo site); seguindo, 302 para o destino fixo |
| `//exemplo.invalid` | 307 | `/exemplo.invalid` (relativo, mesmo site); seguindo, 302 para o destino fixo |

Observações:
- Nenhuma entrada produziu destino em outro domínio: não há redirecionamento aberto. Os dois 307 são a normalização de caminho do próprio Hosting, e o salto seguinte cai no destino fixo (o plano esperava o mesmo `location` já na primeira resposta; divergência registrada, sem risco).
- Com `--path-as-is`, caminhos com `..` (ex.: `/a/../b`) recebem 302 do próprio Hosting para `content-firebasehosting-origin.googleapis.com` (domínio do Google, não controlado pela entrada).
- A query do endereço antigo é repassada ao destino; o app só reage a `?origem` por igualdade estrita com `antigo` (05-12).
- `https://coinc-financias.web.app/`: 200, `<title>Coinc</title>`.

## Rollback

Console do Firebase, Hosting, site `financias-ratimbum`, Release history, restaurar a versão anterior (o app antigo continua guardado). 302 não fica guardado no navegador; o 301 é decisão do plano 05-21.

## Pendente (humano)

Abrir o endereço antigo no celular: cai direto no Coinc, depois do onboarding o Login mostra "O Coinc mudou de endereço." e o login é refeito uma vez (consolidado no roteiro do 05-20).
