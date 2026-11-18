import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, Eye, LogOut, User, type LucideIcon } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { useAuth } from '@/contexts/AuthContext'
import type { PersonType } from '@/types'

// Menu de perfil (S1, S7, IDEN-07, D-23): troca entre o proprio perfil e o do parceiro em somente
// leitura, e sai da conta. Os nomes vem sempre de settings.tabNames; o "(voce)" vai na pessoa do
// claim de quem esta logado. O modo somente leitura e derivado no AreaContext.

const ITEM =
  'flex min-h-11 w-full items-center gap-3 rounded-[14px] px-3 py-1 text-left hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function ProfileSwitcher() {
  const { user, signOut } = useAuth()
  const { currentArea, lastPerson, setCurrentArea, settings, readOnly } = useArea()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const own: PersonType = user?.person ?? 'ele'
  const partner: PersonType = own === 'ele' ? 'ela' : 'ele'
  const viewing: PersonType = currentArea === 'porquinho' ? lastPerson : currentArea

  const nameOf = (person: PersonType) =>
    person === 'ele' ? settings.tabNames.area1 : settings.tabNames.area2
  const ownName = nameOf(own)
  const partnerName = nameOf(partner)
  const viewingName = nameOf(viewing)
  const initial = Array.from(viewingName.trim())[0]?.toUpperCase() ?? '?'

  const triggerLabel = readOnly
    ? `Vendo o perfil de ${viewingName}. Trocar perfil`
    : `Perfil: ${viewingName}. Trocar perfil`

  function menuItems(): HTMLElement[] {
    return Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])
  }

  function close(returnFocus: boolean) {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    function onMouseDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  // Foco inicial no perfil que esta sendo visto.
  useEffect(() => {
    if (!open) return
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []
    )
    const checked = items.find((el) => el.getAttribute('aria-checked') === 'true')
    ;(checked ?? items[0])?.focus()
  }, [open])

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    // Enter e Espaco abrem pelo clique nativo do botao; a seta para baixo tambem abre.
    if (event.key === 'ArrowDown' && !open) {
      event.preventDefault()
      setOpen(true)
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
      return
    }
    if (event.key === 'Tab') {
      setOpen(false)
      return
    }
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(event.key)) return
    const items = menuItems()
    if (items.length === 0) return
    event.preventDefault()
    const at = items.indexOf(document.activeElement as HTMLElement)
    let next = at
    if (event.key === 'ArrowDown') next = at < 0 ? 0 : (at + 1) % items.length
    if (event.key === 'ArrowUp') next = at <= 0 ? items.length - 1 : at - 1
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = items.length - 1
    items[next].focus()
  }

  function choose(person: PersonType) {
    setCurrentArea(person)
    // Quem estava no Porquinho volta para o inicio ao escolher um perfil de pessoa.
    if (location.pathname === '/porquinho') navigate('/')
    close(true)
  }

  function leave() {
    setOpen(false)
    void signOut()
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerLabel}
        title={triggerLabel}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
        className="inline-flex h-11 items-center gap-1 rounded-full bg-card pl-2 pr-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          aria-hidden="true"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
        >
          {readOnly ? <Eye className="h-4 w-4" aria-hidden="true" /> : initial}
        </span>
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Perfil"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-50 mt-2 w-60 rounded-[20px] border border-border bg-surface-2 p-2 shadow-float"
        >
          <ProfileItem
            icon={User}
            title={`${ownName} (você)`}
            legend="seu perfil"
            checked={viewing === own}
            onSelect={() => choose(own)}
          />
          <ProfileItem
            icon={Eye}
            title={`Ver perfil de ${partnerName}`}
            legend="somente leitura"
            checked={viewing === partner}
            onSelect={() => choose(partner)}
          />
          <div className="mx-0 my-2 border-t border-border" role="separator" />
          <button type="button" role="menuitem" tabIndex={-1} onClick={leave} className={ITEM}>
            <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-base font-bold">Sair</span>
          </button>
        </div>
      )}
    </div>
  )
}

function ProfileItem({
  icon: Icon,
  title,
  legend,
  checked,
  onSelect,
}: {
  icon: LucideIcon
  title: string
  legend: string
  checked: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      tabIndex={-1}
      title={title}
      onClick={onSelect}
      className={ITEM}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-bold">{title}</span>
        <span className="block text-xs text-muted-foreground">{legend}</span>
      </span>
      {checked && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
    </button>
  )
}
