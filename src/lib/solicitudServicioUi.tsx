const solicitudEstadoStyles: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-900',
  asignado: 'bg-emerald-100 text-emerald-900',
  cancelado: 'bg-slate-200 text-slate-800',
  rechazada: 'bg-red-100 text-red-800',
}

const solicitudEstadoLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  asignado: 'Asignada',
  cancelado: 'Cancelada',
  rechazada: 'Rechazada',
}

export function solicitudServicioEstadoBadge(estado: string) {
  const cls = solicitudEstadoStyles[estado] ?? 'bg-slate-100 text-slate-700'
  const label = solicitudEstadoLabels[estado] ?? estado
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
  )
}
