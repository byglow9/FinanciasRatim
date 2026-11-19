import { useEffect, useState } from 'react'
import { PluggyConnect } from 'pluggy-connect-sdk'
import { formatDistanceStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EllipsisVertical, Landmark, Link2, RefreshCw, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Notice } from '@/components/ui/notice'
import { Sheet } from '@/components/ui/sheet'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { useArea } from '@/contexts/AreaContext'
import { useNow } from '@/hooks/useNow'
import { useReadOnly } from '@/hooks/useReadOnly'
import { cn } from '@/lib/utils'
import { describeBankFreshness } from '@shared/core/bankStatus.js'
import type { PersonType } from '@/types'
import {
  BANK_ENABLED,
  createConnectToken,
  registerConnection,
  removeConnection,
  subscribeBankConnections,
  syncNow,
  type BankConnection,
} from '@/services/bank.service'

// Mensagens fixas em português: o texto cru do servidor ou do widget nunca vai para a tela (WR-10).
const FAIL_CONNECT = 'Não foi possível conectar. Tente de novo.'
const FAIL_RECONNECT = 'Não foi possível reconectar. Tente de novo.'
const FAIL_SYNC = 'Não foi possível sincronizar. Tente de novo.'

const ROW =
  'flex h-14 w-full items-center gap-3 rounded-2xl bg-surface-2 px-4 text-left text-base font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

type Feedback = { tone: 'info' | 'danger'; text: string }

interface BankConnectionsProps {
  /** Legenda do cartão, ex.: "MeuPluggy · Atualizado há 3 horas". */
  subtitle?: string
}

/** Estado da conexão em uma linha curta, com a cor da gravidade. */
function describeState(
  c: BankConnection,
  now: Date
): { short: string; tone: 'danger' | 'warn' | 'muted'; needsReconnect: boolean; details: string[] } {
  const f = describeBankFreshness(
    {
      status: c.status,
      executionStatus: c.executionStatus,
      bankUpdatedAt: c.bankUpdatedAt ?? null,
      lastSyncAt: c.lastSyncAt ?? null,
      consentExpiresAt: c.consentExpiresAt ?? null,
    },
    now
  )
  const ago = (d: Date) => formatDistanceStrict(d, now, { locale: ptBR, addSuffix: true })
  const updated = !f.updatedAt
    ? 'Sem registro de atualização'
    : f.updatedSource === 'bank'
      ? `Atualizado ${ago(f.updatedAt)}`
      : `Última importação do app ${ago(f.updatedAt)}`

  const details = [updated]
  if (c.lastWebhookAt) details.push(`Último aviso do banco: ${ago(c.lastWebhookAt)}`)

  const needsReconnect = f.needsReconnect || f.consent === 'expiring' || f.consent === 'expired'
  if (f.consent === 'expired') return { short: 'Consentimento vencido', tone: 'danger', needsReconnect, details }
  if (f.needsReconnect) return { short: 'Precisa reconectar', tone: 'danger', needsReconnect, details }
  if (f.consent === 'expiring') {
    const days = `${f.daysToExpire} ${f.daysToExpire === 1 ? 'dia' : 'dias'}`
    return { short: `Consentimento vence em ${days}`, tone: 'warn', needsReconnect, details }
  }
  if (f.stale && f.updatedAt) return { short: 'Dados desatualizados', tone: 'warn', needsReconnect, details }
  return { short: updated, tone: 'muted', needsReconnect, details }
}

function SheetAction({
  icon: Icon,
  label,
  blocked,
  danger,
  onClick,
}: {
  icon: LucideIcon
  label: string
  blocked?: boolean
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-disabled={blocked ? true : undefined}
      onClick={onClick}
      className={cn(ROW, danger && 'text-danger-ink', blocked && 'cursor-not-allowed opacity-60')}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{label}</span>
    </button>
  )
}

