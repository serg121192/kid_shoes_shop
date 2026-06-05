import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Оформлення замовлення",
  description: "Оформлення бронювання товарів у магазині дитячого взуття ТАК і ТАК.",
  robots: { index: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
