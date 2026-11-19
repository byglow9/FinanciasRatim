import * as React from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Nome acessivel do campo. */
  ariaLabel: string
  className?: string
}

/**
 * Campo de busca em pilula de 48px (type="search"). O botao de limpar (44px) so aparece com texto.
 */
const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ value, onChange, placeholder, ariaLabel, className }, ref) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null)
    const setRefs = (node: HTMLInputElement | null) => {
      innerRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    }

    return (
      <div className={cn("relative", className)}>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={setRefs}
          type="search"
          value={value}
          placeholder={placeholder}
          aria-label={ariaLabel}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full rounded-full border border-input bg-inset pl-12 pr-12 text-base text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {value ? (
          <button
            type="button"
            aria-label="Limpar busca"
            onClick={() => {
              onChange("")
              innerRef.current?.focus()
            }}
            className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    )
  }
)
SearchField.displayName = "SearchField"

export { SearchField }
