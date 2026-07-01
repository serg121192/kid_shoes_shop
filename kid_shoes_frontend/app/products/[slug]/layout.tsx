import type { Metadata } from "next";

type Props = {
  params: {
    slug: string;
  };
};

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const { slug } = params;

  try {
    const res = await fetch(`/api/shop/products/${slug}/`, {
      next: {
        revalidate: 3600,
      },
    });

    if (!res.ok) {
      return {
        title: "Товар не знайдено",
        description:
          "Магазин дитячого взуття ТАК і ТАК. Перегляньте каталог черевиків, кросівок і сандалів для дітей. Доставка Новою Поштою та УкрПоштою по Україні.",
      };
    }

    const product = await res.json();

    return {
      title: product.seo_title,
      description:
        product.seo_description ||
        "Замовити дитяче взуття з доставкою по Україні.",
      openGraph: {
        title: product.seo_title,
        description: product.seo_description,
        images: product.images?.length ? [product.images[0].image] : [],
      },
      alternates: {
        canonical: `https://tak-i-tak.com/products/${product.slug}`,
      },
    };
  } catch {
    return {
      title: "Товар не знайдено",
      description:
        "Магазин дитячого взуття ТАК і ТАК. Перегляньте каталог черевиків, кросівок і сандалів для дітей. Доставка Новою Поштою та УкрПоштою по Україні.",
    };
  }
}

export default function ProductDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
