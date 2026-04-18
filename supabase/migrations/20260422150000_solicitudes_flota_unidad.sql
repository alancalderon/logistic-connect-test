-- Al aprobar: unidad de flota obligatoria y debe pertenecer al transportista asignado.

alter table public.solicitudes_servicio
  add column if not exists flota_unidad_id uuid references public.flota_unidades (id) on delete set null,
  add column if not exists flota_unidad_resumen text;

comment on column public.solicitudes_servicio.flota_unidad_id is 'Unidad de flota del transportista asignada al aprobar.';
comment on column public.solicitudes_servicio.flota_unidad_resumen is 'Descripción legible (tipo, placas…) para el cliente.';

-- Asignaciones previas sin unidad: reabrir como pendiente
update public.solicitudes_servicio
set estado = 'pendiente'
where estado = 'asignado';

alter table public.solicitudes_servicio drop constraint if exists solicitudes_servicio_asignacion_check;
alter table public.solicitudes_servicio add constraint solicitudes_servicio_asignacion_check
  check (
    estado <> 'rechazada'
    or (
      transportista_user_id is null
      and transportista_contacto is null
      and flota_unidad_id is null
      and flota_unidad_resumen is null
    )
  );

create or replace function public.trg_solicitudes_asignacion_valida()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'asignado' then
    if new.transportista_user_id is null or new.flota_unidad_id is null then
      raise exception 'ASIGNADO_REQUIERE_TRANSPORTISTA_Y_UNIDAD' using errcode = '23514';
    end if;
    if not exists (
      select 1
      from public.flota_unidades f
      where f.id = new.flota_unidad_id
        and f.user_id = new.transportista_user_id
    ) then
      raise exception 'FLOTA_NO_DEL_TRANSPORTISTA' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_solicitudes_asignacion_valida on public.solicitudes_servicio;
create trigger trg_solicitudes_asignacion_valida
  before insert or update on public.solicitudes_servicio
  for each row execute procedure public.trg_solicitudes_asignacion_valida();
