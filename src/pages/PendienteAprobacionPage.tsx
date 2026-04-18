import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupabase } from '@/lib/supabase'

/** Compatibilidad: las cuentas en espera ya no mantienen sesión; redirige al login con mensaje de waitlist. */
export function PendienteAprobacionPage() {
  const navigate = useNavigate()
  const sb = getSupabase()

  useEffect(() => {
    void (async () => {
      if (sb) await sb.auth.signOut()
      navigate('/iniciar-sesion?info=waitlist', { replace: true })
    })()
  }, [navigate, sb])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
      Redirigiendo al inicio de sesión…
    </div>
  )
}
