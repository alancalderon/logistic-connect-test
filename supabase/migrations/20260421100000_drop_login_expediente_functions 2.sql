-- Retorno a login vía Supabase Auth (signInWithPassword). Elimina RPC del flujo Edge login-expediente si existían.

drop function if exists public.verificar_acceso_expediente(text, text);
drop function if exists public.auth_uid_por_email_servicio(text);
