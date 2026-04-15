"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/app/lib/api";
import { Wishlist } from "@/app/types";
import { useAuth } from "@/app/context/AuthContext";
import { Heart } from "lucide-react";

export default function WishlistPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [wishlist, setWishlist] = useState<Wishlist | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchWishlist = useCallback(async () => {
        try {
            const response = await api.get<{ results: Wishlist[] } | Wishlist[]>("/shop/wishlist/");
            const data = response.data;
            const list = Array.isArray(data) ? data : data.results;
            setWishlist(list[0] ?? null);
        } catch {
            setWishlist(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
            return;
        }
        if (!authLoading && isAuthenticated) {
            fetchWishlist();
        }
    }, [authLoading, isAuthenticated, router, fetchWishlist]);

    const handleRemove = async (productId: number) => {
        try {
            await api.post("/shop/wishlist/me/remove_wish/", { product: productId });
            fetchWishlist();
        } catch {
            alert("Не вдалося видалити товар");
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
        );
    }

    if (!wishlist || wishlist.products.length === 0) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-16 text-center">
                <Heart size={64} className="mx-auto text-gray-300 mb-4" />
                <h2 className="text-2xl font-bold text-gray-700 mb-2">Список вибраного порожній</h2>
                <p className="text-gray-500 mb-6">Додайте товари які вам сподобались</p>
                <Link
                    href="/products"
                    className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
                >
                    До каталогу
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Вибране</h1>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {wishlist.products.map((product) => (
                    <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
                        <Link href={`/products/${product.id}`} className="block">
                            <div className="aspect-square bg-gray-100 relative overflow-hidden">
                                {product.image ? (
                                    <Image
                                        src={product.image.startsWith("http") ? product.image : `http://127.0.0.1:8000${product.image}`}
                                        alt={product.model_name}
                                        fill
                                        unoptimized
                                        className="object-cover hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-5xl">👟</div>
                                )}
                            </div>
                        </Link>
                        <div className="p-3 flex flex-col flex-1">
                            <Link href={`/products/${product.id}`}>
                                <h3 className="font-semibold text-gray-800 hover:text-indigo-600 text-sm line-clamp-2">
                                    {product.vendor} {product.model_name}
                                </h3>
                            </Link>
                            <p className="text-indigo-600 font-bold mt-1">
                                {Number(product.discounted_price).toFixed(2)} грн
                            </p>
                            <button
                                onClick={() => handleRemove(product.id)}
                                className="mt-auto pt-2 text-xs text-red-400 hover:text-red-600 transition-colors text-left"
                            >
                                ♥ Видалити
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}