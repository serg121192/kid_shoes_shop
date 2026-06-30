import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/app/context/AuthContext";
import { ShopProvider } from "@/app/context/ShopContext";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import IntroVideoGate from "@/app/components/IntroVideoGate";
import ToastContainer from "@/app/components/Toast";
import VisitTracker from "@/app/components/VisitTracker";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export const metadata: Metadata = {
  metadataBase: new URL("https://tak-i-tak.com"),
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
    <html lang="uk" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white">
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="lazyOnload"
            />
            <Script id="ga-init" strategy="lazyOnload">
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
            <IntroVideoGate />
            <VisitTracker />
            <main className="flex-1">{children}</main>
            <Footer />
            <ToastContainer />
          </ShopProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
