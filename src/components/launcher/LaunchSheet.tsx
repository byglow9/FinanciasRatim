import { useEffect, useId, useRef, useState } from "react"
import { Check, ChevronDown, CircleAlert, CreditCard, Landmark, TriangleAlert } from "lucide-react"
import { Sheet } from "@/components/ui/sheet"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { MoneyKeypad, MoneyValue } from "@/components/ui/money-keypad"
import { useToast } from "@/components/ui/toast"
import { Notice } from "@/components/ui/notice"
import { Chip } from "@/components/ui/chip"
import { Collapsible } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CategoryPicker } from "@/components/launcher/CategoryPicker"
import { CardPicker } from "@/components/launcher/CardPicker"
import { useLaunch, type LaunchTab } from "@/contexts/LaunchContext"
import { useArea } from "@/contexts/AreaContext"
import { useAuth } from "@/contexts/AuthContext"
import { useCycle } from "@/contexts/CycleContext"
import { useVintem } from "@/contexts/VintemContext"
import { useCycleBudget } from "@/hooks/useCycleBudget"
import { useCards } from "@/hooks/useCards"
import { addTransaction, newTransactionId } from "@/services/transactions.service"
import { addSavingsTransaction, newSavingsId } from "@/services/savings.service"
import type { PersonType } from "@/types"
import { withTimeout } from "@shared/core/async.js"
import { categoryKind } from "@shared/core/categories.js"
import { cardChoices, manualCardFields } from "@shared/core/cardManual.js"
import { fromCents } from "@shared/core/ledger.js"
import { formatMoney, shortDate } from "@shared/core/format.js"
import { previewLaunch } from "@shared/core/budget.js"
import { zonedParts, zonedTimeToInstant } from "@shared/core/time.js"

const TAB_OPTIONS: { value: LaunchTab; label: string }[] = [
  { value: "gasto", label: "Gasto" },
  { value: "receita", label: "Receita" },
  { value: "porquinho", label: "Porquinho" },
]

// Prazo da gravacao (WR-08): o SDK nao rejeita quando a conexao cai depois do envio; sem prazo o
// botao ficaria em "Lancando..." sem fim.
const SAVE_TIMEOUT_MS = 8000

type PiggyMode = "deposito" | "saque"
type Payment = "conta" | "cartao"

const PIGGY_OPTIONS: { value: PiggyMode; label: string }[] = [
  { value: "deposito", label: "Guardar" },
  { value: "saque", label: "Retirar" },
]

const CTA_LABEL: Record<LaunchTab, string> = {
  gasto: "Lançar gasto",
  receita: "Lançar receita",
  porquinho: "Guardar no Porquinho",
}

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

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

