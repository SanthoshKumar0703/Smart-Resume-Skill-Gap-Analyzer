import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'
import { api, errMsg } from '../services/api'
import { useToast } from '../context/ToastContext'
import { BrandMark } from '../components/Logo'
import ThemeSwitch from '../components/ThemeSwitch'
import { passwordStrength, STRENGTH_LABELS } from '../utils/helpers'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const token = params.get('token') || ''
  const emailParam = params.get('email') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const strength = passwordStrength(password)

  const submit = async (ev) => {
    ev.preventDefault()
    setError('')
    if (!token) { setError('This reset link is invalid or incomplete.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (!/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/.test(password)) { setError('Use upper-case, lower-case letters and a number.'); return }
    if (confirm !== password) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, email: emailParam, new_password: password })
      setDone(true)
      toast.success('Password updated', 'You can now sign in with your new password.')
      setTimeout(() => navigate('/login'), 1600)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell" style={{ minHeight: '100vh' }}>
      <div className="auth-left">
        <a href="/" className="auth-brand brand" aria-label="Career Mirror AI - home">
          <BrandMark size={40} />
          <span className="brand-text">
            <b>Career Mirror AI</b>
            <span>Smart Resume Skill Gap Analyzer</span>
          </span>
        </a>
        <div className="auth-left-content">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="eyebrow">Secure reset</div>
            <h1 className="display-lg" style={{ margin: '14px 0 12px' }}>
              Choose a <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>new password.</span>
            </h1>
            <p className="lead">
              Your reset token is single-use and expires after 60 minutes.
              Once set, all previous reset links are invalidated.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="auth-right">
        <div style={{ position: 'absolute', top: 28, right: 32 }}>
          <ThemeSwitch />
        </div>
        <motion.div className="auth-card" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}>
          <h1>Reset password</h1>
          <p className="auth-sub">
            {emailParam ? <>For <b>{emailParam}</b></> : 'Set a new password for your account.'}
          </p>

          {done ? (
            <div className="card card-pad" style={{ background: 'var(--success-soft)', borderColor: 'var(--success)' }}>
              <div className="flex" style={{ gap: 10, color: 'var(--success)', fontWeight: 700 }}>
                <CheckCircle2 size={20} /> Password updated successfully
              </div>
              <p className="small mt-8">Redirecting you to sign in…</p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="rp-password">New password</label>
                <div className="input-wrap">
                  <KeyRound size={17} />
                  <input id="rp-password" className="input" type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" className="input-toggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="pw-meter" data-strength={strength} aria-hidden="true"><span /><span /><span /><span /></div>
                <div className="pw-hint">{password ? `Strength: ${STRENGTH_LABELS[strength]}` : ''}</div>
              </div>
              <div className="field">
                <label htmlFor="rp-confirm">Confirm new password</label>
                <div className="input-wrap">
                  <KeyRound size={17} />
                  <input id="rp-confirm" className="input" type={showPw ? 'text' : 'password'} placeholder="Repeat your password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
              </div>
              {error && <span className="field-error" style={{ marginBottom: 12 }}>{error}</span>}
              <button className="btn btn-royal btn-lg btn-block" type="submit" disabled={loading}>
                {loading ? <Loader2 size={17} className="spin" /> : 'Update password'}
              </button>
            </form>
          )}

          <div className="auth-alt">
            <Link to="/login">Back to sign in</Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
