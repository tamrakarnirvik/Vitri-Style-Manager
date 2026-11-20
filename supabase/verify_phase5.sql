-- Safe read-only check. Run in a new SQL Editor tab AFTER the Phase 5 migration.
select
  to_regclass('public.order_deliveries') as orders_table,
  to_regclass('public.order_delivery_events') as history_table,
  to_regprocedure('public.save_delivery_details_v5(uuid,text,text,text,text,date,text)') as save_function,
  to_regprocedure('public.set_delivery_status_v5(uuid,text,text)') as status_function,
  to_regprocedure('public.order_costs_v5(uuid[])') as costs_function;

select
  p.oid::regprocedure as function_signature,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_can_execute,
  has_function_privilege('anon',p.oid,'EXECUTE') as anonymous_can_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('save_delivery_details_v5','set_delivery_status_v5','order_costs_v5')
order by p.proname;
