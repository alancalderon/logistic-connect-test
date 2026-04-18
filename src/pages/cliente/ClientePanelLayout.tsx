import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { fetchAppProfile } from '@/lib/profile'
import { getSupabase } from '@/lib/supabase'

export function ClientePanelLayout() {
  const navigate = useNavigate()
  const sb = getSupabase()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!sb) {
        navigate('/', { replace: true })
        return
      }
      const { data: s } = await sb.auth.getSession()
      if (!s.session?.user?.id) {
        navigate('/iniciar-sesion', { replace: true })
        return
      }
      const p = await fetchAppProfile(sb, s.session.user.id)
      if (cancelled) return
      if (!p || p.tipo_cuenta !== 'cliente') {
        navigate('/', { replace: true })
        return
      }
      if (p.cuenta_estado === 'pendiente_aprobacion') {
        await sb.auth.signOut()
        navigate('/iniciar-sesion?info=waitlist', { replace: true })
        return
      }
      if (p.cuenta_estado === 'rechazada') {
        await sb.auth.signOut()
        navigate('/iniciar-sesion?info=rechazada', { replace: true })
        return
      }
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [navigate, sb])

  const logout = useCallback(async () => {
    if (sb) await sb.auth.signOut()
    navigate('/', { replace: true })
  }, [navigate, sb])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Cargando panel…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-3 sm:h-auto sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="text-lg font-bold text-blue-600 no-underline">
              Trans<span className="text-slate-800">Logix</span>
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 sm:hidden"
            >
              Salir
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <NavLink
              to="/panel/cliente/solicitudes"
              end
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4 ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              Mis solicitudes
            </NavLink>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>
      <Outlet />
    </div>
  )
}
