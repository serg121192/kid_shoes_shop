"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api, { getMediaUrl } from "@/app/lib/api";
import { Cart } from "@/app/types";
import { useAuth } from "@/app/context/AuthContext";
import { useShop } from "@/app/context/ShopContext";
import { Trash2, ShoppingBag } from "lucide-react";

function calcTotal(cart: Cart): number {
  return cart.cart_items.reduce(
    (sum, item) => sum + Number(item.product_size.product.discounted_price) * item.quantity,
    0
  );
}

export default function CartPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast, setCartCount } = useShop();
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    try {
      const response = await api.get<{ results: Cart[] } | Cart[]>("/shop/cart/");
      const data = response.data;
      const list = Array.isArray(data) ? data : data.results;
      const fetched = list[0] ?? null;
      setCart(fetched);
      if (fetched) {
        const total = fetched.cart_items.reduce((s, i) => s + i.quantity, 0);
        setCartCount(total);
      }
    } catch {
      setCart(null);
    } finally {
      setIsLoading(false);
    }
  }, [setCartCount]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.push("/login?next=/cart"); return; }
    if (!authLoading && isAuthenticated) {
      const pendingItem = sessionStorage.getItem("pending_cart_item");
      if (pendingItem) {
        sessionStorage.removeItem("pending_cart_item");
        api.post("/shop/cart/me/cart_add/", { product_size: Number(pendingItem), quantity: 1 })
          .then(() => { setCartCount((c) => c + 1); })
          .catch(() => { })
          .finally(() => fetchCart());
      } else {
        fetchCart();
      }
    }
  }, [authLoading, isAuthenticated, router, fetchCart, setCartCount]);

  const handleRemove = async (productSizeId: number, itemQty: number) => {
    // Optimistic update: remove item immediately
    setCart((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, cart_items: prev.cart_items.filter((i) => i.product_size.id !== productSizeId) };
      updated.total_price = calcTotal(updated);
      return updated;
    });
    setCartCount((c) => Math.max(0, c - itemQty));

    try {
      await api.post("/shop/cart/me/cart_remove/", { product_size: productSizeId });
      showToast("Товар видалено з кошика");
    } catch {
      // Rollback
      await fetchCart();
      showToast("Не вдалося видалити товар", "error");
    }
  };

  const handleChangeQty = async (productSizeId: number, delta: number) => {
    // Optimistic update: change quantity immediately
    setCart((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        cart_items: prev.cart_items.map((i) =>
          i.product_size.id === productSizeId
            ? { ...i, quantity: i.quantity + delta }
            : i
        ),
      };
      updated.total_price = calcTotal(updated);
      return updated;
    });
    setCartCount((c) => Math.max(0, c + delta));

    try {
      if (delta > 0) {
        await api.post("/shop/cart/me/cart_add/", { product_size: productSizeId, quantity: delta });
      } else {
        await api.post("/shop/cart/me/cart_remove/", { product_size: productSizeId, quantity: Math.abs(delta) });
      }
    } catch {
      // Rollback
      await fetchCart();
      showToast("Не вдалося оновити кількість", "error");
    }
  };

  const total = cart ? calcTotal(cart) : 0;

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (!cart || cart.cart_items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <ShoppingBag size={64} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Кошик порожній</h2>
        <p className="text-gray-500 mb-6">Додайте товари з каталогу</p>
        <Link href="/products" className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
          До каталогу
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Кошик</h1>

      <div className="space-y-4">
        {cart.cart_items.map((item) => {
          const { product_size, quantity } = item;
          const product = product_size.product;
          const imageUrl = getMediaUrl(product.main_image);
          const stockQty = product_size.quantity;
          return (
            <div
              key={product_size.id}
              className="bg-white rounded-xl shadow-sm p-4"
            >
              <div className="flex items-start gap-4">
                {/* Image */}
                <Link href={`/products/${product.slug}`} className="shrink-0">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg relative overflow-hidden">
                    {imageUrl ? (
                      <Image src={imageUrl} alt={product.model_name} fill unoptimized className="object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-3xl">👟</div>
                    )}
                  </div>
                </Link>

                {/* Info block */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/products/${product.slug}`}>
                        <h3 className="font-semibold text-gray-800 hover:text-[#72a1ff] transition-colors truncate">
                          {product.vendor} {product.model_name}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-500">Розмір {product_size.size}</p>
                      <p className="text-sm text-[#5291ff] mt-0.5">
                        {Number(product.discounted_price).toFixed(2)} грн / шт
                      </p>
                    </div>
                    {/* Delete button — top-right on mobile */}
                    <button
                      onClick={() => handleRemove(product_size.id, quantity)}
                      className="sm:hidden text-gray-400 hover:text-red-500 transition-colors shrink-0 p-1"
                      title="Видалити"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* Bottom row: qty stepper + total + delete (desktop) */}
                  <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => quantity > 1 && handleChangeQty(product_size.id, -1)}
                        disabled={quantity <= 1}
                        className="w-8 h-8 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-medium">{quantity}</span>
                      <button
                        onClick={() => handleChangeQty(product_size.id, 1)}
                        disabled={quantity >= stockQty}
                        className="w-8 h-8 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <p className="font-bold text-gray-900">
                        {(Number(product.discounted_price) * quantity).toFixed(2)} грн
                      </p>
                      {/* Delete button — inline on desktop */}
                      <button
                        onClick={() => handleRemove(product_size.id, quantity)}
                        className="hidden sm:block text-gray-400 hover:text-red-500 transition-colors"
                        title="Видалити"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center text-xl font-bold text-gray-900">
          <span>Разом:</span>
          <span>{total.toFixed(2)} грн</span>
        </div>

        <button
          type="button"
          onClick={() => {
            setCartCount(0);
            router.push("/checkout");
          }}
          className="block w-full bg-teal-600 hover:bg-teal-700 text-white text-center font-semibold py-3 rounded-xl transition-colors"
        >
          Забронювати розміри
        </button>
      </div>
    </div>
  );
}
