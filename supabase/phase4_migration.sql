-- vitristyle Manager / Phase 4, run AFTER Phase 2 and Phase 3 in SAME Supabase project.
-- BACK UP THE DATABASE FIRST. Do not rerun initial schema or Phase 3 migration.
-- New immutable money ledger; purchase, transfer, reversal, adjustment and report RPCs.
-- Transactions in Phase 3 with NULL account_id are NOT silently put in an account.

create table if not exists public.account_entries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 account_id uuid not null,
 kind text not null check (kind in ('payment','expense','purchase','refund','transfer_in','transfer_out','reconciliation')),
 amount numeric(14,2) not null check (amount <> 0),
 source_id uuid not null,
 note text,
 occurred_at timestamptz not null default now(),
 constraint entries_account_owner foreign key (account_id,user_id) references public.accounts(id,user_id),
 unique(user_id,kind,source_id,account_id)
);
create table if not exists public.stock_purchases (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 product_id uuid not null,
 account_id uuid not null,
 quantity integer not null check (quantity > 0),
 unit_cost numeric(14,2) not null check (unit_cost >= 0),
 total numeric(14,2) not null check (total >= 0),
 notes text,
 purchased_at timestamptz not null default now(),
 constraint purchases_product_owner foreign key(product_id,user_id) references public.products(id,user_id),
 constraint purchases_account_owner foreign key(account_id,user_id) references public.accounts(id,user_id)
);
create table if not exists public.sale_reversals (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 sale_id uuid not null,
 kind text not null check (kind in ('cancelled','returned')),
 restocked boolean not null,
 refund_account_id uuid,
 refunded numeric(14,2) not null default 0 check (refunded >= 0),
 write_off_cost numeric(14,2) not null default 0 check (write_off_cost >= 0),
 reason text not null,
 reversed_at timestamptz not null default now(),
 constraint reversal_sale_owner foreign key (sale_id,user_id) references public.sales(id,user_id),
 constraint reversal_refund_owner foreign key (refund_account_id,user_id) references public.accounts(id,user_id),
 unique (sale_id)
);
create table if not exists public.account_transfers (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 from_account_id uuid not null,
 to_account_id uuid not null,
 amount numeric(14,2) not null check (amount > 0),
 notes text,
 created_at timestamptz not null default now(),
 constraint transfer_from_owner foreign key (from_account_id,user_id) references public.accounts(id,user_id),
 constraint transfer_to_owner foreign key (to_account_id,user_id) references public.accounts(id,user_id),
 check (from_account_id <> to_account_id)
);

-- The new tables are read-only from the browser; audited security-definer RPCs write them.
do $$
declare t text;
begin
  foreach t in array array['account_entries','stock_purchases','sale_reversals','account_transfers'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon,authenticated', t);
    execute format('grant select on table public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid())=user_id)',t||'_own_select',t);
    execute format('create index %I on public.%I (user_id)',t||'_user_id_idx',t);
  end loop;
end $$;
create index if not exists entries_account_date_idx on public.account_entries(account_id,occurred_at desc);
create index if not exists stock_purchases_date_idx on public.stock_purchases(user_id,purchased_at desc);
create index if not exists reversals_date_idx on public.sale_reversals(user_id,reversed_at desc);

-- Direct changes to stock, expenses, financial history are prohibited in Phase 4.
-- Account creation remains possible; opening balance cannot be edited after creation.
revoke insert,update,delete on public.products from authenticated;
revoke insert,update,delete on public.expenses from authenticated;
revoke update,delete on public.accounts from authenticated;
revoke insert,update,delete on public.sales,public.sale_items,public.payments,public.inventory_movements from authenticated;

-- New products are created via a function so opening stock has an audit movement.
create or replace function public.create_product_v4(
 p_sku text,p_name text,p_category text,p_size text,p_color text,
 p_cost numeric,p_price numeric,p_stock integer
) returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); v_id uuid;
begin
 if u is null then raise exception 'Sign in first'; end if;
 if length(trim(coalesce(p_sku,''))) not between 1 and 40 or
    length(trim(coalesce(p_name,''))) not between 1 and 120 or
    length(trim(coalesce(p_category,''))) not between 1 and 80 or
    length(coalesce(p_size,'')) > 40 or length(coalesce(p_color,'')) > 40 then raise exception 'Invalid product details'; end if;
 if p_cost is null or p_price is null or p_cost < 0 or p_price < 0 or
    p_cost<>round(p_cost,2) or p_price<>round(p_price,2) or p_stock is null or p_stock<0 or p_stock>1000000 then raise exception 'Invalid prices or starting stock'; end if;
 insert into public.products(user_id,sku,name,category,size,color,cost_price,selling_price,stock_quantity)
 values(u,upper(trim(p_sku)),trim(p_name),trim(p_category),nullif(trim(coalesce(p_size,'')),''),nullif(trim(coalesce(p_color,'')),''),p_cost,p_price,p_stock)
 returning id into v_id;
 if p_stock>0 then
  insert into public.inventory_movements(user_id,product_id,movement_type,quantity_delta,notes)
  values(u,v_id,'adjustment',p_stock,'Opening stock · no payment recorded');
 end if;
 return v_id;
