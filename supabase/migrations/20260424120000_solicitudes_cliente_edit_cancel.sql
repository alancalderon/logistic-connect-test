-- Dueño (cliente): editar campos mientras está pendiente, o marcar como cancelada (definitiva).
-- No puede tocar asignación ni otros estados; el admin sigue usando la política existente.

create policy "solicitudes_update_cliente_pendiente"
  on public.solicitudes_servicio for update
  to authenticated
  using (
    auth.uid() = user_id
    and estado = 'pendiente'
    and not public.is_admin()
  )
  with check (
    auth.uid() = user_id
    and estado in ('pendiente', 'cancelado')
    and transportista_user_id is null
    and transportista_contacto is null
    and flota_unidad_id is null
    and flota_unidad_resumen is null
  );
