import type { Metadata } from "next";
import ProductsCatalog from "@/app/products/ProductsCatalog";
import { fetchCatalogProducts } from "@/app/lib/catalog";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Каталог взуття",
  description:
    "Каталог дитячого взуття ТАК і ТАК. Черевики, кросівки, сандалі та інше — з доставкою по Україні.",
  alternates: {
    canonical: "https://tak-i-tak.com/products",
  },
};

export default async function ProductsPage() {
  const { results, count } = await fetchCatalogProducts({ page: 1 });

  return <ProductsCatalog initialProducts={results} initialCount={count} />;
}
