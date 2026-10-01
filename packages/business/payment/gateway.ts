export type PaymentGatewayStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED";

export type CreateGatewayPaymentInput = {
  paymentId: number;
  amount: number;
  currency: string;
  orderId: number;
};

export type GatewayPaymentResult = {
  status: PaymentGatewayStatus;
  transactionId?: string;
  paymentUrl?: string;
};

export interface PaymentGateway {
  createPayment(
    input: CreateGatewayPaymentInput
  ): Promise<GatewayPaymentResult>;

  verifyPayment(
    transactionId: string
  ): Promise<GatewayPaymentResult>;

  refundPayment(
    transactionId: string,
    amount: number
  ): Promise<GatewayPaymentResult>;
}