import { useRef, useState } from 'react'
import { ChevronRight, LayoutGrid, Pencil, X } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { useAuth } from '@/contexts/AuthContext'
import { useCycle } from '@/contexts/CycleContext'
import { useEventCategories } from '@/hooks/useEventCategories'
import { Button } from '@/components/ui/button'
import { IconCircle } from '@/components/ui/icon-circle'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Notice } from '@/components/ui/notice'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { CategoryEditorSheet } from '@/components/settings/CategoryEditorSheet'
import { ColorPalette } from '@/components/settings/IconPicker'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { iconComponent } from '@/lib/categoryIcons'
import { cn } from '@/lib/utils'
import { DEFAULT_EVENT_CATEGORY_COLORS } from '@/types'
import type { CategoryDef, EventCategory } from '@/types'
import { categoryIcon, categoryKind } from '@shared/core/categories.js'
import { cycleOf } from '@shared/core/cycle.js'
import { formatMoney, plural } from '@shared/core/format.js'
import { limitForCycle } from '@shared/core/limits.js'

const READ_ONLY_HINT = 'Volte ao seu perfil para editar'
const EVENT_SAVE_FAILED = 'Não foi possível salvar. Confira a conexão e tente de novo.'
const EVENT_NAME_MAX = 40

type Tab = 'gasto' | 'receita' | 'calendario'

const TABS: { value: Tab; label: string }[] = [
  { value: 'gasto', label: 'Gastos' },
  { value: 'receita', label: 'Receitas' },
  { value: 'calendario', label: 'Calendário' },
]

interface EditorState {
  open: boolean
  mode: 'new' | 'edit'
  def?: CategoryDef
  kind: 'gasto' | 'receita'
}

/**
 * Cartão "Categorias" (UI-SPEC S5, cartão 2, CENT-05, D-12, D-21): Gastos, Receitas e Calendário.
 * O limite mensal só se edita aqui (no CategoryEditorSheet); a lista mostra o limite vigente no
 * ciclo atual da pessoa vista. A aba Calendário é o antigo cartão de categorias de evento,
 * apenas realocado (mesmo useEventCategories).
 */
