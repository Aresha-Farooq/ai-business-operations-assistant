// Pure order / shipping state machine.
// No imports on purpose: unit-testable without a database or Next.js runtime.

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

// --------------------------------------------------
// Lifecycle errors (mapped to HTTP codes by the API layer)
// --------------------------------------------------

export type OrderLifecycleErrorCode =
  | "NOT_FOUND"
  | "INVALID_TRANSITION"
  | "CONFLICT";

export class OrderLifecycleError extends Error {
  readonly code: OrderLifecycleErrorCode;

  constructor(code: OrderLifecycleErrorCode, message: string) {
    super(message);
    this.name = "OrderLifecycleError";
    this.code = code;
  }
}

export const ORDER_CONFLICT_MESSAGE =
  "The order was changed by another request. Please refresh and try again.";

// --------------------------------------------------
// Transition tables
//
// Order status:   PENDING -> CONFIRMED -> PROCESSING -> COMPLETED
//                 PENDING | CONFIRMED | PROCESSING -> CANCELLED
// Shipping:       NOT_SHIPPED -> SHIPPED -> DELIVERED
//
// "Shipped" and "Delivered" from the business flow are the shipping
// statuses; "Completed" is the order status reached after delivery.
// --------------------------------------------------

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
  return (
    allowedOrderTransitions[currentStatus]?.includes(nextStatus) ??
    false
  );
}

export function canTransitionShippingStatus(
  currentStatus: ShippingStatus,
  nextStatus: ShippingStatus
) {
  return (
    allowedShippingTransitions[currentStatus]?.includes(nextStatus) ??
    false
  );
}

// --------------------------------------------------
// Full rule check (table + cross-field business rules)
// Returns an error message, or null when the change is allowed.
// --------------------------------------------------

export type OrderTransitionContext = {
  status: OrderStatus;
  shippingStatus: ShippingStatus;
  hasPaidPayment: boolean;
};

export function getOrderTransitionError(
  context: OrderTransitionContext,
  nextStatus: OrderStatus
): string | null {
  const { status, shippingStatus, hasPaidPayment } = context;

  if (status === nextStatus) {
    return `Order is already ${status}.`;
  }

  if (!canTransitionOrderStatus(status, nextStatus)) {
    return `Cannot change order status from ${status} to ${nextStatus}.`;
  }

  if (nextStatus === "COMPLETED" && shippingStatus !== "DELIVERED") {
    return "An order can only be completed after it has been delivered.";
  }

  if (nextStatus === "CANCELLED") {
    if (shippingStatus !== "NOT_SHIPPED") {
      return "A shipped order cannot be cancelled.";
    }

    if (hasPaidPayment) {
      return "This order has a paid payment. Refund the payment before cancelling the order.";
    }
  }

  return null;
}

export type ShippingTransitionContext = {
  status: OrderStatus;
  shippingStatus: ShippingStatus;
};

export function getShippingTransitionError(
  context: ShippingTransitionContext,
  nextShippingStatus: ShippingStatus
): string | null {
  const { status, shippingStatus } = context;

  if (shippingStatus === nextShippingStatus) {
    return `Order is already ${shippingStatus}.`;
  }

  if (!canTransitionShippingStatus(shippingStatus, nextShippingStatus)) {
    return `Cannot change shipping status from ${shippingStatus} to ${nextShippingStatus}.`;
  }

  // Shipping only moves while the order is being fulfilled.
  if (status !== "PROCESSING") {
    return `Shipping status can only be changed while the order is PROCESSING. Current order status: ${status}.`;
  }

  return null;
}
