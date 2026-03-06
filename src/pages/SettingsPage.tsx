import { useState } from 'react'
import { useArea } from '@/contexts/AreaContext'
import { useAuth } from '@/contexts/AuthContext'
import { updateSettings } from '@/services/settings.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LogOut, Save } from 'lucide-react'

export function SettingsPage() {
  const { settings, updateTabNames } = useArea()
  const { signOut } = useAuth()

  const [tabNames, setTabNames] = useState(settings.tabNames)
  const [notifications, setNotifications] = useState(settings.notificationsEnabled)
  const [daysBeforeDue, setDaysBeforeDue] = useState(settings.daysBeforeDueDate)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateTabNames(tabNames)
      await updateSettings({
        notificationsEnabled: notifications,
        daysBeforeDueDate: daysBeforeDue,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Configuracoes</h1>
        <p className="text-muted-foreground">Personalize o aplicativo</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nomes das Abas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="area1">Aba 1</Label>
            <Input
              id="area1"
              value={tabNames.area1}
              onChange={(e) => setTabNames((prev) => ({ ...prev, area1: e.target.value }))}
              placeholder="Ex: Nirigue"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="area2">Aba 2</Label>
            <Input
              id="area2"
              value={tabNames.area2}
              onChange={(e) => setTabNames((prev) => ({ ...prev, area2: e.target.value }))}
              placeholder="Ex: Nirigua"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="piggy">Poupanca</Label>
            <Input
              id="piggy"
              value={tabNames.piggy}
              onChange={(e) => setTabNames((prev) => ({ ...prev, piggy: e.target.value }))}
              placeholder="Ex: Porquinho"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notificacoes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Alertas de vencimento</p>
              <p className="text-xs text-muted-foreground">
                Receber alertas de contas proximas do vencimento
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNotifications((prev) => !prev)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                notifications ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="daysBefore">Dias de antecedencia para alertas</Label>
            <Input
              id="daysBefore"
              type="number"
              min={0}
              max={30}
              value={daysBeforeDue}
              onChange={(e) => setDaysBeforeDue(Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Configuracoes'}
        </Button>
        <Button variant="destructive" onClick={signOut} className="flex-1 sm:flex-none">
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  )
}
