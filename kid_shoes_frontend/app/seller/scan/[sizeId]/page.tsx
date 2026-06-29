"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import api, { getMediaUrl } from "@/app/lib/api";
import { useShop } from "@/app/context/ShopContext";
import { useAuth } from "@/app/context/AuthContext";
import { ArrowLeft, ShoppingBag } from "lucide-react";

interface ScanInfo {
  id: number;
  size: number;
  quantity: number;
  vendor: string;
  model_name: string;
  prod_type: string;
  slug: string;
  discounted_price: string;
  main_image: string | null;
}

export default function SellerScanPage() {
  const params = useParams();
  const sizeId = params?.sizeId as string;
  const router = useRouter();
  const { showToast } = useShop();
  const { user, isLoading: authLoading } = useAuth();

  const [info, setInfo] = useState<ScanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/seller/scan/${sizeId}`)}`);
      return;
    }
    if (!user.is_seller && !user.is_staff) {
      router.replace("/");
      return;
    }
    void (async () => {
      try {
        const res = await api.get<ScanInfo>(`/shop/product-sizes/${sizeId}/scan_info/`);
        setInfo(res.data);
      } catch {
        showToast("Товар не знайдено або недоступний", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [sizeId, user, authLoading, router, showToast]);

  const handleCreate = async () => {
    if (!info || info.quantity <= 0) {
      showToast("Немає товару на складі", "error");
      return;
    }
    setCreating(true);
    try {
      const res = await api.post<{ id: number }>("/shop/orders/staff/quick_sale/", {
        product_size: info.id,
        quantity: 1,
        recipient_full_name: buyerName.trim() || undefined,
        recipient_phone: buyerPhone.trim() || undefined,
      });
      showToast("Замовлення створено");
      router.push(`/seller/orders/${res.data.id}`);
    } catch {
      showToast("Не вдалося оформити замовлення", "error");
    } finally {
      setCreating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p>Товар не знайдено</p>
        <Link href="/seller/orders" className="text-teal-600 underline mt-2 inline-block">
          До замовлень
        </Link>
      </div>
    );
  }

  const imgSrc = info.main_image ? getMediaUrl(info.main_image) : null;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2">
        <ShoppingBag size={16} />
        Режим продавця — оформлення в магазині
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="relative aspect-square bg-gray-50">
          {imgSrc ? (
            <Image src={imgSrc} alt={`${info.vendor} ${info.model_name}`} fill unoptimized className="object-contain p-4" />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-300">Немає фото</div>
          )}
        </div>
        <div className="p-5 space-y-2">
          <p className="text-sm text-gray-500">{info.vendor}</p>
          <h1 className="text-xl font-bold text-gray-900">{info.model_name}</h1>
          <p className="text-sm text-gray-600">
            Розмір <span className="font-semibold text-teal-700">{info.size}</span>
            {" · "}
            {info.quantity > 0 ? (
              <span className="text-green-600">в наявності ({info.quantity} шт.)</span>
            ) : (
              <span className="text-red-600">немає на складі</span>
            )}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {Number(info.discounted_price).toFixed(0)} грн
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
        <h2 className="font-semibold text-gray-800 text-sm">Покупець (необов&apos;язково)</h2>
        <input
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          placeholder="ПІБ"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <input
          value={buyerPhone}
          onChange={(e) => setBuyerPhone(e.target.value)}
          placeholder="Телефон +380..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <button
        type="button"
        disabled={creating || info.quantity <= 0}
        onClick={handleCreate}
        className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white py-4 rounded-xl text-lg font-semibold transition-colors"
      >
        {creating ? "Оформлюємо..." : "Оформити замовлення"}
      </button>

      <Link href="/seller/orders" className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-teal-600">
        <ArrowLeft size={14} />
        До списку замовлень
      </Link>
    </div>
  );
}
