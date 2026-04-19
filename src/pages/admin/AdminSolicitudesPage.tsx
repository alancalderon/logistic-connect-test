import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { flotaUnidadResumen } from '@/lib/flotaFormat'
import {
  notifySolicitudServicioAprobadaCliente,
  notifySolicitudServicioAprobadaTransportista,
  notifySolicitudServicioAsignacionCanceladaCliente,
  notifySolicitudServicioAsignacionCanceladaTransportista,
  notifySolicitudServicioRechazadaCliente,
  type SolicitudCorreoDetalle,
} from '@/lib/resendNotify'
import { downloadAdminXlsx } from '@/lib/adminExportXlsx'
import { getSupabase } from '@/lib/supabase'
import { inputClass, labelClass } from '@/lib/formStyles'
import { solicitudServicioEstadoBadge, solicitudServicioEstadoLabel } from '@/lib/solicitudServicioUi'
import { formatoInstanteLocal } from '@/lib/solicitudHorarios'
import { formatIngreso } from '@/pages/admin/adminUi'

type SortKey = 'created_desc' | 'created_asc' | 'fecha_asc' | 'fecha_desc'

type Solicitud = {
  id: string
  created_at: string
  user_id: string
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
    carga_programada: s.carga_programada,
    entrega_ventana_inicio: s.entrega_ventana_inicio,
    entrega_ventana_fin: s.entrega_ventana_fin,
  }
}

async function fetchClienteNombreYEmail(
  sb: NonNullable<ReturnType<typeof getSupabase>>,
  userId: string,
  perfilEmailHint: string | null,
): Promise<{ nombre: string; email: string | null; telefono: string | null }> {
  const { data: p } = await sb.from('profiles').select('email').eq('id', userId).maybeSingle()
  const fromProfile = p?.email ? String(p.email).trim() : ''
  const emailRaw = fromProfile || (perfilEmailHint?.trim() ?? '')
  const emailNorm = emailRaw.toLowerCase()
  const email = emailNorm.includes('@') ? emailNorm : null
  const { data: c } = await sb
    .from('registro_clientes')
    .select('razon_social, contacto_nombre, telefono')
    .eq('user_id', userId)
    .eq('estado_aprobacion', 'aprobado')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const razon = String(c?.razon_social ?? '').trim()
  const contacto = String(c?.contacto_nombre ?? '').trim()
  const nombre = razon || contacto || (email ? email.split('@')[0] : '') || 'Cliente'
  const tel = String(c?.telefono ?? '').trim()
  return { nombre, email, telefono: tel || null }
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

type DetalleExtra = {
  clienteNombre: string
  clienteEmail: string | null
  clienteTelefono: string | null
  transportistaRazonSocial: string | null
  transportistaRfc: string | null
  transportistaTelefono: string | null
  transportistaEmailPerfil: string | null
  unidad: {
    tipo_unidad: string
    placas: string
    numero_economico: string | null
  } | null
}

async function fetchDetalleExtra(
  sb: NonNullable<ReturnType<typeof getSupabase>>,
  s: Solicitud,
): Promise<DetalleExtra> {
  const cliente = await fetchClienteNombreYEmail(sb, s.user_id, s.perfil_email)
  let transportistaRazonSocial: string | null = null
  let transportistaRfc: string | null = null
  let transportistaTelefono: string | null = null
  let transportistaEmailPerfil: string | null = null
  let unidad: DetalleExtra['unidad'] = null

  if (s.transportista_user_id) {
    transportistaEmailPerfil = await fetchProfileEmail(sb, s.transportista_user_id)
    const { data: reg } = await sb
      .from('registro_transportistas')
      .select('nombre_o_razon, rfc, telefono')
      .eq('user_id', s.transportista_user_id)
      .eq('estado_aprobacion', 'aprobado')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (reg) {
      transportistaRazonSocial = String(reg.nombre_o_razon ?? '').trim() || null
      const rfc = String(reg.rfc ?? '').trim()
      transportistaRfc = rfc || null
      const tel = String(reg.telefono ?? '').trim()
      transportistaTelefono = tel || null
    }
  }

  if (s.flota_unidad_id) {
    const { data: u } = await sb
      .from('flota_unidades')
      .select('tipo_unidad, placas, numero_economico')
      .eq('id', s.flota_unidad_id)
      .maybeSingle()
    if (u) {
      unidad = {
        tipo_unidad: String(u.tipo_unidad ?? ''),
        placas: String(u.placas ?? ''),
        numero_economico: u.numero_economico != null ? String(u.numero_economico) : null,
      }
    }
  }

  return {
    clienteNombre: cliente.nombre,
    clienteEmail: cliente.email,
    clienteTelefono: cliente.telefono,
    transportistaRazonSocial,
    transportistaRfc,
    transportistaTelefono,
    transportistaEmailPerfil,
    unidad,
  }
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'created_desc', label: 'Fecha de alta (más recientes primero)' },
  { value: 'created_asc', label: 'Fecha de alta (más antiguas primero)' },
  { value: 'fecha_asc', label: 'Fecha de servicio (próximas primero)' },
  { value: 'fecha_desc', label: 'Fecha de servicio (más lejanas primero)' },
]

