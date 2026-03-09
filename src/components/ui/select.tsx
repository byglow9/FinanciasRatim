import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, Check } from "lucide-react"

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [isMobile, setIsMobile] = React.useState(false)
    const [internalValue, setInternalValue] = React.useState(props.value || props.defaultValue || '')
    const containerRef = React.useRef<HTMLDivElement>(null)
    const selectRef = React.useRef<HTMLSelectElement>(null)

    // Combine refs
    React.useImperativeHandle(ref, () => selectRef.current as HTMLSelectElement)

    React.useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 640)
      checkMobile()
      window.addEventListener('resize', checkMobile)
      return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Sync with external value changes
    React.useEffect(() => {
      if (props.value !== undefined) {
        setInternalValue(props.value)
      }
    }, [props.value])

    // Extract options from children
    const options = React.Children.toArray(children).filter(
      (child): child is React.ReactElement<React.OptionHTMLAttributes<HTMLOptionElement>> =>
        React.isValidElement(child) && child.type === 'option'
    )

    const currentValue = props.value !== undefined ? props.value : internalValue
    const selectedOption = options.find(opt => String(opt.props.value) === String(currentValue))
    const selectedLabel = selectedOption?.props.children || 'Selecione...'

    const handleSelect = (optionValue: string) => {
      setInternalValue(optionValue)

      // Update the hidden select and trigger change event
      if (selectRef.current) {
        selectRef.current.value = optionValue
        const event = new Event('change', { bubbles: true })
        selectRef.current.dispatchEvent(event)
      }

      setIsOpen(false)
    }

    // Close on click outside
    React.useEffect(() => {
      if (!isOpen) return
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen])

    // Desktop: use native select
    if (!isMobile) {
      return (
        <div className="relative">
          <select
            className={cn(
              "flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
            ref={selectRef}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
        </div>
      )
    }

    // Mobile: custom dropdown
    return (
      <div ref={containerRef} className="relative">
        {/* Hidden native select for form compatibility */}
        <select
          ref={selectRef}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          {...props}
        >
          {children}
        </select>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          disabled={props.disabled}
        >
          <span className={!currentValue ? "text-muted-foreground" : ""}>{selectedLabel}</span>
          <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute z-[100] mt-1 w-full rounded-xl border bg-background shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="max-h-[200px] overflow-y-auto py-1">
              {options.map((option, index) => {
                const optValue = String(option.props.value ?? '')
                const isSelected = optValue === String(currentValue)
                return (
                  <button
                    key={optValue || index}
                    type="button"
                    onClick={() => handleSelect(optValue)}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2.5 text-sm transition-colors",
                      isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                    )}
                  >
                    {option.props.children}
                    {isSelected && <Check className="h-4 w-4" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }
)
Select.displayName = "Select"

export { Select }
