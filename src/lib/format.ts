export function formatNPR(amount: number): string {
  return `Rs. ${new Intl.NumberFormat("en-NP", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}
