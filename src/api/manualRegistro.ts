import { getSupabase } from '@/lib/supabase'

const ERR: Record<string, string> = {
  EMAIL_REQUERIDO: 'Indica un correo electrónico válido.',
  PASSWORD_DEBIL: 'La contraseña debe tener al menos 8 caracteres.',
  EMAIL_YA_REGISTRADO: 'Ese correo ya tiene cuenta en el sistema. Inicia sesión o usa otro correo.',
  SOLICITUD_PENDIENTE: 'Ya hay una solicitud pendiente con ese correo.',
  RFC_INVALIDO: 'Indica un RFC válido (mínimo 10 caracteres).',
  DB_ERROR: 'No se pudo guardar la solicitud. Intenta de nuevo o contacta soporte.',
}

function mapRpcError(code: string | undefined, detail?: string) {
  if (!code) return 'No se pudo completar el registro.'
  if (code === 'DB_ERROR' && detail) return `${ERR.DB_ERROR} (${detail})`
  return ERR[code] ?? code
}

export async function registrarClienteManual(params: {
  email: string
  password: string
  razon_social: string
  contacto_nombre: string
  contacto_cargo: string | null
  telefono: string
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, message: 'La aplicación no está configurada correctamente.' }
  const { data, error } = await sb.rpc('registrar_cliente_manual', {
    p_email: params.email,
    p_password: params.password,
    p_razon_social: params.razon_social,
    p_contacto_nombre: params.contacto_nombre,
    p_contacto_cargo: params.contacto_cargo ?? '',
    p_telefono: params.telefono,
  })
  if (error) return { ok: false, message: error.message }
  const row = data as { ok?: boolean; id?: string; error?: string; detail?: string } | null
  if (!row?.ok) return { ok: false, message: mapRpcError(row?.error, row?.detail) }
  if (!row.id) return { ok: false, message: 'Respuesta inválida del servidor.' }
  return { ok: true, id: row.id }
}

export async function registrarTransportistaManual(params: {
  email: string
  password: string
  nombre_o_razon: string
  contacto_nombre: string
  telefono: string
  rfc: string
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, message: 'La aplicación no está configurada correctamente.' }
  const { data, error } = await sb.rpc('registrar_transportista_manual', {
    p_email: params.email,
    p_password: params.password,
    p_nombre_o_razon: params.nombre_o_razon,
    p_contacto_nombre: params.contacto_nombre,
    p_telefono: params.telefono,
    p_rfc: params.rfc,
  })
  if (error) return { ok: false, message: error.message }
  const row = data as { ok?: boolean; id?: string; error?: string; detail?: string } | null
  if (!row?.ok) return { ok: false, message: mapRpcError(row?.error, row?.detail) }
  if (!row.id) return { ok: false, message: 'Respuesta inválida del servidor.' }
  return { ok: true, id: row.id }
}
