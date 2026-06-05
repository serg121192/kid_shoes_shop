"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import api from "@/app/lib/api";
import { useAuth } from "@/app/context/AuthContext";
import { User } from "@/app/types";
import { AxiosError } from "axios";

export default function ProfilePage() {
  const { isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
  });
  const [passwordData, setPasswordData] = useState({
    password: "",
    password2: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.push("/login"); return; }
    if (!authLoading && isAuthenticated) {
      api.get<User>("/user/me/").then((r) => {
        const { first_name, last_name, phone, email } = r.data;
        setFormData({ first_name, last_name, phone, email });
      });
    }
  }, [authLoading, isAuthenticated, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name in passwordData) {
      setPasswordData((prev) => ({ ...prev, [name]: value }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setSuccessMsg("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMsg("");

    const payload: Record<string, string> = { ...formData };

    if (passwordData.password) {
      if (passwordData.password !== passwordData.password2) {
        setErrors({ password2: "Паролі не збігаються" });
        return;
      }
      payload.password = passwordData.password;
    }

    setIsSaving(true);
    try {
      await api.patch("/user/me/", payload);
      await refreshUser();
      setSuccessMsg("Дані збережено успішно!");
      setPasswordData({ password: "", password2: "" });
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
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  const profileFields: { name: keyof typeof formData; label: string; type: string }[] = [
    { name: "first_name", label: "Ім'я", type: "text" },
    { name: "last_name", label: "Прізвище", type: "text" },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Телефон", type: "tel" },
  ];

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Мій профіль</h1>

      <form onSubmit={handleSubmit} className="bg-emerald-50 rounded-2xl shadow-sm p-8 space-y-5">
        {/* Profile fields */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Особисті дані</h2>
          {profileFields.map(({ name, label, type }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={type}
                name={name}
                value={formData[name]}
                onChange={handleChange}
                className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors[name] ? "border-red-400" : "border-gray-300"
                  }`}
              />
              {errors[name] && <p className="text-xs text-red-600 mt-1">{errors[name]}</p>}
            </div>
          ))}
        </div>

        <hr className="border-gray-100" />

        {/* Password change */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Змінити пароль{" "}
            <span className="font-normal text-gray-400">(залиште порожнім, якщо не змінюєте)</span>
          </h2>
          {[
            { name: "password", label: "Новий пароль" },
            { name: "password2", label: "Повторіть пароль" },
          ].map(({ name, label }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="password"
                name={name}
                value={passwordData[name as keyof typeof passwordData]}
                onChange={handleChange}
                minLength={8}
                className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors[name] ? "border-red-400" : "border-gray-300"
                  }`}
                placeholder="мін. 8 символів"
              />
              {errors[name] && <p className="text-xs text-red-600 mt-1">{errors[name]}</p>}
            </div>
          ))}
        </div>

        {successMsg && (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{successMsg}</p>
        )}
        {errors.non_field_errors && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errors.non_field_errors}</p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full bg-emerald-600 hover:bg-emerald-800 disabled:bg-teal-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {isSaving ? "Зберігаємо..." : "Зберегти зміни"}
        </button>
      </form>
    </div>
  );
}
