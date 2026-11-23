import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VintemEmpty } from '@/components/vintem/VintemEmpty'

/**
 * Tela cheia de falha de abertura (UI-SPEC S5, D-14). Renderiza fora de qualquer provider: sem
 * contexto, sem hook de dados e sem servico, porque o bundle pode ter falhado a meio. Vintem
 * surpreso (nunca triste) e uma saida: recarregar a pagina.
 */
export function BootError() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="grid w-full max-w-md justify-items-center gap-4 text-center">
        <VintemEmpty pose="surpreso" />
        <h1 className="font-display text-[28px] font-bold leading-[1.2] text-foreground">Não foi possível abrir o Coinc</h1>
        <p className="text-base font-normal text-muted-foreground">
          Pode ser a conexão ou uma atualização em andamento. Tente de novo.
        </p>
        <Button type="button" size="lg" className="h-14 w-full" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 size-5" aria-hidden="true" />
          Tentar de novo
        </Button>
      </div>
    </div>
  )
}
