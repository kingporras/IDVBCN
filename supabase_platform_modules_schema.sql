begin;

create extension if not exists pgcrypto;

do $$
begin
  if to_regprocedure('public.is_admin_user()') is null then
    raise exception 'Falta public.is_admin_user(). Ejecuta primero el SQL de Acta/admin ya usado por la app.';
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.payment_settings (
  id uuid primary key default gen_random_uuid(),
  season text not null unique,
  total_amount numeric(10,2) not null default 25 check (total_amount >= 0),
  payment_mode text not null default 'single' check (payment_mode in ('single', 'split_2')),
  first_payment_amount numeric(10,2) not null default 25 check (first_payment_amount >= 0),
  second_payment_amount numeric(10,2) not null default 0 check (second_payment_amount >= 0),
  first_due_date date,
  second_due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_payments (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  season text not null,
  payment_settings_id uuid references public.payment_settings(id) on delete set null,
  first_paid boolean not null default false,
  second_paid boolean not null default false,
  paid_full boolean not null default false,
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, season)
);

create table if not exists public.inter_tv_assets (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in (
    'captain_message',
    'match_preview',
    'match_recap',
    'payment_reminder',
    'mvp',
    'player',
    'honours',
    'convocatoria'
  )),
  match_id uuid references public.matches(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  title text not null,
  script text not null,
  heygen_url text,
  auto_enabled boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_generated_content (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  source text not null default 'local_template' check (source in ('local_template', 'hugging_face')),
  match_id uuid references public.matches(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  prompt text,
  content text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.player_media (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  heygen_url text,
  avatar_style text,
  bio text,
  phrase text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id)
);

create table if not exists public.club_honours (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  competition text not null,
  season text not null,
  type text not null check (type in ('runner_up', 'champion_winter', 'champion_summer', 'bicampeon')),
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (type, season)
);

create index if not exists idx_player_payments_player on public.player_payments(player_id);
create index if not exists idx_player_payments_season on public.player_payments(season);
create index if not exists idx_inter_tv_assets_type on public.inter_tv_assets(type);
create index if not exists idx_inter_tv_assets_match on public.inter_tv_assets(match_id);
create index if not exists idx_inter_tv_assets_player on public.inter_tv_assets(player_id);
create index if not exists idx_ai_generated_content_type on public.ai_generated_content(type);
create index if not exists idx_player_media_player on public.player_media(player_id);

create or replace function public.sync_player_payment_paid_full()
returns trigger
language plpgsql
as $$
declare
  mode_value text := 'single';
begin
  select payment_mode
    into mode_value
    from public.payment_settings
   where id = new.payment_settings_id;

  if coalesce(new.notes, '') ilike '%[exento]%' then
    new.paid_full = false;
  elsif coalesce(mode_value, 'single') = 'split_2' then
    new.paid_full = coalesce(new.first_paid, false) and coalesce(new.second_paid, false);
  else
    new.paid_full = coalesce(new.first_paid, false);
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_payment_settings_updated_at on public.payment_settings;
create trigger set_payment_settings_updated_at
before update on public.payment_settings
for each row execute function public.set_updated_at();

drop trigger if exists sync_player_payment_paid_full on public.player_payments;
create trigger sync_player_payment_paid_full
before insert or update on public.player_payments
for each row execute function public.sync_player_payment_paid_full();

drop trigger if exists set_inter_tv_assets_updated_at on public.inter_tv_assets;
create trigger set_inter_tv_assets_updated_at
before update on public.inter_tv_assets
for each row execute function public.set_updated_at();

drop trigger if exists set_player_media_updated_at on public.player_media;
create trigger set_player_media_updated_at
before update on public.player_media
for each row execute function public.set_updated_at();

alter table public.payment_settings enable row level security;
alter table public.player_payments enable row level security;
alter table public.inter_tv_assets enable row level security;
alter table public.ai_generated_content enable row level security;
alter table public.player_media enable row level security;
alter table public.club_honours enable row level security;

drop policy if exists payment_settings_admin_all on public.payment_settings;
create policy payment_settings_admin_all
  on public.payment_settings
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists player_payments_admin_all on public.player_payments;
create policy player_payments_admin_all
  on public.player_payments
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists inter_tv_assets_read_authenticated on public.inter_tv_assets;
create policy inter_tv_assets_read_authenticated
  on public.inter_tv_assets
  for select
  to authenticated
  using (true);

drop policy if exists inter_tv_assets_admin_all on public.inter_tv_assets;
create policy inter_tv_assets_admin_all
  on public.inter_tv_assets
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists ai_generated_content_admin_all on public.ai_generated_content;
create policy ai_generated_content_admin_all
  on public.ai_generated_content
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists player_media_read_authenticated on public.player_media;
create policy player_media_read_authenticated
  on public.player_media
  for select
  to authenticated
  using (true);

drop policy if exists player_media_admin_all on public.player_media;
create policy player_media_admin_all
  on public.player_media
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists club_honours_read_authenticated on public.club_honours;
create policy club_honours_read_authenticated
  on public.club_honours
  for select
  to authenticated
  using (true);

drop policy if exists club_honours_admin_all on public.club_honours;
create policy club_honours_admin_all
  on public.club_honours
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

grant select, insert, update, delete on public.payment_settings to authenticated;
grant select, insert, update, delete on public.player_payments to authenticated;
grant select, insert, update, delete on public.inter_tv_assets to authenticated;
grant select, insert, update, delete on public.ai_generated_content to authenticated;
grant select, insert, update, delete on public.player_media to authenticated;
grant select, insert, update, delete on public.club_honours to authenticated;

insert into public.club_honours (title, competition, season, type, description, sort_order)
values
  ('Subcampeón', 'Liga de Fútbol 7 Canyelles', '2023-2024', 'runner_up', 'La temporada donde el Inter empezó a mirar de frente a la liga.', 10),
  ('Campeón de Invierno', 'Liga de Fútbol 7 Canyelles', '2024-2025', 'champion_winter', 'Primer golpe serio sobre la mesa: regularidad, bloque y resultados.', 20),
  ('Campeón de Verano', 'Liga de Fútbol 7 Canyelles', '2024-2025', 'champion_summer', 'Segundo título del curso para cerrar una temporada histórica.', 30),
  ('Bicampeón Canyelles', 'Insignia del club', '2024-2025', 'bicampeon', 'Invierno y verano en la misma temporada. De competir a dominar Canyelles.', 40)
on conflict (type, season) do update
set title = excluded.title,
    competition = excluded.competition,
    description = excluded.description,
    sort_order = excluded.sort_order;

commit;
