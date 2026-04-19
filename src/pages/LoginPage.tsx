import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PublicNav } from '@/components/PublicNav'
import { describeSignInError, normalizeAuthEmail } from '@/lib/authLogin'
import { fetchAppProfile } from '@/lib/profile'
import { getSupabase } from '@/lib/supabase'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sb = getSupabase()
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [lastTryEmail, setLastTryEmail] = useState('')
  const [recoveryBusy, setRecoveryBusy] = useState<'resend' | 'reset' | null>(null)
  const [recoveryMsg, setRecoveryMsg] = useState('')

  useEffect(() => {
    const info = searchParams.get('info')
    if (!info) return
    if (info === 'waitlist') {
      setMsg(
        'Tu cuenta sigue en lista de espera. Un administrador debe aprobarte en el panel antes de que puedas iniciar sesión y usar la plataforma.',
      )
    } else if (info === 'rechazada') {
      setMsg('Tu solicitud de acceso no fue aprobada. No es posible iniciar sesión con esta cuenta.')
    }
    navigate('/iniciar-sesion', { replace: true })
  }, [navigate, searchParams])

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMsg('')
    setRecoveryMsg('')
    if (!sb) {
      setMsg('La aplicación no está configurada correctamente.')
      return
    }
    const fd = new FormData(e.currentTarget)
    const emailNorm = normalizeAuthEmail(String(fd.get('email') ?? ''))
    const password = String(fd.get('password') ?? '')
    if (!emailNorm) {
      setMsg('Indica tu correo.')
      return
    }
    setBusy(true)
    await sb.auth.signOut()
    const { error } = await sb.auth.signInWithPassword({ email: emailNorm, password })
    if (error) {
      setBusy(false)
      setLastTryEmail(emailNorm)
      setMsg(describeSignInError(error))
      return
    }
    setLastTryEmail('')

    const { data: sess } = await sb.auth.getSession()
    const uid = sess.session?.user?.id
    if (!uid) {
      setBusy(false)
      setMsg('No se pudo obtener la sesión tras iniciar sesión. Vuelve a intentar.')
      return
    }

    const { data: vData, error: vErr } = await sb.rpc('vincular_mi_registro_pendiente')
    if (vErr) {
      console.warn('vincular_mi_registro_pendiente', vErr.message)
    } else {
      const vr = vData as { ok?: boolean; error?: string } | null
      if (vr && vr.ok === false && vr.error && vr.error !== 'NO_AUTH') {
        console.warn('vincular_mi_registro_pendiente', vr.error)
      }
    }

    const profile = await fetchAppProfile(sb, uid)
    if (!profile) {
      await sb.auth.signOut()
      setBusy(false)
      setMsg('No se pudo verificar tu perfil. Vuelve a intentar o contacta soporte.')
      return
    }
    if (profile.is_admin) {
      setBusy(false)
      navigate('/admin/solicitudes', { replace: true })
      return
    }
    if (profile.cuenta_estado !== 'activa') {
      await sb.auth.signOut()
      setBusy(false)
      setMsg(
        profile.cuenta_estado === 'rechazada'
          ? 'Tu solicitud de acceso no fue aprobada. No es posible iniciar sesión con esta cuenta.'
          : 'Tu cuenta está en lista de espera. Cuando un administrador la apruebe desde el panel, podrás iniciar sesión aquí.',
      )
      return
    }
    if (profile.tipo_cuenta === 'cliente') {
      setBusy(false)
      navigate('/panel/cliente/nueva-solicitud', { replace: true })
      return
    }
    if (profile.tipo_cuenta === 'transportista') {
      setBusy(false)
      navigate('/panel/transportista/viajes', { replace: true })
      return
    }
    await sb.auth.signOut()
    setBusy(false)
    setMsg('Tu perfil no tiene acceso configurado. Contacta al equipo de TransLogix.')
  }

  async function onResendVerification() {
    if (!sb || !lastTryEmail) return
    setRecoveryBusy('resend')
    setRecoveryMsg('')
    const origin = window.location.origin
    const { error } = await sb.auth.resend({
      type: 'signup',
      email: lastTryEmail,
      options: { emailRedirectTo: `${origin}/iniciar-sesion` },
    })
    setRecoveryBusy(null)
    if (error) {
      setRecoveryMsg(error.message)
      return
    }
    setRecoveryMsg('Revisa tu bandeja (y spam) por un nuevo enlace de verificación.')
  }

  async function onResetPassword() {
    if (!sb || !lastTryEmail) return
    setRecoveryBusy('reset')
    setRecoveryMsg('')
    const origin = window.location.origin
    const { error } = await sb.auth.resetPasswordForEmail(lastTryEmail, {
      redirectTo: `${origin}/iniciar-sesion`,
    })
    setRecoveryBusy(null)
    if (error) {
      setRecoveryMsg(error.message)
      return
    }
    setRecoveryMsg('Si existe una cuenta con ese correo, recibirás un enlace para elegir una nueva contraseña.')
  }

  const input =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15'
  const label = 'mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500'

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <PublicNav />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-12">
        <h1 className="mb-2 text-2xl font-bold text-slate-800">Iniciar sesión</h1>
        <p className="mb-8 text-sm text-slate-600">
          Usa el mismo correo y contraseña que usaste al registrarte en TransLogix.
        </p>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form className="space-y-4" onSubmit={(ev) => void onSubmit(ev)}>
            <div>
              <label className={label} htmlFor="login-email">
                Correo
              </label>
              <input id="login-email" name="email" type="email" required autoComplete="username" className={input} />
            </div>
            <div>
              <label className={label} htmlFor="login-pass">
                Contraseña
              </label>
              <input
                id="login-pass"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className={input}
              />
            </div>
            {msg && <p className="text-sm text-red-600">{msg}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
          {lastTryEmail && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">¿Problemas al entrar?</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={recoveryBusy !== null}
                  onClick={() => void onResendVerification()}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
                >
                  {recoveryBusy === 'resend' ? 'Enviando…' : 'Reenviar verificación de correo'}
                </button>
                <button
                  type="button"
                  disabled={recoveryBusy !== null}
                  onClick={() => void onResetPassword()}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
                >
                  {recoveryBusy === 'reset' ? 'Enviando…' : 'Restablecer contraseña'}
                </button>
              </div>
              {recoveryMsg && <p className="mt-2 text-xs text-slate-600">{recoveryMsg}</p>}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
