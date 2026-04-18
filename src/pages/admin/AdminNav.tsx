import { Link, NavLink } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-3.5 ${
    isActive ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
  }`

export function AdminNav({ email, onLogout }: { email: string; onLogout: () => void }) {
  return (
    <header className="border-b border-slate-200/90 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="text-lg font-bold text-blue-600 no-underline transition hover:opacity-90">
            Trans<span className="text-slate-800">Logix</span>
          </Link>
          <span className="hidden text-xs text-slate-500 sm:inline sm:max-w-[14rem] sm:truncate" title={email}>
            {email}
          </span>
        </div>

        <nav
          className="flex flex-1 flex-wrap items-center justify-center gap-1 rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1.5 sm:mx-4 sm:max-w-3xl"
          aria-label="Administración"
        >
          <NavLink to="/admin/waitlist" className={linkClass}>
            Waitlist
          </NavLink>
          <NavLink to="/admin/usuarios" className={linkClass}>
            Usuarios
          </NavLink>
          <NavLink to="/admin/solicitudes" className={linkClass}>
            Solicitudes
          </NavLink>
          <NavLink to="/admin/flota" className={linkClass}>
            Flota
          </NavLink>
        </nav>

        <button
          type="button"
          onClick={() => onLogout()}
          className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <span className="sm:hidden">Salir</span>
          <span className="hidden sm:inline">Cerrar sesión</span>
        </button>
      </div>
    </header>
  )
}
