import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Відновлення пароля",
  description: "Відновіть доступ до свого акаунту в магазині ТАК і ТАК.",
  robots: { index: false },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
