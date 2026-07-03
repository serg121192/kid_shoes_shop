"use client";

import { useEffect, useState } from "react";
import api from "@/app/lib/api";

function qrDownloadFileName(vendor: string, model: string, size: number) {
  const slug = [vendor, model, String(size)]
    .join("-")
    .replace(/[^\w\u0400-\u04FF.-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || `size-${size}`}.png`;
}

export default function SizePriceTagQr({
  sizeId,
  sizeLabel,
}: {
  sizeId: number;
  sizeLabel: number;
}) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [scanPath, setScanPath] = useState("");
  const [fileName, setFileName] = useState(`qr-size-${sizeLabel}.png`);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const info = await api.get<{
          scan_url: string;
          vendor: string;
          model_name: string;
          size: number;
        }>(`/shop/product-sizes/${sizeId}/scan_info/`);
        if (cancelled) return;
        setScanPath(info.data.scan_url.replace(/^https?:\/\/[^/]+/, ""));
        setFileName(
          qrDownloadFileName(info.data.vendor, info.data.model_name, info.data.size)
        );
        const res = await api.get(`/shop/product-sizes/${sizeId}/qr_code/`, {
          responseType: "blob",
        });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data as Blob);
        setQrUrl(objectUrl);
      } catch {
        if (!cancelled) setQrUrl(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sizeId, open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 w-full text-[10px] text-teal-600 hover:text-teal-800 hover:underline"
      >
        QR цінник
      </button>
    );
  }

  if (loading) {
    return (
      <p className="mt-2 text-[10px] text-gray-400 text-center">Завантаження QR…</p>
    );
  }

  if (!qrUrl) return null;

  return (
    <div className="mt-2 w-full border-t border-gray-100 pt-2 space-y-1">
      <img src={qrUrl} alt={`QR ${fileName}`} className="w-20 h-20 mx-auto" />
      <a
        href={qrUrl}
        download={fileName}
        className="block text-center text-[10px] text-teal-600 hover:underline"
      >
        Завантажити QR
      </a>
      {scanPath && (
        <p className="text-[9px] text-gray-400 text-center break-all leading-tight">
          {scanPath}
        </p>
      )}
    </div>
  );
}
