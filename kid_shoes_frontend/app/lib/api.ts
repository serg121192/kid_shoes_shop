import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
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

const MEDIA_BASE = process.env.NEXT_PUBLIC_MEDIA_BASE ?? "http://127.0.0.1:8000";

export function getMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${MEDIA_BASE}${path}`;
}