end $$;

-- Account ownership helper called only from the validated RPCs.
create or replace function public.assert_account_v4(p_user uuid,p_account uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if p_account is null or not exists(select 1 from public.accounts where id=p_account and user_id=p_user)
 then raise exception 'Choose one of your payment accounts'; end if;
end $$;

-- Create a sale, deduct inventory and record an optional real payment atomically.
create or replace function public.create_sale_v4(
 p_customer_name text,p_items jsonb,p_discount numeric default 0,
 p_payment_method text default 'cod',p_paid_amount numeric default 0,
 p_account_id uuid default null,p_notes text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
 u uuid := auth.uid(); item jsonb; product_row record; product_id uuid; qty integer;
 gross numeric(14,2):=0; grand numeric(14,2); sid uuid; pid uuid;
 lines jsonb:='[]'::jsonb; line jsonb;
begin
 if u is null then raise exception 'Sign in first'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 20 then raise exception 'Choose 1–20 products'; end if;
 if p_discount is null or p_discount<0 or p_discount<>round(p_discount,2) then raise exception 'Invalid discount'; end if;
 if p_paid_amount is null or p_paid_amount<0 or p_paid_amount<>round(p_paid_amount,2) then raise exception 'Invalid amount collected'; end if;
 if p_payment_method not in ('cash','bank','esewa','khalti','cod','other') then raise exception 'Invalid payment method'; end if;
 if length(coalesce(p_customer_name,''))>120 or length(coalesce(p_notes,''))>500 then raise exception 'Text is too long'; end if;
 if p_paid_amount>0 then
   if p_payment_method='cod' then raise exception 'COD is for unpaid orders; choose actual received method'; end if;
   perform public.assert_account_v4(u,p_account_id);
 elsif p_account_id is not null then raise exception 'Do not choose a payment account for unpaid orders'; end if;
 if (select count(distinct x.value->>'product_id') from jsonb_array_elements(p_items) as x(value)) <> jsonb_array_length(p_items) then raise exception 'Each product can appear only once'; end if;
 -- Lock in a stable order to avoid deadlocks during concurrent checkout.
 for item in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
   if jsonb_typeof(item)<>'object' or item->>'product_id' is null or item->>'quantity' is null then raise exception 'Invalid sale item'; end if;
   product_id:=(item->>'product_id')::uuid; qty:=(item->>'quantity')::integer;
   if qty not between 1 and 10000 then raise exception 'Invalid quantity'; end if;
   select id,cost_price,selling_price,stock_quantity into product_row
   from public.products where id=product_id and user_id=u and is_active=true for update;
   if not found then raise exception 'Product not found or inactive'; end if;
   if product_row.stock_quantity<qty then raise exception 'Insufficient stock'; end if;
   update public.products set stock_quantity=stock_quantity-qty where id=product_id and user_id=u;
   gross:=gross+product_row.selling_price*qty;
   lines:=lines||jsonb_build_array(jsonb_build_object('product_id',product_id,'quantity',qty,'unit_price',product_row.selling_price,'unit_cost',product_row.cost_price));
 end loop;
 grand:=gross-p_discount;
 if grand<=0 or p_paid_amount>grand then raise exception 'Invalid sale total or payment amount'; end if;
 insert into public.sales(user_id,order_number,customer_name,status,gross_total,discount_total,grand_total,notes)
 values(u,'VS-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),nullif(trim(coalesce(p_customer_name,'')),''),'confirmed',gross,p_discount,grand,nullif(trim(coalesce(p_notes,'')),'')) returning id into sid;
 for line in select value from jsonb_array_elements(lines) loop
  insert into public.sale_items(user_id,sale_id,product_id,quantity,unit_price,unit_cost,discount)
  values(u,sid,(line->>'product_id')::uuid,(line->>'quantity')::integer,(line->>'unit_price')::numeric,(line->>'unit_cost')::numeric,0);
  insert into public.inventory_movements(user_id,product_id,movement_type,quantity_delta,notes)
  values(u,(line->>'product_id')::uuid,'sale',-(line->>'quantity')::integer,'Sale '||sid::text);
 end loop;
 if p_paid_amount>0 then
  insert into public.payments(user_id,sale_id,account_id,method,amount) values(u,sid,p_account_id,p_payment_method,p_paid_amount) returning id into pid;
  insert into public.account_entries(user_id,account_id,kind,amount,source_id,note)
  values(u,p_account_id,'payment',p_paid_amount,pid,'Payment on sale '||sid::text);
 end if;
 return sid;
end $$;

create or replace function public.record_payment_v4(
 p_sale_id uuid,p_amount numeric,p_method text,p_account_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); s record; received numeric(14,2); pid uuid;
begin
 if u is null then raise exception 'Sign in first'; end if;
 if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) then raise exception 'Invalid payment'; end if;
 if p_method not in ('cash','bank','esewa','khalti','other') then raise exception 'Choose an actual payment method'; end if;
 perform public.assert_account_v4(u,p_account_id);
 select id,grand_total,status into s from public.sales where id=p_sale_id and user_id=u for update;
 if not found or s.status in ('cancelled','returned') then raise exception 'Sale unavailable'; end if;
 select coalesce(sum(amount),0) into received from public.payments where sale_id=p_sale_id and user_id=u;
 if p_amount>s.grand_total-received then raise exception 'Payment exceeds outstanding amount'; end if;
 insert into public.payments(user_id,sale_id,account_id,amount,method) values(u,p_sale_id,p_account_id,p_amount,p_method) returning id into pid;
 insert into public.account_entries(user_id,account_id,kind,amount,source_id,note)
 values(u,p_account_id,'payment',p_amount,pid,'Payment for sale '||p_sale_id::text);
 return pid;
end $$;

create or replace function public.create_expense_v4(
 p_category text,p_description text,p_amount numeric,p_account_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); eid uuid;
begin
 if u is null then raise exception 'Sign in first'; end if;
 if length(trim(coalesce(p_category,''))) not between 1 and 80 or length(coalesce(p_description,''))>250 then raise exception 'Invalid expense details'; end if;
 if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) then raise exception 'Invalid expense amount'; end if;
 perform public.assert_account_v4(u,p_account_id);
 insert into public.expenses(user_id,account_id,category,description,amount)
 values(u,p_account_id,trim(p_category),nullif(trim(coalesce(p_description,'')),''),p_amount) returning id into eid;
 insert into public.account_entries(user_id,account_id,kind,amount,source_id,note)
 values(u,p_account_id,'expense',-p_amount,eid,trim(p_category));
 return eid;
end $$;

-- Physical purchase: inventory addition + weighted-average unit cost + payment.
create or replace function public.purchase_stock_v4(
 p_product_id uuid,p_quantity integer,p_unit_cost numeric,p_account_id uuid,p_notes text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); p record; purchase_id uuid; total numeric(14,2); avg_cost numeric(14,2);
begin
 if u is null then raise exception 'Sign in first'; end if;
 if p_quantity is null or p_quantity not between 1 and 100000 or p_unit_cost is null or p_unit_cost<0 or p_unit_cost<>round(p_unit_cost,2) then raise exception 'Invalid stock purchase details'; end if;
 if length(coalesce(p_notes,''))>250 then raise exception 'Notes too long'; end if;
 perform public.assert_account_v4(u,p_account_id);
 select id,stock_quantity,cost_price into p from public.products where id=p_product_id and user_id=u and is_active=true for update;
 if not found then raise exception 'Product not found or inactive'; end if;
 total:=p_quantity*p_unit_cost;
 avg_cost:=round(((p.stock_quantity*p.cost_price)+(p_quantity*p_unit_cost))/(p.stock_quantity+p_quantity),2);
 update public.products set stock_quantity=stock_quantity+p_quantity,cost_price=avg_cost where id=p_product_id and user_id=u;
 insert into public.stock_purchases(user_id,product_id,account_id,quantity,unit_cost,total,notes)
 values(u,p_product_id,p_account_id,p_quantity,p_unit_cost,total,nullif(trim(coalesce(p_notes,'')),'')) returning id into purchase_id;
 insert into public.inventory_movements(user_id,product_id,movement_type,quantity_delta,notes)
 values(u,p_product_id,'purchase',p_quantity,'Stock purchase '||purchase_id::text);
 if total>0 then
  insert into public.account_entries(user_id,account_id,kind,amount,source_id,note)
  values(u,p_account_id,'purchase',-total,purchase_id,'Stock purchase');
 end if;
 return purchase_id;
end $$;

create or replace function public.adjust_stock_v4(
 p_product_id uuid,p_delta integer,p_reason text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); p record; mid uuid;
begin
 if u is null then raise exception 'Sign in first'; end if;
 if p_delta is null or p_delta=0 or abs(p_delta)>100000 then raise exception 'Quantity change must be a nonzero whole number'; end if;
 if length(trim(coalesce(p_reason,''))) not between 5 and 250 then raise exception 'Provide a reason (at least 5 characters)'; end if;
 select id,stock_quantity into p from public.products where id=p_product_id and user_id=u for update;
 if not found then raise exception 'Product not found'; end if;
 if p.stock_quantity+p_delta<0 then raise exception 'Adjustment would make stock negative'; end if;
 update public.products set stock_quantity=stock_quantity+p_delta where id=p_product_id and user_id=u;
 insert into public.inventory_movements(user_id,product_id,movement_type,quantity_delta,notes)
 values(u,p_product_id,'adjustment',p_delta,trim(p_reason)) returning id into mid;
 return mid;
end $$;

-- Full-order cancellation requires zero payments. Full-order return refunds ALL
-- collected payments to one selected account. Only restock resale-safe goods.
create or replace function public.reverse_sale_v4(
 p_sale_id uuid,p_kind text,p_restock boolean,p_refund_account_id uuid,p_reason text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); s record; received numeric(14,2); item record; rid uuid; loss numeric(14,2):=0; restore boolean;
begin
 if u is null then raise exception 'Sign in first'; end if;
 if p_kind not in ('cancelled','returned') then raise exception 'Invalid reversal type'; end if;
 if length(trim(coalesce(p_reason,''))) not between 5 and 250 then raise exception 'Explain the reason (5–250 characters)'; end if;
 select id,status into s from public.sales where id=p_sale_id and user_id=u for update;
 if not found or s.status in ('cancelled','returned') then raise exception 'Sale already reversed or unavailable'; end if;
 select coalesce(sum(amount),0) into received from public.payments where sale_id=p_sale_id and user_id=u;
 if p_kind='cancelled' and received>0 then raise exception 'Paid orders must be returned with refund, not cancelled'; end if;
 if received>0 then perform public.assert_account_v4(u,p_refund_account_id); end if;
 restore:=case when p_kind='cancelled' then true else coalesce(p_restock,false) end;
 for item in select product_id,quantity,unit_cost from public.sale_items where sale_id=p_sale_id and user_id=u order by product_id loop
  if restore then
    update public.products set stock_quantity=stock_quantity+item.quantity where id=item.product_id and user_id=u;
    insert into public.inventory_movements(user_id,product_id,movement_type,quantity_delta,notes)
    values(u,item.product_id,'return',item.quantity,'Restored from '||p_kind||' sale '||p_sale_id::text);
  else
    loss:=loss+(item.quantity*item.unit_cost);
  end if;
 end loop;
 insert into public.sale_reversals(user_id,sale_id,kind,restocked,refund_account_id,refunded,write_off_cost,reason)
 values(u,p_sale_id,p_kind,restore,case when received>0 then p_refund_account_id else null end,received,loss,trim(p_reason)) returning id into rid;
 update public.sales set status=p_kind where id=p_sale_id and user_id=u;
 if received>0 then
  insert into public.account_entries(user_id,account_id,kind,amount,source_id,note)
  values(u,p_refund_account_id,'refund',-received,rid,'Refund for sale '||p_sale_id::text);
 end if;
 return rid;
end $$;

-- Transfer locks both accounts so simultaneous transfers cannot spend the same cash.
create or replace function public.transfer_funds_v4(
 p_from uuid,p_to uuid,p_amount numeric,p_notes text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); rec record; account_count integer:=0; available numeric(14,2); tid uuid;
begin
 if u is null then raise exception 'Sign in first'; end if;
 if p_from is null or p_to is null or p_from=p_to then raise exception 'Choose two different accounts'; end if;
 if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) then raise exception 'Invalid transfer amount'; end if;
 if length(coalesce(p_notes,''))>250 then raise exception 'Notes too long'; end if;
 for rec in select id from public.accounts where user_id=u and id in (p_from,p_to) order by id for update loop
   account_count:=account_count+1;
 end loop;
 if account_count<>2 then raise exception 'One or both accounts are unavailable'; end if;
 select a.opening_balance+coalesce(sum(e.amount),0) into available from public.accounts a
 left join public.account_entries e on e.account_id=a.id and e.user_id=u
 where a.id=p_from and a.user_id=u group by a.id,a.opening_balance;
 if available<p_amount then raise exception 'Insufficient recorded account balance for transfer'; end if;
 insert into public.account_transfers(user_id,from_account_id,to_account_id,amount,notes)
 values(u,p_from,p_to,p_amount,nullif(trim(coalesce(p_notes,'')),'')) returning id into tid;
 insert into public.account_entries(user_id,account_id,kind,amount,source_id,note)
 values(u,p_from,'transfer_out',-p_amount,tid,coalesce(p_notes,'Transfer')),
       (u,p_to,'transfer_in',p_amount,tid,coalesce(p_notes,'Transfer'));
 return tid;
