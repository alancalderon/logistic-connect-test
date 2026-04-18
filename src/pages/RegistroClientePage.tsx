import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registrarClienteManual } from '@/api/manualRegistro'
import { signUpTrasRegistroRpc } from '@/lib/authTrasRegistro'
import { getSupabase } from '@/lib/supabase'
import { inputClass, labelClass } from '@/lib/formStyles'
import type { RegistroClienteConfirmState } from '@/pages/RegistroClienteConfirmacionPage'

export function RegistroClientePage() {
  const navigate = useNavigate()
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'err'; text: string } | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage(null)
    const sb = getSupabase()
    if (!sb) {
      setMessage({ type: 'err', text: 'La aplicación no está configurada correctamente.' })
      return
    }
    const form = e.currentTarget
    const fd = new FormData(form)
    if (!fd.get('acepta_privacidad')) {
      setMessage({ type: 'err', text: 'Debes aceptar la política de privacidad.' })
      return
    }
    const password = String(fd.get('password') ?? '')
    const password2 = String(fd.get('password2') ?? '')
    if (password.length < 8) {
      setMessage({ type: 'err', text: 'La contraseña debe tener al menos 8 caracteres.' })
      return
    }
    if (password !== password2) {
      setMessage({ type: 'err', text: 'Las contraseñas no coinciden.' })
      return
    }
    const razonSocial = String(fd.get('razon_social') ?? '').trim()
    const emailVal = String(fd.get('email') ?? '').trim().toLowerCase()

    const row = {
      razon_social: razonSocial,
      contacto_nombre: String(fd.get('contacto_nombre') ?? '').trim(),
      contacto_cargo: String(fd.get('contacto_cargo') ?? '').trim() || null,
      email: emailVal,
      telefono: String(fd.get('telefono') ?? '').trim(),
    }

    setSending(true)
    const res = await registrarClienteManual({
      email: emailVal,
      password,
      razon_social: razonSocial,
      contacto_nombre: row.contacto_nombre,
      contacto_cargo: row.contacto_cargo,
      telefono: row.telefono,
    })
    setSending(false)
    if (!res.ok) {
      setMessage({ type: 'err', text: res.message })
      return
    }

    const auth = await signUpTrasRegistroRpc(sb, {
      email: emailVal,
      password,
      appTipo: 'cliente',
    })
    if (!auth.ok) {
      setMessage({
        type: 'err',
        text: `${auth.message} Tu solicitud quedó registrada; escribe a soporte si necesitas completar el acceso.`,
      })
      return
    }

    const state: RegistroClienteConfirmState = {
      razonSocial,
      email: emailVal,
      pendienteRevision: true,
      pendienteConfirmarCorreo: !auth.session,
    }
    navigate('/registro/cliente/confirmacion', { replace: true, state })
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="min-w-0 shrink text-lg font-bold text-blue-600 no-underline transition hover:opacity-90">
            Trans<span className="text-slate-800">Logix</span>
          </Link>
          <Link
            to="/"
            className="shrink-0 whitespace-nowrap text-sm font-medium text-slate-600 transition hover:text-blue-600"
          >
            <i className="fas fa-arrow-left mr-2" />
            Inicio
          </Link>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600">Solicitar servicio</p>
        <h1 className="mb-3 text-2xl font-extrabold leading-tight text-slate-800 sm:text-3xl">
          Registro — empresas y cargadores
        </h1>
        <p className="mb-8 text-sm text-slate-600 sm:mb-10 sm:text-base">
          Solo necesitamos estos datos y una contraseña. Creamos tu acceso con el mismo correo y contraseña. Cuando un
          administrador apruebe tu solicitud, podrás <strong>iniciar sesión</strong> aquí.
        </p>

        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl">
          <div className="bg-blue-600 px-4 py-4 text-white sm:px-8 sm:py-5">
            <h2 className="text-lg font-bold">Cuenta y contacto</h2>
            <p className="mt-1 text-sm text-blue-100">El correo será tu usuario al entrar a la plataforma.</p>
          </div>
          <form className="space-y-6 p-4 sm:p-8" onSubmit={(ev) => void onSubmit(ev)}>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Acceso</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>
                    Correo electrónico <span className="text-red-500">*</span>
                  </label>
                  <input name="email" type="email" required className={inputClass} placeholder="operaciones@empresa.com" autoComplete="username" />
                </div>
                <div>
                  <label className={labelClass}>
                    Contraseña <span className="text-red-500">*</span>
                  </label>
                  <input name="password" type="password" required minLength={8} className={inputClass} autoComplete="new-password" />
                </div>
                <div>
                  <label className={labelClass}>
                    Confirmación de contraseña <span className="text-red-500">*</span>
                  </label>
                  <input name="password2" type="password" required minLength={8} className={inputClass} autoComplete="new-password" />
                </div>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  Razón social o nombre comercial <span className="text-red-500">*</span>
                </label>
                <input name="razon_social" required className={inputClass} placeholder="Ej. Distribuidora del Pacífico SA de CV" />
              </div>
              <div>
                <label className={labelClass}>
                  Nombre del contacto <span className="text-red-500">*</span>
                </label>
                <input name="contacto_nombre" required className={inputClass} placeholder="Nombre completo" />
              </div>
              <div>
                <label className={labelClass}>Cargo (opcional)</label>
                <input name="contacto_cargo" className={inputClass} placeholder="Ej. Jefe de tráfico" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  WhatsApp / teléfono <span className="text-red-500">*</span>
                </label>
                <input
                  name="telefono"
                  type="tel"
                  required
                  pattern="[0-9+\\s]{10,}"
                  className={inputClass}
                  placeholder="646 123 4567"
                />
              </div>
              <div className="flex items-start gap-3 sm:col-span-2">
                <input type="checkbox" name="acepta_privacidad" id="priv" required className="mt-1 rounded border-slate-300 text-blue-600" />
                <label htmlFor="priv" className="text-sm text-slate-600">
                  Acepto que mis datos se usen para contactarme y gestionar mi solicitud de acceso a TransLogix,
                  conforme a la política de privacidad.
                </label>
              </div>
            </div>
            {message && <p className="text-sm text-red-600">{message.text}</p>}
            <button
              type="submit"
              disabled={sending}
              className="flex w-full items-center justify-center rounded-xl bg-blue-600 py-4 font-bold text-white shadow-lg transition hover:bg-blue-700 disabled:opacity-60"
            >
              {sending ? 'Enviando…' : 'Crear cuenta y enviar solicitud'}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          ¿Ofreces transporte?{' '}
          <Link to="/registro/transportista" className="font-semibold text-blue-600 hover:underline">
            Registro para ofrecer servicios
          </Link>
          {' · '}
          <Link to="/iniciar-sesion" className="font-semibold text-slate-600 hover:underline">
            Ya tengo cuenta
          </Link>
        </p>
      </main>
    </div>
  )
}
