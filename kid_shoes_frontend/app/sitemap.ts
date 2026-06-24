import type { MetadataRoute } from "next";

const BASE_URL = process.env.SITE_BASE_URL ?? "https://tak-i-tak.com";
const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

type ProductShort = {
  id: number | string;
  updated_at?: string | null;
  created_at?: string | null;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/products`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  // Fetch products paginated from backend and add each product page
  try {
    let page = 1;
    let more = true;
    while (more) {
      const res = await fetch(`${BACKEND_URL}/shop/products/?page=${page}`, { cache: "no-store" });
      if (!res.ok) break;
      const data = await res.json();
      const results: ProductShort[] = data.results ?? data;
      if (!results || results.length === 0) break;

      for (const p of results) {
        const lastMod = p.updated_at ?? p.created_at ?? new Date().toISOString();
        urls.push({ url: `${BASE_URL}/products/${p.id}`, lastModified: new Date(lastMod) });
      }

      more = Boolean(data.next);
      page += 1;
    }
  } catch (err) {
    // If fetching products fails we still return base urls.
    // Logging available in server environment.
    // eslint-disable-next-line no-console
    console.error("sitemap: failed to fetch products", err);
  }

  return urls;
}
