import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, Mail, Send } from 'lucide-react'
import { api, errMsg } from '../services/api'
import { useToast } from '../context/ToastContext'
import { BrandMark } from '../components/Logo'
import ThemeSwitch from '../components/ThemeSwitch'

export default function ForgotPassword() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [devLink, setDevLink] = useState(null)

  const submit = async (ev) => {
    ev.preventDefault()
    setError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError('Invalid email address.')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() })
      setSent(true)
      if (res.data.dev_mode) {
        setDevLink(res.data.dev_link)
        toast.info('Development mode', 'SMTP is not configured — the reset link was logged to the backend console and shown here for testing.')
      } else {
        toast.success('Check your inbox', 'If that email is registered, a reset link is on its way.')
      }
    } catch (err) {
      toast.error('Request failed', errMsg(err))
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
            <div className="eyebrow">Account recovery</div>
            <h1 className="display-lg" style={{ margin: '14px 0 12px' }}>
              We'll get you <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>back in.</span>
            </h1>
            <p className="lead">
              Enter the email you registered with and we'll send a secure, single-use
              reset link. It expires after 60 minutes.
            </p>
          </motion.div>
          <motion.div className="auth-benefits" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            <div className="auth-benefit"><Mail size={15} /> Secure token-based reset</div>
            <div className="auth-benefit"><Send size={15} /> Delivered via SMTP</div>
            <div className="auth-benefit"><ArrowLeft size={15} /> Return to login anytime</div>
          </motion.div>
        </div>
      </div>

      <div className="auth-right">
        <div style={{ position: 'absolute', top: 28, right: 32 }}>
          <ThemeSwitch />
        </div>
        <motion.div className="auth-card" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 18, paddingLeft: 0 }} onClick={() => window.history.back()}>
            <ArrowLeft size={15} /> Back
          </button>
          <h1>Forgot password?</h1>
          <p className="auth-sub">No worries — we'll send you a reset link.</p>

          {!sent ? (
            <form onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="fp-email">Email address</label>
                <div className="input-wrap">
                  <Mail size={17} />
                  <input id="fp-email" className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} />
                </div>
                {error && <span className="field-error">{error}</span>}
              </div>
              <button className="btn btn-royal btn-lg btn-block" type="submit" disabled={loading}>
                {loading ? <Loader2 size={17} className="spin" /> : <Send size={16} />} Send reset link
              </button>
            </form>
          ) : (
            <div className="card card-pad" style={{ background: 'var(--success-soft)', borderColor: 'var(--success)' }}>
              <b style={{ color: 'var(--success)' }}>Request received</b>
              <p className="small mt-8" style={{ color: 'var(--ink-2)' }}>
                If <b>{email}</b> is registered, a password reset link has been sent.
              </p>
              {devLink && (
                <div className="mt-16" style={{ fontSize: 13, wordBreak: 'break-all' }}>
                  <div className="small muted">DEV MODE reset link (SMTP not configured):</div>
                  <a href={devLink} style={{ color: 'var(--accent)', fontWeight: 600 }}>{devLink}</a>
                </div>
              )}
            </div>
          )}

          <div className="auth-alt">
            Remembered it? <Link to="/login">Sign in</Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
