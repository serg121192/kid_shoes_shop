"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import api from "@/app/lib/api";
import { AxiosError } from "axios";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await api.post("/user/password-reset/", { email });
      setSuccess(true);
    } catch (err) {
      const axiosErr = err as AxiosError<Record<string, string[]>>;
      const data = axiosErr.response?.data;
      if (data?.email) {
        setError(Array.isArray(data.email) ? data.email[0] : data.email);
      } else {
        setError("Щось пішло не так. Спробуйте ще раз.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-emerald-50 rounded-2xl shadow-sm p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl">🔑</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Відновлення пароля</h1>
          <p className="text-gray-500 mt-1">
            Введіть email — ми надішлемо посилання для скидання пароля
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="bg-green-50 text-green-800 rounded-xl px-4 py-4 text-sm">
              Лист надіслано на <strong>{email}</strong>. Перевірте вашу пошту.
            </div>
            <Link
              href="/login"
              className="inline-block text-teal-600 hover:underline text-sm font-medium"
            >
              ← Повернутися до входу
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-800 disabled:bg-teal-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {isLoading ? "Надсилаємо..." : "Надіслати посилання"}
            </button>

            <p className="text-center text-sm text-gray-500">
              <Link href="/login" className="text-emerald-600 hover:underline font-medium">
                ← Повернутися до входу
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
