"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import api, { getMediaUrl } from "@/app/lib/api";
import { ProductList, PaginatedResponse } from "@/app/types";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { useShop } from "@/app/context/ShopContext";

export default function ManagerProductsPage() {
  const { showToast } = useShop();
  const [products, setProducts] = useState<ProductList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page };
      if (search) params.search = search;
      const res = await api.get<PaginatedResponse<ProductList>>("/shop/products/", { params });
      setProducts(res.data.results);
      setTotal(res.data.count);
    } catch {
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Видалити товар "${name}"? Цю дію неможливо скасувати.`)) return;
    try {
      await api.delete(`/shop/products/${id}/`);
      showToast("Товар видалено");
      fetchProducts();
    } catch {
      showToast("Не вдалося видалити товар", "error");
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Товари</h1>
        <Link
          href="/manager/products/new"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Додати товар
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Пошук товарів..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">Товарів не знайдено</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-12">Фото</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Назва</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Ціна</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Знижка</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Розміри</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Наявність</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((p) => {
                const mainImg = p.images.find((img) => img.is_main) ?? p.images[0];
                const imgUrl = mainImg ? getMediaUrl(mainImg.image) : null;
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
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
                      <p className="font-medium text-gray-800">{p.vendor} {p.model_name}</p>
                      <p className="text-xs text-gray-400">{p.gender} · {p.prod_type}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{Number(p.full_price).toFixed(0)} грн</td>
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
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={`/manager/products/${p.id}`}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
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
                p === page ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-white"
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
