import type { Metadata } from "next";
import { RETURN_POLICY_DESCRIPTION, RETURN_POLICY_TITLE, SITE_URL } from "@/app/lib/seo";

export const metadata: Metadata = {
  title: RETURN_POLICY_TITLE,
  description: RETURN_POLICY_DESCRIPTION,
  robots: { index: false, follow: true },
  openGraph: {
    title: `${RETURN_POLICY_TITLE} | ТАК і ТАК`,
    description: RETURN_POLICY_DESCRIPTION,
    url: "/return-policy",
  },
  alternates: {
    canonical: `${SITE_URL}/return-policy`,
  },
};

export default function ReturnPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
        Умови повернення та обміну товару
      </h1>

      <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 space-y-6 text-gray-700 leading-relaxed">
        <p className="text-gray-500 normal">
          У житті ситуації бувають різні: не підійшов розмір, не такий колір та ін.
          Тому, при здійсненні покупок у нашому магазині, Ви можете бути впевнені: 
          якщо з придбаним товаром буде щось не так - протягом 14 днів ви зможете здійснити 
          або повне повернення Ваших коштів, або поміняти товар на інший.
        </p>
        <p className="text-gray-500 normal">
          Під час отримання товару у відділенні, поштоматі Нової пошти або Укрпошти рекомендуємо 
          робити фото пакування та робити огляд товару на місці. Це значно спростить процедуру 
          оформлення повернення або обміну, якщо товар Вам не підійде з обʼєктивних причин або 
          буде доставлений в неналежному стані чи вигляді.
        </p>
        <p className="text-gray-500 normal">
          ЗАУВАЖИМО, що обмін та повернення придбаного товару здійснюється лише за умов та підстав,
          зазначених у ст. 8 та ст. 9 Закону України "Про захист прав споживачів" в ред. від 24.12.2024!
        </p>
      </div>
    </div>
  );
}
