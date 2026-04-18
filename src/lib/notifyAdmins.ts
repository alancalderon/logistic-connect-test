import type { SupabaseClient } from '@supabase/supabase-js'

async function getAccessToken(sb: SupabaseClient): Promise<string | null> {
  try {
    const { data, error } = await sb.auth.refreshSession()
    if (!error && data.session?.access_token) return data.session.access_token
  } catch {
    /* ignorar */
  }
  const { data: s } = await sb.auth.getSession()
  return s.session?.access_token ?? null
}

async function postNotifyAdmins(sb: SupabaseClient, body: Record<string, unknown>): Promise<void> {
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!base || !anon) return
  const token = await getAccessToken(sb)
  if (!token) return
  await fetch(`${base}/functions/v1/notify-admins`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anon}`,
      apikey: anon,
    },
    body: JSON.stringify({ ...body, caller_access_token: token }),
  }).catch(() => {
    /* no bloquear flujos del usuario si falla el aviso */
  })
}

/** Tras vincular expediente pendiente a la cuenta (sesión activa). */
export function notifyAdminsRegistroVinculado(sb: SupabaseClient, appTipo: 'cliente' | 'transportista'): void {
  void postNotifyAdmins(sb, { event: 'registro_vinculado', app_tipo: appTipo })
}

/** Tras crear una solicitud de servicio desde el panel cliente. */
export function notifyAdminsNuevaSolicitudServicio(sb: SupabaseClient, solicitudId: string): void {
  void postNotifyAdmins(sb, { event: 'solicitud_servicio', solicitud_id: solicitudId })
}
