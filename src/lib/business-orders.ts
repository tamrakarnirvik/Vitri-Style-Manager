// Server-only reads. Do not import this module from a "use client" component.
import { createClient } from "@/lib/supabase/server";
import type { DeliveryRow, DeliveryEvent } from "@/lib/order-types";

export async function getDeliveryData(saleIds: string[]): Promise<{
  deliveries: DeliveryRow[];
  events: DeliveryEvent[];
  costs: Record<string, number>;
}> {
  if (saleIds.length === 0) {
    return { deliveries: [], events: [], costs: {} };
  }

  const db = await createClient();

  // Fetch delivery details and historical product costs independently.
  // Costs must be loaded even for orders with no delivery record yet.
  const [deliveryResult, costResult] = await Promise.all([
    db.from("order_deliveries")
      .select("id,sale_id,phone,delivery_address,courier,tracking_number,expected_delivery_date,delivery_notes,status,created_at,updated_at")
      .in("sale_id", saleIds)
      .limit(100),
    db.rpc("order_costs_v5", { p_sale_ids: saleIds }),
  ]);

  if (deliveryResult.error) {
    throw new Error(`Order deliveries: ${deliveryResult.error.message}. Apply Phase 5 SQL first.`);
  }
  if (costResult.error) {
    throw new Error(`Order costs: ${costResult.error.message}. Apply Phase 5 SQL first.`);
  }

  const rows = (deliveryResult.data ?? []) as DeliveryRow[];
  const costs: Record<string, number> = {};

  for (const item of (costResult.data ?? []) as Array<{
    sale_id: string;
    product_cost: number | string;
  }>) {
    costs[item.sale_id] = Number(item.product_cost);
  }

  if (rows.length === 0) {
    return { deliveries: [], events: [], costs };
  }

  const { data: events, error: eventError } = await db
    .from("order_delivery_events")
    .select("id,delivery_id,previous_status,new_status,note,changed_at")
    .in("delivery_id", rows.map((r) => r.id))
    .order("changed_at", { ascending: false })
    .limit(500);

  if (eventError) {
    throw new Error(`Delivery history: ${eventError.message}`);
  }

  return {
    deliveries: rows,
    events: (events ?? []) as DeliveryEvent[],
    costs,
  };
}
