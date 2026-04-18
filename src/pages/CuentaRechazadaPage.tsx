import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupabase } from '@/lib/supabase'

/** Compatibilidad: redirige al login con mensaje (sin mantener sesión). */
export function CuentaRechazadaPage() {
  const navigate = useNavigate()
  const sb = getSupabase()

  useEffect(() => {
    void (async () => {
      if (sb) await sb.auth.signOut()
      navigate('/iniciar-sesion?info=rechazada', { replace: true })
    })()
  }, [navigate, sb])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
      Redirigiendo…
    </div>
  )
}
