import { defineConfig } from '@vite-pwa/assets-generator/config'

// Maskable de 512 e apple-touch de 180: borda a borda, opacos, margem ja desenhada no SVG.
// Pasta diferente da do icone "any" para os nomes dos arquivos nao colidirem.
export default defineConfig({
  preset: {
    // sem 'quality': o sharp liga a paleta de 8 bits e o degrade perde faixas de cor
    png: { compressionLevel: 9 },
    // o gerador exige as tres chaves; tamanho vazio = nao gera
    transparent: { sizes: [] },
    maskable: { sizes: [512], padding: 0 },
    apple: { sizes: [180], padding: 0 },
  },
  images: ['assets-src/maskable/icon-maskable.svg'],
})
