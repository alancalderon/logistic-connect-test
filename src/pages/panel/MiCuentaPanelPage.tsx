import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { inputClass, labelClass } from '@/lib/formStyles'
import { describeSignInError, normalizeAuthEmail } from '@/lib/authLogin'
import { getSupabase } from '@/lib/supabase'

/** Misma pantalla para admin, cliente y transportista (perfil + contraseña). */
export function MiCuentaPanelPage() {
  const sb = getSupabase()
  const [loadErr, setLoadErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [profileMsg, setProfileMsg] = useState('')
  const [profileErr, setProfileErr] = useState('')
  const [profileBusy, setProfileBusy] = useState(false)

  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passMsg, setPassMsg] = useState('')
  const [passErr, setPassErr] = useState('')
  const [passBusy, setPassBusy] = useState(false)

  const load = useCallback(async () => {
    if (!sb) {
      setLoadErr('La aplicación no está configurada correctamente.')
      setLoading(false)
      return
    }
    setLoadErr('')
    const { data: u } = await sb.auth.getUser()
    const em = u.user?.email ? normalizeAuthEmail(u.user.email) : ''
    setEmail(em)

    const uid = u.user?.id
    if (!uid) {
      setLoadErr('No hay sesión.')
      setLoading(false)
      return
    }

    const { data: row, error } = await sb
      .from('profiles')
      .select('nombre_mostrado, telefono_contacto')
      .eq('id', uid)
      .maybeSingle()

    if (error) {
      setLoadErr(error.message)
      setLoading(false)
      return
    }

    setNombre(String(row?.nombre_mostrado ?? '').trim())
    setTelefono(String(row?.telefono_contacto ?? '').trim())
    setLoading(false)
  }, [sb])

  useEffect(() => {
    void load()
  }, [load])

  async function onSaveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!sb) return
    setProfileMsg('')
    setProfileErr('')
    setProfileBusy(true)
    const { error } = await sb.rpc('actualizar_mi_perfil_contacto', {
      p_nombre_mostrado: nombre.trim(),
      p_telefono_contacto: telefono.trim(),
    })
    setProfileBusy(false)
    if (error) {
      if (error.message.includes('actualizar_mi_perfil_contacto') || error.code === '42883') {
        setProfileErr(
          'Esta función aún no está en la base de datos. Aplica la migración más reciente (actualizar_mi_perfil_contacto) y vuelve a intentar.',
        )
        return
      }
      setProfileErr(error.message)
      return
    }
    setProfileMsg('Datos guardados.')
    await load()
  }

  async function onChangePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!sb) return
    setPassMsg('')
    setPassErr('')
    const cur = currentPass
    const n = newPass
    const c = confirmPass
    if (!n && !c && !cur) {
      setPassErr('Completa los campos de contraseña para cambiarla.')
      return
    }
    if (!cur) {
      setPassErr('Indica tu contraseña actual.')
      return
    }
    if (n.length < 8) {
      setPassErr('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (n !== c) {
      setPassErr('La confirmación no coincide con la nueva contraseña.')
      return
    }
    if (n === cur) {
      setPassErr('La nueva contraseña debe ser distinta a la actual.')
      return
    }
    if (!email) {
      setPassErr('No se pudo leer tu correo de sesión.')
      return
    }

    setPassBusy(true)
    const { error: signErr } = await sb.auth.signInWithPassword({ email, password: cur })
    if (signErr) {
      setPassBusy(false)
      setPassErr(describeSignInError(signErr))
      return
    }

    const { error: updErr } = await sb.auth.updateUser({ password: n })
    setPassBusy(false)
    if (updErr) {
      setPassErr(updErr.message || 'No se pudo actualizar la contraseña.')
      return
    }
    setCurrentPass('')
    setNewPass('')
    setConfirmPass('')
    setPassMsg('Contraseña actualizada. Usa la nueva clave en tu próximo inicio de sesión.')
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 text-slate-600">
        <p>Cargando…</p>
      </main>
    )
  }

  if (loadErr) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-red-600">{loadErr}</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-1 text-xl font-bold text-slate-800 sm:text-2xl">Mi cuenta</h1>
      <p className="mb-8 text-sm text-slate-600">
        Datos de contacto y contraseña de acceso. El correo lo gestiona el sistema de cuentas; si necesitas cambiarlo,
        contacta soporte.
      </p>

      <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Correo electrónico</h2>
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800">
          {email || '—'}
        </p>
        <p className="mt-2 text-xs text-slate-500">No editable desde aquí.</p>
      </section>

      <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Datos de contacto</h2>
        <form onSubmit={(ev) => void onSaveProfile(ev)} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="panel-mi-cuenta-nombre">
              Nombre o identificación
            </label>
            <input
              id="panel-mi-cuenta-nombre"
              name="nombre_mostrado"
              className={inputClass}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="name"
              placeholder="Cómo te gustaría que te llamemos"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="panel-mi-cuenta-telefono">
              Teléfono / WhatsApp
            </label>
            <input
              id="panel-mi-cuenta-telefono"
              name="telefono"
              className={inputClass}
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              autoComplete="tel"
              placeholder="+52 …"
            />
          </div>
          {profileErr && <p className="text-sm text-red-600">{profileErr}</p>}
          {profileMsg && <p className="text-sm text-emerald-700">{profileMsg}</p>}
          <button
            type="submit"
            disabled={profileBusy}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            {profileBusy ? 'Guardando…' : 'Guardar datos'}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Contraseña</h2>
        <form onSubmit={(ev) => void onChangePassword(ev)} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="panel-mi-cuenta-pass-actual">
              Contraseña actual
            </label>
            <input
              id="panel-mi-cuenta-pass-actual"
              name="current_password"
              type="password"
              className={inputClass}
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="panel-mi-cuenta-pass-nueva">
              Nueva contraseña
            </label>
            <input
              id="panel-mi-cuenta-pass-nueva"
              name="new_password"
              type="password"
              className={inputClass}
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="panel-mi-cuenta-pass-confirm">
              Confirmar nueva contraseña
            </label>
            <input
              id="panel-mi-cuenta-pass-confirm"
              name="confirm_password"
              type="password"
              className={inputClass}
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          {passErr && <p className="text-sm text-red-600">{passErr}</p>}
          {passMsg && <p className="text-sm text-emerald-700">{passMsg}</p>}
          <button
            type="submit"
            disabled={passBusy}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            {passBusy ? 'Actualizando…' : 'Cambiar contraseña'}
          </button>
        </form>
      </section>
    </main>
  )
}
