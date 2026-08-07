import { useState } from 'react'
import { useArea } from '@/contexts/AreaContext'
import { useAuth } from '@/contexts/AuthContext'
import { useEventCategories } from '@/hooks/useEventCategories'
import { updateSettings } from '@/services/settings.service'
import { getTransactionsByCategory } from '@/services/transactions.service'
import { getFixedExpensesByCategory } from '@/services/fixedExpenses.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { EventCategory } from '@/types'
import { DEFAULT_EVENT_CATEGORY_COLORS } from '@/types'
import { cn } from '@/lib/utils'
import { LogOut, Save, X, Plus, Pencil, AlertTriangle, Tag, CalendarDays, Bell, Moon, Users, Settings } from 'lucide-react'

export function SettingsPage() {
  const { settings, updateTabNames, updateCategories, updateTheme } = useArea()
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
  const [categories, setCategories] = useState<string[]>(settings.categories || [])
  const [newCategory, setNewCategory] = useState('')
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [removingCategory, setRemovingCategory] = useState<string | null>(null)
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
      await updateCategories(categories)
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

  const handleAddCategory = async () => {
    const trimmed = newCategory.trim()
    if (!trimmed) {
      setCategoryError('Nome da categoria nao pode ser vazio')
      return
    }
    const exists = categories.some(c => c.toLowerCase() === trimmed.toLowerCase())
    if (exists) {
      setCategoryError('Categoria ja existe')
      return
    }
    const newCategories = [...categories, trimmed]
    setCategories(newCategories)
    setNewCategory('')
    setCategoryError(null)
    // Salvar automaticamente
    await updateCategories(newCategories)
  }

  const handleRemoveCategory = async (categoryName: string) => {
    setCategoryError(null)
    setRemovingCategory(categoryName)
    try {
      const [transactions, fixedExpenses] = await Promise.all([
        getTransactionsByCategory(categoryName),
        getFixedExpensesByCategory(categoryName),
      ])
      if (transactions.length > 0) {
        setCategoryError(`Nao e possivel remover "${categoryName}" pois existem transacoes usando esta categoria.`)
        return
      }
      if (fixedExpenses.length > 0) {
        setCategoryError(`Nao e possivel remover "${categoryName}" pois existem contas fixas usando esta categoria.`)
        return
      }
      const newCategories = categories.filter(c => c !== categoryName)
      setCategories(newCategories)
      // Salvar automaticamente
      await updateCategories(newCategories)
    } finally {
      setRemovingCategory(null)
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
              {categories.length} {categories.length === 1 ? 'categoria' : 'categorias'}
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

          {/* Lista de categorias como chips */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <div
                  key={category}
                  className="group flex items-center gap-1.5 px-3 py-1.5 bg-muted/70 hover:bg-muted rounded-full text-sm transition-colors"
                >
                  <span>{category}</span>
                  <button
                    type="button"
                    className="p-0.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => handleRemoveCategory(category)}
                    disabled={removingCategory === category}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {categories.length === 0 && (
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
