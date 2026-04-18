import { useState } from 'react'
import { Link } from 'react-router-dom'

export function PublicNav() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-16 min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6">
        <Link
          to="/"
          onClick={() => setMenuOpen(false)}
          className="min-w-0 shrink text-xl font-bold tracking-tight text-blue-600 no-underline transition hover:opacity-90 sm:text-2xl"
        >
          Trans<span className="text-slate-800">Logix</span>
        </Link>

        <div className="hidden items-center gap-3 sm:gap-4 md:flex">
          <Link
            to="/iniciar-sesion"
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            Iniciar sesión
          </Link>
          <a
            href="/#unirse"
            className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white no-underline shadow-md transition hover:bg-blue-700"
          >
            Registrarse
          </a>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 md:hidden"
          aria-expanded={menuOpen}
          aria-controls="nav-mobile-panel"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <i className={`fas text-lg ${menuOpen ? 'fa-times' : 'fa-bars'}`} aria-hidden />
        </button>
      </div>

      <div
        id="nav-mobile-panel"
        className={`border-t border-slate-100 bg-white/95 px-4 py-2 shadow-sm md:hidden ${menuOpen ? 'block' : 'hidden'}`}
      >
        <Link
          to="/iniciar-sesion"
          className="block rounded-lg border border-slate-200 bg-white px-3 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={() => setMenuOpen(false)}
        >
          Iniciar sesión
        </Link>
        <a
          href="/#unirse"
          className="mt-2 block rounded-lg bg-blue-600 px-3 py-3 text-center text-sm font-semibold text-white no-underline transition hover:bg-blue-700"
          onClick={() => setMenuOpen(false)}
        >
          Registrarse
        </a>
      </div>
    </nav>
  )
}
