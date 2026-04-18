-- Registro manual (sin Supabase Auth en el formulario público): contraseña con bcrypt (pgcrypto), alta solo vía RPC.
-- La creación del usuario en Auth al aprobar la hace la Edge Function approve-registration (invite).

create extension if not exists pgcrypto;

alter table public.registro_clientes
  add column if not exists password_hash text;

alter table public.registro_transportistas
  add column if not exists password_hash text;

comment on column public.registro_clientes.password_hash is 'bcrypt via crypt(); no es recuperable; solo verificación interna / expediente.';
comment on column public.registro_transportistas.password_hash is 'bcrypt via crypt(); no es recuperable; solo verificación interna / expediente.';

-- Ya no insertamos registros con JWT de usuario anónimo en el alta pública
drop policy if exists "insert_registro_clientes_authenticated_own" on public.registro_clientes;
drop policy if exists "insert_registro_transportistas_authenticated_own" on public.registro_transportistas;

revoke insert on table public.registro_clientes from authenticated;
revoke insert on table public.registro_transportistas from authenticated;

create or replace function public.registrar_cliente_manual(
  p_email text,
  p_password text,
  p_razon_social text,
  p_contacto_nombre text,
  p_contacto_cargo text,
  p_telefono text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_hash text;
  v_id uuid;
begin
  if v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'EMAIL_REQUERIDO');
  end if;
  if p_password is null or length(p_password) < 8 then
    return jsonb_build_object('ok', false, 'error', 'PASSWORD_DEBIL');
  end if;

  if exists (select 1 from auth.users au where lower(coalesce(au.email, '')) = v_email) then
    return jsonb_build_object('ok', false, 'error', 'EMAIL_YA_REGISTRADO');
  end if;

  if exists (
    select 1
    from public.registro_clientes c
    where lower(trim(c.email)) = v_email
      and c.estado_aprobacion = 'pendiente'
  ) or exists (
    select 1
    from public.registro_transportistas t
    where lower(trim(t.email)) = v_email
      and t.estado_aprobacion = 'pendiente'
  ) then
    return jsonb_build_object('ok', false, 'error', 'SOLICITUD_PENDIENTE');
  end if;

  v_hash := crypt(p_password, gen_salt('bf'::text));

  insert into public.registro_clientes (
    razon_social,
    contacto_nombre,
    contacto_cargo,
    email,
    telefono,
    ciudad_operacion,
    tipo_mercancia,
    frecuencia,
    rutas,
    comentarios,
    user_id,
    fecha_servicio_deseado,
    estado_aprobacion,
    password_hash
  )
  values (
    trim(p_razon_social),
    trim(p_contacto_nombre),
    nullif(trim(coalesce(p_contacto_cargo, '')), ''),
    v_email,
    trim(p_telefono),
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    'pendiente',
    v_hash
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', 'DB_ERROR', 'detail', sqlerrm);
end;
$$;

create or replace function public.registrar_transportista_manual(
  p_email text,
  p_password text,
  p_nombre_o_razon text,
  p_contacto_nombre text,
  p_telefono text,
  p_rfc text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_rfc text := upper(trim(coalesce(p_rfc, '')));
  v_hash text;
  v_id uuid;
begin
  if v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'EMAIL_REQUERIDO');
  end if;
  if p_password is null or length(p_password) < 8 then
    return jsonb_build_object('ok', false, 'error', 'PASSWORD_DEBIL');
  end if;
  if length(v_rfc) < 10 then
    return jsonb_build_object('ok', false, 'error', 'RFC_INVALIDO');
  end if;

  if exists (select 1 from auth.users au where lower(coalesce(au.email, '')) = v_email) then
    return jsonb_build_object('ok', false, 'error', 'EMAIL_YA_REGISTRADO');
  end if;

  if exists (
    select 1
    from public.registro_clientes c
    where lower(trim(c.email)) = v_email
      and c.estado_aprobacion = 'pendiente'
  ) or exists (
    select 1
    from public.registro_transportistas t
    where lower(trim(t.email)) = v_email
      and t.estado_aprobacion = 'pendiente'
  ) then
    return jsonb_build_object('ok', false, 'error', 'SOLICITUD_PENDIENTE');
  end if;

  v_hash := crypt(p_password, gen_salt('bf'::text));

  insert into public.registro_transportistas (
    nombre_o_razon,
    contacto_nombre,
    email,
    telefono,
    rfc,
    tipo_unidad,
    placas,
    numero_economico,
    cobertura,
    experiencia_anos,
    seguro_vigente,
    comentarios,
    user_id,
    estado_aprobacion,
    password_hash
  )
  values (
    trim(p_nombre_o_razon),
    trim(p_contacto_nombre),
    v_email,
    trim(p_telefono),
    v_rfc,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    'pendiente',
    v_hash
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', 'DB_ERROR', 'detail', sqlerrm);
end;
$$;

revoke all on function public.registrar_cliente_manual(text, text, text, text, text, text) from public;
grant execute on function public.registrar_cliente_manual(text, text, text, text, text, text) to anon, authenticated;

revoke all on function public.registrar_transportista_manual(text, text, text, text, text, text) from public;
grant execute on function public.registrar_transportista_manual(text, text, text, text, text, text) to anon, authenticated;
