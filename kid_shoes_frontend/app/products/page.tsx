import type { Metadata } from "next";
import ProductsCatalog from "@/app/products/ProductsCatalog";
import { fetchCatalogProducts } from "@/app/lib/catalog";
import { HOME_DESCRIPTION, HOME_TITLE, SEO_KEYWORDS, SITE_URL } from "@/app/lib/seo";

export const revalidate = 60;

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  openGraph: {
    title: `${HOME_TITLE} | ТАК і ТАК`,
    description: HOME_DESCRIPTION,
    url: "/products",
    type: "website",
  },
  alternates: {
    canonical: `${SITE_URL}/products`,
  },
};

export default async function ProductsPage() {
  const { results, count } = await fetchCatalogProducts({ page: 1 });

  return <ProductsCatalog initialProducts={results} initialCount={count} />;
}
