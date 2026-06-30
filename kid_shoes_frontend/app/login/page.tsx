"use client";

import { useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { AxiosError } from "axios";
import Logo from "@/app/components/Logo";

function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
  const justReset = searchParams.get("reset") === "1";
  const next = searchParams.get("next") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: string }>;
      setError(
        axiosErr.response?.data?.detail ||
        "Невірний email або пароль"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-emerald-50 rounded-2xl shadow-sm p-8 w-full max-w-md">
      <div className="flex flex-col items-center mb-8">
        <Logo className="h-[120px] w-[120px] shrink-0" />
        <h1 className="text-2xl font-bold text-gray-900 mt-3">Вхід</h1>
        <p className="text-gray-500 mt-1">Введіть свої дані для входу</p>
      </div>

      {justRegistered && (
        <div className="bg-green-50 text-green-800 rounded-xl px-4 py-3 text-sm mb-6 text-center">
          Реєстрацію завершено! Тепер увійдіть до акаунту.
        </div>
      )}

      {justReset && (
        <div className="bg-green-50 text-green-800 rounded-xl px-4 py-3 text-sm mb-6 text-center">
          Пароль успішно змінено! Увійдіть з новим паролем.
        </div>
      )}

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
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Пароль
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
          className="w-full bg-emerald-600 hover:bg-emerald-800 disabled:bg-teal-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {isLoading ? "Входимо..." : "Увійти"}
        </button>

        <p className="text-center text-sm">
          <Link href="/forgot-password" className="text-gray-500 hover:text-teal-600 hover:underline">
            Забули пароль?
          </Link>
        </p>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Немає акаунту?{" "}
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="text-emerald-500 hover:underline font-medium">
          Зареєструватися
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Suspense fallback={
        <div className="bg-emerald-50 rounded-2xl shadow-sm p-8 w-full max-w-md flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
