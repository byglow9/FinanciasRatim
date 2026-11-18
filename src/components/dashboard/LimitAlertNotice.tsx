import { Link } from 'react-router-dom'
import { CircleAlert, TriangleAlert } from 'lucide-react'
import { Notice } from '@/components/ui/notice'
import { useArea } from '@/contexts/AreaContext'
import { useLimitAlerts } from '@/contexts/LimitAlertsContext'
import { topAlert, visibleAlerts } from '@shared/core/alerts.js'
import { categoryDisplayName } from '@shared/core/categories.js'

// Evento da window que o sino ouve para abrir o painel (AlertsBell).
const OPEN_EVENT = 'coinki:open-alerts'

const ACTION_CLASS =
  'inline-flex min-h-11 items-center text-xs font-bold text-foreground underline underline-offset-4'

/**
 * Aviso discreto de limite na Home (LIM-07, D-13): o aviso não lido mais grave, com "Ver aviso"
 * e dispensar. Só avisa, nunca bloqueia nada (D-09).
 */
export function LimitAlertNotice() {
  const { alerts, markRead } = useLimitAlerts()
  const { categoryDefs } = useArea()

  const top = topAlert(alerts)
  if (!top) return null

  const unread = visibleAlerts(alerts).filter((a) => a.readAt == null).length
  const extra = unread - 1
  const name = categoryDisplayName({ categoryId: top.categoryId }, categoryDefs) || top.categoryId
  const over = top.threshold === 100
  const text = `${name} ${over ? 'passou de 100% do limite' : 'chegou a 80% do limite'}${
    extra > 0 ? ` · +${extra} ${extra === 1 ? 'aviso' : 'avisos'}` : ''
  }`

  return (
    <Notice
      tone={over ? 'danger' : 'warn'}
      icon={over ? CircleAlert : TriangleAlert}
      title={text}
      onDismiss={() => {
        void markRead(top.id)
      }}
      dismissLabel="Dispensar aviso"
      action={
        extra > 0 ? (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent(OPEN_EVENT))}
            className={ACTION_CLASS}
          >
            Ver aviso
          </button>
        ) : (
          <Link to={`/limites#cat-${encodeURIComponent(top.categoryId)}`} className={ACTION_CLASS}>
            Ver aviso
          </Link>
        )
      }
    />
  )
}
