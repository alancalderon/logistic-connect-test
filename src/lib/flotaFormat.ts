const TIPO_UNIDAD_LABEL: Record<string, string> = {
  'caja-seca': 'Caja seca',
  plataforma: 'Plataforma / flatbed',
  refrigerado: 'Refrigerado',
  rabon: 'Rabón / torton',
  otro: 'Otro',
}

export function tipoUnidadLabel(slug: string) {
  const s = String(slug ?? '').trim()
  return TIPO_UNIDAD_LABEL[s] ?? (s || 'Unidad')
}

export function flotaUnidadResumen(row: {
  tipo_unidad: string
  placas: string
  numero_economico?: string | null
}) {
  const tipo = tipoUnidadLabel(row.tipo_unidad)
  const placas = String(row.placas ?? '').trim()
  const eco = row.numero_economico?.trim()
  const ecoPart = eco ? ` · Eco ${eco}` : ''
  return `${tipo} — ${placas}${ecoPart}`
}
