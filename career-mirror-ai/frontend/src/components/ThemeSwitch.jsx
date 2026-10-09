import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

/** Animated light/dark theme switch (persisted in localStorage). */
export default function ThemeSwitch({ compact = false }) {
  const { theme, toggle } = useTheme()
  if (compact) {
    return (
      <button
        className="icon-btn"
        onClick={toggle}
        aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        title={theme === 'light' ? 'Dark mode' : 'Light mode'}
      >
        {theme === 'light' ? <Moon /> : <Sun />}
      </button>
    )
  }
  return (
    <button
      className="theme-switch"
      data-theme={theme}
      onClick={toggle}
      role="switch"
      aria-checked={theme === 'dark'}
      aria-label="Toggle theme"
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      <Sun className="ts-sun" />
      <Moon className="ts-moon" />
      <span className="ts-knob">{theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}</span>
    </button>
  )
}
