import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/app/context/AuthContext";
import { ShopProvider } from "@/app/context/ShopContext";
import Header from "@/app/components/Header";
import ToastContainer from "@/app/components/Toast";
import VisitTracker from "@/app/components/VisitTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TAK i TAK",
  description: "Так і Так Магазин дитячого взуття",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white">
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
