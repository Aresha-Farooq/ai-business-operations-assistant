import { describe, expect, it } from "vitest";
import {
  orderStatusSchema,
  shippingStatusSchema,
} from "../../packages/validation/order-status";

describe("order status request validation", () => {
  it("accepts every status an order can be moved to", () => {
    for (const status of ["CONFIRMED", "PROCESSING", "CANCELLED", "COMPLETED"]) {
      expect(orderStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it("rejects PENDING, unknown, lowercase and non-string values", () => {
    for (const value of ["PENDING", "SHIPPED", "pending", "", 1, null, undefined]) {
      expect(orderStatusSchema.safeParse(value).success).toBe(false);
    }
  });

  it("only accepts SHIPPED and DELIVERED as shipping targets", () => {
    expect(shippingStatusSchema.safeParse("SHIPPED").success).toBe(true);
    expect(shippingStatusSchema.safeParse("DELIVERED").success).toBe(true);
    expect(shippingStatusSchema.safeParse("NOT_SHIPPED").success).toBe(false);
    expect(shippingStatusSchema.safeParse("RETURNED").success).toBe(false);
  });
});
