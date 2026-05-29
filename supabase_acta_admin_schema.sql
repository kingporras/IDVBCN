begin;

alter table public.matches
  add column if not exists acta_status text not null default 'none',
  add column if not exists acta_published_at timestamptz,
  add column if not exists apuntamelo_match_id integer;

alter table public.players
  add column if not exists avatar_url text,
  add column if not exists avatar_style text not null default 'shirt';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'matches_acta_status_check'
      and conrelid = 'public.matches'::regclass
  ) then
    alter table public.matches
      add constraint matches_acta_status_check
      check (acta_status in ('none', 'draft', 'published'));
  end if;
end $$;

create table if not exists public.match_reports (
  match_id uuid primary key references public.matches(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'published')),
  result_home integer check (result_home is null or result_home >= 0),
  result_away integer check (result_away is null or result_away >= 0),
  notes text,
  source text not null default 'acta_admin',
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  event_type text not null check (event_type in ('goal', 'yellow_card', 'red_card')),
  team text not null default 'inter' check (team in ('inter', 'opponent')),
  player_id uuid references public.players(id),
  assist_player_id uuid references public.players(id),
  minute integer check (minute is null or (minute >= 0 and minute <= 120)),
  sequence integer not null default 0,
  own_goal boolean not null default false,
  source text not null default 'acta_admin',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_events_no_self_assist
    check (assist_player_id is null or player_id is null or assist_player_id <> player_id)
);

create index if not exists match_events_match_id_idx on public.match_events(match_id);
create index if not exists match_events_player_id_idx on public.match_events(player_id);
create index if not exists match_events_assist_player_id_idx on public.match_events(assist_player_id);
create index if not exists match_reports_status_idx on public.match_reports(status);

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and lower(coalesce(role, '')) = 'admin'
  );
$$;

