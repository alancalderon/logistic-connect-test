/** Combina fecha YYYY-MM-DD y hora HH:mm (interpretación local del navegador) → ISO para `timestamptz`. */
export function combinarFechaYHoraLocalAFechaIso(fechaYmd: string, horaHm: string): string | null {
  const f = fechaYmd.trim()
  const h = (horaHm || '00:00').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return null
  const [hhRaw, mmRaw] = h.split(':')
  const hour = Number(hhRaw)
  const min = Number((mmRaw ?? '00').slice(0, 2) || '0')
  if (Number.isNaN(hour) || Number.isNaN(min)) return null
  const y = Number(f.slice(0, 4))
  const mo = Number(f.slice(5, 7))
  const d = Number(f.slice(8, 10))
  if ([y, mo, d].some((n) => Number.isNaN(n))) return null
  const dt = new Date(y, mo - 1, d, hour, min, 0, 0)
  if (!Number.isFinite(dt.getTime())) return null
  return dt.toISOString()
}

/** Valor de `<input type="datetime-local" />` → ISO. */
export function parseDateTimeLocalToIso(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  const dt = new Date(v)
  if (!Number.isFinite(dt.getTime())) return null
  return dt.toISOString()
}

export function formatoInstanteLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return String(iso)
  return d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
}

export function datetimeLocalValueFromIso(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${hh}:${mm}`
}

export function horaLocalHHmmFromIso(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function validarVentanaEntrega(
  desde: string,
  hasta: string,
): { ok: true; inicio: string; fin: string } | { ok: false; error: string } {
  const d = desde.trim()
  const h = hasta.trim()
  if (!d || !h) {
    return { ok: false, error: 'Indica el inicio y el fin de la ventana de entrega (fecha y hora).' }
  }
  const inicio = parseDateTimeLocalToIso(d)
  const fin = parseDateTimeLocalToIso(h)
  if (!inicio || !fin) {
    return { ok: false, error: 'Las fechas y horas de la ventana de entrega no son válidas.' }
  }
  if (new Date(inicio).getTime() > new Date(fin).getTime()) {
    return { ok: false, error: 'En la ventana de entrega, el inicio debe ser anterior o igual al fin.' }
  }
  return { ok: true, inicio, fin }
}
