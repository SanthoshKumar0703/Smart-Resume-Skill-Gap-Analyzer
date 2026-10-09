import { motion } from 'framer-motion'

/** Shared UI primitives for Career Mirror AI. */

export function Spinner({ size = 20, color = 'var(--accent)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" role="status" aria-label="Loading">
      <circle cx="12" cy="12" r="9" stroke="var(--line-strong)" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke={color} strokeWidth="3" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
      </path>
    </svg>
  )
}

export function Button({ children, loading = false, icon, ...props }) {
  return (
    <button {...props} disabled={props.disabled || loading}>
      {loading ? <Spinner size={16} color="currentColor" /> : icon}
      {children}
    </button>
  )
}

export function Badge({ kind = 'neutral', children, dot = false }) {
  return <span className={`badge badge-${kind}${dot ? ' badge-dot' : ''}`}>{children}</span>
}

export function ScoreRing({ value = 0, size = 150, stroke = 11, label = 'Match', animate = true }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, value))
  const offset = circumference - (clamped / 100) * circumference
  const color =
    clamped >= 75 ? 'var(--success)' : clamped >= 50 ? 'var(--warn)' : 'var(--danger)'
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle className="ring-bg" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} fill="none" />
        <motion.circle
          className="ring-fg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          stroke={color}
          strokeDasharray={circumference}
          initial={animate ? { strokeDashoffset: circumference } : false}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="score-value" style={{ fontSize: size * 0.27 }}>
        {Math.round(clamped)}
        <span style={{ fontSize: size * 0.13, opacity: 0.6 }}>%</span>
      </span>
      <span className="score-label">{label}</span>
    </div>
  )
}

export function Progress({ value = 0, color = '', className = '' }) {
  return (
    <div className={`progress ${className}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={`progress-fill ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, width = 620 }) {
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal" style={{ width: `min(${width}px, 100%)` }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 16 }}>{title}</h3>
          <button className="input-toggle" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

export function Skeleton({ width = '100%', height = 16, style = {}, className = '' }) {
  return <div className={`skeleton ${className}`} style={{ width, height, ...style }} />
}

export function SkeletonCard({ lines = 4 }) {
  return (
    <div className="card card-pad">
      <Skeleton height={18} width="40%" />
      <div className="mt-16" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} height={12} style={{ width: `${100 - i * 11}%` }} />
        ))}
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  )
}

export function Avatar({ name = '', size = 'md', src = null }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?'
  return (
    <span className={`avatar ${size}`}>
      {src ? <img src={src} alt={name} referrerPolicy="no-referrer" /> : initials}
    </span>
  )
}

export function StatCard({ label, value, icon, delta, tone = 'var(--accent)', sub }) {
  return (
    <div className="card stat-card card-hover" style={{ '--stat-glow': `${tone}22` }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-delta">{sub}</div>}
      {delta && <div className={`stat-delta ${delta.dir}`}>{delta.text}</div>}
      {icon && (
        <span style={{ position: 'absolute', top: 20, right: 20, color: 'var(--ink-3)', opacity: 0.55 }}>{icon}</span>
      )}
    </div>
  )
}

export function PageHead({ title, sub, actions }) {
  return (
    <div className="page-head flex-between">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className="flex">{actions}</div>}
    </div>
  )
}

export function SkillChips({ skills = [], kind = '', selected = null, onSelect = null, limit = null }) {
  const list = limit ? skills.slice(0, limit) : skills
  return (
    <div className="chip-row">
      {list.map((s) => {
        const name = typeof s === 'string' ? s : s.name
        const isSel = selected && (Array.isArray(selected) ? selected.includes(name) : selected === name)
        return (
          <span
            key={name}
            className={`skill-chip ${kind || ''}${onSelect ? ' clickable' : ''}${isSel ? ' selected' : ''}`}
            onClick={onSelect ? () => onSelect(name) : undefined}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            onKeyDown={onSelect ? (e) => e.key === 'Enter' && onSelect(name) : undefined}
          >
            {name}
          </span>
        )
      })}
    </div>
  )
}
