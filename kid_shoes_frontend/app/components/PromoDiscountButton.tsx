"use client";

interface PromoDiscountButtonProps {
  active: boolean;
  onClick: () => void;
}

export default function PromoDiscountButton({ active, onClick }: PromoDiscountButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative overflow-hidden rounded-xl px-5 py-2.5 pr-14 text-sm font-semibold text-white transition-colors ${
        active
          ? "bg-teal-600 ring-2 ring-teal-400 ring-offset-2"
          : "bg-teal-600 hover:bg-teal-700"
      }`}
    >
      <span className="relative z-10">Акційна пропозиція -30%</span>
      {/* вузька кутова стрічка: thin band, only corner, text dead-center */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-[10px] -right-3 flex h-[14px] w-16 -rotate-45 items-center justify-center bg-red-500 text-[9px] font-bold leading-[14px] text-white"
      >
        -30%
      </span>
    </button>
  );
}
