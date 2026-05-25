"use client";

import {
  useState, useEffect, useRef, useCallback,
  DragEvent, ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import api, { getMediaUrl } from "@/app/lib/api";
import { useShop } from "@/app/context/ShopContext";
import { ArrowLeft, Upload, X, Plus, Trash2, Star } from "lucide-react";
import { Vendor, ProductImage, ProductSize, ProductVideo } from "@/app/types";

// ─── Local types ──────────────────────────────────────────────────────────────

interface PendingImage {
  localId: string;
  file: File;
  preview: string;
  is_main: boolean;
}

interface PendingSizeEntry {
  size: number;
  quantity: number;
}

interface PendingVideo {
  localId: string;
  file: File;
  title: string;
}

interface ProductDetail {
  id: number;
  vendor: string;
  model_name: string;
  prod_type: string;
  gender: string;
  season: string;
  full_price: string;
  discount: number;
  description: string | null;
  seo_description: string | null;
  sizes: ProductSize[];
  images: ProductImage[];
  videos: ProductVideo[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROD_TYPES = [
  { value: "Shoe",              label: "Черевики" },
  { value: "Sandals",           label: "Сандалі" },
  { value: "Sneakers",          label: "Кросівки / Кеди" },
  { value: "Ugi",               label: "Угі" },
];
const GENDERS = [
  { value: "boy",    label: "Хлопчик" },
  { value: "girl",   label: "Дівчинка" },
  { value: "unisex", label: "Хлопчик / Дівчинка" },
];
const SEASONS = [
  { value: "Winter",            label: "Зима" },
  { value: "Summer",            label: "Літо" },
  { value: "Demiseason",        label: "Демісезон" },
  { value: "Fleece Demiseason", label: "Демісезон флісовий" },
];
const SIZES = Array.from({ length: 27 }, (_, i) => i + 18);

function uid() {
  return Math.random().toString(36).slice(2);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductForm({ productId }: { productId?: number }) {
  const { showToast } = useShop();
  const router = useRouter();
  const isEdit = !!productId;

  // ── Basic form ──────────────────────────────────────────────────────────────
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [form, setForm] = useState({
    vendor: "",
    model_name: "",
    prod_type: "Shoe",
    gender: "unisex",
    season: "Winter",
    full_price: "",
    discount: "0",
    description: "",
    seo_description: "",
  });

  // ── Saved state (edit mode) ──────────────────────────────────────────────────
  const [savedImages, setSavedImages] = useState<ProductImage[]>([]);
  const [savedSizes, setSavedSizes]   = useState<ProductSize[]>([]);
  const [savedVideos, setSavedVideos] = useState<ProductVideo[]>([]);

  // ── Pending state (both create & edit for new uploads) ──────────────────────
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [pendingSizes, setPendingSizes]   = useState<PendingSizeEntry[]>([]);
  const [pendingVideos, setPendingVideos] = useState<PendingVideo[]>([]);

  // ── Size picker ─────────────────────────────────────────────────────────────
  const [newSize, setNewSize] = useState({ size: "18", quantity: "1" });

  // ── UI state ────────────────────────────────────────────────────────────────
  const [isDraggingImg, setIsDraggingImg] = useState(false);
  const [isDraggingVid, setIsDraggingVid] = useState(false);
  const [isSaving, setIsSaving]           = useState(false);
  const [isLoading, setIsLoading]         = useState(isEdit);

  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);

  // ── Load data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const vRes = await api.get<{ results?: Vendor[] } | Vendor[]>("/shop/vendors/");
        const list = Array.isArray(vRes.data)
          ? vRes.data
          : (vRes.data as { results?: Vendor[] }).results ?? [];
        setVendors(list);

        if (!isEdit) return;

        const pRes = await api.get<ProductDetail>(`/shop/products/${productId}/`);
        const p = pRes.data;
        const matched = list.find((v) => v.name === p.vendor);
        setForm({
          vendor: matched ? String(matched.id) : "",
          model_name: p.model_name,
          prod_type: p.prod_type,
          gender: p.gender,
          season: p.season,
          full_price: p.full_price,
          discount: String(p.discount),
          description: p.description ?? "",
          seo_description: p.seo_description ?? "",
        });
        setSavedImages(p.images);
        setSavedSizes(p.sizes);
        setSavedVideos(p.videos ?? []);
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [isEdit, productId]);

  // ── Form field handler ───────────────────────────────────────────────────────
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  // ── Image drag-and-drop ──────────────────────────────────────────────────────
  const handleImageFiles = useCallback(
    async (files: File[]) => {
      const imgs = files.filter((f) => f.type.startsWith("image/"));
      if (!imgs.length) return;

      if (isEdit && productId) {
        // Upload immediately
        for (const file of imgs) {
          const fd = new FormData();
          fd.append("image", file);
          const isMain = savedImages.length === 0 && pendingImages.length === 0;
          fd.append("is_main", isMain ? "true" : "false");
          fd.append("order", String(savedImages.length + pendingImages.length));
          try {
            const res = await api.post<ProductImage>(
              `/shop/products/${productId}/upload_image/`, fd,
              { headers: { "Content-Type": "multipart/form-data" } }
            );
            setSavedImages((prev) => {
              if (res.data.is_main) {
                return [...prev.map((i) => ({ ...i, is_main: false })), res.data];
              }
              return [...prev, res.data];
            });
          } catch {
            showToast(`Не вдалося завантажити ${file.name}`, "error");
          }
        }
      } else {
        // Queue locally
        setPendingImages((prev) => {
          const isFirstEver = prev.length === 0;
          return [
            ...prev,
            ...imgs.map((file, i) => ({
              localId: uid(),
              file,
              preview: URL.createObjectURL(file),
              is_main: isFirstEver && i === 0,
            })),
          ];
        });
      }
    },
    [isEdit, productId, savedImages, pendingImages, showToast]
  );

  const onImgDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDraggingImg(false);
    handleImageFiles(Array.from(e.dataTransfer.files));
  };
  const onImgInput = (e: ChangeEvent<HTMLInputElement>) => {
    handleImageFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  };

  // ── Video drag-and-drop ──────────────────────────────────────────────────────
  const handleVideoFiles = useCallback(
    async (files: File[]) => {
      const vids = files.filter((f) => f.type.startsWith("video/"));
      if (!vids.length) return;

      if (isEdit && productId) {
        for (const file of vids) {
          const fd = new FormData();
          fd.append("video", file);
          fd.append("order", String(savedVideos.length));
          try {
            const res = await api.post<ProductVideo>(
              `/shop/products/${productId}/upload_video/`, fd,
              { headers: { "Content-Type": "multipart/form-data" } }
            );
            setSavedVideos((prev) => [...prev, res.data]);
            showToast("Відео завантажено");
          } catch {
            showToast(`Не вдалося завантажити ${file.name}`, "error");
          }
        }
      } else {
        setPendingVideos((prev) => [
          ...prev,
          ...vids.map((file) => ({ localId: uid(), file, title: "" })),
        ]);
      }
    },
    [isEdit, productId, savedVideos, showToast]
  );

  const onVidDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDraggingVid(false);
    handleVideoFiles(Array.from(e.dataTransfer.files));
  };
  const onVidInput = (e: ChangeEvent<HTMLInputElement>) => {
    handleVideoFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  };

  // ── Saved image actions (edit mode) ──────────────────────────────────────────
  const handleSetMainSaved = async (imgId: number) => {
    try {
      await api.patch(`/shop/products/${productId}/set_main_image/${imgId}/`);
      setSavedImages((prev) =>
        prev.map((i) => ({ ...i, is_main: i.id === imgId }))
      );
    } catch {
      showToast("Помилка зміни головного фото", "error");
    }
  };

  const handleDeleteSavedImage = async (imgId: number) => {
    try {
      await api.delete(`/shop/products/${productId}/delete_image/${imgId}/`);
      setSavedImages((prev) => prev.filter((i) => i.id !== imgId));
      showToast("Фото видалено");
    } catch {
      showToast("Помилка видалення фото", "error");
    }
  };

  const handleDeleteSavedVideo = async (vidId: number) => {
    try {
      await api.delete(`/shop/products/${productId}/delete_video/${vidId}/`);
      setSavedVideos((prev) => prev.filter((v) => v.id !== vidId));
      showToast("Відео видалено");
    } catch {
      showToast("Помилка видалення відео", "error");
    }
  };

  const handleUpdateVideoTitle = async (vidId: number, title: string) => {
    setSavedVideos((prev) => prev.map((v) => v.id === vidId ? { ...v, title } : v));
  };

  // ── Pending image actions (create mode) ──────────────────────────────────────
  const removePendingImage = (localId: string) =>
    setPendingImages((prev) => {
      const filtered = prev.filter((i) => i.localId !== localId);
      // If deleted was main, set first remaining as main
      if (!filtered.some((i) => i.is_main) && filtered.length > 0) {
        filtered[0].is_main = true;
      }
      return filtered;
    });

  const setMainPending = (localId: string) =>
    setPendingImages((prev) =>
      prev.map((i) => ({ ...i, is_main: i.localId === localId }))
    );

  // ── Size logic ───────────────────────────────────────────────────────────────
  const handleAddOrUpdateSize = async () => {
    const sz = Number(newSize.size);
    const qty = Number(newSize.quantity);

    if (isEdit && productId) {
      try {
        const res = await api.post<ProductSize>(`/shop/products/${productId}/set_size/`, {
          size: sz, quantity: qty,
        });
        setSavedSizes((prev) => {
          const exists = prev.find((s) => s.id === res.data.id);
          return exists
            ? prev.map((s) => (s.id === res.data.id ? res.data : s))
            : [...prev, res.data];
        });
        showToast(`Розмір ${sz} збережено`);
      } catch {
        showToast("Помилка збереження розміру", "error");
      }
    } else {
      setPendingSizes((prev) => {
        const exists = prev.find((s) => s.size === sz);
        return exists
          ? prev.map((s) => (s.size === sz ? { size: sz, quantity: qty } : s))
          : [...prev, { size: sz, quantity: qty }];
      });
    }
  };

  const handleDeleteSize = async (sizeId: number, sizeNum: number) => {
    try {
      await api.delete(`/shop/products/${productId}/delete_size/${sizeId}/`);
      setSavedSizes((prev) => prev.filter((s) => s.id !== sizeId));
      showToast(`Розмір ${sizeNum} видалено`);
    } catch {
      showToast("Помилка видалення розміру", "error");
    }
  };

  const removePendingSize = (sz: number) =>
    setPendingSizes((prev) => prev.filter((s) => s.size !== sz));

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.vendor || !form.model_name || !form.full_price) {
      showToast("Заповніть обов'язкові поля", "error");
      return;
    }
    setIsSaving(true);
    const body = {
      vendor: Number(form.vendor),
      model_name: form.model_name,
      prod_type: form.prod_type,
      gender: form.gender,
      season: form.season,
      full_price: Number(form.full_price),
      discount: Number(form.discount),
      description: form.description || null,
      seo_description: form.seo_description || null,
    };

    try {
      if (isEdit) {
        await api.patch(`/shop/products/${productId}/`, body);
        showToast("Товар оновлено");
      } else {
        // 1. Create product
        const res = await api.post<{ id: number }>("/shop/products/", body);
        const newId = res.data.id;

        // 2. Upload pending images
        for (const img of pendingImages) {
          const fd = new FormData();
          fd.append("image", img.file);
          fd.append("is_main", img.is_main ? "true" : "false");
          fd.append("order", String(pendingImages.indexOf(img)));
          await api.post(`/shop/products/${newId}/upload_image/`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          }).catch(() => {/* non-blocking */});
        }

        // 3. Add pending sizes
        for (const s of pendingSizes) {
          await api.post(`/shop/products/${newId}/set_size/`, s)
            .catch(() => {/* non-blocking */});
        }

        // 4. Upload pending videos
        for (const v of pendingVideos) {
          const fd = new FormData();
          fd.append("video", v.file);
          fd.append("title", v.title);
          await api.post(`/shop/products/${newId}/upload_video/`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          }).catch(() => {/* non-blocking */});
        }

        showToast("Товар створено");
        router.replace(`/manager/products/${newId}`);
        return;
      }
    } catch {
      showToast("Помилка збереження", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const allImages = isEdit ? savedImages : pendingImages;
  const allSizes  = isEdit ? savedSizes  : pendingSizes;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/manager/products")}
          className="text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? "Редагувати товар" : "Новий товар"}
        </h1>
      </div>

      {/* ── Basic info ── */}
      <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-700">Основна інформація</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Виробник *</label>
            <select name="vendor" value={form.vendor} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">Оберіть...</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Назва моделі *</label>
            <input name="model_name" value={form.model_name} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Наприклад: Air Max 90" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Тип</label>
            <select name="prod_type" value={form.prod_type} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {PROD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Стать</label>
            <select name="gender" value={form.gender} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Сезон</label>
            <select name="season" value={form.season} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {SEASONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">Ціна (грн) *</label>
              <input name="full_price" type="number" value={form.full_price} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="0" min="0" />
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-gray-600 mb-1">Знижка %</label>
              <input name="discount" type="number" value={form.discount} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="0" min="0" max="100" />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Короткий опис</label>
          <textarea name="description" value={form.description ?? ""} onChange={handleChange} rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            placeholder="Короткий опис товару..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Детальний опис{" "}
            <span className="text-xs text-gray-400 font-normal">(SEO-текст — розгортається на картці товару)</span>
          </label>
          <textarea name="seo_description" value={form.seo_description ?? ""} onChange={handleChange} rows={6}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            placeholder="Детальний SEO-опис товару з ключовими словами..." />
        </div>
      </div>

      {/* ── Photos ── */}
      <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-700">Фото</h2>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDraggingImg(true); }}
          onDragLeave={() => setIsDraggingImg(false)}
          onDrop={onImgDrop}
          onClick={() => imgInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
            isDraggingImg ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-indigo-300"
          }`}
        >
          <Upload size={22} className="mx-auto text-gray-400 mb-1.5" />
          <p className="text-sm text-gray-500">Перетягніть фото або натисніть для вибору</p>
          <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP</p>
          <input ref={imgInputRef} type="file" multiple accept="image/*" onChange={onImgInput} className="hidden" />
        </div>

        {/* Saved images (edit) */}
        {isEdit && savedImages.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {savedImages.map((img) => {
              const url = getMediaUrl(img.image);
              return (
                <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
                  {url && <Image src={url} alt="" fill unoptimized className="object-cover" />}
                  {img.is_main && (
                    <span className="absolute top-1 left-1 bg-indigo-600 text-white text-[10px] px-1 rounded">
                      Головне
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    {!img.is_main && (
                      <button
                        onClick={() => handleSetMainSaved(img.id)}
                        title="Зробити головним"
                        className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center"
                      >
                        <Star size={12} className="text-white" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteSavedImage(img.id)}
                      className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <X size={12} className="text-white" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pending images (create) */}
        {!isEdit && pendingImages.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {pendingImages.map((img) => (
              <div key={img.localId} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
                <Image src={img.preview} alt="" fill unoptimized className="object-cover" />
                {img.is_main && (
                  <span className="absolute top-1 left-1 bg-indigo-600 text-white text-[10px] px-1 rounded">
                    Головне
                  </span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  {!img.is_main && (
                    <button onClick={() => setMainPending(img.localId)} title="Зробити головним"
                      className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                      <Star size={12} className="text-white" />
                    </button>
                  )}
                  <button onClick={() => removePendingImage(img.localId)}
                    className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <X size={12} className="text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {allImages.length === 0 && (
          <p className="text-xs text-gray-400 text-center">Фото ще не додано</p>
        )}
      </div>

      {/* ── Videos ── */}
      <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-700">Відео</h2>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDraggingVid(true); }}
          onDragLeave={() => setIsDraggingVid(false)}
          onDrop={onVidDrop}
          onClick={() => vidInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
            isDraggingVid ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-indigo-300"
          }`}
        >
          <Upload size={22} className="mx-auto text-gray-400 mb-1.5" />
          <p className="text-sm text-gray-500">Перетягніть відео або натисніть для вибору</p>
          <p className="text-xs text-gray-400 mt-0.5">MP4, MOV, WebM</p>
          <input ref={vidInputRef} type="file" multiple accept="video/*" onChange={onVidInput} className="hidden" />
        </div>

        {/* Saved videos */}
        {isEdit && savedVideos.length > 0 && (
          <ul className="space-y-2">
            {savedVideos.map((v) => (
              <li key={v.id} className="flex items-center gap-3 border border-gray-100 rounded-lg px-3 py-2">
                <span className="text-gray-400 text-sm">🎬</span>
                <input
                  value={v.title}
                  onChange={(e) => handleUpdateVideoTitle(v.id, e.target.value)}
                  placeholder="Назва відео (необов'язково)"
                  className="flex-1 text-sm border-none outline-none bg-transparent text-gray-700"
                />
                <button onClick={() => handleDeleteSavedVideo(v.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Pending videos */}
        {!isEdit && pendingVideos.length > 0 && (
          <ul className="space-y-2">
            {pendingVideos.map((v) => (
              <li key={v.localId} className="flex items-center gap-3 border border-gray-100 rounded-lg px-3 py-2">
                <span className="text-gray-400 text-sm">🎬</span>
                <span className="flex-1 text-sm text-gray-600 truncate">{v.file.name}</span>
                <input
                  value={v.title}
                  onChange={(e) => setPendingVideos((prev) =>
                    prev.map((pv) => pv.localId === v.localId ? { ...pv, title: e.target.value } : pv)
                  )}
                  placeholder="Назва відео"
                  className="w-36 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
                <button onClick={() => setPendingVideos((prev) => prev.filter((pv) => pv.localId !== v.localId))}
                  className="text-gray-300 hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {(isEdit ? savedVideos : pendingVideos).length === 0 && (
          <p className="text-xs text-gray-400 text-center">Відео ще не додано</p>
        )}
      </div>

      {/* ── Sizes ── */}
      <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-700">Розміри та залишки</h2>

        <div className="flex gap-2 items-end flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Розмір</label>
            <select value={newSize.size} onChange={(e) => setNewSize((p) => ({ ...p, size: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {SIZES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Кількість</label>
            <input type="number" value={newSize.quantity}
              onChange={(e) => setNewSize((p) => ({ ...p, quantity: e.target.value }))}
              min="0"
              className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <button onClick={handleAddOrUpdateSize}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={14} />
            {(isEdit ? savedSizes : pendingSizes).find((s) => s.size === Number(newSize.size))
              ? "Оновити" : "Додати"}
          </button>
        </div>

        {allSizes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {[...allSizes].sort((a, b) => a.size - b.size).map((s) => (
              <div key={s.size} className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
                <span className="font-medium text-gray-700">{s.size}</span>
                <span className={`text-xs ${s.quantity === 0 ? "text-red-500" : "text-gray-400"}`}>
                  {s.quantity} шт
                </span>
                <button
                  onClick={() =>
                    isEdit
                      ? handleDeleteSize((s as ProductSize).id, s.size)
                      : removePendingSize(s.size)
                  }
                  className="text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {allSizes.length === 0 && (
          <p className="text-xs text-gray-400">Розміри ще не додано</p>
        )}
      </div>

      {/* ── Save button ── */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
      >
        {isSaving
          ? "Зберігаємо..."
          : isEdit
          ? "Зберегти зміни"
          : "Створити товар"}
      </button>
    </div>
  );
}
