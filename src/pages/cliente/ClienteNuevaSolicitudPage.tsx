import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { notifyAdminsNuevaSolicitudServicio } from '@/lib/notifyAdmins'
import {
  combinarFechaYHoraLocalAFechaIso,
  validarVentanaEntrega,
} from '@/lib/solicitudHorarios'
import { getSupabase } from '@/lib/supabase'
import { inputClass, labelClass } from '@/lib/formStyles'

export function ClienteNuevaSolicitudPage() {
  const sb = getSupabase()
  const [msg, setMsg] = useState('')
  const [okMsg, setOkMsg] = useState('')
  const [saving, setSaving] = useState(false)

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setMsg('')
    setOkMsg('')
    if (!sb) {
      setMsg('No hay conexión con el servidor. Revisa la configuración.')
      return
    }
    const { data: s } = await sb.auth.getSession()
    const uid = s.session?.user?.id
    if (!uid) {
      setMsg('No hay sesión activa. Cierra sesión y vuelve a entrar con tu cuenta de cliente.')
      return
    }
    const fd = new FormData(form)
    const titulo = String(fd.get('titulo') ?? '').trim()
    const fecha = String(fd.get('fecha_servicio') ?? '')
    const horaCarga = String(fd.get('hora_carga') ?? '').trim()
    const entregaDesde = String(fd.get('entrega_ventana_desde') ?? '')
    const entregaHasta = String(fd.get('entrega_ventana_hasta') ?? '')

    if (!titulo || !fecha) {
      setMsg('Título y fecha del servicio son obligatorios.')
      return
    }
    if (!horaCarga) {
      setMsg('Indica la hora de carga (hora del servicio).')
      return
    }

    const cargaIso = combinarFechaYHoraLocalAFechaIso(fecha, horaCarga)
    if (!cargaIso) {
      setMsg('La fecha u hora de carga no son válidas.')
      return
    }

    const ventana = validarVentanaEntrega(entregaDesde, entregaHasta)
    if (!ventana.ok) {
      setMsg(ventana.error)
      return
    }

    setSaving(true)
    const { data: inserted, error } = await sb
      .from('solicitudes_servicio')
      .insert({
        user_id: uid,
        titulo,
        descripcion: String(fd.get('descripcion') ?? '').trim() || null,
        fecha_servicio: fecha,
        carga_programada: cargaIso,
        entrega_ventana_inicio: ventana.inicio,
        entrega_ventana_fin: ventana.fin,
        origen: String(fd.get('origen') ?? '').trim() || null,
        destino: String(fd.get('destino') ?? '').trim() || null,
        peso_carga: String(fd.get('peso_carga') ?? '').trim() || null,
        dimensiones_carga: String(fd.get('dimensiones_carga') ?? '').trim() || null,
      })
      .select('id')
      .single()
    setSaving(false)
    if (error) {
      setMsg(error.message)
      return
    }
    setOkMsg('Solicitud registrada correctamente.')
    if (inserted?.id) {
      void notifyAdminsNuevaSolicitudServicio(sb, String(inserted.id))
    }
    form.reset()
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-2 text-2xl font-bold text-slate-800">Nueva solicitud de servicio</h1>
      <p className="mb-2 text-sm text-slate-600">
        Registra la <strong>fecha</strong> del servicio, la <strong>hora de carga</strong> y la{' '}
        <strong>ventana de entrega</strong> (inicio y fin). El equipo lo verá en administración.
      </p>
      <p className="mb-8 text-sm text-slate-600">
        Para ver lo que ya enviaste, abre{' '}
        <Link to="/panel/cliente/historial" className="font-semibold text-blue-600 underline-offset-2 hover:underline">
          Historial de solicitudes
        </Link>
        .
      </p>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(ev) => void onCreate(ev)}>
          <div className="sm:col-span-2">
            <label className={labelClass}>Título breve</label>
            <input name="titulo" required className={inputClass} placeholder="Ej. Entrega planta Otay — bodega Centro" />
          </div>
          <div>
            <label className={labelClass}>
              Fecha del servicio <span className="text-red-500">*</span>
            </label>
            <input name="fecha_servicio" type="date" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>
              Hora de carga <span className="text-red-500">*</span>
            </label>
            <input name="hora_carga" type="time" required className={inputClass} />
            <p className="mt-1 text-xs text-slate-500">Hora local en la que se prevé la carga ese día.</p>
          </div>
          <div className="sm:col-span-2 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              Ventana de entrega <span className="text-red-500">*</span>
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="entrega-desde">
                  Desde (fecha y hora) <span className="text-red-500">*</span>
                </label>
                <input
                  id="entrega-desde"
                  name="entrega_ventana_desde"
                  type="datetime-local"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="entrega-hasta">
                  Hasta (fecha y hora) <span className="text-red-500">*</span>
                </label>
                <input
                  id="entrega-hasta"
                  name="entrega_ventana_hasta"
                  type="datetime-local"
                  required
                  className={inputClass}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Intervalo en el que debe realizarse la entrega (hora local en tu zona).
            </p>
          </div>
          <div>
            <label className={labelClass}>Estado</label>
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Se crea como pendiente hasta asignación.
            </p>
          </div>
          <div className="hidden sm:block" aria-hidden />
          <div>
            <label className={labelClass}>Origen (opcional)</label>
            <input name="origen" className={inputClass} placeholder="Ciudad, planta o CP" />
          </div>
          <div>
            <label className={labelClass}>Destino (opcional)</label>
            <input name="destino" className={inputClass} placeholder="Ciudad o destino" />
          </div>
          <div>
            <label className={labelClass}>Peso de la carga (opcional)</label>
            <input name="peso_carga" className={inputClass} placeholder="Ej. 800 kg, 1.2 ton" />
          </div>
          <div>
            <label className={labelClass}>Dimensiones de la carga (opcional)</label>
            <input
              name="dimensiones_carga"
              className={inputClass}
              placeholder="Ej. 2 m × 1.2 m × 0.9 m"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Detalle</label>
            <textarea name="descripcion" rows={3} className={`${inputClass} resize-y`} placeholder="Volumen, equipo requerido…" />
          </div>
          {msg && <p className="text-sm text-red-600 sm:col-span-2">{msg}</p>}
          {okMsg && <p className="text-sm text-green-700 sm:col-span-2">{okMsg}</p>}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Registrar solicitud'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
