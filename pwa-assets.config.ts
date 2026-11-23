import { defineConfig } from '@vite-pwa/assets-generator/config'

// Icone "any": a arte inteira, sem margem (padding 0), cantos arredondados do proprio SVG.
// Saida ao lado da fonte (assets-src/icon). Rodar por: npm run icons
export default defineConfig({
  preset: {
    // sem 'quality': o sharp liga a paleta de 8 bits e o degrade perde faixas de cor
    png: { compressionLevel: 9 },
    transparent: {
      sizes: [192, 512],
      padding: 0,
      favicons: [[48, 'favicon.ico']],
    },
    // o gerador exige as tres chaves; tamanho vazio = nao gera
    maskable: { sizes: [] },
    apple: { sizes: [] },
  },
  images: ['assets-src/icon/icon.svg'],
})
