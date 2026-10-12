"use client";

import { useCart } from "./cart-context";

type AddToCartButtonProps = {
  productId: number;
};

export function AddToCartButton({
  productId,
}: AddToCartButtonProps) {
  const { addToCart } = useCart();

  return (
    <button
      type="button"
      onClick={() => addToCart(productId)}
    >
      Add to Cart
    </button>
  );
}