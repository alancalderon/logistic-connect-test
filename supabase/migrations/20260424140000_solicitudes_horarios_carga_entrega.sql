-- Hora de carga (instante) y ventana de entrega (inicio/fin).

alter table public.solicitudes_servicio
  add column if not exists carga_programada timestamptz,
  add column if not exists entrega_ventana_inicio timestamptz,
  add column if not exists entrega_ventana_fin timestamptz;

comment on column public.solicitudes_servicio.carga_programada is 'Instante previsto de carga (fecha del servicio + hora indicada por el cliente).';
comment on column public.solicitudes_servicio.entrega_ventana_inicio is 'Inicio de la ventana de entrega.';
comment on column public.solicitudes_servicio.entrega_ventana_fin is 'Fin de la ventana de entrega.';

alter table public.solicitudes_servicio drop constraint if exists solicitudes_entrega_ventana_valida;
alter table public.solicitudes_servicio add constraint solicitudes_entrega_ventana_valida
  check (
    (entrega_ventana_inicio is null and entrega_ventana_fin is null)
    or (
      entrega_ventana_inicio is not null
      and entrega_ventana_fin is not null
      and entrega_ventana_inicio <= entrega_ventana_fin
    )
  );
