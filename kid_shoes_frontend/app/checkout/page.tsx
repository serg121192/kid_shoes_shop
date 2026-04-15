"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import api from "@/app/lib/api";
import { useAuth } from "@/app/context/AuthContext";

type DeliveryType = "np_warehouse" | "np_postamat" | "np_address";

const DELIVERY_OPTIONS: { value: DeliveryType; label: string }[] = [
  { value: "np_warehouse", label: "НоваПошта: Відділення" },
  { value: "np_postamat", label: "НоваПошта: Поштомат" },
  { value: "np_address", label: "НоваПошта: Кур'єр на адресу" },
];

function Field({
  name,
  label,
  placeholder,
  required = true,
  value,
  onChange,
  error,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          error ? "border-red-400" : "border-gray-300"
        }`}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

export default function CheckoutPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("np_warehouse");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    recipient_full_name: "",
    recipient_phone: "",
    city_name: "",
    warehouse_address: "",
    street: "",
    building_number: "",
    apartment: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) { router.push("/login"); return; }
    setIsLoading(true);
    setErrors({});

    const payload = {
      recipient_full_name: form.recipient_full_name,
      recipient_phone: form.recipient_phone,
      delivery_type: deliveryType,
      city_name: form.city_name,
      warehouse_address: deliveryType !== "np_address" ? form.warehouse_address : "",
      street: deliveryType === "np_address" ? form.street : "",
      building_number: deliveryType === "np_address" ? form.building_number : "",
      apartment: deliveryType === "np_address" ? form.apartment : "",
    };

    try {
      const response = await api.post("/shop/orders/me/create_order/", payload);
      router.push(`/orders/${response.data.id}`);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, string[]> } })?.response?.data;
      if (data) {
        const newErrors: Record<string, string> = {};
        for (const [key, val] of Object.entries(data)) {
          newErrors[key] = Array.isArray(val) ? val[0] : String(val);
        }
        setErrors(newErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Оформлення замовлення</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Отримувач */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Отримувач</h2>
          <Field
            name="recipient_full_name"
            label="ПІБ"
            placeholder="Іван Іваненко"
            value={form.recipient_full_name}
            onChange={handleChange}
            error={errors.recipient_full_name}
          />
          <Field
            name="recipient_phone"
            label="Телефон"
            placeholder="+380XXXXXXXXX"
            value={form.recipient_phone}
            onChange={handleChange}
            error={errors.recipient_phone}
          />
        </div>

        {/* Доставка */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Доставка</h2>

          <div className="flex flex-col gap-2">
            {DELIVERY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${
                  deliveryType === opt.value
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:border-indigo-300"
                }`}
              >
                <input
                  type="radio"
                  name="delivery_type"
                  value={opt.value}
                  checked={deliveryType === opt.value}
                  onChange={() => setDeliveryType(opt.value)}
                  className="accent-indigo-600"
                />
                <span className="text-sm font-medium text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>

          <Field
            name="city_name"
            label="Місто"
            placeholder="Київ"
            value={form.city_name}
            onChange={handleChange}
            error={errors.city_name}
          />

          {deliveryType !== "np_address" && (
            <Field
              name="warehouse_address"
              label={deliveryType === "np_warehouse" ? "Адреса відділення" : "Адреса поштомату"}
              placeholder="Відділення №1, вул. Хрещатик 1"
              value={form.warehouse_address}
              onChange={handleChange}
              error={errors.warehouse_address}
            />
          )}

          {deliveryType === "np_address" && (
            <>
              <Field
                name="street"
                label="Вулиця"
                placeholder="вул. Хрещатик"
                value={form.street}
                onChange={handleChange}
                error={errors.street}
              />
              <Field
                name="building_number"
                label="Номер будинку"
                placeholder="1"
                value={form.building_number}
                onChange={handleChange}
                error={errors.building_number}
              />
              <Field
                name="apartment"
                label="Квартира"
                placeholder="10"
                required={false}
                value={form.apartment}
                onChange={handleChange}
                error={errors.apartment}
              />
            </>
          )}

          {errors.non_field_errors && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {errors.non_field_errors}
            </p>
          )}
          {errors.error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {errors.error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {isLoading ? "Оформлюємо..." : "Підтвердити замовлення"}
        </button>
      </form>
    </div>
  );
}
