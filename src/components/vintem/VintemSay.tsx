import { cn } from '@/lib/utils'

export interface VintemSayProps {
  text: string
  /** `padrao`: balao verde de acao; `aviso`: ambar (sem conexao). */
  tone?: 'padrao' | 'aviso'
  /** Papel acessivel: `alert` para erro e `status` para informacao. */
  live?: 'alert' | 'status'
  id?: string
}

/**
 * Fala do Vintem para avisos (sketch 029). Posicao absoluta dentro do palco do Vintem (o pai e
 * `relative`): acima dele, com a borda de baixo 8 px sobre ele, sem tocar o fluxo do formulario e sem
 * capturar toque. O conteudo e sempre texto React. A entrada vem da classe `anim-vintem-say`.
 */
export function VintemSay({ text, tone = 'padrao', live = 'status', id }: VintemSayProps) {
  const aviso = tone === 'aviso'
  return (
    <div
      id={id}
      role={live}
      className={cn(
        'anim-vintem-say pointer-events-none absolute bottom-[calc(100%_-_8px)] left-1/2 z-10 w-[min(332px,calc(100%_+_32px))] -translate-x-1/2 origin-bottom rounded-card px-4 py-3 text-center text-base font-normal leading-[1.4] shadow-lg',
        aviso ? 'bg-warn-ink text-warn-bg' : 'bg-action text-action-text',
      )}
    >
      {text}
      <span
        aria-hidden="true"
        className={cn(
          'absolute -bottom-[7px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 rounded-br-[5px]',
          aviso ? 'bg-warn-ink' : 'bg-action',
        )}
      />
    </div>
  )
}
