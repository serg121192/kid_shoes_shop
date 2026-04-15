"use client";

import Image from "next/image";
import Link from "next/link";
import { ProductList } from "@/app/types";

interface ProductCardProps {
  product: ProductList;
  onAddToCart?: (productId: number) => void;
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

  return (
    <div
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col"
      style={
        product.gender === "girl"
          ? { ["--hover-bg" as string]: "#fdf2f8" }
          : product.gender === "boy"
            ? { ["--hover-bg" as string]: "#eff6ff" }
            : undefined
      }
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        if (product.gender === "girl") {
          el.style.outline = "2px solid #fbcfe8";
          el.style.backgroundColor = "#fdf2f8";
        } else if (product.gender === "boy") {
          el.style.outline = "2px solid #bfdbfe";
          el.style.backgroundColor = "#eff6ff";
        } else {
          el.style.outline = "2px solid #e9d5ff";
          el.style.background = "linear-gradient(to right, #fdf2f8 50%, #eff6ff 50%)";
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.outline = "";
        el.style.backgroundColor = "";
        el.style.background = "";
      }}
    >
      <Link href={`/products/${product.id}`} className="block relative">
        <div className="aspect-square bg-gray-100 relative overflow-hidden">
          {product.image ? (
            <Image
              src={product.image.startsWith("http") ? product.image : `http://127.0.0.1:8000${product.image}`}
              alt={`${product.vendor} ${product.model_name}`}
              fill
              unoptimized
              className="object-cover hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-6xl">
              👟
            </div>
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
          <h3 className="font-semibold text-gray-800 hover:text-indigo-600 transition-colors line-clamp-2">
            {product.vendor} {product.model_name}
          </h3>
        </Link>
        <p className="text-sm text-gray-500 mt-1">Розмір {product.size}</p>

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="font-bold text-indigo-600 text-lg">
            {Number(product.discounted_price).toFixed(2)} грн
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">
              {(Number(product.discounted_price) / (1 - product.discount / 100)).toFixed(2)} грн
            </span>
          )}
        </div>

        <p className={`text-xs mt-1 ${product.exists === "Товар закінчився" ? "text-gray-600" :
          product.exists === "Товар закінчується. Поспішіть придбати!" ? "text-yellow-400" :
            "text-green-400"
          }`}>
          {product.exists}
        </p>

        <div className="mt-auto pt-3 flex gap-2">
          {onAddToCart && (
            <button
              onClick={() => onAddToCart(product.id)}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
            >
              До кошика
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
