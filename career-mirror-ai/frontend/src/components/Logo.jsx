import { ScanLine, Sparkles } from 'lucide-react'
import { cx } from '../utils/helpers'

/**
 * Career Mirror AI logo — mirror mark + wordmark.
 * `to` navigates home; the mark is always a link to "/".
 */
export default function Logo({ compact = false, dark = false, to = '/', className = '' }) {
  return (
    <a href={to} className={cx('brand', className)} aria-label="Career Mirror AI - home">
      <span className="brand-mark">
        <ScanLine size={21} strokeWidth={2.1} />
      </span>
      {!compact && (
        <span className="brand-text">
          <b>Career Mirror AI</b>
          <span>Smart Resume Skill Gap Analyzer</span>
        </span>
      )}
    </a>
  )
}

export function BrandMark({ size = 40 }) {
  return (
    <span
      className="brand-mark"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        boxShadow: '0 6px 18px rgba(13,122,92,.3)',
      }}
      aria-hidden="true"
    >
      <ScanLine size={Math.round(size * 0.52)} strokeWidth={2.1} />
    </span>
  )
}

export function LogoMark({ size = 40, glow = true }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size, boxShadow: glow ? undefined : 'none' }} aria-hidden="true">
      <Sparkles size={Math.round(size * 0.5)} />
    </span>
  )
}
