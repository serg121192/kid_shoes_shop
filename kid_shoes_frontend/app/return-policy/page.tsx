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
          Життєві ситуації бувають різні: не підійшов розмір, не такий колір та ін.
          Тому, при здійсненні покупок у нашому магазині, Ви можете бути впевнені: 
          якщо з придбаним товаром буде щось не так - протягом 14 днів ви зможете здійснити 
          або повне повернення Ваших коштів, або поміняти товар на інший.
        </p>

        <p className="text-gray-500 normal">
          Під час отримання товару у відділенні, поштоматі Нової пошти або Укрпошти рекомендуємо 
          робити фото пакування та робити огляд товару на місці. Це значно спростить процедуру 
          оформлення повернення або обміну, якщо товар Вам не підійде з обʼєктивних причин, або 
          буде доставлений в неналежному стані чи вигляді.
        </p>

        <h2 className="text-2l font-bold text-gray-700 mb-6">
          Порядок повернення/обміну придбаного товару:
        </h2>

        <ul className="text-gray-500 normal">
          <li>
            - Звʼяжіться з нашим менеджером зручним для Вас способом:
            <p>
              Телефон: +380938569255;
            </p>

            <p>
              Електронна пошта: tak.i.tak.original@gmail.com;
            </p>

            <p>
              Дірект: <span> </span>
              <a 
                href="https://instagram.com/taki_tak5_8/" 
                className="
                  text-teal-400 
                  hover:text-teal-700 
                  transition-colors 
                  duration-200"
              >Instagram</a>
            </p>
          </li>
          <li>
            - Детально опишіть причину повернення або обміну
          </li>
          <li>
            - Здійсніть відправлення посилки з придбаним товаром на відділення Нової пошти №4, м. Чернігів
          </li>
        </ul>

        <p className="text-gray-500 normal">
          Обмін та повернення здійснюються на БЕЗКОШТОВНІЙ основі. Пересилання товару поштовими службами
          здійснюється за рахунок покупця, крім випадків, коли відбулось доставлення покупцю не того товару або 
          не відповідної якості.
        </p>

        <p className="text-gray-500 normal">
          Повернення коштів або обмін товару покупцю здійснюється протягом 14 днів з моменту отримання товару магазином.
        </p>

        <p className="text-gray-500 normal">
          ЗАУВАЖИМО, що обмін та повернення придбаного товару здійснюється лише за умов та підстав,
          зазначених у ст. 8 та ст. 9 Закону України "Про захист прав споживачів"!
        </p>
      </div>
    </div>
  );
}
