import type { ReactNode } from 'react'
import { useCallback, useState } from 'react'
import { sanitizeGuiaCloneForHtml2Canvas } from '@/pages/admin/guiaPdfCloneStyles'

function BloqueRol({
  titulo,
  color,
  children,
}: {
  titulo: string
  color: 'slate' | 'blue' | 'emerald'
  children: ReactNode
}) {
  const ring =
    color === 'blue'
      ? 'border-blue-200 bg-blue-50/40'
      : color === 'emerald'
        ? 'border-emerald-200 bg-emerald-50/40'
        : 'border-slate-200 bg-slate-50/60'
  const badge =
    color === 'blue'
      ? 'bg-blue-100 text-blue-900'
      : color === 'emerald'
        ? 'bg-emerald-100 text-emerald-900'
        : 'bg-slate-200 text-slate-800'
  return (
    <section data-guia-bloque className={`rounded-2xl border p-5 sm:p-6 ${ring}`}>
      <h2 className={`mb-4 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${badge}`}>
        {titulo}
      </h2>
      <div className="space-y-4 text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div data-guia-seccion>
      <h3 className="mb-2 text-base font-bold text-slate-900">{titulo}</h3>
      <div className="space-y-2 pl-0 sm:pl-1">{children}</div>
    </div>
  )
}

function Item({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div data-guia-item className="rounded-xl border border-slate-100 bg-white/80 px-4 py-3">
      <p className="font-semibold text-slate-800">{titulo}</p>
      <div className="mt-1.5 text-slate-600">{children}</div>
    </div>
  )
}

