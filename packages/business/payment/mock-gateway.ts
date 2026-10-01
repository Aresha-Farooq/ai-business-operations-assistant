import type {
  PaymentGateway,
  CreateGatewayPaymentInput,
  GatewayPaymentResult,
} from "./gateway.js";

export class MockPaymentGateway implements PaymentGateway {
    async createPayment(
  input: CreateGatewayPaymentInput
): Promise<GatewayPaymentResult> {
    return {
  status: "PENDING",
  transactionId: `MOCK-${input.paymentId}`,
  paymentUrl: `/mock-payment/${input.paymentId}`,
};
}
async verifyPayment(
  transactionId: string
): Promise<GatewayPaymentResult> {
  return {
    status: "PAID",
    transactionId,
  };
}
async refundPayment(
  transactionId: string,
  amount: number
): Promise<GatewayPaymentResult> {
  return {
    status: "REFUNDED",
    transactionId,
  };

}
}
