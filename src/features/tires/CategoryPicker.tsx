import { TIRE_CATEGORIES } from '@shared/constants'
import type { TireCategoryId } from '@/types'
import { categoryColor } from '@/utils/tire'

interface CategoryPickerProps {
  value: TireCategoryId
  onChange: (category: TireCategoryId) => void
  error?: string
}

/**
 * Däckvalet som stora klickbara kort istället för rullgardinsmenyer.
 * Ett val räcker — säsong och dubbning följer automatiskt med kategorin.
 */
export function CategoryPicker({ value, onChange, error }: CategoryPickerProps) {
  return (
    <div className="field">
      <span className="field-label">
        Däcktyp<span style={{ color: 'var(--accent)' }}>*</span>
      </span>

      <div className="category-picker" role="radiogroup" aria-label="Däcktyp">
        {TIRE_CATEGORIES.map((category) => {
          const selected = category.id === value
          return (
            <button
              key={category.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`category-option ${selected ? 'selected' : ''}`}
              style={{ '--category-color': categoryColor(category.id) } as React.CSSProperties}
              onClick={() => onChange(category.id)}
            >
              <span className="category-mark" aria-hidden="true" />
              <span className="category-label">{category.label}</span>
              <span className="category-desc">{category.description}</span>
            </button>
          )
        })}
      </div>

      {error && <span className="field-error">{error}</span>}
    </div>
  )
}
