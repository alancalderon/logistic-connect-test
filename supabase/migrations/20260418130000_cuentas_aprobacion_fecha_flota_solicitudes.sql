-- Cuentas con aprobación admin, fecha deseada del servicio (clientes), flota y solicitudes post-login

-- Perfil: tipo de cuenta y estado (admins sin app_tipo quedan activa)
alter table public.profiles
  add column if not exists tipo_cuenta text,
  add column if not exists cuenta_estado text not null default 'activa';

alter table public.profiles drop constraint if exists profiles_tipo_cuenta_check;
alter table public.profiles add constraint profiles_tipo_cuenta_check
  check (tipo_cuenta is null or tipo_cuenta in ('cliente', 'transportista'));

alter table public.profiles drop constraint if exists profiles_cuenta_estado_check;
alter table public.profiles add constraint profiles_cuenta_estado_check
  check (cuenta_estado in ('pendiente_aprobacion', 'activa', 'rechazada'));

-- Registros enlazados a auth + aprobación
alter table public.registro_clientes
  add column if not exists user_id uuid references auth.users (id) on delete set null,
  add column if not exists fecha_servicio_deseado date,
  add column if not exists estado_aprobacion text;

update public.registro_clientes set estado_aprobacion = 'aprobado' where estado_aprobacion is null;
alter table public.registro_clientes alter column estado_aprobacion set default 'pendiente';
alter table public.registro_clientes alter column estado_aprobacion set not null;

alter table public.registro_clientes drop constraint if exists registro_clientes_estado_aprobacion_check;
alter table public.registro_clientes add constraint registro_clientes_estado_aprobacion_check
  check (estado_aprobacion in ('pendiente', 'aprobado', 'rechazado'));

alter table public.registro_transportistas
  add column if not exists user_id uuid references auth.users (id) on delete set null,
  add column if not exists estado_aprobacion text;

update public.registro_transportistas set estado_aprobacion = 'aprobado' where estado_aprobacion is null;
alter table public.registro_transportistas alter column estado_aprobacion set default 'pendiente';
alter table public.registro_transportistas alter column estado_aprobacion set not null;

alter table public.registro_transportistas drop constraint if exists registro_transportistas_estado_aprobacion_check;
alter table public.registro_transportistas add constraint registro_transportistas_estado_aprobacion_check
  check (estado_aprobacion in ('pendiente', 'aprobado', 'rechazado'));

-- Trigger: primer usuario = admin (20260418000000) + app_tipo cliente|transportista → pendiente de aprobación
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  first_user boolean;
  t text := trim(lower(coalesce(new.raw_user_meta_data->>'app_tipo', '')));
  tipo text := nullif(t, '');
  estado text;
  is_admin_val boolean;
begin
  select (count(*) = 0) into first_user from public.profiles;

  if tipo in ('cliente', 'transportista') then
    estado := 'pendiente_aprobacion';
  else
    estado := 'activa';
    tipo := null;
  end if;

  is_admin_val := coalesce(first_user, false);

  insert into public.profiles (id, email, is_admin, tipo_cuenta, cuenta_estado)
  values (new.id, new.email, is_admin_val, tipo, estado)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Sustituir políticas de insert público: solo usuario autenticado con su propio user_id
drop policy if exists "insert_registro_clientes_public" on public.registro_clientes;
drop policy if exists "insert_registro_transportistas_public" on public.registro_transportistas;

create policy "insert_registro_clientes_authenticated_own"
  on public.registro_clientes for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and estado_aprobacion = 'pendiente'
  );

create policy "insert_registro_transportistas_authenticated_own"
  on public.registro_transportistas for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and estado_aprobacion = 'pendiente'
  );

-- Ver propios registros (además de admin)
create policy "select_registro_clientes_own"
  on public.registro_clientes for select
  to authenticated
  using (auth.uid() = user_id);

create policy "select_registro_transportistas_own"
  on public.registro_transportistas for select
  to authenticated
  using (auth.uid() = user_id);

-- Admin puede actualizar transportistas (aprobación)
drop policy if exists "update_registro_transportistas_admin" on public.registro_transportistas;
create policy "update_registro_transportistas_admin"
  on public.registro_transportistas for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant update on table public.registro_transportistas to authenticated;

-- Admin actualiza perfiles (activar / rechazar cuenta)
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant update on table public.profiles to authenticated;

-- Solicitudes de servicio (clientes ya aprobados; la app guía el flujo)
create table if not exists public.solicitudes_servicio (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  titulo text not null,
  descripcion text,
  fecha_servicio date not null,
  origen text,
  destino text,
  estado text not null default 'pendiente'
);

alter table public.solicitudes_servicio drop constraint if exists solicitudes_servicio_estado_check;
alter table public.solicitudes_servicio add constraint solicitudes_servicio_estado_check
  check (estado in ('pendiente', 'asignado', 'cancelado'));

alter table public.solicitudes_servicio enable row level security;

create policy "solicitudes_select_own_or_admin"
  on public.solicitudes_servicio for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

create policy "solicitudes_insert_own"
  on public.solicitudes_servicio for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "solicitudes_update_own_or_admin"
  on public.solicitudes_servicio for update
  to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "solicitudes_delete_own_or_admin"
  on public.solicitudes_servicio for delete
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

grant select, insert, update, delete on table public.solicitudes_servicio to authenticated;

-- Flota adicional (transportistas)
create table if not exists public.flota_unidades (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo_unidad text not null,
  placas text not null,
  numero_economico text
);

alter table public.flota_unidades enable row level security;

create policy "flota_select_own_or_admin"
  on public.flota_unidades for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

create policy "flota_insert_own"
  on public.flota_unidades for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "flota_update_own_or_admin"
  on public.flota_unidades for update
  to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "flota_delete_own_or_admin"
  on public.flota_unidades for delete
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

grant select, insert, update, delete on table public.flota_unidades to authenticated;

-- Los formularios de alta quedan ligados a cuenta (JWT); anon ya no inserta
revoke insert on table public.registro_clientes from anon;
revoke insert on table public.registro_transportistas from anon;
