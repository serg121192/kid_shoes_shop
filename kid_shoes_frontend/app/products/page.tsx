"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/app/lib/api";
import { ProductList, Wishlist } from "@/app/types";
import ProductCard from "@/app/components/ProductCard";
import { useAuth } from "@/app/context/AuthContext";
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

export default function ProductsPage() {
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<ProductList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [season, setSeason] = useState("");
  const [prodType, setProdType] = useState("");
  const [gender, setGender] = useState("");
  const [wishlistProductIds, setWishlistProductIds] = useState<Set<number>>(new Set());

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (season) params.season = season;
      if (prodType) params.prod_type = prodType;
      if (gender) params.gender = gender;

      const response = await api.get<{ results: ProductList[] } | ProductList[]>("/shop/products/", { params });
      const data = response.data;
      setProducts(Array.isArray(data) ? data : data.results);
    } catch {
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, season, prodType, gender]);

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

  const handleAddToCart = async (productId: number) => {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    try {
      await api.post("/shop/cart/me/cart_add/", { product: productId, quantity: 1 });
    } catch {
      alert("Не вдалося додати товар до кошика");
    }
  };

  const handleToggleWishlist = async (productId: number) => {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    try {
      if (wishlistProductIds.has(productId)) {
        await api.post("/shop/wishlist/me/remove_wish/", { product: productId });
        setWishlistProductIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      } else {
        await api.post("/shop/wishlist/me/add_wish/", { product: productId });
        setWishlistProductIds((prev) => new Set(prev).add(productId));
      }
    } catch {
      alert("Не вдалося оновити список вибраного");
    }
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Всі сезони</option>
          {SEASONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <select
          value={prodType}
          onChange={(e) => setProdType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Всі типи</option>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Всі</option>
          {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>

        {(search || season || prodType || gender) && (
          <button
            onClick={() => { setSearch(""); setSeason(""); setProdType(""); setGender(""); }}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            Скинути
          </button>
        )}
      </div>

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
    </div>
  );
}
