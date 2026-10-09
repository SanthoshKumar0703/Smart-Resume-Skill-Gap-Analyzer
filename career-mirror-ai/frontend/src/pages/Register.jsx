import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Mail, ShieldCheck, User as UserIcon } from 'lucide-react'
import { api, errMsg } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { BrandMark } from '../components/Logo'
import ThemeSwitch from '../components/ThemeSwitch'
import { ScoreRing } from '../components/ui'
import { passwordStrength, STRENGTH_LABELS } from '../utils/helpers'

export default function Register() {
  const navigate = useNavigate()
  const { persist } = useAuth()
  const toast = useToast()

  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '', terms: false })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const strength = passwordStrength(form.password)

  const validate = () => {
    const e = {}
    if (form.fullName.trim().length < 2) e.fullName = 'Full name must be at least 2 characters.'
    if (!form.email.trim()) e.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = 'Invalid email address.'
    if (!form.password) e.password = 'Password is required.'
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters.'
    else if (!(/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/.test(form.password))) e.password = 'Use upper-case, lower-case and a number.'
    if (form.confirm !== form.password) e.confirm = 'Passwords do not match.'
    if (!form.terms) e.terms = 'You must accept the Terms & Conditions.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await api.post('/auth/register', {
        full_name: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        terms_accepted: form.terms,
      })
      persist(res.data)
      toast.success('Account created 🎉', `Welcome to Career Mirror AI, ${res.data.user.full_name}!`)
      navigate(res.data.user.role === 'admin' ? '/admin' : '/app')
    } catch (err) {
      toast.error('Registration failed', errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell" style={{ minHeight: '100vh' }}>
      {/* ---------- LEFT ---------- */}
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
            <div className="eyebrow">Start your journey</div>
            <h1 className="display-lg" style={{ margin: '14px 0 12px' }}>
              Find the exact path to <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>your next role.</span>
            </h1>
            <p className="lead">
              Analyze any resume against any job description and get a personalized,
              actionable skill-gap plan — free and powered by local AI.
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
                <div style={{ fontWeight: 700, marginBottom: 10 }}>What you get instantly</div>
                <div className="auth-benefits" style={{ gap: 9, marginTop: 0 }}>
                  <div className="auth-benefit"><CheckCircle2 /> Your true compatibility score</div>
                  <div className="auth-benefit"><CheckCircle2 /> Matched / partial / missing skills</div>
                  <div className="auth-benefit"><CheckCircle2 /> A phased learning roadmap</div>
                </div>
                <div className="small muted mt-8">Illustrative analysis — sample data</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ---------- RIGHT ---------- */}
      <div className="auth-right">
        <div style={{ position: 'absolute', top: 28, right: 32 }}>
          <ThemeSwitch />
        </div>
        <motion.div className="auth-card" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
          <h1>Create your account</h1>
          <p className="auth-sub">Takes less than a minute. No credit card required.</p>

          <form onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="reg-name">Full name</label>
              <div className="input-wrap">
                <UserIcon size={17} />
                <input id="reg-name" className="input" placeholder="Aarav Sharma" value={form.fullName} onChange={set('fullName')} aria-invalid={!!errors.fullName} />
              </div>
              {errors.fullName && <span className="field-error">{errors.fullName}</span>}
            </div>

            <div className="field">
              <label htmlFor="reg-email">Email address</label>
              <div className="input-wrap">
                <Mail size={17} />
                <input id="reg-email" className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} aria-invalid={!!errors.email} />
              </div>
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="field">
              <label htmlFor="reg-password">Password</label>
              <div className="input-wrap">
                <ShieldCheck size={17} />
                <input
                  id="reg-password"
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={set('password')}
                  aria-invalid={!!errors.password}
                />
                <button type="button" className="input-toggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="pw-meter" data-strength={strength} aria-hidden="true">
                <span /><span /><span /><span />
              </div>
              <div className="pw-hint">
                {form.password ? `Strength: ${STRENGTH_LABELS[strength]}` : 'Use 8+ characters with upper-case, lower-case and a number.'}
              </div>
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <div className="field">
              <label htmlFor="reg-confirm">Confirm password</label>
              <div className="input-wrap">
                <ShieldCheck size={17} />
                <input
                  id="reg-confirm"
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  value={form.confirm}
                  onChange={set('confirm')}
                  aria-invalid={!!errors.confirm}
                />
              </div>
              {errors.confirm && <span className="field-error">{errors.confirm}</span>}
            </div>

            <label className="checkline" style={{ marginBottom: 20 }}>
              <input
                type="checkbox"
                checked={form.terms}
                onChange={(e) => setForm((f) => ({ ...f, terms: e.target.checked }))}
              />
              <span>
                I agree to the <Link to="/terms" target="_blank" style={{ color: 'var(--accent)', fontWeight: 600 }}>Terms &amp; Conditions</Link> and{' '}
                <Link to="/privacy" target="_blank" style={{ color: 'var(--accent)', fontWeight: 600 }}>Privacy Policy</Link>.
              </span>
            </label>
            {errors.terms && <span className="field-error" style={{ marginBottom: 10 }}>{errors.terms}</span>}

            <button className="btn btn-royal btn-lg btn-block" type="submit" disabled={loading}>
              {loading ? <Loader2 size={17} className="spin" /> : 'Create account'}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <div className="auth-alt">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
