import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Реєстрація",
  description: "Створіть акаунт у магазині дитячого взуття ТАК і ТАК.",
  robots: { index: false },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
