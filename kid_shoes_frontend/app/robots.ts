import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/products", "/about"],
        disallow: ["/manager/", "/seller/", "/cart", "/checkout", "/orders", "/profile", "/wishlist"],
      },
    ],
    sitemap: "https://tak-i-tak.com/sitemap.xml",
  };
}
