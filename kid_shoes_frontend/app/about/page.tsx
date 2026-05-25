import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Про нас — TAK i TAK",
  description: "Магазин дитячого взуття TAK i TAK у Чернігові. Якісне взуття для дітей від перевірених виробників.",
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Про нас</h1>

      {/* Placeholder — заповнюється контентом */}
      <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6 text-gray-700 leading-relaxed">
        <p className="text-lg text-gray-400 italic text-center py-16">
          Цей розділ незабаром буде заповнено інформацією про магазин.
        </p>
      </div>
    </div>
  );
}
