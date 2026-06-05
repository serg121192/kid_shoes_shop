"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-rose-400 mb-4 select-none">500</div>
        <h1 className="text-2xl font-semibold text-gray-800 mb-3">
          Щось пішло не так
        </h1>
        <p className="text-gray-500 mb-8">
          На сервері сталася помилка. Спробуйте ще раз або поверніться до каталогу.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-medium px-6 py-3 rounded-xl transition-colors cursor-pointer"
          >
            Спробувати знову
          </button>
          <Link
            href="/products"
            className="inline-block border border-gray-300 hover:border-teal-400 text-gray-700 font-medium px-6 py-3 rounded-xl transition-colors"
          >
            До каталогу
          </Link>
        </div>
      </div>
    </div>
  );
}
