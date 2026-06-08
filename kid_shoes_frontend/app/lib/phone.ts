/** Normalize Ukrainian phone to +380XXXXXXXXX */
export function normalizeUaPhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("380") && digits.length >= 12) return `+${digits.slice(0, 12)}`;
  if (digits.startsWith("0") && digits.length >= 10) return `+38${digits.slice(0, 10)}`;
  if (digits.startsWith("380")) return `+${digits}`;
  if (digits.startsWith("0")) return `+38${digits}`;
  if (digits.length > 0) return `+${digits}`;
  return trimmed;
}
