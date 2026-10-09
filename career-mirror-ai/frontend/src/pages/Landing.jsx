import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Brain,
  Briefcase,
  CheckCircle2,
  FileText,
  GitBranch,
  Lock,
  Menu,
  Route,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ScoreRing } from '../components/ui'
import ThemeSwitch from '../components/ThemeSwitch'
import { BrandMark } from '../components/Logo'
import { cx } from '../utils/helpers'

/* ------------------------------------------------------------------ */
/* Interactive hero pipeline                                           */
/* ------------------------------------------------------------------ */
const PIPELINE_STEPS = [
  { icon: FileText, name: 'Resume', desc: 'PDF or DOCX' },
  { icon: ScanSearch, name: 'Skill Extraction', desc: 'NLP parses it' },
  { icon: Briefcase, name: 'Job Requirements', desc: 'Target role' },
  { icon: Brain, name: 'AI Comparison', desc: 'Semantic matching' },
  { icon: Target, name: 'Skill Gap', desc: 'Matched · partial · missing' },
  { icon: Route, name: 'Roadmap', desc: 'Personalized plan' },
]

function HeroPipeline() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a >= PIPELINE_STEPS.length - 1 ? 0 : a + 1)), 1300)
    return () => clearInterval(t)
  }, [])

  return (
    <motion.div
      className="pipeline"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Resume to skill gap to roadmap"
    >
      {PIPELINE_STEPS.map((step, i) => (
        <div key={step.name}>
          <div className={`pipeline-step ${i <= active ? 'on' : ''}`}>
            <span className="step-icon"><step.icon /></span>
            <div>
              <div className="step-name">{step.name}</div>
              <div className="step-desc">{step.desc}</div>
            </div>
            {i === active && <Sparkles size={14} style={{ marginLeft: 'auto', color: 'var(--accent)' }} />}
          </div>
          {i < PIPELINE_STEPS.length - 1 && (
            <div className={`pipeline-arrow ${i < active ? 'on' : ''}`}><ArrowDown /></div>
          )}
        </div>
      ))}

      <div className="pipeline-result">
        <ScoreRing value={72} size={104} stroke={9} label="Match" />
        <div className="pipeline-legend">
          <div className="legend-row"><span>Matched</span><div className="bar matched"><span /></div><b style={{ color: 'var(--success)' }}>64%</b></div>
          <div className="legend-row"><span>Partial</span><div className="bar partial"><span /></div><b style={{ color: 'var(--warn)' }}>18%</b></div>
          <div className="legend-row"><span>Missing</span><div className="bar missing"><span /></div><b style={{ color: 'var(--danger)' }}>18%</b></div>
        </div>
      </div>
      <div className="pipeline-note">Illustrative analysis — sample data</div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function Reveal({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

function SectionHead({ eyebrow, title, sub, center = false }) {
  return (
    <div className={cx('section-head', center && 'center')}>
      <Reveal><div className="eyebrow">{eyebrow}</div></Reveal>
      <Reveal delay={0.05}><h2 className="display-md">{title}</h2></Reveal>
      {sub && <Reveal delay={0.1}><p className="lead">{sub}</p></Reveal>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Landing page                                                        */
/* ------------------------------------------------------------------ */
export default function Landing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 60])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const goAnalyze = () => navigate(user ? '/app/analyzer' : '/register')
  const goLogin = () => navigate(user ? (user.role === 'admin' ? '/admin' : '/app') : '/login')
  const anchor = (id) => (e) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const FEATURES = [
    { icon: Brain, tone: '', title: 'Semantic Skill Matching', desc: 'Alias & similarity-based comparison — React.js and React are the same skill to us.' },
    { icon: Target, tone: 'gold', title: 'Precise Gap Analysis', desc: 'Every missing skill with priority, why it matters, and the exact next step.' },
    { icon: GitBranch, tone: 'blue', title: 'Personalized Roadmap', desc: 'A phased plan built from your gaps — resources and effort hours included.' },
    { icon: TrendingUp, tone: 'violet', title: 'What-If Simulator', desc: 'See your match score rise before you invest a single hour.' },
  ]

  const STEPS = [
    ['Upload your resume', 'PDF or DOCX — parsed and extracted in seconds'],
    ['Add a job description', 'Paste the posting or upload a file'],
    ['Get your match score', 'Weighted 0–100 across six factors, fully explained'],
    ['Close the gaps', 'Roadmap, progress tracking & what-if projections'],
  ]

  const DISCOVER = [
    'Your true compatibility %', 'Fastest wins', 'Project ideas',
    'Interview prep', 'What-if projections', 'Progress that counts',
  ]

  return (
    <div>
      {/* ================= HEADER ================= */}
      <header className={`landing-header ${scrolled ? 'scrolled' : ''}`}>
        <a href="/" className="brand" aria-label="Career Mirror AI - home">
          <BrandMark size={40} />
          <span className="brand-text">
            <b>Career Mirror AI</b>
            <span>Smart Resume Skill Gap Analyzer</span>
          </span>
        </a>
        <nav className="landing-nav" aria-label="Primary">
          <a href="#features" onClick={anchor('features')}>Features</a>
          <a href="#how" onClick={anchor('how')}>How It Works</a>
          <a href="#insights" onClick={anchor('insights')}>Insights</a>
          <a href="#assistant" onClick={anchor('assistant')}>AI Assistant</a>
          <a href="#about" onClick={anchor('about')}>About</a>
        </nav>
        <div className="landing-header-actions">
          <ThemeSwitch />
          <button className="btn btn-ghost btn-sm" onClick={goLogin}>Login</button>
          <button className="btn btn-primary btn-sm" onClick={goAnalyze}>Get Started</button>
          <button
            className="icon-btn sidebar-toggle-btn"
            style={{ display: 'grid' }}
            onClick={() => setMobileNav((v) => !v)}
            aria-label="Menu"
          >
            {mobileNav ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        {mobileNav && (
          <div className="dropdown" style={{ left: 16, right: 16, top: 'calc(100% + 8px)', minWidth: 0 }}>
            {[['Features', 'features'], ['How It Works', 'how'], ['Insights', 'insights'], ['AI Assistant', 'assistant'], ['About', 'about']].map(([label, id]) => (
              <a key={id} className="dropdown-item" href={`#${id}`} onClick={(e) => { anchor(id)(e); setMobileNav(false) }}>
                {label}
              </a>
            ))}
            <div className="dropdown-sep" />
            <button className="dropdown-item" onClick={() => { setMobileNav(false); goLogin() }}>Login</button>
            <button className="dropdown-item" onClick={() => { setMobileNav(false); goAnalyze() }}>Get Started</button>
          </div>
        )}
      </header>

      {/* ================= HERO ================= */}
      <section className="hero" ref={heroRef}>
        <motion.div className="hero-grid" style={{ y: heroY }}>
          <div>
            <Reveal><div className="eyebrow">Career Intelligence · Free &amp; Local AI</div></Reveal>
            <Reveal delay={0.06}>
              <h1 className="display-xl" style={{ marginTop: 18 }}>
                See yourself through the lens of{' '}
                <span className="accent-word">your next career.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="lead" style={{ marginTop: 20, maxWidth: 500 }}>
                Compare your resume with any job description — discover what's missing
                and follow a personalized path to your next role.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="hero-ctas">
                <button className="btn btn-royal btn-lg" onClick={goAnalyze}>
                  Upload Resume <ArrowUpRight />
                </button>
                <button className="btn btn-outline btn-lg" onClick={goAnalyze}>
                  <ScanSearch /> Analyze My Skills
                </button>
              </div>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="hero-proof">
                <span className="flex" style={{ gap: 7, alignItems: 'center' }}>
                  <CheckCircle2 size={15} style={{ color: 'var(--accent)' }} /> Free
                </span>
                <span className="flex" style={{ gap: 7, alignItems: 'center' }}>
                  <Bot size={15} style={{ color: 'var(--violet)' }} /> Local AI
                </span>
                <span className="flex" style={{ gap: 7, alignItems: 'center' }}>
                  <ShieldCheck size={15} style={{ color: 'var(--accent-2)' }} /> Privacy-first
                </span>
              </div>
            </Reveal>
          </div>
          <HeroPipeline />
        </motion.div>
      </section>

      {/* ================= FEATURES ================= */}
      <section id="features" className="landing-section" style={{ paddingTop: 96 }}>
        <SectionHead
          eyebrow="Why Career Mirror AI"
          title="Everything you need to close your skill gap"
        />
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05}>
              <div className="card feature-card card-hover">
                <span className={`fc-icon ${f.tone}`}><f.icon /></span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how" className="landing-section">
        <div className="split-section">
          <div>
            <SectionHead
              eyebrow="How It Works"
              title="From upload to action plan in four steps"
            />
            <div className="steps-list">
              {STEPS.map(([t, d], i) => (
                <Reveal key={t} delay={i * 0.05}>
                  <div className="step-item">
                    <span className="step-num">{i + 1}</span>
                    <div>
                      <h4>{t}</h4>
                      <p>{d}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal delay={0.1}>
            <div className="insight-panel">
              <div className="ip-head">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Full Stack Developer</div>
                  <div className="small muted">Illustrative analysis — sample data</div>
                </div>
                <ScoreRing value={72} size={76} stroke={7} />
              </div>
              <div className="ip-body">
                <div className="gap-rows">
                  <div className="gap-row">
                    <div><div className="g-name">Python</div><div className="small muted">Required</div></div>
                    <div className="g-bar"><span style={{ inset: 0, borderRadius: 99, background: 'var(--success)' }} /></div>
                    <span className="badge badge-matched">Matched</span>
                  </div>
                  <div className="gap-row">
                    <div><div className="g-name">FastAPI</div><div className="small muted">You have Flask</div></div>
                    <div className="g-bar"><span style={{ width: '45%', borderRadius: 99, background: 'var(--warn)' }} /></div>
                    <span className="badge badge-partial">Partial</span>
                  </div>
                  <div className="gap-row">
                    <div><div className="g-name">Docker</div><div className="small muted">Required</div></div>
                    <div className="g-bar"><span style={{ width: '4%', borderRadius: 99, background: 'var(--danger)' }} /></div>
                    <span className="badge badge-missing">Missing</span>
                  </div>
                  <div className="gap-row">
                    <div><div className="g-name">Kubernetes</div><div className="small muted">Required</div></div>
                    <div className="g-bar"><span style={{ width: '4%', borderRadius: 99, background: 'var(--danger)' }} /></div>
                    <span className="badge badge-missing">Missing</span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= WHAT YOU DISCOVER ================= */}
      <section id="insights" className="landing-section">
        <SectionHead
          center
          eyebrow="What Users Discover"
          title="Answers you can act on"
        />
        <Reveal>
          <div className="card card-pad" style={{ padding: '26px 30px' }}>
            <div className="flex" style={{ gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {DISCOVER.map((d) => (
                <span key={d} className="skill-chip" style={{ padding: '9px 16px', fontSize: 14 }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--accent)' }} /> {d}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ================= AI ASSISTANT ================= */}
      <section id="assistant" className="landing-section">
        <div className="split-section" style={{ gridTemplateColumns: '1.15fr 0.85fr' }}>
          <div>
            <SectionHead
              eyebrow="AI Career Assistant"
              title="Ask your career coach anything"
              sub="Grounded in your real analysis. Runs on free local AI — no API bills."
            />
            <div className="chip-row">
              {['What skills am I missing?', 'Why is my score low?', 'What should I learn first?', 'What projects should I build?'].map((q) => (
                <span key={q} className="skill-chip" style={{ padding: '10px 16px' }}>
                  💬 {q}
                </span>
              ))}
            </div>
          </div>
          <Reveal delay={0.1}>
            <div className="insight-panel">
              <div className="ip-head">
                <div className="flex" style={{ gap: 10 }}>
                  <span className="avatar sm" style={{ background: 'linear-gradient(135deg,#6d5ae0,#1d4ed8)' }}><Bot size={15} /></span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Career Coach</div>
                    <div className="small muted">Local AI · Ollama-ready</div>
                  </div>
                </div>
                <span className="badge badge-violet">online</span>
              </div>
              <div className="ip-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="chat-bubble bot">You're at <b>72%</b> match for Full Stack Developer. Want me to list your gaps?</div>
                <div className="chat-bubble user" style={{ alignSelf: 'flex-end' }}>What should I learn first?</div>
                <div className="chat-bubble bot">
                  Start with <b>Docker</b> — high priority, ~20 hours. Your projected match after Docker: <b>78%</b>.
                  <span className="small muted"><br />Sample conversation · illustrative</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= STATS + CTA ================= */}
      <section className="landing-section">
        <Reveal>
          <div className="card card-pad" style={{ padding: '26px 30px' }}>
            <div className="grid-4" style={{ textAlign: 'center' }}>
              {[
                ['0–100', 'explainable score'],
                ['6', 'weighted factors'],
                ['140+', 'skills in knowledge base'],
                ['100%', 'local & free AI'],
              ].map(([v, l]) => (
                <div key={l} style={{ padding: '6px 0' }}>
                  <div className="font-display" style={{ fontSize: 32, fontWeight: 700, color: 'var(--accent)' }}>{v}</div>
                  <div className="small muted">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <section id="about" className="landing-section">
        <Reveal>
          <div className="cta-band">
            <div className="eyebrow" style={{ color: 'var(--violet)' }}>Your next role is closer than you think</div>
            <h2 className="display-md" style={{ marginTop: 12 }}>See the gap. Close it.</h2>
            <p>Upload your resume and get a personalized plan in seconds.</p>
            <div className="flex" style={{ justifyContent: 'center', gap: 13, flexWrap: 'wrap' }}>
              <button className="btn btn-royal btn-lg" onClick={goAnalyze}>
                Upload Resume <ArrowRight />
              </button>
              <button className="btn btn-outline btn-lg" onClick={() => navigate('/register')}>
                Create free account
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="landing-footer">
        <div className="footer-grid">
          <div>
            <a href="/" className="brand" style={{ marginBottom: 16 }}>
              <BrandMark size={38} />
              <span className="brand-text">
                <b>Career Mirror AI</b>
                <span>Smart Resume Skill Gap Analyzer</span>
              </span>
            </a>
            <p className="small muted" style={{ maxWidth: 260, marginTop: 14 }}>
              The career intelligence platform that shows you exactly what stands between
              your resume and your next role.
            </p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <a href="#features" onClick={anchor('features')}>Resume Analyzer</a>
            <a href="#insights" onClick={anchor('insights')}>Skill Gap Analysis</a>
            <a href="#how" onClick={anchor('how')}>Learning Roadmap</a>
            <a href="#assistant" onClick={anchor('assistant')}>AI Assistant</a>
            <a href="#" onClick={(e) => { e.preventDefault(); goAnalyze() }}>What-If Simulator</a>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <a href="#how" onClick={anchor('how')}>How It Works</a>
            <a href="#about" onClick={anchor('about')}>About</a>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms &amp; Conditions</Link>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <a href="#about" onClick={anchor('about')}>About</a>
            <a href="#features" onClick={anchor('features')}>Features</a>
            <a href="#insights" onClick={anchor('insights')}>Insights</a>
            <a href="#" onClick={(e) => { e.preventDefault(); goLogin() }}>Login</a>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <a href="mailto:hello@careermirror.ai">hello@careermirror.ai</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Support</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Feature requests</a>
            <div className="small muted mt-16">
              <Lock size={12} style={{ display: 'inline', verticalAlign: -2 }} /> Your data stays on your machine.
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Career Mirror AI. All rights reserved.</span>
          <span className="flex" style={{ gap: 16 }}>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </span>
        </div>
      </footer>
    </div>
  )
}