export function AdminGuiaQuickstartPage() {
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfErr, setPdfErr] = useState('')

  const descargarPdf = useCallback(async () => {
    const el = document.getElementById('guia-pdf-root')
    if (!el) return
    setPdfErr('')
    setPdfBusy(true)
    try {
      const html2pdf = (await import('html2pdf.js')).default
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: `translogix-guia-rapida-${new Date().toISOString().slice(0, 10)}.pdf`,
          image: { type: 'jpeg', quality: 0.92 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            ignoreElements: (node: Element) =>
              node instanceof HTMLElement && node.classList.contains('no-pdf'),
            onclone: (clonedDoc: Document) => {
              sanitizeGuiaCloneForHtml2Canvas(clonedDoc)
            },
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(el)
        .save()
    } catch (e) {
      console.error(e)
      setPdfErr('No se pudo generar el PDF. Intenta de nuevo o usa imprimir desde el navegador.')
    } finally {
      setPdfBusy(false)
    }
  }, [])

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div
        id="guia-pdf-root"
        className="rounded-2xl border border-transparent sm:border-slate-100 sm:bg-white/50 sm:p-6 sm:shadow-sm"
      >
        <div
          data-guia-header
          className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            <h1 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">Guía rápida del sistema</h1>
            <p className="text-sm text-slate-600">
              Quickstart interno: solo lo ven administradores. Resume el flujo de TransLogix y qué puede hacer cada
              tipo de cuenta en su panel.
            </p>
          </div>
          <button
            type="button"
            className="no-pdf inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-700/25 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900 transition hover:bg-red-100 disabled:opacity-60"
            disabled={pdfBusy}
            onClick={() => void descargarPdf()}
          >
            <i className="fas fa-file-pdf" aria-hidden />
            {pdfBusy ? 'Generando PDF…' : 'Descargar PDF'}
          </button>
        </div>

        {pdfErr ? <p className="no-pdf mb-4 text-sm text-red-600">{pdfErr}</p> : null}

        <p
          data-guia-nota
          className="mb-10 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          Esta pantalla no sustituye políticas de negocio ni contratos con clientes o transportistas; sirve para
          alinear al equipo y dar contexto a nuevos administradores.
        </p>

        <div
          data-guia-flujo
          className="mb-10 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 className="text-lg font-bold text-slate-900">Cómo encaja todo</h2>
          <ol className="list-inside list-decimal space-y-2 text-sm text-slate-700">
            <li>
              <strong className="text-slate-900">Alta pública:</strong> cliente o transportista se registra con el
              formulario; la cuenta queda en lista de espera hasta que un admin la aprueba.
            </li>
            <li>
              <strong className="text-slate-900">Aprobación:</strong> desde Waitlist o Usuarios el admin aprueba o
              rechaza; en clientes/transportistas aprobados se vincula el usuario y pueden entrar al panel general
              (<strong className="text-slate-900">/iniciar-sesión</strong>), no al panel admin.
            </li>
            <li>
              <strong className="text-slate-900">Solicitudes:</strong> el cliente crea solicitudes de servicio; el admin
              las revisa en <strong className="text-slate-900">Solicitudes</strong>, asigna transportista y unidad de
              flota, o rechaza. Se envían avisos por correo cuando aplica.
            </li>
            <li>
              <strong className="text-slate-900">Operación:</strong> el transportista ve sus viajes asignados y la unidad
              ligada; el cliente ve historial y puede editar o cancelar solo mientras la solicitud está pendiente.
            </li>
          </ol>
        </div>

        <div data-guia-roles className="flex flex-col gap-8">
          <BloqueRol titulo="Administrador" color="slate">
            <p className="text-slate-600">
              Desde este panel (menú superior) gestionas solicitudes, cuentas en espera, usuarios dados de alta y la
              flota registrada por transportistas.
            </p>
            <Seccion titulo="Secciones del panel">
              <Item titulo="Solicitudes">
                <ul className="mt-2 list-inside list-disc space-y-1 text-slate-600">
                  <li>
                    Ver solicitudes en tarjetas; ordenar y exportar a Excel con el mismo detalle enriquecido que el
                    modal.
                  </li>
                  <li>
                    <strong className="text-slate-800">Aprobar</strong> (pendiente): elegir transportista activo y una
                    unidad de su flota; la solicitud pasa a asignado y se notifica a cliente y transportista.
                  </li>
                  <li>
                    <strong className="text-slate-800">Rechazar</strong> (pendiente): la solicitud queda rechazada; se
                    avisa al cliente. Se puede <strong className="text-slate-800">Revertir</strong> a pendiente sin
                    correo en ese paso.
                  </li>
                  <li>
                    <strong className="text-slate-800">Cancelar asignación</strong> (asignado): vuelve a pendiente,
                    limpia transportista/unidad y notifica a ambas partes.
                  </li>
                  <li>
                    Icono de <strong className="text-slate-800">detalle</strong>: ver solicitud, cliente, carga,
                    horarios, transportista y vehículo según datos guardados y registro.
                  </li>
                </ul>
              </Item>
              <Item titulo="Usuarios">
                Listado de expedientes de clientes y transportistas con estado de aprobación; acciones de
                aprobar/rechazar y exportación cuando el flujo lo permita.
              </Item>
              <Item titulo="Waitlist">
                Cola de registros pendientes de aprobación para dar de alta cuentas con rapidez.
              </Item>
              <Item titulo="Flota">
                Vista de unidades que los transportistas cargan en su panel; sirve de referencia operativa y al asignar
                servicios.
              </Item>
              <Item titulo="Guía rápida">
                Esta misma página; puedes descargarla en PDF para compartirla solo con personas autorizadas (no
                contiene credenciales ni enlaces de acceso privilegiado).
              </Item>
              <Item titulo="Mi cuenta">
                Mismo perfil y seguridad que en otros paneles (correo, contraseña) para el usuario admin.
              </Item>
            </Seccion>
          </BloqueRol>

          <BloqueRol titulo="Cliente" color="blue">
            <p className="text-slate-600">
              Tras aprobación, entra en <strong className="text-slate-800">/iniciar-sesión</strong> y el sistema lo envía
              al panel <strong className="text-slate-800">/panel/cliente</strong>.
            </p>
            <Seccion titulo="Secciones">
              <Item titulo="Nueva solicitud">
                Registra título, fecha del servicio, <strong className="text-slate-800">hora de carga</strong>, ventana
                de entrega (inicio y fin obligatorios), origen/destino opcionales, peso/dimensiones y detalle. La
                solicitud nace en estado pendiente.
              </Item>
              <Item titulo="Historial de solicitudes">
                Lista con pestañas por estado; en <strong className="text-slate-800">pendiente</strong> puede editar
                datos o cancelar la solicitud. Con asignación o rechazo, solo consulta.
              </Item>
              <Item titulo="Mi cuenta">Datos de perfil y contraseña.</Item>
            </Seccion>
          </BloqueRol>

          <BloqueRol titulo="Transportista" color="emerald">
            <p className="text-slate-600">
              Tras aprobación, entra en <strong className="text-slate-800">/iniciar-sesión</strong> y el sistema lo envía
              al panel <strong className="text-slate-800">/panel/transportista</strong>.
            </p>
            <Seccion titulo="Secciones">
              <Item titulo="Mis viajes">
                Lista de solicitudes en estado <strong className="text-slate-800">asignado</strong> donde él es el
                transportista: fecha del servicio, <strong className="text-slate-800">hora de carga</strong>, ventana de
                entrega, ruta, notas del cliente y la <strong className="text-slate-800">unidad asignada</strong> (texto
                resumido que dejó administración al aprobar).
              </Item>
              <Item titulo="Mi flota">
                Tabla de vehículos ya registrados (solo lectura de listado en esta pantalla).
              </Item>
              <Item titulo="Agregar vehículo">
                Formulario para dar de alta tipo de unidad, placas y número económico opcional; tras guardar vuelve a Mi
                flota. Esas unidades son las que el admin puede elegir al aprobar una solicitud.
              </Item>
              <Item titulo="Mi cuenta">Perfil y contraseña.</Item>
            </Seccion>
          </BloqueRol>
        </div>

        <p data-guia-footer className="mt-10 text-center text-xs text-slate-500">
          TransLogix — documentación interna de flujo. Mantén este contenido al día cuando cambien pantallas o reglas
          de negocio (ver reglas del proyecto para el agente).
        </p>
      </div>
    </main>
  )
}
