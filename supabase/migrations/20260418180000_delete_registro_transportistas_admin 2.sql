-- Admin puede eliminar filas de registro_transportistas (paridad con registro_clientes)

drop policy if exists "delete_registro_transportistas_admin" on public.registro_transportistas;

create policy "delete_registro_transportistas_admin"
  on public.registro_transportistas for delete
  to authenticated
  using (public.is_admin());

grant delete on table public.registro_transportistas to authenticated;
