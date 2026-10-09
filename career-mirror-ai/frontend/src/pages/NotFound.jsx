import { Link } from 'react-router-dom'
import { ScanLine } from 'lucide-react'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <span className="brand-mark" style={{ width: 64, height: 64, margin: '0 auto 22px' }}>
          <ScanLine size={32} />
        </span>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Error 404</div>
        <h1 className="display-md">This page doesn't exist</h1>
        <p className="lead mt-16 mb-24">
          The mirror shows nothing here. Let's get you back to your career path.
        </p>
        <Link to="/" className="btn btn-royal btn-lg">Back to home</Link>
      </div>
    </div>
  )
}
