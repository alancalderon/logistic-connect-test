-- Tras registrar con RPC + signUp en el cliente, enlaza expediente pendiente al auth.uid() actual (mismo correo).
-- Sustituye el flujo /activar-cuenta + tipo_cuenta_pendiente_activacion para nuevos registros.

create or replace function public.vincular_mi_registro_pendiente()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  n int;
begin
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
    and estado_aprobacion = 'pendiente'
    and user_id is null;

  get diagnostics n = row_count;
  if n > 0 then
    return jsonb_build_object('ok', true, 'tipo', 'cliente');
  end if;

  update public.registro_transportistas
  set user_id = v_uid
  where lower(trim(email)) = v_email
    and estado_aprobacion = 'pendiente'
    and user_id is null;

  get diagnostics n = row_count;
  if n > 0 then
    return jsonb_build_object('ok', true, 'tipo', 'transportista');
  end if;

  if exists (
    select 1 from public.registro_clientes c
    where lower(trim(c.email)) = v_email
      and c.estado_aprobacion = 'pendiente'
      and c.user_id is null
  ) or exists (
    select 1 from public.registro_transportistas t
    where lower(trim(t.email)) = v_email
      and t.estado_aprobacion = 'pendiente'
      and t.user_id is null
  ) then
    return jsonb_build_object('ok', false, 'error', 'SIN_REGISTRO_VINCULABLE');
  end if;

  return jsonb_build_object('ok', true, 'tipo', null);
end;
$$;

revoke all on function public.vincular_mi_registro_pendiente() from public;
grant execute on function public.vincular_mi_registro_pendiente() to authenticated;

drop function if exists public.tipo_cuenta_pendiente_activacion(text);
