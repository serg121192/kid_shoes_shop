import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Кошик",
  description: "Ваш кошик покупок у магазині дитячого взуття ТАК і ТАК.",
  robots: { index: false },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
