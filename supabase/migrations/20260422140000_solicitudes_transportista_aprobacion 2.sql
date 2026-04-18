-- Asignación de transportista al aprobar; rechazo explícito; actualización solo admin (evita que el cliente altere estado).

alter table public.solicitudes_servicio
  add column if not exists transportista_user_id uuid references auth.users (id) on delete set null,
  add column if not exists transportista_contacto text;

comment on column public.solicitudes_servicio.transportista_user_id is 'Usuario transportista asignado por un administrador al aprobar.';
comment on column public.solicitudes_servicio.transportista_contacto is 'Texto de contacto (p. ej. correo) visible para el cliente sin depender de RLS sobre profiles.';

-- Filas legacy "asignado" sin transportista: volver a pendiente antes del nuevo check
update public.solicitudes_servicio
set estado = 'pendiente'
where estado = 'asignado'
  and transportista_user_id is null;

alter table public.solicitudes_servicio drop constraint if exists solicitudes_servicio_estado_check;
alter table public.solicitudes_servicio add constraint solicitudes_servicio_estado_check
  check (estado in ('pendiente', 'asignado', 'cancelado', 'rechazada'));

alter table public.solicitudes_servicio drop constraint if exists solicitudes_servicio_asignacion_check;
alter table public.solicitudes_servicio add constraint solicitudes_servicio_asignacion_check
  check (
    (estado <> 'asignado' or transportista_user_id is not null)
    and (estado <> 'rechazada' or (transportista_user_id is null and transportista_contacto is null))
  );

drop policy if exists "solicitudes_update_own_or_admin" on public.solicitudes_servicio;

create policy "solicitudes_update_admin"
  on public.solicitudes_servicio for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
