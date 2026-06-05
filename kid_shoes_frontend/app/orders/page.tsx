"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/app/lib/api";
import { Order } from "@/app/types";
import { useAuth } from "@/app/context/AuthContext";
import { Package } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "Очікує підтвердження",
  processing: "В обробці",
  completed: "Виконано",
  cancelled: "Скасовано",
  received: "Отримано",
  refused: "Відмова",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  received: "bg-emerald-100 text-emerald-700",
  refused: "bg-gray-100 text-gray-600",
};

export default function OrdersPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await api.get<{ results: Order[] } | Order[]>("/shop/orders/");
      const data = response.data;
      setOrders(Array.isArray(data) ? data : data.results);
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.push("/login"); return; }
    if (!authLoading && user?.is_staff) { router.push("/manager/orders"); return; }
    if (!authLoading && isAuthenticated) { fetchOrders(); }
  }, [authLoading, isAuthenticated, router, fetchOrders]);

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Package size={64} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Бронювань немає</h2>
        <p className="text-gray-500 mb-6">Забронюйте свої перші товари!</p>
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
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Мої бронювання</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <Link href={`/orders/${order.id}`} className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                    Бронювання #{order.id}
                  </Link>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(order.created_at).toLocaleDateString("uk-UA", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xl font-bold text-indigo-600">
                  {Number(order.total_price).toFixed(2)} грн
                </p>
                <p className="text-sm text-gray-500">{order.items.length} поз.</p>
              </div>
            </div>

            {/* Items preview */}
            <div className="border-t border-gray-100 px-5 py-3 flex flex-wrap gap-2">
              {order.items.map((item, idx) => (
                <span key={idx} className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-1">
                  {item.product_size.product.vendor} {item.product_size.product.model_name} р.{item.product_size.size} × {item.quantity}
                </span>
              ))}
            </div>

            {order.delivery && (
              <div className="border-t border-gray-100 px-5 py-3 text-sm text-gray-500">
                {order.delivery.delivery_type === "pickup" ? (
                  <span>🏪 Самовивіз з магазину — м. Чернігів, просп. Лук&apos;яненка 78</span>
                ) : (
                  <>
                    📦 {order.delivery.city_name}
                    {order.delivery.warehouse_address && `, ${order.delivery.warehouse_address}`}
                    {order.delivery.tracking_number && (
                      <span className="ml-2 font-mono text-indigo-600">
                        ТТН: {order.delivery.tracking_number}
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
