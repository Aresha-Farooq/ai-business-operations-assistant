import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Every guarded business function must reject BEFORE touching the database.
// The database mock throws on any access, so a function that reaches the DB
// before checking permissions fails these tests with "DB accessed".
// ---------------------------------------------------------------------------

vi.mock("../../packages/auth/session", () => ({
  getCurrentUser: vi.fn(),
  requireCurrentUser: vi.fn(),
}));

vi.mock("@business-platform/database", () => ({
  db: {
    get sql(): never {
      throw new Error("DB accessed");
    },
    transaction: () => {
      throw new Error("DB accessed");
    },
  },
  getDbRuntime: () => {
    throw new Error("DB accessed");
  },
  createAuditLog: () => {
    throw new Error("DB accessed");
  },
}));

import { getCurrentUser } from "../../packages/auth/session";
import * as customer from "../../packages/business/customer";
import { getCustomer } from "../../packages/business/get-customer";
import { searchCustomers } from "../../packages/business/search-customers";
import * as invoice from "../../packages/business/get-invoice";
import { getLowStockProducts } from "../../packages/business/low-stock";
import * as inventory from "../../packages/business/inventory";
import { getInventoryMovements as getMovementsQuery } from "../../packages/business/inventory-query";
import { createOrder } from "../../packages/business/order";
import { getOrders, getOrderById } from "../../packages/business/order-query";
import { getOverdueInvoices } from "../../packages/business/overdue-invoices";
import { getSalesReport } from "../../packages/business/sales-report";
import { createPayment } from "../../packages/business/payment";
import { refundPayment } from "../../packages/business/payment/refund-payment";
import { verifyPayment } from "../../packages/business/payment/verify-payment";
import * as product from "../../packages/business/product";
import { updateOrderStatus } from "../../packages/business/update-order-status";
import { updateShippingStatus } from "../../packages/business/update-shipping-status";

const mockedGetCurrentUser = vi.mocked(getCurrentUser);

const gateway = {} as never;
const any = {} as never;

type Role = "OWNER" | "MANAGER" | "STAFF";

type Case = {
  name: string;
  // roles that must be rejected with "Forbidden."
  forbidden: Role[];
  call: () => Promise<unknown>;
};

const cases: Case[] = [
  // customers
  { name: "getCustomers", forbidden: [], call: () => customer.getCustomers() },
  { name: "createCustomer", forbidden: ["STAFF"], call: () => customer.createCustomer(any) },
  { name: "getCustomerById", forbidden: [], call: () => customer.getCustomerById(1) },
  { name: "updateCustomer", forbidden: ["STAFF"], call: () => customer.updateCustomer(1, any) },
  { name: "deleteCustomer", forbidden: ["STAFF"], call: () => customer.deleteCustomer(1) },
  { name: "getCustomer", forbidden: [], call: () => getCustomer(1) },
  { name: "searchCustomers", forbidden: [], call: () => searchCustomers("ab") },

  // products
  { name: "getProducts", forbidden: [], call: () => product.getProducts() },
  { name: "getProductById", forbidden: [], call: () => product.getProductById(1) },
  { name: "createProduct", forbidden: ["STAFF"], call: () => product.createProduct(any) },
  { name: "updateProduct", forbidden: ["STAFF"], call: () => product.updateProduct(1, any) },
  { name: "deleteProduct", forbidden: ["STAFF"], call: () => product.deleteProduct(1) },

  // inventory
  { name: "changeStock", forbidden: ["STAFF"], call: () => inventory.changeStock(any) },
  { name: "inventory.getInventoryMovements", forbidden: [], call: () => inventory.getInventoryMovements() },
  { name: "inventory.getLowStockProducts", forbidden: [], call: () => inventory.getLowStockProducts() },
  { name: "getProductStockHistory", forbidden: [], call: () => inventory.getProductStockHistory(1) },
  { name: "inventory-query.getInventoryMovements", forbidden: [], call: () => getMovementsQuery() },
  { name: "low-stock.getLowStockProducts", forbidden: [], call: () => getLowStockProducts() },

  // orders
  { name: "createOrder", forbidden: ["STAFF"], call: () => createOrder({ customerId: 1, items: [{ productId: 1, quantity: 1 }] }) },
  { name: "getOrders", forbidden: [], call: () => getOrders() },
  { name: "getOrderById", forbidden: [], call: () => getOrderById(1) },
  { name: "updateOrderStatus", forbidden: ["STAFF"], call: () => updateOrderStatus({ orderId: 1, status: "CONFIRMED" }) },
  { name: "updateShippingStatus", forbidden: ["STAFF"], call: () => updateShippingStatus({ orderId: 1, shippingStatus: "SHIPPED" }) },

  // payments
  { name: "createPayment", forbidden: ["STAFF"], call: () => createPayment({ orderId: 1, method: "COD" }, gateway) },
  { name: "refundPayment", forbidden: ["STAFF"], call: () => refundPayment(1, gateway) },
  { name: "verifyPayment", forbidden: ["STAFF"], call: () => verifyPayment("txn", gateway) },

  // invoices / reports
  { name: "getInvoice", forbidden: ["STAFF"], call: () => invoice.getInvoice(1) },
  { name: "getInvoiceIds", forbidden: ["STAFF"], call: () => invoice.getInvoiceIds() },
  { name: "checkInvoiceForOrder", forbidden: ["STAFF"], call: () => invoice.checkInvoiceForOrder(1) },
  { name: "createTestInvoice", forbidden: ["STAFF"], call: () => invoice.createTestInvoice(1) },
  { name: "getOverdueInvoices", forbidden: ["STAFF"], call: () => getOverdueInvoices() },
  { name: "getSalesReport", forbidden: ["STAFF"], call: () => getSalesReport() },
];

function loginAs(role: Role) {
  mockedGetCurrentUser.mockResolvedValue({
    userId: 1,
    organizationId: 1,
    role,
  });
}

describe("business functions enforce permissions before any DB access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  for (const c of cases) {
    it(`${c.name}: unauthenticated -> "Not authenticated."`, async () => {
      mockedGetCurrentUser.mockResolvedValue(null);

      await expect(c.call()).rejects.toThrow("Not authenticated.");
    });

    for (const role of c.forbidden) {
      it(`${c.name}: ${role} -> "Forbidden."`, async () => {
        loginAs(role);

        await expect(c.call()).rejects.toThrow("Forbidden.");
      });
    }

    // Allowed roles must get PAST the guard. With the DB mocked to throw, the
    // observable proof is that the error is "DB accessed" (or any non-auth
    // error), never "Forbidden." / "Not authenticated.".
    for (const role of (["OWNER", "MANAGER", "STAFF"] as Role[]).filter(
      (r) => !c.forbidden.includes(r)
    )) {
      it(`${c.name}: ${role} passes the permission guard`, async () => {
        loginAs(role);

        await c.call().then(
          () => undefined,
          (error: unknown) => {
            const message =
              error instanceof Error ? error.message : String(error);
            expect(message).not.toBe("Forbidden.");
            expect(message).not.toBe("Not authenticated.");
          }
        );
      });
    }
  }
});
