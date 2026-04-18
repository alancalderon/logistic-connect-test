import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'
import { RegistroClientePage } from '@/pages/RegistroClientePage'
import { RegistroClienteConfirmacionPage } from '@/pages/RegistroClienteConfirmacionPage'
import { RegistroTransportistaPage } from '@/pages/RegistroTransportistaPage'
import { RegistroTransportistaConfirmacionPage } from '@/pages/RegistroTransportistaConfirmacionPage'
import { AdminLoginPage } from '@/pages/AdminLoginPage'
import { AdminLayout } from '@/pages/admin/AdminLayout'
import { AdminWaitlistPage } from '@/pages/admin/AdminWaitlistPage'
import { AdminUsuariosPage } from '@/pages/admin/AdminUsuariosPage'
import { AdminSolicitudesPage } from '@/pages/admin/AdminSolicitudesPage'
import { AdminFlotaPage } from '@/pages/admin/AdminFlotaPage'
import { LoginPage } from '@/pages/LoginPage'
import { PendienteAprobacionPage } from '@/pages/PendienteAprobacionPage'
import { CuentaRechazadaPage } from '@/pages/CuentaRechazadaPage'
import { ClientePanelLayout } from '@/pages/cliente/ClientePanelLayout'
import { ClienteSolicitudesPage } from '@/pages/cliente/ClienteSolicitudesPage'
import { TransportistaPanelLayout } from '@/pages/transportista/TransportistaPanelLayout'
import { TransportistaFlotaPage } from '@/pages/transportista/TransportistaFlotaPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/iniciar-sesion" element={<LoginPage />} />
        <Route path="/activar-cuenta" element={<Navigate to="/iniciar-sesion" replace />} />
        <Route path="/pendiente-aprobacion" element={<PendienteAprobacionPage />} />
        <Route path="/cuenta-rechazada" element={<CuentaRechazadaPage />} />
        <Route path="/panel/cliente" element={<ClientePanelLayout />}>
          <Route index element={<Navigate to="solicitudes" replace />} />
          <Route path="solicitudes" element={<ClienteSolicitudesPage />} />
        </Route>
        <Route path="/panel/transportista" element={<TransportistaPanelLayout />}>
          <Route index element={<Navigate to="flota" replace />} />
          <Route path="flota" element={<TransportistaFlotaPage />} />
        </Route>
        <Route path="/registro/cliente/confirmacion" element={<RegistroClienteConfirmacionPage />} />
        <Route path="/registro/cliente" element={<RegistroClientePage />} />
        <Route path="/registro/transportista/confirmacion" element={<RegistroTransportistaConfirmacionPage />} />
        <Route path="/registro/transportista" element={<RegistroTransportistaPage />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="usuarios" replace />} />
          <Route path="waitlist" element={<AdminWaitlistPage />} />
          <Route path="usuarios" element={<AdminUsuariosPage />} />
          <Route path="solicitudes" element={<AdminSolicitudesPage />} />
          <Route path="flota" element={<AdminFlotaPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
