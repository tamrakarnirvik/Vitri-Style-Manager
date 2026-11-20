-- vitristyle Manager Phase 2: initial schema. Run once in a NEW Supabase project.
-- Each authenticated user can access only their own records.
-- This does not yet implement automatic sales, stock deductions or cash balances.
create extension if not exists pgcrypto;

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('cash','bank','wallet')),
  opening_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (id, user_id), unique (user_id, name)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sku text not null,
  name text not null,
  category text not null,
  size text,
  color text,
  cost_price numeric(14,2) not null default 0 check (cost_price >= 0),
  selling_price numeric(14,2) not null default 0 check (selling_price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, user_id), unique (user_id, sku)
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  order_number text not null,
  customer_name text,
  status text not null default 'placed' check (status in ('placed','confirmed','shipped','completed','cancelled','returned')),
  gross_total numeric(14,2) not null default 0 check (gross_total >= 0),
  discount_total numeric(14,2) not null default 0 check (discount_total >= 0),
  grand_total numeric(14,2) not null default 0 check (grand_total >= 0),
  notes text,
  sold_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (id, user_id), unique (user_id, order_number)
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sale_id uuid not null,
  product_id uuid not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  unit_cost numeric(14,2) not null check (unit_cost >= 0),
  discount numeric(14,2) not null default 0 check (discount >= 0),
  created_at timestamptz not null default now(),
  constraint sale_items_sale_owner foreign key (sale_id, user_id) references public.sales(id, user_id) on delete cascade,
  constraint sale_items_product_owner foreign key (product_id, user_id) references public.products(id, user_id) on delete restrict
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sale_id uuid not null,
  account_id uuid,
  method text not null check (method in ('cash','bank','esewa','khalti','cod','other')),
  amount numeric(14,2) not null check (amount > 0),
  received_at timestamptz not null default now(),
  reference text,
  constraint payments_sale_owner foreign key (sale_id, user_id) references public.sales(id, user_id) on delete cascade,
  constraint payments_account_owner foreign key (account_id, user_id) references public.accounts(id, user_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid,
  category text not null,
  description text,
  amount numeric(14,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  constraint expenses_account_owner foreign key (account_id, user_id) references public.accounts(id, user_id)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id uuid not null,
  movement_type text not null check (movement_type in ('purchase','sale','return','adjustment')),
  quantity_delta integer not null check (quantity_delta <> 0),
  notes text,
  created_at timestamptz not null default now(),
  constraint inventory_product_owner foreign key (product_id, user_id) references public.products(id, user_id)
);

-- Explicit table grants; anonymous requests have no data access.
do $$
declare t text;
begin
  foreach t in array array['accounts','products','sales','sale_items','payments','expenses','inventory_movements'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t || '_own_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t || '_own_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t || '_own_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t || '_own_delete', t);
    execute format('create index %I on public.%I (user_id)', t || '_user_id_idx', t);
  end loop;
end $$;

create index sales_user_date_idx on public.sales(user_id, sold_at desc);
create index expenses_user_date_idx on public.expenses(user_id, paid_at desc);
create index payments_user_date_idx on public.payments(user_id, received_at desc);
create index inventory_product_date_idx on public.inventory_movements(product_id, created_at desc);
