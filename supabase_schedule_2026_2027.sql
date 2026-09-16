-- Calendario oficial 2026-2027 · 1a Lliga TARR F7 · Divendres Divisió d'honor
-- Idempotente: actualiza si existe y crea el partido si falta.
-- Horarios expresados en hora local de Barcelona (Europe/Madrid).

create temporary table tmp_schedule_2026_2027 (
  date_time timestamptz not null,
  opponent text not null,
  is_home boolean not null,
  venue text not null
) on commit drop;

insert into tmp_schedule_2026_2027 (date_time, opponent, is_home, venue) values
  ('2026-09-18 21:25 Europe/Madrid', 'Élite FC', false, 'Tarr F7 P2'),
  ('2026-09-25 22:20 Europe/Madrid', 'CACO BLANCO', true, 'Tarr F7 P1'),
  ('2026-10-02 22:20 Europe/Madrid', 'CD Txonda Pumas', false, 'Tarr F7 P3'),
  ('2026-10-09 21:25 Europe/Madrid', 'Canarinha', true, 'Tarr F7 P1'),
  ('2026-10-23 23:15 Europe/Madrid', 'VALLE BRONX', false, 'Tarr F7 P1'),
  ('2026-10-30 21:25 Europe/Madrid', 'La Guineueta', true, 'Tarr F7 P2'),
  ('2026-11-06 21:25 Europe/Madrid', 'Falsetes', false, 'Tarr F7 P2'),
  ('2026-11-13 21:25 Europe/Madrid', 'LEGANTE FC', true, 'Tarr F7 P2'),
  ('2026-11-20 21:25 Europe/Madrid', 'Élite FC', false, 'Tarr F7 P2'),
  ('2026-11-27 22:20 Europe/Madrid', 'CACO BLANCO', true, 'Tarr F7 P3'),
  ('2026-12-04 22:20 Europe/Madrid', 'CD Txonda Pumas', false, 'Tarr F7 P3'),
  ('2026-12-11 21:25 Europe/Madrid', 'Canarinha', true, 'Tarr F7 P1'),
  ('2027-01-08 23:15 Europe/Madrid', 'VALLE BRONX', false, 'Tarr F7 P1'),
  ('2027-01-15 22:20 Europe/Madrid', 'La Guineueta', true, 'Tarr F7 P3'),
  ('2027-01-22 21:25 Europe/Madrid', 'Falsetes', false, 'Tarr F7 P2'),
  ('2027-01-29 21:25 Europe/Madrid', 'LEGANTE FC', true, 'Tarr F7 P2');

update public.matches m
set venue = s.venue
from tmp_schedule_2026_2027 s
where m.date_time = s.date_time
  and m.opponent = s.opponent
  and m.is_home = s.is_home;

insert into public.matches (date_time, opponent, is_home, venue, result_home, result_away, acta_status)
select s.date_time, s.opponent, s.is_home, s.venue, null, null, 'none'
from tmp_schedule_2026_2027 s
where not exists (
  select 1
  from public.matches m
  where m.date_time = s.date_time
    and m.opponent = s.opponent
    and m.is_home = s.is_home
);
