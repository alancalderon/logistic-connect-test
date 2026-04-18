-- TransLogix: perfiles, registros públicos y RLS
-- Ejecutar en Supabase SQL Editor o con: supabase db push (CLI)

-- Perfil ligado a auth.users (is_admin para panel)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Lectura de is_admin sin pasar por RLS (evita recursión en políticas sobre profiles)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

-- Registros desde formularios públicos (rol anon)
create table if not exists public.registro_clientes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  razon_social text not null,
  contacto_nombre text not null,
  contacto_cargo text,
  email text not null,
  telefono text not null,
  ciudad_operacion text not null,
  tipo_mercancia text,
  frecuencia text,
  rutas text,
  comentarios text
);

create table if not exists public.registro_transportistas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre_o_razon text not null,
  email text not null,
  telefono text not null,
  rfc text,
  tipo_unidad text not null,
  placas text not null,
  numero_economico text,
  cobertura text,
  experiencia_anos text,
  seguro_vigente text,
  comentarios text
);

alter table public.registro_clientes enable row level security;
alter table public.registro_transportistas enable row level security;

alter table public.registro_clientes
  add column estado_servicio text not null default 'pendiente',
  add column transportista_asignado_id uuid references public.registro_transportistas (id) on delete set null;

alter table public.registro_clientes add constraint registro_clientes_estado_servicio_check
  check (estado_servicio in ('pendiente', 'completado', 'no_realizado'));

alter table public.registro_clientes add constraint registro_clientes_completado_con_transportista
  check (estado_servicio <> 'completado' OR transportista_asignado_id is not null);

-- anon: visitante sin sesión; authenticated: misma anon key pero con JWT de usuario logueado
create policy "insert_registro_clientes_public"
  on public.registro_clientes for insert
  to anon, authenticated
  with check (true);

create policy "insert_registro_transportistas_public"
  on public.registro_transportistas for insert
  to anon, authenticated
  with check (true);

create policy "select_registro_clientes_admin"
  on public.registro_clientes for select
  to authenticated
  using (public.is_admin());

create policy "select_registro_transportistas_admin"
  on public.registro_transportistas for select
  to authenticated
  using (public.is_admin());

create policy "update_registro_clientes_admin"
  on public.registro_clientes for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "delete_registro_clientes_admin"
  on public.registro_clientes for delete
  to authenticated
  using (public.is_admin());

-- Fila de perfil al crear usuario (Auth)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (new.id, new.email, false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

grant usage on schema public to anon, authenticated;
grant insert on table public.registro_clientes to anon, authenticated;
grant insert on table public.registro_transportistas to anon, authenticated;
grant select on table public.registro_clientes to authenticated;
grant select on table public.registro_transportistas to authenticated;
grant update, delete on table public.registro_clientes to authenticated;
grant select on table public.profiles to authenticated;

-- El primer usuario admin: aplica también la migración
-- 20260418000000_bootstrap_first_admin.sql (primer registro en profiles → is_admin true),
-- o promueve manualmente: update public.profiles set is_admin = true where email = '...';
