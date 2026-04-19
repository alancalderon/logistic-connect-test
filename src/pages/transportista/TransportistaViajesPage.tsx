import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatoInstanteLocal } from '@/lib/solicitudHorarios'
import { getSupabase } from '@/lib/supabase'

function fechaLocalHoyYmd(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type ViajeAsignado = {
  id: string
  titulo: string
  descripcion: string | null
  fecha_servicio: string
  carga_programada: string | null
  entrega_ventana_inicio: string | null
  entrega_ventana_fin: string | null
  origen: string | null
  destino: string | null
  peso_carga: string | null
  dimensiones_carga: string | null
  flota_unidad_resumen: string | null
}

function fechaServicioYmd(row: ViajeAsignado): string {
  return String(row.fecha_servicio ?? '').slice(0, 10)
}

export function TransportistaViajesPage() {
  const sb = getSupabase()
  const [proximos, setProximos] = useState<ViajeAsignado[]>([])
  const [pasados, setPasados] = useState<ViajeAsignado[]>([])
  const [loadErr, setLoadErr] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!sb) return
    const { data: s } = await sb.auth.getSession()
    const uid = s.session?.user?.id
    if (!uid) return

    const { data, error } = await sb
      .from('solicitudes_servicio')
      .select(
        'id, titulo, descripcion, fecha_servicio, carga_programada, entrega_ventana_inicio, entrega_ventana_fin, origen, destino, peso_carga, dimensiones_carga, flota_unidad_resumen',
      )
      .eq('transportista_user_id', uid)
      .eq('estado', 'asignado')
      .order('fecha_servicio', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      setLoadErr(error.message)
      setProximos([])
      setPasados([])
      return
    }

    const hoy = fechaLocalHoyYmd()
    const list: ViajeAsignado[] = (data ?? []).map((r) => ({
      id: String(r.id),
      titulo: String(r.titulo ?? ''),
      descripcion: r.descripcion != null ? String(r.descripcion) : null,
      fecha_servicio: String(r.fecha_servicio ?? '').slice(0, 10),
      carga_programada:
        'carga_programada' in r && r.carga_programada != null ? String(r.carga_programada) : null,
      entrega_ventana_inicio:
        'entrega_ventana_inicio' in r && r.entrega_ventana_inicio != null
          ? String(r.entrega_ventana_inicio)
          : null,
      entrega_ventana_fin:
        'entrega_ventana_fin' in r && r.entrega_ventana_fin != null ? String(r.entrega_ventana_fin) : null,
      origen: r.origen != null ? String(r.origen) : null,
      destino: r.destino != null ? String(r.destino) : null,
      peso_carga: 'peso_carga' in r && r.peso_carga != null ? String(r.peso_carga) : null,
      dimensiones_carga:
        'dimensiones_carga' in r && r.dimensiones_carga != null ? String(r.dimensiones_carga) : null,
      flota_unidad_resumen:
        'flota_unidad_resumen' in r && r.flota_unidad_resumen != null ? String(r.flota_unidad_resumen) : null,
    }))

    const pr: ViajeAsignado[] = []
    const pa: ViajeAsignado[] = []
    for (const row of list) {
      if (fechaServicioYmd(row) >= hoy) pr.push(row)
      else pa.push(row)
    }
    setLoadErr('')
    setProximos(pr)
    setPasados(pa)
  }, [sb])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await load()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [load])

  function TarjetaViaje({ v, destacarUnidad }: { v: ViajeAsignado; destacarUnidad: boolean }) {
    const ruta = [v.origen, v.destino].filter(Boolean).join(' → ') || '—'
    const unidad = v.flota_unidad_resumen?.trim() || '—'
    return (
      <article
        className={`rounded-2xl border bg-white p-4 shadow-sm ${
          destacarUnidad ? 'border-slate-800 ring-1 ring-slate-800/10' : 'border-slate-200'
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Servicio</p>
            <h2 className="text-base font-semibold leading-snug text-slate-900">{v.titulo}</h2>
            <p className="mt-1 text-sm font-medium text-slate-700">
              Fecha del servicio: <span className="text-slate-900">{v.fecha_servicio}</span>
            </p>
          </div>
          <div
            className={`shrink-0 rounded-xl px-3 py-2 text-sm ${
              destacarUnidad ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800'
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-90">Unidad asignada</p>
            <p className="mt-0.5 font-semibold leading-snug">{unidad}</p>
          </div>
        </div>
        <dl className="mt-3 grid gap-2 border-t border-slate-100 pt-3 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-slate-500">Hora de carga</dt>
            <dd>{v.carga_programada ? formatoInstanteLocal(v.carga_programada) : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500">Ventana de entrega</dt>
            <dd>
              {v.entrega_ventana_inicio && v.entrega_ventana_fin ? (
                <>
                  {formatoInstanteLocal(v.entrega_ventana_inicio)} → {formatoInstanteLocal(v.entrega_ventana_fin)}
                </>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold text-slate-500">Ruta</dt>
            <dd>{ruta}</dd>
          </div>
          {(v.peso_carga || v.dimensiones_carga) && (
            <div className="sm:col-span-2 text-xs text-slate-600">
              {[v.peso_carga, v.dimensiones_carga].filter(Boolean).join(' · ')}
            </div>
          )}
        </dl>
        {v.descripcion?.trim() ? (
          <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-700">Notas: </span>
            <span className="whitespace-pre-wrap">{v.descripcion}</span>
          </p>
        ) : null}
      </article>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-2 text-2xl font-bold text-slate-800">Mis viajes asignados</h1>
      <p className="mb-2 text-sm text-slate-600">
        Aquí ves los servicios que operaciones te asignó, con la <strong className="text-slate-800">unidad de tu flota</strong>{' '}
        que quedó ligada a cada uno. Los datos los carga el cliente; coordina el contacto con él si necesitas aclaraciones.
      </p>
      <p className="mb-8 text-sm text-slate-600">
        Consulta tus unidades en{' '}
        <Link to="/panel/transportista/flota" className="font-semibold text-blue-600 underline-offset-2 hover:underline">
          Mi flota
        </Link>{' '}
        o registra otra en{' '}
        <Link
          to="/panel/transportista/agregar-vehiculo"
          className="font-semibold text-blue-600 underline-offset-2 hover:underline"
        >
          Agregar vehículo
        </Link>
        .
      </p>

      {!sb && <p className="text-amber-800">No hay conexión con el servidor.</p>}
      {loading && sb && <p className="text-slate-500">Cargando…</p>}
      {!loading && loadErr && <p className="text-red-600">{loadErr}</p>}

      {!loading && !loadErr && proximos.length === 0 && pasados.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No tienes viajes asignados en este momento. Cuando operaciones apruebe una solicitud a tu nombre y unidad,
          aparecerá aquí.
        </p>
      )}

      {!loading && !loadErr && proximos.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-bold text-slate-800">Próximos (hoy o después)</h2>
          <div className="flex flex-col gap-4">
            {proximos.map((v) => (
              <TarjetaViaje key={v.id} v={v} destacarUnidad />
            ))}
          </div>
        </section>
      )}

      {!loading && !loadErr && proximos.length === 0 && pasados.length > 0 && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No hay servicios con fecha de hoy o posterior. Abajo aparecen asignaciones con fecha ya pasada que siguen
          registradas como activas en el sistema.
        </p>
      )}

      {!loading && !loadErr && pasados.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-800">Fecha de servicio ya pasada</h2>
          <div className="flex flex-col gap-4">
            {pasados.map((v) => (
              <TarjetaViaje key={v.id} v={v} destacarUnidad={false} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
