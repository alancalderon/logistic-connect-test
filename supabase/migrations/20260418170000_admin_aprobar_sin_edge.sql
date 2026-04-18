-- Aprobación / activación sin Edge Functions ni invite de Supabase Auth.
-- Admin aprueba solo en BD. El usuario crea su sesión Auth en /activar-cuenta (signUp) y vincula con vincular_registro_post_signup().

-- Aprobar cliente (solo admin)
create or replace function public.admin_aprobar_cliente(p_registro_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  n int;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'NO_ADMIN');
  end if;

  update public.registro_clientes
  set estado_aprobacion = 'aprobado'
  where id = p_registro_id
    and estado_aprobacion = 'pendiente';

  get diagnostics n = row_count;
  if n = 0 then
    return jsonb_build_object('ok', false, 'error', 'NO_ACTUALIZADO');
  end if;

  select c.user_id into v_uid from public.registro_clientes c where c.id = p_registro_id;
  if v_uid is not null then
    update public.profiles
    set cuenta_estado = 'activa', tipo_cuenta = 'cliente'
    where id = v_uid;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- Aprobar transportista (solo admin)
create or replace function public.admin_aprobar_transportista(p_registro_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  n int;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'NO_ADMIN');
  end if;

  update public.registro_transportistas
  set estado_aprobacion = 'aprobado'
  where id = p_registro_id
    and estado_aprobacion = 'pendiente';

  get diagnostics n = row_count;
  if n = 0 then
    return jsonb_build_object('ok', false, 'error', 'NO_ACTUALIZADO');
  end if;

  select t.user_id into v_uid from public.registro_transportistas t where t.id = p_registro_id;
  if v_uid is not null then
    update public.profiles
    set cuenta_estado = 'activa', tipo_cuenta = 'transportista'
    where id = v_uid;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- Anon: saber si un correo puede activar cuenta (aprobado y sin user_id, sin fila en auth.users)
create or replace function public.tipo_cuenta_pendiente_activacion(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'EMAIL_REQUERIDO');
  end if;

  if exists (select 1 from auth.users au where lower(coalesce(au.email, '')) = v_email) then
    return jsonb_build_object('ok', false, 'error', 'YA_EXISTE_CUENTA_AUTH');
  end if;

  if exists (
    select 1
    from public.registro_clientes c
    where lower(trim(c.email)) = v_email
      and c.estado_aprobacion = 'aprobado'
      and c.user_id is null
  ) then
    return jsonb_build_object('ok', true, 'tipo', 'cliente');
  end if;

  if exists (
    select 1
    from public.registro_transportistas t
    where lower(trim(t.email)) = v_email
      and t.estado_aprobacion = 'aprobado'
      and t.user_id is null
  ) then
    return jsonb_build_object('ok', true, 'tipo', 'transportista');
  end if;

  return jsonb_build_object('ok', false, 'error', 'NO_DISPONIBLE');
end;
$$;

-- Tras signUp: enlazar registro aprobado al nuevo auth user y activar perfil
create or replace function public.vincular_registro_post_signup()
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

  select lower(coalesce(email, '')) into v_email from auth.users where id = v_uid;
  if v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'EMAIL_VACIO');
  end if;

  update public.registro_clientes
  set user_id = v_uid
  where lower(trim(email)) = v_email
    and estado_aprobacion = 'aprobado'
    and user_id is null;

  get diagnostics n = row_count;
  if n > 0 then
    update public.profiles
    set cuenta_estado = 'activa', tipo_cuenta = 'cliente'
    where id = v_uid;
    return jsonb_build_object('ok', true, 'tipo', 'cliente');
  end if;

  update public.registro_transportistas
  set user_id = v_uid
  where lower(trim(email)) = v_email
    and estado_aprobacion = 'aprobado'
    and user_id is null;

  get diagnostics n = row_count;
  if n > 0 then
    update public.profiles
    set cuenta_estado = 'activa', tipo_cuenta = 'transportista'
    where id = v_uid;
    return jsonb_build_object('ok', true, 'tipo', 'transportista');
  end if;

  return jsonb_build_object('ok', false, 'error', 'SIN_REGISTRO_VINCULABLE');
end;
$$;

revoke all on function public.admin_aprobar_cliente(uuid) from public;
grant execute on function public.admin_aprobar_cliente(uuid) to authenticated;

revoke all on function public.admin_aprobar_transportista(uuid) from public;
grant execute on function public.admin_aprobar_transportista(uuid) to authenticated;

revoke all on function public.tipo_cuenta_pendiente_activacion(text) from public;
grant execute on function public.tipo_cuenta_pendiente_activacion(text) to anon, authenticated;

revoke all on function public.vincular_registro_post_signup() from public;
grant execute on function public.vincular_registro_post_signup() to authenticated;
