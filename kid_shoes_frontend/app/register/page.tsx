"use client";

import { useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/app/lib/api";
import { AxiosError } from "axios";
import Logo from "@/app/components/Logo";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);
    try {
      await api.post("/user/register/", formData);
      const nextParam = next ? `&next=${encodeURIComponent(next)}` : "";
      router.push(`/login?registered=1${nextParam}`);
    } catch (err) {
      const axiosErr = err as AxiosError<Record<string, string[]>>;
      if (axiosErr.response?.data) {
        const newErrors: Record<string, string> = {};
        for (const [key, val] of Object.entries(axiosErr.response.data)) {
          newErrors[key] = Array.isArray(val) ? val[0] : val;
        }
        setErrors(newErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fields: { name: keyof typeof formData; label: string; type: string; placeholder: string }[] = [
    { name: "first_name", label: "Ім'я", type: "text", placeholder: "Іван" },
    { name: "last_name", label: "Прізвище", type: "text", placeholder: "Іваненко" },
    { name: "email", label: "Email", type: "email", placeholder: "you@example.com" },
    { name: "phone", label: "Телефон", type: "tel", placeholder: "+380XXXXXXXXX" },
    { name: "password", label: "Пароль", type: "password", placeholder: "мін. 8 символів" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="bg-emerald-50 rounded-2xl shadow-sm p-8 w-full max-w-md">

        <div className="flex flex-col items-center mb-8">
          <Logo className="h-[120px] w-[120px] shrink-0" />
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Реєстрація</h1>
          <p className="text-gray-500 mt-1">Вітаємо у нашому магазині! Створіть аккаунт:</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(({ name, label, type, placeholder }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
              </label>
              <input
                type={type}
                name={name}
                value={formData[name]}
                onChange={handleChange}
                placeholder={placeholder}
                className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors[name] ? "border-red-400" : "border-gray-300"
                  }`}
              />
              {errors[name] && (
                <p className="text-xs text-red-600 mt-1">{errors[name]}</p>
              )}
            </div>
          ))}

          {errors.non_field_errors && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {errors.non_field_errors}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-800 disabled:bg-indigo-400 text-white font-semibold py-2.5 rounded-lg transition-colors mt-2"
          >
            {isLoading ? "Реєструємо..." : "Зареєструватися"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Вже є акаунт?{" "}
          <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="text-emerald-600 hover:underline font-medium">
            Увійти
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
