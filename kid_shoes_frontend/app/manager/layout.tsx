"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { LayoutDashboard, ShoppingBag, Package } from "lucide-react";

const NAV = [
  { href: "/manager/dashboard", icon: LayoutDashboard, label: "Дашборд" },
  { href: "/manager/orders", icon: ShoppingBag, label: "Замовлення" },
  { href: "/manager/products", icon: Package, label: "Товари" },
];

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (!user || !user.is_staff)) {
      router.replace("/");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user?.is_staff) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <aside className="w-52 shrink-0 bg-gray-900">
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-1">
            Менеджер
          </p>
          <nav className="space-y-1">
            {NAV.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  pathname.startsWith(href)
                    ? "bg-indigo-600 text-white"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-1 bg-gray-50 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
