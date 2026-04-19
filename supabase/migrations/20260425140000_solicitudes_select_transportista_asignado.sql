-- El transportista asignado puede ver la solicitud (solo lectura; las actualizaciones siguen siendo admin/cliente según políticas existentes).

create policy "solicitudes_select_transportista_asignado"
  on public.solicitudes_servicio for select
  to authenticated
  using (transportista_user_id is not null and auth.uid() = transportista_user_id);
