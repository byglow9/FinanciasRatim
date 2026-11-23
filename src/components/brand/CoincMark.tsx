/**
 * Marca do Coinc, 56 por 56 (IDEN-02, D-01): o arquivo de icone do app, decorativo (alt vazio).
 * Vive em arquivo proprio porque o degrade mora so no SVG e a guarda do Login proibe o termo no arquivo dele.
 */
export function CoincMark() {
  return <img src="/icons/icon.svg" alt="" className="h-14 w-14 rounded-2xl" />
}