end $$;

-- Adjust balance to physical counted balance; audit entry keeps its reason.
create or replace function public.reconcile_account_v4(
 p_account_id uuid,p_counted_balance numeric,p_reason text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); a record; balance numeric(14,2); delta numeric(14,2); eid uuid;
begin
 if u is null then raise exception 'Sign in first'; end if;
 if p_counted_balance is null or p_counted_balance<0 or p_counted_balance<>round(p_counted_balance,2) then raise exception 'Invalid counted balance'; end if;
 if length(trim(coalesce(p_reason,''))) not between 5 and 250 then raise exception 'Enter a reconciliation explanation'; end if;
 select id,opening_balance into a from public.accounts where id=p_account_id and user_id=u for update;
 if not found then raise exception 'Account not found'; end if;
 select a.opening_balance+coalesce(sum(amount),0) into balance from public.account_entries
 where account_id=p_account_id and user_id=u;
 delta:=p_counted_balance-balance;
 if delta=0 then raise exception 'Balance already matches; no reconciliation needed'; end if;
 insert into public.account_entries(user_id,account_id,kind,amount,source_id,note)
 values(u,p_account_id,'reconciliation',delta,gen_random_uuid(),trim(p_reason)) returning id into eid;
 return eid;
end $$;

create or replace function public.account_balances_v4()
returns table(id uuid,name text,kind text,opening_balance numeric,balance numeric)
language sql stable security invoker set search_path = '' as $$
 select a.id,a.name,a.kind,a.opening_balance,a.opening_balance+coalesce(sum(e.amount),0) as balance
 from public.accounts a left join public.account_entries e on e.account_id=a.id and e.user_id=(select auth.uid())
 where a.user_id=(select auth.uid()) group by a.id,a.name,a.kind,a.opening_balance order by a.name;
