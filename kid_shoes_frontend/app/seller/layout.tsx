"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { ShoppingBag, PlusCircle, ExternalLink } from "lucide-react";
import api from "@/app/lib/api";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  const isSeller = user?.is_seller && !user?.is_staff;

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await api.get<{ count: number }>("/shop/orders/pending_count/");
      setPendingCount(res.data.count);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && (!user || !user.is_seller || user.is_staff)) {
      router.replace("/");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (isSeller) {
      fetchPendingCount();
      const interval = setInterval(fetchPendingCount, 30_000);
      return () => clearInterval(interval);
    }
  }, [isSeller, fetchPendingCount]);

  if (isLoading || !user?.is_seller || user.is_staff) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  const NAV = [
    { href: "/seller/orders", icon: ShoppingBag, label: "Замовлення", badge: pendingCount },
    { href: "/seller/orders/new", icon: PlusCircle, label: "Нове замовлення", badge: 0 },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)] md:min-h-[calc(100vh-112px)]">
      <aside className="md:w-52 shrink-0 bg-gray-900">
        <div className="p-2 md:p-4">
          <p className="hidden md:block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-1">
            Продавець
          </p>
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible scrollbar-hide">
            {NAV.map(({ href, icon: Icon, label, badge }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg text-sm whitespace-nowrap shrink-0 transition-colors ${
                  pathname.startsWith(href)
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
          </nav>
          <Link
            href="/"
            className="hidden md:flex items-center gap-2 mt-6 px-3 py-2 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <ExternalLink size={13} />
            На сайт
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-6 bg-gray-100 overflow-x-hidden">{children}</main>
    </div>
  );
}
