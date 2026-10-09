import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react'
import { api, errMsg } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { BrandMark } from '../components/Logo'
import ThemeSwitch from '../components/ThemeSwitch'
import { ScoreRing } from '../components/ui'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export default function Login() {
  const navigate = useNavigate()
  const { persist } = useAuth()
  const toast = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState('')
  const [errors, setErrors] = useState({})
  const gsiRef = useRef(null)

  // Load Google Identity Services
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        auto_select: false,
      })
      window.google?.accounts.id.renderButton(document.getElementById('google-btn'), {
        type: 'standard', theme: 'outline', size: 'large', width: '100%',
        text: 'continue_with', shape: 'rectangular', logo_alignment: 'left',
      })
    }
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGoogleCredential = async (response) => {
    setGoogleLoading(true)
    setGoogleError('')
    try {
      const res = await api.post('/auth/google', { credential: response.credential })
      persist(res.data)
      toast.success('Welcome to Career Mirror AI', `Signed in as ${res.data.user.email}`)
      navigate(res.data.user.role === 'admin' ? '/admin' : '/app')
    } catch (err) {
      setGoogleError(errMsg(err, 'Google authentication failed.'))
    } finally {
      setGoogleLoading(false)
    }
  }

  const validate = () => {
    const e = {}
    if (!email.trim()) e.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) e.email = 'Invalid email address.'
    if (!password) e.password = 'Password is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email: email.trim(), password })
      persist(res.data)
      toast.success('Welcome back 👋', `Signed in as ${res.data.user.full_name}`)
      navigate(res.data.user.role === 'admin' ? '/admin' : '/app')
    } catch (err) {
      toast.error('Login failed', errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* ---------- LEFT: branding ---------- */}
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
            <div className="eyebrow">Welcome back</div>
            <h1 className="display-lg" style={{ margin: '14px 0 12px' }}>
              Your career deserves a <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>clear mirror.</span>
            </h1>
            <p className="lead">
              Compare your skills with real job requirements, discover what's missing,
              and follow a personalized path to your next role.
            </p>
          </motion.div>

          <motion.div
            className="auth-visual"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15 }}
          >
            <div className="flex" style={{ gap: 18 }}>
              <ScoreRing value={72} size={110} stroke={9} label="Match" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Resume vs Full Stack Developer</div>
                <div className="chip-row">
                  <span className="skill-chip matched">Python</span>
                  <span className="skill-chip matched">React</span>
                  <span className="skill-chip matched">MongoDB</span>
                  <span className="skill-chip partial">FastAPI</span>
                  <span className="skill-chip missing">Docker</span>
                  <span className="skill-chip missing">AWS</span>
                </div>
                <div className="small muted mt-8">Illustrative analysis — sample data</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="auth-benefits"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="auth-benefit"><CheckCircle2 /> Semantic skill matching — not just keywords</div>
            <div className="auth-benefit"><CheckCircle2 /> Learning roadmap built from your real gaps</div>
            <div className="auth-benefit"><CheckCircle2 /> What-if simulator: see your score grow</div>
          </motion.div>
        </div>
      </div>

      {/* ---------- RIGHT: form ---------- */}
      <div className="auth-right">
        <div style={{ position: 'absolute', top: 28, right: 32 }}>
          <ThemeSwitch />
        </div>
        <motion.div className="auth-card" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
          <h1>Sign in</h1>
          <p className="auth-sub">Access your career intelligence dashboard.</p>

          <form onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="login-email">Email address</label>
              <div className="input-wrap">
                <Mail size={17} />
                <input
                  id="login-email"
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!errors.email}
                />
              </div>
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="field">
              <div className="flex-between">
                <label htmlFor="login-password">Password</label>
                <Link to="/forgot-password" className="small" style={{ color: 'var(--accent)', fontWeight: 600 }}>Forgot password?</Link>
              </div>
              <div className="input-wrap">
                <KeyRound size={17} />
                <input
                  id="login-password"
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!errors.password}
                />
                <button type="button" className="input-toggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <button className="btn btn-royal btn-lg btn-block" type="submit" disabled={loading}>
              {loading ? <Loader2 size={17} className="spin" /> : 'Sign in'}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          {GOOGLE_CLIENT_ID && (
            <>
              <div className="auth-divider">or continue with</div>
              <div id="google-btn" style={{ minHeight: 44 }} />
              {googleLoading && (
                <div className="flex small muted mt-8" style={{ justifyContent: 'center', gap: 8 }}>
                  <Loader2 size={14} className="spin" /> Verifying Google account…
                </div>
              )}
            </>
          )}

          {!GOOGLE_CLIENT_ID && (
            <div style={{ marginTop: 22 }}>
              <div className="auth-divider">or continue with</div>
              <button className="btn btn-google btn-block" disabled title="Google login is disabled — add VITE_GOOGLE_CLIENT_ID and the backend GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET to enable it">
                <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.2 3.7-8.6z" />
                  <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.9-5.1l-3.9 3C3.2 21.3 7.3 24 12 24z" />
                  <path fill="#FBBC05" d="M5.1 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3l-3.9-3C.4 8.1 0 10 0 12s.4 3.9 1.2 5.3l3.9-3z" />
                  <path fill="#EA4335" d="M12 4.7c2.3 0 3.8 1 4.7 1.8l3.3-3.2C17.9 1.2 15.2 0 12 0 7.3 0 3.2 2.7 1.2 6.7l3.9 3c1-3 3.7-5 6.9-5z" />
                </svg>
                Google login unavailable — not configured
              </button>
              <p className="small muted mt-8" style={{ textAlign: 'center' }}>
                Set <span className="mono" style={{ fontSize: 12 }}>VITE_GOOGLE_CLIENT_ID</span> and the backend Google credentials to enable it.
              </p>
            </div>
          )}

          {googleError && <p className="field-error mt-16" style={{ justifyContent: 'center' }}>{googleError}</p>}

          <div className="auth-alt">
            New to Career Mirror AI? <Link to="/register">Create an account</Link>
          </div>

          <div className="flex small muted mt-16" style={{ justifyContent: 'center', gap: 7 }}>
            <ShieldCheck size={14} style={{ color: 'var(--accent)' }} /> Secured with JWT · bcrypt hashing
          </div>
        </motion.div>
      </div>
    </div>
  )
}
