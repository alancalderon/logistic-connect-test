/**
 * Envío de correos (clave API solo en secrets del proyecto, no en el navegador).
 * Solo cuentas con permiso de administrador pueden usar esta función.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Body = {
  to?: string
  subject?: string
  html?: string
  /** JWT de sesión del admin; obligatorio desde el navegador (el gateway no acepta ES256 en Authorization). */
  caller_access_token?: string
}

/** Valida el JWT contra Auth sin depender de getUser() en este runtime. */
async function authUserIdFromJwt(
  supabaseUrl: string,
  anonKey: string,
  jwt: string,
): Promise<{ ok: true; userId: string } | { ok: false }> {
  const base = supabaseUrl.replace(/\/$/, '')
  const res = await fetch(`${base}/auth/v1/user`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${jwt}`,
      apikey: anonKey,
    },
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
  if (!id) return { ok: false }
  return { ok: true, userId: id }
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

    const postBody = (await req.json().catch(() => null)) as Body | null
    if (!postBody || typeof postBody !== 'object') {
      return new Response(JSON.stringify({ ok: false, error: 'JSON_INVALIDO' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const fromBody =
      typeof postBody.caller_access_token === 'string' ? postBody.caller_access_token.trim() : ''
    const authHeader = (req.headers.get('Authorization') ?? '').trim()
    const fromHeader = /^Bearer\s+(\S+)/i.exec(authHeader)?.[1] ?? ''
    const anonTrim = anonKey.trim()
    let jwt = fromBody
    if (!jwt && fromHeader && fromHeader !== anonTrim) {
      jwt = fromHeader
    }
    if (!jwt) {
      return new Response(JSON.stringify({ ok: false, error: 'NO_AUTH' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authUser = await authUserIdFromJwt(url, anonKey, jwt)
    if (!authUser.ok) {
      return new Response(JSON.stringify({ ok: false, error: 'NO_AUTH' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: prof, error: profErr } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', authUser.userId)
      .maybeSingle()
    if (profErr || !prof?.is_admin) {
      return new Response(JSON.stringify({ ok: false, error: 'NO_ADMIN' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const to = typeof postBody.to === 'string' ? postBody.to.trim().toLowerCase() : ''
    const subject = typeof postBody.subject === 'string' ? postBody.subject.trim() : ''
    const html = typeof postBody.html === 'string' ? postBody.html : ''
    if (!to || !to.includes('@')) {
      return new Response(JSON.stringify({ ok: false, error: 'TO_INVALIDO' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!subject || subject.length > 200) {
      return new Response(JSON.stringify({ ok: false, error: 'ASUNTO_INVALIDO' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!html || html.length > 400000) {
      return new Response(JSON.stringify({ ok: false, error: 'HTML_INVALIDO' }), {
        status: 400,
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
        to: [to],
        subject,
        html,
      }),
    })

    const raw = await res.text()
    let json: { message?: string; id?: string } = {}
    try {
      json = JSON.parse(raw) as { message?: string; id?: string }
    } catch {
      /* ignore */
    }

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: json.message ?? raw.slice(0, 200) ?? `HTTP_${res.status}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(JSON.stringify({ ok: true, id: json.id ?? null }), {
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
