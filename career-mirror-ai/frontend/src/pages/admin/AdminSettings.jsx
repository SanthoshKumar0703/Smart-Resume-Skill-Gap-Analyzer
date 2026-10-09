import { useEffect, useState } from 'react'
import { Info, Loader2, Save, Scale, Settings as SettingsIcon, ShieldCheck, ToggleLeft } from 'lucide-react'
import { api, errMsg } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Badge, PageHead, SkeletonCard } from '../../components/ui'

export default function AdminSettings() {
  const toast = useToast()
  const [settings, setSettings] = useState(null)
  const [weights, setWeights] = useState(null)
  const [site, setSite] = useState(null)
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    api.get('/admin/settings').then((res) => {
      setSettings(res.data.settings)
      setWeights(res.data.settings.scoring_weights)
      setSite(res.data.settings.site_options)
    }).catch(() => {})
  }, [])

  const saveWeights = async () => {
    const total = Object.values(weights).reduce((s, v) => s + (parseFloat(v) || 0), 0)
    if (Math.abs(total - 1) > 0.01) {
      toast.error('Weights must sum to 1.0', `Currently ${total.toFixed(2)}`)
      return
    }
    setSaving('weights')
    try {
      await api.put('/admin/settings', { key: 'scoring_weights', value: weights })
      toast.success('Scoring weights updated', 'New analyses will use these weights.')
    } catch (err) { toast.error('Save failed', errMsg(err)) } finally { setSaving(null) }
  }

  const saveSite = async () => {
    setSaving('site')
    try {
      await api.put('/admin/settings', { key: 'site_options', value: site })
      toast.success('Site options updated')
    } catch (err) { toast.error('Save failed', errMsg(err)) } finally { setSaving(null) }
  }

  if (!settings) {
    return (
      <div className="page-enter">
        <PageHead title="System Settings" sub="Scoring engine & platform options" />
        <SkeletonCard lines={6} />
      </div>
    )
  }

  const weightMeta = {
    required_skills: 'How heavily required skills count toward the score',
    preferred_skills: 'Weight of nice-to-have skills',
    experience: 'Years-of-experience match',
    education: 'Degree-level match',
    projects: 'Portfolio / project evidence',
    certifications: 'Requested certifications held',
  }

  return (
    <div className="page-enter">
      <PageHead title="System Settings" sub="Tune the intelligence engine and platform behaviour" />

      <div className="grid-2">
        <div className="card card-pad">
          <div className="card-title mb-8"><Scale size={16} /> Scoring weights</div>
          <p className="small muted mb-16">
            The overall match is a weighted sum of six factors. Weights must total 1.0.
            Changes apply to every new analysis.
          </p>
          {weights && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Object.entries(weights).map(([key, value]) => (
                <div key={key}>
                  <div className="flex-between small mb-6">
                    <b>{key.replace('_', ' ')}</b>
                    <span className="muted">{weightMeta[key]}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.7"
                    step="0.05"
                    value={value}
                    onChange={(e) => setWeights({ ...weights, [key]: parseFloat(e.target.value) })}
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                    aria-label={`Weight for ${key}`}
                  />
                  <div className="flex-between">
                    <span className="small muted">{key}</span>
                    <b className="mono" style={{ fontSize: 13 }}>{(value * 100).toFixed(0)}%</b>
                  </div>
                </div>
              ))}
              <div className="flex-between" style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--surface-2)' }}>
                <b className="small">Total</b>
                <b className="mono" style={{ color: Math.abs(Object.values(weights).reduce((s, v) => s + v, 0) - 1) < 0.01 ? 'var(--success)' : 'var(--danger)' }}>
                  {(Object.values(weights).reduce((s, v) => s + v, 0) * 100).toFixed(0)}%
                </b>
              </div>
              <button className="btn btn-royal" onClick={saveWeights} disabled={saving === 'weights'}>
                {saving === 'weights' ? <Loader2 size={15} className="spin" /> : <Save size={15} />} Save weights
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="card card-pad">
            <div className="card-title mb-8"><ToggleLeft size={16} /> Platform options</div>
            <p className="small muted mb-16">Control registration and maintenance behaviour.</p>
            {site && (
              <>
                {[
                  ['allow_registration', 'Allow new registrations', 'When off, only existing users can log in'],
                  ['maintenance_mode', 'Maintenance mode', 'When on, public pages show a maintenance notice'],
                ].map(([key, label, sub]) => (
                  <div key={key} className="flex-between" style={{ padding: '12px 0', borderBottom: '1px dashed var(--line)' }}>
                    <div>
                      <b style={{ fontSize: 14 }}>{label}</b>
                      <div className="small muted">{sub}</div>
                    </div>
                    <button
                      role="switch"
                      aria-checked={site[key]}
                      aria-label={label}
                      onClick={() => setSite({ ...site, [key]: !site[key] })}
                      className="theme-switch"
                      data-theme={site[key] ? 'dark' : 'light'}
                      style={{ width: 52, height: 28 }}
                    >
                      <span className="ts-knob" style={{ width: 21, height: 21, left: site[key] ? 26 : 3 }} />
                    </button>
                  </div>
                ))}
                <div className="field mt-16" style={{ marginBottom: 10 }}>
                  <label htmlFor="st-name">Site name</label>
                  <input id="st-name" className="input" value={site.site_name || ''} onChange={(e) => setSite({ ...site, site_name: e.target.value })} />
                </div>
                <div className="field" style={{ marginBottom: 10 }}>
                  <label htmlFor="st-tag">Tagline</label>
                  <input id="st-tag" className="input" value={site.tagline || ''} onChange={(e) => setSite({ ...site, tagline: e.target.value })} />
                </div>
                <button className="btn btn-royal" onClick={saveSite} disabled={saving === 'site'}>
                  {saving === 'site' ? <Loader2 size={15} className="spin" /> : <Save size={15} />} Save options
                </button>
              </>
            )}
          </div>

          <div className="card card-pad mt-24">
            <div className="card-title mb-16"><ShieldCheck size={16} /> Security posture</div>
            <div className="flex" style={{ gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <Badge kind="matched" dot>bcrypt password hashing</Badge>
              <Badge kind="matched" dot>JWT with expiry</Badge>
            </div>
            <div className="flex" style={{ gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <Badge kind="matched" dot>Role-based access</Badge>
              <Badge kind="matched" dot>Secrets via .env only</Badge>
            </div>
            <div className="flex" style={{ gap: 8, alignItems: 'flex-start', marginTop: 14 }}>
              <Info size={15} style={{ color: 'var(--accent-2)', flexShrink: 0, marginTop: 2 }} />
              <p className="small muted">
                The admin bootstrap email (<span className="mono">ADMIN_BOOTSTRAP_EMAIL</span>) promotes that account to
                admin on registration/login — development convenience only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
