"use client";

import { useState, useEffect } from "react";
import api from "@/app/lib/api";
import { TrendingUp, ShoppingBag, DollarSign, Package } from "lucide-react";

interface Stats {
  revenue: { today: number; week: number; month: number };
  orders_by_status: Record<string, number>;
  top_products: {
    product_size__product__id: number;
    product_size__product__model_name: string;
    product_size__product__vendor__name: string;
    total_sold: number;
    total_revenue: string;
  }[];
  total_orders: number;
  total_revenue: number;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Очікується",
  processing: "В обробці",
  completed: "Виконано",
  cancelled: "Скасовано",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-400",
  processing: "bg-blue-400",
  completed: "bg-green-400",
  cancelled: "bg-red-400",
};

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function ManagerDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get<Stats>("/shop/stats/")
      .then((r) => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-gray-500 text-center py-16">Не вдалося завантажити статистику</p>;
  }

  const totalStatusCount = Object.values(stats.orders_by_status).reduce((s, v) => s + v, 0) || 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Дашборд</h1>

      {/* Revenue cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Виторг сьогодні"
          value={`${stats.revenue.today.toFixed(0)} грн`}
          icon={DollarSign}
          color="bg-indigo-500"
        />
        <StatCard
          label="Виторг за тиждень"
          value={`${stats.revenue.week.toFixed(0)} грн`}
          icon={TrendingUp}
          color="bg-blue-500"
        />
        <StatCard
          label="Виторг за місяць"
          value={`${stats.revenue.month.toFixed(0)} грн`}
          icon={TrendingUp}
          color="bg-violet-500"
        />
        <StatCard
          label="Всього замовлень"
          value={String(stats.total_orders)}
          sub={`${stats.total_revenue.toFixed(0)} грн загалом`}
          icon={ShoppingBag}
          color="bg-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by status */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Замовлення за статусом</h2>
          <div className="space-y-3">
            {Object.entries(stats.orders_by_status).map(([st, count]) => (
              <div key={st}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{STATUS_LABELS[st] ?? st}</span>
                  <span className="font-medium text-gray-900">{count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${STATUS_COLORS[st] ?? "bg-gray-400"}`}
                    style={{ width: `${(count / totalStatusCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Package size={16} className="text-indigo-500" />
            Топ-5 товарів
          </h2>
          {stats.top_products.length === 0 ? (
            <p className="text-gray-400 text-sm">Немає даних</p>
          ) : (
            <div className="space-y-3">
              {stats.top_products.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {p.product_size__product__vendor__name} {p.product_size__product__model_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {p.total_sold} шт · {Number(p.total_revenue).toFixed(0)} грн
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
