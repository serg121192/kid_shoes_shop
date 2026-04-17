"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import api, { getMediaUrl } from "@/app/lib/api";
import { Product, ProductSizeWithCart, ProductImage, ProductVideo } from "@/app/types";
import { useAuth } from "@/app/context/AuthContext";
import { useShop } from "@/app/context/ShopContext";
import { ShoppingCart, Heart, ArrowLeft, Play, ChevronLeft, ChevronRight } from "lucide-react";

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
  const { showToast, setCartCount, setWishlistCount } = useShop();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<ProductSizeWithCart | null>(null);
  const [inWishlist, setInWishlist] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [cartLoading, setCartLoading] = useState(false);

  // Gallery state
  type MediaItem =
    | { kind: "image"; data: ProductImage }
    | { kind: "video"; data: ProductVideo };
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await api.get<Product>(`/shop/products/${id}/`);
        const data = response.data;
        setProduct(data);
        setInWishlist(data.in_wishlist);
        const firstAvailable = data.sizes.find((s) => s.quantity > 0) ?? null;
        setSelectedSize(firstAvailable);

        // Build ordered media list: images first (main first), then videos
        const imageItems: MediaItem[] = (data.images ?? []).map((img) => ({
          kind: "image",
          data: img,
        }));
        const videoItems: MediaItem[] = (data.videos ?? []).map((vid) => ({
          kind: "video",
          data: vid,
        }));
        const allMedia = [...imageItems, ...videoItems];
        setMediaItems(allMedia);
        // Start on the main image if present
        const mainIdx = imageItems.findIndex((m) => (m.data as ProductImage).is_main);
        setActiveIndex(mainIdx >= 0 ? mainIdx : 0);
      } catch {
        router.push("/products");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [id, router]);

  // Reset quantity when size changes
  useEffect(() => {
    setQuantity(1);
  }, [selectedSize]);

  const handleSelectSize = (sz: ProductSizeWithCart) => {
    if (sz.quantity === 0) return;
    setSelectedSize(sz);
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) { router.push("/login"); return; }
    if (!selectedSize) return;

    setCartLoading(true);
    try {
      await api.post("/shop/cart/me/cart_add/", {
        product_size: selectedSize.id,
        quantity,
      });
      // Mark size as in_cart locally
      setProduct((prev) =>
        prev
          ? {
              ...prev,
              sizes: prev.sizes.map((s) =>
                s.id === selectedSize.id ? { ...s, in_cart: true } : s
              ),
            }
          : prev
      );
      setSelectedSize((prev) => prev ? { ...prev, in_cart: true } : prev);
      setCartCount((c) => c + quantity);
      showToast("Товар успішно додано до кошику!");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Не вдалося додати до кошика";
      showToast(msg, "error");
    } finally {
      setCartLoading(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) { router.push("/login"); return; }
    try {
      if (inWishlist) {
        await api.post("/shop/wishlist/me/remove_wish/", { product: Number(id) });
        setInWishlist(false);
        setWishlistCount((c) => Math.max(0, c - 1));
        showToast("Видалено зі списку вибраного");
      } else {
        await api.post("/shop/wishlist/me/add_wish/", { product: Number(id) });
        setInWishlist(true);
        setWishlistCount((c) => c + 1);
        showToast("Додано до списку вибраного! ♥");
      }
    } catch {
      showToast("Не вдалося оновити список вибраного", "error");
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
  const fallbackImageUrl = getMediaUrl(product.image);
  const inCart = selectedSize?.in_cart ?? false;
  const maxQty = selectedSize?.quantity ?? 1;

  const activeItem = mediaItems[activeIndex] ?? null;
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < mediaItems.length - 1;

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
          {/* Gallery */}
          <div className="flex flex-col bg-gray-100">
            {/* Main viewer */}
            <div className="aspect-square relative group">
              {activeItem?.kind === "video" ? (
                <video
                  key={(activeItem.data as ProductVideo).id}
                  src={getMediaUrl((activeItem.data as ProductVideo).video) ?? ""}
                  controls
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <>
                  {(activeItem?.kind === "image"
                    ? getMediaUrl((activeItem.data as ProductImage).image)
                    : fallbackImageUrl) ? (
                    <Image
                      src={
                        activeItem?.kind === "image"
                          ? getMediaUrl((activeItem.data as ProductImage).image)!
                          : fallbackImageUrl!
                      }
                      alt={`${product.vendor} ${product.model_name}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-8xl">👟</div>
                  )}
                </>
              )}

              {hasDiscount && (
                <span className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full z-10">
                  -{product.discount}%
                </span>
              )}

              {/* Prev / Next arrows */}
              {mediaItems.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                    disabled={!hasPrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow transition-opacity opacity-0 group-hover:opacity-100 disabled:opacity-0"
                  >
                    <ChevronLeft size={20} className="text-gray-700" />
                  </button>
                  <button
                    onClick={() => setActiveIndex((i) => Math.min(mediaItems.length - 1, i + 1))}
                    disabled={!hasNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow transition-opacity opacity-0 group-hover:opacity-100 disabled:opacity-0"
                  >
                    <ChevronRight size={20} className="text-gray-700" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails strip */}
            {mediaItems.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto bg-gray-50 border-t border-gray-200">
                {mediaItems.map((item, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveIndex(idx)}
                      className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        isActive
                          ? "border-indigo-600 shadow-md"
                          : "border-transparent hover:border-indigo-300"
                      }`}
                    >
                      {item.kind === "video" ? (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                          <Play size={20} className="text-white" />
                          {(item.data as ProductVideo).title && (
                            <span className="sr-only">{(item.data as ProductVideo).title}</span>
                          )}
                        </div>
                      ) : (
                        <Image
                          src={getMediaUrl((item.data as ProductImage).image) ?? ""}
                          alt={`Фото ${idx + 1}`}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      )}
                      {item.kind === "image" && (item.data as ProductImage).is_main && (
                        <span className="absolute bottom-0.5 left-0.5 text-[9px] bg-indigo-600 text-white px-1 rounded leading-tight">
                          ★
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
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

            {/* Size selection */}
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Розмір:{" "}
                {selectedSize ? (
                  <span className="text-indigo-600 font-bold">{selectedSize.size}</span>
                ) : (
                  <span className="text-gray-400">оберіть розмір</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((sz) => {
                  const inStock = sz.quantity > 0;
                  const isSelected = sz.id === selectedSize?.id;
                  return (
                    <button
                      key={sz.id}
                      onClick={() => handleSelectSize(sz)}
                      disabled={!inStock}
                      title={
                        !inStock
                          ? `Розмір ${sz.size} — немає в наявності`
                          : sz.in_cart
                            ? `Розмір ${sz.size} — вже в кошику`
                            : `Розмір ${sz.size}`
                      }
                      className={`w-12 h-10 rounded-lg border-2 text-sm font-semibold transition-all
                        ${!inStock
                          ? "border-gray-200 text-gray-300 cursor-not-allowed line-through"
                          : isSelected
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                            : sz.in_cart
                              ? "border-green-400 text-green-600 hover:border-green-500"
                              : "border-gray-300 text-gray-700 hover:border-indigo-400 hover:text-indigo-600"
                        }`}
                    >
                      {sz.size}
                    </button>
                  );
                })}
              </div>
              {selectedSize && (
                <p className="text-xs text-gray-400 mt-1">
                  Залишилось: {selectedSize.quantity} шт
                </p>
              )}
            </div>

            {/* Quantity */}
            {selectedSize && (
              <div className="mt-4 flex items-center gap-3">
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
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={cartLoading || !selectedSize || selectedSize.quantity === 0}
                className={`flex-1 flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-colors ${
                  inCart
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : !selectedSize
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white"
                }`}
              >
                <ShoppingCart size={18} />
                {inCart
                  ? "В кошику"
                  : !selectedSize
                    ? "Оберіть розмір"
                    : cartLoading
                      ? "Додаємо..."
                      : "Додати в кошик"}
              </button>
              <button
                onClick={handleToggleWishlist}
                className={`p-3 rounded-xl border-2 transition-colors ${
                  inWishlist
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
