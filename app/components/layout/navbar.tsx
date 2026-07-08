import { FileText, Moon, Sun } from 'lucide-react'
import { useTheme } from './theme-provider'

export function Navbar() {
  const { theme, toggle } = useTheme()

  return (
    <header className="flex h-[52px] items-center justify-between border-b border-border px-6">
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-accent" />
        <span className="text-sm font-[510] text-text-primary">
          AutoResume
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="rounded-md p-1.5 text-text-secondary hover:bg-hover transition-colors duration-150"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="flex items-center gap-2 text-body-compact text-text-secondary">
          <div className="h-6 w-6 rounded-full bg-accent-muted flex items-center justify-center">
            <span className="text-xs font-[510] text-accent">U</span>
          </div>
        </div>
      </div>
    </header>
  )
}
