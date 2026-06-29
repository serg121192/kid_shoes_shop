/** Контакти та соцмережі — можна перевизначити через NEXT_PUBLIC_* у Vercel. */
export const SITE_CONTACTS = {
  email: "tak.i.tak.original@gmail.com",
  phone: "+380689276318",
  phoneTel: "+380689276318",
  social: {
    instagram:
      process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM ??
      "https://www.instagram.com/taki_tak5_8",
    telegram: process.env.NEXT_PUBLIC_SOCIAL_TELEGRAM ?? "",
    viber: process.env.NEXT_PUBLIC_SOCIAL_VIBER ?? "",
    whatsapp: process.env.NEXT_PUBLIC_SOCIAL_WHATSAPP ?? "",
  },
};
