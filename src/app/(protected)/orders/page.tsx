import { OrdersWorkspace } from "@/components/orders/orders-workspace";
import { getAccounts, getSales } from "@/lib/business";
import { getDeliveryData } from "@/lib/business-orders";

export default async function OrdersPage() {
  const [sales, accounts] = await Promise.all([getSales(), getAccounts()]);
  const { deliveries, events, costs } = await getDeliveryData(sales.map((s) => s.id));
  return (
    <OrdersWorkspace
      sales={sales}
      accounts={accounts}
      deliveries={deliveries}
      events={events}
      costs={costs}
    />
  );
}
