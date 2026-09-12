import { StockBadge } from '@/components/ui/Badge'
import { CategoryBadge } from '@/features/dashboard/CategoryOverview'
import { Button, IconButton } from '@/components/ui/Button'
import { IconEdit, IconSale, IconTrash } from '@/components/ui/Icons'
import { formatCurrency } from '@/utils/format'
import { conditionLabel, margin, stockStatus } from '@/utils/tire'
import type { Product, ProductSortField } from '@/types'

interface Column {
  key: ProductSortField | 'actions' | 'status' | 'margin'
  label: string
  sortable?: boolean
  align?: 'right'
}

const COLUMNS: Column[] = [
  { key: 'brand', label: 'Produkt', sortable: true },
  { key: 'size', label: 'Dimension', sortable: true },
  { key: 'season', label: 'Däcktyp', sortable: true },
  { key: 'quantity', label: 'Lagerstatus', sortable: true },
  { key: 'purchasePrice', label: 'Inköp', sortable: true, align: 'right' },
  { key: 'sellingPrice', label: 'Säljpris', sortable: true, align: 'right' },
  { key: 'location', label: 'Placering', sortable: true },
  { key: 'actions', label: '' },
]

interface InventoryTableProps {
  products: Product[]
  currency: string
  sortBy: ProductSortField
  sortDir: 'asc' | 'desc'
  onSort: (field: ProductSortField) => void
  onEdit: (product: Product) => void
  onSell: (product: Product) => void
  onDelete: (product: Product) => void
}

export function InventoryTable({
  products,
  currency,
  sortBy,
  sortDir,
  onSort,
  onEdit,
  onSell,
  onDelete,
}: InventoryTableProps) {
  return (
    <div className="table-wrap">
      <table className="data wide">
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                className={[
                  column.sortable ? 'sortable' : '',
                  column.align === 'right' ? 'right' : '',
                  column.key === 'actions' ? 'col-actions' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={column.sortable ? () => onSort(column.key as ProductSortField) : undefined}
              >
                {column.label}
                {column.sortable && sortBy === column.key && (
                  <span className="sort-mark">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const status = stockStatus(product)
            const marginPercent = margin(product.purchasePrice, product.sellingPrice)

            return (
              <tr key={product.id}>
                <td className="cell-product">
                  <div className="cell-strong">
                    {product.brand} {product.model}
                  </div>
                  <div className="cell-sub mono">
                    {product.sku} · {conditionLabel(product.condition)}
                  </div>
                </td>
                <td className="mono nowrap">{product.size}</td>
                <td>
                  <CategoryBadge id={product.tireType} />
                </td>
                <td>
                  <StockBadge status={status} quantity={product.quantity} />
                </td>
                <td className="right num muted">{formatCurrency(product.purchasePrice, currency)}</td>
                <td className="right">
                  <div className="num cell-strong">{formatCurrency(product.sellingPrice, currency)}</div>
                  <div
                    className="cell-sub num"
                    style={{ color: marginPercent >= 25 ? 'var(--success)' : 'var(--text-dim)' }}
                  >
                    {marginPercent.toFixed(0)} % marg.
                  </div>
                </td>
                <td className="muted nowrap">{product.location || '—'}</td>
                <td className="col-actions">
                  <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<IconSale size={14} />}
                      disabled={product.quantity <= 0}
                      onClick={() => onSell(product)}
                    >
                      Sälj
                    </Button>
                    <IconButton
                      label="Redigera"
                      icon={<IconEdit size={15} />}
                      onClick={() => onEdit(product)}
                    />
                    <IconButton
                      label="Ta bort"
                      icon={<IconTrash size={15} />}
                      onClick={() => onDelete(product)}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
