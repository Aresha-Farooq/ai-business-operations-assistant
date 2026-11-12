
"use client";

import { useState } from "react";
import { useCart } from "../../../cart-provider";

type AddToCartButtonProps = {
  productId: string;
  storeSlug: string;
  name: string;
  price: number;
  imageUrl: string | null;
  stockQuantity: number;
};

export default function AddToCartButton({
  productId,
  storeSlug,
  name,
  price,
  imageUrl,
  stockQuantity,
}: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    addToCart({
      productId,
      storeSlug,
      name,
      price,
      imageUrl,
    });

    setAdded(true);
  };

  return (
    <button
      onClick={handleAddToCart}
      disabled={stockQuantity <= 0}
      className="mt-8 w-full rounded-lg bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-gray-400"
    >
      {stockQuantity <= 0
        ? "Out of Stock"
        : added
          ? "Added to Cart ✓"
          : "Add to Cart"}
    </button>
  );
}
