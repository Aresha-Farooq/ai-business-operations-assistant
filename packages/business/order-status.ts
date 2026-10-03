export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "CANCELLED"
  | "COMPLETED";

export type ShippingStatus =
  | "NOT_SHIPPED"
  | "SHIPPED"
  | "DELIVERED";

const allowedOrderTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["COMPLETED", "CANCELLED"],
  CANCELLED: [],
  COMPLETED: [],
};

const allowedShippingTransitions: Record<
  ShippingStatus,
  ShippingStatus[]
> = {
  NOT_SHIPPED: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
};

export function canTransitionOrderStatus(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus
) {
  return allowedOrderTransitions[currentStatus].includes(nextStatus);
}

export function canTransitionShippingStatus(
  currentStatus: ShippingStatus,
  nextStatus: ShippingStatus
) {
  return allowedShippingTransitions[currentStatus].includes(nextStatus);
}