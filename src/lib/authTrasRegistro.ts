import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAuthEmail } from '@/lib/authLogin'
import { notifyAdminsRegistroVinculado } from '@/lib/notifyAdmins'

function mapSignUpError(message: string) {
  const t = message.toLowerCase()
  if (t.includes('already') || t.includes('registered')) {
    return 'Ese correo ya tiene cuenta de acceso. Si acabas de enviar la solicitud, inicia sesión o contacta soporte.'
  }
  return message
}

/**
 * Tras `registrar_*_manual`: crea cuenta de acceso con el mismo correo/contraseña y enlaza el expediente pendiente.
 */
export async function signUpTrasRegistroRpc(
  sb: SupabaseClient,
  params: { email: string; password: string; appTipo: 'cliente' | 'transportista' },
): Promise<
  | { ok: true; session: boolean }
  | { ok: false; message: string }
> {
  const email = normalizeAuthEmail(params.email)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const { data, error } = await sb.auth.signUp({
    email,
    password: params.password,
    options: {
      data: { app_tipo: params.appTipo },
      emailRedirectTo: origin ? `${origin}/iniciar-sesion` : undefined,
    },
  })
  if (error) {
    return { ok: false, message: mapSignUpError(error.message) }
  }
  const hasSession = !!data.session
  if (!hasSession) {
    return { ok: true, session: false }
  }

  const { data: v, error: vErr } = await sb.rpc('vincular_mi_registro_pendiente')
  if (vErr) {
    await sb.auth.signOut()
    return { ok: false, message: vErr.message }
  }
  const row = v as { ok?: boolean; error?: string; tipo?: string | null } | null
  if (!row?.ok) {
    await sb.auth.signOut()
    const code = row?.error ?? ''
    return {
      ok: false,
      message:
        code === 'SIN_REGISTRO_VINCULABLE'
          ? 'No se pudo enlazar tu expediente con la cuenta. Tu solicitud quedó guardada; contacta soporte con tu correo.'
          : 'No se pudo completar el registro de acceso.',
    }
  }
  if (row.tipo !== 'cliente' && row.tipo !== 'transportista') {
    await sb.auth.signOut()
    return {
      ok: false,
      message:
        'No se encontró un expediente pendiente para vincular. Tu solicitud puede estar guardada; contacta soporte.',
    }
  }
  notifyAdminsRegistroVinculado(sb, row.tipo === 'transportista' ? 'transportista' : 'cliente')
  await sb.auth.signOut()
  return { ok: true, session: true }
}
