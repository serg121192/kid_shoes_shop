import type { MetadataRoute } from "next";

const BASE_URL = process.env.SITE_BASE_URL ?? "https://tak-i-tak.com";
const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

// Regenerate sitemap at most once per hour (compatible with static build on Vercel).
export const revalidate = 3600;

type ProductShort = {
  id: number | string;
  slug?: string;
  updated_at?: string | null;
  created_at?: string | null;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/products`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    let page = 1;
    let more = true;
    while (more) {
      const res = await fetch(`${BACKEND_URL}/api/shop/products/?page=${page}`, {
        next: { revalidate: 3600 },
      });
      if (!res.ok) break;
      const data = await res.json();
      const results: ProductShort[] = data.results ?? data;
      if (!results || results.length === 0) break;

      for (const p of results) {
        const path = p.slug ?? String(p.id);
        const lastMod = p.updated_at ?? p.created_at ?? new Date().toISOString();
        urls.push({ url: `${BASE_URL}/products/${path}`, lastModified: new Date(lastMod) });
      }

      more = Boolean(data.next);
      page += 1;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("sitemap: failed to fetch products", err);
  }

  return urls;
}
