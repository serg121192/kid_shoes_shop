const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.78;
/** Per-file target — keeps batches under Vercel ~4.5 MB proxy limit. */
const TARGET_MAX_BYTES = 800 * 1024;
const MIN_QUALITY = 0.58;

export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif") return file;
  if (file.size <= TARGET_MAX_BYTES && file.type === "image/jpeg") return file;

  try {
    const compressed = await resizeToJpeg(file);
    if (compressed.size < file.size || file.size > TARGET_MAX_BYTES) {
      return compressed;
    }
    return file;
  } catch {
    return file;
  }
}

async function loadImageBitmap(file: File): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height };
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ source: img, width: img.width, height: img.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("load"));
    };
    img.src = url;
  });
}

function resizeToJpeg(file: File): Promise<File> {
  return loadImageBitmap(file).then(({ source, width: srcW, height: srcH }) => {
    const scale = Math.min(1, MAX_EDGE / Math.max(srcW, srcH));
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(source, 0, 0, width, height);
    if ("close" in source && typeof source.close === "function") {
      source.close();
    }

    return new Promise<File>((resolve, reject) => {
      const attempt = (quality: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("blob"));
              return;
            }
            if (blob.size > TARGET_MAX_BYTES && quality > MIN_QUALITY) {
              attempt(Math.max(MIN_QUALITY, quality - 0.12));
              return;
            }
            const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
            resolve(new File([blob], name, { type: "image/jpeg", lastModified: Date.now() }));
          },
          "image/jpeg",
          quality,
        );
      };
      attempt(JPEG_QUALITY);
    });
  });
}

export function isUploadTooLargeError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const ax = err as {
    response?: {
      status?: number;
      data?: {
        message?: string;
        error?: { code?: string | number; message?: string };
      };
    };
  };
  const nested = ax.response?.data?.error;
  return (
    ax.response?.status === 413 ||
    ax.response?.data?.message === "Request Entity Too Large" ||
    nested?.code === 413 ||
    nested?.code === "413" ||
    nested?.message === "Request Entity Too Large"
  );
}
