"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useShop } from "@/app/context/ShopContext";
import {
  ShoppingCart, Heart, Package, LogOut, LogIn,
  UserCircle, Menu, X, LayoutDashboard,
} from "lucide-react";
import Logo from "@/app/components/Logo";

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-rose-400 text-white text-[10px] font-bold rounded-full px-1 leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function ManagerHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-[#cddada] shadow-md sticky top-0 z-50">
      <div className="px-4 sm:px-6">
        <div className="flex items-center h-24 sm:h-28">

          {/* Left spacer */}
          <div className="flex-1" />

          {/* Center: Logo + brand + subtitle */}
          <Link
            href="/manager/dashboard"
            className="flex items-center gap-3 shrink-0"
            aria-label="Панель менеджера"
          >
            <Logo className="h-[72px] w-[72px] sm:h-[84px] sm:w-[84px] shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="text-xl sm:text-2xl lg:text-3xl font-medium text-gray-700 whitespace-nowrap">
                Магазин дитячого взуття
              </span>
              <span className="text-sm sm:text-base font-bold text-teal-600 tracking-widest uppercase mt-1">
                Панель менеджера
              </span>
            </div>
          </Link>

          {/* Right: user + logout */}
          <div className="flex-1 flex justify-end items-center gap-3">
            {user && (
              <span className="hidden sm:flex items-center gap-1.5 text-sm text-gray-600">
                <UserCircle size={18} className="text-gray-500" />
                {user.first_name || user.email}
              </span>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-gray-700 hover:text-red-500 transition-colors"
              title="Вийти"
            >
              <LogOut size={20} />
              <span className="hidden sm:inline text-sm font-medium">Вийти</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount, wishlistCount } = useShop();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const closeMobile = () => setMobileOpen(false);

  if (pathname?.startsWith("/manager")) {
    return <ManagerHeader />;
  }

  return (
    <header className="bg-[#cddada] shadow-md sticky top-0 z-50">
      <div className="px-4 sm:px-6">
        <div className="flex items-center h-20 sm:h-24">

          {/* Mobile: logo left-aligned */}
          <Link
            href="/products"
            onClick={closeMobile}
            className="flex items-center gap-2 sm:hidden"
            aria-label="На головну"
          >
            <Logo className="h-14 w-14 shrink-0" />
          </Link>

          {/* Desktop: left spacer */}
          <div className="hidden sm:flex flex-1" />

          {/* Desktop: Logo + tagline centered */}
          <Link
            href="/products"
            className="hidden sm:flex items-center gap-3 shrink-0"
            aria-label="На головну"
          >
            <Logo className="h-[84px] w-[84px] shrink-0" />
            <span className="text-2xl lg:text-3xl font-medium text-gray-700 whitespace-nowrap">
              Магазин дитячого взуття
            </span>
          </Link>

          {/* Desktop: right nav */}
          <div className="hidden sm:flex flex-1 justify-end">
            <nav className="flex items-center gap-4">
              <span className="h-6 w-px bg-gray-500 opacity-40 mx-1 inline-block" />
              <Link
                href="/about"
                className="text-base font-semibold text-gray-700 hover:text-teal-600 transition-colors"
              >
                Про нас
              </Link>
              <span className="h-6 w-px bg-gray-500 opacity-40 mx-1 inline-block" />
              {isAuthenticated ? (
                <>
                  {user?.is_staff && (
                    <Link
                      href="/manager/dashboard"
                      className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                      title="Панель менеджера"
                    >
                      <LayoutDashboard size={15} />
                      <span className="hidden lg:inline">Панель менеджера</span>
                    </Link>
                  )}
                  <Link
                    href="/cart"
                    className="relative flex items-center gap-1 text-gray-700 hover:text-teal-500 transition-colors"
                    title="Кошик"
                  >
                    <ShoppingCart size={26} />
                    <Badge count={cartCount} />
                  </Link>

                  <Link
                    href="/wishlist"
                    className="relative flex items-center gap-1 text-gray-700 hover:text-teal-500 transition-colors"
                    title="Вибране"
                  >
                    <Heart size={26} />
                    <Badge count={wishlistCount} />
                  </Link>

                  <Link
                    href="/orders"
                    className="flex items-center gap-1 text-gray-700 hover:text-teal-500 transition-colors"
                    title="Замовлення"
                  >
                    <Package size={26} />
                  </Link>

                  <Link
                    href="/profile"
                    className="flex items-center gap-1 text-gray-700 hover:text-teal-500 transition-colors"
                    title="Профіль"
                  >
                    <UserCircle size={20} />
                    <span className="text-sm hidden lg:block">
                      {user?.first_name || user?.email}
                    </span>
                  </Link>

                  <button
                    onClick={logout}
                    className="flex items-center gap-1 text-gray-700 hover:text-red-500 transition-colors"
                    title="Вийти"
                  >
                    <LogOut size={20} />
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1 text-gray-700 hover:text-teal-500 transition-colors"
                >
                  <LogIn size={20} />
                  <span className="font-medium">Увійти</span>
                </Link>
              )}
            </nav>
          </div>

          {/* Mobile: cart icon + hamburger button */}
          <div className="flex sm:hidden items-center gap-3 ml-auto">
            {isAuthenticated && (
              <Link href="/cart" onClick={closeMobile} className="relative text-gray-700" title="Кошик">
                <ShoppingCart size={24} />
                <Badge count={cartCount} />
              </Link>
            )}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="text-gray-700 p-1"
              aria-label={mobileOpen ? "Закрити меню" : "Відкрити меню"}
            >
              {mobileOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="sm:hidden bg-[#cddada] border-t border-[#b8caca] px-4 py-2 flex flex-col">
          <Link
            href="/about"
            onClick={closeMobile}
            className="flex items-center gap-3 py-3 border-b border-[#b8caca] text-gray-700 hover:text-teal-600 transition-colors"
          >
            <span className="font-medium">Про нас</span>
          </Link>
          {isAuthenticated ? (
            <>
              {user?.is_staff && (
                <Link
                  href="/manager/dashboard"
                  onClick={closeMobile}
                  className="flex items-center gap-3 py-3 border-b border-[#b8caca] text-teal-700 hover:text-teal-600 transition-colors font-semibold"
                >
                  <LayoutDashboard size={20} />
                  <span>Панель менеджера</span>
                </Link>
              )}
              <Link
                href="/products"
                onClick={closeMobile}
                className="flex items-center gap-3 py-3 border-b border-[#b8caca] text-gray-700 hover:text-teal-600 transition-colors"
              >
                <span className="font-medium">Каталог</span>
              </Link>
              <Link
                href="/wishlist"
                onClick={closeMobile}
                className="flex items-center gap-3 py-3 border-b border-[#b8caca] text-gray-700 hover:text-teal-600 transition-colors"
              >
                <Heart size={20} />
                <span>Вибране</span>
                {wishlistCount > 0 && (
                  <span className="ml-auto bg-rose-400 text-white text-xs font-bold rounded-full px-2 py-0.5">
                    {wishlistCount > 99 ? "99+" : wishlistCount}
                  </span>
                )}
              </Link>
              <Link
                href="/orders"
                onClick={closeMobile}
                className="flex items-center gap-3 py-3 border-b border-[#b8caca] text-gray-700 hover:text-teal-600 transition-colors"
              >
                <Package size={20} />
                <span>Замовлення</span>
              </Link>
              <Link
                href="/profile"
                onClick={closeMobile}
                className="flex items-center gap-3 py-3 border-b border-[#b8caca] text-gray-700 hover:text-teal-600 transition-colors"
              >
                <UserCircle size={20} />
                <span>{user?.first_name || user?.email || "Профіль"}</span>
              </Link>
              <button
                onClick={() => { logout(); closeMobile(); }}
                className="flex items-center gap-3 py-3 text-gray-700 hover:text-red-500 transition-colors w-full text-left"
              >
                <LogOut size={20} />
                <span>Вийти</span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={closeMobile}
              className="flex items-center gap-3 py-3 text-gray-700 hover:text-teal-600 transition-colors"
            >
              <LogIn size={20} />
              <span className="font-medium">Увійти</span>
            </Link>
          )}

        </div>
      )}
    </header>
  );
}
