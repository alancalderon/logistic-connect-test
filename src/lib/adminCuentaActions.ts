import type { SupabaseClient } from '@supabase/supabase-js'

export type EstadoAprobacion = 'pendiente' | 'aprobado' | 'rechazado'

export type ClienteRegistroAdmin = {
  id: string
  user_id: string | null
  email: string
  estado_aprobacion: EstadoAprobacion
}

export type TransportistaRegistroAdmin = {
  id: string
  user_id: string | null
  email: string
  estado_aprobacion: EstadoAprobacion
}

const RPC_ERR: Record<string, string> = {
  NO_ADMIN: 'No tienes permisos de administrador.',
  NO_ACTUALIZADO: 'No se pudo aprobar (¿ya estaba aprobado o el id no existe?).',
}

function mapRpcMessage(code: string | undefined) {
  if (!code) return 'No se pudo completar la operación.'
  return RPC_ERR[code] ?? code
}

export async function aprobarClienteCuenta(
  sb: SupabaseClient,
  c: ClienteRegistroAdmin,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await sb.rpc('admin_aprobar_cliente', { p_registro_id: c.id })
  if (error) return { ok: false, message: error.message }
  const body = data as { ok?: boolean; error?: string } | null
  if (!body?.ok) return { ok: false, message: mapRpcMessage(body?.error) }
  return { ok: true }
}

export async function rechazarClienteCuenta(
  sb: SupabaseClient,
  c: ClienteRegistroAdmin,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error: e1 } = await sb.from('registro_clientes').update({ estado_aprobacion: 'rechazado' }).eq('id', c.id)
  if (e1) return { ok: false, message: e1.message }
  if (c.user_id) {
    const { error: e2 } = await sb.from('profiles').update({ cuenta_estado: 'rechazada' }).eq('id', c.user_id)
    if (e2) return { ok: false, message: e2.message }
  }
  return { ok: true }
}

export async function aprobarTransportistaCuenta(
  sb: SupabaseClient,
  t: TransportistaRegistroAdmin,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await sb.rpc('admin_aprobar_transportista', { p_registro_id: t.id })
  if (error) return { ok: false, message: error.message }
  const body = data as { ok?: boolean; error?: string } | null
  if (!body?.ok) return { ok: false, message: mapRpcMessage(body?.error) }
  return { ok: true }
}

export async function rechazarTransportistaCuenta(
  sb: SupabaseClient,
  t: TransportistaRegistroAdmin,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error: e1 } = await sb.from('registro_transportistas').update({ estado_aprobacion: 'rechazado' }).eq('id', t.id)
  if (e1) return { ok: false, message: e1.message }
  if (t.user_id) {
    const { error: e2 } = await sb.from('profiles').update({ cuenta_estado: 'rechazada' }).eq('id', t.user_id)
    if (e2) return { ok: false, message: e2.message }
  }
  return { ok: true }
}
