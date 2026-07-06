"use client";

import {
  useState, useEffect, useRef, useCallback,
  DragEvent, ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import api, { getMediaUrl } from "@/app/lib/api";
import { compressImageForUpload, isUploadTooLargeError } from "@/app/lib/compress-image";
import { uploadProductImages, uploadProductVideo, videoUploadErrorMessage } from "@/app/lib/r2-upload";
import { AxiosError } from "axios";
import { useShop } from "@/app/context/ShopContext";
import { ArrowLeft, Upload, X, Plus, Trash2, Star, Check } from "lucide-react";
import { Vendor, ProductImage, ProductSize, ProductVideo } from "@/app/types";

const SizeQrPanel = dynamic(() => import("@/app/components/SizeQrPanel"), {
  ssr: false,
});

function uploadErrorMessage(err: unknown, fallback: string): string {
  if (isUploadTooLargeError(err)) {
    return "Файл занадто великий для сервера. Спробуйте менший файл або зменшіть роздільність.";
  }
  if (err instanceof Error && err.message === "direct_upload_required") {
    return "Відео не завантажилось напряму в сховище. Перевірте CORS на R2 bucket (PUT з tak-i-tak.com).";
  }
  const videoMsg = videoUploadErrorMessage(err, "");
  if (videoMsg) return videoMsg;
  if (err instanceof AxiosError) {
    const data = err.response?.data;
    if (typeof data === "string" && data) return data;
    if (data && typeof data === "object") {
      const detail = (data as { detail?: string; error?: string }).detail
        ?? (data as { error?: string }).error;
      if (detail) return detail;
    }
    if (err.response?.status === 403) {
      return "Немає прав на завантаження (потрібен is_staff)";
    }
  }
  return fallback;
}

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
  progress?: number;   // 0–100, undefined = not uploading yet
  uploading?: boolean;
}

