import { useRef, useState } from 'react'
import { useArea } from '@/contexts/AreaContext'
import { useAuth } from '@/contexts/AuthContext'
import { useEventCategories } from '@/hooks/useEventCategories'
import { updateSettings } from '@/services/settings.service'
import { BankConnections } from '@/components/settings/BankConnections'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CategoryDef, EventCategory } from '@/types'
import { addCategory, archiveCategory, renameCategory } from '@shared/core/categories.js'
import { DEFAULT_EVENT_CATEGORY_COLORS } from '@/types'
import { cn } from '@/lib/utils'
import { LogOut, Save, X, Plus, Pencil, AlertTriangle, Tag, CalendarDays, Bell, Moon, Users, Settings } from 'lucide-react'

export function SettingsPage() {
  const { settings, categoryDefs, updateTabNames, updateCategoryDefs, updateTheme } = useArea()
  const { signOut } = useAuth()
  const {
    categories: eventCategories,
    add: addEventCategory,
    update: updateEventCategory,
    remove: removeEventCategory,
  } = useEventCategories()

  const [tabNames, setTabNames] = useState(settings.tabNames)
  const [notifications, setNotifications] = useState(settings.notificationsEnabled)
  const [daysBeforeDue, setDaysBeforeDue] = useState(settings.daysBeforeDueDate)
  const [defs, setDefs] = useState<CategoryDef[]>(categoryDefs)
  const [newCategory, setNewCategory] = useState('')
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [archivingCategory, setArchivingCategory] = useState<string | null>(null)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const cancelRenameRef = useRef(false)
  const activeCategories = defs.filter((d) => !d.archived)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [theme, setTheme] = useState(settings.theme)

  const [editingEventCategory, setEditingEventCategory] = useState<EventCategory | null>(null)
  const [eventCategoryName, setEventCategoryName] = useState('')
  const [eventCategoryColor, setEventCategoryColor] = useState(DEFAULT_EVENT_CATEGORY_COLORS[0])
  const [savingEventCategory, setSavingEventCategory] = useState(false)
  const [removingEventCategory, setRemovingEventCategory] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateTabNames(tabNames)
      await updateCategoryDefs(defs)
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

  // Aplica uma mudanca nas definicoes: o nucleo valida (erro em pt-BR vai para a tela) e persiste.
  const applyCategoryChange = async (change: (current: CategoryDef[]) => CategoryDef[]): Promise<boolean> => {
    let next: CategoryDef[]
    try {
      next = change(defs)
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : 'Nao foi possivel alterar a categoria')
      return false
    }
    setDefs(next)
    setCategoryError(null)
    try {
      await updateCategoryDefs(next)
    } catch {
      setDefs(defs)
      setCategoryError('Nao foi possivel salvar as categorias')
      return false
    }
    return true
  }

  // Nome de categoria arquivada reativa a mesma categoria (mesmo id).
  const handleAddCategory = async () => {
    if (await applyCategoryChange((current) => addCategory(current, newCategory))) {
      setNewCategory('')
    }
  }

  // D-08: excluir arquiva; nao consulta lancamentos e nao bloqueia, o historico continua mostrando o nome.
  const handleArchiveCategory = async (id: string) => {
    setArchivingCategory(id)
    try {
      await applyCategoryChange((current) => archiveCategory(current, id))
    } finally {
      setArchivingCategory(null)
    }
  }

  const handleStartRenameCategory = (def: CategoryDef) => {
    cancelRenameRef.current = false
    setCategoryError(null)
    setEditingCategoryId(def.id)
    setEditingCategoryName(def.name)
  }

  const handleCancelRenameCategory = () => {
    cancelRenameRef.current = true
    setEditingCategoryId(null)
    setEditingCategoryName('')
  }

  const handleCommitRenameCategory = async () => {
    if (cancelRenameRef.current || editingCategoryId === null) return
    const id = editingCategoryId
    const current = defs.find((d) => d.id === id)
    if (current && current.name === editingCategoryName.trim()) {
      handleCancelRenameCategory()
      return
    }
    if (await applyCategoryChange((list) => renameCategory(list, id, editingCategoryName))) {
      handleCancelRenameCategory()
    }
  }

  const handleToggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    await updateTheme(newTheme)
  }

  const handleEditEventCategory = (category: EventCategory) => {
    setEditingEventCategory(category)
    setEventCategoryName(category.name)
    setEventCategoryColor(category.color)
  }

  const handleCancelEditEventCategory = () => {
    setEditingEventCategory(null)
    setEventCategoryName('')
    setEventCategoryColor(DEFAULT_EVENT_CATEGORY_COLORS[0])
  }

  const handleSaveEventCategory = async () => {
    const trimmed = eventCategoryName.trim()
    if (!trimmed) return
    setSavingEventCategory(true)
    try {
      if (editingEventCategory) {
        await updateEventCategory(editingEventCategory.id, { name: trimmed, color: eventCategoryColor })
      } else {
        await addEventCategory({ name: trimmed, color: eventCategoryColor })
      }
      handleCancelEditEventCategory()
    } finally {
      setSavingEventCategory(false)
    }
  }

  const handleRemoveEventCategory = async (id: string) => {
    setRemovingEventCategory(id)
    try {
      await removeEventCategory(id)
      if (editingEventCategory?.id === id) handleCancelEditEventCategory()
    } finally {
      setRemovingEventCategory(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Configuracoes</h1>
          <p className="text-sm text-muted-foreground">Personalize o aplicativo</p>
        </div>
      </div>

      <BankConnections />

      {/* Grid layout para desktop */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Nomes das Abas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Nomes das Abas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="area1" className="text-xs">Aba 1</Label>
                <Input
                  id="area1"
                  value={tabNames.area1}
                  onChange={(e) => setTabNames((prev) => ({ ...prev, area1: e.target.value }))}
                  placeholder="Ex: Nirigue"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="area2" className="text-xs">Aba 2</Label>
                <Input
                  id="area2"
                  value={tabNames.area2}
                  onChange={(e) => setTabNames((prev) => ({ ...prev, area2: e.target.value }))}
                  placeholder="Ex: Nirigua"
                  className="h-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="piggy" className="text-xs">Poupanca</Label>
              <Input
                id="piggy"
                value={tabNames.piggy}
                onChange={(e) => setTabNames((prev) => ({ ...prev, piggy: e.target.value }))}
                placeholder="Ex: Porquinho"
                className="h-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notificacoes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-primary" />
              Notificacoes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Alertas de vencimento</p>
                <p className="text-xs text-muted-foreground truncate">
                  Receber alertas de contas proximas
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotifications((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                  notifications ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${
                    notifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="daysBefore" className="text-xs">Dias de antecedencia</Label>
              <Input
                id="daysBefore"
                type="number"
                min={0}
                max={30}
                value={daysBeforeDue}
                onChange={(e) => setDaysBeforeDue(Number(e.target.value))}
                className="h-9"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aparencia */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Moon className="h-4 w-4 text-primary" />
            Aparencia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Modo escuro</p>
              <p className="text-xs text-muted-foreground truncate">
                Ativar tema escuro no aplicativo
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleTheme}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                theme === 'dark' ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Categorias - full width */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="h-4 w-4 text-primary" />
            Categorias
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {activeCategories.length} {activeCategories.length === 1 ? 'categoria' : 'categorias'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {categoryError && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{categoryError}</span>
            </div>
          )}

          {/* Lista de categorias ativas como chips */}
          {activeCategories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeCategories.map((def) => (
                <div
                  key={def.id}
                  className="group flex items-center gap-1.5 px-3 py-1.5 bg-muted/70 hover:bg-muted rounded-full text-sm transition-colors"
                >
                  {editingCategoryId === def.id ? (
                    <Input
                      autoFocus
                      aria-label="Renomear categoria"
                      value={editingCategoryName}
                      onChange={(e) => {
                        setEditingCategoryName(e.target.value)
                        setCategoryError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleCommitRenameCategory()
                        } else if (e.key === 'Escape') {
                          e.preventDefault()
                          handleCancelRenameCategory()
                        }
                      }}
                      onBlur={handleCommitRenameCategory}
                      className="h-6 w-32 px-2 py-0 text-sm"
                    />
                  ) : (
                    <>
                      <span>{def.name}</span>
                      <button
                        type="button"
                        aria-label="Renomear categoria"
                        title="Renomear categoria"
                        className="p-0.5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        onClick={() => handleStartRenameCategory(def)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Arquivar categoria"
                        title="Arquivar categoria"
                        className="p-0.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => handleArchiveCategory(def.id)}
                        disabled={archivingCategory === def.id}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeCategories.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma categoria cadastrada
            </p>
          )}

          {/* Adicionar categoria */}
          <div className="flex gap-2 pt-2 border-t">
            <Input
              placeholder="Nova categoria..."
              value={newCategory}
              onChange={(e) => {
                setNewCategory(e.target.value)
                setCategoryError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddCategory()
                }
              }}
              className="h-9"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCategory}
              className="h-9 px-3"
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Categorias de Eventos - full width */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-primary" />
            Categorias de Eventos
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {eventCategories.length} {eventCategories.length === 1 ? 'categoria' : 'categorias'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {eventCategories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {eventCategories.map((category) => (
                <div
                  key={category.id}
                  className="group flex items-center gap-1.5 px-3 py-1.5 bg-muted/70 hover:bg-muted rounded-full text-sm transition-colors"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <span>{category.name}</span>
                  <button
                    type="button"
                    className="p-0.5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    onClick={() => handleEditEventCategory(category)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="p-0.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => handleRemoveEventCategory(category.id)}
                    disabled={removingEventCategory === category.id}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {eventCategories.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma categoria de evento cadastrada
            </p>
          )}

          {/* Adicionar/editar categoria de evento */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Nome da categoria..."
                value={eventCategoryName}
                onChange={(e) => setEventCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSaveEventCategory()
                  }
                }}
                className="h-9"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveEventCategory}
                disabled={savingEventCategory}
                className="h-9 px-3 shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                {editingEventCategory ? 'Salvar' : 'Adicionar'}
              </Button>
              {editingEventCategory && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEditEventCategory}
                  className="h-9 px-3 shrink-0"
                >
                  Cancelar
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_EVENT_CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setEventCategoryColor(color)}
                  style={{ backgroundColor: color }}
                  className={cn(
                    'w-6 h-6 rounded-full border-2 transition-all',
                    eventCategoryColor === color ? 'border-gray-700 scale-110' : 'border-transparent'
                  )}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botoes de acao */}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-11"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar'}
        </Button>
        <Button
          variant="destructive"
          onClick={signOut}
          className="h-11 px-4"
        >
          <LogOut className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Sair</span>
        </Button>
      </div>
    </div>
  )
}
