interface LogoProps {
  className?: string;
}

export default function Logo({ className = "h-14 w-14" }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 160"
      className={className}
      aria-label="TAK i TAK — Магазин дитячого взуття"
    >
      <defs>
        <filter id="logoShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="1" stdDeviation="2.5" floodColor="#000" floodOpacity="0.15" />
        </filter>
      </defs>

      <circle cx="80" cy="80" r="76" fill="#b2f1f0" filter="url(#logoShadow)" />

      {/* ── Монограма ── */}
      {/*
        Ліва T:  перекладинка x=48-84 (y=30-39), стержень x=62-70 (y=39-75)
        і:       крапка над лівою T (cx=66, cy=22), стержень x=76-84 в проміжку (y=39-66)
        Права ⊥: стержень x=90-98 (y=30-66), перекладинка x=76-112 (y=66-75)
        Проміжки між стержнями: 6px зліва (x=70-76) та 6px справа (x=84-90)
      */}

      {/* Ліва T — перекладинка зверху, стержень вниз (темно-сіра) */}
      <rect x="48" y="30" width="36" height="9" fill="#1f2937" />
      <rect x="62" y="39" width="8"  height="36" fill="#1f2937" />

      {/* і — крапка над лівою T, стержень у проміжку між T (світло-сіра) */}
      <rect x="76" y="17" width="8" height="8" fill="#9ca3af" />
      <rect x="76" y="44" width="8"  height="17" fill="#9ca3af" />

      {/* Права ⊥ — стержень вгору, перекладинка знизу (темно-сіра) */}
      <rect x="90" y="30" width="8"  height="36" fill="#1f2937" />
      <rect x="76" y="66" width="36" height="9"  fill="#1f2937" />

      {/* ── Текст ── */}
      <text
        x="80"
        y="110"
        fontFamily="'Arial Black', 'Arial Bold', Arial, Helvetica, sans-serif"
        fontWeight="900"
        fontSize="21"
        fill="#1f2937"
        textAnchor="middle"
        letterSpacing="1"
      >
        TAK I TAK
      </text>
    </svg>
  );
}
