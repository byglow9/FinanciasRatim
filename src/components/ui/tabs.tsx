import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
  hasSlider: boolean
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  onValueChange: (value: string) => void
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, value, onValueChange, ...props }, ref) => (
    <TabsContext.Provider value={{ value, onValueChange, hasSlider: false }}>
      <div ref={ref} className={cn("", className)} {...props} />
    </TabsContext.Provider>
  )
)
Tabs.displayName = "Tabs"

const TabsSliderContext = React.createContext<boolean>(false)

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  activeIndex?: number
  itemCount?: number
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, activeIndex, itemCount = 3, children, ...props }, ref) => {
    const hasSlider = activeIndex !== undefined

    return (
      <TabsSliderContext.Provider value={hasSlider}>
        <div
          ref={ref}
          className={cn(
            "relative inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
            className
          )}
          {...props}
        >
          {/* Quadrado deslizante de fundo - só renderiza se activeIndex for passado */}
          {hasSlider && (
            <div
              className="absolute top-1 bottom-1 bg-background rounded-sm shadow-sm transition-all duration-300 ease-out"
              style={{
                width: `calc((100% - 8px) / ${itemCount})`,
                left: `calc(4px + ${activeIndex} * (100% - 8px) / ${itemCount})`
              }}
            />
          )}
          {children}
        </div>
      </TabsSliderContext.Provider>
    )
  }
)
TabsList.displayName = "TabsList"

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    const hasSlider = React.useContext(TabsSliderContext)
    if (!context) throw new Error("TabsTrigger must be used within Tabs")

    const isActive = context.value === value

    return (
      <button
        ref={ref}
        type="button"
        onClick={() => context.onValueChange(value)}
        className={cn(
          "relative z-10 inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          isActive && "text-foreground",
          !hasSlider && isActive && "bg-background shadow-sm",
          className
        )}
        {...props}
      />
    )
  }
)
TabsTrigger.displayName = "TabsTrigger"

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    if (!context) throw new Error("TabsContent must be used within Tabs")

    if (context.value !== value) return null

    return (
      <div
        ref={ref}
        className={cn(
          "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
        {...props}
      />
    )
  }
)
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