$$;

-- Dates are interpreted in Asia/Kathmandu. Reporting is simplified management
-- accounting, NOT tax/GST/VAT or an audited profit and loss statement.
create or replace function public.period_report_v4(p_from date,p_to date)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare u uuid:=auth.uid(); result jsonb;
begin
 if u is null then raise exception 'Sign in first'; end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>92 then raise exception 'Select up to 93 calendar days'; end if;
 with
  sales_base as (
   select id,(sold_at at time zone 'Asia/Kathmandu')::date d,grand_total
   from public.sales where user_id=u and status not in ('cancelled','returned')
     and (sold_at at time zone 'Asia/Kathmandu')::date between p_from and p_to
  ),
  days as (select d::date from generate_series(p_from,p_to,interval '1 day') d),
  sold as (select coalesce(sum(grand_total),0) amount,count(*) orders from sales_base),
  cogs as (select coalesce(sum(si.quantity*si.unit_cost),0) amount from public.sale_items si join sales_base s on s.id=si.sale_id where si.user_id=u),
  received as (select coalesce(sum(amount),0) amount from public.payments where user_id=u and (received_at at time zone 'Asia/Kathmandu')::date between p_from and p_to),
  operating as (select coalesce(sum(amount),0) amount from public.expenses where user_id=u and (paid_at at time zone 'Asia/Kathmandu')::date between p_from and p_to),
  stock as (select coalesce(sum(total),0) amount from public.stock_purchases where user_id=u and (purchased_at at time zone 'Asia/Kathmandu')::date between p_from and p_to),
  refunds as (select coalesce(sum(refunded),0) amount from public.sale_reversals where user_id=u and (reversed_at at time zone 'Asia/Kathmandu')::date between p_from and p_to),
  losses as (select coalesce(sum(write_off_cost),0) amount from public.sale_reversals where user_id=u and (reversed_at at time zone 'Asia/Kathmandu')::date between p_from and p_to),
  daily as (
   select days.d as day, coalesce(sum(s.grand_total),0) amount
   from days left join sales_base s on s.d=days.d group by days.d
  )
 select jsonb_build_object(
   'from',p_from,'to',p_to,
   'sales',(select amount from sold),'orders',(select orders from sold),
   'product_cost',(select amount from cogs),'received',(select amount from received),
   'expenses',(select amount from operating),'purchases',(select amount from stock),
   'refunds',(select amount from refunds),'write_offs',(select amount from losses),
   'profit',(select amount from sold)-(select amount from cogs)-(select amount from operating)-(select amount from losses),
   'net_cash',(select amount from received)-(select amount from operating)-(select amount from stock)-(select amount from refunds),
   'days',(select coalesce(jsonb_agg(jsonb_build_object('date',day,'sales',amount) order by day),'[]'::jsonb) from daily)
 ) into result;
 return result;
