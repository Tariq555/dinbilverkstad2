import { Select, TextInput } from '@/components/ui/Field'
import { IconClose, IconSearch } from '@/components/ui/Icons'
import { CONDITIONS, TIRE_CATEGORIES } from '@/utils/tire'
import type { Condition, ProductFilters, StockLevel, TireCategoryId } from '@/types'

interface InventoryFiltersProps {
  filters: ProductFilters
  facets: { brands: string[]; sizes: string[] }
  resultCount: number
  onChange: (filters: ProductFilters) => void
  onReset: () => void
}

const STOCK_LEVELS: { value: StockLevel; label: string }[] = [
  { value: 'all', label: 'Alla lagernivåer' },
  { value: 'in-stock', label: 'I lager' },
  { value: 'low', label: 'Lågt lager' },
  { value: 'out', label: 'Slut i lager' },
]

export function InventoryFilters({
  filters,
  facets,
  resultCount,
  onChange,
  onReset,
}: InventoryFiltersProps) {
  const set = <K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) =>
    onChange({ ...filters, [key]: value })

  const activeCount = [
    filters.category,
    filters.brand,
    filters.size,
    filters.condition,
    filters.stockLevel,
  ].filter((value) => value && value !== 'all').length

  return (
    <div className="filter-bar">
      <div className="search">
        <IconSearch size={16} />
        <TextInput
          value={filters.search ?? ''}
          onChange={(event) => set('search', event.target.value)}
          placeholder="Sök märke, modell, dimension, artikelnr…"
          aria-label="Sök i lagret"
        />
      </div>

      <Select
        value={filters.category ?? 'all'}
        onChange={(event) => set('category', event.target.value as TireCategoryId | 'all')}
        aria-label="Däcktyp"
      >
        <option value="all">Alla däcktyper</option>
        {TIRE_CATEGORIES.map((category) => (
          <option key={category.id} value={category.id}>
            {category.label}
          </option>
        ))}
      </Select>

      <Select
        value={filters.brand ?? 'all'}
        onChange={(event) => set('brand', event.target.value)}
        aria-label="Märke"
      >
        <option value="all">Alla märken</option>
        {facets.brands.map((brand) => (
          <option key={brand} value={brand}>
            {brand}
          </option>
        ))}
      </Select>

      <Select
        value={filters.size ?? 'all'}
        onChange={(event) => set('size', event.target.value)}
        aria-label="Dimension"
      >
        <option value="all">Alla dimensioner</option>
        {facets.sizes.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </Select>

      <Select
        value={filters.stockLevel ?? 'all'}
        onChange={(event) => set('stockLevel', event.target.value as StockLevel)}
        aria-label="Lagernivå"
      >
        {STOCK_LEVELS.map((level) => (
          <option key={level.value} value={level.value}>
            {level.label}
          </option>
        ))}
      </Select>

      <Select
        value={filters.condition ?? 'all'}
        onChange={(event) => set('condition', event.target.value as Condition | 'all')}
        aria-label="Skick"
      >
        <option value="all">Ny & begagnad</option>
        {CONDITIONS.map((condition) => (
          <option key={condition.value} value={condition.value}>
            {condition.label}
          </option>
        ))}
      </Select>

      <div className="row grow" style={{ justifyContent: 'flex-end', gap: 10 }}>
        <span className="dim nowrap" style={{ fontSize: 12.5 }}>
          {resultCount} träffar
        </span>
        {activeCount > 0 && (
          <span className="chip">
            {activeCount} filter
            <button type="button" onClick={onReset} aria-label="Rensa filter">
              <IconClose size={12} />
            </button>
          </span>
        )}
      </div>
    </div>
  )
}
