-- Inspect current RLS policies for public.lineups
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'lineups'
order by policyname;

-- Ensure RLS is enabled
alter table public.lineups enable row level security;

-- Admin-only write policies (safe: keep read policies untouched)
drop policy if exists "lineups_admin_insert" on public.lineups;
create policy "lineups_admin_insert"
on public.lineups
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "lineups_admin_update" on public.lineups;
create policy "lineups_admin_update"
on public.lineups
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "lineups_admin_delete" on public.lineups;
create policy "lineups_admin_delete"
on public.lineups
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);
