
type SuccessPageProps = {
  searchParams: Promise<{
    orderId?: string;
  }>;
};
export default async function CheckoutSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const { orderId } = await searchParams;

  return (
    <main className="mx-auto max-w-2xl px-6 py-24 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">
        ✓
      </div>

      <h1 className="mt-6 text-3xl font-bold">
        Order placed successfully!
      </h1>

      <p className="mt-3 text-gray-600">
        Thank you for shopping with Alliance Technologies.
        Your order has been received.
      </p>

      {orderId && (
        <p className="mt-5 font-semibold">
          Order ID: #{orderId}
        </p>
      )}

      <p className="mt-3 text-gray-600">
        Payment method: Cash on Delivery (COD)
      </p>

      <a
        href={`/store/alliance-technologies`}
        className="mt-8 inline-block rounded-lg bg-black px-6 py-3 text-white"
      >
        Continue shopping
      </a>
    </main>
  );
}
