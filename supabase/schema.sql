-- Tabla única: cada registro de la app (movimiento, deuda, presupuesto, meta, gasto fijo).
create table if not exists public.items (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  k text not null check (k in ('mov','deu','bud','meta','fij','ven')),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.items enable row level security;

create policy "items_select_own" on public.items for select to authenticated using ((select auth.uid()) = user_id);
create policy "items_insert_own" on public.items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "items_update_own" on public.items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "items_delete_own" on public.items for delete to authenticated using ((select auth.uid()) = user_id);

-- Suscripciones push por dispositivo.
create table if not exists public.push_subs (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
create policy "push_select_own" on public.push_subs for select to authenticated using ((select auth.uid()) = user_id);
create policy "push_insert_own" on public.push_subs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "push_update_own" on public.push_subs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "push_delete_own" on public.push_subs for delete to authenticated using ((select auth.uid()) = user_id);

-- Secretos en Vault: vapid_public, vapid_private, cron_secret (cargar con vault.create_secret).
create or replace function public.get_push_secrets()
returns jsonb language sql security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(name, decrypted_secret), '{}'::jsonb)
  from vault.decrypted_secrets where name in ('vapid_public','vapid_private','cron_secret');
$$;
revoke all on function public.get_push_secrets() from public, anon, authenticated;
grant execute on function public.get_push_secrets() to service_role;

-- Recordatorio diario 9:00 (Argentina) = 12:00 UTC.
create extension if not exists pg_net;
create extension if not exists pg_cron;
-- select cron.schedule('recordatorios-diarios', '0 12 * * *', $$
--   select net.http_post(url := 'https://<ref>.supabase.co/functions/v1/recordatorios',
--     headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',
--       (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
--     body := '{}'::jsonb) $$);

-- Carga automática desde notificaciones (función "ingesta", llamada por MacroDroid).
create table if not exists public.ingest_tokens (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  created_at timestamptz not null default now()
);
alter table public.ingest_tokens enable row level security;
create policy "tok_select_own" on public.ingest_tokens for select to authenticated using ((select auth.uid()) = user_id);
create policy "tok_insert_own" on public.ingest_tokens for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "tok_delete_own" on public.ingest_tokens for delete to authenticated using ((select auth.uid()) = user_id);
create table if not exists public.ingest_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  at timestamptz not null default now(),
  app text, texto text, resultado text, item_id text
);
create index if not exists ingest_log_user_at on public.ingest_log (user_id, at desc);
alter table public.ingest_log enable row level security;
create policy "log_select_own" on public.ingest_log for select to authenticated using ((select auth.uid()) = user_id);
