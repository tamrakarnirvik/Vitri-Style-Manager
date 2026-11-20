import { SalesWorkspace } from "@/components/sales/sales-workspace";
import { getAccounts, getProducts, getSales } from "@/lib/business";
export default async function SalesPage(){
 const [products,sales,accounts]=await Promise.all([getProducts(),getSales(),getAccounts()]);
 return <SalesWorkspace products={products} sales={sales} accounts={accounts}/>;
}
