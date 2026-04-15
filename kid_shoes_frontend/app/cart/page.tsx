"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/app/lib/api";
import { Cart } from "@/app/types";
import { useAuth } from "@/app/context/AuthContext";
import { Trash2, ShoppingBag } from "lucide-react";

export default function CartPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    try {
      const response = await api.get<{ results: Cart[] } | Cart[]>("/shop/cart/");
      const data = response.data;
      const list = Array.isArray(data) ? data : data.results;
      setCart(list[0] ?? null);
    } catch {
      setCart(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!authLoading && isAuthenticated) {
      fetchCart();
    }
  }, [authLoading, isAuthenticated, router, fetchCart]);

  const handleRemove = async (productId: number) => {
    try {
      await api.post("/shop/cart/me/cart_remove/", { product: productId });
      fetchCart();
    } catch {
      alert("Не вдалося видалити товар");
    }
  };

  const handleChangeQty = async (productId: number, delta: number) => {
    try {
      if (delta > 0) {
        await api.post("/shop/cart/me/cart_add/", { product: productId, quantity: delta });
      } else {
        await api.post("/shop/cart/me/cart_remove/", { product: productId, quantity: Math.abs(delta) });
      }
      fetchCart();
    } catch {
      alert("Не вдалося оновити кількість");
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!cart || cart.cart_items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <ShoppingBag size={64} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Кошик порожній</h2>
        <p className="text-gray-500 mb-6">Додайте товари з каталогу</p>
        <Link
          href="/products"
          className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          До каталогу
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Кошик</h1>

      <div className="space-y-4">
        {cart.cart_items.map((item) => (
          <div
            key={item.product.id}
            className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4"
          >
            <Link href={`/products/${item.product.id}`} className="shrink-0">
              <div className="w-20 h-20 bg-gray-100 rounded-lg relative overflow-hidden">
                {item.product.image ? (
                  <Image
                    src={item.product.image.startsWith("http") ? item.product.image : `http://127.0.0.1:8000${item.product.image}`}
                    alt={item.product.model_name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-3xl">👟</div>
                )}
              </div>
            </Link>

            <div className="flex-1 min-w-0">
              <Link href={`/products/${item.product.id}`}>
                <h3 className="font-semibold text-gray-800 hover:text-indigo-600 transition-colors truncate">
                  {item.product.vendor} {item.product.model_name}
                </h3>
              </Link>
              <p className="text-sm text-gray-500">Розмір {item.product.size}</p>
              <p className="font-bold text-indigo-600 mt-1">
                {Number(item.product.discounted_price).toFixed(2)} грн / шт
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleChangeQty(item.product.id, -1)}
                className="w-8 h-8 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                −
              </button>
              <span className="w-8 text-center font-medium">{item.quantity}</span>
              <button
                onClick={() => handleChangeQty(item.product.id, 1)}
                className="w-8 h-8 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                +
              </button>
            </div>

            <p className="font-bold text-gray-900 text-right w-24 shrink-0">
              {(Number(item.product.discounted_price) * item.quantity).toFixed(2)} грн
            </p>

            <button
              onClick={() => handleRemove(item.product.id)}
              className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
              title="Видалити"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center text-xl font-bold text-gray-900 mb-4">
          <span>Разом:</span>
          <span>{Number(cart.total_price).toFixed(2)} грн</span>
        </div>
        <Link
          href="/checkout"
          className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white text-center font-semibold py-3 rounded-xl transition-colors"
        >
          Оформити замовлення
        </Link>
      </div>
    </div>
  );
}
