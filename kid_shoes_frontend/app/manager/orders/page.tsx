"use client";

import React, { useState, useEffect, useCallback } from "react";
import api from "@/app/lib/api";
import { Order, PaginatedResponse } from "@/app/types";
import { Search, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "",           label: "Всі статуси" },
  { value: "pending",    label: "Очікується" },
  { value: "processing", label: "В обробці" },
  { value: "completed",  label: "Виконано" },
  { value: "received",   label: "Замовлення отримано" },
  { value: "refused",    label: "Відмова" },
  { value: "cancelled",  label: "Скасовано" },
];

const STATUS_LABELS: Record<string, string> = {
  pending:    "Очікується",
  processing: "В обробці",
  completed:  "Виконано",
  received:   "Отримано ✓",
  refused:    "Відмова",
  cancelled:  "Скасовано",
};

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  completed:  "bg-green-100 text-green-800",
  received:   "bg-emerald-100 text-emerald-800",
  refused:    "bg-orange-100 text-orange-800",
  cancelled:  "bg-red-100 text-red-800",
};

export default function ManagerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId]   = useState<number | null>(null);
  const [updatingId, setUpdatingId]   = useState<number | null>(null);
  const [syncingId,  setSyncingId]    = useState<number | null>(null);
  const [syncResult, setSyncResult]   = useState<Record<number, string>>({});

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get<PaginatedResponse<Order>>("/shop/orders/", { params });
      setOrders(res.data.results);
      setTotal(res.data.count);
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/shop/orders/${orderId}/update_status/`, { status: newStatus });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as Order["status"] } : o))
      );
    } catch {
      // silent
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSyncNP = async (orderId: number) => {
    setSyncingId(orderId);
    try {
      const res = await api.post<{
        np_code: string; np_status: string;
        order_status: string; updated: boolean;
      }>(`/shop/orders/${orderId}/sync_np/`);
      const d = res.data;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: d.order_status as Order["status"] }
            : o
        )
      );
      setSyncResult((prev) => ({
        ...prev,
        [orderId]: d.updated
          ? `НП: ${d.np_status}`
          : `НП: ${d.np_status} (без змін)`,
      }));
    } catch {
      setSyncResult((prev) => ({ ...prev, [orderId]: "Помилка синхронізації" }));
    } finally {
      setSyncingId(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Замовлення</h1>
        <button
          onClick={() => fetchOrders()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition-colors"
        >
          <RefreshCw size={14} />
          Оновити
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Пошук за email або ID..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <span className="text-sm text-gray-400">{total} замовлень</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">Замовлень не знайдено</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Дата</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Покупець</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Сума</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Статус</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((order) => (
                <React.Fragment key={order.id}>
                  <tr
                    className={`cursor-pointer transition-colors ${order.status === "pending" ? "bg-rose-200 hover:bg-rose-300" : "hover:bg-gray-50"}`}
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  >
                    <td className="px-4 py-3 font-medium text-teal-600">#{order.id}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3 text-gray-700">{order.user}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {Number(order.total_price).toFixed(2)} грн
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-1">
                        <select
                          value={order.status}
                          disabled={updatingId === order.id}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:opacity-50"
                        >
                          {STATUS_OPTIONS.filter((s) => s.value).map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                        {order.delivery?.tracking_number && (
                          <button
                            disabled={syncingId === order.id}
                            onClick={() => handleSyncNP(order.id)}
                            title="Оновити статус з Нової Пошти"
                            className="text-xs px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {syncingId === order.id ? "⟳ НП..." : "⟳ Синхр. НП"}
                          </button>
                        )}
                        {syncResult[order.id] && (
                          <p className="text-[10px] text-gray-400 leading-tight">
                            {syncResult[order.id]}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-400">
                      {expandedId === order.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </td>
                  </tr>

                  {/* Expanded row */}
                  {expandedId === order.id && (
                    <tr key={`${order.id}-detail`} className="bg-teal-50">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {/* Delivery */}
                          {order.delivery && (
                            <div className="space-y-1">
                              <p className="font-semibold text-gray-700 mb-1">Доставка</p>
                              <p><span className="text-gray-500">Отримувач:</span> {order.delivery.recipient_full_name}</p>
                              <p><span className="text-gray-500">Телефон:</span> {order.delivery.recipient_phone}</p>
                              {order.delivery.delivery_type === "pickup" ? (
                                <p className="font-medium text-teal-700">
                                  🏪 Самовивіз з магазину — м. Чернігів, пр. Левка Лук&apos;яненка 78, 2-й поверх
                                </p>
                              ) : (
                                <>
                                  <p><span className="text-gray-500">Місто:</span> {order.delivery.city_name}</p>
                                  <p><span className="text-gray-500">Відділення:</span> {order.delivery.warehouse_address}</p>
                                  {order.delivery.tracking_number && (
                                    <p className="font-medium text-teal-700">
                                      ТТН: {order.delivery.tracking_number}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          )}

                          {/* Items */}
                          <div>
                            <p className="font-semibold text-gray-700 mb-1">Товари</p>
                            <ul className="space-y-1">
                              {order.items.map((item, i) => (
                                <li key={i} className="text-gray-600">
                                  {item.product_size.product.vendor}{" "}
                                  {item.product_size.product.model_name} — р.{item.product_size.size}{" "}
                                  × {item.quantity} = {Number(item.price).toFixed(2)} грн
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-white disabled:opacity-30 transition-colors"
          >
            ←
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                p === page ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-white"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-white disabled:opacity-30 transition-colors"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
