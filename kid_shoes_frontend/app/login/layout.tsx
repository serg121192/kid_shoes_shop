import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Вхід",
  description: "Увійдіть до свого акаунту в магазині дитячого взуття ТАК і ТАК.",
  robots: { index: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
