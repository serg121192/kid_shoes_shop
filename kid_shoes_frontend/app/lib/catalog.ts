import { ProductList, PaginatedResponse } from "@/app/types";

export const CATALOG_PAGE_SIZE = 12;

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export interface CatalogFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  season?: string;
  prodType?: string;
  gender?: string;
  minPrice?: string;
  maxPrice?: string;
  hasDiscount?: boolean;
  size?: string;
}

export function buildCatalogParams(filters: CatalogFilters): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {
    page: filters.page ?? 1,
    page_size: filters.pageSize ?? CATALOG_PAGE_SIZE,
  };
  if (filters.search) params.search = filters.search;
  if (filters.season) params.season = filters.season;
  if (filters.prodType) params.prod_type = filters.prodType;
  if (filters.gender) params.gender = filters.gender;
  if (filters.minPrice) params.min_price = filters.minPrice;
  if (filters.maxPrice) params.max_price = filters.maxPrice;
  if (filters.hasDiscount) params.has_discount = true;
  if (filters.size) params.size = filters.size;
  return params;
}

export function isDefaultCatalogView(filters: CatalogFilters): boolean {
  return (
    (filters.page ?? 1) === 1 &&
    !filters.search &&
    !filters.season &&
    !filters.prodType &&
    !filters.gender &&
    !filters.minPrice &&
    !filters.maxPrice &&
    !filters.hasDiscount &&
    !filters.size
  );
}

export async function fetchProductForMetadata(slug: string, revalidateSeconds = 3600) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/shop/products/${encodeURIComponent(slug)}/`, {
      next: { revalidate: revalidateSeconds },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchCatalogProducts(
  filters: CatalogFilters = {},
  revalidateSeconds = 60,
): Promise<PaginatedResponse<ProductList>> {
  const params = buildCatalogParams(filters);
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    qs.set(key, String(value));
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/shop/products/?${qs}`, {
      next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) {
      return { count: 0, next: null, previous: null, results: [] };
    }
    return (await res.json()) as PaginatedResponse<ProductList>;
  } catch {
    return { count: 0, next: null, previous: null, results: [] };
  }
}
