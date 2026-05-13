"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ProductList } from "@/app/types";
import { getMediaUrl } from "@/app/lib/api";

interface ProductCardProps {
  product: ProductList;
  onAddToCart?: (productSizeId: number) => void;
  onToggleWishlist?: (productId: number) => void;
  isInWishlist?: boolean;
}

export default function ProductCard({
  product,
  onAddToCart,
  onToggleWishlist,
  isInWishlist = false,
}: ProductCardProps) {
  const hasDiscount = product.discount > 0;
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);

  const availableSizes = product.sizes ?? [];
  const selectedSize = availableSizes.find((s) => s.id === selectedSizeId) ?? null;

  const handleAddToCart = () => {
    if (!onAddToCart || !selectedSizeId) return;
    onAddToCart(selectedSizeId);
  };

  const mainImage = product.images?.find((img) => img.is_main) ?? product.images?.[0];
  const imageUrl = mainImage ? getMediaUrl(mainImage.image) : null;

  return (
    <div
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col"
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.outline = "";
        if (product.gender === "girl") {
          el.style.background = [
            "linear-gradient(105deg,rgb(255, 255, 255),rgb(255, 219, 239)) padding-box",
            "linear-gradient(105deg,rgb(255, 255, 255), #f472b6) border-box",
          ].join(", ");
          el.style.border = "2px solid transparent";
        } else if (product.gender === "boy") {
          el.style.background = [
            "linear-gradient(105deg,rgb(255, 255, 255),rgb(212, 227, 247)) padding-box",
            "linear-gradient(105deg,rgb(248, 250, 253),rgb(132, 189, 253)) border-box",
          ].join(", ");
          el.style.border = "2px solid transparent";
        } else {
          el.style.background = [
            "linear-gradient(105deg,rgb(255, 219, 239),rgb(212, 227, 247)) padding-box",
            "linear-gradient(105deg, #f9a8d4, #93c5fd) border-box",
          ].join(", ");
          el.style.border = "2px solid transparent";
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.outline = "";
        el.style.background = "";
        el.style.backgroundColor = "";
        el.style.border = "";
      }}
    >
      <Link href={`/products/${product.id}`} className="block relative">
        <div className="aspect-square bg-gray-100 relative overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`${product.vendor} ${product.model_name}`}
              fill
              unoptimized
              loading="eager"
              className="object-cover hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-6xl">👟</div>
          )}
          {hasDiscount && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              -{product.discount}%
            </span>
          )}
        </div>
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <Link href={`/products/${product.id}`}>
          <h3 className="font-bold text-gray-700 transition-colors line-clamp-2 text-xl">
            {product.vendor}
          </h3>
        </Link>
        <span className="font-medium text-cyan-600 text-sm">{product.model_name}</span>

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="font-bold text-rose-400 text-lg">
            {Number(product.discounted_price).toFixed(2)} грн
          </span>
          {hasDiscount && product.full_price && (
            <span className="text-sm text-gray-400 line-through">
              {Number(product.full_price).toFixed(2)} грн
            </span>
          )}
        </div>

        {/* Size chips */}
        {availableSizes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {availableSizes.map((sz) => {
              const inStock = sz.quantity > 0;
              const isSelected = sz.id === selectedSizeId;
              return (
                <button
                  key={sz.id}
                  onClick={() => inStock && setSelectedSizeId(isSelected ? null : sz.id)}
                  disabled={!inStock}
                  title={inStock ? `Розмір ${sz.size}` : `Розмір ${sz.size} — немає в наявності`}
                  className={`text-xs font-medium px-2 py-1 rounded border transition-colors
                    ${!inStock
                      ? "border-gray-200 text-gray-300 cursor-not-allowed line-through"
                      : isSelected
                        ? "border-teal-500 bg-teal-400 text-white"
                        : "border-teal-300 text-gray-400 hover:border-teal-500 hover:text-gray-500"
                    }`}
                >
                  {sz.size}
                </button>
              );
            })}
          </div>
        )}

        <p className={`text-xs mt-1 ${product.exists === "Товар закінчився"
          ? "text-gray-400"
          : product.exists === "Товар закінчується. Поспішіть придбати!"
            ? "text-yellow-500"
            : "text-green-500"
          }`}>
          {product.exists}
        </p>

        <div className="mt-auto pt-3 flex gap-2">
          {onAddToCart && (
            <button
              onClick={handleAddToCart}
              disabled={!selectedSizeId}
              title={!selectedSizeId ? "Оберіть розмір" : ""}
              className={`flex-1 text-sm font-medium py-2 px-3 rounded-lg transition-colors
                ${selectedSizeId
                  ? "bg-teal-600 hover:bg-teal-800 text-white"
                  : "bg-teal-50 text-gray-400 cursor-not-allowed"
                }`}
            >
              {selectedSizeId ? "Додати в кошик" : "Обери розмір"}
            </button>
          )}
          {onToggleWishlist && (
            <button
              onClick={() => onToggleWishlist(product.id)}
              className={`p-2 rounded-lg border transition-colors text-lg ${isInWishlist
                ? "border-red-300 bg-red-50 text-red-500"
                : "border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-400"
                }`}
              title={isInWishlist ? "Видалити з вибраного" : "Додати до вибраного"}
            >
              ♥
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
