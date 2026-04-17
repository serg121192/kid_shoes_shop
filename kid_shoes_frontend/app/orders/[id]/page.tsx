"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api, { getMediaUrl } from "@/app/lib/api";
import { Order } from "@/app/types";
import { useAuth } from "@/app/context/AuthContext";
import { ArrowLeft, Package } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
    pending: "Очікує обробки",
    processing: "В обробці",
    completed: "Виконано",
    cancelled: "Скасовано",
};

const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    processing: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
};

const DELIVERY_LABELS: Record<string, string> = {
    np_warehouse: "НоваПошта: Відділення",
    np_postamat: "НоваПошта: Поштомат",
    np_address: "НоваПошта: Адресна доставка",
};

export default function OrderDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) { router.push("/login"); return; }
        if (!authLoading && isAuthenticated) {
            api.get<Order>(`/shop/orders/${id}/`)
                .then((r) => setOrder(r.data))
                .catch(() => router.push("/orders"))
                .finally(() => setIsLoading(false));
        }
    }, [authLoading, isAuthenticated, id, router]);

    const handleCancel = async () => {
        if (!order || !confirm("Скасувати замовлення?")) return;
        setCancelling(true);
        try {
            const response = await api.post<Order>(`/shop/orders/${order.id}/cancel/`);
            setOrder(response.data);
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
                "Не вдалося скасувати замовлення";
            alert(msg);
        } finally {
            setCancelling(false);
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
        );
    }

    if (!order) return null;

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 mb-6 transition-colors"
            >
                <ArrowLeft size={18} />
                До замовлень
            </button>

            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Замовлення #{order.id}</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {new Date(order.created_at).toLocaleDateString("uk-UA", {
                                day: "numeric", month: "long", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                            })}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${STATUS_COLORS[order.status]}`}>
                            {STATUS_LABELS[order.status]}
                        </span>
                        {order.status === "pending" && (
                            <button
                                onClick={handleCancel}
                                disabled={cancelling}
                                className="text-sm font-medium px-3 py-1.5 rounded-full border border-red-300 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                            >
                                {cancelling ? "Скасовуємо..." : "Скасувати"}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Package size={18} />
                    Товари
                </h2>
                <div className="space-y-4">
                    {order.items.map((item, idx) => {
                        const { product_size, quantity, price } = item;
                        const product = product_size.product;
                        const imageUrl = getMediaUrl(product.image);
                        return (
                            <div key={idx} className="flex items-center gap-4">
                                <Link href={`/products/${product.id}`} className="shrink-0">
                                    <div className="w-16 h-16 bg-gray-100 rounded-lg relative overflow-hidden">
                                        {imageUrl ? (
                                            <Image src={imageUrl} alt={product.model_name} fill unoptimized className="object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-2xl">👟</div>
                                        )}
                                    </div>
                                </Link>
                                <div className="flex-1 min-w-0">
                                    <Link href={`/products/${product.id}`}>
                                        <p className="font-medium text-gray-800 hover:text-indigo-600 transition-colors">
                                            {product.vendor} {product.model_name}
                                        </p>
                                    </Link>
                                    <p className="text-sm text-gray-500">
                                        Розмір {product_size.size} · {quantity} шт
                                    </p>
                                </div>
                                <p className="font-bold text-gray-900 shrink-0">
                                    {(Number(price) * quantity).toFixed(2)} грн
                                </p>
                            </div>
                        );
                    })}
                </div>

                <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Разом:</span>
                    <span className="text-xl font-bold text-indigo-600">{Number(order.total_price).toFixed(2)} грн</span>
                </div>
            </div>

            {/* Delivery */}
            {order.delivery && (
                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Доставка</h2>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        {[
                            { label: "Одержувач", value: order.delivery.recipient_full_name },
                            { label: "Телефон", value: order.delivery.recipient_phone },
                            { label: "Тип доставки", value: DELIVERY_LABELS[order.delivery.delivery_type] },
                            { label: "Місто", value: order.delivery.city_name },
                            order.delivery.warehouse_address
                                ? { label: "Відділення", value: order.delivery.warehouse_address }
                                : null,
                            order.delivery.street
                                ? { label: "Адреса", value: `${order.delivery.street}, ${order.delivery.building_number}${order.delivery.apartment ? `, кв. ${order.delivery.apartment}` : ""}` }
                                : null,
                            order.delivery.tracking_number
                                ? { label: "ТТН", value: order.delivery.tracking_number }
                                : null,
                        ]
                            .filter((item): item is { label: string; value: string } => item !== null)
                            .map(({ label, value }) => (
                                <div key={label} className="bg-gray-50 rounded-lg px-4 py-3">
                                    <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
                                    <dd className="font-medium text-gray-800 mt-0.5">{value}</dd>
                                </div>
                            ))}
                    </dl>
                </div>
            )}
        </div>
    );
}
