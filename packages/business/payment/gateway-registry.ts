import type { PaymentGateway } from "./gateway.js";
import { MockPaymentGateway } from "./mock-gateway.js";
import { PaymentError, type PaymentMethod } from "./payment-rules.js";

// The single place that decides which gateway handles which payment method.
// A real gateway (for example JazzCash) is added here, behind the
// PaymentGateway interface, without touching the payment services.
//
// Until a real adapter exists, only the development mock gateway is
// available, and never in production.

function unsupported(what: string): PaymentError {
  return new PaymentError(
    "UNSUPPORTED_METHOD",
    `${what} payments are not available yet.`
  );
}

// COD has no gateway: the customer pays on delivery.
export function resolvePaymentGateway(
  method: PaymentMethod
): PaymentGateway | null {
  if (method === "COD") {
    return null;
  }

  if (process.env["NODE_ENV"] === "production") {
    throw unsupported(method);
  }

  return new MockPaymentGateway();
}

// Used when a payment already exists and the gateway is known by name.
export function resolveGatewayByName(
  name: string | null
): PaymentGateway {
  if (name === "MOCK" && process.env["NODE_ENV"] !== "production") {
    return new MockPaymentGateway();
  }

  throw unsupported(name ?? "This");
}
