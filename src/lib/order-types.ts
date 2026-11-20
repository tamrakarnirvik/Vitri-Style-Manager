// Safe for both browser and server imports. No next/headers dependencies.
export type DeliveryStatus =
  | "pending"
  | "packed"
  | "dispatched"
  | "delivered"
  | "failed_delivery";

export type DeliveryRow = {
  id: string;
  sale_id: string;
  phone: string | null;
  delivery_address: string | null;
  courier: string | null;
  tracking_number: string | null;
  expected_delivery_date: string | null;
  delivery_notes: string | null;
  status: DeliveryStatus;
  created_at: string;
  updated_at: string;
};

export type DeliveryEvent = {
  id: string;
  delivery_id: string;
  previous_status: string | null;
  new_status: string;
  note: string | null;
  changed_at: string;
};

export const deliveryLabels: Record<DeliveryStatus, string> = {
  pending: "Pending",
  packed: "Packed",
  dispatched: "Dispatched",
  delivered: "Delivered",
  failed_delivery: "Delivery failed",
};

export const nextDeliveryStatus: Record<DeliveryStatus, DeliveryStatus[]> = {
  pending: ["packed"],
  packed: ["dispatched", "pending"],
  dispatched: ["delivered", "failed_delivery"],
  failed_delivery: ["dispatched", "pending"],
  delivered: [],
};
