-- Estado del pedido/servicio en solicitudes de cliente + transportista asignado (admin edita)

alter table public.registro_clientes
  add column if not exists estado_servicio text not null default 'pendiente',
  add column if not exists transportista_asignado_id uuid references public.registro_transportistas (id) on delete set null;

alter table public.registro_clientes drop constraint if exists registro_clientes_estado_servicio_check;
alter table public.registro_clientes add constraint registro_clientes_estado_servicio_check
  check (estado_servicio in ('pendiente', 'completado', 'no_realizado'));

alter table public.registro_clientes drop constraint if exists registro_clientes_completado_con_transportista;
alter table public.registro_clientes add constraint registro_clientes_completado_con_transportista
  check (estado_servicio <> 'completado' OR transportista_asignado_id is not null);

drop policy if exists "update_registro_clientes_admin" on public.registro_clientes;
create policy "update_registro_clientes_admin"
  on public.registro_clientes for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "delete_registro_clientes_admin" on public.registro_clientes;
create policy "delete_registro_clientes_admin"
  on public.registro_clientes for delete
  to authenticated
  using (public.is_admin());

grant update, delete on table public.registro_clientes to authenticated;
