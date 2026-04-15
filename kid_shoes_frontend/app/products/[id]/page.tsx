"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import api from "@/app/lib/api";
import { Product } from "@/app/types";
import { useAuth } from "@/app/context/AuthContext";
import { ShoppingCart, Heart, ArrowLeft } from "lucide-react";

const SEASON_LABELS: Record<string, string> = {
  Winter: "Зима",
  Summer: "Літо",
  Demiseason: "Демісезон",
  "Fleece Demiseason": "Демісезон (флісовий)",
};

const GENDER_LABELS: Record<string, string> = {
  boy: "Хлопчик",
  girl: "Дівчинка",
  unisex: "Унісекс",
};

const TYPE_LABELS: Record<string, string> = {
  Shoe: "Черевики",
  Sandals: "Сандалі",
  Sneakers: "Кросівки",
  Ugi: "Угги",
};

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inCart, setInCart] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [cartLoading, setCartLoading] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await api.get<Product>(`/shop/products/${id}/`);
        setProduct(response.data);
        setInCart(response.data.in_cart);
      } catch {
        router.push("/products");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [id, router]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setCartLoading(true);
    try {
      await api.post("/shop/cart/me/cart_add/", { product: Number(id), quantity });
      setInCart(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Не вдалося додати до кошика";
      alert(msg);
    } finally {
      setCartLoading(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    try {
      if (inWishlist) {
        await api.post("/shop/wishlist/me/remove_wish/", { product: Number(id) });
        setInWishlist(false);
      } else {
        await api.post("/shop/wishlist/me/add_wish/", { product: Number(id) });
        setInWishlist(true);
      }
    } catch {
      alert("Не вдалося оновити список вибраного");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!product) return null;

  const hasDiscount = product.discount > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        Назад до каталогу
      </button>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image */}
          <div className="aspect-square bg-gray-100 relative">
            {product.image ? (
              <Image
                src={product.image.startsWith("http") ? product.image : `http://127.0.0.1:8000${product.image}`}
                alt={`${product.vendor} ${product.model_name}`}
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-8xl">👟</div>
            )}
            {hasDiscount && (
              <span className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                -{product.discount}%
              </span>
            )}
          </div>

          {/* Info */}
          <div className="p-8 flex flex-col">
            <p className="text-sm text-indigo-600 font-medium uppercase tracking-wide">
              {product.vendor}
            </p>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{product.model_name}</h1>

            <div className="flex items-center gap-3 mt-4">
              {hasDiscount ? (
                <>
                  <span className="text-3xl font-bold text-indigo-600">
                    {Number(product.discounted_price).toFixed(2)} грн
                  </span>
                  <span className="text-xl text-gray-400 line-through">
                    {(Number(product.discounted_price) / (1 - product.discount / 100)).toFixed(2)} грн
                  </span>
                </>
              ) : (
                <span className="text-3xl font-bold text-indigo-600">
                  {Number(product.discounted_price).toFixed(2)} грн
                </span>
              )}
            </div>

            <p className="text-sm text-green-600 mt-1">{product.exists}</p>

            {/* Attributes */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                { label: "Розмір", value: String(product.size) },
                { label: "Сезон", value: SEASON_LABELS[product.season] ?? product.season },
                { label: "Тип", value: TYPE_LABELS[product.prod_type] ?? product.prod_type },
                { label: "Стать", value: GENDER_LABELS[product.gender] ?? product.gender },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-lg px-4 py-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                  <p className="font-medium text-gray-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {product.description && (
              <p className="mt-6 text-gray-600 text-sm leading-relaxed">{product.description}</p>
            )}

            {/* Quantity */}
            <div className="mt-6 flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Кількість:</span>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  −
                </button>
                <span className="px-4 py-1.5 text-gray-800 font-medium min-w-[3rem] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(product.quantity, q + 1))}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={cartLoading || product.quantity === 0}
                className={`flex-1 flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-colors ${inCart
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white"
                  }`}
              >
                <ShoppingCart size={18} />
                {inCart ? "В кошику" : cartLoading ? "Додаємо..." : "До кошика"}
              </button>
              <button
                onClick={handleToggleWishlist}
                className={`p-3 rounded-xl border-2 transition-colors ${inWishlist
                  ? "border-red-400 bg-red-50 text-red-500"
                  : "border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-400"
                  }`}
                title={inWishlist ? "Видалити з вибраного" : "Додати до вибраного"}
              >
                <Heart size={20} fill={inWishlist ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
