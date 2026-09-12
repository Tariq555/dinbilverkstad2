import { TIRE_CATEGORIES } from '@shared/constants'
import { CATEGORY_IMAGES } from '@/assets/categories'
import type { CategoryCount, TireCategoryId } from '@/types'
import { categoryColor, tireCategory } from '@/utils/tire'
import { formatNumber, plural } from '@/utils/format'

interface CategoryOverviewProps {
  counts: CategoryCount[]
  onSelect: (category: TireCategoryId) => void
}

/**
 * Däcklagret uppdelat på de fem kategorier en bilverkstad arbetar med.
 * Ett klick tar personalen direkt till lagret filtrerat på den kategorin.
 */
export function CategoryOverview({ counts, onSelect }: CategoryOverviewProps) {
  const byId = new Map(counts.map((count) => [count.id, count]))

  return (
    <div className="category-grid">
      {TIRE_CATEGORIES.map((category) => {
        const count = byId.get(category.id) ?? { products: 0, quantity: 0, value: 0 }

        return (
          <button
            key={category.id}
            type="button"
            className="category-card"
            style={{ '--category-color': categoryColor(category.id) } as React.CSSProperties}
            onClick={() => onSelect(category.id)}
            title={`Visa ${category.label.toLowerCase()} i lagret`}
          >
            <img
              className="category-card-image"
              src={CATEGORY_IMAGES[category.id]}
              alt=""
              loading="lazy"
              draggable={false}
            />
            <span className="category-card-accent" aria-hidden="true" />

            <span className="category-card-body">
              <span className="category-card-label">{category.label}</span>
              <span className="category-card-count num">
                {formatNumber(count.quantity)}
                <span className="category-card-unit">däck</span>
              </span>
              <span className="category-card-foot">
                {count.products === 0 ? 'Inga artiklar ännu' : plural(count.products, 'artikel', 'artiklar')}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Liten etikett som visar vilken kategori ett däck tillhör. */
export function CategoryBadge({ id }: { id: TireCategoryId }) {
  const category = tireCategory(id)
  if (!category) return null

  return (
    <span className="category-tag" style={{ '--category-color': categoryColor(id) } as React.CSSProperties}>
      {category.label}
    </span>
  )
}
