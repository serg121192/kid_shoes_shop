"use client";

import { useState, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/app/lib/api";
import { ProductList, PaginatedResponse } from "@/app/types";
import { normalizeUaPhone } from "@/app/lib/phone";
import { useShop } from "@/app/context/ShopContext";
import { ArrowLeft, Search, Trash2, Plus } from "lucide-react";

interface LineItem {
  product_size: number;
  label: string;
  quantity: number;
  unitPrice: number;
  maxQty: number;
}

export default function SellerCreateOrderPage() {
  const router = useRouter();
  const { showToast } = useShop();

  const [form, setForm] = useState({
    recipient_full_name: "",
    recipient_phone: "",
    customer_email: "",
    delivery_type: "pickup" as "pickup" | "np_warehouse",
    city_name: "",
    warehouse_address: "",
    status: "received" as "pending" | "received" | "processing",
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ProductList[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductList | null>(null);
  const [pickSize, setPickSize] = useState("");
  const [pickQty, setPickQty] = useState("1");
  const [isSaving, setIsSaving] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.get<PaginatedResponse<ProductList>>("/shop/products/", {
        params: { search: q.trim(), page_size: 8 },
      });
      setSearchResults(res.data.results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runSearch(search);
  };

  const addLineItem = () => {
    if (!selectedProduct || !pickSize) return;
    const sizeObj = selectedProduct.sizes.find((s) => String(s.size) === pickSize);
    if (!sizeObj || sizeObj.quantity <= 0) {
      showToast("Обраний розмір недоступний", "error");
      return;
    }
    const qty = Math.max(1, Number(pickQty) || 1);
    if (qty > sizeObj.quantity) {
      showToast(`На складі лише ${sizeObj.quantity} шт.`, "error");
      return;
    }
    const label = `${selectedProduct.vendor} ${selectedProduct.model_name} — р.${sizeObj.size}`;
    setLineItems((prev) => {
      const existing = prev.find((i) => i.product_size === sizeObj.id);
      if (existing) {
        return prev.map((i) =>
          i.product_size === sizeObj.id
            ? { ...i, quantity: Math.min(i.quantity + qty, sizeObj.quantity) }
            : i
        );
      }
      return [
        ...prev,
        {
          product_size: sizeObj.id,
          label,
          quantity: qty,
          unitPrice: Number(selectedProduct.discounted_price),
          maxQty: sizeObj.quantity,
        },
      ];
    });
    setSelectedProduct(null);
    setPickSize("");
    setPickQty("1");
    setSearchResults([]);
    setSearch("");
  };

  const total = lineItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.recipient_full_name.trim() || !form.recipient_phone.trim()) {
      showToast("Вкажіть ім'я та телефон покупця", "error");
      return;
    }
    if (!lineItems.length) {
      showToast("Додайте хоча б один товар", "error");
      return;
    }
    if (form.delivery_type === "np_warehouse" && !form.warehouse_address.trim()) {
      showToast("Вкажіть відділення Нової Пошти", "error");
      return;
    }

    const phone = normalizeUaPhone(form.recipient_phone);
    setIsSaving(true);
    try {
      const delivery: Record<string, string> = {
        recipient_full_name: form.recipient_full_name.trim(),
        recipient_phone: phone,
        delivery_type: form.delivery_type,
      };
      if (form.delivery_type === "np_warehouse") {
        delivery.city_name = form.city_name.trim();
        delivery.warehouse_address = form.warehouse_address.trim();
      }

      const res = await api.post<{ id: number }>("/shop/orders/staff/create_order/", {
        delivery,
        items: lineItems.map((i) => ({
          product_size: i.product_size,
          quantity: i.quantity,
        })),
        customer_email: form.customer_email.trim() || undefined,
        status: form.status,
      });
      showToast(`Замовлення #${res.data.id} створено`);
      router.push("/seller/orders");
    } catch {
      showToast("Не вдалося створити замовлення", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/seller/orders" className="text-gray-500 hover:text-teal-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Нове замовлення</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Покупець</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">ПІБ отримувача *</label>
              <input
                value={form.recipient_full_name}
                onChange={(e) => setForm((p) => ({ ...p, recipient_full_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Телефон *</label>
              <input
                value={form.recipient_phone}
                onChange={(e) => setForm((p) => ({ ...p, recipient_phone: e.target.value }))}
                placeholder="+380XXXXXXXXX"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Email покупця (якщо є акаунт)</label>
              <input
                type="email"
                value={form.customer_email}
                onChange={(e) => setForm((p) => ({ ...p, customer_email: e.target.value }))}
                placeholder="необов'язково — для прив'язки до акаунта"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Доставка та статус</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Спосіб</label>
              <select
                value={form.delivery_type}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    delivery_type: e.target.value as "pickup" | "np_warehouse",
                  }))
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="pickup">Самовивіз (офлайн магазин)</option>
                <option value="np_warehouse">Нова Пошта — відділення</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Статус замовлення</label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    status: e.target.value as typeof form.status,
                  }))
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="received">Отримано (продаж у магазині)</option>
                <option value="pending">Очікується</option>
                <option value="processing">В обробці</option>
              </select>
            </div>
            {form.delivery_type === "np_warehouse" && (
              <>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Місто</label>
                  <input
                    value={form.city_name}
                    onChange={(e) => setForm((p) => ({ ...p, city_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Відділення *</label>
                  <input
                    value={form.warehouse_address}
                    onChange={(e) => setForm((p) => ({ ...p, warehouse_address: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Товари</h2>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Пошук за брендом або моделлю..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
            >
              {searching ? "..." : "Знайти"}
            </button>
          </form>

          {searchResults.length > 0 && !selectedProduct && (
            <ul className="border border-gray-100 rounded-lg divide-y max-h-48 overflow-y-auto">
              {searchResults.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(p);
                      const first = p.sizes.find((s) => s.quantity > 0);
                      setPickSize(first ? String(first.size) : "");
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-teal-50"
                  >
                    {p.vendor} {p.model_name} — {Number(p.discounted_price).toFixed(0)} грн
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selectedProduct && (
            <div className="bg-teal-50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">
                {selectedProduct.vendor} {selectedProduct.model_name}
              </p>
              <div className="flex flex-wrap gap-2 items-end">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Розмір</label>
                  <select
                    value={pickSize}
                    onChange={(e) => setPickSize(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                  >
                    <option value="">—</option>
                    {selectedProduct.sizes
                      .filter((s) => s.quantity > 0)
                      .map((s) => (
                        <option key={s.id} value={s.size}>
                          {s.size} ({s.quantity} шт.)
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Кількість</label>
                  <input
                    type="number"
                    min={1}
                    value={pickQty}
                    onChange={(e) => setPickQty(e.target.value)}
                    className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="flex items-center gap-1 bg-teal-600 text-white px-3 py-1.5 rounded-lg text-sm"
                >
                  <Plus size={14} /> Додати
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="text-xs text-gray-500 underline"
                >
                  Скасувати
                </button>
              </div>
            </div>
          )}

          {lineItems.length > 0 ? (
            <ul className="space-y-2">
              {lineItems.map((item) => (
                <li
                  key={item.product_size}
                  className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm"
                >
                  <span>{item.label} × {item.quantity}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      {(item.unitPrice * item.quantity).toFixed(2)} грн
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setLineItems((prev) =>
                          prev.filter((i) => i.product_size !== item.product_size)
                        )
                      }
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              ))}
              <p className="text-right font-bold text-gray-900 pt-2">
                Разом: {total.toFixed(2)} грн
              </p>
            </ul>
          ) : (
            <p className="text-sm text-gray-400">Додайте товари до замовлення</p>
          )}
        </section>

        <button
          type="submit"
          disabled={isSaving || !lineItems.length}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white py-3 rounded-xl font-semibold transition-colors"
        >
          {isSaving ? "Створюємо..." : "Створити замовлення"}
        </button>
      </form>
    </div>
  );
}
