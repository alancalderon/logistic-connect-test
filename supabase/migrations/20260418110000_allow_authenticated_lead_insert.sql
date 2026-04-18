-- El formulario público usa la anon key; si el navegador tiene sesión de admin,
-- el rol pasa a ser "authenticated" y la política "solo anon" bloqueaba el INSERT.

drop policy if exists "insert_registro_clientes_anon" on public.registro_clientes;
drop policy if exists "insert_registro_clientes_public" on public.registro_clientes;
drop policy if exists "insert_registro_transportistas_anon" on public.registro_transportistas;
drop policy if exists "insert_registro_transportistas_public" on public.registro_transportistas;

create policy "insert_registro_clientes_public"
  on public.registro_clientes for insert
  to anon, authenticated
  with check (true);

create policy "insert_registro_transportistas_public"
  on public.registro_transportistas for insert
  to anon, authenticated
  with check (true);

grant insert on table public.registro_clientes to authenticated;
grant insert on table public.registro_transportistas to authenticated;
