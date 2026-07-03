import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    // Axios має сам виставити multipart boundary; інакше файл не доходить до Django/R2.
    if (config.headers) {
      delete config.headers["Content-Type"];
    }
  }
  if (config.url && !config.url.includes("?") && !config.url.endsWith("/")) {
    config.url = config.url + "/";
  }
  return config;
});

let isRefreshing = false;
let refreshSubscribers: Array<() => void> = [];

function onRefreshed() {
  refreshSubscribers.forEach((cb) => cb());
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push(() => resolve(api(originalRequest)));
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post("/api/user/token/refresh/", {}, { withCredentials: true });
        isRefreshing = false;
        onRefreshed();
        return api(originalRequest);
      } catch {
        isRefreshing = false;
        refreshSubscribers = [];
        window.dispatchEvent(new Event("auth:expired"));
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

const R2_PUBLIC = (process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN ?? "")
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

const MEDIA_BASE =
  process.env.NEXT_PUBLIC_MEDIA_BASE?.replace(/\/$/, "") ??
  (R2_PUBLIC ? `https://${R2_PUBLIC}` : "http://127.0.0.1:8000");

export function getMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${MEDIA_BASE}${path}`;
}

/** Skip Next.js image optimizer for CDN URLs — direct R2 is faster on first load. */
export function isCdnMediaUrl(url: string | null | undefined): boolean {
  if (!url?.startsWith("https://")) return false;
  if (R2_PUBLIC && url.includes(R2_PUBLIC)) return true;
  return /\.r2\.(dev|cloudflarestorage\.com)/i.test(url);
}
