import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Товар",
  description:
    "Детальний опис товару, розміри, ціна. Замовити дитяче взуття з доставкою Новою Поштою по всій Україні.",
  openGraph: {
    title: "Дитяче взуття — ТАК і ТАК",
    description: "Замовити дитяче взуття з доставкою по Україні.",
  },
};

export default function ProductDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
