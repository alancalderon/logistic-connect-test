export type MailStepResult = { ok: true } | { ok: false; error: string }
export type PersistStepResult = { ok: true } | { ok: false; message: string }

export type DecisionConCorreoOutcome =
  | { ok: true }
  | { ok: false; reason: 'mail'; message: string }
  | { ok: false; reason: 'persist'; message: string; mailAlreadySent: true }

/**
 * Primero envía el correo; solo si tiene éxito persiste aprobación/rechazo.
 * Si falla el envío, el registro sigue pendiente.
 */
export async function decisionConCorreoPrimero(
  sendMail: () => Promise<MailStepResult>,
  persist: () => Promise<PersistStepResult>,
): Promise<DecisionConCorreoOutcome> {
  const mail = await sendMail()
  if (!mail.ok) return { ok: false, reason: 'mail', message: mail.error }
  const p = await persist()
  if (!p.ok) return { ok: false, reason: 'persist', message: p.message, mailAlreadySent: true }
  return { ok: true }
}

export function mensajeErrorDecisionConCorreo(
  tipo: 'aprobar' | 'rechazar',
  res: Extract<DecisionConCorreoOutcome, { ok: false }>,
): string {
  if (res.reason === 'mail') {
    const acción = tipo === 'aprobar' ? 'la aprobación' : 'el rechazo'
    return `No se aplicó ${acción}: ${res.message} El registro sigue en espera.`
  }
  const acción = tipo === 'aprobar' ? 'aprobación' : 'rechazo'
  return `El correo de ${acción} ya se envió al usuario, pero no se pudo guardar el cambio: ${res.message} Intenta de nuevo o avísale al equipo técnico.`
}
