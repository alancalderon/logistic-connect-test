import { Link } from 'react-router-dom'
import { PublicNav } from '@/components/PublicNav'
import { SiteFooter } from '@/components/SiteFooter'

const benefitCard =
  'relative rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8'

function ComingSoonBadge() {
  return (
    <span
      className="absolute right-4 top-4 max-w-[calc(100%-2rem)] truncate rounded-full border border-amber-200/80 bg-amber-100 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-amber-900 sm:right-6 sm:top-6 sm:px-2.5 sm:text-[10px]"
      title="Funcionalidad en desarrollo"
    >
      Coming soon
    </span>
  )
}

export function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PublicNav />

      <header className="relative overflow-x-hidden bg-slate-900 px-4 py-16 sm:px-6 sm:py-24">
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center md:flex-row md:items-start">
          <div className="mb-10 w-full text-white sm:mb-12 md:mb-0 md:w-1/2">
            <span className="mb-4 inline-block rounded-full bg-blue-600/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-400 sm:mb-6 sm:px-4 sm:text-xs">
              Logística 4.0 en Baja California
            </span>
            <h1 className="mb-4 text-3xl font-extrabold italic leading-tight sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl">
              Mueve tu carga con los mejores.
            </h1>
            <p className="mb-8 max-w-lg text-base text-slate-300 sm:mb-10 sm:text-lg md:text-xl">
              Conectamos la demanda de fletes con transportistas validados en tiempo real. Eficiencia,
              seguridad y control total.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link
                to="/registro/cliente"
                className="rounded-xl bg-blue-600 px-6 py-3.5 text-center text-base font-bold text-white shadow-xl transition hover:bg-blue-700 sm:px-8 sm:py-4 sm:text-lg"
              >
                Quiero solicitar servicio
              </Link>
              <Link
                to="/registro/transportista"
                className="rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-center text-base font-bold text-white transition hover:bg-white/20 sm:px-8 sm:py-4 sm:text-lg"
              >
                Quiero ofrecer mis servicios
              </Link>
            </div>
          </div>
          <div className="relative flex w-full max-w-full justify-center overflow-hidden md:w-1/2">
            <div className="absolute -z-10 h-full w-full max-w-md rounded-full bg-blue-500/10 blur-3xl" />
            <i
              className="fas fa-truck-moving select-none text-[min(42vw,12rem)] text-blue-500/20 sm:text-[min(38vw,15rem)] md:text-[18rem] lg:text-[20rem]"
              aria-hidden
            />
          </div>
        </div>
      </header>

      <section id="beneficios" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-10 text-center sm:mb-16">
          <h2 className="text-2xl font-bold text-slate-800 sm:text-3xl md:text-4xl">Diseñado para la industria moderna</h2>
          <p className="mx-auto mt-3 max-w-2xl px-1 text-sm text-slate-500 sm:mt-4 sm:text-base">
            Eliminamos las llamadas interminables y la incertidumbre en tus operaciones logísticas.
          </p>
        </div>
        <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
          <div className={benefitCard}>
            <ComingSoonBadge />
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-xl text-blue-600">
              <i className="fas fa-search-location" />
            </div>
            <h3 className="mb-3 pr-24 text-lg font-bold sm:text-xl md:pr-28">Rastreo Activo</h3>
            <p className="text-sm leading-relaxed text-slate-600">
              Mantén visibilidad de tus embarques desde el puerto hasta la bodega final con nuestro sistema de
              monitoreo.
            </p>
          </div>
          <div className={benefitCard}>
            <ComingSoonBadge />
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-xl text-emerald-600">
              <i className="fas fa-file-invoice-dollar" />
            </div>
            <h3 className="mb-3 pr-24 text-lg font-bold sm:text-xl md:pr-28">Subastas Reales</h3>
            <p className="text-sm leading-relaxed text-slate-600">
              Obtén el precio más justo del mercado mediante nuestro sistema de pujas competitivo entre
              transportistas verificados.
            </p>
          </div>
          <div className={benefitCard}>
            <ComingSoonBadge />
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-xl text-amber-600">
              <i className="fas fa-user-check" />
            </div>
            <h3 className="mb-3 pr-24 text-lg font-bold sm:text-xl md:pr-28">Vetting Riguroso</h3>
            <p className="text-sm leading-relaxed text-slate-600">
              No cualquiera entra. Validamos documentos, seguros y antecedentes de cada operador en nuestra red.
            </p>
          </div>
        </div>
      </section>

      <section id="unirse" className="bg-slate-100 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="mb-3 text-2xl font-extrabold leading-tight text-slate-800 sm:mb-4 sm:text-3xl md:text-4xl">
            ¿Listo para transformar tu operación?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-base text-slate-600 sm:mb-12 sm:text-lg">
            Crea tu cuenta y envía tu solicitud. Un administrador revisará y aprobará tu acceso; después podrás iniciar
            sesión aquí y usar tu panel (solicitudes de servicio o registro de flota).
          </p>
          <div className="grid gap-4 text-left sm:grid-cols-2 sm:gap-6">
            <Link
              to="/registro/cliente"
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-8"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-xl text-blue-600">
                <i className="fas fa-user-tie" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-800">Solicitar servicio</h3>
              <p className="mb-6 flex-1 text-sm text-slate-600">
                Solo correo, contraseña y datos de contacto. Tras la aprobación del equipo, entrarás a tu panel para
                crear solicitudes con fecha y detalle de cada servicio.
              </p>
              <span className="text-sm font-bold text-blue-600 group-hover:underline">
                Crear cuenta y solicitar <i className="fas fa-arrow-right ml-1 text-xs" />
              </span>
            </Link>
            <Link
              to="/registro/transportista"
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-8"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200 text-xl text-slate-700">
                <i className="fas fa-truck" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-800">Ofrecer mis servicios</h3>
              <p className="mb-6 flex-1 text-sm text-slate-600">
                Registro breve con RFC. Cuando tu cuenta sea aprobada, podrás dar de alta unidades y más datos desde tu
                panel.
              </p>
              <span className="text-sm font-bold text-slate-800 group-hover:underline">
                Crear cuenta como transportista <i className="fas fa-arrow-right ml-1 text-xs" />
              </span>
            </Link>
          </div>
          <ul className="mt-10 flex flex-col justify-center gap-4 text-sm text-slate-600 sm:mt-14 sm:flex-row sm:gap-10">
            <li className="flex items-center justify-center font-medium">
              <i className="fas fa-check-circle mr-2 text-blue-600" /> Sin costos ocultos de inscripción
            </li>
            <li className="flex items-center justify-center font-medium">
              <i className="fas fa-check-circle mr-2 text-blue-600" /> Soporte especializado
            </li>
            <li className="flex items-center justify-center font-medium">
              <i className="fas fa-check-circle mr-2 text-blue-600" /> Red en Baja California
            </li>
          </ul>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
