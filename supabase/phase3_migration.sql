-- vitristyle Manager Phase 3 migration
-- Run ONCE after Phase 2 schema.sql, in the SAME Supabase project.
-- Existing tables and records are retained; do NOT rerun the Phase 2 schema.
-- Currency: NPR. Day boundaries for dashboard: Asia/Kathmandu.

-- Record a confirmed sale, snapshot product prices, deduct stock, and optionally
-- record a collected payment in ONE transaction. SECURITY DEFINER is used for
-- transaction integrity; user ownership is checked explicitly at every step.
create or replace function public.create_sale_v3(
  p_customer_name text,
  p_items jsonb,
  p_discount numeric default 0,
  p_payment_method text default 'cod',
  p_paid_amount numeric default 0,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_item jsonb;
  v_product record;
  v_product_id uuid;
  v_qty integer;
  v_gross numeric(14,2) := 0;
  v_discount numeric(14,2);
  v_paid numeric(14,2);
  v_grand numeric(14,2);
  v_sale_id uuid;
  v_lines jsonb := '[]'::jsonb;
  v_line jsonb;
begin
  if v_user is null then
    raise exception 'You must sign in first';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 20 then
    raise exception 'Select between 1 and 20 items';
  end if;
  if p_discount is null or p_discount < 0 or p_discount <> round(p_discount, 2) then
    raise exception 'Invalid discount amount';
  end if;
  if p_paid_amount is null or p_paid_amount < 0 or p_paid_amount <> round(p_paid_amount, 2) then
    raise exception 'Invalid amount received';
  end if;
  if p_payment_method not in ('cash','bank','esewa','khalti','cod','other') then
    raise exception 'Invalid payment method';
  end if;
  if length(coalesce(p_customer_name,'')) > 120 or length(coalesce(p_notes,'')) > 500 then
    raise exception 'Customer or notes are too long';
  end if;

  -- The function runs inside one PostgreSQL transaction. FOR UPDATE prevents
  -- two simultaneous sales from selling the same last unit.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object' or
       (v_item->>'quantity') is null or
       (v_item->>'product_id') is null then
      raise exception 'Each item requires a product and quantity';
    end if;
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 or v_qty > 10000 then
      raise exception 'Invalid product quantity';
    end if;

    select id, cost_price, selling_price, stock_quantity
    into v_product
    from public.products
    where id = v_product_id and user_id = v_user and is_active = true
    for update;

    if not found then
      raise exception 'Product not found or not available';
    end if;
    if v_product.stock_quantity < v_qty then
      raise exception 'Not enough stock available for this product';
    end if;

    update public.products
    set stock_quantity = stock_quantity - v_qty
    where id = v_product_id and user_id = v_user;

    v_gross := v_gross + v_product.selling_price * v_qty;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_product_id,
      'quantity', v_qty,
      'unit_price', v_product.selling_price,
      'unit_cost', v_product.cost_price
    ));
  end loop;

  v_discount := p_discount;
  v_paid := p_paid_amount;
  if v_discount > v_gross then
    raise exception 'Discount cannot exceed the sale amount';
  end if;
  v_grand := v_gross - v_discount;
  if v_paid > v_grand then
    raise exception 'Amount received cannot exceed the sale total';
  end if;

  insert into public.sales
    (user_id, order_number, customer_name, status, gross_total, discount_total, grand_total, notes)
  values
    (v_user, 'VS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
     nullif(trim(p_customer_name), ''), 'confirmed', v_gross, v_discount, v_grand,
     nullif(trim(coalesce(p_notes,'')), ''))
  returning id into v_sale_id;

  for v_line in select value from jsonb_array_elements(v_lines)
  loop
    insert into public.sale_items
      (user_id, sale_id, product_id, quantity, unit_price, unit_cost, discount)
    values
      (v_user, v_sale_id, (v_line->>'product_id')::uuid,
       (v_line->>'quantity')::integer, (v_line->>'unit_price')::numeric,
       (v_line->>'unit_cost')::numeric, 0);

    insert into public.inventory_movements
      (user_id, product_id, movement_type, quantity_delta, notes)
    values
      (v_user, (v_line->>'product_id')::uuid, 'sale',
       -(v_line->>'quantity')::integer, 'Sale ' || v_sale_id::text);
  end loop;

  if v_paid > 0 then
    insert into public.payments (user_id, sale_id, method, amount)
    values (v_user, v_sale_id, p_payment_method, v_paid);
  end if;

  return v_sale_id;
end;
$$;

