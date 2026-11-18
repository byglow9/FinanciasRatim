import { useState } from 'react'
import { isRuleError } from '@/lib/errors'
import { useArea } from '@/contexts/AreaContext'
import { useAuth } from '@/contexts/AuthContext'
import { useCycle } from '@/contexts/CycleContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MoneyKeypad, MoneyValue } from '@/components/ui/money-keypad'
import { Notice } from '@/components/ui/notice'
import { Sheet } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { ColorPalette, IconPicker } from '@/components/settings/IconPicker'
import { DEFAULT_EVENT_CATEGORY_COLORS } from '@/types'
import type { CategoryDef } from '@/types'
import {
  addCategory,
  archiveCategory,
  categoryIcon,
  renameCategory,
  resolveCategoryId,
  setCategoryMeta,
} from '@shared/core/categories.js'
import { cycleOf } from '@shared/core/cycle.js'
import { limitForCycle, setCategoryLimit } from '@shared/core/limits.js'

const READ_ONLY_HINT = 'Volte ao seu perfil para editar'
const SAVE_FAILED = 'Não foi possível salvar. Confira a conexão e tente de novo.'
const LIMIT_HELP = 'Vale para este ciclo e os próximos. Ciclos passados mantêm o limite da época.'
const NAME_MAX = 40

type Field = 'name' | 'icon' | 'limit'

// O núcleo lança mensagens sem acento; a tela mostra o mesmo erro em português correto, sob o campo certo.
const CORE_ERRORS: Record<string, { field: Field; text: string }> = {
  'Nome da categoria nao pode ser vazio': { field: 'name', text: 'Informe o nome da categoria.' },
  'Categoria ja existe': { field: 'name', text: 'Já existe uma categoria com esse nome.' },
  'Categoria nao encontrada': { field: 'name', text: 'Categoria não encontrada. Feche e abra de novo.' },
  'Categoria invalida': { field: 'name', text: 'Categoria inválida. Feche e abra de novo.' },
  'Icone invalido': { field: 'icon', text: 'Ícone inválido. Escolha um da lista.' },
  'Tipo invalido': { field: 'icon', text: 'Tipo de categoria inválido.' },
  'Limite invalido': { field: 'limit', text: 'Limite inválido. Use até R$ 999.999,99.' },
  'Ciclo invalido': { field: 'limit', text: 'Ciclo inválido. Feche e abra de novo.' },
}

const ZERO_LIMIT = 'Informe um limite maior que zero ou ligue "Sem limite".'

type FieldErrors = Partial<Record<Field, string>>

function coreError(err: unknown): FieldErrors {
  const message = err instanceof Error ? err.message : ''
  const known = CORE_ERRORS[message]
  return known ? { [known.field]: known.text } : { name: 'Valor inválido. Confira e tente de novo.' }
}

interface CategoryEditorSheetProps {
  open: boolean
  onClose: () => void
  mode: 'new' | 'edit'
  // Categoria editada (só em modo `edit`).
  def?: CategoryDef
  // Tipo da categoria: o limite mensal só existe em Gastos.
  kind: 'gasto' | 'receita'
}

/**
 * Editor de categoria (UI-SPEC S5, D-12, D-21): nome, ícone, cor e, só em Gastos, o limite mensal.
 * O limite é o único ponto de edição do app: grava pelo núcleo (setCategoryLimit) sobre a
 * configuração da pessoa vista, com a chave do ciclo atual dela (vale já neste ciclo, PR-09).
 * Passar do limite só avisa, nunca bloqueia (D-09). Arquivar nunca apaga (D-08).
 */
