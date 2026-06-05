"use client";

import { useState, useEffect, useCallback } from "react";
import { Star } from "lucide-react";
import api from "@/app/lib/api";
import { Review, PaginatedResponse } from "@/app/types";
import { useAuth } from "@/app/context/AuthContext";

interface Props {
  productId: number;
  avgRating: number | null;
  reviewCount: number;
  onReviewChange?: () => void;
}

function StarRow({
  value,
  interactive = false,
  onChange,
  size = 20,
}: {
  value: number;
  interactive?: boolean;
  onChange?: (v: number) => void;
  size?: number;
}) {
  const [hovered, setHovered] = useState(0);
  const display = interactive ? (hovered || value) : value;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={`transition-colors ${
            n <= display
              ? "fill-amber-400 text-amber-400"
              : "fill-none text-gray-300"
          } ${interactive ? "cursor-pointer hover:text-amber-400" : ""}`}
          onMouseEnter={() => interactive && setHovered(n)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={() => interactive && onChange?.(n)}
        />
      ))}
    </div>
  );
}

export default function ReviewSection({
  productId,
  avgRating,
  reviewCount,
  onReviewChange,
}: Props) {
  const { isAuthenticated } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [myReview, setMyReview] = useState<Review | null>(null);
  const [myReviewLoaded, setMyReviewLoaded] = useState(false);

  const [formRating, setFormRating] = useState(0);
  const [formText, setFormText] = useState("");
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<Review>>(
        `/shop/reviews/?product=${productId}&page_size=5`
      );
      setReviews(res.data.results);
      setNextPage(res.data.next);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const fetchMyReview = useCallback(async () => {
    if (!isAuthenticated) { setMyReviewLoaded(true); return; }
    try {
      const res = await api.get<Review | null>(`/shop/reviews/my/?product=${productId}`);
      setMyReview(res.data ?? null);
      if (res.data) {
        setFormRating(res.data.rating);
        setFormText(res.data.text);
      }
    } finally {
      setMyReviewLoaded(true);
    }
  }, [productId, isAuthenticated]);

  useEffect(() => {
    fetchReviews();
    fetchMyReview();
  }, [fetchReviews, fetchMyReview]);

  const loadMore = async () => {
    if (!nextPage) return;
    setLoadingMore(true);
    try {
      const url = new URL(nextPage);
      const res = await api.get<PaginatedResponse<Review>>(
        `/shop/reviews/?product=${productId}&page=${url.searchParams.get("page")}&page_size=5`
      );
      setReviews((prev) => [...prev, ...res.data.results]);
      setNextPage(res.data.next);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formRating === 0) { setFormError("Оберіть оцінку."); return; }
    setFormError("");
    setFormSubmitting(true);
    try {
      if (editMode && myReview) {
        await api.patch(`/shop/reviews/${myReview.id}/`, { rating: formRating, text: formText });
      } else {
        await api.post("/shop/reviews/", { product: productId, rating: formRating, text: formText });
      }
      setEditMode(false);
      await fetchReviews();
      await fetchMyReview();
      onReviewChange?.();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setFormError(msg || "Не вдалося зберегти відгук.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!myReview) return;
    try {
      await api.delete(`/shop/reviews/${myReview.id}/`);
      setMyReview(null);
      setFormRating(0);
      setFormText("");
      setDeleteConfirm(false);
      setEditMode(false);
      await fetchReviews();
      onReviewChange?.();
    } catch {
      setFormError("Не вдалося видалити відгук.");
    }
  };

  const avgDisplay = avgRating ? avgRating.toFixed(1) : null;

  return (
    <div className="mt-8 border-t border-gray-100 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Відгуки</h2>
        {avgDisplay ? (
          <div className="flex items-center gap-2">
            <StarRow value={Math.round(avgRating!)} size={18} />
            <span className="text-lg font-bold text-amber-500">{avgDisplay}</span>
            <span className="text-sm text-gray-400">({reviewCount})</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Відгуків ще немає</span>
        )}
      </div>

      {/* Own review block */}
      {isAuthenticated && myReviewLoaded && (
        <>
          {myReview && !editMode ? (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <StarRow value={myReview.rating} size={16} />
                  <span className="text-sm font-medium text-gray-700">Ваш відгук</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditMode(true); setFormRating(myReview.rating); setFormText(myReview.text); }}
                    className="text-xs text-teal-500 hover:text-teal-700 font-medium"
                  >
                    Редагувати
                  </button>
                  {deleteConfirm ? (
                    <span className="flex items-center gap-1 text-xs">
                      <button onClick={handleDelete} className="text-red-500 hover:text-red-700 font-medium">Так, видалити</button>
                      <span className="text-gray-300">|</span>
                      <button onClick={() => setDeleteConfirm(false)} className="text-gray-400 hover:text-gray-600">Скасувати</button>
                    </span>
                  ) : (
                    <button onClick={() => setDeleteConfirm(true)} className="text-xs text-red-400 hover:text-red-600 font-medium">
                      Видалити
                    </button>
                  )}
                </div>
              </div>
              {myReview.text && (
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{myReview.text}</p>
              )}
            </div>
          ) : !myReview || editMode ? (
            <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                {editMode ? "Редагувати відгук" : "Залишити відгук"}
              </p>
              <div className="flex items-center gap-2 mb-3">
                <StarRow value={formRating} interactive onChange={setFormRating} size={28} />
                {formRating > 0 && (
                  <span className="text-sm text-amber-500 font-medium ml-1">
                    {["", "Жахливо", "Погано", "Нормально", "Добре", "Відмінно"][formRating]}
                  </span>
                )}
              </div>
              <textarea
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                placeholder="Напишіть кілька слів про товар (необов'язково)"
                maxLength={1000}
                rows={3}
                className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
              />
              {formError && <p className="text-red-500 text-xs mt-1">{formError}</p>}
              <div className="flex gap-2 mt-3">
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
                >
                  {formSubmitting ? "Збереження..." : editMode ? "Зберегти" : "Опублікувати"}
                </button>
                {editMode && (
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Скасувати
                  </button>
                )}
              </div>
            </form>
          ) : null}
        </>
      )}

      {!isAuthenticated && (
        <p className="text-sm text-gray-400 mb-6">
          <a href="/login" className="text-teal-600 hover:underline font-medium">Увійдіть</a>, щоб залишити відгук.
        </p>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          Будьте першим, хто залишить відгук!
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className={`rounded-xl p-4 ${r.is_own ? "bg-amber-50 border border-amber-100" : "bg-white border border-gray-100"}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold uppercase">
                    {r.user_name[0]}
                  </div>
                  <span className="text-sm font-medium text-gray-800">{r.user_name}</span>
                  {r.is_own && <span className="text-xs text-amber-600 font-medium">(ви)</span>}
                </div>
                <div className="flex items-center gap-2">
                  <StarRow value={r.rating} size={14} />
                  <span className="text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString("uk-UA")}
                  </span>
                </div>
              </div>
              {r.text && (
                <p className="text-sm text-gray-600 mt-2 whitespace-pre-line pl-9">{r.text}</p>
              )}
            </div>
          ))}

          {nextPage && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-2 text-sm text-teal-600 hover:text-teal-800 font-medium border border-teal-200 hover:border-teal-400 rounded-xl transition-colors disabled:opacity-50"
            >
              {loadingMore ? "Завантаження..." : "Завантажити ще відгуки"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
