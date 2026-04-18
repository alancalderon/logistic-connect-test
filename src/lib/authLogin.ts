/** Correo en minúsculas y sin espacios laterales (registro y login). */
export function normalizeAuthEmail(raw: string) {
  return raw.trim().toLowerCase()
}

/** Mensajes más claros para errores comunes de `signInWithPassword`. */
export function describeSignInError(err: { message: string; code?: string }): string {
  const raw = (err.message ?? '').trim()
  const code = (err.code ?? '').toLowerCase()
  const msg = raw.toLowerCase()

  if (
    code === 'email_not_confirmed' ||
    msg.includes('email not confirmed') ||
    msg.includes('email_not_confirmed') ||
    msg.includes('confirm your email')
  ) {
    return 'Tu correo aún no está confirmado. Abre el enlace del mensaje de verificación (revisa spam) o usa «Reenviar verificación» debajo.'
  }

  if (
    raw === 'Invalid login credentials' ||
    code === 'invalid_credentials' ||
    msg.includes('invalid login') ||
    msg.includes('invalid credentials')
  ) {
    return 'Correo o contraseña incorrectos, o la cuenta aún no está aprobada. Comprueba mayúsculas y la misma clave del registro. Si acabas de registrarte y la confirmación por correo está activa, confirma el email primero.'
  }

  return raw || 'No se pudo iniciar sesión.'
}
