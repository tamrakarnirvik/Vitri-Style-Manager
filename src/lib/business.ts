import { createClient } from "@/lib/supabase/server";

export type Product = {
  id: string; sku: string; name: string; category: string; size: string | null;
  color: string | null; cost_price: number; selling_price: number;
  stock_quantity: number; is_active: boolean;
};
export type SaleRow = {
  id: string; order_number: string; customer_name: string | null;
  status: string; sold_at: string; grand_total: number; collected: number;
};
export type ExpenseRow = {
  id: string; category: string; description: string | null;
  amount: number; paid_at: string; account_id: string | null;
};
export type AccountRow = {
  id: string; name: string; kind: "cash" | "bank" | "wallet";
  opening_balance: number; balance: number;
};
export type AccountEntry = {
  id: string; account_id: string; kind: string; amount: number;
  occurred_at: string; note: string | null;
};
export type StockMovement = {
  id: string; product_id: string; movement_type: string;
  quantity_delta: number; notes: string | null; created_at: string;
};
export type DaySale = { date: string; sales: number };
export type CategoryTotal = { category: string; amount: number };
export type DashboardSummary = {
  sales_today: number; orders_today: number; received_today: number;
  expenses_today: number; product_cost_today: number; pending_total: number;
  purchases_today: number; refunds_today: number; write_offs_today: number;
  chart: DaySale[]; expense_categories: CategoryTotal[];
};
export type PeriodReport = {
  from: string; to: string; sales: number; orders: number;
  product_cost: number; received: number; expenses: number;
  purchases: number; refunds: number; write_offs: number;
  profit: number; net_cash: number; days: DaySale[];
};
const number = (v: unknown) => Number(v ?? 0);

export async function getProducts(): Promise<Product[]> {
  const db = await createClient();
  const { data, error } = await db.from("products")
    .select("id,sku,name,category,size,color,cost_price,selling_price,stock_quantity,is_active")
    .order("name", { ascending: true }).limit(500);
  if (error) throw new Error(`Products: ${error.message}`);
  return (data ?? []).map(p => ({ ...p, cost_price: number(p.cost_price),
    selling_price: number(p.selling_price), stock_quantity: number(p.stock_quantity) }));
}

export async function getSales(): Promise<SaleRow[]> {
  const db = await createClient();
  const { data, error } = await db.from("sales")
    .select("id,order_number,customer_name,status,sold_at,grand_total")
    .order("sold_at", { ascending: false }).limit(100);
  if (error) throw new Error(`Sales: ${error.message}`);
  if (!data?.length) return [];
  const { data: payments, error: paymentError } = await db.from("payments")
    .select("sale_id,amount").in("sale_id", data.map(s => s.id));
  if (paymentError) throw new Error(`Payments: ${paymentError.message}`);
  const paid = new Map<string,number>();
  for (const p of payments ?? []) paid.set(p.sale_id, (paid.get(p.sale_id) ?? 0) + number(p.amount));
  return data.map(s => ({ ...s, grand_total: number(s.grand_total), collected: paid.get(s.id) ?? 0 }));
}

export async function getExpenses(): Promise<ExpenseRow[]> {
  const db = await createClient();
  const { data, error } = await db.from("expenses")
    .select("id,category,description,amount,paid_at,account_id")
    .order("paid_at", { ascending: false }).limit(100);
  if (error) throw new Error(`Expenses: ${error.message}`);
  return (data ?? []).map(e => ({ ...e, amount: number(e.amount) }));
}

export async function getAccounts(): Promise<AccountRow[]> {
  const db = await createClient();
  const { data, error } = await db.rpc("account_balances_v4");
  if (error) throw new Error(`Accounts: ${error.message}. Run Phase 4 SQL first.`);
  return ((data ?? []) as Array<Record<string,unknown>>).map(a => ({
    id: String(a.id), name: String(a.name), kind: a.kind as AccountRow["kind"],
    opening_balance: number(a.opening_balance), balance: number(a.balance),
  }));
}

export async function getAccountEntries(): Promise<AccountEntry[]> {
  const db = await createClient();
  const { data, error } = await db.from("account_entries")
    .select("id,account_id,kind,amount,occurred_at,note")
    .order("occurred_at", { ascending: false }).limit(100);
  if (error) throw new Error(`Account transactions: ${error.message}`);
  return (data ?? []).map(e => ({ ...e, amount: number(e.amount) }));
}

export async function getStockMovements(): Promise<StockMovement[]> {
  const db = await createClient();
  const { data, error } = await db.from("inventory_movements")
    .select("id,product_id,movement_type,quantity_delta,notes,created_at")
    .order("created_at", { ascending: false }).limit(80);
  if (error) throw new Error(`Stock movements: ${error.message}`);
  return data ?? [];
}

export async function getLegacyUnassigned(): Promise<{ payments: number; expenses: number }> {
  const db = await createClient();
  const [p,e] = await Promise.all([
    db.from("payments").select("id", { count:"exact",head:true }).is("account_id", null),
    db.from("expenses").select("id", { count:"exact",head:true }).is("account_id", null),
  ]);
  if (p.error) throw new Error(p.error.message);
  if (e.error) throw new Error(e.error.message);
  return { payments:p.count ?? 0, expenses:e.count ?? 0 };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const db = await createClient();
  const { data, error } = await db.rpc("dashboard_summary_v4");
  if (error) throw new Error(`Dashboard: ${error.message}. Run Phase 4 SQL first.`);
  if (!data || typeof data !== "object") throw new Error("Dashboard returned no data");
  const d = data as Record<string,unknown>;
  return {
    sales_today:number(d.sales_today), orders_today:number(d.orders_today),
    received_today:number(d.received_today), expenses_today:number(d.expenses_today),
    product_cost_today:number(d.product_cost_today), pending_total:number(d.pending_total),
    purchases_today:number(d.purchases_today), refunds_today:number(d.refunds_today),
    write_offs_today:number(d.write_offs_today),
    chart: Array.isArray(d.chart) ? d.chart.map(p => ({date:String(p.date),sales:number(p.sales)})) : [],
    expense_categories: Array.isArray(d.expense_categories) ? d.expense_categories.map(c => ({category:String(c.category), amount:number(c.amount)})) : [],
  };
}

export function formatBusinessDate(iso:string):string {
  return new Intl.DateTimeFormat("en-NP", { dateStyle:"medium", timeStyle:"short", timeZone:"Asia/Kathmandu" }).format(new Date(iso));
}
