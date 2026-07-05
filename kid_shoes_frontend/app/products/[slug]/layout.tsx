import type { Metadata } from "next";
import { fetchProductForMetadata } from "@/app/lib/catalog";
import { productCanonicalUrl, SITE_URL } from "@/app/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

const FALLBACK_DESCRIPTION =
  "Магазин дитячого взуття ТАК і ТАК. Перегляньте каталог черевиків, кросівок і сандалів для дітей. Доставка Новою Поштою та УкрПоштою по Україні.";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const canonical = productCanonicalUrl(slug);

  const product = await fetchProductForMetadata(slug);
  if (!product) {
    return {
      title: "Товар не знайдено",
      description: FALLBACK_DESCRIPTION,
      alternates: { canonical },
    };
  }

  return {
    title: product.seo_title,
    description: product.seo_description || "Замовити дитяче взуття з доставкою по Україні.",
    openGraph: {
      title: product.seo_title,
      description: product.seo_description,
      url: `${SITE_URL}/products/${product.slug}`,
      images: product.images?.length ? [product.images[0].image] : [],
    },
    alternates: {
      canonical: productCanonicalUrl(product.slug),
    },
  };
}

export default function ProductDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
