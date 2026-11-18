import { useEffect, useRef, useState } from "react"
import { Check } from "lucide-react"
import { Sheet } from "@/components/ui/sheet"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { MoneyKeypad, MoneyValue } from "@/components/ui/money-keypad"
import { useToast } from "@/components/ui/toast"
import { CategoryPicker } from "@/components/launcher/CategoryPicker"
import { useLaunch, type LaunchTab } from "@/contexts/LaunchContext"
import { useArea } from "@/contexts/AreaContext"
import { useAuth } from "@/contexts/AuthContext"
import { useCycle } from "@/contexts/CycleContext"
import { useCycleBudget } from "@/hooks/useCycleBudget"
import { addTransaction } from "@/services/transactions.service"
import type { PersonType } from "@/types"
import { categoryKind } from "@shared/core/categories.js"
import { fromCents } from "@shared/core/ledger.js"
import { formatMoney } from "@shared/core/format.js"
import { previewLaunch } from "@shared/core/budget.js"
import { zonedParts, zonedTimeToInstant } from "@shared/core/time.js"

const TAB_OPTIONS: { value: LaunchTab; label: string }[] = [
  { value: "gasto", label: "Gasto" },
  { value: "receita", label: "Receita" },
  { value: "porquinho", label: "Porquinho" },
]

type BudgetViewValue = ReturnType<typeof useCycleBudget>["view"]

interface LaunchFormProps {
  initialTab: LaunchTab
  person: PersonType
  view: BudgetViewValue
  onClose: () => void
}

/** Campo de texto, selecao ou conteudo editavel: o Enter dele nao aciona o CTA. */
function isTextTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
}

/**
 * Conteudo do sheet. Mora dentro do Sheet, que desmonta ao fechar: a cada abertura o estado
 * (valor, categoria, abas) nasce limpo.
 */
function LaunchForm({ initialTab, person, view, onClose }: LaunchFormProps) {
  const { categoryDefs } = useArea()
  const { bumpData } = useCycle()
  const toast = useToast()
  const rootRef = useRef<HTMLDivElement>(null)

  const [tab, setTab] = useState<LaunchTab>(initialTab)
  const [cents, setCents] = useState(0)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const kind = tab === "receita" ? "receita" : "gasto"
  const categories = categoryDefs.filter((d) => !d.archived && categoryKind(d) === kind)
  // Escolha derivada: sem escolha valida na aba, "outros" quando existir, senao a primeira.
  const category =
    categories.find((c) => c.id === pickedId) ??
    categories.find((c) => c.id === "outros") ??
    categories[0]

  const changeTab = (next: LaunchTab) => {
    setTab(next)
    setPickedId(null)
  }

  const preview = view ? previewLaunch(view, kind, cents) : null

  const submit = async () => {
    if (cents <= 0 || saving || !category) return
    setSaving(true)
    try {
      const parts = zonedParts(new Date())
      const date = zonedTimeToInstant(parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second)
      await addTransaction({
        person,
        type: "saida",
        amount: fromCents(cents),
        description: category.name,
        category: category.name,
        categoryId: category.id,
        date,
      })
      bumpData()
      onClose()
      toast.show(`Gasto lançado em ${category.name}: ${formatMoney(cents, { decimals: "always" })}`, {
        icon: Check,
      })
    } finally {
      setSaving(false)
    }
  }

  // Foco inicial na aba ativa: marca o elemento antes de o Sheet escolher o foco (efeito do filho roda primeiro).
  useEffect(() => {
    rootRef.current
      ?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
      ?.setAttribute("data-autofocus", "")
  }, [])

  // Enter aciona o CTA fora de campos de texto e de botoes (que ativam sozinhos).
  const submitRef = useRef(submit)
  useEffect(() => {
    submitRef.current = submit
  })
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.defaultPrevented) return
      if (isTextTarget(e.target)) return
      if (e.target instanceof HTMLElement && e.target.closest('button:not([role="tab"]), a, summary')) return
      e.preventDefault()
      void submitRef.current()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  const safeLine = view ? `Pode gastar: ${formatMoney(view.safeCents)}` : null
  const afterNegative = preview !== null && preview.safeAfterCents < 0

  return (
    <div ref={rootRef}>
      <div className="mt-3">
        <SegmentedControl<LaunchTab> value={tab} onChange={changeTab} options={TAB_OPTIONS} ariaLabel="Tipo de lançamento" />
      </div>

      <div className="mb-1 mt-4 text-center">
        <MoneyValue cents={cents} />
      </div>
      <p className="text-center text-xs font-normal text-muted-foreground">
        {tab === "gasto" && safeLine ? (
          <>
            {safeLine}
            {cents > 0 && preview ? (
              <>
                {" · "}
                <span className={afterNegative ? "text-danger-ink" : undefined}>
                  depois: {formatMoney(preview.safeAfterCents)}
                </span>
              </>
            ) : null}
          </>
        ) : null}
      </p>

      {category ? (
        <div className="mt-4">
          <p className="mb-1 text-xs font-bold text-muted-foreground">Categoria</p>
          <CategoryPicker categories={categories} value={category.id} onChange={setPickedId} />
        </div>
      ) : null}

      <MoneyKeypad valueCents={cents} onChange={setCents} enableHardwareKeys />

      <button
        type="button"
        aria-disabled={cents <= 0 || saving ? true : undefined}
        aria-busy={saving || undefined}
        onClick={() => void submit()}
        className="mt-3 h-14 w-full rounded-2xl bg-primary text-base font-bold text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {saving ? "Lançando..." : "Lançar gasto"}
      </button>
    </div>
  )
}

/**
 * Lancamento rapido em bottom sheet (UI-SPEC S3). Abre por useLaunch().open(aba); a montagem
 * no layout e do Plano 18. O preview do Pode gastar vem de previewLaunch sobre a BudgetView do
 * ciclo atual da pessoa logada.
 */
export function LaunchSheet() {
  const { isOpen, tab, close } = useLaunch()
  const { user } = useAuth()
  const { view } = useCycleBudget(user?.person ?? "ele", {
    enabled: isOpen && !!user,
    currentCycle: true,
  })

  return (
    <Sheet open={isOpen} onClose={close} title="Novo lançamento">
      {user ? <LaunchForm initialTab={tab} person={user.person} view={view} onClose={close} /> : null}
    </Sheet>
  )
}
