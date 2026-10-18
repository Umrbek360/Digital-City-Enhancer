/**
 * Normalize the Uzbek phone formats accepted by the app to +998XXXXXXXXX.
 * Only common display separators are ignored; letters and extra symbols fail.
 */
export function normalizeUzbekPhone(value: string): string | null {
  const compact = value.trim().replace(/[\s().-]/g, "");
  if (!/^\+?\d+$/.test(compact)) return null;

  const digits = compact.startsWith("+") ? compact.slice(1) : compact;
  const nationalNumber =
    digits.length === 12 && digits.startsWith("998")
      ? digits.slice(3)
      : digits.length === 9
        ? digits
        : null;

  if (!nationalNumber || !/^\d{9}$/.test(nationalNumber)) return null;
  return `+998${nationalNumber}`;
}
