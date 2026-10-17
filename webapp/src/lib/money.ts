export function formatCents(cents: number | null | undefined, currency = "AUD"): string {
  if (cents === null || cents === undefined) return "—";
  try {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

// "120", "120.5", "$120.50" -> 12050; "" -> null; anything else -> NaN
export function dollarsToCents(raw: string): number | null {
  const v = raw.replace(/[$,\s]/g, "");
  if (v === "") return null;
  if (!/^\d+(\.\d{0,2})?$/.test(v)) return Number.NaN;
  return Math.round(Number(v) * 100);
}