interface ProductDetail {
  id: number;
  vendor: string;
  vendor_id?: number;
  model_name: string;
  prod_type: string;
  gender: string;
  seasons: string[];
  full_price: string;
  discount: number;
  is_published: boolean;
  description: string | null;
  seo_description: string | null;
  seo_h1: string;
  seo_title: string;
  sizes: ProductSize[];
  images: ProductImage[];
  videos: ProductVideo[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROD_TYPES = [
  { value: "Shoe",              label: "Черевики" },
  { value: "Boots",             label: "Чоботи" },
  { value: "Sandals",           label: "Сандалі" },
  { value: "Sneakers",          label: "Кросівки / Кеди" },
  { value: "DressShoes",        label: "Туфлі" },
  { value: "Booties",           label: "Пінетки" },
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
const SIZES = Array.from({ length: 29 }, (_, i) => i + 16);

const DUPLICATE_MSG =
  "Така комбінація виробника (або бренду) та моделі вже існує";

function fieldClass(hasError: boolean) {
  return `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
    hasError
      ? "border-red-500 focus:ring-red-400"
      : "border-gray-200 focus:ring-teal-400"
  }`;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

function yieldToMain() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductForm({ productId }: { productId?: number }) {
  const { showToast } = useShop();
  const router = useRouter();
  const isEdit = !!productId;
  /** Server-side product id for create-mode early uploads (before final save). */
  const [draftProductId, setDraftProductId] = useState<number | null>(null);
  const activeProductId = productId ?? draftProductId ?? undefined;
  const hasServerProduct = activeProductId != null;
  const creatingDraftRef = useRef<Promise<number | null> | null>(null);
  /** In-flight compress + upload — save waits for this to finish. */
  const imageWorkRef = useRef<Promise<void> | null>(null);

  // ── Basic form ──────────────────────────────────────────────────────────────
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showNewVendor, setShowNewVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorLoading, setNewVendorLoading] = useState(false);
  const [form, setForm] = useState({
    vendor: "",
    model_name: "",
    prod_type: "Shoe",
    gender: "unisex",
    seasons: ["Winter"] as string[],
    full_price: "",
    discount: "0",
    is_published: false,
    description: "",
    seo_description: "",
    seo_h1: "",
    seo_title: "",
  });
  const formRef = useRef(form);
  formRef.current = form;

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
  // localId → upload progress 0–100 (edit mode live uploads)
  const [editUploadProgress, setEditUploadProgress] = useState<Record<string, number>>({});
  const [imageCompressProgress, setImageCompressProgress] = useState<{ current: number; total: number } | null>(null);
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
  const [isSaving, setIsSaving]           = useState(false);
  const [isLoading, setIsLoading]         = useState(isEdit);
  const [duplicateCombo, setDuplicateCombo] = useState(false);
  const [savingSizes, setSavingSizes] = useState<Set<number>>(new Set());

  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);

  // ── Load data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const vendorsPromise = api.get<{ results?: Vendor[] } | Vendor[]>("/shop/vendors/");
        if (!isEdit) {
          const vRes = await vendorsPromise;
          const list = Array.isArray(vRes.data)
            ? vRes.data
            : (vRes.data as { results?: Vendor[] }).results ?? [];
          setVendors(list);
          return;
        }

        const [vRes, pRes] = await Promise.all([
          vendorsPromise,
          api.get<ProductDetail>(`/shop/products/${productId}/`),
        ]);
        const list = Array.isArray(vRes.data)
          ? vRes.data
          : (vRes.data as { results?: Vendor[] }).results ?? [];
        setVendors(list);

        const p = pRes.data;
        const matched = list.find(
          (v) => v.name.trim().toLowerCase() === p.vendor.trim().toLowerCase(),
        );
        setForm({
          vendor: p.vendor_id
            ? String(p.vendor_id)
            : matched
              ? String(matched.id)
              : "",
          model_name: p.model_name,
          prod_type: p.prod_type,
          gender: p.gender,
          seasons: p.seasons?.length ? p.seasons : ["Winter"],
          full_price: p.full_price === "0.00" || p.full_price === "0" ? "" : p.full_price,
          discount: String(p.discount),
          is_published: p.is_published,
          description: p.description ?? "",
          seo_description: p.seo_description ?? "",
          seo_h1: p.seo_h1 ?? "",
          seo_title: p.seo_title ?? "",
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

  const buildProductBody = useCallback(() => {
    const f = formRef.current;
    const eligible = (Number(f.full_price) || 0) > 0;
    return {
      vendor: Number(f.vendor),
      model_name: f.model_name.trim(),
      prod_type: f.prod_type,
      gender: f.gender,
      seasons: f.seasons,
      full_price: f.full_price === "" ? 0 : Number(f.full_price),
      discount: Number(f.discount) || 0,
      description: f.description || null,
      seo_description: f.seo_description || null,
      seo_h1: f.seo_h1.trim() || null,
      seo_title: f.seo_title.trim() || null,
      is_published: eligible ? f.is_published : false,
    };
  }, []);

  const catalogEligible = (Number(form.full_price) || 0) > 0;

  const checkDuplicateCombo = useCallback(async (): Promise<boolean> => {
    const f = formRef.current;
    const model = f.model_name.trim();
    if (!f.vendor || !model) return false;

    const params: Record<string, string> = {
      vendor: f.vendor,
      model_name: model,
    };
    const exclude = productId ?? draftProductId;
    if (exclude) params.exclude = String(exclude);

    const res = await api.get<{ exists: boolean }>(
      "/shop/products/check_duplicate/",
      { params }
    );
    return res.data.exists;
  }, [productId, draftProductId]);

  useEffect(() => {
    const vendor = form.vendor;
    const model = form.model_name.trim();
    if (!vendor || !model) {
      setDuplicateCombo(false);
      return;
    }

    const timer = setTimeout(() => {
      void checkDuplicateCombo()
        .then(setDuplicateCombo)
        .catch(() => setDuplicateCombo(false));
    }, 400);

    return () => clearTimeout(timer);
  }, [form.vendor, form.model_name, checkDuplicateCombo]);

  const ensureDraftProduct = useCallback(async (): Promise<number | null> => {
    if (productId) return productId;
    if (draftProductId) return draftProductId;
    const f = formRef.current;
    if (!f.vendor || !f.model_name.trim()) return null;
    if (creatingDraftRef.current) return creatingDraftRef.current;

    creatingDraftRef.current = (async () => {
      try {
        if (await checkDuplicateCombo()) {
          setDuplicateCombo(true);
          showToast(DUPLICATE_MSG, "error");
          return null;
        }
        const res = await api.post<{ id: number }>("/shop/products/", buildProductBody());
        setDraftProductId(res.data.id);
        return res.data.id;
      } catch {
        showToast("Не вдалося створити чернетку товару", "error");
        return null;
      } finally {
        creatingDraftRef.current = null;
      }
    })();
    return creatingDraftRef.current;
  }, [productId, draftProductId, buildProductBody, checkDuplicateCombo, showToast]);

  const uploadImagesToServer = useCallback(
    async (id: number, items: { file: File; is_main: boolean }[]) => {
      if (!items.length) return;

      let orderBase = 0;
      let hasMain = false;
      setSavedImages((prev) => {
        orderBase = prev.length;
        hasMain = prev.some((i) => i.is_main);
        return prev;
      });

      let mainAssigned = hasMain;
      const prepared = items.map(({ file, is_main }, idx) => {
        const setAsMain = !mainAssigned && (is_main || idx === 0);
        if (setAsMain) mainAssigned = true;
        return { file, is_main: setAsMain, order: orderBase + idx };
      });

      const mergeUploaded = (uploaded: ProductImage[]) => {
        setSavedImages((prev) => {
          let next = [...prev];
          for (const img of uploaded) {
            if (img.is_main) next = next.map((i) => ({ ...i, is_main: false }));
            next.push(img);
          }
          return next;
        });
      };

      setImageUploadProgress(0);
      try {
        const uploaded = await uploadProductImages(id, prepared, setImageUploadProgress);
        mergeUploaded(uploaded);
      } finally {
        setImageUploadProgress(null);
      }
    },
    [],
  );

  const uploadVideoToServer = useCallback(
    async (id: number, file: File, title: string, localId?: string) => {
      const progressKey = localId ?? uid();
      setEditUploadProgress((prev) => ({ ...prev, [progressKey]: 0 }));
      try {
        const res = await uploadProductVideo(
          id,
          file,
          title,
          savedVideos.length,
          (pct) => {
            setEditUploadProgress((prev) => ({ ...prev, [progressKey]: pct }));
          },
        );
        setSavedVideos((prev) => [...prev, res]);
      } finally {
        setEditUploadProgress((prev) => {
          const next = { ...prev };
          delete next[progressKey];
          return next;
        });
      }
    },
    [savedVideos.length],
  );

  // When brand + model appear, upload media that was queued locally first.
  useEffect(() => {
    if (hasServerProduct || isLoading) return;
    if (!form.vendor || !form.model_name) return;
    if (pendingImages.length === 0 && pendingVideos.length === 0) return;

    void (async () => {
      const id = await ensureDraftProduct();
      if (!id) return;

      const imgs = pendingImages;
      if (imgs.length) {
        setPendingImages([]);
        try {
          await uploadImagesToServer(
            id,
            imgs.map((p) => ({ file: p.file, is_main: p.is_main }))
          );
        } catch (err) {
          showToast(uploadErrorMessage(err, "Не вдалося завантажити фото"), "error");
        }
      }

      const vids = [...pendingVideos];
      if (vids.length) {
        setPendingVideos([]);
        for (const v of vids) {
          try {
            await uploadVideoToServer(id, v.file, v.title, v.localId);
          } catch (err) {
            showToast(uploadErrorMessage(err, `Не вдалося завантажити ${v.file.name}`), "error");
          }
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.vendor, form.model_name, pendingImages.length, pendingVideos.length, hasServerProduct, isLoading]);

  // ── Form field handler ───────────────────────────────────────────────────────
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((p) => {
      const next = { ...p, [name]: value };
      if (name === "full_price") {
        const price = Number(value) || 0;
        if (price <= 0) next.is_published = false;
      }
      return next;
    });
  };

  // ── Create new vendor inline ──────────────────────────────────────────────────
  const handleCreateVendor = async () => {
    const name = newVendorName.trim();
    if (!name) return;
    setNewVendorLoading(true);
    try {
      const res = await api.post<Vendor>("/shop/vendors/", { name });
      const created = res.data;
      setVendors((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((p) => ({ ...p, vendor: String(created.id) }));
      setShowNewVendor(false);
      setNewVendorName("");
      showToast(`Бренд "${created.name}" створено`);
    } catch {
      showToast("Не вдалося створити бренд", "error");
    } finally {
      setNewVendorLoading(false);
    }
  };

  // ── Image drag-and-drop ──────────────────────────────────────────────────────
  const processImageFiles = useCallback(
    async (files: File[]) => {
      const imgs = files.filter((f) => f.type.startsWith("image/"));
      if (!imgs.length) return;

      setImageCompressProgress({ current: 0, total: imgs.length });
      const prepared: File[] = [];
      try {
        for (let i = 0; i < imgs.length; i++) {
          prepared.push(await compressImageForUpload(imgs[i]));
          setImageCompressProgress({ current: i + 1, total: imgs.length });
          await yieldToMain();
        }
      } finally {
        setImageCompressProgress(null);
      }

      const id = hasServerProduct ? activeProductId : await ensureDraftProduct();

      if (id) {
        const queued = pendingImages;
        if (queued.length) setPendingImages([]);
        const batch = [
          ...queued.map((p) => ({ file: p.file, is_main: p.is_main })),
          ...prepared.map((file, i) => ({
            file,
            is_main: queued.length === 0 && savedImages.length === 0 && i === 0,
          })),
        ];
        try {
          await uploadImagesToServer(id, batch);
        } catch (err) {
          showToast(uploadErrorMessage(err, "Не вдалося завантажити фото"), "error");
        }
        return;
      }

      setPendingImages((prev) => {
        const isFirstEver = prev.length === 0;
        return [
          ...prev,
          ...prepared.map((file, i) => ({
            localId: uid(),
            file,
            preview: URL.createObjectURL(file),
            is_main: isFirstEver && i === 0,
          })),
        ];
      });
      showToast("Вкажіть бренд і модель — фото завантажаться автоматично", "success");
    },
    [
      hasServerProduct,
      activeProductId,
      ensureDraftProduct,
      pendingImages,
      savedImages.length,
      uploadImagesToServer,
      showToast,
    ]
  );

  const handleImageFiles = useCallback(
    (files: File[]) => {
      const task = processImageFiles(files);
      imageWorkRef.current = task;
      void task.finally(() => {
        if (imageWorkRef.current === task) imageWorkRef.current = null;
      });
    },
    [processImageFiles],
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

      const id = hasServerProduct ? activeProductId : await ensureDraftProduct();

      if (id) {
        const queued = pendingVideos;
        if (queued.length) setPendingVideos([]);
        for (const v of queued) {
          try {
            await uploadVideoToServer(id, v.file, v.title, v.localId);
          } catch (err) {
            showToast(uploadErrorMessage(err, `Не вдалося завантажити ${v.file.name}`), "error");
          }
        }
        for (const file of vids) {
          try {
            await uploadVideoToServer(
              id,
              file,
              file.name.replace(/\.[^/.]+$/, "")
            );
          } catch (err) {
            showToast(uploadErrorMessage(err, `Не вдалося завантажити ${file.name}`), "error");
          }
        }
        return;
      }

      setPendingVideos((prev) => [
        ...prev,
        ...vids.map((file) => ({
          localId: uid(),
          file,
          title: file.name.replace(/\.[^/.]+$/, ""),
        })),
      ]);
      showToast("Вкажіть бренд і модель — відео завантажиться автоматично", "success");
    },
    [hasServerProduct, activeProductId, ensureDraftProduct, pendingVideos, uploadVideoToServer, showToast]
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
    if (!activeProductId) return;
    try {
      await api.patch(`/shop/products/${activeProductId}/set_main_image/${imgId}/`);
      setSavedImages((prev) =>
        prev.map((i) => ({ ...i, is_main: i.id === imgId }))
      );
    } catch {
      showToast("Помилка зміни головного фото", "error");
    }
  };

  const handleDeleteSavedImage = async (imgId: number) => {
    if (!activeProductId) return;
    try {
      await api.delete(`/shop/products/${activeProductId}/delete_image/${imgId}/`);
      setSavedImages((prev) => prev.filter((i) => i.id !== imgId));
      showToast("Фото видалено");
    } catch {
      showToast("Помилка видалення фото", "error");
    }
  };

  const handleDeleteSavedVideo = async (vidId: number) => {
    if (!activeProductId) return;
    try {
      await api.delete(`/shop/products/${activeProductId}/delete_video/${vidId}/`);
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
  const handleAddOrUpdateSize = () => {
    const sz = Number(newSize.size);
    const qty = Number(newSize.quantity);

    if (activeProductId) {
      const previous = savedSizes.find((s) => s.size === sz);
      const optimistic: ProductSize = previous
        ? { ...previous, quantity: qty }
        : { id: 0, size: sz, quantity: qty };

      setSavedSizes((prev) => {
        const exists = prev.find((s) => s.size === sz);
        return exists
          ? prev.map((s) => (s.size === sz ? optimistic : s))
          : [...prev, optimistic];
      });
      setSavingSizes((prev) => new Set(prev).add(sz));

      void api
        .post<ProductSize>(`/shop/products/${activeProductId}/set_size/`, {
          size: sz,
          quantity: qty,
        })
        .then((res) => {
          setSavedSizes((prev) =>
            prev.map((s) => (s.size === sz ? res.data : s)),
          );
          showToast(`Розмір ${sz} збережено`);
        })
        .catch(() => {
          setSavedSizes((prev) =>
            previous
              ? prev.map((s) => (s.size === sz ? previous : s))
              : prev.filter((s) => s.size !== sz),
          );
          showToast("Помилка збереження розміру", "error");
        })
        .finally(() => {
          setSavingSizes((prev) => {
            const next = new Set(prev);
            next.delete(sz);
            return next;
          });
        });
      return;
    }

    setPendingSizes((prev) => {
      const exists = prev.find((s) => s.size === sz);
      return exists
        ? prev.map((s) => (s.size === sz ? { size: sz, quantity: qty } : s))
        : [...prev, { size: sz, quantity: qty }];
    });
    showToast(`Розмір ${sz} додано`);
  };

  const handleDeleteSize = async (sizeId: number, sizeNum: number) => {
    if (!activeProductId) return;
    try {
      await api.delete(`/shop/products/${activeProductId}/delete_size/${sizeId}/`);
      setSavedSizes((prev) => prev.filter((s) => s.id !== sizeId));
      showToast(`Розмір ${sizeNum} видалено`);
    } catch {
      showToast("Помилка видалення розміру", "error");
    }
  };

  const removePendingSize = (sz: number) =>
    setPendingSizes((prev) => prev.filter((s) => s.size !== sz));

  // ── Save ─────────────────────────────────────────────────────────────────────
  const toggleSeason = (value: string) => {
    setForm((p) => {
      const has = p.seasons.includes(value);
      const seasons = has
        ? p.seasons.filter((s) => s !== value)
        : [...p.seasons, value];
      return { ...p, seasons };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (imageWorkRef.current) {
        await imageWorkRef.current;
      }
    } catch {
      showToast("Не вдалося завантажити фото", "error");
      setIsSaving(false);
      return;
    }

    let f = formRef.current;

    if (!f.vendor && showNewVendor && newVendorName.trim()) {
      try {
        const res = await api.post<Vendor>("/shop/vendors/", { name: newVendorName.trim() });
        const created = res.data;
        setVendors((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        const vendorId = String(created.id);
        setForm((p) => ({ ...p, vendor: vendorId }));
        setShowNewVendor(false);
        setNewVendorName("");
        f = { ...f, vendor: vendorId };
        formRef.current = { ...formRef.current, vendor: vendorId };
      } catch {
        showToast("Не вдалося створити бренд", "error");
        setIsSaving(false);
        return;
      }
    }

    const model = f.model_name.trim();
    if (!f.vendor || !model) {
      showToast("Заповніть обов'язкові поля: бренд і назва моделі", "error");
      setIsSaving(false);
      return;
    }
    if (!f.seasons.length) {
      showToast("Оберіть хоча б один сезон", "error");
      setIsSaving(false);
      return;
    }
    if (duplicateCombo || (await checkDuplicateCombo())) {
      setDuplicateCombo(true);
      showToast(DUPLICATE_MSG, "error");
      setIsSaving(false);
      return;
    }

    const body = buildProductBody();

    try {
      if (activeProductId) {
        await api.patch(`/shop/products/${activeProductId}/`, body);
        if (pendingSizes.length) {
          const res = await api.post<ProductSize[]>(
            `/shop/products/${activeProductId}/set_sizes/`,
            { sizes: pendingSizes },
          );
          setSavedSizes((prev) => {
            const bySize = new Map(prev.map((s) => [s.size, s]));
            for (const s of res.data) bySize.set(s.size, s);
            return [...bySize.values()];
          });
        }
        setPendingSizes([]);
        showToast(isEdit ? "Товар оновлено" : "Товар створено");
        if (!isEdit) {
          router.replace(`/manager/products/${activeProductId}`);
        }
      } else {
        const res = await api.post<{ id: number }>("/shop/products/", body);
        const newId = res.data.id;
        if (pendingImages.length) {
          try {
            await uploadImagesToServer(
              newId,
              pendingImages.map((p) => ({ file: p.file, is_main: p.is_main }))
            );
            setPendingImages([]);
          } catch (err) {
            showToast(uploadErrorMessage(err, "Товар створено, але фото не завантажились"), "error");
            router.replace(`/manager/products/${newId}`);
            return;
          }
        }
        if (pendingSizes.length) {
          const res = await api.post<ProductSize[]>(
            `/shop/products/${newId}/set_sizes/`,
            { sizes: pendingSizes },
          );
          setSavedSizes(res.data);
        }
        showToast("Товар створено");
        router.replace(`/manager/products/${newId}`);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  const allImages = hasServerProduct ? savedImages : pendingImages;
  const allSizes  = hasServerProduct ? savedSizes  : pendingSizes;
  const isImageBusy = imageCompressProgress !== null || imageUploadProgress !== null;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/manager/products")}
          className="text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? "Редагувати товар" : draftProductId ? "Новий товар" : "Новий товар"}
        </h1>
        {draftProductId && !isEdit && (
          <span className="text-xs font-medium text-teal-600 bg-teal-50 border border-teal-200 rounded-full px-2.5 py-0.5">
            чернетка · медіа на сервері
          </span>
        )}
      </div>

      {/* ── Basic info ── */}
      <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-700">Основна інформація</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-600">Виробник *</label>
              {!showNewVendor && (
                <button
                  type="button"
                  onClick={() => { setShowNewVendor(true); setNewVendorName(""); }}
                  className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 transition-colors"
                >
                  <Plus size={12} /> Новий бренд
                </button>
              )}
            </div>

            {!showNewVendor ? (
              <select name="vendor" value={form.vendor} onChange={handleChange}
                className={fieldClass(duplicateCombo)}>
                <option value="">Оберіть...</option>
                {vendors.map((v) => <option key={v.id} value={String(v.id)}>{v.name}</option>)}
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") { e.preventDefault(); await handleCreateVendor(); }
                    if (e.key === "Escape") { setShowNewVendor(false); }
                  }}
                  placeholder="Назва бренду"
                  className="flex-1 border border-teal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <button
                  type="button"
                  onClick={handleCreateVendor}
                  disabled={newVendorLoading || !newVendorName.trim()}
                  className="flex items-center gap-1 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                >
                  {newVendorLoading ? "..." : <Check size={14} />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewVendor(false)}
                  className="flex items-center text-gray-400 hover:text-gray-600 px-2 py-2 rounded-lg transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Назва моделі *</label>
            <input name="model_name" value={form.model_name} onChange={handleChange}
              className={fieldClass(duplicateCombo)}
              placeholder="Наприклад: Air Max 90" />
          </div>
          {duplicateCombo && (
            <p className="sm:col-span-2 text-sm text-red-600">{DUPLICATE_MSG}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Тип</label>
            <select name="prod_type" value={form.prod_type} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
              {PROD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Стать</label>
            <select name="gender" value={form.gender} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
              {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Сезони</label>
            <div className="flex flex-wrap gap-2">
              {SEASONS.map((s) => {
                const checked = form.seasons.includes(s.value);
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => toggleSeason(s.value)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      checked
                        ? "border-teal-500 bg-teal-50 text-teal-800"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-1.5">Можна обрати кілька — наприклад, літо та демісезон</p>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">Ціна (грн)</label>
              <input name="full_price" type="number" value={form.full_price} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="0 — без ціни, не показується в каталозі" min="0" />
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-gray-600 mb-1">Знижка %</label>
              <input name="discount" type="number" value={form.discount} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="0" min="0" max="100" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-800">Показувати в каталозі</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {catalogEligible
                  ? "Картка видима покупцям на головній сторінці каталогу"
                  : "Вкажіть ціну більше 0, щоб увімкнути показ"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.is_published}
              disabled={!catalogEligible}
              onClick={() => catalogEligible && setForm((p) => ({ ...p, is_published: !p.is_published }))}
              className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${
                !catalogEligible
                  ? "cursor-not-allowed bg-gray-300 opacity-60"
                  : form.is_published
                  ? "bg-teal-500"
                  : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-1 ${
                  form.is_published ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-teal-100 bg-teal-50/40 p-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">SEO заголовки</h3>
            <p className="text-xs text-gray-500 mt-1">
              Якщо залишити порожніми — згенеруються автоматично при збереженні. Для каталогу краще
              заповнювати вручну.
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="block text-sm font-medium text-gray-600">H1 (заголовок на сторінці)</label>
              <span className={`text-xs ${form.seo_h1.length > 70 ? "text-amber-600" : "text-gray-400"}`}>
                {form.seo_h1.length}/70
              </span>
            </div>
            <input
              name="seo_h1"
              value={form.seo_h1}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              placeholder="Напр.: Дитячі сандалі BBT 881 для дівчинки"
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="block text-sm font-medium text-gray-600">Title (вкладка браузера та Google)</label>
              <span className={`text-xs ${form.seo_title.length > 60 ? "text-amber-600" : "text-gray-400"}`}>
                {form.seo_title.length}/60
              </span>
            </div>
            <input
              name="seo_title"
              value={form.seo_title}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              placeholder="Напр.: Сандалі BBT 881 дівчинці 16–20"
            />
            <p className="text-xs text-gray-500 mt-1">
              До заголовка автоматично додасться «| ТАК і ТАК» — не пишіть назву магазину в кінці.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Короткий опис</label>
          <textarea name="description" value={form.description ?? ""} onChange={handleChange} rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
            placeholder="Короткий опис товару..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Детальний опис{" "}
            <span className="text-xs text-gray-400 font-normal">(SEO-текст — розгортається на картці товару)</span>
          </label>
          <textarea name="seo_description" value={form.seo_description ?? ""} onChange={handleChange} rows={6}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
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
            isDraggingImg ? "border-teal-400 bg-teal-50" : "border-gray-200 hover:border-teal-300"
          }`}
        >
          <Upload size={22} className="mx-auto text-gray-400 mb-1.5" />
          <p className="text-sm text-gray-500">Перетягніть фото або натисніть для вибору</p>
          <p className="text-xs text-gray-400 mt-0.5">
            JPG, PNG, WebP · великі фото стискаються автоматично
          </p>
          {(imageCompressProgress || imageUploadProgress !== null) && (
            <div className="text-xs text-teal-600 mt-2 font-medium space-y-0.5">
              <p>
                {imageCompressProgress
                  ? `Підготовка фото ${imageCompressProgress.current}/${imageCompressProgress.total}…`
                  : `Завантаження на сервер ${imageUploadProgress}%…`}
              </p>
              <p className="text-teal-500/80 font-normal">
                Інші поля можна заповнювати — фото йде у фоні
              </p>
            </div>
          )}
          <input ref={imgInputRef} type="file" multiple accept="image/*" onChange={onImgInput} className="hidden" />
        </div>

        {/* Saved images (server) */}
        {hasServerProduct && savedImages.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {savedImages.map((img) => {
              const url = getMediaUrl(img.image);
              return (
                <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
                  {url && <Image src={url} alt="" fill unoptimized className="object-cover" />}
                  {img.is_main && (
                    <span className="absolute top-1 left-1 bg-teal-600 text-white text-[10px] px-1 rounded">
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

        {/* Pending images (waiting for brand/model or uploading) */}
        {!hasServerProduct && pendingImages.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {pendingImages.map((img) => (
              <div key={img.localId} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
                <Image src={img.preview} alt="" fill unoptimized className="object-cover" />
                {img.is_main && (
                  <span className="absolute top-1 left-1 bg-teal-600 text-white text-[10px] px-1 rounded">
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
            isDraggingVid ? "border-teal-400 bg-teal-50" : "border-gray-200 hover:border-teal-300"
          }`}
        >
          <Upload size={22} className="mx-auto text-gray-400 mb-1.5" />
          <p className="text-sm text-gray-500">Перетягніть відео або натисніть для вибору</p>
          <p className="text-xs text-gray-400 mt-0.5">
            MP4, MOV, WebM · після бренду та моделі завантажуються одразу
          </p>
          <input ref={vidInputRef} type="file" multiple accept="video/*" onChange={onVidInput} className="hidden" />
        </div>

        {/* Saved videos */}
        {hasServerProduct && savedVideos.length > 0 && (
          <ul className="space-y-2">
            {savedVideos.map((v) => (
              <li key={v.id} className="flex items-center gap-3 border border-gray-100 rounded-lg px-3 py-2">
                <span className="text-gray-400 text-sm">🎬</span>
                <input
                  value={v.title}
                  onChange={(e) => handleUpdateVideoTitle(v.id, e.target.value)}
                  placeholder="Назва відео"
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

        {/* Pending videos (waiting for brand/model) */}
        {!hasServerProduct && pendingVideos.length > 0 && (
          <ul className="space-y-2">
            {pendingVideos.map((v) => (
              <li key={v.localId} className="border border-gray-100 rounded-lg px-3 py-2 space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">🎬</span>
                  <span className="flex-1 text-sm text-gray-600 truncate">{v.file.name}</span>
                  {!v.uploading && (
                    <>
                      <input
                        value={v.title}
                        onChange={(e) => setPendingVideos((prev) =>
                          prev.map((pv) => pv.localId === v.localId ? { ...pv, title: e.target.value } : pv)
                        )}
                        placeholder="Назва відео"
                        className="w-36 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-400"
                      />
                      <button onClick={() => setPendingVideos((prev) => prev.filter((pv) => pv.localId !== v.localId))}
                        className="text-gray-300 hover:text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    </>
                  )}
                  {v.uploading && (
                    <span className="text-xs text-teal-600 font-medium">{v.progress ?? 0}%</span>
                  )}
                </div>
                {v.uploading && (
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-teal-500 h-1.5 rounded-full transition-all duration-200"
                      style={{ width: `${v.progress ?? 0}%` }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Edit mode: live upload progress */}
        {hasServerProduct && Object.keys(editUploadProgress).length > 0 && (
          <ul className="space-y-2">
            {Object.entries(editUploadProgress).map(([id, pct]) => (
              <li key={id} className="border border-teal-100 bg-teal-50 rounded-lg px-3 py-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-teal-700">Завантаження відео...</span>
                  <span className="text-xs text-teal-600 font-medium">{pct}%</span>
                </div>
                <div className="w-full bg-teal-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-teal-500 h-1.5 rounded-full transition-all duration-200"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        {(hasServerProduct ? savedVideos : pendingVideos).length === 0 &&
          Object.keys(editUploadProgress).length === 0 && (
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
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
              {SIZES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Кількість</label>
            <input type="number" value={newSize.quantity}
              onChange={(e) => setNewSize((p) => ({ ...p, quantity: e.target.value }))}
              min="0"
              className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          <button onClick={handleAddOrUpdateSize}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={14} />
            {(hasServerProduct ? savedSizes : pendingSizes).find((s) => s.size === Number(newSize.size))
              ? "Оновити" : "Додати"}
          </button>
        </div>

        {allSizes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {[...allSizes].sort((a, b) => a.size - b.size).map((s) => (
              <div key={s.size} className="flex flex-col items-center border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[88px]">
                <div className="flex items-center gap-2 w-full">
                  <span className="font-medium text-gray-700">{s.size}</span>
                  <span className={`text-xs ${s.quantity === 0 ? "text-red-500" : "text-gray-400"}`}>
                    {s.quantity} шт
                  </span>
                  {savingSizes.has(s.size) && (
                    <span className="text-[10px] text-teal-500">…</span>
                  )}
                  <button
                    onClick={() =>
                      hasServerProduct && "id" in s && (s as ProductSize).id > 0
                        ? handleDeleteSize((s as ProductSize).id, s.size)
                        : removePendingSize(s.size)
                    }
                    disabled={savingSizes.has(s.size)}
                    className="text-gray-300 hover:text-red-500 disabled:opacity-40 transition-colors ml-auto"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {allSizes.length === 0 && (
          <p className="text-xs text-gray-400">Розміри ще не додано</p>
        )}

        {isEdit && savedSizes.some((s) => s.id > 0) && (
          <SizeQrPanel sizes={savedSizes} />
        )}
      </div>

      {/* ── Save button ── */}
      <button
        onClick={handleSave}
        disabled={isSaving || duplicateCombo}
        className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
      >
        {isSaving
          ? isEdit || draftProductId ? "Зберігаємо..." : "Створюємо..."
          : isImageBusy
          ? "Зберегти (чекаємо на фото...)"
          : isEdit
          ? "Зберегти зміни"
          : draftProductId
          ? "Завершити створення"
          : "Створити товар"}
      </button>
    </div>
  );
}
