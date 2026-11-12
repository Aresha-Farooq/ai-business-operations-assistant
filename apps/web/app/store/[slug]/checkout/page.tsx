
"use client";

import { useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCart } from "../../cart-provider";

type CheckoutForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  deliveryInstructions: string;
};

export default function CheckoutPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();

  const { items, clearCart } = useCart();
  const storeItems = items.filter((item) => item.storeSlug === slug);

  const [form, setForm] = useState<CheckoutForm>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    deliveryInstructions: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const subtotal = storeItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (storeItems.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/store/${slug}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          items: storeItems.map((item) => ({
            productId: Number(item.productId),
            quantity: item.quantity,
          })),
          paymentMethod: "COD",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to place your order.");
      }

      const orderId = data.order?.id;

      if (!orderId) {
        throw new Error("Order was created, but its confirmation ID was not returned.");
      }

      clearCart();
      router.push(
        `/store/${slug}/checkout/success?orderId=${orderId}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (storeItems.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <p className="mt-3 text-gray-600">
          Add some products before proceeding to checkout.
        </p>
        <button
          onClick={() => router.push(`/store/${slug}`)}
          className="mt-6 rounded-lg bg-black px-5 py-3 text-white"
        >
          Continue shopping
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-2">
      <section>
        <h1 className="text-3xl font-semibold">Guest checkout</h1>
        <p className="mt-2 text-gray-600">
          Enter your contact and delivery details.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium">
              Full name
            </label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              minLength={2}
              className="w-full rounded-lg border px-4 py-3"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full rounded-lg border px-4 py-3"
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-2 block text-sm font-medium">
              Phone number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              required
              minLength={7}
              className="w-full rounded-lg border px-4 py-3"
            />
          </div>

          <div>
            <label htmlFor="address" className="mb-2 block text-sm font-medium">
              Delivery address
            </label>
            <textarea
              id="address"
              name="address"
              value={form.address}
              onChange={handleChange}
              required
              minLength={5}
              rows={3}
              className="w-full rounded-lg border px-4 py-3"
            />
          </div>

          <div>
            <label htmlFor="city" className="mb-2 block text-sm font-medium">
              City
            </label>
            <input
              id="city"
              name="city"
              value={form.city}
              onChange={handleChange}
              required
              minLength={2}
              className="w-full rounded-lg border px-4 py-3"
            />
          </div>

          <div>
            <label
              htmlFor="deliveryInstructions"
              className="mb-2 block text-sm font-medium"
            >
              Delivery instructions (optional)
            </label>
            <textarea
              id="deliveryInstructions"
              name="deliveryInstructions"
              value={form.deliveryInstructions}
              onChange={handleChange}
              rows={2}
              className="w-full rounded-lg border px-4 py-3"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-5 py-3 font-medium text-white disabled:opacity-60"
          >
            {loading ? "Placing order..." : "Place order"}
          </button>
        </form>
      </section>

      <aside className="h-fit rounded-xl border p-6">
        <h2 className="text-xl font-semibold">Order summary</h2>

        <div className="mt-6 space-y-4">
          {storeItems.map((item) => (
            <div
              key={item.productId}
              className="flex justify-between gap-4 text-sm"
            >
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>
                PKR {(item.price * item.quantity).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t pt-4">
          <div className="flex justify-between font-semibold">
            <span>Subtotal</span>
            <span>PKR {subtotal.toLocaleString()}</span>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Payment method: Cash on Delivery (COD)
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Final prices are verified by the server when your order is placed.
          </p>
        </div>
      </aside>
    </main>
  );
}
