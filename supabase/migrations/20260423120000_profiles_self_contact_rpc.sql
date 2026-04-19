-- Datos de contacto editables por el propio usuario (nombre / teléfono); el correo sigue en auth.

alter table public.profiles
  add column if not exists nombre_mostrado text,
  add column if not exists telefono_contacto text;

create or replace function public.actualizar_mi_perfil_contacto(
  p_nombre_mostrado text,
  p_telefono_contacto text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NO_AUTH';
  end if;

  update public.profiles
  set
    nombre_mostrado = nullif(trim(p_nombre_mostrado), ''),
    telefono_contacto = nullif(trim(p_telefono_contacto), '')
  where id = auth.uid();
end;
$$;

revoke all on function public.actualizar_mi_perfil_contacto(text, text) from public;
grant execute on function public.actualizar_mi_perfil_contacto(text, text) to authenticated;
