import type { MetadataRoute } from "next";
import { SITE_URL } from "@/app/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/products", "/about"],
        disallow: ["/manager/", "/seller/", "/cart", "/checkout", "/orders", "/profile", "/wishlist"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
