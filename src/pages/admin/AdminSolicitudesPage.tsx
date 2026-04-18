import { useCallback, useEffect, useState } from 'react'
import { flotaUnidadResumen } from '@/lib/flotaFormat'
import {
  notifySolicitudServicioAprobadaCliente,
  notifySolicitudServicioAprobadaTransportista,
  notifySolicitudServicioAsignacionCanceladaCliente,
  notifySolicitudServicioAsignacionCanceladaTransportista,
  type SolicitudCorreoDetalle,
} from '@/lib/resendNotify'
import { getSupabase } from '@/lib/supabase'
import { inputClass, labelClass } from '@/lib/formStyles'
import { solicitudServicioEstadoBadge } from '@/lib/solicitudServicioUi'
import { formatIngreso } from '@/pages/admin/adminUi'

type SortKey = 'created_desc' | 'created_asc' | 'fecha_asc' | 'fecha_desc'

type Solicitud = {
  id: string
  created_at: string
  user_id: string
  titulo: string
  descripcion: string | null
  fecha_servicio: string
  origen: string | null
  destino: string | null
  peso_carga: string | null
  dimensiones_carga: string | null
  estado: string
  transportista_user_id: string | null
  transportista_contacto: string | null
  flota_unidad_id: string | null
  flota_unidad_resumen: string | null
  perfil_email: string | null
}

type TransportistaOpt = { userId: string; nombre_o_razon: string; email: string }

type FlotaOpt = {
  id: string
  tipo_unidad: string
  placas: string
  numero_economico: string | null
  label: string
}

function detalleCorreoDesdeRow(s: Solicitud): SolicitudCorreoDetalle {
  return {
    titulo: s.titulo,
    fecha_servicio: s.fecha_servicio,
    origen: s.origen,
    destino: s.destino,
    descripcion: s.descripcion,
    peso_carga: s.peso_carga,
    dimensiones_carga: s.dimensiones_carga,
  }
}

async function fetchClienteNombreYEmail(
  sb: NonNullable<ReturnType<typeof getSupabase>>,
  userId: string,
  perfilEmailHint: string | null,
): Promise<{ nombre: string; email: string | null }> {
  const { data: p } = await sb.from('profiles').select('email').eq('id', userId).maybeSingle()
  const fromProfile = p?.email ? String(p.email).trim() : ''
  const emailRaw = fromProfile || (perfilEmailHint?.trim() ?? '')
  const emailNorm = emailRaw.toLowerCase()
  const email = emailNorm.includes('@') ? emailNorm : null
  const { data: c } = await sb
    .from('registro_clientes')
    .select('razon_social, contacto_nombre')
    .eq('user_id', userId)
    .eq('estado_aprobacion', 'aprobado')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const razon = String(c?.razon_social ?? '').trim()
  const contacto = String(c?.contacto_nombre ?? '').trim()
  const nombre = razon || contacto || (email ? email.split('@')[0] : '') || 'Cliente'
  return { nombre, email }
}

async function fetchProfileEmail(
  sb: NonNullable<ReturnType<typeof getSupabase>>,
  userId: string,
): Promise<string | null> {
  const { data: p } = await sb.from('profiles').select('email').eq('id', userId).maybeSingle()
  const e = p?.email ? String(p.email).trim().toLowerCase() : ''
  return e.includes('@') ? e : null
}

async function fetchTransportistaNombreRegistro(
  sb: NonNullable<ReturnType<typeof getSupabase>>,
  userId: string,
  fallback: string,
): Promise<string> {
  const { data: r } = await sb
    .from('registro_transportistas')
    .select('nombre_o_razon')
    .eq('user_id', userId)
    .eq('estado_aprobacion', 'aprobado')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const n = String(r?.nombre_o_razon ?? '').trim()
  return n || fallback
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'created_desc', label: 'Fecha de alta (más recientes primero)' },
  { value: 'created_asc', label: 'Fecha de alta (más antiguas primero)' },
  { value: 'fecha_asc', label: 'Fecha de servicio (próximas primero)' },
  { value: 'fecha_desc', label: 'Fecha de servicio (más lejanas primero)' },
]

