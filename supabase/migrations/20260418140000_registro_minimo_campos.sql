-- Registro mínimo: ciudad opcional en clientes; transportistas con contacto y sin obligar unidad/placas al alta

alter table public.registro_clientes
  alter column ciudad_operacion drop not null;

alter table public.registro_transportistas
  add column if not exists contacto_nombre text;

update public.registro_transportistas
set contacto_nombre = coalesce(nullif(trim(contacto_nombre), ''), nombre_o_razon)
where contacto_nombre is null or trim(contacto_nombre) = '';

alter table public.registro_transportistas
  alter column contacto_nombre set not null;

alter table public.registro_transportistas
  alter column tipo_unidad drop not null;

alter table public.registro_transportistas
  alter column placas drop not null;
