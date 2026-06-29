"use client";

import { useEffect, useState } from "react";
import api from "@/app/lib/api";

export default function SizePriceTagQr({
  sizeId,
  sizeLabel,
}: {
  sizeId: number;
  sizeLabel: number;
}) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [scanPath, setScanPath] = useState("");

  useEffect(() => {
    let objectUrl: string | null = null;
    void (async () => {
      try {
        const info = await api.get<{ scan_url: string }>(
          `/shop/product-sizes/${sizeId}/scan_info/`
        );
        setScanPath(info.data.scan_url.replace(/^https?:\/\/[^/]+/, ""));
        const res = await api.get(`/shop/product-sizes/${sizeId}/qr_code/`, {
          responseType: "blob",
        });
        objectUrl = URL.createObjectURL(res.data as Blob);
        setQrUrl(objectUrl);
      } catch {
        setQrUrl(null);
      }
    })();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sizeId]);

  if (!qrUrl) return null;

  return (
    <div className="mt-2 w-full border-t border-gray-100 pt-2 space-y-1">
      <img src={qrUrl} alt={`QR ${sizeLabel}`} className="w-20 h-20 mx-auto" />
      <a
        href={qrUrl}
        download={`qr-size-${sizeLabel}.png`}
        className="block text-center text-[10px] text-teal-600 hover:underline"
      >
        QR цінник
      </a>
      {scanPath && (
        <p className="text-[9px] text-gray-400 text-center break-all leading-tight">
          {scanPath}
        </p>
      )}
    </div>
  );
}
