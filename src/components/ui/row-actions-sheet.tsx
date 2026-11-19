import * as React from "react"
import { Trash2, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Notice } from "@/components/ui/notice"
import { Sheet } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface RowAction {
  id: string
  label: string
  icon: LucideIcon
  /** Quem chama decide se fecha o Sheet (ex.: "Editar" fecha este e abre o de edicao). */
  onSelect: () => void | Promise<void>
  disabled?: boolean
}

interface RowDeletion {
  /** Pergunta de confirmacao, ex.: "Apagar Mercado? Isso nao pode ser desfeito." */
  question: string
  onConfirm: () => Promise<void>
  confirmLabel?: string
  keepLabel?: string
  errorText?: string
}

interface RowActionsSheetProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  /** Valor ja formatado, mostrado a direita. */
  value?: string
  actions: RowAction[]
  deletion?: RowDeletion
  /** Perfil do parceiro: as linhas ficam aria-disabled, focaveis, e o toque chama onBlocked. */
  readOnly?: boolean
  onBlocked?: () => void
}

const ROW =
  "flex h-14 w-full items-center gap-3 rounded-2xl bg-surface-2 px-4 text-left text-base font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

const DELETE_FAILED = "Não foi possível apagar. Confira a conexão e tente de novo."

/**
 * Sheet de acoes da linha (S6): resumo no alto, uma linha de 56px por acao e, quando ha `deletion`,
 * a linha "Apagar" que troca o conteudo do mesmo Sheet pela confirmacao em duas etapas.
 * Se a gravacao falhar o Sheet continua aberto com aviso e os botoes voltam a funcionar.
 * Todo texto entra como texto React.
 */
export function RowActionsSheet({
  open,
  onClose,
  title,
  subtitle,
  value,
  actions,
  deletion,
  readOnly,
  onBlocked,
}: RowActionsSheetProps) {
  const [confirming, setConfirming] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  const keepRef = React.useRef<HTMLButtonElement>(null)
  // Gatilho "Apagar" e marca de que o foco deve voltar a ele ao tocar em "Manter" (WR-13).
  const askRef = React.useRef<HTMLButtonElement>(null)
  const restoreFocus = React.useRef(false)

  // Volta a primeira etapa a cada abertura (ajuste durante a renderizacao, sem efeito).
  const [wasOpen, setWasOpen] = React.useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setConfirming(false)
      setDeleting(false)
      setFailed(false)
    }
  }

  // O foco vai para "Manter" (a opcao segura) quando o conteudo troca pela confirmacao.
  React.useEffect(() => {
    if (confirming) keepRef.current?.focus()
    else if (restoreFocus.current) {
      restoreFocus.current = false
      askRef.current?.focus()
    }
  }, [confirming])

  // Depois de uma falha ao apagar, o foco volta ao botao seguro em vez de ficar num botao desabilitado.
  React.useEffect(() => {
    if (!deleting && failed) keepRef.current?.focus()
  }, [deleting, failed])

  const press = (action: RowAction) => {
    if (readOnly) {
      onBlocked?.()
      return
    }
    if (action.disabled) return
    void action.onSelect()
  }

  const askDeletion = () => {
    if (readOnly) {
      onBlocked?.()
      return
    }
    setFailed(false)
    setConfirming(true)
  }

  const confirmDeletion = async () => {
    if (!deletion || deleting) return
    setDeleting(true)
    setFailed(false)
    try {
      await deletion.onConfirm()
    } catch {
      setDeleting(false)
      setFailed(true)
      return
    }
    setDeleting(false)
    onClose()
  }

  const showConfirm = confirming && !!deletion

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {subtitle || value ? (
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <p className="min-w-0 text-xs font-normal text-muted-foreground">{subtitle}</p>
          {value ? <p className="num-display shrink-0 text-base font-bold">{value}</p> : null}
        </div>
      ) : null}

      {showConfirm && deletion ? (
        <div className="mt-4 space-y-3">
          <p className="text-base font-bold leading-snug">{deletion.question}</p>
          {failed ? <Notice tone="danger">{deletion.errorText ?? DELETE_FAILED}</Notice> : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="flex-1 px-4"
              onClick={() => void confirmDeletion()}
              disabled={deleting}
              aria-busy={deleting}
            >
              {deletion.confirmLabel ?? "Apagar"}
            </Button>
            <Button
              ref={keepRef}
              type="button"
              variant="outline"
              size="lg"
              className="flex-1 px-4"
              onClick={() => {
                restoreFocus.current = true
                setConfirming(false)
              }}
              disabled={deleting}
            >
              {deletion.keepLabel ?? "Manter"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {actions.map((action, index) => {
            const Icon = action.icon
            const blocked = !!readOnly || !!action.disabled
            return (
              <button
                key={action.id}
                type="button"
                data-autofocus={index === 0 ? "" : undefined}
                aria-disabled={blocked ? true : undefined}
                onClick={() => press(action)}
                className={cn(ROW, blocked && "cursor-not-allowed opacity-60")}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">{action.label}</span>
              </button>
            )
          })}
          {deletion ? (
            <button
              ref={askRef}
              type="button"
              data-autofocus={actions.length === 0 ? "" : undefined}
              aria-disabled={readOnly ? true : undefined}
              onClick={askDeletion}
              className={cn(ROW, "text-danger-ink", readOnly && "cursor-not-allowed opacity-60")}
            >
              <Trash2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">Apagar</span>
            </button>
          ) : null}
        </div>
      )}
    </Sheet>
  )
}

export type { RowAction, RowDeletion }
