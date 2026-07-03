"use client";

import { useState } from "react";
import api from "@/app/lib/api";
import { ProductSize } from "@/app/types";
import { ChevronDown, Download } from "lucide-react";

function qrDownloadFileName(vendor: string, model: string, size: number) {
  const slug = [vendor, model, String(size)]
    .join("-")
    .replace(/[^\w\u0400-\u04FF.-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || `size-${size}`}.png`;
}

async function downloadQrForSize(sizeId: number, sizeLabel: number) {
  const info = await api.get<{
    scan_url: string;
    vendor: string;
    model_name: string;
    size: number;
  }>(`/shop/product-sizes/${sizeId}/scan_info/`);
  const res = await api.get(`/shop/product-sizes/${sizeId}/qr_code/`, {
    responseType: "blob",
  });
  const fileName = qrDownloadFileName(
    info.data.vendor,
    info.data.model_name,
    info.data.size,
  );
  const url = URL.createObjectURL(res.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return fileName;
}

export default function SizeQrPanel({ sizes }: { sizes: ProductSize[] }) {
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const sorted = [...sizes].filter((s) => s.id > 0).sort((a, b) => a.size - b.size);
  if (!sorted.length) return null;

  const handleDownload = async (size: ProductSize) => {
    setLoadingId(size.id);
    try {
      await downloadQrForSize(size.id, size.size);
    } catch {
      // silent — manager can retry
    } finally {
      setLoadingId(null);
    }
  };

  const handleDownloadAll = async () => {
    setBulkLoading(true);
    try {
      for (const size of sorted) {
        await downloadQrForSize(size.id, size.size);
      }
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 hover:bg-teal-50 text-left transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">QR цінники для магазину</span>
        <ChevronDown
          size={18}
          className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-4 py-3 space-y-3 bg-white border-t border-gray-100">
          <p className="text-xs text-gray-500">
            QR не генеруються автоматично — завантажте лише коли потрібно для друку цінників.
          </p>
          <button
            type="button"
            disabled={bulkLoading}
            onClick={() => void handleDownloadAll()}
            className="flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-900 disabled:opacity-50"
          >
            <Download size={14} />
            {bulkLoading ? "Завантаження…" : "Завантажити всі QR"}
          </button>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {sorted.map((size) => (
              <button
                key={size.id}
                type="button"
                disabled={loadingId === size.id || bulkLoading}
                onClick={() => void handleDownload(size)}
                className="flex items-center justify-between gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm hover:border-teal-300 hover:bg-teal-50 disabled:opacity-50 transition-colors"
              >
                <span className="font-medium text-gray-700">Розмір {size.size}</span>
                <Download size={14} className="text-teal-600 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
