import type { EstadoAprobacion } from '@/lib/adminCuentaActions'

export function formatIngreso(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function estadoAprobacionBadge(estado: EstadoAprobacion) {
  const map = {
    pendiente: 'bg-amber-100 text-amber-900',
    aprobado: 'bg-emerald-100 text-emerald-900',
    rechazado: 'bg-red-100 text-red-800',
  } as const
  const label = {
    pendiente: 'Alta pendiente',
    aprobado: 'Solicitud aprobada',
    rechazado: 'Solicitud rechazada',
  } as const
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${map[estado]}`}>{label[estado]}</span>
  )
}
