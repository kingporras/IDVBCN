-- Update final scores + Inter scorers (aggregate goals) for:
-- 1) Changos Camperos 7-8 Inter
-- 2) Inter 4-11 Paella
-- 3) Hulk City 0-0
--
-- App notes from code:
-- - Finalized/pending state depends on matches.result_home/result_away being NOT NULL.
-- - Inter scorers are reflected via players.goals aggregate (no goal-events table in current app code).
--
-- SAFE WORKFLOW:
--   A) Run SELECTs to verify target IDs.
--   B) Replace UUID placeholders in `target_matches`.
--   C) Run transaction block once.

-- A) Verify match candidates first
select id, date_time, rival, home, result_home, result_away
from public.matches
where lower(coalesce(rival, '')) in ('changos camperos', 'paella', 'hulk city')
order by date_time;

-- A.2) Verify player candidates first (for scorer mapping)
select id, coalesce(display_name, name) as player_name, goals
from public.players
where lower(coalesce(display_name, name, '')) in (
  'daniel a.', 'edgar c.', 'dani b.', 'sergio c.', 'victor e.', 'izan f.'
)
order by player_name;

begin;

-- B) IMPORTANT: replace these UUIDs with verified IDs from previous SELECT.
with target_matches as (
  select * from (values
    -- rival_key, match_id
    ('changos', '00000000-0000-0000-0000-000000000101'::uuid),
    ('paella',  '00000000-0000-0000-0000-000000000102'::uuid),
    ('hulk',    '00000000-0000-0000-0000-000000000103'::uuid)
  ) as t(rival_key, id)
),

-- Score update is home/away aware using matches.home (Inter local when home=true)
updated_matches as (
  update public.matches m
  set
    result_home = case tm.rival_key
      when 'changos' then (case when m.home then 8 else 7 end)
      when 'paella'  then (case when m.home then 4 else 11 end)
      when 'hulk'    then 0
      else m.result_home
    end,
    result_away = case tm.rival_key
      when 'changos' then (case when m.home then 7 else 8 end)
      when 'paella'  then (case when m.home then 11 else 4 end)
      when 'hulk'    then 0
      else m.result_away
    end
  from target_matches tm
  where m.id = tm.id
    and (
      m.result_home is distinct from case tm.rival_key
        when 'changos' then (case when m.home then 8 else 7 end)
        when 'paella'  then (case when m.home then 4 else 11 end)
        when 'hulk'    then 0
        else m.result_home
      end
      or
      m.result_away is distinct from case tm.rival_key
        when 'changos' then (case when m.home then 7 else 8 end)
        when 'paella'  then (case when m.home then 11 else 4 end)
        when 'hulk'    then 0
        else m.result_away
      end
    )
  returning tm.rival_key
),

-- scorer deltas are applied only when the match row was actually updated above
scorer_deltas as (
  select * from (
    select 'daniel a.'::text as scorer, 2::int as goals_add from updated_matches where rival_key = 'changos'
    union all select 'edgar c.', 1 from updated_matches where rival_key = 'changos'
    union all select 'dani b.', 2 from updated_matches where rival_key = 'changos'
    union all select 'sergio c.', 1 from updated_matches where rival_key = 'changos'
    union all select 'victor e.', 2 from updated_matches where rival_key = 'changos'

    union all select 'edgar c.', 1 from updated_matches where rival_key = 'paella'
    union all select 'daniel a.', 1 from updated_matches where rival_key = 'paella'
    union all select 'dani b.', 1 from updated_matches where rival_key = 'paella'
    union all select 'izan f.', 1 from updated_matches where rival_key = 'paella'
  ) x
),
merged_scorers as (
  select scorer, sum(goals_add)::int as goals_add
  from scorer_deltas
  group by scorer
),
updated_players as (
  update public.players p
  set goals = coalesce(p.goals, 0) + ms.goals_add
  from merged_scorers ms
  where lower(coalesce(p.display_name, p.name, '')) = ms.scorer
  returning p.id, coalesce(p.display_name, p.name) as player_name, p.goals
)
select
  (select count(*) from updated_matches) as matches_updated,
  (select count(*) from updated_players) as players_updated;

commit;

-- C) Post-check: these should no longer be pending (both result columns non-null)
select id, date_time, rival, home, result_home, result_away
from public.matches
where id in (
  '00000000-0000-0000-0000-000000000101'::uuid,
  '00000000-0000-0000-0000-000000000102'::uuid,
  '00000000-0000-0000-0000-000000000103'::uuid
)
order by date_time;
