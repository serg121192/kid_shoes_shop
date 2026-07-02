const MAX_EDGE = 1920;
const JPEG_QUALITY = 0.85;
/** Vercel proxy limit ~4.5 MB — target lower with multipart overhead. */
const TARGET_MAX_BYTES = 3.5 * 1024 * 1024;

export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif") return file;

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

function resizeToJpeg(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      const attempt = (quality: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("blob"));
              return;
            }
            if (blob.size > TARGET_MAX_BYTES && quality > 0.5) {
              attempt(quality - 0.1);
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
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("load"));
    };
    img.src = url;
  });
}

export function isUploadTooLargeError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const ax = err as { response?: { status?: number; data?: { message?: string } } };
  return (
    ax.response?.status === 413 ||
    ax.response?.data?.message === "Request Entity Too Large"
  );
}
