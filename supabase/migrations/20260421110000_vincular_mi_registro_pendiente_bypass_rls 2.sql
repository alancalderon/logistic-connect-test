-- Los UPDATE dentro de vincular_mi_registro_pendiente fallaban por RLS (solo admin podía actualizar registro_*).
-- Desactivamos RLS solo durante la función y permitimos enlazar también expedientes ya aprobados sin user_id.

create or replace function public.vincular_mi_registro_pendiente()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  n int;
begin
  set local row_security = off;

  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'NO_AUTH');
  end if;

  select lower(trim(coalesce(email, ''))) into v_email from auth.users where id = v_uid;
  if v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'EMAIL_VACIO');
  end if;

  if exists (
    select 1 from public.registro_clientes c
    where lower(trim(c.email)) = v_email and c.user_id = v_uid
  ) then
    return jsonb_build_object('ok', true, 'tipo', 'cliente');
  end if;

  if exists (
    select 1 from public.registro_transportistas t
    where lower(trim(t.email)) = v_email and t.user_id = v_uid
  ) then
    return jsonb_build_object('ok', true, 'tipo', 'transportista');
  end if;

  update public.registro_clientes
  set user_id = v_uid
  where lower(trim(email)) = v_email
    and estado_aprobacion in ('pendiente', 'aprobado')
    and user_id is null;

  get diagnostics n = row_count;
  if n > 0 then
    return jsonb_build_object('ok', true, 'tipo', 'cliente');
  end if;

  update public.registro_transportistas
  set user_id = v_uid
  where lower(trim(email)) = v_email
    and estado_aprobacion in ('pendiente', 'aprobado')
    and user_id is null;

  get diagnostics n = row_count;
  if n > 0 then
    return jsonb_build_object('ok', true, 'tipo', 'transportista');
  end if;

  if exists (
    select 1 from public.registro_clientes c
    where lower(trim(c.email)) = v_email
      and c.estado_aprobacion in ('pendiente', 'aprobado')
      and c.user_id is null
  ) or exists (
    select 1 from public.registro_transportistas t
    where lower(trim(t.email)) = v_email
      and t.estado_aprobacion in ('pendiente', 'aprobado')
      and t.user_id is null
  ) then
    return jsonb_build_object('ok', false, 'error', 'SIN_REGISTRO_VINCULABLE');
  end if;

  return jsonb_build_object('ok', true, 'tipo', null);
end;
$$;

revoke all on function public.vincular_mi_registro_pendiente() from public;
grant execute on function public.vincular_mi_registro_pendiente() to authenticated;
