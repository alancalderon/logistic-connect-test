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
import { AdminGuiaQuickstartPage } from '@/pages/admin/AdminGuiaQuickstartPage'
import { MiCuentaPanelPage } from '@/pages/panel/MiCuentaPanelPage'
import { LoginPage } from '@/pages/LoginPage'
import { PendienteAprobacionPage } from '@/pages/PendienteAprobacionPage'
import { CuentaRechazadaPage } from '@/pages/CuentaRechazadaPage'
import { ClientePanelLayout } from '@/pages/cliente/ClientePanelLayout'
import { ClienteHistorialSolicitudesPage } from '@/pages/cliente/ClienteHistorialSolicitudesPage'
import { ClienteNuevaSolicitudPage } from '@/pages/cliente/ClienteNuevaSolicitudPage'
import { TransportistaPanelLayout } from '@/pages/transportista/TransportistaPanelLayout'
import { TransportistaFlotaPage } from '@/pages/transportista/TransportistaFlotaPage'
import { TransportistaAgregarVehiculoPage } from '@/pages/transportista/TransportistaAgregarVehiculoPage'
import { TransportistaViajesPage } from '@/pages/transportista/TransportistaViajesPage'

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
          <Route index element={<Navigate to="nueva-solicitud" replace />} />
          <Route path="nueva-solicitud" element={<ClienteNuevaSolicitudPage />} />
          <Route path="historial" element={<ClienteHistorialSolicitudesPage />} />
          <Route path="solicitudes" element={<Navigate to="historial" replace />} />
          <Route path="usuario" element={<MiCuentaPanelPage />} />
        </Route>
        <Route path="/panel/transportista" element={<TransportistaPanelLayout />}>
          <Route index element={<Navigate to="viajes" replace />} />
          <Route path="viajes" element={<TransportistaViajesPage />} />
          <Route path="flota" element={<TransportistaFlotaPage />} />
          <Route path="agregar-vehiculo" element={<TransportistaAgregarVehiculoPage />} />
          <Route path="usuario" element={<MiCuentaPanelPage />} />
        </Route>
        <Route path="/registro/cliente/confirmacion" element={<RegistroClienteConfirmacionPage />} />
        <Route path="/registro/cliente" element={<RegistroClientePage />} />
        <Route path="/registro/transportista/confirmacion" element={<RegistroTransportistaConfirmacionPage />} />
        <Route path="/registro/transportista" element={<RegistroTransportistaPage />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="solicitudes" replace />} />
          <Route path="waitlist" element={<AdminWaitlistPage />} />
          <Route path="usuarios" element={<AdminUsuariosPage />} />
          <Route path="solicitudes" element={<AdminSolicitudesPage />} />
          <Route path="flota" element={<AdminFlotaPage />} />
          <Route path="guia" element={<AdminGuiaQuickstartPage />} />
          <Route path="usuario" element={<MiCuentaPanelPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