export function BankConnections({ subtitle }: BankConnectionsProps) {
  const { settings } = useArea()
  const { readOnly, guard } = useReadOnly()
  const [connections, setConnections] = useState<BankConnection[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [choosing, setChoosing] = useState(false)
  const [menuFor, setMenuFor] = useState<BankConnection | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<BankConnection | null>(null)
  const [removing, setRemoving] = useState(false)
  const [removeFailed, setRemoveFailed] = useState(false)
  const now = useNow(60_000)

  useEffect(() => subscribeBankConnections(setConnections), [])

  const names: Record<PersonType, string> = {
    ele: settings.tabNames.area1,
    ela: settings.tabNames.area2,
  }

  // Todo erro vira a mensagem fixa de `failText`; o detalhe da exceção não é exibido nem registrado.
  const run = async (key: string, failText: string, fn: () => Promise<string | void>) => {
    setBusy(key)
    setFeedback(null)
    try {
      const msg = await fn()
      if (msg) setFeedback({ tone: 'info', text: msg })
    } catch {
      setFeedback({ tone: 'danger', text: failText })
    } finally {
      setBusy(null)
    }
  }

  const connect = (person: PersonType) =>
    run(`connect-${person}`, FAIL_CONNECT, async () => {
      const { accessToken } = await createConnectToken(person)
      await new Promise<void>((resolve, reject) => {
        const widget = new PluggyConnect({
          connectToken: accessToken,
          includeSandbox: false,
          onSuccess: ({ item }) => {
            registerConnection(person, item.id)
              .then((s) => {
                setFeedback({ tone: 'info', text: `Banco conectado: ${s.imported} importados.` })
                resolve()
              })
              .catch(reject)
          },
          onError: () => reject(new Error('widget')),
          onClose: () => resolve(),
        })
        widget.init()
      })
    })

  // Renovar consentimento ou credenciais: widget em modo de atualizacao do item (REV-07, D-08).
  // So sincroniza depois; nunca cria conexao nova nem atualiza o item pela API.
  const reconnect = (c: BankConnection) =>
    run(`reconnect-${c.itemId}`, FAIL_RECONNECT, async () => {
      const { accessToken } = await createConnectToken({ itemId: c.itemId })
      await new Promise<void>((resolve, reject) => {
        const widget = new PluggyConnect({
          connectToken: accessToken,
          updateItem: c.itemId,
          includeSandbox: false,
          onSuccess: ({ item }) => {
            registerConnection(c.person, item.id)
              .then((s) => {
                setFeedback({ tone: 'info', text: `Banco reconectado: ${s.imported} novos.` })
                resolve()
              })
              .catch(reject)
          },
          onError: () => reject(new Error('widget')),
          onClose: () => resolve(),
        })
        widget.init()
      })
    })

  const sync = () => {
    if (guard('editar')) return
    if (busy !== null) return
    void run('sync', FAIL_SYNC, async () => {
      const { results } = await syncNow()
      const imported = results.reduce((n, r) => n + r.imported, 0)
      return `Sincronizado: ${imported} novos.`
    })
  }

  const openChooser = () => {
    if (guard('editar')) return
    if (busy !== null) return
    setChoosing(true)
  }

  const choosePerson = (person: PersonType) => {
    if (guard('editar')) return
    setChoosing(false)
    void connect(person)
  }

  const askReconnect = (c: BankConnection) => {
    if (guard('editar')) return
    if (busy !== null) return
    setMenuFor(null)
    void reconnect(c)
  }

  const askRemove = (c: BankConnection) => {
    if (guard('editar')) return
    if (busy !== null) return
    setMenuFor(null)
    setRemoveFailed(false)
    setPendingRemoval(c)
  }

  const confirmRemove = async () => {
    if (guard('editar')) return
    if (!pendingRemoval || removing) return
    setRemoving(true)
    setRemoveFailed(false)
    try {
      await removeConnection(pendingRemoval.itemId)
    } catch {
      setRemoving(false)
      setRemoveFailed(true)
      return
    }
    setRemoving(false)
    setPendingRemoval(null)
  }

  const blocked = readOnly || busy !== null
  const menuState = menuFor ? describeState(menuFor, now) : null

  const syncButton = BANK_ENABLED ? (
    <button
      type="button"
      aria-label="Sincronizar agora"
      title="Sincronizar agora"
      aria-disabled={blocked ? true : undefined}
      onClick={sync}
      className={cn(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        blocked && 'cursor-not-allowed opacity-60'
      )}
    >
      <RefreshCw className={cn('h-5 w-5', busy === 'sync' && 'animate-spin')} aria-hidden="true" />
    </button>
  ) : null

  return (
    <SettingsCard id="bancos" icon={Landmark} title="Bancos conectados" subtitle={subtitle} action={syncButton}>
      {!BANK_ENABLED ? (
        <p className="text-xs font-normal text-muted-foreground">
          Defina VITE_BANK_API_URL para ativar a sincronizacao automatica.
        </p>
      ) : (
        <>
          {connections.length === 0 ? (
            <p className="text-xs font-normal text-muted-foreground">Nenhum banco conectado.</p>
          ) : (
            <ul className="space-y-2">
              {connections.map((c) => {
                const state = describeState(c, now)
                return (
                  <li key={c.itemId} className="flex items-center gap-3 rounded-2xl bg-surface-2 py-1 pl-3 pr-1">
                    {c.connectorImageUrl ? (
                      <img src={c.connectorImageUrl} alt="" className="size-10 shrink-0 rounded-xl bg-card object-contain" />
                    ) : (
                      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card">
                        <Landmark className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold leading-snug">{c.connectorName ?? 'Banco'}</p>
                      <p
                        className={cn(
                          'truncate text-xs font-normal',
                          state.tone === 'danger' && 'text-danger-ink',
                          state.tone === 'warn' && 'text-warn-ink',
                          state.tone === 'muted' && 'text-muted-foreground'
                        )}
                      >
                        {state.short}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Ações de ${c.connectorName ?? 'banco'}`}
                      aria-haspopup="dialog"
                      onClick={() => setMenuFor(c)}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <EllipsisVertical className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <Button
            type="button"
            className={cn('w-full', blocked && 'cursor-not-allowed opacity-60')}
            aria-disabled={blocked ? true : undefined}
            onClick={openChooser}
          >
            <Link2 className="mr-2 h-5 w-5" aria-hidden="true" />
            Conectar banco
          </Button>
        </>
      )}
      {feedback ? (
        feedback.tone === 'danger' ? (
          <Notice tone="danger">{feedback.text}</Notice>
        ) : (
          <p role="status" className="text-xs font-normal text-muted-foreground">
            {feedback.text}
          </p>
        )
      ) : null}

      <Sheet open={choosing} onClose={() => setChoosing(false)} title="Conectar banco">
        <div className="mt-2 space-y-3">
          <p className="text-base font-bold leading-snug">De quem é essa conexão?</p>
          <div className="flex flex-wrap gap-2">
            {(['ele', 'ela'] as PersonType[]).map((p) => (
              <Chip key={p} onClick={() => choosePerson(p)} disabled={readOnly} className="min-w-24 px-4">
                {names[p]}
              </Chip>
            ))}
          </div>
        </div>
      </Sheet>

      <Sheet open={menuFor !== null} onClose={() => setMenuFor(null)} title={menuFor?.connectorName ?? 'Banco'}>
        {menuFor && menuState ? (
          <div className="mt-2 space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-normal text-muted-foreground">{names[menuFor.person]}</p>
              {menuState.details.map((line) => (
                <p key={line} className="text-xs font-normal text-muted-foreground">
                  {line}
                </p>
              ))}
              {menuState.tone !== 'muted' ? (
                <p className={cn('text-xs font-bold', menuState.tone === 'danger' ? 'text-danger-ink' : 'text-warn-ink')}>
                  {menuState.short}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              {menuState.needsReconnect ? (
                <SheetAction
                  icon={RefreshCw}
                  label="Reconectar"
                  blocked={blocked}
                  onClick={() => askReconnect(menuFor)}
                />
              ) : null}
              <SheetAction icon={Trash2} label="Desconectar" danger blocked={blocked} onClick={() => askRemove(menuFor)} />
            </div>
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={pendingRemoval !== null}
        onClose={() => {
          if (!removing) setPendingRemoval(null)
        }}
        title="Desconectar banco"
      >
        <div className="mt-4 space-y-3">
          <p className="text-base font-bold leading-snug">
            Desconectar {pendingRemoval?.connectorName ?? 'este banco'}? Os lançamentos já importados ficam.
          </p>
          {removeFailed ? (
            <Notice tone="danger">Não foi possível desconectar. Confira a conexão e tente de novo.</Notice>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="flex-1 px-4"
              onClick={() => void confirmRemove()}
              disabled={removing}
              aria-busy={removing}
            >
              Desconectar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1 px-4"
              onClick={() => setPendingRemoval(null)}
              disabled={removing}
              data-autofocus=""
            >
              Manter
            </Button>
          </div>
        </div>
      </Sheet>
    </SettingsCard>
  )
}
