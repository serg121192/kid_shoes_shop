"use client";

import { useState, useEffect, use, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import api, { getMediaUrl } from "@/app/lib/api";
import { Product, ProductSizeWithCart, ProductImage, ProductVideo } from "@/app/types";
import { useAuth } from "@/app/context/AuthContext";
import { useShop } from "@/app/context/ShopContext";
import { ShoppingCart, Heart, ArrowLeft, Play, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import ReviewSection from "@/app/components/ReviewSection";

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-teal-50 transition-colors text-left"
      >
        <span className="font-semibold text-gray-800">{title}</span>
        <ChevronDown
          size={20}
          className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-6 py-5 bg-white text-gray-700 text-sm leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}

const SEASON_LABELS: Record<string, string> = {
  Winter: "Зима",
  Summer: "Літо",
  Demiseason: "Демісезон",
  "Fleece Demiseason": "Демісезон (флісовий)",
};

const GENDER_LABELS: Record<string, string> = {
  boy: "Хлопчик",
  girl: "Дівчинка",
  unisex: "Хлопчик/Дівчинка",
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
  const { showToast, setWishlistCount, refreshCounts } = useShop();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<ProductSizeWithCart | null>(null);
  const [inWishlist, setInWishlist] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [cartLoading, setCartLoading] = useState(false);
  const [reviewStats, setReviewStats] = useState<{ avg: number | null; count: number }>({
    avg: null,
    count: 0,
  });

  // Gallery state
  type MediaItem =
    | { kind: "image"; data: ProductImage }
    | { kind: "video"; data: ProductVideo };
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Autoplay video when user switches to a video item
  useEffect(() => {
    if (activeIndex >= 0 && mediaItems[activeIndex]?.kind === "video" && videoRef.current) {
      videoRef.current.play().catch(() => { });
    }
  }, [activeIndex, mediaItems]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await api.get<Product>(`/shop/products/${id}/`);
        const data = response.data;
        setProduct(data);
        setInWishlist(data.in_wishlist);
        setReviewStats({ avg: data.avg_rating, count: data.review_count });
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
    if (sz.quantity === 0 || sz.in_cart) return;
    setSelectedSize(sz);
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      if (selectedSize) {
        sessionStorage.setItem("pending_cart_item", String(selectedSize.id));
      }
      router.push("/login?next=/cart");
      return;
    }
    if (!selectedSize) return;

    setCartLoading(true);
    try {
      const addedSizeId = selectedSize.id;
      const addedQuantity = quantity;
      await api.post("/shop/cart/me/cart_add/", {
        product_size: addedSizeId,
        quantity: addedQuantity,
      });
      // Keep the detail page in sync with the user's cart state.
      setProduct((prev) =>
        prev
          ? {
            ...prev,
            sizes: prev.sizes.map((s) =>
              s.id === addedSizeId
                ? { ...s, in_cart: true, quantity: Math.max(0, s.quantity - addedQuantity) }
                : s
            ),
          }
          : prev
      );
      setSelectedSize(null);
      setQuantity(1);
      await refreshCounts();
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

  const handleBackToCatalog = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/products");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (!product) return null;

  const hasDiscount = product.discount > 0;
  const inCart = selectedSize?.in_cart ?? false;
  const maxQty = selectedSize?.quantity ?? 1;

  const activeItem = mediaItems[activeIndex] ?? null;
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < mediaItems.length - 1;
  let h1_text: string = '';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={handleBackToCatalog}
        className="flex items-center gap-2 text-gray-500 hover:text-teal-400 mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        Назад до каталогу
      </button>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden p-0">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Gallery */}
          <div className="flex flex-col bg-white">
            {/* Main viewer */}
            <div className="aspect-square relative group">
              {activeItem?.kind === "video" ? (
                <video
                  ref={videoRef}
                  key={(activeItem.data as ProductVideo).id}
                  src={getMediaUrl((activeItem.data as ProductVideo).video) ?? ""}
                  controls
                  autoPlay
                  loop
                  controlsList="nodownload"
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <>
                  {activeItem?.kind === "image" &&
                    getMediaUrl((activeItem.data as ProductImage).image) ? (
                    <Image
                      src={getMediaUrl((activeItem.data as ProductImage).image)!}
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
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow transition-opacity opacity-60 hover:opacity-100 disabled:opacity-0"
                  >
                    <ChevronLeft size={20} className="text-gray-700" />
                  </button>
                  <button
                    onClick={() => setActiveIndex((i) => Math.min(mediaItems.length - 1, i + 1))}
                    disabled={!hasNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow transition-opacity opacity-60 hover:opacity-100 disabled:opacity-0"
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
                      className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${isActive
                        ? "border-teal-600 shadow-md"
                        : "border-transparent hover:border-teal-300"
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
                        <span className="absolute bottom-0.5 left-0.5 text-[9px] bg-teal-600 text-white px-1 rounded leading-tight">
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
          <div className="p-8 flex flex-col bg-white">
            <h1 className="text-2xl font-bold text-gray-700 mt-1 tracking-wide">
              {(() => {
                switch (product.prod_type) {
                  case "Shoe":
                    h1_text = "Черевики для";
                    break;
                  case "Sandals":
                    h1_text = "Сандалі для";
                    break;
                  case "Sneakers":
                    h1_text = "Кросівки для";
                    break;
                  case "Ugi":
                    h1_text = "Уггі для";
                    break;
                  default:
                    h1_text = "Взуття для ";
                }
                return `${h1_text} ${product.gender === "boy" ? "хлопчика" : "дівчинки"} ${product.vendor.toUpperCase()}`;
              })()}
            </h1>
            <p className="text-medium text-teal-600 font-medium mt-1">
              `Код: ${product.model_name}`
            </p>

            <div className="flex items-center gap-3 mt-4">
              {hasDiscount ? (
                <>
                  <span className="text-2xl font-bold text-rose-400">
                    {Number(product.discounted_price).toFixed(2)} грн
                  </span>
                  <span className="text-xl text-gray-400 line-through">
                    {Number(product.full_price).toFixed(2)} грн
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold text-rose-400">
                  {Number(product.discounted_price).toFixed(2)} грн
                </span>
              )}
            </div>

            {reviewStats.avg !== null && (
              <div className="flex items-center gap-1.5 mt-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <svg
                    key={n}
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill={n <= Math.round(reviewStats.avg!) ? "#fbbf24" : "none"}
                    stroke="#fbbf24"
                    strokeWidth={2}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
                <span className="text-sm font-semibold text-amber-500">{reviewStats.avg.toFixed(1)}</span>
                <span className="text-xs text-gray-400">({reviewStats.count} {reviewStats.count === 1 ? "відгук" : reviewStats.count < 5 ? "відгуки" : "відгуків"})</span>
              </div>
            )}
            <p className="text-sm text-yellow-400 mt-1">{product.exists}</p>

            {/* Attributes */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                { label: "Сезон", value: SEASON_LABELS[product.season] ?? product.season },
                { label: "Тип", value: TYPE_LABELS[product.prod_type] ?? product.prod_type },
                { label: "Стать", value: GENDER_LABELS[product.gender] ?? product.gender },
              ].map(({ label, value }) => (
                <div key={label} className="bg-teal-50 rounded-lg px-4 py-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                  <p className="font-medium text-gray-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {/* Short description */}
            {product.description && (
              <p className="mt-6 text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            )}

            {/* Size selection */}
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Розмір:{" "}
                {selectedSize ? (
                  <span className="text-teal-500 font-bold">{selectedSize.size}</span>
                ) : (
                  <span className="text-gray-400">оберіть розмір</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((sz) => {
                  const inStock = sz.quantity > 0;
                  const isSelected = sz.id === selectedSize?.id;
                  const isDisabled = !inStock || sz.in_cart;
                  return (
                    <button
                      key={sz.id}
                      onClick={() => handleSelectSize(sz)}
                      disabled={isDisabled}
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
                            ? "border-gray-700 bg-teal-400 text-white shadow-sm"
                            : sz.in_cart
                              ? "border-green-400 bg-green-50 text-green-600 cursor-not-allowed"
                              : "border-gray-300 text-gray-700 hover:border-teal-400 hover:text-teal-600"
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
                className={`flex-1 flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-colors ${inCart
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : !selectedSize
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-teal-600 hover:bg-teal-800 disabled:bg-gray-300 text-white"
                  }`}
              >
                <ShoppingCart size={18} />
                {inCart
                  ? "В кошику"
                  : !selectedSize
                    ? "Обери розмір"
                    : cartLoading
                      ? "Додаємо..."
                      : "Додати в кошик"}
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

        {/* Accordion sections */}
        <div className="px-8 pb-4 space-y-3">

          {/* 1. Детальний опис (SEO) */}
          <Accordion title="Детальний опис">
            {product.seo_description ? (
              <p className="whitespace-pre-line">{product.seo_description}</p>
            ) : (
              <p className="text-gray-400 italic">Детальний опис незабаром буде додано.</p>
            )}
          </Accordion>

          {/* 2. Інструкція з вимірювання стопи */}
          <Accordion title="Інструкція з правильних замірів стопи дитини">
            <div className="space-y-4">
              <p>
                Правильно підібраний розмір взуття — запорука здоров'я та комфорту стопи дитини.
                Скористайтесь нашою інструкцією, щоб визначити розмір точно.
              </p>

              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Покладіть аркуш паперу на рівну тверду підлогу.</li>
                <li>Поставте дитину босою ногою на аркуш так, щоб п'ятка торкалась стіни або рівного краю.</li>
                <li>Олівцем обведіть стопу по контуру, тримаючи олівець строго вертикально.</li>
                <li>Виміряйте відстань від п'ятки до найдовшого пальця (зазвичай великого) — це <strong>довжина стопи</strong> у міліметрах.</li>
                <li>Додайте до отриманого значення <strong>5–7 мм</strong> запасу для комфортного руху пальців.</li>
                <li>Звірте результат з таблицею розмірів нижче або зверніться до нашого менеджера — ми допоможемо підібрати розмір!</li>
              </ol>

              <div className="bg-teal-50 rounded-xl p-4 text-sm">
                <p className="font-semibold text-teal-800 mb-2">Таблиця відповідності розмірів:</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs text-gray-700 border-collapse">
                    <thead>
                      <tr className="bg-teal-100">
                        <th className="px-2 py-1.5 rounded-tl-lg">Розмір EU</th>
                        {[18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40].map(s => (
                          <th key={s} className="px-2 py-1.5">{s}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-2 py-1.5 font-medium bg-teal-50">Стопа (мм)</td>
                        {[110, 116, 122, 128, 134, 140, 146, 152, 158, 164, 170, 176, 182, 188, 194, 206, 212, 218, 224, 230, 236, 242, 248].map((mm, i) => (
                          <td key={i} className="px-2 py-1.5 border-t border-teal-100">{mm}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-gray-500 text-xs">
                💡 Рекомендуємо вимірювати стопу ввечері — після активного дня вона може бути трохи більшою.
                Якщо стопа дитини між двома розмірами — обирайте більший.
              </p>

              {/* Placeholder для фото/відео — менеджер може додати через панель */}
              <p className="text-gray-400 text-xs italic mt-2">
                Відео-інструкція буде додана найближчим часом.
              </p>
            </div>
          </Accordion>

        </div>

        {/* Reviews */}
        <div className="px-8 pb-8">
          <ReviewSection
            productId={product.id}
            avgRating={reviewStats.avg}
            reviewCount={reviewStats.count}
            onReviewChange={async () => {
              const res = await import("@/app/lib/api").then((m) =>
                m.default.get<{ avg_rating: number | null; review_count: number }>(
                  `/shop/products/${id}/`
                )
              );
              setReviewStats({ avg: res.data.avg_rating, count: res.data.review_count });
            }}
          />
        </div>
      </div>
    </div>
  );
}
