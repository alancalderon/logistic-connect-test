import type { SupabaseClient } from '@supabase/supabase-js'
import { shareInflight } from '@/lib/inflight'

/** Misma consulta que Waitlist: evita doble fetch si el efecto corre dos veces (StrictMode). */
export function fetchWaitlistRegistrosPair(sb: SupabaseClient) {
  return shareInflight('admin-waitlist-registros', () =>
    Promise.all([
      sb
        .from('registro_clientes')
        .select('id, created_at, razon_social, contacto_nombre, email, telefono, estado_aprobacion, user_id')
        .order('created_at', { ascending: false }),
      sb
        .from('registro_transportistas')
        .select('id, created_at, nombre_o_razon, contacto_nombre, email, telefono, rfc, estado_aprobacion, user_id')
        .order('created_at', { ascending: false }),
    ]).then(([c, t]) => ({ c, t })),
  )
}

/** Consulta de la página Usuarios (incluye contacto_cargo en clientes). */
export function fetchUsuariosRegistrosPair(sb: SupabaseClient) {
  return shareInflight('admin-usuarios-registros', () =>
    Promise.all([
      sb
        .from('registro_clientes')
        .select(
          'id, created_at, razon_social, contacto_nombre, contacto_cargo, email, telefono, estado_aprobacion, user_id',
        )
        .order('created_at', { ascending: false }),
      sb
        .from('registro_transportistas')
        .select('id, created_at, nombre_o_razon, contacto_nombre, email, telefono, rfc, estado_aprobacion, user_id')
        .order('created_at', { ascending: false }),
    ]).then(([c, t]) => ({ c, t })),
  )
}
