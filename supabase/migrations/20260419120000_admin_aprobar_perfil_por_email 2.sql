-- Al aprobar, activar profiles aunque registro.user_id sea null: resolver uid por email en auth.users
-- y enlazar registro. Evita desfase UI "Cuenta activa" (estado_aprobacion) vs login (profiles.cuenta_estado).

create or replace function public.admin_aprobar_cliente(p_registro_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_email text;
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

  select c.user_id, lower(trim(coalesce(c.email, '')))
  into v_uid, v_email
  from public.registro_clientes c
  where c.id = p_registro_id;

  if v_uid is null and v_email <> '' then
    select au.id
    into v_uid
    from auth.users au
    where lower(trim(coalesce(au.email, ''))) = v_email
    limit 1;
  end if;

  if v_uid is not null then
    update public.registro_clientes
    set user_id = v_uid
    where id = p_registro_id
      and user_id is null;

    update public.profiles
    set cuenta_estado = 'activa', tipo_cuenta = 'cliente'
    where id = v_uid
      and coalesce(is_admin, false) = false;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_aprobar_transportista(p_registro_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_email text;
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

  select t.user_id, lower(trim(coalesce(t.email, '')))
  into v_uid, v_email
  from public.registro_transportistas t
  where t.id = p_registro_id;

  if v_uid is null and v_email <> '' then
    select au.id
    into v_uid
    from auth.users au
    where lower(trim(coalesce(au.email, ''))) = v_email
    limit 1;
  end if;

  if v_uid is not null then
    update public.registro_transportistas
    set user_id = v_uid
    where id = p_registro_id
      and user_id is null;

    update public.profiles
    set cuenta_estado = 'activa', tipo_cuenta = 'transportista'
    where id = v_uid
      and coalesce(is_admin, false) = false;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- Datos ya inconsistentes: enlazar y activar perfiles
update public.registro_clientes c
set user_id = u.id
from auth.users u
where c.user_id is null
  and c.estado_aprobacion = 'aprobado'
  and lower(trim(coalesce(u.email, ''))) = lower(trim(coalesce(c.email, '')));

update public.registro_transportistas t
set user_id = u.id
from auth.users u
where t.user_id is null
  and t.estado_aprobacion = 'aprobado'
  and lower(trim(coalesce(u.email, ''))) = lower(trim(coalesce(t.email, '')));

update public.profiles p
set cuenta_estado = 'activa', tipo_cuenta = 'cliente'
from public.registro_clientes c
where p.id = c.user_id
  and c.estado_aprobacion = 'aprobado'
  and coalesce(p.is_admin, false) = false;

update public.profiles p
set cuenta_estado = 'activa', tipo_cuenta = 'transportista'
from public.registro_transportistas t
where p.id = t.user_id
  and t.estado_aprobacion = 'aprobado'
  and coalesce(p.is_admin, false) = false;