/** Data de calendario de Sao Paulo no formato do campo de data (aaaa-mm-dd). */
function dateInputOf(parts: { year: number; month: number; day: number }): string {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`
}

/**
 * Conteudo do sheet. Mora dentro do Sheet, que desmonta ao fechar: a cada abertura o estado
 * (valor, categoria, abas) nasce limpo.
 */
function LaunchForm({ initialTab, person, view, onClose }: LaunchFormProps) {
  const { categoryDefs } = useArea()
  const { bumpData, isCurrent } = useCycle()
  const toast = useToast()
  const vintem = useVintem()
  const rootRef = useRef<HTMLDivElement>(null)
  const detailsId = useId()
  const descriptionId = useId()
  const dateId = useId()
  const noteId = useId()

  const [tab, setTab] = useState<LaunchTab>(initialTab)
  const [cents, setCents] = useState(0)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [piggyMode, setPiggyMode] = useState<PiggyMode>("deposito")
  const [payment, setPayment] = useState<Payment>("conta")
  const [pickedCardId, setPickedCardId] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [description, setDescription] = useState("")
  const [dateInput, setDateInput] = useState(() => dateInputOf(zonedParts(new Date())))
  const [note, setNote] = useState("")
  const [attempted, setAttempted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState<"erro" | "timeout" | null>(null)
  // ID de documento gerado no cliente UMA vez por montagem do formulario e reaproveitado em toda
  // tentativa (WR-08): se a primeira gravacao chegou ao servidor, a nova tentativa sobrescreve o
  // mesmo documento e o gasto nao duplica.
  const docIds = useRef<{ tx?: string; savings?: string }>({})

  const kind = tab === "receita" ? "receita" : "gasto"
  const categories = categoryDefs.filter((d) => !d.archived && categoryKind(d) === kind)
  // Escolha derivada: sem escolha valida na aba, "outros" quando existir, senao a primeira.
  const category =
    categories.find((c) => c.id === pickedId) ??
    categories.find((c) => c.id === "outros") ??
    categories[0]

  // Cartoes do perfil (D-12): so a aba Gasto oferece cartao; a fatura e os limites sao do nucleo.
  const { cards, loading: cardsLoading } = useCards()
  const choices = cardChoices(cards, person)
  const pickedStillThere = pickedCardId === null || choices.some((c) => c.id === pickedCardId)
  // Escolha derivada: o cartao tocado quando ainda existe, senao o primeiro (com um so, vai direto).
  const cardId = choices.find((c) => c.id === pickedCardId)?.id ?? choices[0]?.id
  const onCard = tab === "gasto" && payment === "cartao" && !!cardId
  const cardLabel = choices.find((c) => c.id === cardId)?.label ?? ""
  const cardReason = cardsLoading ? "Carregando os cartões" : "Nenhum cartão conectado neste perfil"

  // Cartao que sumiu (ou perfil sem cartao): o pagamento volta para Conta.
  useEffect(() => {
    if (payment === "cartao" && (choices.length === 0 || !pickedStillThere)) {
      setPayment("conta")
      setPickedCardId(null)
    }
  }, [payment, choices.length, pickedStillThere])

  // Troca de aba: categoria e campos de detalhe recomecam; o valor digitado se mantem.
  const changeTab = (next: LaunchTab) => {
    setTab(next)
    setPickedId(null)
    setPayment("conta")
    setPickedCardId(null)
    setDescription("")
    setNote("")
    setAttempted(false)
    setFailed(null)
  }

  const preview = view ? previewLaunch(view, tab, cents) : null
  const zeroMessage = attempted && cents <= 0

  // Retorna sem fazer nada quando vem do Enter com o CTA desabilitado.
  const submit = async (fromKeyboard = false) => {
    if (saving) return
    if (cents <= 0) {
      if (!fromKeyboard) setAttempted(true)
      return
    }
    if (tab !== "porquinho" && !category) return
    setSaving(true)
    setFailed(null)
    try {
      // Gravacao so online (PR-20): sem rede o envio falharia sem resposta e ficaria na fila.
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        throw new Error("offline")
      }
      const now = new Date()
      const nowParts = zonedParts(now)
      const today = dateInputOf(nowParts)
      const chosen = /^\d{4}-\d{2}-\d{2}$/.test(dateInput) ? dateInput : today
      const [year, month, day] = chosen.split("-").map(Number)
      const date = zonedTimeToInstant(year, month, day, nowParts.hour, nowParts.minute, nowParts.second)
      const money = formatMoney(cents, { decimals: "always" })
      const typed = description.trim()
      let message: string
      let detail: string | undefined

      if (tab === "porquinho") {
        const savingsId = (docIds.current.savings ??= newSavingsId())
        await withTimeout(
          addSavingsTransaction(
            {
              type: piggyMode,
              amount: fromCents(cents),
              description: typed || (piggyMode === "deposito" ? "Guardado" : "Retirado"),
              person,
              date,
            },
            savingsId
          ),
          SAVE_TIMEOUT_MS
        )
        message = piggyMode === "deposito" ? `Guardado no Porquinho: ${money}` : `Retirado do Porquinho: ${money}`
        detail = "O Pode gastar não mudou."
      } else if (category) {
        const typedNote = note.trim()
        const txId = (docIds.current.tx ??= newTransactionId())
        // Gasto no cartao so acrescenta cardId e cardKind; nunca billMonth, cardStatus nem source.
        const cardFields = onCard ? manualCardFields(cardId) : null
        await withTimeout(
          addTransaction(
            {
              person,
              type: tab === "gasto" ? "saida" : "entrada",
              amount: fromCents(cents),
              description: typed || category.name,
              // category (texto) e categoryId seguem juntos durante a transicao (D-07 da Fase 1).
              category: category.name,
              categoryId: category.id,
              date,
              ...(typedNote ? { note: typedNote } : {}),
              ...cardFields,
            },
            txId
          ),
          SAVE_TIMEOUT_MS
        )
        if (tab === "gasto" && cardFields) {
          message = `Gasto lançado no cartão ${cardLabel} em ${category.name}: ${money}`
          detail = "Não baixa o saldo da conta; conta no Pode gastar."
        } else {
          message = tab === "gasto" ? `Gasto lançado em ${category.name}: ${money}` : `Receita lançada: ${money}`
        }
      } else {
        return
      }

      // Ciclo passado na tela: o lancamento entra com a data de hoje e o toast avisa (PR-12).
      if (!isCurrent && chosen === today) {
        const aviso = `Lançado em ${shortDate(nowParts)}, fora do ciclo que você está vendo`
        detail = detail ? `${detail} ${aviso}` : aviso
      }

      bumpData()
      onClose()
      toast.show(message, { icon: Check, detail })
      // A view e a anterior ao lancamento (gasto ainda nao somado). Nao bloqueia: a reacao e melhor esforco.
      void vintem.onLaunched({
        kind:
          tab === "gasto"
            ? "gasto"
            : tab === "receita"
              ? "receita"
              : piggyMode === "deposito"
                ? "porquinho-guardou"
                : "porquinho-retirou",
        categoryId: tab === "porquinho" ? null : category?.id,
        cents,
        view,
        person,
      })
    } catch (err) {
      // Nada de valor ou descricao em log: so o aviso na tela, com os digitos preservados.
      setFailed(err instanceof Error && (err as Error & { code?: string }).code === "timeout" ? "timeout" : "erro")
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
      void submitRef.current(true)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  const afterNegative = preview !== null && preview.safeAfterCents < 0
  const ctaLabel = saving
    ? "Lançando..."
    : tab === "porquinho" && piggyMode === "saque"
      ? "Retirar do Porquinho"
      : CTA_LABEL[tab]

  return (
    <div ref={rootRef}>
      <div className="mt-2 [@media(max-height:700px)]:mt-1">
        <SegmentedControl<LaunchTab>
          value={tab}
          onChange={changeTab}
          options={TAB_OPTIONS}
          ariaLabel="Tipo de lançamento"
        />
      </div>

      <div className="mt-2 [@media(max-height:700px)]:mt-1 text-center">
        <MoneyValue cents={cents} fitShort />
      </div>
      {/* Uma linha so: o aviso de valor zero ocupa o lugar da legenda (poupa 16px de altura). */}
      <p
        aria-live="polite"
        className={cn(
          "min-h-4 text-center text-xs",
          zeroMessage ? "font-bold text-danger-ink" : "font-normal text-muted-foreground"
        )}
      >
        {zeroMessage ? "Digite um valor maior que zero" : null}
        {!zeroMessage && tab === "gasto" && view ? (
          <>
            Pode gastar: {formatMoney(view.safeCents)}
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
        {!zeroMessage && tab === "receita"
          ? `Entra na renda do ciclo${preview?.raisesSafe ? " e aumenta o Pode gastar" : ""}`
          : null}
        {!zeroMessage && tab === "porquinho"
          ? piggyMode === "deposito"
            ? "Guardar não é gasto: o Pode gastar não muda"
            : "Retirar não é receita: o Pode gastar não muda"
          : null}
      </p>

      {tab === "gasto" && preview?.overspends ? (
        <Notice tone="warn" icon={TriangleAlert} className="mt-2">
          Este gasto passa do que sobra no ciclo. Você pode lançar mesmo assim.
        </Notice>
      ) : null}

      {tab === "porquinho" ? (
        <div className="mt-2 flex justify-center">
          <SegmentedControl<PiggyMode>
            value={piggyMode}
            onChange={setPiggyMode}
            options={PIGGY_OPTIONS}
            ariaLabel="Guardar ou retirar"
            size="sm"
          />
        </div>
      ) : null}

      {tab !== "porquinho" ? (
        <div className="mt-2 [@media(max-height:700px)]:mt-1">
          {/* O rotulo da categoria e os chips de forma de pagamento dividem a mesma linha (so no Gasto). */}
          {tab === "gasto" ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-muted-foreground">Categoria</p>
              <div className="flex gap-2">
                <Chip
                  tone={onCard ? "neutral" : "selected"}
                  icon={Landmark}
                  pressed={!onCard}
                  onClick={() => setPayment("conta")}
                >
                  Conta
                </Chip>
                {/* Sem cartao no perfil o chip fica desabilitado e explica o motivo. */}
                <span title={choices.length === 0 ? cardReason : undefined} className="inline-flex">
                  <Chip
                    tone={onCard ? "selected" : choices.length === 0 ? "muted" : "neutral"}
                    icon={CreditCard}
                    pressed={onCard}
                    disabled={choices.length === 0}
                    onClick={() => setPayment("cartao")}
                  >
                    Cartão
                    {choices.length === 0 ? <span className="sr-only"> ({cardReason})</span> : null}
                  </Chip>
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs font-bold text-muted-foreground">Categoria</p>
          )}
          {onCard ? (
            <>
              <CardPicker choices={choices} value={cardId ?? ""} onChange={setPickedCardId} />
              <p className="mt-1 text-xs font-normal text-muted-foreground">
                Conta nos limites pela data da compra e não baixa o saldo até você pagar a fatura
              </p>
            </>
          ) : null}
          {category ? (
            <CategoryPicker categories={categories} value={category.id} onChange={setPickedId} />
          ) : null}
        </div>
      ) : null}

      <div className="mt-1 [@media(max-height:700px)]:mt-0">
        <button
          type="button"
          aria-expanded={detailsOpen}
          aria-controls={detailsId}
          onClick={() => setDetailsOpen((v) => !v)}
          className="flex min-h-11 w-full items-center justify-between rounded-2xl px-1 text-base font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Descrição, data e mais
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-200 ${detailsOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
        <Collapsible open={detailsOpen} id={detailsId}>
          <div className="space-y-3 px-1 pb-1 pt-2">
            <div className="space-y-1">
              <Label htmlFor={descriptionId}>Descrição</Label>
              <Input
                id={descriptionId}
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={dateId}>Data</Label>
              <Input id={dateId} type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)} />
            </div>
            {tab !== "porquinho" ? (
              <div className="space-y-1">
                <Label htmlFor={noteId}>Nota</Label>
                <Input
                  id={noteId}
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  autoComplete="off"
                />
              </div>
            ) : null}
          </div>
        </Collapsible>
      </div>

      <MoneyKeypad valueCents={cents} onChange={setCents} enableHardwareKeys />

      {failed ? (
        <Notice
          tone="danger"
          icon={CircleAlert}
          className="mt-2"
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => void submit()}>
              Tentar de novo
            </Button>
          }
        >
          {failed === "timeout"
            ? "Sem confirmação do servidor. Confira em Transações antes de tentar de novo."
            : "Não foi possível lançar. Confira a conexão e tente de novo."}
        </Notice>
      ) : null}

      <button
        type="button"
        aria-disabled={cents <= 0 || saving ? true : undefined}
        aria-busy={saving || undefined}
        onClick={() => void submit()}
        className="mt-2 [@media(max-height:700px)]:mt-1 h-14 w-full rounded-2xl bg-action text-base font-bold text-action-text [@media(max-height:760px)]:h-12 [@media(max-height:700px)]:h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-disabled:opacity-60"
      >
        {ctaLabel}
      </button>
    </div>
  )
}

/**
 * Lancamento rapido em bottom sheet (UI-SPEC S3). Abre por useLaunch().open(aba); a montagem
 * no layout e do Plano 18. O preview do Pode gastar vem de previewLaunch sobre a BudgetView do
 * ciclo atual da pessoa logada (nunca de uma formula local).
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
