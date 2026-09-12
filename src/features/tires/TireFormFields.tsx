import { forwardRef } from 'react'
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field'
import { CONDITIONS, formatDimensionInput, normalizeDimension } from '@/utils/tire'
import { CategoryPicker } from './CategoryPicker'
import type { TireFormErrors, TireFormValues } from './tireForm'
import type { Condition } from '@/types'

interface TireFormFieldsProps {
  values: TireFormValues
  errors: TireFormErrors
  locations: string[]
  currency: string
  compact?: boolean
  onChange: (values: TireFormValues) => void
}

/**
 * Fälten delas av snabbinmatningen på Däck-sidan och redigeringsdialogen i Lager,
 * så att validering och beteende alltid är identiska.
 */
export const TireFormFields = forwardRef<HTMLInputElement, TireFormFieldsProps>(function TireFormFields(
  { values, errors, locations, currency, compact, onChange },
  brandRef
) {
  const set = <K extends keyof TireFormValues>(key: K, value: TireFormValues[K]) =>
    onChange({ ...values, [key]: value })

  const currencyHint = currency === 'SEK' ? 'kr' : currency

  return (
    <>
      <div className="form-grid form-grid-3">
        <Field label="Märke" required error={errors.brand}>
          <TextInput
            ref={brandRef}
            value={values.brand}
            onChange={(event) => set('brand', event.target.value)}
            placeholder="Michelin"
            autoComplete="off"
            invalid={Boolean(errors.brand)}
            spellCheck={false}
          />
        </Field>

        <Field label="Modell" error={errors.model}>
          <TextInput
            value={values.model}
            onChange={(event) => set('model', event.target.value)}
            placeholder="X-Ice Snow"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>

        <Field
          label="Dimension"
          required
          error={errors.size}
          hint={!errors.size ? 'Skriv bara siffrorna — 2055516 blir 205/55R16' : undefined}
        >
          <TextInput
            value={values.size}
            onChange={(event) => set('size', formatDimensionInput(event.target.value, values.size))}
            onBlur={(event) => set('size', normalizeDimension(event.target.value))}
            placeholder="205/55R16"
            inputMode="numeric"
            autoComplete="off"
            invalid={Boolean(errors.size)}
            spellCheck={false}
            className="mono"
          />
        </Field>
      </div>

      <div style={{ marginTop: 14 }}>
        <CategoryPicker
          value={values.category}
          error={errors.category}
          onChange={(category) => set('category', category)}
        />
      </div>

      <div className="form-grid form-grid-3" style={{ marginTop: 14 }}>
        <Field label="Skick">
          <Select
            value={values.condition}
            onChange={(event) => set('condition', event.target.value as Condition)}
          >
            {CONDITIONS.map((condition) => (
              <option key={condition.value} value={condition.value}>
                {condition.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Antal" required error={errors.quantity}>
          <TextInput
            type="number"
            min={0}
            step={1}
            value={values.quantity}
            onChange={(event) => set('quantity', event.target.value)}
            invalid={Boolean(errors.quantity)}
            className="num"
          />
        </Field>

        <Field label="Placering" hint="T.ex. hylla eller rum">
          <TextInput
            value={values.location}
            onChange={(event) => set('location', event.target.value)}
            placeholder="Lager A · Hylla 1"
            list="lager-platser"
            autoComplete="off"
          />
          <datalist id="lager-platser">
            {locations.map((location) => (
              <option key={location} value={location} />
            ))}
          </datalist>
        </Field>
      </div>

      <div className="form-grid form-grid-3" style={{ marginTop: 14 }}>
        <Field label={`Inköpspris (${currencyHint}/st)`} error={errors.purchasePrice}>
          <TextInput
            type="number"
            min={0}
            step={1}
            value={values.purchasePrice}
            onChange={(event) => set('purchasePrice', event.target.value)}
            placeholder="0"
            invalid={Boolean(errors.purchasePrice)}
            className="num"
          />
        </Field>

        <Field label={`Försäljningspris (${currencyHint}/st)`} error={errors.sellingPrice}>
          <TextInput
            type="number"
            min={0}
            step={1}
            value={values.sellingPrice}
            onChange={(event) => set('sellingPrice', event.target.value)}
            placeholder="0"
            invalid={Boolean(errors.sellingPrice)}
            className="num"
          />
        </Field>
      </div>

      <div className="form-grid form-grid-3" style={{ marginTop: 14 }}>
        <Field label="Gräns för lågt lager" error={errors.lowStockThreshold} hint="Varnar när saldot når hit">
          <TextInput
            type="number"
            min={0}
            step={1}
            value={values.lowStockThreshold}
            onChange={(event) => set('lowStockThreshold', event.target.value)}
            invalid={Boolean(errors.lowStockThreshold)}
            className="num"
          />
        </Field>

        {!compact && (
          <Field label="Anteckningar">
            <TextInput
              value={values.notes}
              onChange={(event) => set('notes', event.target.value)}
              placeholder="Mönsterdjup, skick, kund…"
              autoComplete="off"
            />
          </Field>
        )}
      </div>

      {compact && (
        <div style={{ marginTop: 14 }}>
          <Field label="Anteckningar">
            <TextArea
              value={values.notes}
              onChange={(event) => set('notes', event.target.value)}
              placeholder="Mönsterdjup, skick, kund…"
              rows={3}
            />
          </Field>
        </div>
      )}
    </>
  )
})
