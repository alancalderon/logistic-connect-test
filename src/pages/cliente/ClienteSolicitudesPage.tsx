import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { notifyAdminsNuevaSolicitudServicio } from '@/lib/notifyAdmins'
import { getSupabase } from '@/lib/supabase'
import { inputClass, labelClass } from '@/lib/formStyles'
import { solicitudServicioEstadoBadge } from '@/lib/solicitudServicioUi'

type SolicitudRow = {
  id: string
  created_at: string
  titulo: string
  descripcion: string | null
  fecha_servicio: string
  origen: string | null
  destino: string | null
  peso_carga: string | null
  dimensiones_carga: string | null
  estado: string
  transportista_contacto: string | null
  flota_unidad_resumen: string | null
}

export function ClienteSolicitudesPage() {
  const sb = getSupabase()
  const [rows, setRows] = useState<SolicitudRow[]>([])
  const [msg, setMsg] = useState('')
  const [okMsg, setOkMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!sb) return
    const { data, error } = await sb
      .from('solicitudes_servicio')
      .select(
        'id, created_at, titulo, descripcion, fecha_servicio, origen, destino, peso_carga, dimensiones_carga, estado, transportista_contacto, flota_unidad_resumen',
      )
      .order('fecha_servicio', { ascending: true })
    if (error) {
      setMsg(error.message)
      return
    }
    setRows((data ?? []) as SolicitudRow[])
  }, [sb])

  useEffect(() => {
    void load()
  }, [load])

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
    if (!titulo || !fecha) {
      setMsg('Título y fecha del servicio son obligatorios.')
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
    await load()
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-2 text-2xl font-bold text-slate-800">Mis solicitudes de servicio</h1>
      <p className="mb-8 text-sm text-slate-600">
        Registra cada necesidad de transporte con la <strong>fecha del servicio</strong>; el equipo la verá en el panel
        de administración.
      </p>

      <div className="mb-10 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Nueva solicitud</h2>
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
            <label className={labelClass}>Estado</label>
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Se crea como pendiente hasta asignación.
            </p>
          </div>
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
            <textarea name="descripcion" rows={3} className={`${inputClass} resize-y`} placeholder="Volumen, ventana horaria, equipo requerido…" />
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

      <h2 className="mb-3 text-lg font-bold text-slate-800">Historial</h2>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Aún no hay solicitudes. Crea la primera con el formulario de arriba.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Fecha servicio</th>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Peso / dimensiones</th>
                <th className="px-4 py-3">Transportista</th>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Creado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{r.fecha_servicio}</td>
                  <td className="px-4 py-3">{r.titulo}</td>
                  <td className="max-w-[200px] px-4 py-3 text-xs text-slate-600">
                    {[r.peso_carga, r.dimensiones_carga].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="max-w-[180px] px-4 py-3 text-xs text-slate-700">
                    {r.transportista_contacto ?? '—'}
                  </td>
                  <td className="max-w-[200px] px-4 py-3 text-xs text-slate-600">{r.flota_unidad_resumen ?? '—'}</td>
                  <td className="px-4 py-3">{solicitudServicioEstadoBadge(r.estado)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {new Date(r.created_at).toLocaleDateString('es-MX')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
