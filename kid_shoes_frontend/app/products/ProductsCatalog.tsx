"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/app/lib/api";
import {
  buildCatalogParams,
  CATALOG_PAGE_SIZE,
  isDefaultCatalogView,
} from "@/app/lib/catalog";
import { ProductList, PaginatedResponse } from "@/app/types";
import ProductCard from "@/app/components/ProductCard";
import PromoDiscountButton from "@/app/components/PromoDiscountButton";
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
  { value: "Boots", label: "Чоботи" },
  { value: "Sandals", label: "Сандалі" },
  { value: "Sneakers", label: "Кросівки/Кеди" },
  { value: "DressShoes", label: "Туфлі" },
  { value: "Booties", label: "Пінетки" },
  { value: "Ugi", label: "Угі" },
];
const GENDERS = [
  { value: "boy", label: "Хлопчик" },
  { value: "girl", label: "Дівчинка" },
  { value: "unisex", label: "Унісекс" },
];

interface CatalogReturnState {
  page: number;
  search: string;
  season: string;
  prodType: string;
  gender: string;
  minPrice: string;
  maxPrice: string;
  hasDiscount: boolean;
  promoDiscount30: boolean;
  size: string;
  scrollY?: number;
}

interface ProductsCatalogProps {
  initialProducts: ProductList[];
  initialCount: number;
}

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

