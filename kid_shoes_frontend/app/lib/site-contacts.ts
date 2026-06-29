/** Контакти та соцмережі — можна перевизначити через NEXT_PUBLIC_* у Vercel. */
export const SITE_CONTACTS = {
  email: "tak.i.tak.original@gmail.com",
  phone: "+380689276318",
  phoneTel: "+380689276318",
  social: {
    instagram:
      process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM ??
      "https://www.instagram.com/tak_i_tak_original/",
    telegram:
      process.env.NEXT_PUBLIC_SOCIAL_TELEGRAM ??
      "https://t.me/tak_i_tak_original",
    viber:
      process.env.NEXT_PUBLIC_SOCIAL_VIBER ??
      "viber://chat?number=380689276318",
    whatsapp:
      process.env.NEXT_PUBLIC_SOCIAL_WHATSAPP ??
      "https://wa.me/380689276318",
  },
};
