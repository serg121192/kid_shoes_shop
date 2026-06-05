import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Каталог дитячого взуття",
  description:
    "Купити дитяче взуття онлайн — черевики, кросівки, сандалі, кеди для хлопчиків і дівчаток. Фільтр за розміром, сезоном, брендом. Доставка Новою Поштою.",
  openGraph: {
    title: "Каталог дитячого взуття — ТАК і ТАК",
    description: "Широкий вибір дитячого взуття з доставкою по Україні.",
    url: "/products",
  },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
