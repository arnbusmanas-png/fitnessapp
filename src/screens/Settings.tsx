import { CalendarPlus, Download, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Screen } from '../components/ui'
import { fmtClock, today } from '../lib/dates'
import { exportBackup, saveSettings, useSettings, useSyncState } from '../lib/store'
import { syncNow, type RepoSettings } from '../lib/sync'

const DEFAULTS: RepoSettings = { owner: 'arnbusmanas-png', repo: 'fitnessapp-data', token: '', branch: 'main' }

export function Settings() {
  const settings = useSettings()
  const sync = useSyncState()
  const [form, setForm] = useState<RepoSettings>()
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!form && settings !== undefined) setForm(settings ?? DEFAULTS)
  }, [settings, form])

  if (!form) return <Screen title="Settings">{null}</Screen>

  const set = (patch: Partial<RepoSettings>) => setForm({ ...form, ...patch })
  const connected = !!settings?.token
  const save = async () => {
    if (!form.owner.trim() || !form.repo.trim() || !form.token.trim()) {
      setErr('Owner, repo and access key are all needed.')
      return
    }
    setErr('')
    await saveSettings({ owner: form.owner.trim(), repo: form.repo.trim(), token: form.token.trim(), branch: form.branch?.trim() || 'main' })
  }
  const disconnect = async () => {
    await saveSettings(undefined)
    setForm({ ...form, token: '' })
  }
  const backup = async () => {
    const blob = await exportBackup()
    const file = new File([blob], `forma-backup-${today()}.json`, { type: 'application/json' })
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] }).catch(() => undefined)
    else window.open(URL.createObjectURL(blob), '_blank')
  }

  const status =
    sync.status === 'syncing'
      ? 'Syncing…'
      : sync.status === 'error'
        ? sync.message
        : sync.status === 'offline'
          ? 'Offline. Changes are saved on this phone and upload when you are back online.'
          : sync.status === 'unconfigured'
            ? 'Not connected.'
            : sync.at
              ? `Synced at ${fmtClock(sync.at)}.`
              : 'Connected.'

  return (
    <Screen title="Settings">
      <h1 className="h1">Settings</h1>

      <div className="h2">Data repo</div>
      <div className="card stack">
        <p className={`small ${sync.status === 'error' ? '' : 'muted'}`} style={sync.status === 'error' ? { color: 'var(--bad)' } : undefined}>
          {status}
        </p>
        <div className="grid2">
          <label className="field">
            <span>Owner</span>
            <input className="input" autoCapitalize="off" autoCorrect="off" value={form.owner} onChange={(e) => set({ owner: e.target.value })} />
          </label>
          <label className="field">
            <span>Repo</span>
            <input className="input" autoCapitalize="off" autoCorrect="off" value={form.repo} onChange={(e) => set({ repo: e.target.value })} />
          </label>
        </div>
        <label className="field">
          <span>Access key</span>
          <input
            className="input"
            type="password"
            autoComplete="off"
            autoCapitalize="off"
            placeholder={connected ? '•••••••• saved' : 'github_pat_…'}
            value={form.token}
            onChange={(e) => set({ token: e.target.value })}
          />
        </label>
        {err && <div className="error">{err}</div>}
        <div className="grid2">
          <button className="btn primary" onClick={save}>
            {connected ? 'Save' : 'Connect'}
          </button>
          <button className="btn" onClick={() => void syncNow()}>
            <RefreshCw size={16} /> Sync now
          </button>
        </div>
        {connected && (
          <button className="btn ghost sm" onClick={disconnect}>
            Disconnect this phone
          </button>
        )}
        <details className="small muted">
          <summary style={{ cursor: 'pointer' }}>How to create the access key</summary>
          <ol style={{ paddingLeft: 20, lineHeight: 1.55 }}>
            <li>
              On GitHub open{' '}
              <a className="accent" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
                Settings → Fine-grained tokens → Generate
              </a>
              .
            </li>
            <li>Name it "Forma phone", expiry up to a year.</li>
            <li>Repository access: Only select repositories → {form.repo || 'fitnessapp-data'}.</li>
            <li>Permissions → Repository → Contents: Read and write. Nothing else.</li>
            <li>Generate, copy, paste it above. It stays on this phone only.</li>
          </ol>
        </details>
      </div>

      <div className="h2">Reminders</div>
      <div className="card stack small">
        <p className="muted">
          iPhone doesn't let home-screen web apps send notifications without a server, so reminders come from iOS itself.
        </p>
        <div>
          <div className="bold">Shortcuts automations</div>
          <ol className="muted" style={{ paddingLeft: 20, lineHeight: 1.55, margin: '6px 0 0' }}>
            <li>Shortcuts → Automation → New Automation → Time of Day.</li>
            <li>04:25, Daily, Run Immediately.</li>
            <li>Action: Show Notification, "Morning check-in".</li>
            <li>Repeat for 19:30 "Evening check-in" and Sunday 18:45 "Weekly review, answer the coach".</li>
          </ol>
        </div>
        <a className="btn block" href={`${import.meta.env.BASE_URL}reminders.ics`}>
          <CalendarPlus size={17} /> Or add all three to Calendar
        </a>
      </div>

      <div className="h2">Backup</div>
      <div className="card">
        <p className="small muted">Everything already lives in your data repo. This is an extra copy.</p>
        <button className="btn block mt" onClick={backup}>
          <Download size={17} /> Export all logs
        </button>
      </div>

      <p className="tiny dim" style={{ textAlign: 'center', marginTop: 24 }}>
        Forma · code at github.com/arnbusmanas-png/fitnessapp
      </p>
    </Screen>
  )
}
