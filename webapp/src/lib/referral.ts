// Referral points program (supabase/migrations/0050_referral_program.sql).
export const REFERRAL_COOKIE = "cleancal_ref";
// One-off credit for each referred business that starts paying monthly.
export const REFERRAL_CREDIT_CENTS = 2000;

export function normaliseReferralCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toUpperCase();
  return /^[A-Z0-9]{6,12}$/.test(code) ? code : null;
}

export function referralLink(code: string): string {
  return `https://www.cleancal.net/?ref=${code}`;
}
