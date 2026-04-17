"use client";

import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { useShop } from "@/app/context/ShopContext";
import { ShoppingCart, Heart, Package, LogOut, LogIn, UserCircle } from "lucide-react";
import Logo from "@/app/components/Logo";

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-indigo-600 text-white text-[10px] font-bold rounded-full px-1 leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount, wishlistCount } = useShop();

  return (
    <header className="bg-[#b2f1f0] shadow-sm sticky top-0 z-50">
      <div className="px-6">
        <div className="flex items-center h-24">

          {/* Left spacer */}
          <div className="flex-1" />

          {/* Logo + tagline — centered */}
          <Link
            href="/products"
            className="flex items-center gap-3 shrink-0"
            aria-label="На головну"
          >
            <Logo className="h-[84px] w-[84px] shrink-0" />
            <span className="text-3xl font-medium text-gray-600 whitespace-nowrap">
              Магазин дитячого взуття
            </span>
          </Link>

          {/* Right — nav */}
          <div className="flex-1 flex justify-end">
          <nav className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link
                  href="/cart"
                  className="relative flex items-center gap-1 text-gray-600 hover:text-indigo-600 transition-colors"
                  title="Кошик"
                >
                  <ShoppingCart size={26} />
                  <Badge count={cartCount} />
                </Link>

                <Link
                  href="/wishlist"
                  className="relative flex items-center gap-1 text-gray-600 hover:text-indigo-600 transition-colors"
                  title="Вибране"
                >
                  <Heart size={26} />
                  <Badge count={wishlistCount} />
                </Link>

                <Link
                  href="/orders"
                  className="flex items-center gap-1 text-gray-600 hover:text-indigo-600 transition-colors"
                  title="Замовлення"
                >
                  <Package size={26} />
                </Link>

                <Link
                  href="/profile"
                  className="flex items-center gap-1 text-gray-600 hover:text-indigo-600 transition-colors"
                  title="Профіль"
                >
                  <UserCircle size={20} />
                  <span className="text-sm hidden sm:block">
                    {user?.first_name || user?.email}
                  </span>
                </Link>

                <button
                  onClick={logout}
                  className="flex items-center gap-1 text-gray-600 hover:text-red-500 transition-colors"
                  title="Вийти"
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1 text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <LogIn size={20} />
                <span className="font-medium">Увійти</span>
              </Link>
            )}
          </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
