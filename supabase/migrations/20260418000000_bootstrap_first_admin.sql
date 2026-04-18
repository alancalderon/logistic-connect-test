-- El primer usuario en Auth recibe is_admin = true (arranque sin SQL manual).
-- Usuarios posteriores quedan con is_admin = false (promoverlos con SQL o política futura).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  first_user boolean;
begin
  select (count(*) = 0) into first_user from public.profiles;

  insert into public.profiles (id, email, is_admin)
  values (new.id, new.email, coalesce(first_user, false))
  on conflict (id) do nothing;

  return new;
end;
$$;
