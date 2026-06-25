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
        title: "Товар",
        description: "Дитяче взуття ТАК і ТАК",
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
      title: "Товар",
      description: "Дитяче взуття ТАК і ТАК",
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
