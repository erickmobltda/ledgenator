-- One-shot cleanup to run AGAINST THE REMOTE DB before re-applying the
-- rewritten 0002–0004 migrations. Preserves auth.users + profiles so the
-- existing user account stays intact.
--
-- Run from Supabase SQL editor (or `supabase db execute --file supabase/cleanup_before_rewrite.sql`)
-- and then `supabase db push` to apply the new 0002, 0003, 0004.

begin;

-- 1) Wipe imported data. Order respects FK chain.
delete from public.operations;
delete from public.funding_events;
delete from public.brokers;
delete from public.assets;

-- 2) Clear migration tracking for the legacy imports so the rewritten files
--    in supabase/migrations/0002..0004 get re-applied by `supabase db push`.
delete from supabase_migrations.schema_migrations
 where version in ('0002', '0003', '0004');

commit;
