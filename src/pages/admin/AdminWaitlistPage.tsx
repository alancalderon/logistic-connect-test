import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { fetchWaitlistRegistrosPair } from '@/lib/adminRegistrosFetch'
import { getSupabase } from '@/lib/supabase'
import { notifyAccesoAprobado, notifySolicitudRechazada } from '@/lib/resendNotify'
import { estadoAprobacionBadge, formatIngreso } from '@/pages/admin/adminUi'

type WaitlistTab = 'clientes' | 'transportistas'

type ClienteRow = ClienteRegistroAdmin & {
  created_at: string
  razon_social: string
  contacto_nombre: string
  telefono: string
}

type TransportistaRow = TransportistaRegistroAdmin & {
  created_at: string
  nombre_o_razon: string
  contacto_nombre: string
  telefono: string
  rfc: string | null
}

function parseEstadoAprobacion(v: string | null | undefined): EstadoAprobacion {
  if (v === 'aprobado' || v === 'rechazado' || v === 'pendiente') return v
  return 'pendiente'
}

export function AdminWaitlistPage() {
  const sb = getSupabase()
  const [waitlistTab, setWaitlistTab] = useState<WaitlistTab>('clientes')
  const [clientes, setClientes] = useState<ClienteRow[] | null>(null)
  const [transportistas, setTransportistas] = useState<TransportistaRow[] | null>(null)
  const [loadErr, setLoadErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionErr, setActionErr] = useState('')
  const [mailInfo, setMailInfo] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const loadRegistros = useCallback(async () => {
    if (!sb) return
    const { c, t } = await fetchWaitlistRegistrosPair(sb)
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

  const clientesEnWaitlist = useMemo(
    () => (clientes ?? []).filter((c) => c.estado_aprobacion === 'pendiente'),
    [clientes],
  )
  const transportistasEnWaitlist = useMemo(
    () => (transportistas ?? []).filter((t) => t.estado_aprobacion === 'pendiente'),
    [transportistas],
  )

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

  function cuentaClienteCell(c: ClienteRow) {
    return (
      <div className="max-w-[11rem] space-y-2">
        {estadoAprobacionBadge(c.estado_aprobacion)}
        {c.estado_aprobacion === 'pendiente' && (
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              disabled={saving}
              onClick={() => void onAprobarCliente(c)}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
            >
              Aprobar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void onRechazarCliente(c)}
              className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
            >
              Rechazar
            </button>
          </div>
        )}
        {!c.user_id && c.estado_aprobacion === 'pendiente' && (
          <p className="text-[10px] leading-tight text-slate-500">Sin user_id: no terminó signUp tras el formulario.</p>
        )}
      </div>
    )
  }

  function cuentaTransportistaCell(t: TransportistaRow) {
    return (
      <div className="max-w-[11rem] space-y-2">
        {estadoAprobacionBadge(t.estado_aprobacion)}
        {t.estado_aprobacion === 'pendiente' && (
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              disabled={saving}
              onClick={() => void onAprobarTransportista(t)}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
            >
              Aprobar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void onRechazarTransportista(t)}
              className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
            >
              Rechazar
            </button>
          </div>
        )}
        {!t.user_id && t.estado_aprobacion === 'pendiente' && (
          <p className="text-[10px] leading-tight text-slate-500">Sin user_id: no terminó signUp tras el formulario.</p>
        )}
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-2 text-xl font-bold text-slate-800 sm:text-2xl">Waitlist</h1>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-slate-600">
        Solo solicitudes con alta <strong>pendiente</strong>. La aprobación o rechazo solo se guarda si el correo de
        confirmación se envía correctamente. El usuario entra con el correo y la contraseña del registro desde la página
        de acceso del sitio. Al rechazar, no podrán usar el panel; el registro se conserva.
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

      {!loading && !loadErr && clientes != null && transportistas != null && (
        <>
          <div className="-mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 pb-px sm:mx-0 sm:px-0">
            <button
              type="button"
              onClick={() => setWaitlistTab('clientes')}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-xs font-semibold sm:text-sm ${
                waitlistTab === 'clientes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
              }`}
            >
              Clientes ({clientesEnWaitlist.length})
            </button>
            <button
              type="button"
              onClick={() => setWaitlistTab('transportistas')}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-xs font-semibold sm:text-sm ${
                waitlistTab === 'transportistas' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
              }`}
            >
              Transportistas ({transportistasEnWaitlist.length})
            </button>
          </div>

          {waitlistTab === 'clientes' &&
            (clientesEnWaitlist.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No hay clientes pendientes.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Ingreso</th>
                      <th className="px-4 py-3">Razón social</th>
                      <th className="px-4 py-3">Contacto</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Teléfono</th>
                      <th className="px-4 py-3">Decisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesEnWaitlist.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 last:border-0">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatIngreso(r.created_at)}</td>
                        <td className="px-4 py-3 font-medium">{r.razon_social}</td>
                        <td className="px-4 py-3">{r.contacto_nombre}</td>
                        <td className="px-4 py-3">{r.email}</td>
                        <td className="px-4 py-3">{r.telefono}</td>
                        <td className="px-4 py-3 align-top">{cuentaClienteCell(r)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {waitlistTab === 'transportistas' &&
            (transportistasEnWaitlist.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No hay transportistas pendientes.</p>
            ) : (
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
                      <th className="px-4 py-3">Decisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transportistasEnWaitlist.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 last:border-0">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatIngreso(r.created_at)}</td>
                        <td className="px-4 py-3 font-medium">{r.nombre_o_razon}</td>
                        <td className="px-4 py-3">{r.contacto_nombre}</td>
                        <td className="px-4 py-3">{r.email}</td>
                        <td className="px-4 py-3">{r.telefono}</td>
                        <td className="px-4 py-3 font-mono text-xs">{r.rfc ?? '—'}</td>
                        <td className="px-4 py-3 align-top">{cuentaTransportistaCell(r)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
        </>
      )}
    </main>
  )
}
