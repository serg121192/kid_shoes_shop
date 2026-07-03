import axios from "axios";
import api from "@/app/lib/api";
import { ProductImage, ProductVideo } from "@/app/types";

interface PresignUpload {
  key: string;
  upload_url: string;
  content_type: string;
  public_url?: string | null;
}

interface PreparedUploadItem {
  file: File;
  is_main: boolean;
  order: number;
}

interface PrepareVideoResponse {
  r2?: PresignUpload | null;
  backend?: { url: string; token: string } | null;
}

const BACKEND_PUBLIC = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

function backendVideoUploadUrl(productId: number, fromApi?: string): string {
  const trimmed = fromApi?.trim();
  if (trimmed) return trimmed;
  if (!BACKEND_PUBLIC) return "";
  return `${BACKEND_PUBLIC}/api/shop/products/${productId}/upload_video/`;
}

function putFileToPresignedUrl(
  url: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) return;
      onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`r2_put_${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("r2_cors"));
    xhr.onabort = () => reject(new Error("r2_aborted"));
    xhr.send(file);
  });
}

async function uploadVideoViaBackend(
  productId: number,
  file: File,
  title: string,
  order: number,
  token: string,
  uploadUrl?: string,
  onProgress?: (percent: number) => void,
): Promise<ProductVideo> {
  const url = backendVideoUploadUrl(productId, uploadUrl);
  if (!url || !token) {
    throw new Error("backend_upload_unavailable");
  }

  const fd = new FormData();
  fd.append("video", file);
  fd.append("title", title);
  fd.append("order", String(order));

  const res = await axios.post<ProductVideo>(url, fd, {
    headers: { "X-Video-Upload-Token": token },
    onUploadProgress: (event) => {
      if (!onProgress || !event.total) return;
      onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    },
  });
  onProgress?.(100);
  return res.data;
}

export async function uploadProductImagesDirect(
  productId: number,
  items: PreparedUploadItem[],
  onProgress?: (percent: number) => void,
): Promise<ProductImage[]> {
  if (!items.length) return [];

  const presignRes = await api.post<{ direct_upload: boolean; uploads?: PresignUpload[] }>(
    `/shop/products/${productId}/presign_images/`,
    {
      images: items.map(({ file }) => ({ content_type: file.type || "image/jpeg" })),
    },
  );

  if (!presignRes.data.direct_upload || !presignRes.data.uploads?.length) {
    return [];
  }

  const uploads = presignRes.data.uploads;
  let completedBytes = 0;
  const totalBytes = items.reduce((sum, item) => sum + item.file.size, 0);

  const reportProgress = (fileLoaded: number, fileSize: number, fileIndex: number) => {
    if (!onProgress || totalBytes <= 0) return;
    const loadedBefore = items
      .slice(0, fileIndex)
      .reduce((sum, item) => sum + item.file.size, 0);
    const overall = Math.round(((loadedBefore + fileLoaded) / totalBytes) * 100);
    onProgress(Math.min(99, overall));
  };

  await Promise.all(
    items.map(async (item, index) => {
      const target = uploads[index];
      if (!target) throw new Error("missing presign target");
      await putFileToPresignedUrl(target.upload_url, item.file, target.content_type, (pct) => {
        reportProgress((pct / 100) * item.file.size, item.file.size, index);
      });
      completedBytes += item.file.size;
      if (onProgress && totalBytes > 0) {
        onProgress(Math.min(99, Math.round((completedBytes / totalBytes) * 100)));
      }
    }),
  );

  const confirmRes = await api.post<ProductImage[]>(
    `/shop/products/${productId}/confirm_images/`,
    {
      images: items.map((item, index) => ({
        key: uploads[index].key,
        is_main: item.is_main,
        order: item.order,
      })),
    },
  );

  onProgress?.(100);
  return confirmRes.data;
}

export async function uploadProductImagesViaProxy(
  productId: number,
  items: PreparedUploadItem[],
  onProgress?: (percent: number) => void,
): Promise<ProductImage[]> {
  if (!items.length) return [];

  const BATCH_MAX_BYTES = 3.2 * 1024 * 1024;
  const batches: PreparedUploadItem[][] = [];
  let current: PreparedUploadItem[] = [];
  let currentSize = 0;

  for (const item of items) {
    if (current.length && currentSize + item.file.size > BATCH_MAX_BYTES) {
      batches.push(current);
      current = [];
      currentSize = 0;
    }
    current.push(item);
    currentSize += item.file.size;
  }
  if (current.length) batches.push(current);

  const uploaded: ProductImage[] = [];
  let uploadedCount = 0;
  const totalFiles = items.length;

  for (const batch of batches) {
    if (batch.length === 1) {
      const { file, is_main, order } = batch[0];
      const fd = new FormData();
      fd.append("image", file);
      fd.append("is_main", is_main ? "true" : "false");
      fd.append("order", String(order));
      const res = await api.post<ProductImage>(
        `/shop/products/${productId}/upload_image/`,
        fd,
        {
          onUploadProgress: (event) => {
            if (!onProgress) return;
            const batchPct = event.total ? event.loaded / event.total : 0;
            onProgress(
              Math.round(((uploadedCount + batchPct) / totalFiles) * 100),
            );
          },
        },
      );
      uploaded.push(res.data);
      uploadedCount += 1;
      continue;
    }

    const fd = new FormData();
    batch.forEach(({ file }) => fd.append("images", file));
    fd.append(
      "meta",
      JSON.stringify(batch.map(({ is_main, order }) => ({ is_main, order }))),
    );
    const res = await api.post<ProductImage[]>(
      `/shop/products/${productId}/upload_images/`,
      fd,
      {
        onUploadProgress: (event) => {
          if (!onProgress) return;
          const batchPct = event.total ? event.loaded / event.total : 0;
          onProgress(
            Math.min(
              99,
              Math.round(
                ((uploadedCount + batchPct * batch.length) / totalFiles) * 100,
              ),
            ),
          );
        },
      },
    );
    uploaded.push(...res.data);
    uploadedCount += batch.length;
  }

  onProgress?.(100);
  return uploaded;
}

export async function uploadProductImages(
  productId: number,
  items: PreparedUploadItem[],
  onProgress?: (percent: number) => void,
): Promise<ProductImage[]> {
  try {
    const direct = await uploadProductImagesDirect(productId, items, onProgress);
    if (direct.length) return direct;
  } catch {
    // CORS / R2 unavailable — fallback through Vercel proxy
  }
  return uploadProductImagesViaProxy(productId, items, onProgress);
}

async function prepareVideoUpload(
  productId: number,
  contentType: string,
  filename: string,
): Promise<PrepareVideoResponse> {
  try {
    const res = await api.post<PrepareVideoResponse>(
      `/shop/products/${productId}/prepare_video_upload/`,
      { content_type: contentType, filename },
    );
    return res.data;
  } catch {
    const presignRes = await api.post<{
      direct_upload: boolean;
      reason?: string;
      upload?: PresignUpload;
    }>(`/shop/products/${productId}/presign_video/`, {
      content_type: contentType,
      filename,
    });
    if (!presignRes.data.direct_upload || !presignRes.data.upload) {
      throw new Error(presignRes.data.reason ?? "r2_not_configured");
    }
    return { r2: presignRes.data.upload, backend: null };
  }
}

/** Відео — R2 напряму, при збої — Railway (мимо ліміту Vercel ~4.5 MB). */
export async function uploadProductVideo(
  productId: number,
  file: File,
  title: string,
  order: number,
  onProgress?: (percent: number) => void,
): Promise<ProductVideo> {
  const contentType = file.type || "video/mp4";
  const prepared = await prepareVideoUpload(productId, contentType, file.name);

  const backendToken = prepared.backend?.token ?? "";
  const backendUrl = backendVideoUploadUrl(productId, prepared.backend?.url);

  if (prepared.r2?.upload_url) {
    try {
      await putFileToPresignedUrl(
        prepared.r2.upload_url,
        file,
        prepared.r2.content_type,
        onProgress,
      );
      const confirmRes = await api.post<ProductVideo>(
        `/shop/products/${productId}/confirm_video/`,
        { key: prepared.r2.key, title, order },
      );
      onProgress?.(100);
      return confirmRes.data;
    } catch (err) {
      if (!backendToken || !backendUrl) {
        if (err instanceof Error && err.message === "r2_cors") {
          throw new Error("r2_cors");
        }
        throw new Error("r2_upload_failed");
      }
    }
  }

  if (backendToken && backendUrl) {
    return uploadVideoViaBackend(
      productId,
      file,
      title,
      order,
      backendToken,
      backendUrl,
      onProgress,
    );
  }

  throw new Error("r2_not_configured");
}

export function videoUploadErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    if (err.message === "r2_not_configured" || err.message === "backend_upload_unavailable") {
      return "Пряме завантаження відео недоступне: перевірте R2 і BACKEND_URL на Railway, NEXT_PUBLIC_BACKEND_URL на Vercel.";
    }
    if (err.message === "r2_cors") {
      return "Браузер заблокував завантаження в R2. У Cloudflare R2 → CORS додайте PUT для https://tak-i-tak.com (AllowedHeaders: Content-Type).";
    }
    if (err.message === "r2_upload_failed") {
      return "Не вдалося відправити відео в R2. Спробуйте MP4 або перевірте CORS на bucket.";
    }
  }
  if (axios.isAxiosError(err) && err.response?.status === 403) {
    return "Немає доступу для завантаження відео. Увійдіть знову в панель менеджера.";
  }
  return fallback;
}
