import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HOME_DESCRIPTION, HOME_TITLE, SEO_KEYWORDS, SITE_URL } from "@/app/lib/seo";

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  alternates: {
    canonical: `${SITE_URL}/products`,
  },
};

export default function Home() {
  redirect("/products");
}