export function AdminSolicitudesPage() {
  const sb = getSupabase()
  const [rows, setRows] = useState<Solicitud[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('created_desc')
  const [loadErr, setLoadErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionErr, setActionErr] = useState('')
  const [approveErr, setApproveErr] = useState('')
  const [actingId, setActingId] = useState<string | null>(null)
  const [mailInfo, setMailInfo] = useState('')

  const [approveTarget, setApproveTarget] = useState<Solicitud | null>(null)
  const [transportistasOpts, setTransportistasOpts] = useState<TransportistaOpt[]>([])
  const [selectedTransportistaId, setSelectedTransportistaId] = useState('')
  const [flotaOpts, setFlotaOpts] = useState<FlotaOpt[]>([])
  const [selectedFlotaId, setSelectedFlotaId] = useState('')
  const [approveBusy, setApproveBusy] = useState(false)

  const [cancelTarget, setCancelTarget] = useState<Solicitud | null>(null)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [cancelErr, setCancelErr] = useState('')

  const load = useCallback(async () => {
    if (!sb) return
    const primary =
      sortKey === 'created_desc' || sortKey === 'created_asc'
        ? { column: 'created_at' as const, ascending: sortKey === 'created_asc' }
        : { column: 'fecha_servicio' as const, ascending: sortKey === 'fecha_asc' }

    let q = sb
      .from('solicitudes_servicio')
      .select(
        'id, created_at, user_id, titulo, descripcion, fecha_servicio, origen, destino, peso_carga, dimensiones_carga, estado, transportista_user_id, transportista_contacto, flota_unidad_id, flota_unidad_resumen',
      )
      .order(primary.column, { ascending: primary.ascending })

    if (primary.column === 'fecha_servicio') {
      q = q.order('created_at', { ascending: false })
    } else {
      q = q.order('fecha_servicio', { ascending: true })
    }

    const { data: sols, error: e1 } = await q
    if (e1) {
      setLoadErr(e1.message)
      return
    }
    const list = sols ?? []
    const ids = [...new Set(list.map((s) => s.user_id).filter(Boolean))]
    let emailMap = new Map<string, string>()
    if (ids.length) {
      const { data: profs, error: e2 } = await sb.from('profiles').select('id, email').in('id', ids)
      if (!e2 && profs) {
        emailMap = new Map(profs.map((p) => [String(p.id), p.email ? String(p.email) : '']))
      }
    }
    setLoadErr('')
    setRows(
      list.map((s) => ({
        id: String(s.id),
        created_at: String(s.created_at),
        user_id: String(s.user_id),
        titulo: String(s.titulo ?? ''),
        descripcion: s.descripcion != null ? String(s.descripcion) : null,
        fecha_servicio: String(s.fecha_servicio ?? '').slice(0, 10),
        origen: s.origen != null ? String(s.origen) : null,
        destino: s.destino != null ? String(s.destino) : null,
        peso_carga: 'peso_carga' in s && s.peso_carga != null ? String(s.peso_carga) : null,
        dimensiones_carga:
          'dimensiones_carga' in s && s.dimensiones_carga != null ? String(s.dimensiones_carga) : null,
        estado: String(s.estado ?? ''),
        transportista_user_id:
          'transportista_user_id' in s && s.transportista_user_id != null
            ? String(s.transportista_user_id)
            : null,
        transportista_contacto:
          'transportista_contacto' in s && s.transportista_contacto != null
            ? String(s.transportista_contacto)
            : null,
        flota_unidad_id:
          'flota_unidad_id' in s && s.flota_unidad_id != null ? String(s.flota_unidad_id) : null,
        flota_unidad_resumen:
          'flota_unidad_resumen' in s && s.flota_unidad_resumen != null
            ? String(s.flota_unidad_resumen)
            : null,
        perfil_email: emailMap.get(String(s.user_id)) ?? null,
      })),
    )
  }, [sb, sortKey])

  useEffect(() => {
    if (!sb) {
      setLoadErr('La aplicación no está configurada correctamente.')
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      await load()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [sb, load])

  useEffect(() => {
    if (!sb || !selectedTransportistaId) {
      setFlotaOpts([])
      setSelectedFlotaId('')
      return
    }
    let cancelled = false
    ;(async () => {
      const { data, error } = await sb
        .from('flota_unidades')
        .select('id, tipo_unidad, placas, numero_economico')
        .eq('user_id', selectedTransportistaId)
        .order('placas', { ascending: true })
      if (cancelled) return
      if (error) {
        setApproveErr(error.message)
        setFlotaOpts([])
        setSelectedFlotaId('')
        return
      }
      setFlotaOpts(
        (data ?? []).map((row) => ({
          id: String(row.id),
          tipo_unidad: String(row.tipo_unidad ?? ''),
          placas: String(row.placas ?? ''),
          numero_economico: row.numero_economico != null ? String(row.numero_economico) : null,
          label: flotaUnidadResumen({
            tipo_unidad: String(row.tipo_unidad ?? ''),
            placas: String(row.placas ?? ''),
            numero_economico: row.numero_economico,
          }),
        })),
      )
      setSelectedFlotaId('')
    })()
    return () => {
      cancelled = true
    }
  }, [sb, selectedTransportistaId])

  async function openApprove(s: Solicitud) {
    setActionErr('')
    setMailInfo('')
    setApproveErr('')
    setApproveTarget(s)
    setSelectedTransportistaId('')
    setFlotaOpts([])
    setSelectedFlotaId('')
    if (!sb) return

    const { data: profs, error: ep } = await sb
      .from('profiles')
      .select('id, email')
      .eq('tipo_cuenta', 'transportista')
      .eq('cuenta_estado', 'activa')

    if (ep) {
      setApproveErr(ep.message)
      setTransportistasOpts([])
      return
    }

    const activeIds = new Set((profs ?? []).map((p) => String(p.id)))
    const emailByUser = new Map((profs ?? []).map((p) => [String(p.id), p.email ? String(p.email) : '']))

    const { data: regs, error: er } = await sb
      .from('registro_transportistas')
      .select('user_id, nombre_o_razon, email')
      .eq('estado_aprobacion', 'aprobado')
      .not('user_id', 'is', null)

    if (er) {
      setApproveErr(er.message)
      setTransportistasOpts([])
      return
    }

    const withReg = new Set<string>()
    const opts: TransportistaOpt[] = []
    const seenRegUser = new Set<string>()

    for (const r of regs ?? []) {
      const uid = r.user_id != null ? String(r.user_id) : ''
      if (!uid || !activeIds.has(uid) || seenRegUser.has(uid)) continue
      seenRegUser.add(uid)
      const nombre = String(r.nombre_o_razon ?? '').trim()
      opts.push({
        userId: uid,
        nombre_o_razon: nombre || 'Transportista',
        email: String(r.email ?? emailByUser.get(uid) ?? '').trim(),
      })
      withReg.add(uid)
    }

    for (const p of profs ?? []) {
      const uid = String(p.id)
      if (!withReg.has(uid)) {
        const em = p.email ? String(p.email) : ''
        opts.push({
          userId: uid,
          nombre_o_razon: em || 'Transportista',
          email: em,
        })
      }
    }

    opts.sort((a, b) => a.nombre_o_razon.localeCompare(b.nombre_o_razon, 'es', { sensitivity: 'base' }))
    setTransportistasOpts(opts)
  }

  function closeApprove() {
    setApproveTarget(null)
    setSelectedTransportistaId('')
    setTransportistasOpts([])
    setFlotaOpts([])
    setSelectedFlotaId('')
    setApproveBusy(false)
    setApproveErr('')
  }

  async function confirmApprove() {
    if (!sb || !approveTarget) return
    const t = transportistasOpts.find((x) => x.userId === selectedTransportistaId)
    if (!t) {
      setApproveErr('Selecciona un transportista para asignar.')
      return
    }
    const unidad = flotaOpts.find((f) => f.id === selectedFlotaId)
    if (!unidad) {
      setApproveErr('Selecciona la unidad de flota que realizará el servicio.')
      return
    }
    const resumen = unidad.label
    setApproveBusy(true)
    setApproveErr('')
    setMailInfo('')
    const { data: updated, error } = await sb
      .from('solicitudes_servicio')
      .update({
        estado: 'asignado',
        transportista_user_id: t.userId,
        transportista_contacto: t.nombre_o_razon.trim() || null,
        flota_unidad_id: unidad.id,
        flota_unidad_resumen: resumen,
      })
      .eq('id', approveTarget.id)
      .eq('estado', 'pendiente')
      .select('id')
    if (error) {
      setApproveBusy(false)
      setApproveErr(error.message)
      return
    }
    if (!updated?.length) {
      setApproveBusy(false)
      setApproveErr('La solicitud ya no está pendiente (quizá otro administrador la actualizó). Recarga la lista.')
      return
    }

    const det = detalleCorreoDesdeRow(approveTarget)
    const txNombreMostrar = t.nombre_o_razon.trim() || 'Transportista'
    const avisos: string[] = []
    const { nombre: nombreCliente, email: emailCliente } = await fetchClienteNombreYEmail(
      sb,
      approveTarget.user_id,
      approveTarget.perfil_email,
    )
    const emailTx =
      (t.email && t.email.includes('@') ? t.email.trim().toLowerCase() : null) ??
      (await fetchProfileEmail(sb, t.userId))
    const nombreTxCorreo =
      t.nombre_o_razon.trim() || (await fetchTransportistaNombreRegistro(sb, t.userId, 'Transportista'))

    if (emailCliente) {
      const r = await notifySolicitudServicioAprobadaCliente(sb, {
        to: emailCliente,
        nombre: nombreCliente,
        det,
        transportistaNombre: txNombreMostrar,
        unidadResumen: resumen,
      })
      if (!r.ok) avisos.push(`correo al cliente: ${r.error}`)
    } else {
      avisos.push('no hay correo del cliente en perfil')
    }

    if (emailTx) {
      const r = await notifySolicitudServicioAprobadaTransportista(sb, {
        to: emailTx,
        nombre: nombreTxCorreo,
        det,
        clienteNombre: nombreCliente,
        clienteEmail: emailCliente ?? '—',
      })
      if (!r.ok) avisos.push(`correo al transportista: ${r.error}`)
    } else {
      avisos.push('no hay correo del transportista en perfil')
    }

    if (avisos.length) {
      setMailInfo(`Asignación guardada. Aviso: ${avisos.join(' · ')}`)
    } else {
      setMailInfo('Asignación guardada. Se enviaron los avisos por correo al cliente y al transportista.')
    }

    setApproveBusy(false)
    closeApprove()
    await load()
  }

  async function onRechazar(s: Solicitud) {
    if (!sb) return
    const ok = window.confirm(
      '¿Marcar esta solicitud como rechazada? Seguirá en el listado con estado rechazada.',
    )
    if (!ok) return
    setActionErr('')
    setMailInfo('')
    setActingId(s.id)
    const { data: updated, error } = await sb
      .from('solicitudes_servicio')
      .update({
        estado: 'rechazada',
        transportista_user_id: null,
        transportista_contacto: null,
        flota_unidad_id: null,
        flota_unidad_resumen: null,
      })
      .eq('id', s.id)
      .eq('estado', 'pendiente')
      .select('id')
    setActingId(null)
    if (error) {
      setActionErr(error.message)
      return
    }
    if (!updated?.length) {
      setActionErr('La solicitud ya no está pendiente. Recarga la lista.')
      return
    }
    await load()
  }

  function openCancelModal(s: Solicitud) {
    if (s.estado !== 'asignado' || !s.transportista_user_id) return
    setCancelErr('')
    setCancelTarget(s)
  }

  function closeCancelModal() {
    if (cancelBusy) return
    setCancelTarget(null)
    setCancelErr('')
  }

  async function confirmCancelarAsignacion() {
    const s = cancelTarget
    if (!sb || !s || s.estado !== 'asignado' || !s.transportista_user_id) return
    setActionErr('')
    setMailInfo('')
    setCancelBusy(true)
    setCancelErr('')

    const det = detalleCorreoDesdeRow(s)
    const { nombre: nombreCliente, email: emailCliente } = await fetchClienteNombreYEmail(
      sb,
      s.user_id,
      s.perfil_email,
    )
    const emailTx = await fetchProfileEmail(sb, s.transportista_user_id)
    const contactoTx = s.transportista_contacto?.trim()
    const nombreTx = contactoTx
      ? contactoTx
      : await fetchTransportistaNombreRegistro(sb, s.transportista_user_id, 'Transportista')

    const { data: updated, error } = await sb
      .from('solicitudes_servicio')
      .update({
        estado: 'pendiente',
        transportista_user_id: null,
        transportista_contacto: null,
        flota_unidad_id: null,
        flota_unidad_resumen: null,
      })
      .eq('id', s.id)
      .eq('estado', 'asignado')
      .select('id')

    if (error) {
      setCancelBusy(false)
      setCancelErr(error.message)
      return
    }
    if (!updated?.length) {
      setCancelBusy(false)
      setCancelErr('La solicitud ya no está asignada. Recarga la lista.')
      return
    }

    const avisos: string[] = []
    if (emailCliente) {
      const r = await notifySolicitudServicioAsignacionCanceladaCliente(sb, {
        to: emailCliente,
        nombre: nombreCliente,
        det,
      })
      if (!r.ok) avisos.push(`correo al cliente: ${r.error}`)
    } else {
      avisos.push('no hay correo del cliente en perfil')
    }
    if (emailTx) {
      const r = await notifySolicitudServicioAsignacionCanceladaTransportista(sb, {
        to: emailTx,
        nombre: nombreTx,
        det,
      })
      if (!r.ok) avisos.push(`correo al transportista: ${r.error}`)
    } else {
      avisos.push('no hay correo del transportista en perfil')
    }

    if (avisos.length) {
      setMailInfo(`Asignación cancelada. Aviso: ${avisos.join(' · ')}`)
    } else {
      setMailInfo('Asignación cancelada. Se enviaron los avisos por correo al cliente y al transportista.')
    }

    setCancelBusy(false)
    setCancelTarget(null)
    setCancelErr('')
    await load()
  }

  const tableActionsLocked = approveTarget != null || cancelTarget != null

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-2 text-xl font-bold text-slate-800 sm:text-2xl">Solicitudes de servicio</h1>
      <p className="mb-4 max-w-3xl text-sm text-slate-600">
        Aprueba eligiendo transportista (razón social del registro) y la unidad de su flota; se envían correos al
        cliente y al transportista. Una vez asignada, puedes cancelar la asignación (vuelve a pendiente y se notifica de
        nuevo; puedes repetir el proceso sin límite). Rechazar deja la solicitud como rechazada.
      </p>

      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-md">
          <label className={labelClass} htmlFor="sort-solicitudes">
            Ordenar por
          </label>
          <select
            id="sort-solicitudes"
            className={inputClass}
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!sb && <p className="text-amber-800">{loadErr}</p>}
      {loading && sb && <p className="text-slate-500">Cargando…</p>}
      {!loading && loadErr && <p className="text-red-600">{loadErr}</p>}
      {actionErr && <p className="mb-4 text-sm text-red-600">{actionErr}</p>}
      {mailInfo && (
        <p className={`mb-4 text-sm ${mailInfo.includes('Aviso:') ? 'text-amber-900' : 'text-emerald-800'}`}>
          {mailInfo}
        </p>
      )}

      {!loading && !loadErr && rows.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Aún no hay solicitudes registradas.
        </p>
      )}

      {!loading && !loadErr && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Alta</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Fecha servicio</th>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Origen / destino</th>
                <th className="px-4 py-3">Peso / dimensiones</th>
                <th className="px-4 py-3">Transporte / unidad</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatIngreso(r.created_at)}</td>
                  <td className="px-4 py-3 text-slate-700">{r.perfil_email ?? r.user_id.slice(0, 8) + '…'}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{r.fecha_servicio}</td>
                  <td className="max-w-[220px] px-4 py-3">
                    <div className="font-medium text-slate-800">{r.titulo}</div>
                    {r.descripcion && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{r.descripcion}</p>}
                  </td>
                  <td className="max-w-[180px] px-4 py-3 text-xs text-slate-600">
                    {[r.origen, r.destino].filter(Boolean).join(' → ') || '—'}
                  </td>
                  <td className="max-w-[160px] px-4 py-3 text-xs text-slate-600">
                    {[r.peso_carga, r.dimensiones_carga].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="max-w-[200px] px-4 py-3 text-xs text-slate-700">
                    <div className="font-medium text-slate-800">
                      {r.transportista_contacto ?? (r.transportista_user_id ? r.transportista_user_id.slice(0, 8) + '…' : '—')}
                    </div>
                    {r.flota_unidad_resumen && (
                      <div className="mt-0.5 text-slate-600">{r.flota_unidad_resumen}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{solicitudServicioEstadoBadge(r.estado)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {r.estado === 'pendiente' ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={tableActionsLocked || actingId === r.id}
                          onClick={() => void openApprove(r)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Aprobar
                        </button>
                        <button
                          type="button"
                          disabled={tableActionsLocked || actingId === r.id}
                          onClick={() => void onRechazar(r)}
                          className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                      </div>
                    ) : r.estado === 'asignado' ? (
                      <button
                        type="button"
                        disabled={tableActionsLocked || actingId === r.id}
                        onClick={() => {
                          setActionErr('')
                          setMailInfo('')
                          openCancelModal(r)
                        }}
                        className="rounded-lg border border-slate-400 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Cancelar asignación
                      </button>
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

      {approveTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="approve-dialog-title"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget) closeApprove()
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="approve-dialog-title" className="mb-2 text-lg font-bold text-slate-800">
              Aprobar solicitud
            </h2>
            <p className="mb-4 text-sm text-slate-600">
              <span className="font-medium text-slate-800">{approveTarget.titulo}</span>
              <span className="text-slate-500"> · servicio el {approveTarget.fecha_servicio}</span>
            </p>
            <label className={labelClass} htmlFor="transportista-asignar">
              Transportista (razón social)
            </label>
            <select
              id="transportista-asignar"
              className={`${inputClass} mb-4`}
              value={selectedTransportistaId}
              onChange={(e) => setSelectedTransportistaId(e.target.value)}
            >
              <option value="">Selecciona…</option>
              {transportistasOpts.map((p) => (
                <option key={p.userId} value={p.userId}>
                  {p.nombre_o_razon}
                </option>
              ))}
            </select>
            <label className={labelClass} htmlFor="flota-asignar">
              Unidad de flota que realizará el servicio
            </label>
            <select
              id="flota-asignar"
              className={`${inputClass} mb-4`}
              value={selectedFlotaId}
              onChange={(e) => setSelectedFlotaId(e.target.value)}
              disabled={!selectedTransportistaId}
            >
              <option value="">{selectedTransportistaId ? 'Selecciona unidad…' : 'Primero elige transportista'}</option>
              {flotaOpts.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            {selectedTransportistaId && flotaOpts.length === 0 && !approveBusy && (
              <p className="mb-4 text-xs text-amber-800">
                Este transportista no tiene unidades en flota. Regístralas desde su panel o desde administración.
              </p>
            )}
            {transportistasOpts.length === 0 && !approveBusy && (
              <p className="mb-4 text-xs text-amber-800">
                No hay transportistas con cuenta activa. Aprueba primero sus cuentas en la waitlist.
              </p>
            )}
            {approveErr && <p className="mb-3 text-sm text-red-600">{approveErr}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={closeApprove}
                disabled={approveBusy}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                disabled={approveBusy || !selectedTransportistaId || !selectedFlotaId}
                onClick={() => void confirmApprove()}
              >
                {approveBusy ? 'Guardando…' : 'Confirmar asignación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-assign-dialog-title"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget && !cancelBusy) closeCancelModal()
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="cancel-assign-dialog-title" className="mb-2 text-lg font-bold text-slate-800">
              Cancelar asignación
            </h2>
            <p className="mb-3 text-sm text-slate-600">
              La solicitud volverá a <strong className="text-slate-800">pendiente</strong> y podrás asignarla de nuevo
              las veces que necesites. Se enviará un correo al cliente y al transportista informando la cancelación.
            </p>
            <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-800">{cancelTarget.titulo}</p>
              <p className="mt-1 text-slate-600">
                Servicio el <span className="font-medium">{cancelTarget.fecha_servicio}</span>
              </p>
              {(cancelTarget.transportista_contacto || cancelTarget.flota_unidad_resumen) && (
                <div className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-600">
                  {cancelTarget.transportista_contacto && (
                    <p>
                      <span className="font-semibold text-slate-700">Transportista:</span>{' '}
                      {cancelTarget.transportista_contacto}
                    </p>
                  )}
                  {cancelTarget.flota_unidad_resumen && (
                    <p className="mt-1">
                      <span className="font-semibold text-slate-700">Unidad:</span> {cancelTarget.flota_unidad_resumen}
                    </p>
                  )}
                </div>
              )}
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
                onClick={() => void confirmCancelarAsignacion()}
              >
                {cancelBusy ? 'Procesando…' : 'Sí, cancelar asignación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
