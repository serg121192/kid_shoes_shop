import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Мої замовлення",
  description: "Список ваших замовлень у магазині дитячого взуття ТАК і ТАК.",
  robots: { index: false },
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
