import { useEffect, useMemo, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorBlock, TableSkeleton } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconInventory, IconPlus, IconSale } from '@/components/ui/Icons'
import { InventoryFilters } from '@/features/inventory/InventoryFilters'
import { InventoryTable } from '@/features/inventory/InventoryTable'
import { ProductDialog } from '@/features/inventory/ProductDialog'
import { api, errorMessage } from '@/services/api'
import { useAsync, useDebounced } from '@/hooks/useAsync'
import { useApp } from '@/hooks/appContext'
import { useToast } from '@/hooks/toastContext'
import { formatCurrency, formatNumber, plural } from '@/utils/format'
import { productLabel } from '@/utils/tire'
import type { Product, ProductFilters, ProductSortField } from '@/types'

const DEFAULT_FILTERS: ProductFilters = {
  search: '',
  category: 'all',
  brand: 'all',
  size: 'all',
  condition: 'all',
  stockLevel: 'all',
}

export function InventoryPage() {
  const { settings, revision, refresh, navigate, startSale, pendingCategory, clearPendingCategory } =
    useApp()
  const toast = useToast()

  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS)
  const [sortBy, setSortBy] = useState<ProductSortField>('updatedAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [editing, setEditing] = useState<Product | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Kommer man hit via ett kategorikort på dashboarden ska lagret öppnas filtrerat.
  useEffect(() => {
    if (!pendingCategory) return
    setFilters({ ...DEFAULT_FILTERS, category: pendingCategory })
    clearPendingCategory()
  }, [pendingCategory, clearPendingCategory])

  const debouncedSearch = useDebounced(filters.search ?? '')

  const query = useMemo(
    () => ({ ...filters, search: debouncedSearch, sortBy, sortDir }),
    [filters, debouncedSearch, sortBy, sortDir]
  )

  const products = useAsync(() => api.listProducts(query), [query, revision])
  const facets = useAsync(() => api.getFacets(), [revision])

  const items = products.data ?? []

  const totals = useMemo(
    () => ({
      tires: items.reduce((sum, product) => sum + product.quantity, 0),
      value: items.reduce((sum, product) => sum + product.quantity * product.purchasePrice, 0),
      salesValue: items.reduce((sum, product) => sum + product.quantity * product.sellingPrice, 0),
    }),
    [items]
  )

  const handleSort = (field: ProductSortField) => {
    if (field === sortBy) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortBy(field)
    setSortDir(field === 'brand' || field === 'location' || field === 'size' ? 'asc' : 'desc')
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await api.deleteProduct(pendingDelete.id)
      toast.success('Produkten togs bort', productLabel(pendingDelete))
      setPendingDelete(null)
      refresh()
    } catch (caught) {
      toast.error('Kunde inte ta bort produkten', errorMessage(caught))
    } finally {
      setDeleting(false)
    }
  }

  const hasActiveFilters = JSON.stringify({ ...filters, search: filters.search ?? '' }) !== JSON.stringify(DEFAULT_FILTERS)

  return (
    <>
      <Topbar
        title="Lager"
        subtitle={
          products.loading
            ? 'Hämtar lagret…'
            : `${plural(items.length, 'artikel', 'artiklar')} · ${formatNumber(totals.tires)} däck · lagervärde ${formatCurrency(totals.value, settings.currency)}`
        }
        actions={
          <>
            <Button icon={<IconSale size={15} />} onClick={() => startSale()}>
              Sälj
            </Button>
            <Button
              variant="primary"
              icon={<IconPlus size={16} />}
              onClick={() => {
                setEditing(null)
                setDialogOpen(true)
              }}
            >
              Lägg till däck
            </Button>
          </>
        }
      />

      <div className="page stack-16">
        <InventoryFilters
          filters={filters}
          facets={facets.data ?? { brands: [], sizes: [] }}
          resultCount={items.length}
          onChange={setFilters}
          onReset={() => setFilters(DEFAULT_FILTERS)}
        />

        {products.error && <ErrorBlock message={products.error} onRetry={products.reload} />}

        {products.loading && items.length === 0 && (
          <div className="card">
            <TableSkeleton />
          </div>
        )}

        {!products.loading && items.length === 0 && !products.error && (
          <div className="card">
            <EmptyState
              icon={<IconInventory size={24} />}
              title={hasActiveFilters ? 'Inga träffar' : 'Lagret är tomt'}
              text={
                hasActiveFilters
                  ? 'Prova att ändra sökningen eller rensa filtren.'
                  : 'Börja med att registrera de däck du har på hyllan.'
              }
              action={
                hasActiveFilters ? (
                  <Button onClick={() => setFilters(DEFAULT_FILTERS)}>Rensa filter</Button>
                ) : (
                  <Button variant="primary" icon={<IconPlus size={15} />} onClick={() => navigate('dack')}>
                    Lägg till däck
                  </Button>
                )
              }
            />
          </div>
        )}

        {items.length > 0 && (
          <>
            <InventoryTable
              products={items}
              currency={settings.currency}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
              onEdit={(product) => {
                setEditing(product)
                setDialogOpen(true)
              }}
              onSell={startSale}
              onDelete={setPendingDelete}
            />

            <div className="row-between muted" style={{ fontSize: 12.5, padding: '0 4px' }}>
              <span>
                Visar {plural(items.length, 'artikel', 'artiklar')} med {formatNumber(totals.tires)} däck
              </span>
              <span className="num">
                Lagervärde {formatCurrency(totals.value, settings.currency)} · Säljvärde{' '}
                {formatCurrency(totals.salesValue, settings.currency)}
              </span>
            </div>
          </>
        )}
      </div>

      <ProductDialog
        open={dialogOpen}
        product={editing}
        locations={facets.data?.locations ?? []}
        onClose={() => setDialogOpen(false)}
        onSaved={refresh}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Ta bort produkten?"
        destructive
        busy={deleting}
        confirmLabel="Ta bort"
        message={
          pendingDelete ? (
            <>
              <strong style={{ color: 'var(--text)' }}>{productLabel(pendingDelete)}</strong> (
              {pendingDelete.size}) tas bort ur lagret permanent.
              <br />
              Registrerade försäljningar finns kvar i historiken.
            </>
          ) : (
            ''
          )
        }
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}
