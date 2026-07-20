import type { Metadata } from "next";
import AboutEmployeesSection from "@/app/about/AboutEmployeesSection";
import AboutVideoSection from "@/app/about/AboutVideoSection";
import { ABOUT_DESCRIPTION, ABOUT_TITLE, SITE_URL, STORE_ADDRESS } from "@/app/lib/seo";

export const metadata: Metadata = {
  title: ABOUT_TITLE,
  description: ABOUT_DESCRIPTION,
  robots: { index: false, follow: true },
  openGraph: {
    title: `${ABOUT_TITLE} | ТАК і ТАК`,
    description: ABOUT_DESCRIPTION,
    url: "/about",
  },
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Про нас</h1>

      <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 space-y-6 text-gray-700 leading-relaxed">
        <p className="text-lg text-gray-800">
          Магазин дитячого взуття <strong>ТАК і ТАК</strong> — Ми ваші консультанти з перших кроків малюка.
        </p>

        <AboutEmployeesSection />

        <AboutVideoSection />

        <p>
          Ми теж були мамами вперше і вже існують книги про: підготовку до пологів, вигодовування, дитячу психологію. 
          Але досі немає інструкції для мами-початківця "Як правильно підібрати зручне взуття для своєї дитини?"
        </p>

        <p>
          Любляча мама береже своє дитя ще до його народження.<br/> 
          Але багато матусь не знають важливості правильного підбору взуття.  Тут не йдеться, про красу чи стиль, а саме - про здоров'я та розвиток стопи дитини, - а за ними - і всього тіла та майбутньої постави.
        </p>

        <p>
          На жаль, просто почути інформацію, не означає, що її можна буде користуватися або розуміти. 
          Тому наша праця є унікальною!<br/>
          Ми просимо у мами розказати нам все необхідне про її дитину: вік, розмір ніжки та, навіть, вагу дитини, щоб допомогти з вибором  правильного, зручного та стильного взуття, яке буде максимально відповідати саме її дитині.
          Це все є важливою інформацією для нас, бо наша мета - дати здоровий розвиток Вашій дитині та максимальний комфорт у русі.<br/>
          Тому ми щиро рекомендуємо Вам звернутися саме до нас, надати нам всю необхідну інформацію та розслабитися. Всю іншу "брудну роботу" ми зробимо за Вас!
        </p>

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
            Доставку замовлень здійснюємо Новою Поштою та Укрпоштою по всій Україні: у відділення, поштомат або кур'єром за Вашою адресою. Статус
            замовлення можна відстежити в особистому кабінеті після підтвердження замовлення нашим менеджером.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Контакти</h2>
          <p>
            Питання щодо розміру, наявності або замовлення — напишіть нам у дірект в "Інстаграм" за посиланням: 
            <a
              href="https://www.instagram.com/taki_tak5_8/"
              className="text-teal-600 hover:text-teal-700 underline"
            >
              https://www.instagram.com/taki_tak5_8/
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
