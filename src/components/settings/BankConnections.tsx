import { useEffect, useState } from 'react'
import { PluggyConnect } from 'pluggy-connect-sdk'
import { formatDistanceStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Landmark, Link2, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useArea } from '@/contexts/AreaContext'
import { useNow } from '@/hooks/useNow'
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

export function BankConnections() {
  const { settings } = useArea()
  const [connections, setConnections] = useState<BankConnection[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const now = useNow(60_000)

  useEffect(() => subscribeBankConnections(setConnections), [])

  const names: Record<PersonType, string> = {
    ele: settings.tabNames.area1,
    ela: settings.tabNames.area2,
  }

  const run = async (key: string, fn: () => Promise<string | void>) => {
    setBusy(key)
    setMessage(null)
    try {
      const msg = await fn()
      if (msg) setMessage(msg)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setBusy(null)
    }
  }

  const connect = (person: PersonType) =>
    run(`connect-${person}`, async () => {
      const { accessToken } = await createConnectToken(person)
      await new Promise<void>((resolve, reject) => {
        const widget = new PluggyConnect({
          connectToken: accessToken,
          includeSandbox: false,
          onSuccess: ({ item }) => {
            registerConnection(person, item.id)
              .then((s) => {
                setMessage(`Banco conectado: ${s.imported} importados.`)
                resolve()
              })
              .catch(reject)
          },
          onError: (error) => reject(new Error(error.message)),
          onClose: () => resolve(),
        })
        widget.init()
      })
    })

  const sync = () =>
    run('sync', async () => {
      const { results } = await syncNow()
      const imported = results.reduce((n, r) => n + r.imported, 0)
      return `Sincronizado: ${imported} novos.`
    })

  const remove = (c: BankConnection) => {
    if (!window.confirm(`Desconectar ${c.connectorName ?? 'este banco'}? Os lancamentos ja importados ficam.`)) return
    return run(`rm-${c.itemId}`, async () => {
      await removeConnection(c.itemId)
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Landmark className="h-4 w-4" />
          Bancos conectados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!BANK_ENABLED ? (
          <p className="text-sm text-muted-foreground">
            Defina VITE_BANK_API_URL para ativar a sincronizacao automatica.
          </p>
        ) : (
          <>
            {connections.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum banco conectado.</p>
            )}
            {connections.map((c) => {
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
              const updatedText = !f.updatedAt
                ? 'Sem registro de atualização'
                : f.updatedSource === 'bank'
                  ? `Atualizado ${ago(f.updatedAt)}`
                  : `Última importação do app ${ago(f.updatedAt)}`
              return (
                <div key={c.itemId} className="flex items-center gap-3 rounded-lg border p-3">
                  {c.connectorImageUrl && (
                    <img src={c.connectorImageUrl} alt="" className="h-8 w-8 rounded" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.connectorName ?? 'Banco'}</p>
                    <p className="text-xs text-muted-foreground">{names[c.person]}</p>
                    <p
                      className={`text-xs ${f.stale ? 'text-yellow-700 dark:text-yellow-500' : 'text-muted-foreground'}`}
                    >
                      {updatedText}
                    </p>
                    {f.consent === 'expired' && (
                      <p className="text-xs text-destructive">Consentimento vencido</p>
                    )}
                    {f.consent === 'expiring' && (
                      <p className="text-xs text-yellow-700 dark:text-yellow-500">
                        Consentimento vence em {f.daysToExpire} {f.daysToExpire === 1 ? 'dia' : 'dias'}
                      </p>
                    )}
                    {f.needsReconnect && f.consent !== 'expired' && (
                      <p className="text-xs text-destructive">Precisa reconectar</p>
                    )}
                    {f.stale && f.updatedAt && !f.needsReconnect && (
                      <p className="text-xs text-yellow-700 dark:text-yellow-500">
                        Dados do banco desatualizados
                      </p>
                    )}
                    {c.lastWebhookAt && (
                      <p className="text-xs text-muted-foreground">
                        Último aviso do banco: {ago(c.lastWebhookAt)}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={busy !== null}
                    onClick={() => remove(c)}
                    aria-label="Desconectar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
            <div className="flex flex-wrap gap-2">
              {(['ele', 'ela'] as PersonType[]).map((p) => (
                <Button
                  key={p}
                  variant="outline"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => connect(p)}
                >
                  <Link2 className="mr-1 h-4 w-4" />
                  Conectar banco ({names[p]})
                </Button>
              ))}
              <Button variant="outline" size="sm" disabled={busy !== null} onClick={sync}>
                <RefreshCw className={`mr-1 h-4 w-4 ${busy === 'sync' ? 'animate-spin' : ''}`} />
                Sincronizar agora
              </Button>
            </div>
          </>
        )}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  )
}
