-- Evita "infinite recursion detected in policy for relation 'profiles'":
-- las políticas no deben hacer SELECT sobre profiles con RLS activo.
-- Esta función corre como definer y lee is_admin sin aplicar RLS.

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

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "select_registro_clientes_admin" on public.registro_clientes;
create policy "select_registro_clientes_admin"
  on public.registro_clientes for select
  to authenticated
  using (public.is_admin());

drop policy if exists "select_registro_transportistas_admin" on public.registro_transportistas;
create policy "select_registro_transportistas_admin"
  on public.registro_transportistas for select
  to authenticated
  using (public.is_admin());
