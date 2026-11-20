-- vitristyle Manager | Phase 5: customer delivery details & order fulfillment
-- Run ONCE in the EXISTING project after Phases 2, 3, and 4.
-- Does not modify account balances, payments, stock, or sale totals.
-- Back up the database before applying.

begin;

create table public.order_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sale_id uuid not null unique,
  phone text,
  delivery_address text,
  courier text,
  tracking_number text,
  expected_delivery_date date,
  delivery_notes text,
  status text not null default 'pending'
    check (status in ('pending','packed','dispatched','delivered','failed_delivery')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_sale_owner foreign key (sale_id, user_id)
    references public.sales(id, user_id) on delete cascade,
  unique (id, user_id)
);

create table public.order_delivery_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  delivery_id uuid not null,
  previous_status text,
  new_status text not null,
  note text,
  changed_at timestamptz not null default now(),
  constraint event_delivery_owner foreign key (delivery_id, user_id)
    references public.order_deliveries(id, user_id) on delete cascade
);

create index order_deliveries_user_status_idx
  on public.order_deliveries(user_id, status);
create index order_delivery_events_user_date_idx
  on public.order_delivery_events(user_id, changed_at desc);

alter table public.order_deliveries enable row level security;
alter table public.order_delivery_events enable row level security;

revoke all on public.order_deliveries, public.order_delivery_events from anon, authenticated;
grant select on public.order_deliveries, public.order_delivery_events to authenticated;

create policy deliveries_owner_select on public.order_deliveries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy delivery_events_owner_select on public.order_delivery_events
  for select to authenticated using ((select auth.uid()) = user_id);