create or replace function public.save_match_acta(
  p_match_id uuid,
  p_result_home integer,
  p_result_away integer,
  p_events jsonb default '[]'::jsonb,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null or not public.is_admin_user() then
    raise exception 'Solo admin puede guardar actas' using errcode = '42501';
  end if;

  if p_result_home is null or p_result_away is null or p_result_home < 0 or p_result_away < 0 then
    raise exception 'Resultado invalido';
  end if;

  if coalesce(jsonb_typeof(p_events), 'null') <> 'array' then
    raise exception 'p_events debe ser un array JSON';
  end if;

  if not exists (select 1 from public.matches where id = p_match_id) then
    raise exception 'Partido no encontrado';
  end if;

  drop table if exists pg_temp._acta_events;
  drop table if exists pg_temp._acta_old_delta;
  drop table if exists pg_temp._acta_new_delta;

  create temp table _acta_events (
    event_type text,
    team text,
    player_id uuid,
    assist_player_id uuid,
    minute integer,
    sequence integer,
    own_goal boolean
  ) on commit drop;

  insert into _acta_events (event_type, team, player_id, assist_player_id, minute, sequence, own_goal)
  select
    event_type,
    coalesce(nullif(team, ''), 'inter'),
    player_id,
    assist_player_id,
    minute,
    coalesce(sequence, 0),
    coalesce(own_goal, false)
  from jsonb_to_recordset(p_events) as e(
    event_type text,
    team text,
    player_id uuid,
    assist_player_id uuid,
    minute integer,
    sequence integer,
    own_goal boolean
  );

  if exists (
    select 1
    from _acta_events
    where event_type not in ('goal', 'yellow_card', 'red_card')
       or team not in ('inter', 'opponent')
  ) then
    raise exception 'El acta contiene eventos invalidos';
  end if;

  create temp table _acta_old_delta (
    player_id uuid primary key,
    goals integer not null default 0,
    assists integer not null default 0,
    yc integer not null default 0,
    rc integer not null default 0
  ) on commit drop;

  create temp table _acta_new_delta (
    player_id uuid primary key,
    goals integer not null default 0,
    assists integer not null default 0,
    yc integer not null default 0,
    rc integer not null default 0
  ) on commit drop;

  insert into _acta_old_delta (player_id, goals, assists, yc, rc)
  select player_id, sum(goals)::integer, sum(assists)::integer, sum(yc)::integer, sum(rc)::integer
  from (
    select player_id, 1 goals, 0 assists, 0 yc, 0 rc
    from public.match_events
    where match_id = p_match_id and event_type = 'goal' and team = 'inter'
      and player_id is not null and coalesce(own_goal, false) = false
    union all
    select assist_player_id, 0, 1, 0, 0
    from public.match_events
    where match_id = p_match_id and event_type = 'goal' and team = 'inter'
      and assist_player_id is not null
    union all
    select player_id, 0, 0, 1, 0
    from public.match_events
    where match_id = p_match_id and event_type = 'yellow_card' and team = 'inter'
      and player_id is not null
    union all
    select player_id, 0, 0, 0, 1
    from public.match_events
    where match_id = p_match_id and event_type = 'red_card' and team = 'inter'
      and player_id is not null
  ) d
  group by player_id;

  insert into _acta_new_delta (player_id, goals, assists, yc, rc)
  select player_id, sum(goals)::integer, sum(assists)::integer, sum(yc)::integer, sum(rc)::integer
  from (
    select player_id, 1 goals, 0 assists, 0 yc, 0 rc
    from _acta_events
    where event_type = 'goal' and team = 'inter'
      and player_id is not null and coalesce(own_goal, false) = false
    union all
    select assist_player_id, 0, 1, 0, 0
    from _acta_events
    where event_type = 'goal' and team = 'inter'
      and assist_player_id is not null
    union all
    select player_id, 0, 0, 1, 0
    from _acta_events
    where event_type = 'yellow_card' and team = 'inter'
      and player_id is not null
    union all
    select player_id, 0, 0, 0, 1
    from _acta_events
    where event_type = 'red_card' and team = 'inter'
      and player_id is not null
  ) d
  group by player_id;

  with diff as (
    select
      coalesce(n.player_id, o.player_id) as player_id,
      coalesce(n.goals, 0) - coalesce(o.goals, 0) as goals,
      coalesce(n.assists, 0) - coalesce(o.assists, 0) as assists,
      coalesce(n.yc, 0) - coalesce(o.yc, 0) as yc,
      coalesce(n.rc, 0) - coalesce(o.rc, 0) as rc
    from _acta_new_delta n
    full join _acta_old_delta o using (player_id)
  )
  update public.players p
  set
    goals = greatest(0, coalesce(p.goals, 0) + diff.goals),
    assists = greatest(0, coalesce(p.assists, 0) + diff.assists),
    yc = greatest(0, coalesce(p.yc, 0) + diff.yc),
    rc = greatest(0, coalesce(p.rc, 0) + diff.rc)
  from diff
  where p.id = diff.player_id
    and (diff.goals <> 0 or diff.assists <> 0 or diff.yc <> 0 or diff.rc <> 0);

  delete from public.match_events where match_id = p_match_id;

  insert into public.match_events (
    match_id,
    event_type,
    team,
    player_id,
    assist_player_id,
    minute,
    sequence,
    own_goal,
    source,
    created_by
  )
  select
    p_match_id,
    event_type,
    team,
    player_id,
    assist_player_id,
    minute,
    coalesce(sequence, (row_number() over (order by sequence nulls last))::integer),
    coalesce(own_goal, false),
    'acta_admin',
    v_user
  from _acta_events
  order by sequence nulls last;

  insert into public.match_reports (
    match_id,
    status,
    result_home,
    result_away,
    notes,
    source,
    created_by,
    updated_by,
    published_at
  )
  values (
    p_match_id,
    'published',
    p_result_home,
    p_result_away,
    p_notes,
    'acta_admin',
    v_user,
    v_user,
    now()
  )
  on conflict (match_id) do update
  set
    status = excluded.status,
    result_home = excluded.result_home,
    result_away = excluded.result_away,
    notes = excluded.notes,
    source = excluded.source,
    updated_by = excluded.updated_by,
    updated_at = now(),
    published_at = now();

  update public.matches
  set
    result_home = p_result_home,
    result_away = p_result_away,
    acta_status = 'published',
    acta_published_at = now()
  where id = p_match_id;
end;
$$;

alter table public.match_reports enable row level security;
alter table public.match_events enable row level security;

drop policy if exists match_reports_select_authenticated on public.match_reports;
create policy match_reports_select_authenticated
  on public.match_reports
  for select
  to authenticated
  using (true);

drop policy if exists match_reports_admin_all on public.match_reports;
create policy match_reports_admin_all
  on public.match_reports
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists match_events_select_authenticated on public.match_events;
create policy match_events_select_authenticated
  on public.match_events
  for select
  to authenticated
  using (true);

drop policy if exists match_events_admin_all on public.match_events;
create policy match_events_admin_all
  on public.match_events
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

grant select on public.match_reports to authenticated;
grant select on public.match_events to authenticated;
grant insert, update, delete on public.match_reports to authenticated;
grant insert, update, delete on public.match_events to authenticated;
grant execute on function public.is_admin_user() to authenticated;
grant execute on function public.save_match_acta(uuid, integer, integer, jsonb, text) to authenticated;

commit;