export function CategoryEditorSheet({ open, onClose, mode, def, kind }: CategoryEditorSheetProps) {
  const { categoryDefs, updateCategoryDefs, personConfigFor, updatePersonConfig, readOnly } = useArea()
  const { user } = useAuth()
  const { now, viewPerson: person, bumpData } = useCycle()
  const { show } = useToast()

  // Só de interface (Fase 8 aplica nas regras): perfil do parceiro, inclusive visto pelo Porquinho.
  const locked = readOnly || (!!user && user.person !== person)
  const config = personConfigFor(person)
  // Ciclo atual da pessoa editada, não o ciclo visto na tela.
  const cycleKey = cycleOf(now, config.salaryDay).key
  const hasLimit = kind === 'gasto'
  const initialLimit: number | null = def ? limitForCycle(config.limits[def.id], cycleKey) : null

  const [name, setName] = useState('')
  const [icon, setIcon] = useState('tag')
  const [color, setColor] = useState<string>(DEFAULT_EVENT_CATEGORY_COLORS[0])
  const [limitCents, setLimitCents] = useState(0)
  const [noLimit, setNoLimit] = useState(true)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmingArchive, setConfirmingArchive] = useState(false)

  // Recomeça o formulário a cada abertura (ajuste durante a renderização, sem efeito).
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setName(def?.name ?? '')
      setIcon(def ? categoryIcon(def) : 'tag')
      setColor(def?.color ?? DEFAULT_EVENT_CATEGORY_COLORS[0])
      setLimitCents(initialLimit ?? 0)
      setNoLimit(initialLimit === null)
      setErrors({})
      setFailed(false)
      setSaving(false)
      setConfirmingArchive(false)
    }
  }

  const clearFeedback = () => {
    setErrors({})
    setFailed(false)
  }

  const save = async () => {
    if (locked || saving) return
    const trimmed = name.trim()
    const nextLimit: number | null = hasLimit && !noLimit ? limitCents : null
    if (hasLimit && !noLimit && limitCents === 0) {
      setErrors({ limit: ZERO_LIMIT })
      return
    }

    // Regra de criar/editar aplicada sobre QUALQUER lista de definições. Roda sobre o snapshot (para
    // mostrar o erro sob o campo antes de gravar) e de novo, dentro da transação, sobre o documento
    // atual (WR-01). Pura: a transação pode repeti-la.
    const buildDefs = (defs: CategoryDef[]): { defs: CategoryDef[]; categoryId: string | null } => {
      if (mode === 'new') {
        const added = addCategory(defs, trimmed, color, { icon, kind })
        const id = resolveCategoryId(trimmed, added)
        // Reativar uma arquivada ignora a cor do addCategory; setCategoryMeta aplica a escolha.
        return { defs: id ? setCategoryMeta(added, id, { icon, color }) : added, categoryId: id }
      }
      if (!def) throw new Error('Categoria nao encontrada')
      const renamed = trimmed !== def.name ? renameCategory(defs, def.id, trimmed) : defs
      return { defs: setCategoryMeta(renamed, def.id, { icon, color }), categoryId: def.id }
    }

    if (mode === 'edit' && !def) return
    let categoryId: string | null
    try {
      categoryId = buildDefs(categoryDefs).categoryId
    } catch (err) {
      setErrors(coreError(err))
      setFailed(false)
      return
    }

    // O limite grava na configuração da pessoa só quando mudou (categoria nova parte de "sem limite").
    // Reativar uma arquivada pode trazer um limite antigo: compara com o vigente da própria categoria.
    const currentLimit = categoryId ? limitForCycle(config.limits[categoryId], cycleKey) : null
    const limitChanged = hasLimit && !!categoryId && nextLimit !== currentLimit
    if (limitChanged && categoryId) {
      try {
        setCategoryLimit(config, categoryId, cycleKey, nextLimit)
      } catch (err) {
        setErrors(coreError(err))
        setFailed(false)
        return
      }
    }

    setSaving(true)
    clearFeedback()
    try {
      // Configuração primeiro: um limite órfão (sem categoria) é inofensivo e a nova tentativa é idempotente.
      if (limitChanged && categoryId) {
        const limitCategoryId = categoryId
        await updatePersonConfig(person, (cur) => setCategoryLimit(cur, limitCategoryId, cycleKey, nextLimit))
      }
      await updateCategoryDefs((cur) => buildDefs(cur).defs)
    } catch (err) {
      setSaving(false)
      if (isRuleError(err)) {
        setErrors(coreError(err))
        setFailed(false)
      } else {
        setFailed(true)
      }
      return
    }
    // WR-03: um limite novo ou alterado muda os avisos; o avaliador roda de novo.
    if (limitChanged) bumpData()
    setSaving(false)
    onClose()
    show('Salvo')
  }

  const archive = async () => {
    if (locked || saving || !def) return
    const archivedId = def.id
    try {
      archiveCategory(categoryDefs, archivedId)
    } catch (err) {
      setConfirmingArchive(false)
      setErrors(coreError(err))
      return
    }
    setSaving(true)
    clearFeedback()
    try {
      await updateCategoryDefs((cur) => archiveCategory(cur, archivedId))
    } catch (err) {
      setConfirmingArchive(false)
      setSaving(false)
      if (isRuleError(err)) {
        setErrors(coreError(err))
      } else {
        setFailed(true)
      }
      return
    }
    setSaving(false)
    onClose()
    show('Salvo')
  }

  const title = mode === 'new' ? 'Nova categoria' : 'Editar categoria'

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="mt-4 space-y-4">
        <div>
          <Label htmlFor="category-name">Nome</Label>
          <Input
            id="category-name"
            data-autofocus={mode === 'new' && !locked ? '' : undefined}
            className="mt-1"
            value={name}
            maxLength={NAME_MAX}
            disabled={locked}
            aria-invalid={errors.name ? true : undefined}
            onChange={(e) => {
              setName(e.target.value)
              clearFeedback()
            }}
          />
          {errors.name ? (
            <p role="alert" className="mt-1 text-xs font-normal text-danger-ink">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div>
          <span className="text-base font-bold leading-snug">Ícone</span>
          <IconPicker
            value={icon}
            onChange={(next) => {
              setIcon(next)
              clearFeedback()
            }}
            disabled={locked}
          />
          {errors.icon ? (
            <p role="alert" className="mt-1 text-xs font-normal text-danger-ink">
              {errors.icon}
            </p>
          ) : null}
        </div>

        <div>
          <span className="text-base font-bold leading-snug">Cor</span>
          <ColorPalette value={color} onChange={setColor} disabled={locked} />
        </div>

        {hasLimit ? (
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-base font-bold leading-snug">Limite mensal</span>
              <span className="flex items-center gap-1">
                <Label htmlFor="category-no-limit" className="font-normal">
                  Sem limite
                </Label>
                <Switch
                  id="category-no-limit"
                  checked={noLimit}
                  disabled={locked}
                  onCheckedChange={(next) => {
                    setNoLimit(next)
                    clearFeedback()
                  }}
                />
              </span>
            </div>
            {noLimit ? null : (
              <>
                <div className="mt-2 text-center">
                  <MoneyValue cents={limitCents} />
                </div>
                {locked ? null : (
                  <MoneyKeypad
                    valueCents={limitCents}
                    onChange={(cents) => {
                      setLimitCents(cents)
                      clearFeedback()
                    }}
                    enableHardwareKeys={open}
                  />
                )}
              </>
            )}
            <p className="mt-2 text-xs font-normal text-muted-foreground">{LIMIT_HELP}</p>
            {errors.limit ? (
              <p role="alert" className="mt-1 text-xs font-normal text-danger-ink">
                {errors.limit}
              </p>
            ) : null}
          </div>
        ) : null}

        {locked ? <p className="text-xs font-normal text-muted-foreground">{READ_ONLY_HINT}</p> : null}
        {failed ? <Notice tone="danger">{SAVE_FAILED}</Notice> : null}

        {confirmingArchive && def ? (
          <div className="space-y-3">
            <Notice tone="warn">
              {`Arquivar ${def.name}? O histórico continua mostrando o nome e o limite da época. Para reativar, crie uma categoria com o mesmo nome.`}
            </Notice>
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              onClick={() => void archive()}
              disabled={saving}
              aria-busy={saving}
            >
              Arquivar
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => setConfirmingArchive(false)} disabled={saving}>
              Manter
            </Button>
          </div>
        ) : (
          <>
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => void save()}
              disabled={saving}
              aria-busy={saving}
              aria-disabled={locked || undefined}
            >
              Salvar categoria
            </Button>
            {mode === 'edit' && !locked ? (
              <button
                type="button"
                onClick={() => setConfirmingArchive(true)}
                className="h-12 w-full rounded-btn text-base font-bold text-danger-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Arquivar categoria
              </button>
            ) : null}
          </>
        )}
      </div>
    </Sheet>
  )
}
