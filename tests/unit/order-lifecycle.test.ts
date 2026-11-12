import { describe, expect, it } from "vitest";
import {
  OrderLifecycleError,
  canTransitionOrderStatus,
  getOrderTransitionError,
  getShippingTransitionError,
  type OrderStatus,
  type ShippingStatus,
} from "../../packages/business/order-status";

const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "CANCELLED",
  "COMPLETED",
];

const SHIPPING_STATUSES: ShippingStatus[] = [
  "NOT_SHIPPED",
  "SHIPPED",
  "DELIVERED",
];

// Written out explicitly: changing the state machine must be a deliberate
// change to this table as well.
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["COMPLETED", "CANCELLED"],
  CANCELLED: [],
  COMPLETED: [],
};

describe("order status transitions", () => {
  for (const from of ORDER_STATUSES) {
    for (const to of ORDER_STATUSES) {
      const allowed = ALLOWED[from].includes(to);

      it(`${from} -> ${to} is ${allowed ? "allowed" : "rejected"}`, () => {
        // Best-case context so only the table decides the outcome.
        const error = getOrderTransitionError(
          {
            status: from,
            shippingStatus:
              to === "COMPLETED" ? "DELIVERED" : "NOT_SHIPPED",
            hasPaidPayment: false,
          },
          to
        );

        expect(error === null).toBe(allowed);
        expect(canTransitionOrderStatus(from, to)).toBe(allowed);
      });
    }
  }

  it("never allows leaving CANCELLED or COMPLETED", () => {
    for (const from of ["CANCELLED", "COMPLETED"] as OrderStatus[]) {
      for (const to of ORDER_STATUSES) {
        for (const shippingStatus of SHIPPING_STATUSES) {
          expect(
            getOrderTransitionError(
              { status: from, shippingStatus, hasPaidPayment: false },
              to
            ) === null
          ).toBe(false);
        }
      }
    }
  });

  it("never allows moving back to PENDING", () => {
    for (const from of ORDER_STATUSES) {
      expect(
        getOrderTransitionError(
          {
            status: from,
            shippingStatus: "NOT_SHIPPED",
            hasPaidPayment: false,
          },
          "PENDING"
        ) === null
      ).toBe(false);
    }
  });
});

describe("completion rule", () => {
  it("requires the order to be delivered", () => {
    for (const shippingStatus of ["NOT_SHIPPED", "SHIPPED"] as ShippingStatus[]) {
      expect(
        getOrderTransitionError(
          { status: "PROCESSING", shippingStatus, hasPaidPayment: false },
          "COMPLETED"
        ) === null
      ).toBe(false);
    }

    expect(
      getOrderTransitionError(
        {
          status: "PROCESSING",
          shippingStatus: "DELIVERED",
          hasPaidPayment: false,
        },
        "COMPLETED"
      )
    ).toBeNull();
  });

  it("does not require a paid payment (COD is not auto-settled)", () => {
    expect(
      getOrderTransitionError(
        {
          status: "PROCESSING",
          shippingStatus: "DELIVERED",
          hasPaidPayment: false,
        },
        "COMPLETED"
      )
    ).toBeNull();
  });
});

describe("cancellation rules", () => {
  for (const from of ["PENDING", "CONFIRMED", "PROCESSING"] as OrderStatus[]) {
    it(`${from} order that is not shipped can be cancelled`, () => {
      expect(
        getOrderTransitionError(
          {
            status: from,
            shippingStatus: "NOT_SHIPPED",
            hasPaidPayment: false,
          },
          "CANCELLED"
        )
      ).toBeNull();
    });
  }

  it("a shipped or delivered order cannot be cancelled", () => {
    for (const shippingStatus of ["SHIPPED", "DELIVERED"] as ShippingStatus[]) {
      expect(
        getOrderTransitionError(
          { status: "PROCESSING", shippingStatus, hasPaidPayment: false },
          "CANCELLED"
        ) === null
      ).toBe(false);
    }
  });

  it("an order with a paid payment cannot be cancelled until refunded", () => {
    const error = getOrderTransitionError(
      {
        status: "CONFIRMED",
        shippingStatus: "NOT_SHIPPED",
        hasPaidPayment: true,
      },
      "CANCELLED"
    );

    expect(error === null).toBe(false);
    expect(String(error).includes("Refund")).toBe(true);
  });
});

describe("shipping transitions", () => {
  it("NOT_SHIPPED -> SHIPPED -> DELIVERED is allowed while PROCESSING", () => {
    expect(
      getShippingTransitionError(
        { status: "PROCESSING", shippingStatus: "NOT_SHIPPED" },
        "SHIPPED"
      )
    ).toBeNull();

    expect(
      getShippingTransitionError(
        { status: "PROCESSING", shippingStatus: "SHIPPED" },
        "DELIVERED"
      )
    ).toBeNull();
  });

  it("cannot skip SHIPPED", () => {
    expect(
      getShippingTransitionError(
        { status: "PROCESSING", shippingStatus: "NOT_SHIPPED" },
        "DELIVERED"
      ) === null
    ).toBe(false);
  });

  it("cannot go backwards or repeat", () => {
    for (const from of SHIPPING_STATUSES) {
      for (const to of SHIPPING_STATUSES) {
        const forward =
          (from === "NOT_SHIPPED" && to === "SHIPPED") ||
          (from === "SHIPPED" && to === "DELIVERED");

        if (!forward) {
          expect(
            getShippingTransitionError(
              { status: "PROCESSING", shippingStatus: from },
              to
            ) === null
          ).toBe(false);
        }
      }
    }
  });

  it("is rejected unless the order is PROCESSING", () => {
    for (const status of ORDER_STATUSES.filter((s) => s !== "PROCESSING")) {
      expect(
        getShippingTransitionError(
          { status, shippingStatus: "NOT_SHIPPED" },
          "SHIPPED"
        ) === null
      ).toBe(false);
    }
  });
});

describe("OrderLifecycleError", () => {
  it("carries a code and message", () => {
    const error = new OrderLifecycleError("CONFLICT", "boom");

    expect(error instanceof Error).toBe(true);
    expect(error.code).toBe("CONFLICT");
    expect(error.message).toBe("boom");
  });
});
