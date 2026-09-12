import { useEffect, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Select, TextInput } from '@/components/ui/Field'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  IconCheck,
  IconDatabase,
  IconDownload,
  IconImage,
  IconInfo,
  IconRefresh,
  IconTrash,
  IconUpload,
  IconWarning,
} from '@/components/ui/Icons'
import { api, errorMessage, isDesktopApp } from '@/services/api'
import { useAsync } from '@/hooks/useAsync'
import { useApp } from '@/hooks/appContext'
import { useToast } from '@/hooks/toastContext'
import workshopLogo from '@/assets/dinbilverkstad-logo.png'
import type { AppSettings, RestorePreview } from '@/types'

const CURRENCIES = ['SEK', 'EUR', 'NOK', 'DKK', 'USD']

export function SettingsPage() {
  const { settings, saveSettings, refresh } = useApp()
  const toast = useToast()

  const [draft, setDraft] = useState<AppSettings>(settings)
  const [saving, setSaving] = useState(false)
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  const appInfo = useAsync(() => api.getAppInfo(), [])

  useEffect(() => setDraft(settings), [settings])

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings)

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveSettings(draft)
      toast.success('Inställningarna sparade')
    } catch (caught) {
      toast.error('Kunde inte spara', errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  const handlePickLogo = async () => {
    try {
      const logo = await api.pickLogo()
      if (logo) {
        await saveSettings({ shopLogo: logo })
        toast.success('Logotypen uppdaterad')
      }
    } catch (caught) {
      toast.error('Kunde inte läsa bilden', errorMessage(caught))
    }
  }

  const handleBackup = async () => {
    try {
      const result = await api.createBackup()
      if (result.status === 'ok') toast.success('Backup skapad', result.path)
      else if (result.status === 'error') toast.error('Backup misslyckades', result.message)
    } catch (caught) {
      toast.error('Backup misslyckades', errorMessage(caught))
    }
  }

  const handlePickRestore = async () => {
    try {
      const preview = await api.pickRestoreFile()
      if (preview.status === 'cancelled') return
      if (preview.status === 'invalid') {
        toast.error('Ogiltig backupfil', preview.message)
        return
      }
      setRestorePreview(preview)
    } catch (caught) {
      toast.error('Kunde inte läsa filen', errorMessage(caught))
    }
  }

  const handleConfirmRestore = async () => {
    if (!restorePreview?.path) return
    setRestoring(true)
    try {
      const result = await api.confirmRestore(restorePreview.path)
      if (result.status === 'ok') {
        toast.success('Databasen återställd', 'En säkerhetskopia av den gamla databasen sparades.')
        setRestorePreview(null)
        refresh()
      } else {
        toast.error('Återställning misslyckades', result.message)
      }
    } catch (caught) {
      toast.error('Återställning misslyckades', errorMessage(caught))
    } finally {
      setRestoring(false)
    }
  }

  const handleClear = async () => {
    setResetting(true)
    try {
      await api.clearDatabase()
      toast.success('Databasen tömd', 'Lagret är nu tomt och redo för din egen data.')
      setClearOpen(false)
      refresh()
    } catch (caught) {
      toast.error('Kunde inte tömma databasen', errorMessage(caught))
    } finally {
      setResetting(false)
    }
  }

  const handleReset = async () => {
    setResetting(true)
    try {
      await api.resetDemoData()
      toast.success('Demodata laddad')
      setResetOpen(false)
      refresh()
    } catch (caught) {
      toast.error('Kunde inte nollställa', errorMessage(caught))
    } finally {
      setResetting(false)
    }
  }

  return (
    <>
      <Topbar
        title="Inställningar"
        subtitle="Butiksuppgifter, standardvärden och säkerhetskopior"
        actions={
          <Button
            variant={dirty ? 'primary' : 'default'}
            icon={dirty ? undefined : <IconCheck size={15} />}
            onClick={handleSave}
            loading={saving}
            disabled={!dirty}
          >
            {dirty ? 'Spara ändringar' : 'Allt sparat'}
          </Button>
        }
      />

      <div className="page page-narrow stack-16">
        {!isDesktopApp && (
          <div className="alert alert-info">
            <IconInfo size={16} />
            <span>
              Du tittar på webbförhandsvisningen med demodata i minnet. Backup, logotypval och
              databasen fungerar när appen körs som skrivbordsprogram.
            </span>
          </div>
        )}

        <Card title="Butik">
          <div className="form-grid">
            <Field label="Butikens namn" className="form-span-2">
              <TextInput
                value={draft.shopName}
                onChange={(event) => set('shopName', event.target.value)}
                placeholder="Din Bilverkstad"
              />
            </Field>

            <Field label="Logotyp" className="form-span-2" hint="PNG, JPG, SVG eller WEBP · max 2 MB">
              <div className="stack-8">
                <div className="logo-preview">
                  <img src={draft.shopLogo || workshopLogo} alt="Butikens logotyp" />
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <Button icon={<IconImage size={15} />} onClick={handlePickLogo}>
                    Välj bild…
                  </Button>
                  {draft.shopLogo && (
                    <Button
                      onClick={async () => {
                        await saveSettings({ shopLogo: '' })
                        toast.info('Standardlogotypen används igen')
                      }}
                    >
                      Ta bort
                    </Button>
                  )}
                </div>
              </div>
            </Field>

            <Field label="Valuta">
              <Select value={draft.currency} onChange={(event) => set('currency', event.target.value)}>
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card title="Standardvärden vid nytt däck">
          <div className="form-grid form-grid-3">
            <Field label="Antal" hint="Fylls i automatiskt">
              <TextInput
                type="number"
                min={0}
                className="num"
                value={draft.defaultQuantity}
                onChange={(event) => set('defaultQuantity', Number(event.target.value))}
              />
            </Field>
            <Field label="Inköpspris">
              <TextInput
                type="number"
                min={0}
                className="num"
                value={draft.defaultPurchasePrice}
                onChange={(event) => set('defaultPurchasePrice', Number(event.target.value))}
              />
            </Field>
            <Field label="Försäljningspris">
              <TextInput
                type="number"
                min={0}
                className="num"
                value={draft.defaultSellingPrice}
                onChange={(event) => set('defaultSellingPrice', Number(event.target.value))}
              />
            </Field>
            <Field label="Standardplacering" className="form-span-2">
              <TextInput
                value={draft.defaultLocation}
                onChange={(event) => set('defaultLocation', event.target.value)}
                placeholder="Lager A"
              />
            </Field>
            <Field label="Gräns för lågt lager" hint="Antal däck kvar innan varning">
              <TextInput
                type="number"
                min={0}
                className="num"
                value={draft.lowStockThreshold}
                onChange={(event) => set('lowStockThreshold', Number(event.target.value))}
              />
            </Field>
          </div>
        </Card>

        <Card title="Backup och återställning">
          <div className="stack-16">
            <div className="alert alert-info">
              <IconInfo size={16} />
              <span>
                All data ligger lokalt på den här datorn. Ta en backup regelbundet och spara den på
                en USB-sticka eller nätverksmapp.
              </span>
            </div>

            <div className="row wrap" style={{ gap: 10 }}>
              <Button icon={<IconDownload size={15} />} onClick={handleBackup}>
                Skapa backup
              </Button>
              <Button icon={<IconUpload size={15} />} onClick={handlePickRestore}>
                Återställ backup
              </Button>
            </div>

            <div className="form-grid">
              <Field label="Backupmapp" className="form-span-2" hint="Används för automatisk backup">
                <div className="row" style={{ gap: 8 }}>
                  <TextInput
                    value={draft.backupFolder}
                    readOnly
                    placeholder="Ingen mapp vald"
                    className="grow mono"
                    style={{ fontSize: 12.5 }}
                  />
                  <Button
                    onClick={async () => {
                      const folder = await api.pickBackupFolder()
                      if (folder) {
                        set('backupFolder', folder)
                        toast.success('Backupmapp vald', folder)
                      }
                    }}
                  >
                    Välj mapp…
                  </Button>
                </div>
              </Field>
            </div>

            <label className="row" style={{ gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={draft.autoBackupOnExit}
                onChange={(event) => set('autoBackupOnExit', event.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
              />
              <span>
                Skapa automatisk backup när programmet stängs
                <span className="dim" style={{ display: 'block', fontSize: 12 }}>
                  Kräver att en backupmapp är vald.
                </span>
              </span>
            </label>
          </div>
        </Card>

        <Card title="Databas">
          <div className="stack-16">
            <InfoRow
              icon={<IconDatabase size={15} />}
              label="Databasfil"
              value={appInfo.data?.databasePath ?? '—'}
            />
            <InfoRow
              icon={<IconCheck size={15} />}
              label="Version"
              value={`${appInfo.data?.version ?? '—'} · ${
                appInfo.data?.isPackaged ? 'installerad' : 'utvecklingsläge'
              }`}
            />
            <div className="divider" style={{ margin: 0 }} />
            <div className="row-between wrap" style={{ gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600 }}>Töm databasen</div>
                <div className="dim" style={{ fontSize: 12.5 }}>
                  Raderar demodata och all historik så att du kan börja med ditt eget lager.
                </div>
              </div>
              <Button variant="danger" icon={<IconTrash size={15} />} onClick={() => setClearOpen(true)}>
                Töm databasen
              </Button>
            </div>
            {/* Demodata är ett utvecklingsverktyg och visas inte i den installerade appen. */}
            {appInfo.data && !appInfo.data.isPackaged && (
              <div className="row-between wrap" style={{ gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Ladda demodata</div>
                  <div className="dim" style={{ fontSize: 12.5 }}>
                    Endast för utveckling. Ersätter lagret med exempeldata.
                  </div>
                </div>
                <Button variant="danger" icon={<IconRefresh size={15} />} onClick={() => setResetOpen(true)}>
                  Ladda demodata
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(restorePreview)}
        title="Återställ backup?"
        destructive
        busy={restoring}
        confirmLabel="Skriv över och återställ"
        message={
          <>
            <div className="alert alert-warning" style={{ marginBottom: 14 }}>
              <IconWarning size={16} />
              <span>Nuvarande lager och historik ersätts av innehållet i backupen.</span>
            </div>
            Backupen innehåller <strong style={{ color: 'var(--text)' }}>{restorePreview?.products} artiklar</strong>{' '}
            och <strong style={{ color: 'var(--text)' }}>{restorePreview?.sales} försäljningar</strong>.
            <div className="mono dim" style={{ fontSize: 12, marginTop: 10, wordBreak: 'break-all' }}>
              {restorePreview?.path}
            </div>
            <div style={{ marginTop: 12 }}>
              En säkerhetskopia av den nuvarande databasen sparas automatiskt innan återställningen.
            </div>
          </>
        }
        onConfirm={handleConfirmRestore}
        onCancel={() => setRestorePreview(null)}
      />

      <ConfirmDialog
        open={clearOpen}
        title="Tömma databasen?"
        destructive
        busy={resetting}
        confirmLabel="Ja, töm databasen"
        message={
          <>
            <div className="alert alert-warning" style={{ marginBottom: 14 }}>
              <IconWarning size={16} />
              <span>Allt lager och all försäljningshistorik raderas permanent.</span>
            </div>
            Använd det här när du är klar med demodatan och vill börja registrera ditt eget
            lager. Butiksinställningar och logotyp behålls. Ta gärna en backup först.
          </>
        }
        onConfirm={handleClear}
        onCancel={() => setClearOpen(false)}
      />

      <ConfirmDialog
        open={resetOpen}
        title="Ladda demodata?"
        destructive
        busy={resetting}
        confirmLabel="Ja, ladda demodata"
        message="Allt lager och all försäljningshistorik raderas och ersätts med exempeldata. Åtgärden går inte att ångra — ta en backup först om du vill spara nuvarande data."
        onConfirm={handleReset}
        onCancel={() => setResetOpen(false)}
      />
    </>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="row-between" style={{ gap: 16 }}>
      <span className="row muted" style={{ gap: 8, fontSize: 13 }}>
        {icon}
        {label}
      </span>
      <span className="mono dim" style={{ fontSize: 12, textAlign: 'right', wordBreak: 'break-all' }}>
        {value}
      </span>
    </div>
  )
}
