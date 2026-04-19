import { Link, NavLink } from 'react-router-dom'

export type PanelNavBarItem = { to: string; label: string; end?: boolean }

const accountLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-blue-50 text-blue-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`

function primaryLinkClass(isActive: boolean, accent: 'admin' | 'cliente' | 'transportista') {
  const shell =
    'shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-3.5'
  if (!isActive) {
    return `${shell} text-slate-600 hover:bg-white/80 hover:text-slate-900`
  }
  if (accent === 'transportista') {
    return `${shell} bg-slate-800 text-white shadow-sm hover:bg-slate-800 hover:text-white`
  }
  return `${shell} bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/90`
}

export function PanelNavBar(props: {
  subtitle: string
  contentMaxWidth: 'max-w-7xl' | 'max-w-4xl'
  primaryItems: PanelNavBarItem[]
  accountHref: string
  email: string
  onLogout: () => void
  accent: 'admin' | 'cliente' | 'transportista'
}) {
  const { subtitle, contentMaxWidth, primaryItems, accountHref, email, onLogout, accent } = props

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className={`mx-auto ${contentMaxWidth} px-4 sm:px-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <Link to="/" className="text-lg font-bold tracking-tight text-blue-600 no-underline hover:opacity-90">
              Trans<span className="text-slate-800">Logix</span>
            </Link>
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{subtitle}</span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {email ? (
              <span className="hidden max-w-[200px] truncate text-xs text-slate-500 lg:inline" title={email}>
                {email}
              </span>
            ) : null}
            <NavLink to={accountHref} className={accountLinkClass}>
              Mi cuenta
            </NavLink>
            <button
              type="button"
              onClick={() => onLogout()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <span className="sm:hidden">Salir</span>
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>

        <nav
          className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300"
          aria-label="Secciones del panel"
        >
          <div className="flex min-w-min gap-1 rounded-xl border border-slate-200/90 bg-slate-100/80 p-1">
            {primaryItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end ?? false}
                className={({ isActive }) => primaryLinkClass(isActive, accent)}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </header>
  )
}
