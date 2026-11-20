/**
 * Phase 1 uses clearly labelled demonstration data.
 * Replace these arrays with authenticated Supabase queries in Phase 2.
 */
export type PaymentStatus = "Paid" | "Pending";

export type Sale = {
  id: string;
  product: string;
  quantity: number;
  total: number;
  costOfGoods: number;
  collected: number;
  method: "Cash" | "Bank Transfer" | "eSewa" | "Khalti" | "COD";
  paymentStatus: PaymentStatus;
};

export const todaySales: Sale[] = [
  { id: "VS-1007", product: "Ankle Socks Pack", quantity: 3, total: 750, costOfGoods: 360, collected: 750, method: "eSewa", paymentStatus: "Paid" },
  { id: "VS-1006", product: "Cotton Briefs", quantity: 2, total: 1200, costOfGoods: 580, collected: 1200, method: "Bank Transfer", paymentStatus: "Paid" },
  { id: "VS-1005", product: "Knitted Winter Hat", quantity: 1, total: 650, costOfGoods: 310, collected: 0, method: "COD", paymentStatus: "Pending" },
  { id: "VS-1004", product: "Sheer Stockings", quantity: 2, total: 1400, costOfGoods: 700, collected: 1400, method: "Cash", paymentStatus: "Paid" },
  { id: "VS-1003", product: "Sports Bra", quantity: 1, total: 2200, costOfGoods: 1050, collected: 0, method: "COD", paymentStatus: "Pending" },
  { id: "VS-1002", product: "Cotton Socks", quantity: 4, total: 800, costOfGoods: 400, collected: 800, method: "Cash", paymentStatus: "Paid" },
  { id: "VS-1001", product: "Seamless Briefs", quantity: 2, total: 1500, costOfGoods: 720, collected: 1500, method: "eSewa", paymentStatus: "Paid" },
];

export const todayExpenses = [
  { id: "EX-001", category: "Packaging", amount: 250 },
  { id: "EX-002", category: "Delivery", amount: 450 },
  { id: "EX-003", category: "Marketing", amount: 300 },
];

export const lowStockProducts = [
  { id: "PR-001", name: "Knitted Winter Hat", variant: "Grey / One size", stock: 2, reorderAt: 5 },
  { id: "PR-002", name: "Sheer Stockings", variant: "Nude / M", stock: 3, reorderAt: 6 },
  { id: "PR-003", name: "Cotton Briefs", variant: "Black / S", stock: 4, reorderAt: 8 },
];

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export const todaySummary = {
  sales: sum(todaySales.map((sale) => sale.total)),
  received: sum(todaySales.map((sale) => sale.collected)),
  productCost: sum(todaySales.map((sale) => sale.costOfGoods)),
  expenses: sum(todayExpenses.map((expense) => expense.amount)),
  orders: todaySales.length,
};

export const estimatedProfit =
  todaySummary.sales - todaySummary.productCost - todaySummary.expenses;

export const paymentsPending = todaySummary.sales - todaySummary.received;

/** Historical chart points are illustrative, not financial records. */
export const last7Days = [
  { label: "Sat", sales: 3500 },
  { label: "Sun", sales: 4200 },
  { label: "Mon", sales: 3900 },
  { label: "Tue", sales: 6100 },
  { label: "Wed", sales: 5400 },
  { label: "Thu", sales: 7200 },
  { label: "Fri", sales: todaySummary.sales },
];

export const last30Days = Array.from({ length: 30 }, (_, index) => ({
  label: `Day ${index + 1}`,
  sales:
    index === 29
      ? todaySummary.sales
      : 2900 + ((index * 1147 + (index % 4) * 390) % 5700),
}));
