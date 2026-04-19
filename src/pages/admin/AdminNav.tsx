import { PanelNavBar } from '@/components/PanelNavBar'

export function AdminNav({ email, onLogout }: { email: string; onLogout: () => void }) {
  return (
    <PanelNavBar
      subtitle="Panel de administración"
      contentMaxWidth="max-w-7xl"
      accent="admin"
      accountHref="/admin/usuario"
      email={email}
      onLogout={onLogout}
      primaryItems={[
        { to: '/admin/solicitudes', label: 'Solicitudes' },
        { to: '/admin/usuarios', label: 'Usuarios' },
        { to: '/admin/waitlist', label: 'Waitlist' },
        { to: '/admin/flota', label: 'Flota' },
        { to: '/admin/guia', label: 'Guía rápida' },
      ]}
    />
  )
}