export default function ProductsCatalog({
  initialProducts,
  initialCount,
}: ProductsCatalogProps) {
  const { isAuthenticated } = useAuth();
  const { showToast, setCartCount, setWishlistCount, setWishlistProductIds, wishlistProductIds } = useShop();
  const [products, setProducts] = useState<ProductList[]>(initialProducts);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(initialCount);

  const [search, setSearch] = useState("");
  const [season, setSeason] = useState("");
  const [prodType, setProdType] = useState("");
  const [gender, setGender] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [hasDiscount, setHasDiscount] = useState(false);
  const [promoDiscount30, setPromoDiscount30] = useState(false);
  const [size, setSize] = useState("");
  const [page, setPage] = useState(1);

  const [isRestoring, setIsRestoring] = useState(true);
  const [restoredScrollY, setRestoredScrollY] = useState<number | null>(null);
  const skipNextFetchRef = useRef(
    (initialProducts.length > 0 || initialCount > 0) &&
    isDefaultCatalogView({ page: 1 }),
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / CATALOG_PAGE_SIZE));

  const currentFilters = useCallback(
    (): CatalogReturnState => ({
      page,
      search,
      season,
      prodType,
      gender,
      minPrice,
      maxPrice,
      hasDiscount,
      promoDiscount30,
      size,
    }),
    [page, search, season, prodType, gender, minPrice, maxPrice, hasDiscount, promoDiscount30, size],
  );

  const saveCatalogReturnState = useCallback(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("catalogReturnPageState", JSON.stringify(currentFilters()));
    sessionStorage.setItem("catalogReturnPending", "1");
  }, [currentFilters]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = buildCatalogParams({
        page,
        pageSize: CATALOG_PAGE_SIZE,
        search,
        season,
        prodType,
        gender,
        minPrice,
        maxPrice,
        hasDiscount,
        discount: promoDiscount30 ? 30 : undefined,
        size,
      });

      const response = await api.get<PaginatedResponse<ProductList>>("/shop/products/", { params });
      setProducts(response.data.results);
      setTotalCount(response.data.count);
    } catch {
      setProducts([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [search, season, prodType, gender, minPrice, maxPrice, hasDiscount, promoDiscount30, size, page]);

  useEffect(() => {
    const pending = sessionStorage.getItem("catalogReturnPending");
    const savedRaw = sessionStorage.getItem("catalogReturnPageState");

    if (pending !== "1" || !savedRaw) {
      sessionStorage.removeItem("catalogReturnPageState");
      sessionStorage.removeItem("catalogReturnScrollY");
      sessionStorage.removeItem("catalogReturnPending");
      setIsRestoring(false);
      return;
    }

    try {
      const saved = JSON.parse(savedRaw) as CatalogReturnState;
      setSearch(saved.search || "");
      setSeason(saved.season || "");
      setProdType(saved.prodType || "");
      setGender(saved.gender || "");
      setMinPrice(saved.minPrice || "");
      setMaxPrice(saved.maxPrice || "");
      setHasDiscount(saved.hasDiscount || false);
      setPromoDiscount30(saved.promoDiscount30 || false);
      setSize(saved.size || "");
      setPage(saved.page || 1);
      skipNextFetchRef.current = false;
      const scrollRaw = sessionStorage.getItem("catalogReturnScrollY");
      if (scrollRaw) {
        setRestoredScrollY(Number(scrollRaw));
      }
    } catch {
      // ignore invalid stored state
    } finally {
      sessionStorage.removeItem("catalogReturnPageState");
      sessionStorage.removeItem("catalogReturnScrollY");
      sessionStorage.removeItem("catalogReturnPending");
      setIsRestoring(false);
    }
  }, []);

  useEffect(() => {
    if (isRestoring) return;

    if (
      skipNextFetchRef.current &&
      isDefaultCatalogView({
        page,
        search,
        season,
        prodType,
        gender,
        minPrice,
        maxPrice,
        hasDiscount,
        discount: promoDiscount30 ? 30 : undefined,
        size,
      })
    ) {
      skipNextFetchRef.current = false;
      return;
    }

    fetchProducts();
  }, [fetchProducts, isRestoring]);

  useEffect(() => {
    if (isRestoring || isLoading || totalCount === 0) return;
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages, totalCount, isLoading, isRestoring]);

  useEffect(() => {
    if (isRestoring || isLoading || restoredScrollY === null) return;
    window.scrollTo({ top: restoredScrollY, behavior: "auto" });
    setRestoredScrollY(null);
  }, [isLoading, isRestoring, restoredScrollY]);

  const resetPage = () => setPage(1);

  const handleAddToCart = async (productSizeId: number) => {
    if (!isAuthenticated) {
      sessionStorage.setItem("pending_cart_item", String(productSizeId));
      window.location.href = "/login?next=/cart";
      return false;
    }
    try {
      await api.post("/shop/cart/me/cart_add/", { product_size: productSizeId, quantity: 1 });
      setCartCount((c) => c + 1);
      showToast("Товар успішно додано до кошику!");
      return true;
    } catch {
      showToast("Не вдалося додати товар до кошика", "error");
      return false;
    }
  };

  const handleToggleWishlist = async (productId: number) => {
    if (!isAuthenticated) { window.location.href = "/login?next=/products"; return; }
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

  const hasActiveFilters = search || season || prodType || gender || minPrice || maxPrice || hasDiscount || promoDiscount30 || size;

  const handleReset = () => {
    setSearch("");
    setSeason("");
    setProdType("");
    setGender("");
    setMinPrice("");
    setMaxPrice("");
    setHasDiscount(false);
    setPromoDiscount30(false);
    setSize("");
    setPage(1);
  };

  const handleTogglePromoDiscount30 = () => {
    setPromoDiscount30((prev) => {
      const next = !prev;
      if (next) setHasDiscount(false);
      return next;
    });
    resetPage();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Каталог дитячого взуття</h1>
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            placeholder="Пошук..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <select
          value={season}
          onChange={(e) => { setSeason(e.target.value); resetPage(); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">Всі сезони</option>
          {SEASONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <select
          value={prodType}
          onChange={(e) => { setProdType(e.target.value); resetPage(); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">Всі типи</option>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <select
          value={gender}
          onChange={(e) => { setGender(e.target.value); resetPage(); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">Всі</option>
          {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>

        <div className="flex items-center gap-1">
          <input
            type="number"
            value={minPrice}
            onChange={(e) => { setMinPrice(e.target.value); resetPage(); }}
            placeholder="Від ₴"
            min={0}
            className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <span className="text-gray-400 text-sm">—</span>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => { setMaxPrice(e.target.value); resetPage(); }}
            placeholder="До ₴"
            min={0}
            className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <select
          value={size}
          onChange={(e) => { setSize(e.target.value); resetPage(); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">Всі розміри</option>
          {Array.from({ length: 29 }, (_, i) => i + 16).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hasDiscount}
            onChange={(e) => {
              setHasDiscount(e.target.checked);
              if (e.target.checked) setPromoDiscount30(false);
              resetPage();
            }}
            className="accent-teal-600 w-4 h-4"
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

      <div className="mb-6">
        <PromoDiscountButton
          active={promoDiscount30}
          onClick={handleTogglePromoDiscount30}
        />
      </div>

      {!isLoading && totalCount > 0 && (
        <p className="text-sm text-gray-500 mb-4">
          Знайдено: <span className="font-medium text-gray-700">{totalCount}</span> товарів
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
        </div>
      ) : products.length === 0 && totalCount > 0 ? (
        <div className="text-center py-16 text-gray-500">
          <span className="text-5xl block mb-4">📄</span>
          <p className="mb-4">На цій сторінці немає товарів</p>
          <button
            type="button"
            onClick={() => setPage(1)}
            className="text-sm font-medium text-teal-600 hover:text-teal-800 underline"
          >
            Перейти на першу сторінку
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <span className="text-5xl block mb-4">🔍</span>
          Товарів не знайдено
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
              isInWishlist={wishlistProductIds.has(product.id)}
              priority={index < 2}
              onSaveCatalogState={saveCatalogReturnState}
            />
          ))}
        </div>
      )}

      {(totalPages > 1 || page > 1) && (
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
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${p === page
                  ? "bg-teal-600 text-white"
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
