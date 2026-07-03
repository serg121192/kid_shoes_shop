"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { LayoutDashboard, ShoppingBag, Package, ExternalLink, BarChart3 } from "lucide-react";
import api from "@/app/lib/api";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await api.get<{ count: number }>("/shop/orders/pending_count/");
      setPendingCount(res.data.count);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && (!user || !user.is_staff)) {
      router.replace("/");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user?.is_staff) return;
    const load = () => void fetchPendingCount();
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(load, { timeout: 3000 });
      const interval = setInterval(fetchPendingCount, 30_000);
      return () => {
        window.cancelIdleCallback(id);
        clearInterval(interval);
      };
    }
    load();
    const interval = setInterval(fetchPendingCount, 30_000);
    return () => clearInterval(interval);
  }, [user, fetchPendingCount]);

  if (isLoading || !user?.is_staff) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  const NAV = [
    { href: "/manager/dashboard", icon: LayoutDashboard, label: "Дашборд", badge: 0 },
    { href: "/manager/orders", icon: ShoppingBag, label: "Замовлення", badge: pendingCount },
    { href: "/manager/products", icon: Package, label: "Товари", badge: 0 },
    { href: "/manager/reports?period=today", icon: BarChart3, label: "Звіти", badge: 0 },
  ];


  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)] md:min-h-[calc(100vh-112px)]">
      <aside className="md:w-52 shrink-0 bg-gray-900">
        <div className="p-2 md:p-4">
          <p className="hidden md:block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-1">
            Менеджер
          </p>
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible scrollbar-hide">
            {NAV.map(({ href, icon: Icon, label, badge }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg text-sm whitespace-nowrap shrink-0 transition-colors ${
                  pathname.startsWith(href.split("?")[0])
                    ? "bg-teal-400 text-white"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <Icon size={16} />
                <span className="flex-1">{label}</span>
                {badge > 0 && (
                  <span className="min-w-[18px] h-[18px] inline-flex items-center justify-center bg-rose-400 text-white text-[10px] font-bold rounded-full px-1 leading-[18px]">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            ))}

            <div className="pt-1 md:pt-3 mt-1 md:mt-3 border-t border-gray-700 shrink-0">
              <Link
                href="/products"
                className="flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors whitespace-nowrap"
              >
                <ExternalLink size={16} />
                <span>На сайт</span>
              </Link>
            </div>
          </nav>
        </div>
      </aside>

      <main className="flex-1 bg-gray-50 overflow-auto p-4 md:p-6 min-w-0">
        {children}
      </main>
    </div>
  );
}
