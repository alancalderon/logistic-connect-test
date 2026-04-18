import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  aprobarClienteCuenta,
  aprobarTransportistaCuenta,
  rechazarClienteCuenta,
  rechazarTransportistaCuenta,
  type ClienteRegistroAdmin,
  type EstadoAprobacion,
  type TransportistaRegistroAdmin,
} from '@/lib/adminCuentaActions'
import { decisionConCorreoPrimero, mensajeErrorDecisionConCorreo } from '@/lib/adminDecisionWithEmail'
import { fetchUsuariosRegistrosPair } from '@/lib/adminRegistrosFetch'
import { getSupabase } from '@/lib/supabase'
import { notifyAccesoAprobado, notifySolicitudRechazada } from '@/lib/resendNotify'
import { inputClass, labelClass } from '@/lib/formStyles'
import { estadoAprobacionBadge, formatIngreso } from '@/pages/admin/adminUi'

type Tab = 'todos' | 'clientes' | 'transportistas'

type ClienteRow = ClienteRegistroAdmin & {
  created_at: string
  razon_social: string
  contacto_nombre: string
  contacto_cargo: string | null
  telefono: string
}

type TransportistaRow = TransportistaRegistroAdmin & {
  created_at: string
  nombre_o_razon: string
  contacto_nombre: string
  telefono: string
  rfc: string | null
}

type UnifiedRow =
  | {
      kind: 'cliente'
      cliente: ClienteRow
      id: string
      created_at: string
      titulo: string
      email: string
      detalle: string
    }
  | {
      kind: 'transportista'
      transportista: TransportistaRow
      id: string
      created_at: string
      titulo: string
      email: string
      detalle: string
    }

function parseEstadoAprobacion(v: string | null | undefined): EstadoAprobacion {
  if (v === 'aprobado' || v === 'rechazado' || v === 'pendiente') return v
  return 'pendiente'
}

const accionesColClass =
  'w-[11rem] min-w-[11rem] whitespace-nowrap align-middle text-right sm:w-[12rem] sm:min-w-[12rem]'

