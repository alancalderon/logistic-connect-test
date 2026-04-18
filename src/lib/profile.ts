import type { SupabaseClient } from '@supabase/supabase-js'
import { shareInflight } from '@/lib/inflight'

export type TipoCuenta = 'cliente' | 'transportista'

export type CuentaEstado = 'pendiente_aprobacion' | 'activa' | 'rechazada'

export type AppProfile = {
  id: string
  tipo_cuenta: TipoCuenta | null
  cuenta_estado: CuentaEstado
  is_admin: boolean
}

const PROFILE_CACHE_TTL_MS = 5000
let profileCache: { uid: string; profile: AppProfile; at: number } | null = null

/** Llamar al cerrar sesión (también se limpia solo vía listener en `getSupabase`). */
export function clearAppProfileCache() {
  profileCache = null
}

/**
 * Carga `profiles` para el usuario actual.
 * @param authUserId Si ya conoces el `id` (p. ej. tras login), pásalo para evitar un `getUser()` extra a red.
 */
export async function fetchAppProfile(sb: SupabaseClient, authUserId?: string | null): Promise<AppProfile | null> {
  let uid = authUserId?.trim() || null
  if (!uid) {
    const { data: sess } = await sb.auth.getSession()
    uid = sess.session?.user?.id ?? null
  }
  if (!uid) {
    const { data: auth } = await sb.auth.getUser()
    uid = auth.user?.id ?? null
  }
  if (!uid) return null

  const now = Date.now()
  const cached = profileCache
  if (cached && cached.uid === uid && now - cached.at < PROFILE_CACHE_TTL_MS) {
    return cached.profile
  }

  return shareInflight(`app-profile:${uid}`, async () => {
    const { data, error } = await sb
      .from('profiles')
      .select('id, tipo_cuenta, cuenta_estado, is_admin')
      .eq('id', uid)
      .maybeSingle()
    if (error || !data) return null
    const profile: AppProfile = {
      id: String(data.id),
      tipo_cuenta: (data.tipo_cuenta as TipoCuenta | null) ?? null,
      cuenta_estado: data.cuenta_estado as CuentaEstado,
      is_admin: Boolean(data.is_admin),
    }
    profileCache = { uid, profile, at: Date.now() }
    return profile
  })
}
