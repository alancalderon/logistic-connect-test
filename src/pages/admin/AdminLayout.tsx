import { useCallback, useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { fetchAppProfile } from '@/lib/profile'
import { getSupabase } from '@/lib/supabase'
import { AdminNav } from '@/pages/admin/AdminNav'

export function AdminLayout() {
  const navigate = useNavigate()
  const sb = getSupabase()
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState('')

  const logout = useCallback(async () => {
    if (sb) await sb.auth.signOut()
    navigate('/iniciar-sesion', { replace: true })
  }, [navigate, sb])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!sb) {
        navigate('/admin-login', { replace: true })
        return
      }
      const { data: s } = await sb.auth.getSession()
      if (!s.session?.user?.id) {
        navigate('/admin-login', { replace: true })
        return
      }
      const p = await fetchAppProfile(sb, s.session.user.id)
      if (cancelled) return
      if (!p?.is_admin) {
        navigate('/', { replace: true })
        return
      }
      setEmail(s.session.user.email ?? s.session.user.id)
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [navigate, sb])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Verificando acceso…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AdminNav email={email} onLogout={() => void logout()} />
      <Outlet />
    </div>
  )
}
