"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import api from "@/app/lib/api";
import { AxiosError } from "axios";

export default function ResetPasswordPage() {
  const params = useParams<{ uid: string; token: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== password2) {
      setError("Паролі не збігаються.");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/user/password-reset/confirm/", {
        uid: params.uid,
        token: params.token,
        new_password: password,
      });
      router.push("/login?reset=1");
    } catch (err) {
      const axiosErr = err as AxiosError<Record<string, string | string[]>>;
      const data = axiosErr.response?.data;
      if (data?.error) {
        setError(data.error as string);
      } else if (data?.new_password) {
        const val = data.new_password;
        setError(Array.isArray(val) ? val[0] : val);
      } else {
        setError("Щось пішло не так. Посилання могло застаріти.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-emerald-50 rounded-2xl shadow-sm p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl">🔒</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Новий пароль</h1>
          <p className="text-gray-500 mt-1">Введіть новий пароль для вашого акаунту</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Новий пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="мін. 8 символів"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Повторіть пароль
            </label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              minLength={8}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••••"
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
            className="w-full bg-emerald-600 hover:bg-emerald-800 disabled:bg-indigo-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {isLoading ? "Зберігаємо..." : "Зберегти пароль"}
          </button>

          <p className="text-center text-sm text-gray-500">
            <Link href="/login" className="text-indigo-600 hover:underline font-medium">
              ← Повернутися до входу
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