export function AdminUsuariosPage() {
  const sb = getSupabase()
  const [tab, setTab] = useState<Tab>('todos')
  const [clientes, setClientes] = useState<ClienteRow[] | null>(null)
  const [transportistas, setTransportistas] = useState<TransportistaRow[] | null>(null)
  const [loadErr, setLoadErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionErr, setActionErr] = useState('')
  const [mailInfo, setMailInfo] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [modalEditCliente, setModalEditCliente] = useState<ClienteRow | null>(null)
  const [draftCliente, setDraftCliente] = useState<ClienteRow | null>(null)
  const [modalElimCliente, setModalElimCliente] = useState<ClienteRow | null>(null)

  const [modalEditTransportista, setModalEditTransportista] = useState<TransportistaRow | null>(null)
  const [draftTransportista, setDraftTransportista] = useState<TransportistaRow | null>(null)
  const [modalElimTransportista, setModalElimTransportista] = useState<TransportistaRow | null>(null)

  const loadRegistros = useCallback(async () => {
    if (!sb) return
    const { c, t } = await fetchUsuariosRegistrosPair(sb)
    if (c.error) {
      setLoadErr(c.error.message)
      return
    }
    if (t.error) {
      setLoadErr(t.error.message)
      return
    }
    setLoadErr('')
    setClientes(
      (c.data ?? []).map((r) => ({
        id: String(r.id),
        created_at: String(r.created_at),
        razon_social: String(r.razon_social ?? ''),
        contacto_nombre: String(r.contacto_nombre ?? ''),
        contacto_cargo: r.contacto_cargo != null ? String(r.contacto_cargo) : null,
        email: String(r.email ?? ''),
        telefono: String(r.telefono ?? ''),
        estado_aprobacion: parseEstadoAprobacion(r.estado_aprobacion as string | undefined),
        user_id: r.user_id != null ? String(r.user_id) : null,
      })),
    )
    setTransportistas(
      (t.data ?? []).map((r) => ({
        id: String(r.id),
        created_at: String(r.created_at),
        nombre_o_razon: String(r.nombre_o_razon ?? ''),
        contacto_nombre: String(r.contacto_nombre ?? ''),
        email: String(r.email ?? ''),
        telefono: String(r.telefono ?? ''),
        rfc: r.rfc != null && String(r.rfc).trim() !== '' ? String(r.rfc) : null,
        estado_aprobacion: parseEstadoAprobacion(r.estado_aprobacion as string | undefined),
        user_id: r.user_id != null ? String(r.user_id) : null,
      })),
    )
  }, [sb])

  useEffect(() => {
    if (!sb) {
      setLoadErr('La aplicación no está configurada correctamente.')
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      await loadRegistros()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [sb, loadRegistros])

  useEffect(() => {
    if (modalEditCliente) setDraftCliente({ ...modalEditCliente })
    else setDraftCliente(null)
  }, [modalEditCliente])

  useEffect(() => {
    if (modalEditTransportista) setDraftTransportista({ ...modalEditTransportista })
    else setDraftTransportista(null)
  }, [modalEditTransportista])

  const todosOrdenados = useMemo((): UnifiedRow[] => {
    if (!clientes || !transportistas) return []
    const rows: UnifiedRow[] = [
      ...clientes.map((c) => ({
        kind: 'cliente' as const,
        cliente: c,
        id: `c-${c.id}`,
        created_at: c.created_at,
        titulo: c.razon_social,
        email: c.email,
        detalle: [c.contacto_nombre, c.contacto_cargo].filter(Boolean).join(' · '),
      })),
      ...transportistas.map((t) => ({
        kind: 'transportista' as const,
        transportista: t,
        id: `t-${t.id}`,
        created_at: t.created_at,
        titulo: t.nombre_o_razon,
        email: t.email,
        detalle: [t.contacto_nombre, t.rfc ? `RFC ${t.rfc}` : null].filter(Boolean).join(' · '),
      })),
    ]
    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return rows
  }, [clientes, transportistas])

  const hayDatos = clientes && transportistas && (clientes.length > 0 || transportistas.length > 0)

  async function onAprobarCliente(c: ClienteRow) {
    if (!sb) return
    setActionErr('')
    setMailInfo(null)
    setSaving(true)
    const res = await decisionConCorreoPrimero(
      () =>
        notifyAccesoAprobado(sb, {
          to: c.email,
          nombre: c.razon_social || c.contacto_nombre,
          tipo: 'cliente',
          sinVinculoAuth: !c.user_id,
        }),
      () => aprobarClienteCuenta(sb, c),
    )
    setSaving(false)
    if (!res.ok) {
      setActionErr(mensajeErrorDecisionConCorreo('aprobar', res))
      await loadRegistros()
      return
    }
    setMailInfo('Se envió el correo y se guardó la aprobación; el usuario puede iniciar sesión.')
    await loadRegistros()
  }

  async function onRechazarCliente(c: ClienteRow) {
    if (!sb) return
    setActionErr('')
    setMailInfo(null)
    setSaving(true)
    const res = await decisionConCorreoPrimero(
      () =>
        notifySolicitudRechazada(sb, {
          to: c.email,
          nombre: c.razon_social || c.contacto_nombre,
          tipo: 'cliente',
        }),
      () => rechazarClienteCuenta(sb, c),
    )
    setSaving(false)
    if (!res.ok) {
      setActionErr(mensajeErrorDecisionConCorreo('rechazar', res))
      await loadRegistros()
      return
    }
    setMailInfo('Se envió el correo y se guardó el rechazo.')
    await loadRegistros()
  }

  async function onAprobarTransportista(t: TransportistaRow) {
    if (!sb) return
    setActionErr('')
    setMailInfo(null)
    setSaving(true)
    const res = await decisionConCorreoPrimero(
      () =>
        notifyAccesoAprobado(sb, {
          to: t.email,
          nombre: t.nombre_o_razon || t.contacto_nombre,
          tipo: 'transportista',
          sinVinculoAuth: !t.user_id,
        }),
      () => aprobarTransportistaCuenta(sb, t),
    )
    setSaving(false)
    if (!res.ok) {
      setActionErr(mensajeErrorDecisionConCorreo('aprobar', res))
      await loadRegistros()
      return
    }
    setMailInfo('Se envió el correo y se guardó la aprobación; el usuario puede iniciar sesión.')
    await loadRegistros()
  }

  async function onRechazarTransportista(t: TransportistaRow) {
    if (!sb) return
    setActionErr('')
    setMailInfo(null)
    setSaving(true)
    const res = await decisionConCorreoPrimero(
      () =>
        notifySolicitudRechazada(sb, {
          to: t.email,
          nombre: t.nombre_o_razon || t.contacto_nombre,
          tipo: 'transportista',
        }),
      () => rechazarTransportistaCuenta(sb, t),
    )
    setSaving(false)
    if (!res.ok) {
      setActionErr(mensajeErrorDecisionConCorreo('rechazar', res))
      await loadRegistros()
      return
    }
    setMailInfo('Se envió el correo y se guardó el rechazo.')
    await loadRegistros()
  }

  async function guardarEdicionCliente(e: FormEvent) {
    e.preventDefault()
    if (!sb || !draftCliente || !modalEditCliente) return
    setActionErr('')
    setSaving(true)
    const email = draftCliente.email.trim().toLowerCase()
    const { error } = await sb
      .from('registro_clientes')
      .update({
        razon_social: draftCliente.razon_social.trim(),
        contacto_nombre: draftCliente.contacto_nombre.trim(),
        contacto_cargo: draftCliente.contacto_cargo?.trim() || null,
        email,
        telefono: draftCliente.telefono.trim(),
      })
      .eq('id', modalEditCliente.id)
    if (error) {
      setSaving(false)
      setActionErr(error.message)
      return
    }
    if (modalEditCliente.user_id) {
      await sb.from('profiles').update({ email }).eq('id', modalEditCliente.user_id)
    }
    setSaving(false)
    setModalEditCliente(null)
    await loadRegistros()
  }

  async function guardarEdicionTransportista(e: FormEvent) {
    e.preventDefault()
    if (!sb || !draftTransportista || !modalEditTransportista) return
    setActionErr('')
    const rfc = (draftTransportista.rfc ?? '').trim().toUpperCase()
    if (rfc.length < 10) {
      setActionErr('RFC debe tener al menos 10 caracteres.')
      return
    }
    setSaving(true)
    const email = draftTransportista.email.trim().toLowerCase()
    const { error } = await sb
      .from('registro_transportistas')
      .update({
        nombre_o_razon: draftTransportista.nombre_o_razon.trim(),
        contacto_nombre: draftTransportista.contacto_nombre.trim(),
        email,
        telefono: draftTransportista.telefono.trim(),
        rfc,
      })
      .eq('id', modalEditTransportista.id)
    if (error) {
      setSaving(false)
      setActionErr(error.message)
      return
    }
    if (modalEditTransportista.user_id) {
      await sb.from('profiles').update({ email }).eq('id', modalEditTransportista.user_id)
    }
    setSaving(false)
    setModalEditTransportista(null)
    await loadRegistros()
  }

  async function confirmarEliminarCliente() {
    if (!sb || !modalElimCliente) return
    setActionErr('')
    setSaving(true)
    const { error } = await sb.from('registro_clientes').delete().eq('id', modalElimCliente.id)
    setSaving(false)
    if (error) {
      setActionErr(error.message)
      return
    }
    setModalElimCliente(null)
    await loadRegistros()
  }

  async function confirmarEliminarTransportista() {
    if (!sb || !modalElimTransportista) return
    setActionErr('')
    setSaving(true)
    const { error } = await sb.from('registro_transportistas').delete().eq('id', modalElimTransportista.id)
    setSaving(false)
    if (error) {
      setActionErr(error.message)
      return
    }
    setModalElimTransportista(null)
    await loadRegistros()
  }

  function accionesCliente(c: ClienteRow) {
    return (
      <div className="flex h-9 shrink-0 flex-nowrap items-center justify-end gap-1">
        {c.estado_aprobacion === 'pendiente' && (
          <>
            <button
              type="button"
              title="Aprobar"
              disabled={saving}
              onClick={() => void onAprobarCliente(c)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <i className="fas fa-check text-xs" aria-hidden />
            </button>
            <button
              type="button"
              title="Rechazar"
              disabled={saving}
              onClick={() => void onRechazarCliente(c)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-700 transition hover:bg-red-200 disabled:opacity-50"
            >
              <i className="fas fa-times text-xs" aria-hidden />
            </button>
          </>
        )}
        <button
          type="button"
          title="Editar"
          disabled={saving}
          onClick={() => {
            setActionErr('')
            setModalEditCliente(c)
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <i className="fas fa-pencil-alt text-xs" aria-hidden />
        </button>
        <button
          type="button"
          title="Eliminar"
          disabled={saving}
          onClick={() => {
            setActionErr('')
            setModalElimCliente(c)
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100 disabled:opacity-50"
        >
          <i className="fas fa-trash-alt text-xs" aria-hidden />
        </button>
      </div>
    )
  }

  function accionesTransportista(t: TransportistaRow) {
    return (
      <div className="flex h-9 shrink-0 flex-nowrap items-center justify-end gap-1">
        {t.estado_aprobacion === 'pendiente' && (
          <>
            <button
              type="button"
              title="Aprobar"
              disabled={saving}
              onClick={() => void onAprobarTransportista(t)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <i className="fas fa-check text-xs" aria-hidden />
            </button>
            <button
              type="button"
              title="Rechazar"
              disabled={saving}
              onClick={() => void onRechazarTransportista(t)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-700 transition hover:bg-red-200 disabled:opacity-50"
            >
              <i className="fas fa-times text-xs" aria-hidden />
            </button>
          </>
        )}
        <button
          type="button"
          title="Editar"
          disabled={saving}
          onClick={() => {
            setActionErr('')
            setModalEditTransportista(t)
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <i className="fas fa-pencil-alt text-xs" aria-hidden />
        </button>
        <button
          type="button"
          title="Eliminar"
          disabled={saving}
          onClick={() => {
            setActionErr('')
            setModalElimTransportista(t)
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100 disabled:opacity-50"
        >
          <i className="fas fa-trash-alt text-xs" aria-hidden />
        </button>
      </div>
    )
  }

  const tabBtn = (id: Tab, label: string) => (
    <button
      type="button"
      key={id}
      onClick={() => setTab(id)}
      className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-xs font-semibold transition sm:px-4 sm:text-sm ${
        tab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      {label}
    </button>
  )

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-2 text-xl font-bold text-slate-800 sm:text-2xl">Usuarios</h1>
      <p className="mb-6 max-w-3xl text-sm text-slate-600">
        Clientes y transportistas dados de alta. Al aprobar o rechazar, primero se envía el correo; solo si tiene éxito
        se guarda el cambio. Las solicitudes de carga y la flota están en sus secciones del menú admin.
      </p>

      {actionErr && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{actionErr}</div>
      )}
      {mailInfo && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {mailInfo}
        </div>
      )}

      {!sb && <p className="text-amber-800">{loadErr}</p>}
      {loading && sb && <p className="text-slate-500">Cargando…</p>}
      {!loading && loadErr && <p className="text-red-600">{loadErr}</p>}

      {!loading && !loadErr && !hayDatos && (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No hay usuarios registrados o tu sesión no tiene permisos de administrador.
        </p>
      )}

      {!loading && !loadErr && hayDatos && (
        <>
          <div className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 pb-px sm:mx-0 sm:px-0">
            {tabBtn('todos', 'Todos')}
            {tabBtn('clientes', 'Clientes')}
            {tabBtn('transportistas', 'Transportistas')}
          </div>

          {tab === 'clientes' && clientes && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Ingreso</th>
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">Contacto</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Teléfono</th>
                    <th className="px-4 py-3">Cuenta</th>
                    <th className={`px-4 py-3 ${accionesColClass}`}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatIngreso(r.created_at)}</td>
                      <td className="px-4 py-3 font-medium">{r.razon_social}</td>
                      <td className="px-4 py-3">{r.contacto_nombre}</td>
                      <td className="px-4 py-3">{r.email}</td>
                      <td className="px-4 py-3">{r.telefono}</td>
                      <td className="px-4 py-3 align-top">{estadoAprobacionBadge(r.estado_aprobacion)}</td>
                      <td className={`px-4 py-3 ${accionesColClass}`}>{accionesCliente(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'transportistas' && transportistas && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Ingreso</th>
                    <th className="px-4 py-3">Razón social</th>
                    <th className="px-4 py-3">Contacto</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Teléfono</th>
                    <th className="px-4 py-3">RFC</th>
                    <th className="px-4 py-3">Cuenta</th>
                    <th className={`px-4 py-3 ${accionesColClass}`}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {transportistas.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatIngreso(r.created_at)}</td>
                      <td className="px-4 py-3 font-medium">{r.nombre_o_razon}</td>
                      <td className="px-4 py-3">{r.contacto_nombre}</td>
                      <td className="px-4 py-3">{r.email}</td>
                      <td className="px-4 py-3">{r.telefono}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.rfc ?? '—'}</td>
                      <td className="px-4 py-3 align-top">{estadoAprobacionBadge(r.estado_aprobacion)}</td>
                      <td className={`px-4 py-3 ${accionesColClass}`}>{accionesTransportista(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'todos' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Ingreso</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Cuenta</th>
                    <th className={`px-4 py-3 ${accionesColClass}`}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {todosOrdenados.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatIngreso(r.created_at)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                            r.kind === 'cliente' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {r.kind === 'cliente' ? 'Cliente' : 'Transportista'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{r.titulo}</td>
                      <td className="px-4 py-3">{r.email}</td>
                      <td className="px-4 py-3 align-top">
                        {r.kind === 'cliente'
                          ? estadoAprobacionBadge(r.cliente.estado_aprobacion)
                          : estadoAprobacionBadge(r.transportista.estado_aprobacion)}
                      </td>
                      <td className={`px-4 py-3 ${accionesColClass}`}>
                        {r.kind === 'cliente' ? accionesCliente(r.cliente) : accionesTransportista(r.transportista)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {modalEditCliente && draftCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-800">Editar cliente</h2>
            <form className="mt-4 space-y-3" onSubmit={(ev) => void guardarEdicionCliente(ev)}>
              <div>
                <label className={labelClass}>Razón social</label>
                <input
                  required
                  className={inputClass}
                  value={draftCliente.razon_social}
                  onChange={(e) => setDraftCliente((d) => (d ? { ...d, razon_social: e.target.value } : d))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Contacto</label>
                  <input
                    required
                    className={inputClass}
                    value={draftCliente.contacto_nombre}
                    onChange={(e) => setDraftCliente((d) => (d ? { ...d, contacto_nombre: e.target.value } : d))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Cargo</label>
                  <input
                    className={inputClass}
                    value={draftCliente.contacto_cargo ?? ''}
                    onChange={(e) =>
                      setDraftCliente((d) => (d ? { ...d, contacto_cargo: e.target.value || null } : d))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    required
                    className={inputClass}
                    value={draftCliente.email}
                    onChange={(e) => setDraftCliente((d) => (d ? { ...d, email: e.target.value } : d))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input
                    required
                    className={inputClass}
                    value={draftCliente.telefono}
                    onChange={(e) => setDraftCliente((d) => (d ? { ...d, telefono: e.target.value } : d))}
                  />
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setModalEditCliente(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalEditTransportista && draftTransportista && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-800">Editar transportista</h2>
            <form className="mt-4 space-y-3" onSubmit={(ev) => void guardarEdicionTransportista(ev)}>
              <div>
                <label className={labelClass}>Razón social</label>
                <input
                  required
                  className={inputClass}
                  value={draftTransportista.nombre_o_razon}
                  onChange={(e) => setDraftTransportista((d) => (d ? { ...d, nombre_o_razon: e.target.value } : d))}
                />
              </div>
              <div>
                <label className={labelClass}>Contacto</label>
                <input
                  required
                  className={inputClass}
                  value={draftTransportista.contacto_nombre}
                  onChange={(e) => setDraftTransportista((d) => (d ? { ...d, contacto_nombre: e.target.value } : d))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    required
                    className={inputClass}
                    value={draftTransportista.email}
                    onChange={(e) => setDraftTransportista((d) => (d ? { ...d, email: e.target.value } : d))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input
                    required
                    className={inputClass}
                    value={draftTransportista.telefono}
                    onChange={(e) => setDraftTransportista((d) => (d ? { ...d, telefono: e.target.value } : d))}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>RFC</label>
                <input
                  required
                  minLength={10}
                  maxLength={13}
                  className={`${inputClass} uppercase`}
                  value={draftTransportista.rfc ?? ''}
                  onChange={(e) => setDraftTransportista((d) => (d ? { ...d, rfc: e.target.value.toUpperCase() } : d))}
                />
              </div>
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setModalEditTransportista(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
                >
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalElimCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-800">Eliminar registro</h2>
            <p className="mt-2 text-sm text-slate-600">
              ¿Eliminar el cliente <strong>{modalElimCliente.razon_social}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setModalElimCliente(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                onClick={() => void confirmarEliminarCliente()}
              >
                {saving ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalElimTransportista && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-800">Eliminar registro</h2>
            <p className="mt-2 text-sm text-slate-600">
              ¿Eliminar el transportista <strong>{modalElimTransportista.nombre_o_razon}</strong>? Esta acción no se puede
              deshacer.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setModalElimTransportista(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                onClick={() => void confirmarEliminarTransportista()}
              >
                {saving ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
