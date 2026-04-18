/**
 * Avisa por correo a los administradores (perfiles is_admin) cuando ocurre un evento verificable:
 * - registro_vinculado: el usuario acaba de enlazar un expediente pendiente a su cuenta.
 * - solicitud_servicio: el cliente creó una fila en solicitudes_servicio.
 *
 * Auth: Authorization Bearer = anon key; caller_access_token = JWT del usuario que dispara el evento.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function authUserIdFromJwt(
  supabaseUrl: string,
  anonKey: string,
  jwt: string,
): Promise<{ ok: true; userId: string; email: string | null } | { ok: false }> {
  const base = supabaseUrl.replace(/\/$/, '')
  const res = await fetch(`${base}/auth/v1/user`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${jwt}`, apikey: anonKey },
  })
  if (!res.ok) return { ok: false }
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (!data) return { ok: false }
  const id =
    typeof data.id === 'string'
      ? data.id
      : data.user && typeof (data.user as Record<string, unknown>).id === 'string'
        ? String((data.user as Record<string, unknown>).id)
        : null
  const email =
    typeof data.email === 'string'
      ? data.email
      : data.user && typeof (data.user as Record<string, unknown>).email === 'string'
        ? String((data.user as Record<string, unknown>).email)
        : null
  if (!id) return { ok: false }
  return { ok: true, userId: id, email }
}

type Incoming = {
  caller_access_token?: string
  event?: string
  app_tipo?: string
  solicitud_id?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''
    const from = Deno.env.get('RESEND_FROM') ?? 'TransLogix <onboarding@resend.dev>'

    if (!url || !anonKey || !serviceKey) {
      return new Response(JSON.stringify({ ok: false, error: 'MISSING_SUPABASE_ENV' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!resendKey) {
      return new Response(JSON.stringify({ ok: false, error: 'MISSING_RESEND_API_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const post = (await req.json().catch(() => null)) as Incoming | null
    if (!post || typeof post !== 'object') {
      return new Response(JSON.stringify({ ok: false, error: 'JSON_INVALIDO' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const fromBody = typeof post.caller_access_token === 'string' ? post.caller_access_token.trim() : ''
    const authHeader = (req.headers.get('Authorization') ?? '').trim()
    const fromHeader = /^Bearer\s+(\S+)/i.exec(authHeader)?.[1] ?? ''
    const anonTrim = anonKey.trim()
    let jwt = fromBody
    if (!jwt && fromHeader && fromHeader !== anonTrim) jwt = fromHeader
    if (!jwt) {
      return new Response(JSON.stringify({ ok: false, error: 'NO_AUTH' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const auth = await authUserIdFromJwt(url, anonKey, jwt)
    if (!auth.ok) {
      return new Response(JSON.stringify({ ok: false, error: 'NO_AUTH' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const event = typeof post.event === 'string' ? post.event.trim() : ''
    let subject = ''
    let html = ''

    if (event === 'registro_vinculado') {
      const tipo = post.app_tipo === 'transportista' ? 'transportista' : 'cliente'
      if (tipo === 'cliente') {
        const { data: row, error } = await admin
          .from('registro_clientes')
          .select('id, razon_social, email, contacto_nombre, telefono, estado_aprobacion')
          .eq('user_id', auth.userId)
          .eq('estado_aprobacion', 'pendiente')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (error || !row) {
          return new Response(JSON.stringify({ ok: false, error: 'EVENTO_NO_VERIFICABLE' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        subject = 'TransLogix — nueva solicitud de alta (cliente)'
        html = `
<p>Hola,</p>
<p>Una persona acaba de <strong>completar el acceso</strong> y tiene un expediente de <strong>cliente</strong> en <strong>lista de espera</strong> para que lo revises.</p>
<ul>
  <li><strong>Razón social:</strong> ${escapeHtml(String(row.razon_social ?? ''))}</li>
  <li><strong>Contacto:</strong> ${escapeHtml(String(row.contacto_nombre ?? ''))}</li>
  <li><strong>Correo:</strong> ${escapeHtml(String(row.email ?? ''))}</li>
  <li><strong>Teléfono:</strong> ${escapeHtml(String(row.telefono ?? ''))}</li>
</ul>
<p>Entra al panel de administración → Waitlist para aprobar o rechazar.</p>
`.trim()
      } else {
        const { data: row, error } = await admin
          .from('registro_transportistas')
          .select('id, nombre_o_razon, email, contacto_nombre, telefono, rfc, estado_aprobacion')
          .eq('user_id', auth.userId)
          .eq('estado_aprobacion', 'pendiente')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (error || !row) {
          return new Response(JSON.stringify({ ok: false, error: 'EVENTO_NO_VERIFICABLE' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        subject = 'TransLogix — nueva solicitud de alta (transportista)'
        html = `
<p>Hola,</p>
<p>Una persona acaba de <strong>completar el acceso</strong> y tiene un expediente de <strong>transportista</strong> en <strong>lista de espera</strong>.</p>
<ul>
  <li><strong>Nombre o razón:</strong> ${escapeHtml(String(row.nombre_o_razon ?? ''))}</li>
  <li><strong>Contacto:</strong> ${escapeHtml(String(row.contacto_nombre ?? ''))}</li>
  <li><strong>Correo:</strong> ${escapeHtml(String(row.email ?? ''))}</li>
  <li><strong>Teléfono:</strong> ${escapeHtml(String(row.telefono ?? ''))}</li>
  <li><strong>RFC:</strong> ${escapeHtml(String(row.rfc ?? '—'))}</li>
</ul>
<p>Entra al panel de administración → Waitlist para aprobar o rechazar.</p>
`.trim()
      }
    } else if (event === 'solicitud_servicio') {
      const sid = typeof post.solicitud_id === 'string' ? post.solicitud_id.trim() : ''
      if (!sid) {
        return new Response(JSON.stringify({ ok: false, error: 'SOLICITUD_ID_INVALIDO' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data: row, error } = await admin
        .from('solicitudes_servicio')
        .select(
          'id, titulo, fecha_servicio, origen, destino, descripcion, peso_carga, dimensiones_carga, user_id',
        )
        .eq('id', sid)
        .maybeSingle()
      if (error || !row || String(row.user_id) !== String(auth.userId)) {
        return new Response(JSON.stringify({ ok: false, error: 'EVENTO_NO_VERIFICABLE' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      subject = 'TransLogix — nueva solicitud de servicio'
      html = `
<p>Hola,</p>
<p>Un <strong>cliente</strong> registró una nueva <strong>solicitud de servicio</strong>.</p>
<ul>
  <li><strong>Título:</strong> ${escapeHtml(String(row.titulo ?? ''))}</li>
  <li><strong>Fecha del servicio:</strong> ${escapeHtml(String(row.fecha_servicio ?? ''))}</li>
  <li><strong>Origen:</strong> ${escapeHtml(String(row.origen ?? '—'))}</li>
  <li><strong>Destino:</strong> ${escapeHtml(String(row.destino ?? '—'))}</li>
  <li><strong>Peso de la carga:</strong> ${escapeHtml(String((row as { peso_carga?: string | null }).peso_carga ?? '—'))}</li>
  <li><strong>Dimensiones de la carga:</strong> ${escapeHtml(String((row as { dimensiones_carga?: string | null }).dimensiones_carga ?? '—'))}</li>
</ul>
${row.descripcion ? `<p><strong>Detalle:</strong><br/>${escapeHtml(String(row.descripcion)).replace(/\n/g, '<br/>')}</p>` : ''}
<p><strong>Correo del cliente:</strong> ${escapeHtml(auth.email ?? '—')}</p>
<p>Revisa la sección Solicitudes en el panel de administración.</p>
`.trim()
    } else {
      return new Response(JSON.stringify({ ok: false, error: 'EVENTO_DESCONOCIDO' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: admins, error: admErr } = await admin
      .from('profiles')
      .select('email')
      .eq('is_admin', true)
    if (admErr) {
      return new Response(JSON.stringify({ ok: false, error: admErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const emails = (admins ?? [])
      .map((a: { email?: string | null }) => (typeof a.email === 'string' ? a.email.trim().toLowerCase() : ''))
      .filter((e: string) => e.includes('@'))
    const unique = [...new Set(emails)]
    if (unique.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no_admin_emails' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: unique,
        subject,
        html: `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/></head><body style="font-family:system-ui,sans-serif;line-height:1.55;color:#1e293b;font-size:15px;">${html}</body></html>`,
      }),
    })
    const raw = await res.text()
    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, error: raw.slice(0, 300) }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, destinatarios: unique.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