-- Upsert shipping information. Lock the sale first to serialize changes
-- by the same business user. Requires authenticated owner of the sale.
create function public.save_delivery_details_v5(
  p_sale_id uuid,
  p_phone text,
  p_address text,
  p_courier text,
  p_tracking_number text,
  p_expected_date date,
  p_notes text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  u uuid := auth.uid();
  v_sale record;
  v_delivery_id uuid;
begin
  if u is null then raise exception 'Please sign in'; end if;
  if p_sale_id is null then raise exception 'Select an order'; end if;
  if length(trim(coalesce(p_phone,''))) > 30
    or length(trim(coalesce(p_address,''))) > 350
    or length(trim(coalesce(p_courier,''))) > 90
    or length(trim(coalesce(p_tracking_number,''))) > 100
    or length(trim(coalesce(p_notes,''))) > 500 then
    raise exception 'One or more shipping details are too long';
  end if;
  if p_expected_date is not null and (p_expected_date < date '2000-01-01' or p_expected_date > date '2100-12-31') then
    raise exception 'Invalid expected delivery date';
  end if;

  select id, status into v_sale from public.sales
    where id = p_sale_id and user_id = u for update;
  if not found then raise exception 'Order not found'; end if;
  if v_sale.status in ('cancelled','returned') then
    raise exception 'Cannot edit fulfillment for a reversed order';
  end if;

  select id into v_delivery_id from public.order_deliveries
    where sale_id = p_sale_id and user_id = u for update;
  if v_delivery_id is null then
    insert into public.order_deliveries (
      user_id, sale_id, phone, delivery_address, courier,
      tracking_number, expected_delivery_date, delivery_notes
    ) values (
      u, p_sale_id, nullif(trim(coalesce(p_phone,'')),''),
      nullif(trim(coalesce(p_address,'')),''),
      nullif(trim(coalesce(p_courier,'')),''),
      nullif(trim(coalesce(p_tracking_number,'')),''),
      p_expected_date, nullif(trim(coalesce(p_notes,'')),'')
    ) returning id into v_delivery_id;

    insert into public.order_delivery_events
      (user_id, delivery_id, previous_status, new_status, note)
    values (u, v_delivery_id, null, 'pending', 'Fulfillment record created');
  else
    update public.order_deliveries set
      phone = nullif(trim(coalesce(p_phone,'')),''),
      delivery_address = nullif(trim(coalesce(p_address,'')),''),
      courier = nullif(trim(coalesce(p_courier,'')),''),
      tracking_number = nullif(trim(coalesce(p_tracking_number,'')),''),
      expected_delivery_date = p_expected_date,
      delivery_notes = nullif(trim(coalesce(p_notes,'')),''),
      updated_at = now()
    where id = v_delivery_id and user_id = u;
  end if;
  return v_delivery_id;
end $$;

-- Audited fulfillment transitions. IMPORTANT: delivered does not mean paid.
create function public.set_delivery_status_v5(
  p_sale_id uuid,
  p_new_status text,
  p_note text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  u uuid := auth.uid();
  v_sale record;
  v_delivery record;
begin
  if u is null then raise exception 'Please sign in'; end if;
  if p_sale_id is null then raise exception 'Select an order'; end if;
  if p_new_status not in ('pending','packed','dispatched','delivered','failed_delivery') then
    raise exception 'Invalid delivery status';
  end if;
  if length(trim(coalesce(p_note,''))) > 250 then
    raise exception 'Status note is too long';
  end if;
  select id, status into v_sale from public.sales
    where id = p_sale_id and user_id = u for update;
  if not found or v_sale.status in ('cancelled','returned') then
    raise exception 'Order is unavailable for fulfillment';
  end if;
  select id, status into v_delivery from public.order_deliveries
    where sale_id = p_sale_id and user_id = u for update;
  if not found then raise exception 'Add delivery details before updating status'; end if;
  if v_delivery.status = p_new_status then raise exception 'Choose a new status'; end if;
  if not (
    (v_delivery.status = 'pending' and p_new_status = 'packed') or
    (v_delivery.status = 'packed' and p_new_status in ('pending','dispatched')) or
    (v_delivery.status = 'dispatched' and p_new_status in ('delivered','failed_delivery')) or
    (v_delivery.status = 'failed_delivery' and p_new_status in ('pending','dispatched'))
  ) then raise exception 'Invalid delivery status transition'; end if;

  update public.order_deliveries set status = p_new_status, updated_at = now()
    where id = v_delivery.id and user_id = u;
  insert into public.order_delivery_events
    (user_id, delivery_id, previous_status, new_status, note)
    values (u, v_delivery.id, v_delivery.status, p_new_status,
      nullif(trim(coalesce(p_note,'')),''));
  return v_delivery.id;
end $$;

-- Gross margin support: sum historical unit costs stored in sale_items.
-- Reporting function uses caller privileges and existing Phase 2 RLS.
create function public.order_costs_v5(p_sale_ids uuid[])
returns table(sale_id uuid, product_cost numeric)
language sql stable security invoker set search_path = '' as $$
  select si.sale_id, sum(si.quantity * si.unit_cost)::numeric
  from public.sale_items si
  where si.user_id = (select auth.uid())
    and si.sale_id = any(p_sale_ids)
    and coalesce(cardinality(p_sale_ids), 0) <= 100
  group by si.sale_id;
$$;

-- PostgreSQL grants EXECUTE on functions to PUBLIC by default. Restrict explicitly.
revoke all on function public.save_delivery_details_v5(uuid,text,text,text,text,date,text) from public, anon;
revoke all on function public.set_delivery_status_v5(uuid,text,text) from public, anon;
revoke all on function public.order_costs_v5(uuid[]) from public, anon;
grant execute on function public.save_delivery_details_v5(uuid,text,text,text,text,date,text) to authenticated;
grant execute on function public.set_delivery_status_v5(uuid,text,text) to authenticated;
grant execute on function public.order_costs_v5(uuid[]) to authenticated;

commit;

-- Optional, safe API metadata refresh; do not repeat the migration.
notify pgrst, 'reload schema';