export function CategoriesCard() {
  const { categoryDefs, personConfigFor, readOnly } = useArea()
  const { user } = useAuth()
  const { now, viewPerson: person } = useCycle()
  const {
    categories: eventCategories,
    add: addEventCategory,
    update: updateEventCategory,
    remove: removeEventCategory,
  } = useEventCategories()

  const [tab, setTab] = useState<Tab>('gasto')
  const [editor, setEditor] = useState<EditorState>({ open: false, mode: 'new', kind: 'gasto' })

  // Só de interface (Fase 8 aplica nas regras): perfil do parceiro, inclusive visto pelo Porquinho.
  const locked = readOnly || (!!user && user.person !== person)
  const config = personConfigFor(person)
  // Limite vigente no ciclo atual da pessoa editada (não no ciclo visto na tela).
  const cycleKey = cycleOf(now, config.salaryDay).key

  const listKind: 'gasto' | 'receita' = tab === 'receita' ? 'receita' : 'gasto'
  const rows = categoryDefs.filter((d) => !d.archived && categoryKind(d) === listKind)

  // Categorias de evento (aba Calendário): comportamento de antes, só realocado.
  const [editingEvent, setEditingEvent] = useState<EventCategory | null>(null)
  const [eventName, setEventName] = useState('')
  const [eventColor, setEventColor] = useState<string>(DEFAULT_EVENT_CATEGORY_COLORS[0])
  const [savingEvent, setSavingEvent] = useState(false)
  const [removingEvent, setRemovingEvent] = useState<string | null>(null)
  const [eventFailed, setEventFailed] = useState(false)
  const eventNameRef = useRef<HTMLInputElement>(null)

  const openNew = () => {
    if (tab === 'calendario') {
      eventNameRef.current?.focus()
      return
    }
    if (locked) return
    setEditor({ open: true, mode: 'new', kind: listKind })
  }

  const openEdit = (def: CategoryDef) => {
    if (locked) return
    setEditor({ open: true, mode: 'edit', def, kind: categoryKind(def) })
  }

  const resetEventForm = () => {
    setEditingEvent(null)
    setEventName('')
    setEventColor(DEFAULT_EVENT_CATEGORY_COLORS[0])
  }

  const startEditEvent = (category: EventCategory) => {
    setEditingEvent(category)
    setEventName(category.name)
    setEventColor(category.color)
    setEventFailed(false)
    eventNameRef.current?.focus()
  }

  const saveEvent = async () => {
    const trimmed = eventName.trim()
    if (!trimmed || savingEvent) return
    setSavingEvent(true)
    setEventFailed(false)
    try {
      if (editingEvent) {
        await updateEventCategory(editingEvent.id, { name: trimmed, color: eventColor })
      } else {
        await addEventCategory({ name: trimmed, color: eventColor })
      }
      resetEventForm()
    } catch {
      setEventFailed(true)
    } finally {
      setSavingEvent(false)
    }
  }

  const removeEvent = async (id: string) => {
    setRemovingEvent(id)
    setEventFailed(false)
    try {
      await removeEventCategory(id)
      if (editingEvent?.id === id) resetEventForm()
    } catch {
      setEventFailed(true)
    } finally {
      setRemovingEvent(null)
    }
  }

  const newDisabled = tab !== 'calendario' && locked

  return (
    <SettingsCard id="categorias" icon={LayoutGrid} title="Categorias" subtitle="Ícone, limite, gastos e receitas">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-normal text-muted-foreground">
          {tab === 'calendario'
            ? plural(eventCategories.length, 'categoria', 'categorias')
            : plural(rows.length, 'categoria', 'categorias')}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={openNew} disabled={newDisabled}>
          + Nova
        </Button>
      </div>

      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        options={TABS}
        ariaLabel="Tipo de categoria"
      />

      {tab !== 'calendario' ? (
        <>
          {rows.length === 0 ? (
            <p className="py-3 text-center text-xs font-normal text-muted-foreground">
              {listKind === 'gasto' ? 'Nenhuma categoria de gasto cadastrada' : 'Nenhuma categoria de receita cadastrada'}
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((def) => {
                const limit = listKind === 'gasto' ? limitForCycle(config.limits[def.id], cycleKey) : null
                return (
                  <li key={def.id}>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => openEdit(def)}
                      className={cn(
                        'flex min-h-14 w-full items-center gap-3 rounded-2xl bg-surface-2 px-4 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        locked && 'cursor-not-allowed opacity-60'
                      )}
                    >
                      <IconCircle icon={iconComponent(categoryIcon(def))} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-bold" title={def.name}>
                          {def.name}
                        </span>
                        {listKind === 'gasto' ? (
                          <span className="block text-xs font-normal text-muted-foreground">
                            {limit !== null ? 'limite mensal' : 'sem limite'}
                          </span>
                        ) : null}
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-base font-bold">
                        {listKind === 'gasto' ? (
                          limit !== null ? (
                            formatMoney(limit)
                          ) : (
                            <span className="text-muted-foreground">Definir</span>
                          )
                        ) : null}
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {locked ? <p className="text-xs font-normal text-muted-foreground">{READ_ONLY_HINT}</p> : null}
        </>
      ) : (
        <>
          {eventCategories.length === 0 ? (
            <p className="py-3 text-center text-xs font-normal text-muted-foreground">
              Nenhuma categoria de evento cadastrada
            </p>
          ) : (
            <ul className="space-y-2">
              {eventCategories.map((category) => (
                <li
                  key={category.id}
                  className="flex min-h-14 items-center gap-3 rounded-2xl bg-surface-2 py-1 pl-4 pr-1"
                >
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-base font-bold" title={category.name}>
                    {category.name}
                  </span>
                  <button
                    type="button"
                    aria-label={`Editar categoria de evento ${category.name}`}
                    onClick={() => startEditEvent(category)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Pencil className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remover categoria de evento ${category.name}`}
                    onClick={() => void removeEvent(category.id)}
                    disabled={removingEvent === category.id}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-danger-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 pt-2">
            <Label htmlFor="event-category-name">Nome da categoria</Label>
            <Input
              id="event-category-name"
              ref={eventNameRef}
              value={eventName}
              maxLength={EVENT_NAME_MAX}
              onChange={(e) => setEventName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void saveEvent()
                }
              }}
            />
            <ColorPalette value={eventColor} onChange={setEventColor} ariaLabel="Cor da categoria" />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => void saveEvent()}
                disabled={savingEvent || eventName.trim() === ''}
                aria-busy={savingEvent}
              >
                {editingEvent ? 'Salvar' : 'Adicionar'}
              </Button>
              {editingEvent ? (
                <Button type="button" variant="ghost" onClick={resetEventForm}>
                  Cancelar
                </Button>
              ) : null}
            </div>
            {eventFailed ? <Notice tone="danger">{EVENT_SAVE_FAILED}</Notice> : null}
          </div>
        </>
      )}

      <CategoryEditorSheet
        open={editor.open}
        onClose={() => setEditor((current) => ({ ...current, open: false }))}
        mode={editor.mode}
        def={editor.def}
        kind={editor.kind}
      />
    </SettingsCard>
  )
}