-- Collect additional customer payment later (for example, COD on delivery).
create or replace function public.record_payment_v3(
  p_sale_id uuid,
  p_amount numeric,
  p_method text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_sale record;
  v_received numeric(14,2);
  v_payment_id uuid;
begin
  if v_user is null then raise exception 'You must sign in first'; end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount,2) then
    raise exception 'Payment amount must be positive with at most two decimals';
  end if;
  if p_method not in ('cash','bank','esewa','khalti','cod','other') then
    raise exception 'Invalid payment method';
  end if;

  select id, grand_total, status into v_sale from public.sales
  where id = p_sale_id and user_id = v_user for update;
  if not found or v_sale.status in ('cancelled','returned') then
    raise exception 'Sale unavailable for payment';
  end if;
  select coalesce(sum(amount),0) into v_received from public.payments
  where sale_id = p_sale_id and user_id = v_user;
  if p_amount > v_sale.grand_total - v_received then
    raise exception 'Payment exceeds the remaining balance';
  end if;

  insert into public.payments (user_id, sale_id, amount, method)
  values (v_user, p_sale_id, p_amount, p_method)
  returning id into v_payment_id;
  return v_payment_id;
end;
$$;

-- The dashboard uses server-aggregated totals, so counts do not become
-- inaccurate due to the Supabase API's default row pagination.
create or replace function public.dashboard_summary_v3()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with
  local_day as (select (now() at time zone 'Asia/Kathmandu')::date as today),
  my_sales as (
    select id, sold_at, grand_total
    from public.sales
    where user_id = (select auth.uid())
      and status not in ('cancelled', 'returned')
  ),
  sales_today as (
    select coalesce(sum(s.grand_total), 0) as total, count(*)::integer as orders
    from my_sales s, local_day d
    where (s.sold_at at time zone 'Asia/Kathmandu')::date = d.today
  ),
  money_today as (
    select coalesce(sum(p.amount), 0) as received
    from public.payments p, local_day d
    where p.user_id = (select auth.uid())
      and (p.received_at at time zone 'Asia/Kathmandu')::date = d.today
  ),
  expense_today as (
    select coalesce(sum(e.amount), 0) as paid
    from public.expenses e, local_day d
    where e.user_id = (select auth.uid())
      and (e.paid_at at time zone 'Asia/Kathmandu')::date = d.today
  ),
  cost_today as (
    select coalesce(sum(si.quantity * si.unit_cost), 0) as cost
    from public.sale_items si
    join my_sales s on s.id = si.sale_id
    cross join local_day d
    where (s.sold_at at time zone 'Asia/Kathmandu')::date = d.today
  ),
  pending as (
    select coalesce(sum(greatest(s.grand_total - coalesce(pay.received,0),0)),0) as total
    from my_sales s
    left join lateral (
      select sum(p.amount) as received from public.payments p
      where p.sale_id = s.id and p.user_id = (select auth.uid())
    ) pay on true
  ),
  days as (
    select (d.today - (29 - n)) as day
    from local_day d cross join generate_series(0,29) as n
  ),
  chart_days as (
    select days.day, coalesce(sum(s.grand_total),0) as amount
    from days left join my_sales s
      on (s.sold_at at time zone 'Asia/Kathmandu')::date = days.day
    group by days.day
  ),
  expense_categories as (
    select e.category, sum(e.amount) as amount
    from public.expenses e, local_day d
    where e.user_id = (select auth.uid())
      and (e.paid_at at time zone 'Asia/Kathmandu')::date = d.today
    group by e.category
  )
select jsonb_build_object(
  'sales_today', (select total from sales_today),
  'orders_today', (select orders from sales_today),
  'received_today', (select received from money_today),
  'expenses_today', (select paid from expense_today),
  'product_cost_today', (select cost from cost_today),
  'pending_total', (select total from pending),
  'chart', (select coalesce(jsonb_agg(jsonb_build_object(
     'date', to_char(day,'YYYY-MM-DD'), 'sales', amount) order by day), '[]'::jsonb) from chart_days),
  'expense_categories', (select coalesce(jsonb_agg(jsonb_build_object(
     'category', category, 'amount', amount) order by amount desc), '[]'::jsonb) from expense_categories)
);
$$;

-- Lock down direct writes to immutable financial tables; authenticated users
-- still have SELECT limited by the existing RLS policies. Only vetted RPCs write.
revoke insert, update, delete on public.sales, public.sale_items,
  public.payments, public.inventory_movements from authenticated;

-- PostgreSQL grants EXECUTE on newly created functions to PUBLIC by default.
revoke all on function public.create_sale_v3(text,jsonb,numeric,text,numeric,text) from public, anon;
revoke all on function public.record_payment_v3(uuid,numeric,text) from public, anon;
revoke all on function public.dashboard_summary_v3() from public, anon;
grant execute on function public.create_sale_v3(text,jsonb,numeric,text,numeric,text) to authenticated;
grant execute on function public.record_payment_v3(uuid,numeric,text) to authenticated;
grant execute on function public.dashboard_summary_v3() to authenticated;
