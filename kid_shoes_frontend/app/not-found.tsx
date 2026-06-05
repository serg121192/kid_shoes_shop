import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Сторінку не знайдено",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-teal-500 mb-4 select-none">404</div>
        <h1 className="text-2xl font-semibold text-gray-800 mb-3">
          Сторінку не знайдено
        </h1>
        <p className="text-gray-500 mb-8">
          Схоже, сторінка, яку ви шукаєте, не існує або була переміщена.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/products"
            className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            До каталогу
          </Link>
          <Link
            href="/"
            className="inline-block border border-gray-300 hover:border-teal-400 text-gray-700 font-medium px-6 py-3 rounded-xl transition-colors"
          >
            На головну
          </Link>
        </div>
      </div>
    </div>
  );
}
