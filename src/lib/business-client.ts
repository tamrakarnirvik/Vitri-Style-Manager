
export type {
  Product,
  SaleRow,
  ExpenseRow,
  AccountRow,
  AccountEntry,
  StockMovement,
  DaySale,
  CategoryTotal,
  DashboardSummary,
  PeriodReport,
} from "./business";

export function formatBusinessDate(
  iso: string
): string {
  return new Intl.DateTimeFormat("en-NP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kathmandu",
  }).format(new Date(iso));
}
