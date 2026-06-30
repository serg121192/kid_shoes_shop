"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import api, { getMediaUrl } from "@/app/lib/api";
import { ProductList, PaginatedResponse } from "@/app/types";
import { Search, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { useShop } from "@/app/context/ShopContext";

type CatalogFilter = "all" | "published" | "hidden" | "no_price";

function hasPrice(product: ProductList): boolean {
  return Number(product.full_price) > 0;
}

export default function ManagerProductsPage() {
  const { showToast } = useShop();
  const [products, setProducts] = useState<ProductList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>("all");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [readyToPublishCount, setReadyToPublishCount] = useState(0);
  const [bulkLoading, setBulkLoading] = useState(false);
  const PAGE_SIZE = 20;

  const fetchReadyCount = useCallback(async () => {
    try {
      const res = await api.get<PaginatedResponse<ProductList>>("/shop/products/", {
        params: { is_published: false, has_price: true, page: 1, page_size: 1 },
      });
      setReadyToPublishCount(res.data.count);
    } catch {
      setReadyToPublishCount(0);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number | boolean> = { page };
      if (search) params.search = search;
      if (catalogFilter === "published") params.is_published = true;
      if (catalogFilter === "hidden") params.is_published = false;
      if (catalogFilter === "no_price") params.has_price = false;

      const res = await api.get<PaginatedResponse<ProductList>>("/shop/products/", { params });
      setProducts(res.data.results);
      setTotal(res.data.count);
      setSelectedIds(new Set());
      fetchReadyCount();
    } catch {
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, catalogFilter, fetchReadyCount]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Видалити товар "${name}"? Цю дію неможливо скасувати.`)) return;
    try {
      await api.delete(`/shop/products/${id}/`);
      showToast("Товар видалено");
      fetchProducts();
      fetchReadyCount();
    } catch {
      showToast("Не вдалося видалити товар", "error");
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    const publishableOnPage = products.filter((p) => !p.is_published && hasPrice(p));
    const allSelected = publishableOnPage.every((p) => selectedIds.has(p.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        publishableOnPage.forEach((p) => next.delete(p.id));
      } else {
        publishableOnPage.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const handleBulkPublish = async (ids?: number[]) => {
    const label = ids?.length
      ? `${ids.length} обраних товарів`
      : `усі ${readyToPublishCount} товарів з ціною`;
    if (!confirm(`Увімкнути показ у каталозі для ${label}?`)) return;

    setBulkLoading(true);
    try {
      const res = await api.post<{ published: number }>(
        "/shop/products/bulk_publish/",
        ids?.length ? { ids } : {}
      );
      showToast(`У каталозі: +${res.data.published} товарів`);
      fetchProducts();
      fetchReadyCount();
    } catch {
      showToast("Не вдалося опублікувати товари", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const selectedPublishable = products.filter(
    (p) => selectedIds.has(p.id) && !p.is_published && hasPrice(p)
  );
  const publishableOnPage = products.filter((p) => !p.is_published && hasPrice(p));
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Товари</h1>
        <div className="flex flex-wrap items-center gap-2">
          {readyToPublishCount > 0 && (
            <button
              type="button"
              disabled={bulkLoading}
              onClick={() => handleBulkPublish()}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Eye size={16} />
              У каталозі всі з ціною ({readyToPublishCount})
            </button>
          )}
          {selectedPublishable.length > 0 && (
            <button
              type="button"
              disabled={bulkLoading}
              onClick={() => handleBulkPublish(selectedPublishable.map((p) => p.id))}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Eye size={16} />
              Обрані ({selectedPublishable.length})
            </button>
          )}
          <Link
            href="/manager/products/new"
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Додати товар
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Пошук товарів..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
        <select
          value={catalogFilter}
          onChange={(e) => { setCatalogFilter(e.target.value as CatalogFilter); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          <option value="all">Усі товари</option>
          <option value="published">У каталозі</option>
          <option value="hidden">Приховані</option>
          <option value="no_price">Без ціни</option>
        </select>
        <span className="text-sm text-gray-400">{total} товарів</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">Товарів не знайдено</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-3 py-3 w-10">
                  {publishableOnPage.length > 0 && (
                    <input
                      type="checkbox"
                      checked={publishableOnPage.length > 0 && publishableOnPage.every((p) => selectedIds.has(p.id))}
                      onChange={toggleSelectAllOnPage}
                      title="Обрати всі на сторінці (з ціною, приховані)"
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-400"
                    />
                  )}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-12">Фото</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Назва</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Ціна</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Знижка</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Розміри</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Наявність</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Каталог</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((p) => {
                const imgUrl = p.main_image
                  ? getMediaUrl(p.main_image)
                  : (() => {
                      const mainImg = p.images?.find((img) => img.is_main) ?? p.images?.[0];
                      return mainImg ? getMediaUrl(mainImg.image) : null;
                    })();
                const priced = hasPrice(p);
                const canSelect = !p.is_published && priced;
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3">
                      {canSelect ? (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-400"
                        />
                      ) : (
                        <span className="inline-block w-4" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden relative">
                        {imgUrl ? (
                          <Image src={imgUrl} alt={p.model_name} fill unoptimized className="object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-lg">👟</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/manager/products/${p.id}`}
                        className="group block"
                        title="Редагувати товар"
                      >
                        <p className="font-medium text-gray-800 group-hover:text-teal-600 transition-colors">
                          <span className="group-hover:underline">{p.vendor}</span>{" "}
                          {p.model_name}
                        </p>
                        <p className="text-xs text-gray-400">{p.gender} · {p.prod_type}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {priced ? (
                        <span className="text-gray-700">{Number(p.full_price).toFixed(0)} грн</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                          Ціна не вказана
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.discount > 0 ? (
                        <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          -{p.discount}%
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.sizes.map((s) => s.size).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${
                        p.exists === "В наявності"
                          ? "text-green-600"
                          : p.exists === "Товар закінчується. Поспішіть придбати!"
                          ? "text-yellow-600"
                          : "text-red-500"
                      }`}>
                        {p.exists === "В наявності" ? "✓ Є" : p.exists === "Товар закінчується. Поспішіть придбати!" ? "⚠ Мало" : "✕ Нема"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.is_published ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-600">
                          <Eye size={12} />
                          У каталозі
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                          <EyeOff size={12} />
                          Приховано
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={`/manager/products/${p.id}`}
                          className="p-1.5 text-gray-400 hover:text-teal-600 transition-colors"
                          title="Редагувати"
                        >
                          <Pencil size={15} />
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id, `${p.vendor} ${p.model_name}`)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          title="Видалити"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                p === page ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
