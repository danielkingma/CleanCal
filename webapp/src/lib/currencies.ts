// Currencies offered for client statements and payout imports.
export const CURRENCIES: { code: string; name: string }[] = [
  { code: "AUD", name: "Australian dollar" },
  { code: "NZD", name: "New Zealand dollar" },
  { code: "GBP", name: "British pound" },
  { code: "EUR", name: "Euro" },
  { code: "USD", name: "US dollar" },
  { code: "CAD", name: "Canadian dollar" },
  { code: "ZAR", name: "South African rand" },
  { code: "INR", name: "Indian rupee" },
  { code: "SGD", name: "Singapore dollar" },
  { code: "JPY", name: "Japanese yen" },
];

export function isCurrency(code: unknown): code is string {
  return typeof code === "string" && CURRENCIES.some((c) => c.code === code);
}
