import { SITE_CONTACTS } from "@/app/lib/site-contacts";
import {
  JSON_LD_ALTERNATE_NAMES,
  SITE_NAME,
  SITE_URL,
  STORE_ADDRESS,
} from "@/app/lib/seo";

export default function StoreJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "ShoeStore",
    name: `${SITE_NAME} — Магазин дитячого взуття`,
    alternateName: JSON_LD_ALTERNATE_NAMES,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    image: `${SITE_URL}/icon.jpg`,
    telephone: SITE_CONTACTS.phoneTel,
    email: SITE_CONTACTS.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: "проспект Левка Лук'яненка 78",
      addressLocality: "Чернігів",
      addressRegion: "Чернігівська область",
      addressCountry: "UA",
    },
    description: STORE_ADDRESS,
    areaServed: {
      "@type": "Country",
      name: "Україна",
    },
    sameAs: [SITE_CONTACTS.social.instagram].filter(Boolean),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
