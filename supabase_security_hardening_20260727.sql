-- Supabase SECURITY DEFINER EXECUTE hardening for Inter de Verdún.
-- Date: 2026-07-27
--
-- Scope: change only EXECUTE ACLs on the five functions listed below.
-- This script does not alter tables, rows, RLS policies, schemas, function
-- definitions, owners, SECURITY DEFINER settings, volatility, or search_path.

begin;

-- Remove implicit PUBLIC access and all direct client access first.
revoke execute on function public.current_app_user_id()
  from PUBLIC, anon, authenticated;
revoke execute on function public.is_admin()
  from PUBLIC, anon, authenticated;
revoke execute on function public.is_admin_user()
  from PUBLIC, anon, authenticated;
revoke execute on function public.rls_auto_enable()
  from PUBLIC, anon, authenticated;
revoke execute on function public.save_match_acta(
  uuid,
  integer,
  integer,
  jsonb,
  text
) from PUBLIC, anon, authenticated;

-- Internal helper/event trigger: server-side service access only.
grant execute on function public.current_app_user_id()
  to service_role;
grant execute on function public.rls_auto_enable()
  to service_role;

-- Authenticated application flows, with service_role retained explicitly.
grant execute on function public.is_admin()
  to authenticated, service_role;
grant execute on function public.is_admin_user()
  to authenticated, service_role;
grant execute on function public.save_match_acta(
  uuid,
  integer,
  integer,
  jsonb,
  text
) to authenticated, service_role;

-- Abort the transaction if the resulting effective privileges differ from
-- the reviewed least-privilege matrix.
do $verify$
declare
  check_row record;
  actual boolean;
begin
  for check_row in
    select *
    from (
      values
        ('anon',          'public.current_app_user_id()', false),
        ('anon',          'public.is_admin()', false),
        ('anon',          'public.is_admin_user()', false),
        ('anon',          'public.rls_auto_enable()', false),
        ('anon',          'public.save_match_acta(uuid,integer,integer,jsonb,text)', false),
        ('authenticated', 'public.current_app_user_id()', false),
        ('authenticated', 'public.is_admin()', true),
        ('authenticated', 'public.is_admin_user()', true),
        ('authenticated', 'public.rls_auto_enable()', false),
        ('authenticated', 'public.save_match_acta(uuid,integer,integer,jsonb,text)', true),
        ('service_role',  'public.current_app_user_id()', true),
        ('service_role',  'public.is_admin()', true),
        ('service_role',  'public.is_admin_user()', true),
        ('service_role',  'public.rls_auto_enable()', true),
        ('service_role',  'public.save_match_acta(uuid,integer,integer,jsonb,text)', true)
    ) as expected(role_name, function_signature, can_execute)
  loop
    actual := has_function_privilege(
      check_row.role_name,
      check_row.function_signature,
      'EXECUTE'
    );

    if actual is distinct from check_row.can_execute then
      raise exception
        'Unexpected EXECUTE privilege: role=%, function=%, expected=%, actual=%',
        check_row.role_name,
        check_row.function_signature,
        check_row.can_execute,
        actual;
    end if;
  end loop;
end
$verify$;

commit;

-- Complete rollback to the EXECUTE privileges observed on 2026-07-27:
--
-- begin;
--
-- grant execute on function public.current_app_user_id()
--   to PUBLIC, anon, authenticated, service_role;
-- grant execute on function public.is_admin()
--   to PUBLIC, anon, authenticated, service_role;
-- grant execute on function public.is_admin_user()
--   to PUBLIC, anon, authenticated, service_role;
-- grant execute on function public.rls_auto_enable()
--   to PUBLIC, anon, authenticated, service_role;
-- grant execute on function public.save_match_acta(
--   uuid,
--   integer,
--   integer,
--   jsonb,
--   text
-- ) to PUBLIC, anon, authenticated, service_role;
--
-- commit;
