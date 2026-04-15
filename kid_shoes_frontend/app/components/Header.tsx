"use client";

import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { ShoppingCart, Heart, Package, LogOut, LogIn } from "lucide-react";

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="bg-[#b2f1f0] shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/products" className="flex items-center gap-2">
            <span className="text-2xl">👟</span>
            <span className="font-bold text-xl text-gray-600">TAK i TAK</span>
          </Link>

          <nav className="flex items-center gap-4">
            <Link
              href="/products"
              className="text-gray-600 hover:text-indigo-600 font-medium transition-colors"
            >
              Каталог
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  href="/cart"
                  className="flex items-center gap-1 text-gray-600 hover:text-indigo-600 transition-colors"
                  title="Кошик"
                >
                  <ShoppingCart size={20} />
                </Link>
                <Link
                  href="/wishlist"
                  className="flex items-center gap-1 text-gray-600 hover:text-indigo-600 transition-colors"
                  title="Вибране"
                >
                  <Heart size={20} />
                </Link>
                <Link
                  href="/orders"
                  className="flex items-center gap-1 text-gray-600 hover:text-indigo-600 transition-colors"
                  title="Замовлення"
                >
                  <Package size={20} />
                </Link>
                <span className="text-sm text-gray-500 hidden sm:block">
                  {user?.first_name || user?.email}
                </span>
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
    </header>
  );
}
