/** Контакти та соцмережі — можна перевизначити через NEXT_PUBLIC_* у Vercel. */
export const SITE_CONTACTS = {
  email: "tak.i.tak.original@gmail.com",
  phone: "+380938569255",
  phoneTel: "+380938569255",
  social: {
    instagram:
      process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM ??
      "https://www.instagram.com/taki_tak5_8",
    telegram: process.env.NEXT_PUBLIC_SOCIAL_TELEGRAM ?? "",
    viber: process.env.NEXT_PUBLIC_SOCIAL_VIBER ?? "",
    whatsapp: process.env.NEXT_PUBLIC_SOCIAL_WHATSAPP ?? "",
  },
};
