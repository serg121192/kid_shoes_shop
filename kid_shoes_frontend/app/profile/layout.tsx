import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Профіль",
  description: "Ваш профіль у магазині дитячого взуття ТАК і ТАК.",
  robots: { index: false },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
