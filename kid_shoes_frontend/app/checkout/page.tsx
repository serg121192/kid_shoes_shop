"use client";

import { useState, useEffect, useRef, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/app/lib/api";
import { useAuth } from "@/app/context/AuthContext";
import { Loader2, CheckCircle, ChevronDown, LogIn, UserPlus } from "lucide-react";

type DeliveryType = "np_warehouse" | "np_postamat" | "np_address" | "pickup";
type NpOption = { ref: string; name: string };

const DELIVERY_OPTIONS: { value: DeliveryType; label: string }[] = [
  { value: "np_warehouse", label: "НоваПошта: Відділення" },
  { value: "np_postamat", label: "НоваПошта: Поштомат" },
  { value: "np_address", label: "НоваПошта: Кур'єр на адресу" },
  { value: "pickup", label: "Самовивіз з магазину" },
];

const STORE_ADDRESS = "м. Чернігів, проспект Левка Лук'яненка 78, 2-й поверх (поряд з ТРЦ \"Hollywood\")";

// ── Simple text field ────────────────────────────────────────────────────────

function Field({
  name, label, placeholder, required = true, value, onChange, error,
}: {
  name: string; label: string; placeholder?: string; required?: boolean;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; error?: string;
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
          className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${error ? "border-red-400" : "border-gray-300"
          }`}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

// ── Autocomplete dropdown field ──────────────────────────────────────────────

function AutocompleteField({
  label, placeholder, inputValue, onInputChange, onSelect,
  options, isLoading, disabled = false, confirmed, error,
}: {
  label: string;
  placeholder?: string;
  inputValue: string;
  onInputChange: (val: string) => void;
  onSelect: (option: NpOption) => void;
  options: NpOption[];
  isLoading: boolean;
  disabled?: boolean;
  confirmed: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const showDropdown = open && (isLoading || options.length > 0 || inputValue.length >= 2);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            onInputChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => { if (inputValue.length >= 2 || options.length > 0) setOpen(true); }}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={`w-full border rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${error ? "border-red-400" : confirmed ? "border-green-400" : "border-gray-300"
            }`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          {isLoading
            ? <Loader2 size={16} className="animate-spin" />
            : confirmed
              ? <CheckCircle size={16} className="text-green-500" />
              : <ChevronDown size={16} />
          }
        </span>
      </div>

      {showDropdown && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <li className="px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Пошук...
            </li>
          ) : options.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-400">Нічого не знайдено</li>
          ) : (
            options.map((opt) => (
              <li key={opt.ref}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(opt);
                    setOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                >
                  {opt.name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

// ── Inline auth block (login / register) ─────────────────────────────────────

function AuthBlock({ onSuccess }: { onSuccess: () => void }) {
  const { refreshUser } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", first_name: "", last_name: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizePhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("380")) return "+" + digits;
    if (digits.startsWith("0") && digits.length >= 10) return "+38" + digits;
    if (digits.length > 0) return "+" + digits;
    return raw;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const normalized = name === "phone" ? normalizePhone(value) : value;
    setForm((p) => ({ ...p, [name]: normalized }));
    setError("");
  };

  const doLogin = async (email: string, password: string) => {
    await api.post("/user/token/", { email, password });
    await refreshUser();
    onSuccess();
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await doLogin(form.email, form.password);
    } catch {
      setError("Невірний email або пароль");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/user/register/", {
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
      });
      await doLogin(form.email, form.password);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, string[]> } })?.response?.data;
      if (data) {
        const msgs = Object.values(data).flat();
        setError(msgs[0] ?? "Помилка реєстрації");
      } else {
        setError("Помилка реєстрації");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
      <h2 className="font-semibold text-gray-800">Ваш обліковий запис</h2>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        <button
          type="button"
          onClick={() => setTab("login")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${tab === "login" ? "bg-teal-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
        >
          <LogIn size={15} /> Увійти
        </button>
        <button
          type="button"
          onClick={() => setTab("register")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${tab === "register" ? "bg-teal-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
        >
          <UserPlus size={15} /> Реєстрація
        </button>
      </div>

      <form onSubmit={tab === "login" ? handleLogin : handleRegister} className="space-y-3">
        {tab === "register" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ім&apos;я</label>
                <input name="first_name" value={form.first_name} onChange={handleChange} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Прізвище</label>
                <input name="last_name" value={form.last_name} onChange={handleChange} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Телефон</label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="+380XXXXXXXXX"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Пароль</label>
          <input name="password" type="password" value={form.password} onChange={handleChange} required minLength={8}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
          {loading ? "Зачекайте..." : tab === "login" ? "Увійти та продовжити" : "Зареєструватись та продовжити"}
        </button>
      </form>
    </div>
  );
}

// ── Checkout page ────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("np_warehouse");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    recipient_full_name: "",
    recipient_phone: "",
    city_name: "",
    city_ref: "",
    warehouse_address: "",
    warehouse_ref: "",
    street: "",
    building_number: "",
    apartment: "",
  });

  // Pre-fill form with user profile data when authenticated
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        recipient_full_name: prev.recipient_full_name || `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim(),
        recipient_phone: prev.recipient_phone || (user.phone ?? ""),
      }));
    }
  }, [user]);

  // ── City autocomplete state ──
  const [cityQuery, setCityQuery] = useState("");
  const [cityOptions, setCityOptions] = useState<NpOption[]>([]);
  const [cityLoading, setCityLoading] = useState(false);

  // ── Warehouse autocomplete state ──
  const [warehouseQuery, setWarehouseQuery] = useState("");
  const [warehouseOptions, setWarehouseOptions] = useState<NpOption[]>([]);
  const [warehouseLoading, setWarehouseLoading] = useState(false);

  // ── Fetch cities with debounce ──
  useEffect(() => {
    if (cityQuery.length < 2) { setCityOptions([]); return; }
    const timer = setTimeout(async () => {
      setCityLoading(true);
      try {
        const res = await api.get<NpOption[]>("/shop/nova-poshta/cities/", { params: { q: cityQuery } });
        setCityOptions(res.data);
      } catch {
        setCityOptions([]);
      } finally {
        setCityLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [cityQuery]);

  // ── Fetch warehouses with debounce ──
  const warehouseType = deliveryType === "np_postamat" ? "postamat" : "warehouse";

  useEffect(() => {
    if (!form.city_ref) { setWarehouseOptions([]); return; }
    const timer = setTimeout(async () => {
      setWarehouseLoading(true);
      try {
        const res = await api.get<NpOption[]>("/shop/nova-poshta/warehouses/", {
          params: { city_ref: form.city_ref, q: warehouseQuery, type: warehouseType },
        });
        setWarehouseOptions(res.data);
      } catch {
        setWarehouseOptions([]);
      } finally {
        setWarehouseLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [form.city_ref, warehouseQuery, warehouseType]);

  // ── Handlers ──

  const normalizePhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("380")) return "+" + digits;
    if (digits.startsWith("0") && digits.length >= 10) return "+38" + digits;
    if (digits.length > 0) return "+" + digits;
    return raw;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const normalized = name === "recipient_phone" ? normalizePhone(value) : value;
    setForm((prev) => ({ ...prev, [name]: normalized }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleCityInput = useCallback((val: string) => {
    setCityQuery(val);
    // Clear confirmed city if user edits the text
    setForm((prev) => ({ ...prev, city_name: val, city_ref: "" }));
    // Clear warehouse when city changes
    setWarehouseQuery("");
    setForm((prev) => ({ ...prev, warehouse_address: "", warehouse_ref: "" }));
    setErrors((prev) => ({ ...prev, city_name: "" }));
  }, []);

  const handleCitySelect = useCallback((opt: NpOption) => {
    setCityQuery(opt.name);
    setForm((prev) => ({
      ...prev,
      city_name: opt.name,
      city_ref: opt.ref,
      warehouse_address: "",
      warehouse_ref: "",
    }));
    setWarehouseQuery("");
    setWarehouseOptions([]);
    setErrors((prev) => ({ ...prev, city_name: "" }));
  }, []);

  const handleWarehouseInput = useCallback((val: string) => {
    setWarehouseQuery(val);
    setForm((prev) => ({ ...prev, warehouse_address: val, warehouse_ref: "" }));
    setErrors((prev) => ({ ...prev, warehouse_address: "" }));
  }, []);

  const handleWarehouseSelect = useCallback((opt: NpOption) => {
    setWarehouseQuery(opt.name);
    setForm((prev) => ({ ...prev, warehouse_address: opt.name, warehouse_ref: opt.ref }));
    setErrors((prev) => ({ ...prev, warehouse_address: "" }));
  }, []);

  // Clear warehouse when delivery type switches between warehouse/postamat
  const handleDeliveryTypeChange = (type: DeliveryType) => {
    setDeliveryType(type);
    setWarehouseQuery("");
    setWarehouseOptions([]);
    setForm((prev) => ({ ...prev, warehouse_address: "", warehouse_ref: "" }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const isPickup = deliveryType === "pickup";
    const payload = {
      recipient_full_name: form.recipient_full_name,
      recipient_phone: form.recipient_phone,
      delivery_type: deliveryType,
      city_name: isPickup ? "" : form.city_name,
      city_ref: isPickup ? "" : form.city_ref,
      warehouse_address: (!isPickup && deliveryType !== "np_address") ? form.warehouse_address : "",
      warehouse_ref: (!isPickup && deliveryType !== "np_address") ? form.warehouse_ref : "",
      street: deliveryType === "np_address" ? form.street : "",
      building_number: deliveryType === "np_address" ? form.building_number : "",
      apartment: deliveryType === "np_address" ? form.apartment : "",
    };

    try {
      const response = await api.post("/shop/orders/me/create_order/", payload);
      const orderId: number = response.data.id;
      router.push(`/orders/${orderId}`);
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

  const cityConfirmed = !!form.city_ref;
  const warehouseConfirmed = !!form.warehouse_ref;

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Бронювання розміру</h1>

      {!isAuthenticated && (
        <div className="mb-5">
          <AuthBlock onSuccess={() => {}} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Recipient */}
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

        {/* Delivery */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Доставка</h2>

          {/* Delivery type selector */}
          <div className="flex flex-col gap-2">
            {DELIVERY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${deliveryType === opt.value
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 hover:border-teal-300"
                  }`}
              >
                <input
                  type="radio"
                  name="delivery_type"
                  value={opt.value}
                  checked={deliveryType === opt.value}
                  onChange={() => handleDeliveryTypeChange(opt.value)}
                  className="accent-teal-600"
                />
                <span className="text-sm font-medium text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>

          {/* Pickup info card */}
          {deliveryType === "pickup" && (
            <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-4 text-sm text-teal-800 space-y-1">
              <p className="font-semibold text-teal-900">Адреса магазину:</p>
              <p>{STORE_ADDRESS}</p>
              <p className="text-xs text-teal-500 pt-1">Після підтвердження бронювання менеджер зв'яжеться з вами для уточнення часу візиту.</p>
            </div>
          )}

          {/* City autocomplete */}
          {deliveryType !== "pickup" && (
            <AutocompleteField
              label="Місто"
              placeholder="Почніть вводити назву міста..."
              inputValue={cityQuery}
              onInputChange={handleCityInput}
              onSelect={handleCitySelect}
              options={cityOptions}
              isLoading={cityLoading}
              confirmed={cityConfirmed}
              error={errors.city_name}
            />
          )}

          {/* Warehouse / postamat autocomplete */}
          {deliveryType !== "np_address" && deliveryType !== "pickup" && (
            <div>
              <AutocompleteField
                label={deliveryType === "np_warehouse" ? "Відділення" : "Поштомат"}
                placeholder={
                  cityConfirmed
                    ? "Введіть номер або адресу..."
                    : "Спочатку оберіть місто"
                }
                inputValue={warehouseQuery}
                onInputChange={handleWarehouseInput}
                onSelect={handleWarehouseSelect}
                options={warehouseOptions}
                isLoading={warehouseLoading}
                disabled={!cityConfirmed}
                confirmed={warehouseConfirmed}
                error={errors.warehouse_address}
              />
              {cityConfirmed && !warehouseConfirmed && (
                <p className="text-xs text-gray-400 mt-1">
                  Введіть номер або частину адреси для пошуку
                </p>
              )}
            </div>
          )}

          {/* Courier address fields */}
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

        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5 text-sm text-teal-700">
          <p className="font-semibold mb-1">Як це працює?</p>
          <p>Після підтвердження бронювання наш менеджер зв'яжеться з вами для уточнення розміру та деталей замовлення.</p>
        </div>

        <button
          type="submit"
          disabled={isLoading || !isAuthenticated}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold py-3 rounded-xl transition-colors"
          title={!isAuthenticated ? "Спочатку увійдіть або зареєструйтесь" : undefined}
        >
          {isLoading ? "Обробка..." : "Підтвердити бронювання"}
        </button>
      </form>
    </div>
  );
}
