import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSupabase } from '@/lib/supabase'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [msgLogin, setMsgLogin] = useState('')
  const [msgReg, setMsgReg] = useState('')
  const [infoReg, setInfoReg] = useState('')
  const [busyLogin, setBusyLogin] = useState(false)
  const [busyRegister, setBusyRegister] = useState(false)

  const sb = getSupabase()

  const redirectAfterAuth = `${window.location.origin}/admin/solicitudes`

  async function onLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMsgLogin('')
    if (!sb) {
      setMsgLogin('La aplicación no está configurada correctamente.')
      return
    }
    const fd = new FormData(e.currentTarget)
    const email = String(fd.get('email') ?? '').trim()
    const password = String(fd.get('password') ?? '')
    setBusyLogin(true)
    const { error } = await sb.auth.signInWithPassword({ email, password })
    setBusyLogin(false)
    if (error) {
      setMsgLogin(error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message)
      return
    }
    navigate('/admin/solicitudes', { replace: true })
  }

  async function onRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMsgReg('')
    setInfoReg('')
    if (!sb) {
      setMsgReg('La aplicación no está configurada correctamente.')
      return
    }
    const fd = new FormData(e.currentTarget)
    const email = String(fd.get('email') ?? '').trim()
    const p1 = String(fd.get('password') ?? '')
    const p2 = String(fd.get('password2') ?? '')
    if (p1.length < 8) {
      setMsgReg('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (p1 !== p2) {
      setMsgReg('Las contraseñas no coinciden.')
      return
    }

    setBusyRegister(true)
    const { data, error } = await sb.auth.signUp({
      email,
      password: p1,
      options: {
        emailRedirectTo: redirectAfterAuth,
        data: {
          app_role: 'admin',
        },
      },
    })
    setBusyRegister(false)

    if (error) {
      setMsgReg(error.message)
      return
    }

    if (data.session) {
      navigate('/admin/solicitudes', { replace: true })
      return
    }

    setInfoReg(
      'Cuenta creada. Si debes confirmar el correo, abre el enlace del mensaje y luego inicia sesión aquí. Después podrás entrar al panel.',
    )
  }

  const input =
    'w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/20'
  const label = 'mb-1 block text-[10px] font-bold uppercase text-slate-500'

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-slate-100">
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="text-lg font-bold text-blue-400 no-underline transition hover:opacity-90">
            Trans<span className="text-white">Logix</span>
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Admin</span>
        </div>
      </nav>

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="w-full max-w-md">
          <p className="mb-4 text-center text-xs text-slate-500 sm:mb-6 sm:text-sm">
            Esta ruta no está enlazada desde el sitio público. Uso del equipo.
          </p>

          <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/60 shadow-xl">
            <div className="flex border-b border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setTab('login')
                  setMsgLogin('')
                }}
                className={`min-h-12 flex-1 px-2 py-3 text-xs leading-tight sm:px-3 sm:text-sm ${tab === 'login' ? 'tab-active-admin font-semibold text-blue-400' : 'text-slate-400'}`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('register')
                  setMsgReg('')
                  setInfoReg('')
                }}
                className={`min-h-12 flex-1 px-2 py-3 text-xs leading-tight sm:px-3 sm:text-sm ${tab === 'register' ? 'tab-active-admin font-semibold text-blue-400' : 'text-slate-400'}`}
              >
                Crear cuenta admin
              </button>
            </div>

            <div className="p-4 sm:p-8">
              {tab === 'login' && (
                <form className="space-y-4" onSubmit={(ev) => void onLogin(ev)}>
                  <div>
                    <label className={label}>Correo</label>
                    <input name="email" type="email" required className={input} autoComplete="username" />
                  </div>
                  <div>
                    <label className={label}>Contraseña</label>
                    <input name="password" type="password" required className={input} autoComplete="current-password" />
                  </div>
                  {msgLogin && <p className="text-sm text-red-400">{msgLogin}</p>}
                  <button
                    type="submit"
                    disabled={busyLogin}
                    className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {busyLogin ? 'Entrando…' : 'Entrar'}
                  </button>
                </form>
              )}

              {tab === 'register' && (
                <>
                  <p className="mb-4 text-xs leading-relaxed text-slate-400">
                    El primer usuario puede necesitar que el equipo le asigne permisos de administrador en la base de
                    datos antes de poder usar el panel.
                  </p>
                  <form className="space-y-4" onSubmit={(ev) => void onRegister(ev)}>
                    <div>
                      <label className={label}>Correo del admin</label>
                      <input name="email" type="email" required className={input} autoComplete="username" />
                    </div>
                    <div>
                      <label className={label}>Contraseña</label>
                      <input name="password" type="password" required minLength={8} className={input} autoComplete="new-password" />
                    </div>
                    <div>
                      <label className={label}>Confirmar contraseña</label>
                      <input name="password2" type="password" required className={input} autoComplete="new-password" />
                    </div>
                    {msgReg && <p className="text-sm text-red-400">{msgReg}</p>}
                    {infoReg && <p className="text-xs text-emerald-400/90">{infoReg}</p>}
                    <button
                      type="submit"
                      disabled={busyRegister}
                      className="w-full rounded-xl bg-slate-600 py-3 font-semibold text-white transition hover:bg-slate-500 disabled:opacity-60"
                    >
                      {busyRegister ? 'Creando cuenta…' : 'Crear cuenta'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <style>{`
        .tab-active-admin { border-bottom: 2px solid #60a5fa; }
      `}</style>
    </div>
  )
}
