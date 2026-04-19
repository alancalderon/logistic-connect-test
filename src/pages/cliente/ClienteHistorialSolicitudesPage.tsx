import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  combinarFechaYHoraLocalAFechaIso,
  datetimeLocalValueFromIso,
  formatoInstanteLocal,
  horaLocalHHmmFromIso,
  validarVentanaEntrega,
} from '@/lib/solicitudHorarios'
import { getSupabase } from '@/lib/supabase'
import { inputClass, labelClass } from '@/lib/formStyles'
import { solicitudServicioEstadoBadge, solicitudServicioEstadoLabel } from '@/lib/solicitudServicioUi'

function fechaLocalYmd(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function ymdSolicitud(raw: string): string {
  return String(raw ?? '').slice(0, 10)
}

type TabHistorial = 'proximas' | 'todas'

const ESTADOS_FILTRO = ['pendiente', 'asignado', 'cancelado', 'rechazada'] as const

type OrdenCampo = 'fecha_servicio' | 'created_at'
type OrdenDir = 'asc' | 'desc'

type SolicitudRow = {
  id: string
  created_at: string
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
  estado: string
  transportista_contacto: string | null
  flota_unidad_resumen: string | null
}

/** Instantáneo a partir de ISO de `created_at` (incluye fecha y hora). */
function tiempoMs(iso: string): number {
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : 0
}

/**
 * Por fecha de servicio: ordena por día; mismo día → por hora de registro.
 * Por fecha de registro: ordena por `created_at` completo (fecha y hora).
 */
function cmpSolicitudes(a: SolicitudRow, b: SolicitudRow, ordenCampo: OrdenCampo, asc: boolean): number {
  const mul = asc ? 1 : -1
  if (ordenCampo === 'fecha_servicio') {
    const da = ymdSolicitud(a.fecha_servicio)
    const db = ymdSolicitud(b.fecha_servicio)
    if (da < db) return -1 * mul
    if (da > db) return 1 * mul
    const ta = tiempoMs(a.created_at)
    const tb = tiempoMs(b.created_at)
    if (ta < tb) return -1 * mul
    if (ta > tb) return 1 * mul
    return 0
  }
  const ta = tiempoMs(a.created_at)
  const tb = tiempoMs(b.created_at)
  if (ta < tb) return -1 * mul
  if (ta > tb) return 1 * mul
  return 0
}

function puedeEditarOCancelarCliente(row: SolicitudRow): boolean {
  return row.estado === 'pendiente'
}

export function ClienteHistorialSolicitudesPage() {
  const sb = getSupabase()
  const [rows, setRows] = useState<SolicitudRow[]>([])
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState<TabHistorial>('proximas')
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [ordenCampo, setOrdenCampo] = useState<OrdenCampo>('fecha_servicio')
  const [ordenDir, setOrdenDir] = useState<OrdenDir>('asc')

  const [editTarget, setEditTarget] = useState<SolicitudRow | null>(null)
  const [editTitulo, setEditTitulo] = useState('')
  const [editFecha, setEditFecha] = useState('')
  const [editOrigen, setEditOrigen] = useState('')
  const [editDestino, setEditDestino] = useState('')
  const [editPeso, setEditPeso] = useState('')
  const [editDimensiones, setEditDimensiones] = useState('')
  const [editDescripcion, setEditDescripcion] = useState('')
  const [editHoraCarga, setEditHoraCarga] = useState('')
  const [editEntregaDesde, setEditEntregaDesde] = useState('')
  const [editEntregaHasta, setEditEntregaHasta] = useState('')
  const [editBusy, setEditBusy] = useState(false)
  const [editErr, setEditErr] = useState('')

  const [cancelTarget, setCancelTarget] = useState<SolicitudRow | null>(null)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [cancelErr, setCancelErr] = useState('')

  const modalesAbiertos = editTarget != null || cancelTarget != null

  useEffect(() => {
    if (!editTarget) return
    setEditTitulo(editTarget.titulo)
    setEditFecha(ymdSolicitud(editTarget.fecha_servicio))
    setEditOrigen(editTarget.origen ?? '')
    setEditDestino(editTarget.destino ?? '')
    setEditPeso(editTarget.peso_carga ?? '')
    setEditDimensiones(editTarget.dimensiones_carga ?? '')
    setEditDescripcion(editTarget.descripcion ?? '')
    setEditHoraCarga(
      editTarget.carga_programada ? horaLocalHHmmFromIso(editTarget.carga_programada) : '09:00',
    )
    setEditEntregaDesde(datetimeLocalValueFromIso(editTarget.entrega_ventana_inicio))
    setEditEntregaHasta(datetimeLocalValueFromIso(editTarget.entrega_ventana_fin))
    setEditErr('')
  }, [editTarget])

  const load = useCallback(async () => {
    if (!sb) return
    const { data, error } = await sb
      .from('solicitudes_servicio')
      .select(
        'id, created_at, titulo, descripcion, fecha_servicio, carga_programada, entrega_ventana_inicio, entrega_ventana_fin, origen, destino, peso_carga, dimensiones_carga, estado, transportista_contacto, flota_unidad_resumen',
      )
    if (error) {
      setMsg(error.message)
      return
    }
    setMsg('')
    setRows(
      (data ?? []).map((s) => ({
        id: String(s.id),
        created_at: String(s.created_at),
        titulo: String(s.titulo ?? ''),
        descripcion: s.descripcion != null ? String(s.descripcion) : null,
        fecha_servicio: String(s.fecha_servicio ?? '').slice(0, 10),
        carga_programada:
          'carga_programada' in s && s.carga_programada != null ? String(s.carga_programada) : null,
        entrega_ventana_inicio:
          'entrega_ventana_inicio' in s && s.entrega_ventana_inicio != null
            ? String(s.entrega_ventana_inicio)
            : null,
        entrega_ventana_fin:
          'entrega_ventana_fin' in s && s.entrega_ventana_fin != null ? String(s.entrega_ventana_fin) : null,
        origen: s.origen != null ? String(s.origen) : null,
        destino: s.destino != null ? String(s.destino) : null,
        peso_carga: 'peso_carga' in s && s.peso_carga != null ? String(s.peso_carga) : null,
        dimensiones_carga:
          'dimensiones_carga' in s && s.dimensiones_carga != null ? String(s.dimensiones_carga) : null,
        estado: String(s.estado ?? ''),
        transportista_contacto:
          'transportista_contacto' in s && s.transportista_contacto != null
            ? String(s.transportista_contacto)
            : null,
        flota_unidad_resumen:
          'flota_unidad_resumen' in s && s.flota_unidad_resumen != null ? String(s.flota_unidad_resumen) : null,
      })),
    )
  }, [sb])

  useEffect(() => {
    void load()
  }, [load])

  const hoy = fechaLocalYmd()
  const porTab = useMemo(() => {
    if (tab === 'todas') return rows
    return rows.filter((r) => {
      const fd = ymdSolicitud(r.fecha_servicio)
      if (fd < hoy) return false
      if (r.estado === 'rechazada') return false
      if (r.estado === 'cancelado') return false
      return true
    })
  }, [rows, tab, hoy])

  const porEstado = useMemo(() => {
    if (!filtroEstado) return porTab
    return porTab.filter((r) => r.estado === filtroEstado)
  }, [porTab, filtroEstado])

  const mostrados = useMemo(() => {
    const copy = [...porEstado]
    const asc = ordenDir === 'asc'
    copy.sort((a, b) => cmpSolicitudes(a, b, ordenCampo, asc))
    return copy
  }, [porEstado, ordenCampo, ordenDir])

  function closeEditModal() {
    if (editBusy) return
    setEditTarget(null)
    setEditErr('')
  }

  function closeCancelModal() {
    if (cancelBusy) return
    setCancelTarget(null)
    setCancelErr('')
  }

  async function onConfirmEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!sb || !editTarget) return
    setEditErr('')
    const tit = editTitulo.trim()
    const fecha = editFecha.trim()
    const horaC = editHoraCarga.trim()
    if (!tit || !fecha) {
      setEditErr('Título y fecha del servicio son obligatorios.')
      return
    }
    if (!horaC) {
      setEditErr('Indica la hora de carga.')
      return
    }
    const cargaIso = combinarFechaYHoraLocalAFechaIso(fecha, horaC)
    if (!cargaIso) {
      setEditErr('La fecha u hora de carga no son válidas.')
      return
    }
    const ventana = validarVentanaEntrega(editEntregaDesde, editEntregaHasta)
    if (!ventana.ok) {
      setEditErr(ventana.error)
      return
    }
    setEditBusy(true)
    const { data: updated, error } = await sb
      .from('solicitudes_servicio')
      .update({
        titulo: tit,
        descripcion: editDescripcion.trim() || null,
        fecha_servicio: fecha,
        carga_programada: cargaIso,
        entrega_ventana_inicio: ventana.inicio,
        entrega_ventana_fin: ventana.fin,
        origen: editOrigen.trim() || null,
        destino: editDestino.trim() || null,
        peso_carga: editPeso.trim() || null,
        dimensiones_carga: editDimensiones.trim() || null,
      })
      .eq('id', editTarget.id)
      .eq('estado', 'pendiente')
      .select('id')
    setEditBusy(false)
    if (error) {
      setEditErr(error.message)
      return
    }
    if (!updated?.length) {
      setEditErr('La solicitud ya no está pendiente (quizá fue asignada o cancelada). Recarga la lista.')
      return
    }
    setEditTarget(null)
    await load()
  }

  async function onConfirmCancelar() {
    if (!sb || !cancelTarget) return
    setCancelErr('')
    setCancelBusy(true)
    const { data: updated, error } = await sb
      .from('solicitudes_servicio')
      .update({ estado: 'cancelado' })
      .eq('id', cancelTarget.id)
      .eq('estado', 'pendiente')
      .select('id')
    setCancelBusy(false)
    if (error) {
      setCancelErr(error.message)
      return
    }
    if (!updated?.length) {
      setCancelErr('La solicitud ya no está pendiente. Recarga la lista.')
      return
    }
    setCancelTarget(null)
    await load()
  }

  const tabBtn =
    'border-b-2 px-3 py-2 text-sm font-semibold transition sm:px-4 border-transparent text-slate-500 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50'
  const tabBtnActive =
    'border-b-2 px-3 py-2 text-sm font-semibold transition sm:px-4 border-blue-600 text-blue-700 disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-2 text-2xl font-bold text-slate-800">Historial de solicitudes</h1>
      <p className="mb-6 text-sm text-slate-600">
        Consulta lo que viene o el listado completo. Para crear otra, usa{' '}
        <Link
          to="/panel/cliente/nueva-solicitud"
          className="font-semibold text-blue-600 underline-offset-2 hover:underline"
        >
          Nueva solicitud
        </Link>
        .
      </p>

      {msg && <p className="mb-4 text-sm text-red-600">{msg}</p>}

      {rows.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Aún no hay solicitudes.{' '}
          <Link to="/panel/cliente/nueva-solicitud" className="font-semibold text-blue-600 hover:underline">
            Registra la primera
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="mb-4 flex gap-1 border-b border-slate-200">
            <button
              type="button"
              disabled={modalesAbiertos}
              className={tab === 'proximas' ? tabBtnActive : tabBtn}
              onClick={() => setTab('proximas')}
            >
              Próximas
            </button>
            <button
              type="button"
              disabled={modalesAbiertos}
              className={tab === 'todas' ? tabBtnActive : tabBtn}
              onClick={() => setTab('todas')}
            >
              Todas
            </button>
          </div>
          <p className="mb-4 text-xs text-slate-500">
            {tab === 'proximas' ? (
              <>
                Fecha de servicio <strong>hoy o posterior</strong> (según tu zona horaria), excluyendo{' '}
                <strong>rechazadas</strong> y <strong>canceladas</strong>.
              </>
            ) : (
              <>Todas las solicitudes enviadas. Usa los filtros y el orden abajo.</>
            )}
          </p>

          <div className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor="filtro-estado-sol">
                Estado
              </label>
              <select
                id="filtro-estado-sol"
                className={inputClass}
                disabled={modalesAbiertos}
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="">Todos</option>
                {ESTADOS_FILTRO.map((st) => (
                  <option key={st} value={st}>
                    {solicitudServicioEstadoLabel(st)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="orden-campo-sol">
                Ordenar por
              </label>
              <select
                id="orden-campo-sol"
                className={inputClass}
                disabled={modalesAbiertos}
                value={ordenCampo}
                onChange={(e) => setOrdenCampo(e.target.value as OrdenCampo)}
              >
                <option value="fecha_servicio">Fecha del servicio (mismo día → por hora de registro)</option>
                <option value="created_at">Fecha y hora de registro (alta)</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="orden-dir-sol">
                Dirección
              </label>
              <select
                id="orden-dir-sol"
                className={inputClass}
                disabled={modalesAbiertos}
                value={ordenDir}
                onChange={(e) => setOrdenDir(e.target.value as OrdenDir)}
              >
                <option value="asc">Ascendente (más antigua / temprana primero)</option>
                <option value="desc">Descendente (más reciente / tardía primero)</option>
              </select>
            </div>
          </div>

          {porTab.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              {tab === 'proximas' ? (
                <>
                  No hay solicitudes próximas. Revisa la pestaña <strong>Todas</strong> o registra una nueva con fecha a
                  futuro.
                </>
              ) : (
                'No hay filas que mostrar.'
              )}
            </p>
          ) : porEstado.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              No hay solicitudes con el estado seleccionado. Prueba con <strong>Todos</strong> u otro estatus.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Fecha servicio</th>
                    <th className="min-w-[10rem] px-4 py-3">Carga / entrega</th>
                    <th className="px-4 py-3">Título</th>
                    <th className="px-4 py-3">Peso / dimensiones</th>
                    <th className="px-4 py-3">Transportista</th>
                    <th className="px-4 py-3">Unidad</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Creado</th>
                    <th className="min-w-[9rem] px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {mostrados.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 font-medium">{r.fecha_servicio}</td>
                      <td className="max-w-[200px] px-4 py-3 align-top text-xs leading-snug text-slate-600">
                        {r.carga_programada ? (
                          <div>
                            <span className="font-semibold text-slate-700">Hora de carga:</span>{' '}
                            {formatoInstanteLocal(r.carga_programada)}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                        {r.entrega_ventana_inicio && r.entrega_ventana_fin ? (
                          <div className="mt-1">
                            <span className="font-semibold text-slate-700">Entrega:</span>{' '}
                            {formatoInstanteLocal(r.entrega_ventana_inicio)} →{' '}
                            {formatoInstanteLocal(r.entrega_ventana_fin)}
                          </div>
                        ) : null}
                      </td>
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
                        {new Date(r.created_at).toLocaleString('es-MX', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {puedeEditarOCancelarCliente(r) ? (
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={modalesAbiertos}
                              onClick={() => {
                                setCancelErr('')
                                setEditErr('')
                                setEditTarget(r)
                              }}
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              disabled={modalesAbiertos}
                              onClick={() => {
                                setEditErr('')
                                setCancelErr('')
                                setCancelTarget(r)
                              }}
                              className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-solicitud-title"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget && !editBusy) closeEditModal()
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="edit-solicitud-title" className="mb-2 text-lg font-bold text-slate-800">
              Editar solicitud
            </h2>
            <p className="mb-4 text-sm text-slate-600">
              Solo puedes modificar solicitudes <strong>pendientes</strong> (sin asignar ni rechazar). Los cambios se
              guardan al confirmar.
            </p>
            <form onSubmit={(ev) => void onConfirmEdit(ev)} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="edit-sol-titulo">
                  Título breve
                </label>
                <input
                  id="edit-sol-titulo"
                  className={inputClass}
                  value={editTitulo}
                  onChange={(e) => setEditTitulo(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="edit-sol-fecha">
                  Fecha del servicio
                </label>
                <input
                  id="edit-sol-fecha"
                  type="date"
                  className={inputClass}
                  value={editFecha}
                  onChange={(e) => setEditFecha(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="edit-sol-hora-carga">
                  Hora de carga
                </label>
                <input
                  id="edit-sol-hora-carga"
                  type="time"
                  className={inputClass}
                  value={editHoraCarga}
                  onChange={(e) => setEditHoraCarga(e.target.value)}
                  required
                />
              </div>
              <div className="sm:col-span-2 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Ventana de entrega <span className="text-red-500">*</span>
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="edit-entrega-desde">
                      Desde <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="edit-entrega-desde"
                      type="datetime-local"
                      className={inputClass}
                      value={editEntregaDesde}
                      onChange={(e) => setEditEntregaDesde(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="edit-entrega-hasta">
                      Hasta <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="edit-entrega-hasta"
                      type="datetime-local"
                      className={inputClass}
                      value={editEntregaHasta}
                      onChange={(e) => setEditEntregaHasta(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Si la solicitud no tenía ventana, indica inicio y fin antes de guardar.
                </p>
              </div>
              <div>
                <label className={labelClass}>Estado</label>
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Pendiente
                </p>
              </div>
              <div className="hidden sm:block" aria-hidden />
              <div>
                <label className={labelClass} htmlFor="edit-sol-origen">
                  Origen (opcional)
                </label>
                <input
                  id="edit-sol-origen"
                  className={inputClass}
                  value={editOrigen}
                  onChange={(e) => setEditOrigen(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="edit-sol-destino">
                  Destino (opcional)
                </label>
                <input
                  id="edit-sol-destino"
                  className={inputClass}
                  value={editDestino}
                  onChange={(e) => setEditDestino(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="edit-sol-peso">
                  Peso de la carga (opcional)
                </label>
                <input
                  id="edit-sol-peso"
                  className={inputClass}
                  value={editPeso}
                  onChange={(e) => setEditPeso(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="edit-sol-dim">
                  Dimensiones (opcional)
                </label>
                <input
                  id="edit-sol-dim"
                  className={inputClass}
                  value={editDimensiones}
                  onChange={(e) => setEditDimensiones(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="edit-sol-desc">
                  Detalle
                </label>
                <textarea
                  id="edit-sol-desc"
                  rows={3}
                  className={`${inputClass} resize-y`}
                  value={editDescripcion}
                  onChange={(e) => setEditDescripcion(e.target.value)}
                />
              </div>
              {editErr && <p className="text-sm text-red-600 sm:col-span-2">{editErr}</p>}
              <div className="flex justify-end gap-2 sm:col-span-2">
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={closeEditModal}
                  disabled={editBusy}
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={editBusy}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {editBusy ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-solicitud-title"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget && !cancelBusy) closeCancelModal()
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="cancel-solicitud-title" className="mb-2 text-lg font-bold text-slate-800">
              Cancelar solicitud
            </h2>
            <p className="mb-3 text-sm text-slate-600">
              La solicitud pasará a estado <strong>cancelada</strong> y <strong>no se podrá reactivar</strong>. Seguirá
              apareciendo en tu historial solo para consulta.
            </p>
            <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-800">{cancelTarget.titulo}</p>
              <p className="mt-1 text-slate-600">
                Servicio el <span className="font-medium">{cancelTarget.fecha_servicio}</span>
              </p>
            </div>
            {cancelErr && <p className="mb-3 text-sm text-red-600">{cancelErr}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={closeCancelModal}
                disabled={cancelBusy}
              >
                Volver
              </button>
              <button
                type="button"
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                disabled={cancelBusy}
                onClick={() => void onConfirmCancelar()}
              >
                {cancelBusy ? 'Procesando…' : 'Sí, cancelar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