function DetalleCampo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:grid-cols-[minmax(7.5rem,10rem)_1fr] sm:items-start sm:gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="min-w-0 break-words text-sm leading-relaxed text-slate-800">{children}</div>
    </div>
  )
}

function DetalleSeccion({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm">
      <h3 className="border-b border-slate-200 bg-slate-100/80 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600">
        {title}
      </h3>
      <div className="bg-white px-4">{children}</div>
    </section>
  )
}

function SolicitudDetalleModal({
  sb,
  s,
  onClose,
}: {
  sb: NonNullable<ReturnType<typeof getSupabase>>
  s: Solicitud
  onClose: () => void
}) {
  const [extra, setExtra] = useState<DetalleExtra | 'loading' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    setExtra('loading')
    ;(async () => {
      try {
        const data = await fetchDetalleExtra(sb, s)
        if (!cancelled) setExtra(data)
      } catch {
        if (!cancelled) setExtra('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sb, s])

  const extraOk = extra !== 'loading' && extra !== 'error' ? extra : null
  const loadingExtra = extra === 'loading'

  return (
    <div
      className="fixed inset-0 z-[45] overflow-y-auto overscroll-y-contain bg-black/40 py-6 sm:py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="solicitud-detalle-titulo"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose()
      }}
    >
      <div className="flex min-h-[calc(100dvh-3rem)] flex-col items-center justify-start px-4 sm:min-h-0 sm:justify-center">
        <div
          className="flex min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          style={{ maxHeight: 'min(90dvh, 52rem)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 id="solicitud-detalle-titulo" className="text-lg font-bold text-slate-900">
                Solicitud de servicio
              </h2>
              <p className="mt-1 text-sm font-medium leading-snug text-slate-700">{s.titulo}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              aria-label="Cerrar"
            >
              <i className="fas fa-times" aria-hidden />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            <div className="flex flex-col gap-4 pb-2">
              <DetalleSeccion title="Detalles de la solicitud">
                <DetalleCampo label="Alta en sistema">{formatIngreso(s.created_at)}</DetalleCampo>
                <DetalleCampo label="Estado">{solicitudServicioEstadoBadge(s.estado)}</DetalleCampo>
                <DetalleCampo label="Título">{s.titulo || '—'}</DetalleCampo>
                <DetalleCampo label="Descripción / notas">
                  {s.descripcion?.trim() ? (
                    <span className="whitespace-pre-wrap">{s.descripcion}</span>
                  ) : (
                    '—'
                  )}
                </DetalleCampo>
              </DetalleSeccion>

              <DetalleSeccion title="Detalles del cliente">
                <DetalleCampo label="Correo">
                  {loadingExtra ? (
                    <span className="text-slate-400">Cargando…</span>
                  ) : (
                    extraOk?.clienteEmail ?? s.perfil_email ?? '—'
                  )}
                </DetalleCampo>
                <DetalleCampo label="Nombre / razón social">
                  {loadingExtra ? (
                    <span className="text-slate-400">Cargando…</span>
                  ) : extraOk ? (
                    extraOk.clienteNombre
                  ) : (
                    '—'
                  )}
                </DetalleCampo>
                <DetalleCampo label="Teléfono">
                  {loadingExtra ? (
                    <span className="text-slate-400">Cargando…</span>
                  ) : extraOk?.clienteTelefono ? (
                    extraOk.clienteTelefono
                  ) : (
                    '—'
                  )}
                </DetalleCampo>
              </DetalleSeccion>

              <DetalleSeccion title="Detalles de la carga">
                <DetalleCampo label="Fecha del servicio">{s.fecha_servicio}</DetalleCampo>
                <DetalleCampo label="Hora de carga">
                  {s.carga_programada ? formatoInstanteLocal(s.carga_programada) : '—'}
                </DetalleCampo>
                <DetalleCampo label="Ventana de entrega">
                  {s.entrega_ventana_inicio && s.entrega_ventana_fin ? (
                    <>
                      {formatoInstanteLocal(s.entrega_ventana_inicio)} →{' '}
                      {formatoInstanteLocal(s.entrega_ventana_fin)}
                    </>
                  ) : (
                    '—'
                  )}
                </DetalleCampo>
                <DetalleCampo label="Origen">{s.origen?.trim() || '—'}</DetalleCampo>
                <DetalleCampo label="Destino">{s.destino?.trim() || '—'}</DetalleCampo>
                <DetalleCampo label="Peso de la carga">{s.peso_carga?.trim() || '—'}</DetalleCampo>
                <DetalleCampo label="Dimensiones">{s.dimensiones_carga?.trim() || '—'}</DetalleCampo>
              </DetalleSeccion>

              <DetalleSeccion title="Detalles del transportista">
                {!s.transportista_user_id ? (
                  <div className="py-4 text-sm text-slate-600">Sin transportista asignado.</div>
                ) : (
                  <>
                    <DetalleCampo label="Nombre en la solicitud">
                      {s.transportista_contacto?.trim() || '—'}
                    </DetalleCampo>
                    <DetalleCampo label="Razón social">
                      {loadingExtra ? (
                        <span className="text-slate-400">Cargando…</span>
                      ) : (
                        extraOk?.transportistaRazonSocial ?? '—'
                      )}
                    </DetalleCampo>
                    <DetalleCampo label="RFC">
                      {loadingExtra ? (
                        <span className="text-slate-400">Cargando…</span>
                      ) : (
                        extraOk?.transportistaRfc ?? '—'
                      )}
                    </DetalleCampo>
                    <DetalleCampo label="Teléfono">
                      {loadingExtra ? (
                        <span className="text-slate-400">Cargando…</span>
                      ) : (
                        extraOk?.transportistaTelefono ?? '—'
                      )}
                    </DetalleCampo>
                    <DetalleCampo label="Correo en perfil">
                      {loadingExtra ? (
                        <span className="text-slate-400">Cargando…</span>
                      ) : (
                        extraOk?.transportistaEmailPerfil ?? '—'
                      )}
                    </DetalleCampo>
                  </>
                )}
              </DetalleSeccion>

              <DetalleSeccion title="Detalles del vehículo">
                {!s.flota_unidad_id && !s.flota_unidad_resumen ? (
                  <div className="py-4 text-sm text-slate-600">Sin unidad de flota asociada.</div>
                ) : (
                  <>
                    <DetalleCampo label="Resumen guardado en la solicitud">
                      {s.flota_unidad_resumen?.trim() || '—'}
                    </DetalleCampo>
                    {loadingExtra ? (
                      <div className="py-3 text-sm text-slate-400">Cargando datos de la unidad…</div>
                    ) : extraOk?.unidad ? (
                      <>
                        <DetalleCampo label="Tipo de unidad">{extraOk.unidad.tipo_unidad || '—'}</DetalleCampo>
                        <DetalleCampo label="Placas">{extraOk.unidad.placas || '—'}</DetalleCampo>
                        <DetalleCampo label="Número económico">{extraOk.unidad.numero_economico ?? '—'}</DetalleCampo>
                      </>
                    ) : s.flota_unidad_id ? (
                      <div className="py-3 text-sm text-amber-800">
                        No se pudo cargar el registro de la unidad (puede haber sido eliminada).
                      </div>
                    ) : null}
                  </>
                )}
              </DetalleSeccion>

              {extra === 'error' && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  No se pudieron cargar algunos datos del cliente o transportista. El resto de la información es la
                  guardada en la solicitud.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AdminSolicitudesPage() {
  const sb = getSupabase()
  const [rows, setRows] = useState<Solicitud[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('created_desc')
  const [loadErr, setLoadErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionErr, setActionErr] = useState('')
  const [approveErr, setApproveErr] = useState('')
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

  const [revertTarget, setRevertTarget] = useState<Solicitud | null>(null)
  const [revertBusy, setRevertBusy] = useState(false)
  const [revertErr, setRevertErr] = useState('')

  const [rejectTarget, setRejectTarget] = useState<Solicitud | null>(null)
  const [rejectBusy, setRejectBusy] = useState(false)
  const [rejectErr, setRejectErr] = useState('')

  const [detailTarget, setDetailTarget] = useState<Solicitud | null>(null)

  const load = useCallback(async () => {
    if (!sb) return
    const primary =
      sortKey === 'created_desc' || sortKey === 'created_asc'
        ? { column: 'created_at' as const, ascending: sortKey === 'created_asc' }
        : { column: 'fecha_servicio' as const, ascending: sortKey === 'fecha_asc' }

    let q = sb
      .from('solicitudes_servicio')
      .select(
        'id, created_at, user_id, titulo, descripcion, fecha_servicio, carga_programada, entrega_ventana_inicio, entrega_ventana_fin, origen, destino, peso_carga, dimensiones_carga, estado, transportista_user_id, transportista_contacto, flota_unidad_id, flota_unidad_resumen',
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
    setDetailTarget(null)
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

  function openRejectModal(s: Solicitud) {
    if (s.estado !== 'pendiente') return
    setDetailTarget(null)
    setActionErr('')
    setMailInfo('')
    setRejectErr('')
    setRejectTarget(s)
  }

  function closeRejectModal() {
    if (rejectBusy) return
    setRejectTarget(null)
    setRejectErr('')
  }

  async function confirmRechazar() {
    const s = rejectTarget
    if (!sb || !s || s.estado !== 'pendiente') return
    setActionErr('')
    setMailInfo('')
    setRejectBusy(true)
    setRejectErr('')

    const det = detalleCorreoDesdeRow(s)
    const { nombre: nombreCliente, email: emailCliente } = await fetchClienteNombreYEmail(
      sb,
      s.user_id,
      s.perfil_email,
    )

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

    if (error) {
      setRejectBusy(false)
      setRejectErr(error.message)
      return
    }
    if (!updated?.length) {
      setRejectBusy(false)
      setRejectErr('La solicitud ya no está pendiente. Recarga la lista.')
      return
    }

    let mailMsg = 'Solicitud rechazada.'
    if (emailCliente) {
      const r = await notifySolicitudServicioRechazadaCliente(sb, {
        to: emailCliente,
        nombre: nombreCliente,
        det,
      })
      if (!r.ok) {
        mailMsg = `Solicitud rechazada. No se pudo enviar el correo al cliente: ${r.error}`
      } else {
        mailMsg = 'Solicitud rechazada. Se envió el aviso por correo al cliente.'
      }
    } else {
      mailMsg = 'Solicitud rechazada. Aviso: no hay correo del cliente en perfil.'
    }
    setMailInfo(mailMsg)

    setRejectBusy(false)
    setRejectTarget(null)
    setRejectErr('')
    await load()
  }

  function openCancelModal(s: Solicitud) {
    if (s.estado !== 'asignado' || !s.transportista_user_id) return
    setDetailTarget(null)
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

  function openRevertModal(s: Solicitud) {
    if (s.estado !== 'rechazada') return
    setDetailTarget(null)
    setActionErr('')
    setMailInfo('')
    setRevertErr('')
    setRevertTarget(s)
  }

  function closeRevertModal() {
    if (revertBusy) return
    setRevertTarget(null)
    setRevertErr('')
  }

  async function confirmRevertirRechazo() {
    const s = revertTarget
    if (!sb || !s || s.estado !== 'rechazada') return
    setActionErr('')
    setMailInfo('')
    setRevertBusy(true)
    setRevertErr('')
    const { data: updated, error } = await sb
      .from('solicitudes_servicio')
      .update({ estado: 'pendiente' })
      .eq('id', s.id)
      .eq('estado', 'rechazada')
      .select('id')
    setRevertBusy(false)
    if (error) {
      setRevertErr(error.message)
      return
    }
    if (!updated?.length) {
      setRevertErr('La solicitud ya no está rechazada. Recarga la lista.')
      return
    }
    setMailInfo('Solicitud revertida a pendiente. Puedes aprobarla o rechazarla de nuevo.')
    setRevertTarget(null)
    setRevertErr('')
    await load()
  }

  async function exportSolicitudesExcel() {
    if (rows.length === 0 || !sb) return
    const extras = await Promise.all(rows.map((r) => fetchDetalleExtra(sb, r)))
    downloadAdminXlsx({
      fileBaseName: 'translogix-solicitudes',
      sheetName: 'Solicitudes',
      headers: [
        'Alta solicitud',
        'Estado',
        'Título',
        'Descripción',
        'Cliente — correo',
        'Cliente — nombre / razón social',
        'Cliente — teléfono',
        'Fecha servicio',
        'Hora de carga',
        'Entrega desde',
        'Entrega hasta',
        'Origen',
        'Destino',
        'Peso carga',
        'Dimensiones',
        'Transportista — nombre en solicitud',
        'Transportista — razón social',
        'Transportista — RFC',
        'Transportista — teléfono',
        'Transportista — correo (perfil)',
        'Vehículo — resumen',
        'Vehículo — tipo de unidad',
        'Vehículo — placas',
        'Vehículo — número económico',
      ],
      rows: rows.map((r, i) => {
        const e = extras[i]!
        const u = e.unidad
        return [
          formatIngreso(r.created_at),
          solicitudServicioEstadoLabel(r.estado),
          r.titulo,
          r.descripcion ?? '',
          e.clienteEmail ?? r.perfil_email ?? '',
          e.clienteNombre,
          e.clienteTelefono ?? '',
          r.fecha_servicio,
          r.carga_programada ? formatoInstanteLocal(r.carga_programada) : '',
          r.entrega_ventana_inicio ? formatoInstanteLocal(r.entrega_ventana_inicio) : '',
          r.entrega_ventana_fin ? formatoInstanteLocal(r.entrega_ventana_fin) : '',
          r.origen ?? '',
          r.destino ?? '',
          r.peso_carga ?? '',
          r.dimensiones_carga ?? '',
          r.transportista_contacto ?? '',
          e.transportistaRazonSocial ?? '',
          e.transportistaRfc ?? '',
          e.transportistaTelefono ?? '',
          e.transportistaEmailPerfil ?? '',
          r.flota_unidad_resumen ?? '',
          u?.tipo_unidad ?? '',
          u?.placas ?? '',
          u?.numero_economico ?? '',
        ]
      }),
    })
  }

  const tableActionsLocked =
    approveTarget != null || cancelTarget != null || revertTarget != null || rejectTarget != null

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-2 text-xl font-bold text-slate-800 sm:text-2xl">Solicitudes de servicio</h1>
      <p className="mb-4 max-w-3xl text-sm text-slate-600">
        Cada tarjeta resume lo esencial para ubicar el viaje. Usa el icono del ojo para ver descripción completa,
        peso, dimensiones e identificadores. Para <strong className="text-slate-800">aprobar</strong> elige
        transportista y unidad de flota (se notifica por correo). Puedes <strong className="text-slate-800">cancelar</strong>{' '}
        una asignación (vuelve a pendiente), <strong className="text-slate-800">rechazar</strong> pendientes o{' '}
        <strong className="text-slate-800">revertir</strong> un rechazo a pendiente.
      </p>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-md flex-1">
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
        {!loading && !loadErr && rows.length > 0 && (
          <button
            type="button"
            onClick={() => void exportSolicitudesExcel()}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-700/30 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100"
          >
            <i className="fas fa-file-excel" aria-hidden />
            Descargar Excel
          </button>
        )}
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
        <>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {rows.map((r) => {
              const ruta = [r.origen, r.destino].filter(Boolean).join(' → ') || '—'
              const clienteLabel = r.perfil_email ?? `${r.user_id.slice(0, 8)}…`
              return (
                <article
                  key={r.id}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <header className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">{solicitudServicioEstadoBadge(r.estado)}</div>
                      <h2 className="text-base font-semibold leading-snug text-slate-900">{r.titulo}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailTarget(r)}
                      className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
                      title="Ver detalle completo"
                      aria-label="Ver detalle completo"
                    >
                      <i className="fas fa-eye text-lg" aria-hidden />
                    </button>
                  </header>

                  <div className="flex flex-1 flex-col gap-2.5 pt-3 text-sm">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Servicio</p>
                      <p className="font-semibold text-slate-800">{r.fecha_servicio}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Hora de carga</p>
                      <p className="text-slate-700">
                        {r.carga_programada ? formatoInstanteLocal(r.carga_programada) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Entrega</p>
                      <p className="text-slate-700">
                        {r.entrega_ventana_inicio && r.entrega_ventana_fin ? (
                          <>
                            {formatoInstanteLocal(r.entrega_ventana_inicio)} →{' '}
                            {formatoInstanteLocal(r.entrega_ventana_fin)}
                          </>
                        ) : (
                          '—'
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Ruta</p>
                      <p className="line-clamp-2 text-slate-700" title={ruta}>
                        {ruta}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Cliente</p>
                      <p className="truncate text-slate-700" title={clienteLabel}>
                        {clienteLabel}
                      </p>
                    </div>
                    {(r.transportista_contacto || r.flota_unidad_resumen || r.transportista_user_id) && (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Asignación</p>
                        <p className="font-medium text-slate-800">
                          {r.transportista_contacto ??
                            (r.transportista_user_id ? `${r.transportista_user_id.slice(0, 8)}…` : '—')}
                        </p>
                        {r.flota_unidad_resumen && (
                          <p className="mt-0.5 text-xs text-slate-600">{r.flota_unidad_resumen}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <footer className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">
                      Alta: <span className="font-medium text-slate-600">{formatIngreso(r.created_at)}</span>
                    </p>
                    <div className="flex flex-wrap justify-end gap-2">
                      {r.estado === 'pendiente' ? (
                        <>
                          <button
                            type="button"
                            disabled={tableActionsLocked}
                            onClick={() => void openApprove(r)}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Aprobar
                          </button>
                          <button
                            type="button"
                            disabled={tableActionsLocked}
                            onClick={() => openRejectModal(r)}
                            className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Rechazar
                          </button>
                        </>
                      ) : r.estado === 'asignado' ? (
                        <button
                          type="button"
                          disabled={tableActionsLocked}
                          onClick={() => {
                            setActionErr('')
                            setMailInfo('')
                            openCancelModal(r)
                          }}
                          className="rounded-lg border border-slate-400 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Cancelar asignación
                        </button>
                      ) : r.estado === 'rechazada' ? (
                        <button
                          type="button"
                          disabled={tableActionsLocked}
                          onClick={() => {
                            setActionErr('')
                            setMailInfo('')
                            openRevertModal(r)
                          }}
                          className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-50"
                        >
                          Revertir
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Sin acciones</span>
                      )}
                    </div>
                  </footer>
                </article>
              )
            })}
          </div>

          {detailTarget && sb ? (
            <SolicitudDetalleModal sb={sb} s={detailTarget} onClose={() => setDetailTarget(null)} />
          ) : null}
        </>
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

      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-solicitud-dialog-title"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget && !rejectBusy) closeRejectModal()
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="reject-solicitud-dialog-title" className="mb-2 text-lg font-bold text-slate-800">
              Rechazar solicitud
            </h2>
            <p className="mb-3 text-sm text-slate-600">
              La solicitud quedará como <strong className="text-slate-800">rechazada</strong> y seguirá en el listado.
              Se enviará un <strong>correo al cliente</strong> con el aviso y el detalle del viaje (si hay correo en su
              perfil).
            </p>
            <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-800">{rejectTarget.titulo}</p>
              <p className="mt-1 text-slate-600">
                Servicio el <span className="font-medium">{rejectTarget.fecha_servicio}</span>
              </p>
            </div>
            {rejectErr && <p className="mb-3 text-sm text-red-600">{rejectErr}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={closeRejectModal}
                disabled={rejectBusy}
              >
                Volver
              </button>
              <button
                type="button"
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                disabled={rejectBusy}
                onClick={() => void confirmRechazar()}
              >
                {rejectBusy ? 'Procesando…' : 'Sí, rechazar'}
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

      {revertTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revert-reject-dialog-title"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget && !revertBusy) closeRevertModal()
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="revert-reject-dialog-title" className="mb-2 text-lg font-bold text-slate-800">
              Revertir rechazo
            </h2>
            <p className="mb-3 text-sm text-slate-600">
              La solicitud volverá a <strong className="text-slate-800">pendiente</strong> y podrás aprobarla o
              rechazarla de nuevo. No se envía correo en este paso.
            </p>
            <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-800">{revertTarget.titulo}</p>
              <p className="mt-1 text-slate-600">
                Servicio el <span className="font-medium">{revertTarget.fecha_servicio}</span>
              </p>
            </div>
            {revertErr && <p className="mb-3 text-sm text-red-600">{revertErr}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={closeRevertModal}
                disabled={revertBusy}
              >
                Volver
              </button>
              <button
                type="button"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={revertBusy}
                onClick={() => void confirmRevertirRechazo()}
              >
                {revertBusy ? 'Guardando…' : 'Sí, volver a pendiente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
