-- 1) Locate candidate rows (adjust column names only if your schema differs).
-- Expected columns based on app code: id, date_time, rival, home, result_home, result_away
select id, date_time, rival, home, result_home, result_away
from public.matches
where (date_time between '2026-02-19 22:00:00+00' and '2026-02-19 22:15:00+00' and rival = 'ONSE FC' and home = false)
   or (date_time between '2026-02-26 20:00:00+00' and '2026-02-26 20:20:00+00' and rival = 'Nacional' and home = true)
   or (date_time between '2026-03-05 22:00:00+00' and '2026-03-05 22:15:00+00' and rival = 'Sparta' and home = false)
order by date_time;

-- 2) Replace UUIDs below with the IDs returned by previous SELECT.
-- No INSERTs; only UPDATE existing rows.

-- Partido 1 (2026-02-19 22:07 vs ONSE FC, fuera): home=7 away=3
update public.matches
set result_home = 7,
    result_away = 3
where id = '00000000-0000-0000-0000-000000000001';

-- Partido 2 (2026-02-26 20:08 vs Nacional, casa): home=3 away=8
update public.matches
set result_home = 3,
    result_away = 8
where id = '00000000-0000-0000-0000-000000000002';

-- Partido 3 (2026-03-05 22:02 vs Sparta, fuera): home=5 away=8
update public.matches
set result_home = 5,
    result_away = 8
where id = '00000000-0000-0000-0000-000000000003';
