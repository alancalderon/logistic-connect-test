import { useCallback, useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { PanelNavBar } from '@/components/PanelNavBar'
import { fetchAppProfile } from '@/lib/profile'
import { getSupabase } from '@/lib/supabase'

export function TransportistaPanelLayout() {
  const navigate = useNavigate()
  const sb = getSupabase()
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState('')

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
      if (!p || p.tipo_cuenta !== 'transportista') {
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
      setEmail(s.session.user.email?.trim() ?? '')
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
      <PanelNavBar
        subtitle="Panel de transportista"
        contentMaxWidth="max-w-4xl"
        accent="transportista"
        accountHref="/panel/transportista/usuario"
        email={email}
        onLogout={() => void logout()}
        primaryItems={[
          { to: '/panel/transportista/viajes', label: 'Mis viajes', end: true },
          { to: '/panel/transportista/flota', label: 'Mi flota', end: true },
          { to: '/panel/transportista/agregar-vehiculo', label: 'Agregar vehículo', end: true },
        ]}
      />
      <Outlet />
    </div>
  )
}
