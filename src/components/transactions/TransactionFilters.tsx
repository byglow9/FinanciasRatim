import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { Chip } from '@/components/ui/chip'
import { SearchField } from '@/components/ui/search-field'

export type TypeFilter = 'all' | 'saida' | 'entrada'

interface TransactionFiltersProps {
  query: string
  onQueryChange: (query: string) => void
  type: TypeFilter
  onTypeChange: (type: TypeFilter) => void
  /** Chave da categoria escolhida (id ou chave legada), ou null. */
  categoryKey: string | null
  onCategoryChange: (key: string | null) => void
  /** Categorias que tem lancamento no ciclo, na ordem de categoryDefs (categoriesPresent). */
  categories: { key: string; label: string }[]
}

const CHIP = 'shrink-0 whitespace-nowrap'

/**
 * Busca e chips de filtro fixos no topo ao rolar. A linha de chips rola por dentro, entao a
 * pagina nunca rola na horizontal. Um tipo por vez; a categoria combina com o tipo.
 */
export function TransactionFilters({
  query,
  onQueryChange,
  type,
  onTypeChange,
  categoryKey,
  onCategoryChange,
  categories,
}: TransactionFiltersProps) {
  const noFilter = type === 'all' && categoryKey === null

  return (
    <div
      className="sticky top-0 z-10 -mx-4 bg-background px-4 pb-2"
      style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}
    >
      <SearchField value={query} onChange={onQueryChange} placeholder="Buscar transação" ariaLabel="Buscar transação" />
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto py-1">
        <Chip
          className={CHIP}
          tone={noFilter ? 'selected' : 'neutral'}
          pressed={noFilter}
          onClick={() => {
            onTypeChange('all')
            onCategoryChange(null)
          }}
        >
          Tudo
        </Chip>
        <Chip
          className={CHIP}
          icon={ArrowUpRight}
          tone={type === 'saida' ? 'selected' : 'neutral'}
          pressed={type === 'saida'}
          onClick={() => onTypeChange(type === 'saida' ? 'all' : 'saida')}
        >
          Saídas
        </Chip>
        <Chip
          className={CHIP}
          icon={ArrowDownLeft}
          tone={type === 'entrada' ? 'selected' : 'neutral'}
          pressed={type === 'entrada'}
          onClick={() => onTypeChange(type === 'entrada' ? 'all' : 'entrada')}
        >
          Entradas
        </Chip>
        {categories.map((category) => {
          const pressed = categoryKey === category.key
          return (
            <Chip
              key={category.key}
              className={CHIP}
              tone={pressed ? 'selected' : 'neutral'}
              pressed={pressed}
              onClick={() => onCategoryChange(pressed ? null : category.key)}
            >
              {category.label}
            </Chip>
          )
        })}
      </div>
    </div>
  )
}
