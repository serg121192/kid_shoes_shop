"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/app/lib/api";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";

interface ReportRow {
  vendor: string;
  model_name: string;
  size: number;
  sold_qty: number;
  remaining: number;
  total_amount: number;
}

const PERIOD_LABELS: Record<string, string> = {
  today: "сьогодні",
  week: "за тиждень",
  month: "за місяць",
};

function ReportsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const period = searchParams.get("period") ?? "today";

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get<ReportRow[]>("/shop/stats/report/", {
        params: { period },
      });
      setRows(res.data);
    } catch {
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await api.get("/shop/stats/report/xlsx/", {
        params: { period },
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${period}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Не вдалося завантажити звіт");
    } finally {
      setDownloading(false);
    }
  };

  const totalSold = rows.reduce((s, r) => s + (r.sold_qty ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600 transition-colors"
          >
            <ArrowLeft size={16} />
            Назад
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Звіт — {PERIOD_LABELS[period] ?? period}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Продані та заброньовані товари {PERIOD_LABELS[period] ?? period}
            </p>
          </div>
        </div>
        <button
          onClick={fetchReport}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600 transition-colors"
        >
          <RefreshCw size={14} />
          Оновити
        </button>
      </div>

      {/* Period switcher */}
      <div className="flex gap-2">
        {Object.entries(PERIOD_LABELS).map(([p, label]) => (
          <button
            key={p}
            onClick={() => router.push(`/manager/reports?period=${p}`)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              period === p
                ? "bg-teal-600 text-white"
                : "bg-white text-gray-600 hover:bg-teal-50 shadow-sm"
            }`}
          >
            {label.charAt(0).toUpperCase() + label.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            Продажів за цей період не знайдено
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-teal-600 text-white">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Бренд</th>
                <th className="text-left px-4 py-3 font-semibold">Модель</th>
                <th className="text-center px-4 py-3 font-semibold">Розмір</th>
                <th className="text-center px-4 py-3 font-semibold">Продано, шт.</th>
                <th className="text-center px-4 py-3 font-semibold">Залишок, шт.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-teal-50/40"}>
                  <td className="px-4 py-3 font-medium text-gray-800">{row.vendor}</td>
                  <td className="px-4 py-3 text-gray-700">{row.model_name}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{row.size}</td>
                  <td className="px-4 py-3 text-center font-semibold text-teal-600">
                    {row.sold_qty}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-medium ${row.remaining === 0 ? "text-red-500" : row.remaining <= 3 ? "text-amber-500" : "text-emerald-600"}`}>
                      {row.remaining}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td colSpan={3} className="px-4 py-3 font-bold text-gray-700">РАЗОМ</td>
                <td className="px-4 py-3 text-center font-bold text-teal-700">{totalSold} шт.</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Download button */}
      {!isLoading && rows.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <Download size={16} />
            {downloading ? "Завантаження..." : "Завантажити звіт, .xlsx"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    }>
      <ReportsContent />
    </Suspense>
  );
}
