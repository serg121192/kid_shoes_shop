"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/app/lib/api";
import { ProductList, PaginatedResponse, Wishlist } from "@/app/types";
import ProductCard from "@/app/components/ProductCard";
import { useAuth } from "@/app/context/AuthContext";
import { useShop } from "@/app/context/ShopContext";
import { Search } from "lucide-react";

const SEASONS = [
  { value: "Winter", label: "Зима" },
  { value: "Summer", label: "Літо" },
  { value: "Demiseason", label: "Демісезон" },
  { value: "Fleece Demiseason", label: "Демісезон фліс" },
];
const TYPES = [
  { value: "Shoe", label: "Черевики" },
  { value: "Sandals", label: "Сандалі" },
  { value: "Sneakers", label: "Кросівки/Кеди" },
  { value: "Ugi", label: "Угі" },
];
const GENDERS = [
  { value: "boy", label: "Хлопчик" },
  { value: "girl", label: "Дівчинка" },
  { value: "unisex", label: "Унісекс" },
];

const PAGE_SIZE = 20;

function buildPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

export default function ProductsPage() {
  const { isAuthenticated } = useAuth();
  const { showToast, setCartCount, setWishlistCount } = useShop();
  const [products, setProducts] = useState<ProductList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [season, setSeason] = useState("");
  const [prodType, setProdType] = useState("");
  const [gender, setGender] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [hasDiscount, setHasDiscount] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);

  const [wishlistProductIds, setWishlistProductIds] = useState<Set<number>>(new Set());

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number | boolean> = { page };
      if (search) params.search = search;
      if (season) params.season = season;
      if (prodType) params.prod_type = prodType;
      if (gender) params.gender = gender;
      if (minPrice) params.min_price = minPrice;
      if (maxPrice) params.max_price = maxPrice;
      if (hasDiscount) params.has_discount = true;

      const response = await api.get<PaginatedResponse<ProductList>>("/shop/products/", { params });
      setProducts(response.data.results);
      setTotalCount(response.data.count);
    } catch {
      setProducts([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [search, season, prodType, gender, minPrice, maxPrice, hasDiscount, page]);

  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await api.get<Wishlist[]>("/shop/wishlist/");
      const wishlists = response.data;
      if (wishlists.length > 0) {
        setWishlistProductIds(new Set(wishlists[0].products.map((p) => p.id)));
      }
    } catch {
      // silent
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // Reset to page 1 when filters change
  const resetPage = () => setPage(1);

  const handleAddToCart = async (productSizeId: number) => {
    if (!isAuthenticated) { window.location.href = "/login"; return; }
    try {
      await api.post("/shop/cart/me/cart_add/", { product_size: productSizeId, quantity: 1 });
      setCartCount((c) => c + 1);
      showToast("Товар успішно додано до кошику!");
    } catch {
      showToast("Не вдалося додати товар до кошика", "error");
    }
  };

  const handleToggleWishlist = async (productId: number) => {
    if (!isAuthenticated) { window.location.href = "/login"; return; }
    try {
      if (wishlistProductIds.has(productId)) {
        await api.post("/shop/wishlist/me/remove_wish/", { product: productId });
        setWishlistProductIds((prev) => { const next = new Set(prev); next.delete(productId); return next; });
        setWishlistCount((c) => Math.max(0, c - 1));
        showToast("Видалено зі списку вибраного");
      } else {
        await api.post("/shop/wishlist/me/add_wish/", { product: productId });
        setWishlistProductIds((prev) => new Set(prev).add(productId));
        setWishlistCount((c) => c + 1);
        showToast("Додано до списку вибраного! ♥");
      }
    } catch {
      showToast("Не вдалося оновити список вибраного", "error");
    }
  };

  const hasActiveFilters = search || season || prodType || gender || minPrice || maxPrice || hasDiscount;

  const handleReset = () => {
    setSearch("");
    setSeason("");
    setProdType("");
    setGender("");
    setMinPrice("");
    setMaxPrice("");
    setHasDiscount(false);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Каталог взуття</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            placeholder="Пошук..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={season}
          onChange={(e) => { setSeason(e.target.value); resetPage(); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Всі сезони</option>
          {SEASONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <select
          value={prodType}
          onChange={(e) => { setProdType(e.target.value); resetPage(); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Всі типи</option>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <select
          value={gender}
          onChange={(e) => { setGender(e.target.value); resetPage(); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Всі</option>
          {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>

        {/* Price range */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={minPrice}
            onChange={(e) => { setMinPrice(e.target.value); resetPage(); }}
            placeholder="Від ₴"
            min={0}
            className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-gray-400 text-sm">—</span>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => { setMaxPrice(e.target.value); resetPage(); }}
            placeholder="До ₴"
            min={0}
            className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Discount toggle */}
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hasDiscount}
            onChange={(e) => { setHasDiscount(e.target.checked); resetPage(); }}
            className="accent-indigo-600 w-4 h-4"
          />
          Тільки зі знижкою
        </label>

        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            Скинути
          </button>
        )}
      </div>

      {/* Results count */}
      {!isLoading && totalCount > 0 && (
        <p className="text-sm text-gray-500 mb-4">
          Знайдено: <span className="font-medium text-gray-700">{totalCount}</span> товарів
        </p>
      )}

      {/* Products Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <span className="text-5xl block mb-4">🔍</span>
          Товарів не знайдено
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
              isInWishlist={wishlistProductIds.has(product.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap justify-center items-center gap-1 mt-10">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ←
          </button>

          {buildPageNumbers(page, totalPages).map((p, idx) =>
            p === "..." ? (
              <span key={`ellipsis-${idx}`} className="px-2 py-2 text-gray-400 text-sm">…</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p as number)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  p === page
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
