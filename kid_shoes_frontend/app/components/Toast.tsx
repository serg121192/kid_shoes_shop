"use client";

import { useShop } from "@/app/context/ShopContext";
import { CheckCircle, XCircle } from "lucide-react";

export default function ToastContainer() {
  const { toasts } = useShop();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none w-[90vw] max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`w-full flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-up pointer-events-auto break-words
            ${toast.type === "success"
              ? "bg-gray-900 text-white"
              : "bg-red-600 text-white"
            }`}
        >
          {toast.type === "success" ? (
            <CheckCircle size={16} className="shrink-0 text-green-400" />
          ) : (
            <XCircle size={16} className="shrink-0 text-red-200" />
          )}
          {toast.message}
        </div>
      ))}
    </div>
  );
}
