-- Peso y dimensiones declarados por el cliente en solicitudes de servicio
alter table public.solicitudes_servicio
  add column if not exists peso_carga text,
  add column if not exists dimensiones_carga text;

comment on column public.solicitudes_servicio.peso_carga is 'Peso aproximado o rango declarado por el cliente (texto libre).';
comment on column public.solicitudes_servicio.dimensiones_carga is 'Dimensiones o volumen declarado por el cliente (texto libre).';
