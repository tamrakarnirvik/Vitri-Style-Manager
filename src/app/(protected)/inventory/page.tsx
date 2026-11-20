import { InventoryWorkspace } from "@/components/inventory/inventory-workspace";
import { getAccounts, getProducts, getStockMovements } from "@/lib/business";
export default async function InventoryPage(){
 const [products,accounts,movements]=await Promise.all([getProducts(),getAccounts(),getStockMovements()]);
 return <InventoryWorkspace products={products} accounts={accounts} movements={movements}/>;
}