end $$;

-- Preserve the Phase 3 dashboard response shape, adding actual refunds and stock
-- cash purchases. A non-restockable return is recorded as inventory write-off.
create or replace function public.dashboard_summary_v4()
returns jsonb language sql stable security invoker set search_path = '' as $$
 select public.dashboard_summary_v3() || jsonb_build_object(
  'purchases_today', (select coalesce(sum(total),0) from public.stock_purchases where user_id=(select auth.uid()) and (purchased_at at time zone 'Asia/Kathmandu')::date=(now() at time zone 'Asia/Kathmandu')::date),
  'refunds_today', (select coalesce(sum(refunded),0) from public.sale_reversals where user_id=(select auth.uid()) and (reversed_at at time zone 'Asia/Kathmandu')::date=(now() at time zone 'Asia/Kathmandu')::date),
  'write_offs_today', (select coalesce(sum(write_off_cost),0) from public.sale_reversals where user_id=(select auth.uid()) and (reversed_at at time zone 'Asia/Kathmandu')::date=(now() at time zone 'Asia/Kathmandu')::date)
 );
$$;

-- Do not allow users to write money without its account ledger record via the
-- old Phase 3 functions. Read-only dashboard_summary_v3 remains enabled.
revoke execute on function public.create_sale_v3(text,jsonb,numeric,text,numeric,text) from public,anon,authenticated;
revoke execute on function public.record_payment_v3(uuid,numeric,text) from public,anon,authenticated;

-- Do NOT expose the internal helper to browser roles.
revoke all on function public.assert_account_v4(uuid,uuid) from public,anon,authenticated;

-- Remove the default PUBLIC EXECUTE grant, then allow signed-in users only.
do $$
declare signature text;
begin
 foreach signature in array array[
  'public.create_product_v4(text,text,text,text,text,numeric,numeric,integer)',
  'public.create_sale_v4(text,jsonb,numeric,text,numeric,uuid,text)',
  'public.record_payment_v4(uuid,numeric,text,uuid)',
  'public.create_expense_v4(text,text,numeric,uuid)',
  'public.purchase_stock_v4(uuid,integer,numeric,uuid,text)',
  'public.adjust_stock_v4(uuid,integer,text)',
  'public.reverse_sale_v4(uuid,text,boolean,uuid,text)',
  'public.transfer_funds_v4(uuid,uuid,numeric,text)',
  'public.reconcile_account_v4(uuid,numeric,text)',
  'public.account_balances_v4()',
  'public.period_report_v4(date,date)',
  'public.dashboard_summary_v4()'
 ] loop
   execute format('revoke all on function %s from public,anon',signature);
   execute format('grant execute on function %s to authenticated',signature);
 end loop;
end $$;
