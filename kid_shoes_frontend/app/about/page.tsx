import type { Metadata } from "next";
import AboutVideoSection from "@/app/about/AboutVideoSection";
import { ABOUT_DESCRIPTION, ABOUT_TITLE, SEO_KEYWORDS } from "@/app/lib/seo";

export const metadata: Metadata = {
  title: ABOUT_TITLE,
  description: ABOUT_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  openGraph: {
    title: `${ABOUT_TITLE} | ТАК і ТАК`,
    description: ABOUT_DESCRIPTION,
    url: "/about",
  },
};

import { STORE_ADDRESS } from "@/app/lib/seo";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Про нас</h1>

      <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 space-y-6 text-gray-700 leading-relaxed">
        <p className="text-lg text-gray-800">
          <strong>ТАК і ТАК</strong> — магазин дитячого взуття в Чернігові. Ми підбираємо моделі від
          перевірених виробників: зручні, міцні та підходять для щоденного носіння й активних ігор.
        </p>

        <AboutVideoSection />

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Самовивіз</h2>
          <p>{STORE_ADDRESS}</p>
          <p className="text-sm text-gray-500 mt-2">
            Оформіть замовлення на сайті та оберіть «Самовивіз з магазину» — ми підготуємо товар до видачі.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Доставка</h2>
          <p>
            Доставляємо Новою Поштою по всій Україні: у відділення, поштомат або за адресою. Статус
            замовлення можна відстежити в особистому кабінеті.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Контакти</h2>
          <p>
            Питання щодо розміру, наявності або замовлення — напишіть нам на{" "}
            <a
              href="mailto:tak.i.tak.original@gmail.com"
              className="text-teal-600 hover:text-teal-700 underline"
            >
              tak.i.tak.original@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
