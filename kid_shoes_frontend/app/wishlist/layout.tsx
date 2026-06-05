import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Вподобані товари",
  description: "Список вподобаних товарів у магазині дитячого взуття ТАК і ТАК.",
  robots: { index: false },
};

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
