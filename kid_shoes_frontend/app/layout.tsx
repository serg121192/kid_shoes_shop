import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/app/context/AuthContext";
import { ShopProvider } from "@/app/context/ShopContext";
import Header from "@/app/components/Header";
import ToastContainer from "@/app/components/Toast";
import VisitTracker from "@/app/components/VisitTracker";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tak-i-tak.vercel.app"),
  title: {
    default: "ТАК і ТАК — Магазин дитячого взуття",
    template: "%s | ТАК і ТАК",
  },
  description:
    "Інтернет-магазин дитячого взуття ТАК і ТАК. Широкий вибір черевиків, кросівок, сандалів для дітей. Доставка Новою Поштою по всій Україні.",
  keywords: ["дитяче взуття", "взуття для дітей", "купити дитяче взуття", "черевики для дітей", "кросівки дитячі"],
  openGraph: {
    siteName: "ТАК і ТАК",
    locale: "uk_UA",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white">
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        )}
        <AuthProvider>
          <ShopProvider>
            <Header />
            <VisitTracker />
            <main className="flex-1">{children}</main>
            <ToastContainer />
          </ShopProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
