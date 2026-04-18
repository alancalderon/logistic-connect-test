import type { SupabaseClient } from '@supabase/supabase-js'

/** Origen del navegador (vacío fuera del cliente). */
function appOrigin() {
  if (typeof window === 'undefined') return ''
  return window.location.origin.replace(/\/$/, '')
}

/**
 * URL pública del sitio (enlaces en correos). Si existe VITE_PUBLIC_SITE_URL, tiene prioridad
 * sobre el origen del navegador — evita "localhost" en correos cuando el admin prueba en local.
 */
function publicSiteBaseUrl(): string {
  const configured = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim().replace(/\/$/, '')
  if (configured) return configured
  return appOrigin()
}

function loginUrlForEmails(): string {
  const base = publicSiteBaseUrl()
  return base ? `${base}/iniciar-sesion` : '/iniciar-sesion'
}

function escapeAttr(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
}

function emailShell(params: {
  accent: 'success' | 'neutral'
  title: string
  innerHtml: string
  ctaLabel: string
  ctaHref: string
  footerNote: string
}) {
  const headerBg =
    params.accent === 'success'
      ? 'linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%)'
      : 'linear-gradient(135deg,#475569 0%,#334155 100%)'
  const ctaBg = params.accent === 'success' ? '#2563eb' : '#475569'
  const ctaShadow =
    params.accent === 'success' ? '0 2px 8px rgba(37,99,235,0.35)' : '0 2px 8px rgba(51,65,85,0.22)'
  const safeHref = escapeAttr(params.ctaHref)
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeAttr(params.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:${headerBg};padding:22px 28px;">
              <span style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#ffffff;">TransLogix</span>
              <div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;font-weight:500;color:rgba(255,255,255,0.88);margin-top:6px;">${escapeAttr(params.title)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;line-height:1.65;color:#334155;">
              ${params.innerHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;">
              <a href="${safeHref}" style="display:inline-block;background:${ctaBg};color:#ffffff !important;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:10px;font-family:system-ui,-apple-system,sans-serif;box-shadow:${ctaShadow};">${escapeAttr(params.ctaLabel)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 22px;background:#f8fafc;border-top:1px solid #e2e8f0;font-family:system-ui,-apple-system,sans-serif;font-size:12px;line-height:1.5;color:#64748b;">
              ${params.footerNote}
            </td>
          </tr>
        </table>
        <p style="font-family:system-ui,sans-serif;font-size:11px;color:#94a3b8;margin:20px 8px 0;max-width:560px;">
          Este mensaje se envió porque alguien de nuestro equipo procesó una solicitud vinculada a tu correo.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}

function buildHtmlAprobacion(params: {
  nombre: string
  tipo: 'cliente' | 'transportista'
  loginUrl: string
  sinVinculoAuth?: boolean
}) {
  const rolEtiqueta = params.tipo === 'cliente' ? 'cliente' : 'transportista'
  const cuerpoSesion = params.sinVinculoAuth
    ? `<p style="margin:0 0 16px;">Tu solicitud como <strong>${escapeAttr(rolEtiqueta)}</strong> quedó <strong style="color:#15803d;">aprobada</strong>. Sin embargo, <strong>no tenemos vinculada una cuenta de acceso</strong> a este expediente (por ejemplo, un registro anterior al flujo actual).</p>
       <p style="margin:0 0 16px;padding:14px 16px;background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;color:#92400e;font-size:14px;line-height:1.5;">Escribe al equipo de soporte indicando este correo y te orientamos para los siguientes pasos.</p>`
    : `<p style="margin:0 0 16px;">¡Buenas noticias! Tu solicitud como <strong>${escapeAttr(rolEtiqueta)}</strong> quedó <strong style="color:#15803d;">aprobada</strong>.</p>
       <p style="margin:0 0 16px;">Ya puedes <strong>entrar a TransLogix</strong> con el mismo correo y la contraseña que usaste al registrarte.</p>`
  const inner = `
    <p style="margin:0 0 12px;font-size:17px;color:#0f172a;">Hola, <strong>${escapeAttr(params.nombre)}</strong></p>
    ${cuerpoSesion}
    <p style="margin:16px 0 0;font-size:15px;color:#475569;">Usa el botón de abajo para ir directo al inicio de sesión.</p>
  `
  const footer = `Si el botón no funciona, copia y pega esta dirección en tu navegador:<br /><span style="word-break:break-all;color:#475569;">${escapeAttr(params.loginUrl)}</span>`
  return emailShell({
    accent: 'success',
    title: 'Solicitud aprobada',
    innerHtml: inner,
    ctaLabel: 'Entrar a TransLogix',
    ctaHref: params.loginUrl,
    footerNote: footer,
  })
}

export type SolicitudCorreoDetalle = {
  titulo: string
  fecha_servicio: string
  origen: string | null
  destino: string | null
  descripcion: string | null
  peso_carga: string | null
  dimensiones_carga: string | null
}

/** Texto seguro en cuerpo HTML (no atributos); preserva saltos de línea. */
function escapeHtmlBody(s: string) {
  return escapeAttr(s).replace(/\r\n|\r|\n/g, '<br/>')
}

function solicitudDetalleTableHtml(d: SolicitudCorreoDetalle): string {
  const rows: [string, string][] = [
    ['Título', d.titulo],
    ['Fecha del servicio', d.fecha_servicio],
  ]
  if (d.origen?.trim()) rows.push(['Origen', d.origen.trim()])
  if (d.destino?.trim()) rows.push(['Destino', d.destino.trim()])
  if (d.peso_carga?.trim()) rows.push(['Peso de la carga', d.peso_carga.trim()])
  if (d.dimensiones_carga?.trim()) rows.push(['Dimensiones de la carga', d.dimensiones_carga.trim()])
  if (d.descripcion?.trim()) rows.push(['Detalle', d.descripcion.trim()])
  const tr = rows
    .map(
      ([k, v]) => `<tr>
<td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:13px;font-weight:600;color:#475569;width:34%;">${escapeAttr(k)}</td>
<td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;vertical-align:top;">${k === 'Detalle' ? escapeHtmlBody(v) : escapeAttr(v)}</td>
</tr>`,
    )
    .join('')
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:16px 0;">${tr}</table>`
}

function panelClienteSolicitudesUrl(): string {
  const base = publicSiteBaseUrl()
  return base ? `${base}/panel/cliente/solicitudes` : '/panel/cliente/solicitudes'
}

function panelTransportistaUrl(): string {
  const base = publicSiteBaseUrl()
  return base ? `${base}/panel/transportista/flota` : '/panel/transportista/flota'
}

function buildHtmlSolicitudAprobadaCliente(params: {
  nombre: string
  det: SolicitudCorreoDetalle
  transportistaNombre: string
  unidadResumen: string
}) {
  const panelUrl = panelClienteSolicitudesUrl()
  const inner = `
    <p style="margin:0 0 12px;font-size:17px;color:#0f172a;">Hola, <strong>${escapeAttr(params.nombre)}</strong></p>
    <p style="margin:0 0 16px;">Tu <strong>solicitud de servicio</strong> fue <strong style="color:#15803d;">aceptada</strong> y ya tiene transportista y unidad asignadas.</p>
    ${solicitudDetalleTableHtml(params.det)}
    <p style="margin:16px 0 0;font-size:15px;color:#334155;"><strong>Transportista asignado:</strong> ${escapeAttr(params.transportistaNombre)}</p>
    <p style="margin:8px 0 16px;font-size:15px;color:#334155;"><strong>Unidad que realizará el servicio:</strong> ${escapeAttr(params.unidadResumen)}</p>
    <p style="margin:0;font-size:14px;color:#64748b;">Puedes revisar el estado en tu panel de cliente.</p>
  `
  const footer = `Si el botón no funciona, copia y pega esta dirección:<br /><span style="word-break:break-all;color:#475569;">${escapeAttr(panelUrl)}</span>`
  return emailShell({
    accent: 'success',
    title: 'Solicitud de servicio aceptada',
    innerHtml: inner,
    ctaLabel: 'Ver mis solicitudes',
    ctaHref: panelUrl,
    footerNote: footer,
  })
}

function buildHtmlSolicitudAprobadaTransportista(params: {
  nombre: string
  det: SolicitudCorreoDetalle
  clienteNombre: string
  clienteEmail: string
}) {
  const panelUrl = panelTransportistaUrl()
  const inner = `
    <p style="margin:0 0 12px;font-size:17px;color:#0f172a;">Hola, <strong>${escapeAttr(params.nombre)}</strong></p>
    <p style="margin:0 0 16px;">Se te ha <strong>asignado un servicio de transporte</strong>. A continuación los datos del cliente y del viaje.</p>
    <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Cliente:</strong> ${escapeAttr(params.clienteNombre)}</p>
    <p style="margin:0 0 16px;font-size:14px;color:#334155;"><strong>Correo del cliente:</strong> ${escapeAttr(params.clienteEmail)}</p>
    ${solicitudDetalleTableHtml(params.det)}
    <p style="margin:16px 0 0;font-size:14px;color:#64748b;">Coordina el servicio según la información indicada. Si tienes dudas, contacta al cliente por el correo anterior.</p>
  `
  const footer = `Panel transportista:<br /><span style="word-break:break-all;color:#475569;">${escapeAttr(panelUrl)}</span>`
  return emailShell({
    accent: 'success',
    title: 'Nuevo servicio asignado',
    innerHtml: inner,
    ctaLabel: 'Ir a mi panel',
    ctaHref: panelUrl,
    footerNote: footer,
  })
}

function buildHtmlSolicitudCancelacionCliente(params: { nombre: string; det: SolicitudCorreoDetalle }) {
  const panelUrl = panelClienteSolicitudesUrl()
  const inner = `
    <p style="margin:0 0 12px;font-size:17px;color:#0f172a;">Hola, <strong>${escapeAttr(params.nombre)}</strong></p>
    <p style="margin:0 0 16px;">La <strong>asignación de transporte</strong> de tu solicitud de servicio fue <strong>cancelada</strong> por operaciones.</p>
    ${solicitudDetalleTableHtml(params.det)}
    <p style="margin:16px 0 0;font-size:14px;color:#475569;">La solicitud volvió a estado pendiente en nuestro sistema; cuando se vuelva a asignar un transporte, recibirás un nuevo aviso.</p>
  `
  const footer = `Enlace al panel:<br /><span style="word-break:break-all;color:#475569;">${escapeAttr(panelUrl)}</span>`
  return emailShell({
    accent: 'neutral',
    title: 'Asignación cancelada',
    innerHtml: inner,
    ctaLabel: 'Ver mis solicitudes',
    ctaHref: panelUrl,
    footerNote: footer,
  })
}

function buildHtmlSolicitudServicioRechazadaCliente(params: { nombre: string; det: SolicitudCorreoDetalle }) {
  const panelUrl = panelClienteSolicitudesUrl()
  const inner = `
    <p style="margin:0 0 12px;font-size:17px;color:#0f172a;">Hola, <strong>${escapeAttr(params.nombre)}</strong></p>
    <p style="margin:0 0 16px;">Tu <strong>solicitud de servicio</strong> fue <strong>rechazada</strong> por operaciones y no continuará en el flujo de asignación.</p>
    ${solicitudDetalleTableHtml(params.det)}
    <p style="margin:16px 0 0;font-size:14px;color:#475569;">Puedes consultar el estado en tu panel. Si crees que hubo un error o necesitas más información, responde a este correo o contacta al equipo.</p>
  `
  const footer = `Enlace al panel:<br /><span style="word-break:break-all;color:#475569;">${escapeAttr(panelUrl)}</span>`
  return emailShell({
    accent: 'neutral',
    title: 'Solicitud de servicio rechazada',
    innerHtml: inner,
    ctaLabel: 'Ver mis solicitudes',
    ctaHref: panelUrl,
    footerNote: footer,
  })
}

function buildHtmlSolicitudCancelacionTransportista(params: { nombre: string; det: SolicitudCorreoDetalle }) {
  const panelUrl = panelTransportistaUrl()
  const inner = `
    <p style="margin:0 0 12px;font-size:17px;color:#0f172a;">Hola, <strong>${escapeAttr(params.nombre)}</strong></p>
    <p style="margin:0 0 16px;">La <strong>asignación del siguiente servicio</strong> fue <strong>cancelada</strong> por operaciones. Ya no debes considerarla vigente.</p>
    ${solicitudDetalleTableHtml(params.det)}
    <p style="margin:16px 0 0;font-size:14px;color:#64748b;">Si necesitas aclaraciones, contacta a operaciones en TransLogix.</p>
  `
  const footer = `Panel transportista:<br /><span style="word-break:break-all;color:#475569;">${escapeAttr(panelUrl)}</span>`
  return emailShell({
    accent: 'neutral',
    title: 'Asignación de servicio cancelada',
    innerHtml: inner,
    ctaLabel: 'Ir a mi panel',
    ctaHref: panelUrl,
    footerNote: footer,
  })
}

function buildHtmlRechazo(params: { nombre: string; tipo: 'cliente' | 'transportista'; loginUrl: string }) {
  const rolEtiqueta = params.tipo === 'cliente' ? 'cliente' : 'transportista'
  const inner = `
    <p style="margin:0 0 12px;font-size:17px;color:#0f172a;">Hola, <strong>${escapeAttr(params.nombre)}</strong></p>
    <p style="margin:0 0 16px;">Te escribimos para contarte que, en esta ocasión, tu solicitud como <strong>${escapeAttr(rolEtiqueta)}</strong> <strong>no fue aprobada</strong>.</p>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;">Sabemos que puede ser una noticia difícil. Si crees que hubo un error o quieres más contexto, puedes responder a este correo o contactar al equipo.</p>
    <p style="margin:0;font-size:14px;color:#64748b;">En la página de acceso del sitio encontrarás más información si ya tenías cuenta.</p>
  `
  const footer = `Enlace útil (por si no ves el botón):<br /><span style="word-break:break-all;color:#475569;">${escapeAttr(params.loginUrl)}</span>`
  return emailShell({
    accent: 'neutral',
    title: 'Actualización de tu solicitud',
    innerHtml: inner,
    ctaLabel: 'Ir a la página de acceso',
    ctaHref: params.loginUrl,
    footerNote: footer,
  })
}

/** Texto para pantallas (admin); sin detalles de implementación. */
function mensajeErrorCorreoServidor(code: string | undefined, rawFallback: string): string {
  const c = (code ?? '').trim()
  if (c === 'NO_AUTH') {
    return 'No pudimos validar tu sesión. Cierra sesión, vuelve a entrar e intenta de nuevo.'
  }
  if (c === 'NO_ADMIN') {
    return 'Tu cuenta no tiene permisos para enviar notificaciones por correo.'
  }
  if (c === 'MISSING_RESEND_API_KEY' || c === 'MISSING_SUPABASE_ENV') {
    return 'El envío de correos no está disponible en el servidor. Avísale al equipo técnico.'
  }
  if (c === 'TO_INVALIDO' || c === 'ASUNTO_INVALIDO' || c === 'HTML_INVALIDO' || c === 'JSON_INVALIDO') {
    return 'Los datos del correo no son válidos. Revisa el expediente e inténtalo de nuevo.'
  }
  if (c && c.length > 0 && c.length < 120 && !c.includes('_') && !/^HTTP_\d+$/i.test(c)) {
    return `No se pudo enviar el correo: ${c}`
  }
  const tail = rawFallback.length > 120 ? `${rawFallback.slice(0, 120)}…` : rawFallback
  return tail ? `No se pudo enviar el correo (${tail})` : 'No se pudo enviar el correo. Inténtalo más tarde.'
}

async function invokeSendEmail(
  sb: SupabaseClient,
  body: { to: string; subject: string; html: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!base || !anon) {
    return { ok: false, error: 'La aplicación no está configurada para enviar correos. Avísale al equipo técnico.' }
  }

  let token: string | null = null
  try {
    const { data, error } = await sb.auth.refreshSession()
    if (!error && data.session?.access_token) {
      token = data.session.access_token
    }
  } catch {
    /* seguimos con getSession */
  }
  if (!token) {
    const { data: sess } = await sb.auth.getSession()
    token = sess.session?.access_token ?? null
  }
  if (!token) {
    return { ok: false, error: 'No hay sesión activa. Cierra sesión y vuelve a entrar.' }
  }

  const res = await fetch(`${base}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anon}`,
      apikey: anon,
    },
    body: JSON.stringify({ ...body, caller_access_token: token }),
  })
  const raw = await res.text()
  let json: { ok?: boolean; error?: string } = {}
  try {
    json = JSON.parse(raw) as { ok?: boolean; error?: string }
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    if (res.status === 404) {
      return { ok: false, error: 'El servicio de correo no está disponible. Avísale al equipo técnico.' }
    }
    const errCode = json.error ?? ''
    if (res.status === 401 || errCode === 'NO_AUTH') {
      return { ok: false, error: mensajeErrorCorreoServidor('NO_AUTH', '') }
    }
    if (res.status === 403 || errCode === 'NO_ADMIN') {
      return { ok: false, error: mensajeErrorCorreoServidor('NO_ADMIN', '') }
    }
    return {
      ok: false,
      error: `No se pudo contactar el servicio de correo (${res.status}). Inténtalo más tarde.`,
    }
  }

  if (!json.ok) {
    return { ok: false, error: mensajeErrorCorreoServidor(json.error, json.error ?? '') }
  }

  return { ok: true }
}

export async function notifyAccesoAprobado(
  sb: SupabaseClient,
  input: { to: string; nombre: string; tipo: 'cliente' | 'transportista'; sinVinculoAuth?: boolean },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const loginUrl = loginUrlForEmails()
  const html = buildHtmlAprobacion({
    nombre: input.nombre,
    tipo: input.tipo,
    loginUrl,
    sinVinculoAuth: input.sinVinculoAuth,
  })
  return invokeSendEmail(sb, {
    to: input.to.trim().toLowerCase(),
    subject: 'TransLogix — tu solicitud fue aprobada',
    html,
  })
}

export async function notifySolicitudRechazada(
  sb: SupabaseClient,
  input: { to: string; nombre: string; tipo: 'cliente' | 'transportista' },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const loginUrl = loginUrlForEmails()
  const html = buildHtmlRechazo({
    nombre: input.nombre,
    tipo: input.tipo,
    loginUrl,
  })
  return invokeSendEmail(sb, {
    to: input.to.trim().toLowerCase(),
    subject: 'TransLogix — actualización de tu solicitud',
    html,
  })
}

export async function notifySolicitudServicioAprobadaCliente(
  sb: SupabaseClient,
  input: {
    to: string
    nombre: string
    det: SolicitudCorreoDetalle
    transportistaNombre: string
    unidadResumen: string
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const html = buildHtmlSolicitudAprobadaCliente({
    nombre: input.nombre,
    det: input.det,
    transportistaNombre: input.transportistaNombre,
    unidadResumen: input.unidadResumen,
  })
  return invokeSendEmail(sb, {
    to: input.to.trim().toLowerCase(),
    subject: 'TransLogix — solicitud de servicio aceptada',
    html,
  })
}

export async function notifySolicitudServicioAprobadaTransportista(
  sb: SupabaseClient,
  input: {
    to: string
    nombre: string
    det: SolicitudCorreoDetalle
    clienteNombre: string
    clienteEmail: string
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const html = buildHtmlSolicitudAprobadaTransportista({
    nombre: input.nombre,
    det: input.det,
    clienteNombre: input.clienteNombre,
    clienteEmail: input.clienteEmail,
  })
  return invokeSendEmail(sb, {
    to: input.to.trim().toLowerCase(),
    subject: 'TransLogix — nuevo servicio asignado',
    html,
  })
}

export async function notifySolicitudServicioAsignacionCanceladaCliente(
  sb: SupabaseClient,
  input: { to: string; nombre: string; det: SolicitudCorreoDetalle },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const html = buildHtmlSolicitudCancelacionCliente(input)
  return invokeSendEmail(sb, {
    to: input.to.trim().toLowerCase(),
    subject: 'TransLogix — asignación de servicio cancelada',
    html,
  })
}

export async function notifySolicitudServicioRechazadaCliente(
  sb: SupabaseClient,
  input: { to: string; nombre: string; det: SolicitudCorreoDetalle },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const html = buildHtmlSolicitudServicioRechazadaCliente(input)
  return invokeSendEmail(sb, {
    to: input.to.trim().toLowerCase(),
    subject: 'TransLogix — solicitud de servicio rechazada',
    html,
  })
}

export async function notifySolicitudServicioAsignacionCanceladaTransportista(
  sb: SupabaseClient,
  input: { to: string; nombre: string; det: SolicitudCorreoDetalle },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const html = buildHtmlSolicitudCancelacionTransportista(input)
  return invokeSendEmail(sb, {
    to: input.to.trim().toLowerCase(),
    subject: 'TransLogix — asignación de servicio cancelada',
    html,
  })
}
