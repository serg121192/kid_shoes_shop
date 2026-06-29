"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/app/lib/api";
import { Order } from "@/app/types";
import { useShop } from "@/app/context/ShopContext";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "Очікує оплату",
  processing: "В обробці",
  completed: "Виконано",
  received: "Оплачено / видано",
  refused: "Відмова",
  cancelled: "Скасовано",
};

export default function SellerOrderDetailPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const router = useRouter();
  const { showToast } = useShop();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<Order>(`/shop/orders/${orderId}/`);
        setOrder(res.data);
      } catch {
        showToast("Замовлення не знайдено", "error");
        router.push("/seller/orders");
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, router, showToast]);

  const handleConfirmPayment = async () => {
    setConfirming(true);
    try {
      const res = await api.post<Order>(`/shop/orders/${orderId}/confirm_payment/`);
      setOrder(res.data);
      showToast("Оплату підтверджено");
    } catch {
      showToast("Не вдалося підтвердити оплату", "error");
    } finally {
      setConfirming(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  const awaitingPayment =
    order.sale_channel === "store" && order.status === "pending";

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link href="/seller/orders" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-teal-600">
        <ArrowLeft size={14} />
        Усі замовлення
      </Link>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Замовлення #{order.id}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(order.created_at).toLocaleString("uk-UA")}
            </p>
          </div>
          <span className="text-sm font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-700">
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>

        {order.sale_channel === "store" && (
          <p className="text-xs text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2">
            Продаж у магазині
            {order.created_by ? ` · оформив ${order.created_by}` : ""}
          </p>
        )}

        <p className="text-3xl font-bold text-gray-900">
          {Number(order.total_price).toFixed(2)} грн
        </p>

        {order.delivery && (
          <div className="text-sm space-y-1 border-t border-gray-100 pt-4">
            <p><span className="text-gray-500">Отримувач:</span> {order.delivery.recipient_full_name}</p>
            <p><span className="text-gray-500">Телефон:</span> {order.delivery.recipient_phone}</p>
            {order.delivery.delivery_type === "pickup" && (
              <p className="text-teal-700 font-medium">Самовивіз з магазину</p>
            )}
          </div>
        )}

        <ul className="border-t border-gray-100 pt-4 space-y-2 text-sm">
          {order.items.map((item, i) => (
            <li key={i} className="text-gray-700">
              {item.product_size.product.vendor}{" "}
              {item.product_size.product.model_name} — р.{item.product_size.size}{" "}
              × {item.quantity} = {Number(item.price).toFixed(2)} грн
            </li>
          ))}
        </ul>
      </div>

      {awaitingPayment ? (
        <button
          type="button"
          disabled={confirming}
          onClick={handleConfirmPayment}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white py-4 rounded-xl text-lg font-semibold transition-colors shadow-lg"
        >
          <CheckCircle2 size={22} />
          {confirming ? "Зберігаємо..." : "Оплату підтверджено"}
        </button>
      ) : order.status === "received" && order.sale_channel === "store" ? (
        <div className="text-center text-emerald-700 bg-emerald-50 rounded-xl py-4 font-medium">
          ✓ Оплату підтверджено, товар видано
        </div>
      ) : null}

      {awaitingPayment && (
        <p className="text-center text-xs text-gray-500 px-4">
          Натисніть після отримання оплати від покупця (готівка або термінал)
        </p>
      )}
    </div>
  );
}
