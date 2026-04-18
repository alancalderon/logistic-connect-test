import { Link, useLocation } from 'react-router-dom'

export type RegistroClienteConfirmState = {
  razonSocial?: string
  email?: string
  pendienteRevision?: boolean
  /** true si hace falta confirmar el correo antes de poder entrar */
  pendienteConfirmarCorreo?: boolean
}

export function RegistroClienteConfirmacionPage() {
  const state = useLocation().state as RegistroClienteConfirmState | null
  const nombre = state?.razonSocial?.trim() || null
  const email = state?.email?.trim() || null

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4 sm:px-6">
          <Link to="/" className="text-lg font-bold text-blue-600 no-underline transition hover:opacity-90">
            Trans<span className="text-slate-800">Logix</span>
          </Link>
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-4 py-12 text-center sm:px-6 sm:py-16">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">
          <i className="fas fa-check" aria-hidden />
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600">Solicitud enviada</p>
        <h1 className="mb-4 text-xl font-extrabold text-slate-800 sm:text-2xl">¡Listo, gracias!</h1>
        <p className="mb-4 rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-left text-sm leading-relaxed text-slate-700">
          Hacemos una <strong>validación manual</strong> de tu solicitud. Cuando te aprueben, podrás{' '}
          <strong>iniciar sesión</strong> con el mismo correo y contraseña que usaste al registrarte.
        </p>
        {state?.pendienteConfirmarCorreo ? (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-950">
            Es posible que debas <strong>confirmar tu correo</strong> antes de poder entrar: revisa tu bandeja (y la
            carpeta de spam) y abre el enlace de verificación.
          </p>
        ) : null}
        <p className="mb-2 text-slate-600 leading-relaxed">
          Registramos tu solicitud para <strong>solicitar servicio</strong>
          {nombre ? (
            <>
              {' '}
              a nombre de <strong className="text-slate-800">{nombre}</strong>
            </>
          ) : null}
          . {state?.pendienteRevision ? 'Un administrador revisará tu expediente en el panel.' : ''}
        </p>
        {email && (
          <p className="mb-8 text-sm text-slate-500">
            El correo <span className="font-medium text-slate-700">{email}</span> es tu usuario para entrar cuando el
            equipo apruebe tu solicitud.
          </p>
        )}
        {!email && <p className="mb-8 text-sm text-slate-500">Te contactaremos cuando haya novedades.</p>}

        <div className="flex w-full max-w-sm justify-center">
          <Link
            to="/"
            className="rounded-xl bg-blue-600 px-8 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  )
}
