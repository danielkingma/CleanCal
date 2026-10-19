import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import SignOutButton from "@/components/SignOutButton";
import NavMenus from "@/components/NavMenus";
import ReferralShare from "@/components/ReferralShare";
import { isStaff } from "@/lib/types";
import { isSuperadmin } from "@/lib/superadmin";
import { referralLink } from "@/lib/referral";
import { isOwner } from "@/lib/types";

export default async function ReferralPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!isStaff(profile?.role)) redirect("/calendar");

  const { data: org } = await supabase.from("organizations").select("referral_code").maybeSingle();
  const code = (org?.referral_code as string | null) ?? null;
  const { data: referrals } = await supabase.rpc("my_referrals");
  const owner = isOwner(profile?.role);
  const { data: entries } = owner
    ? await supabase
        .from("referral_wallet_entries")
        .select("id, amount_cents, kind, note, created_at")
        .order("created_at", { ascending: false })
    : { data: null };
  const balance = (entries ?? []).reduce((s, e) => s + (e.amount_cents as number), 0);
  const money = (c: number) => `$${(c / 100).toFixed(2)}`;
  const rows = (referrals ?? []) as { id: string; created_at: string; status: string }[];

  return (
    <div>
      <div className="topbar">
        <div className="topbar-row">
          <div className="brand">
            <Logo />
            Clean<span>Cal</span>
          </div>
          <SignOutButton />
        </div>
        <div className="topbar-row">
          <div style={{ color: "var(--muted)", fontSize: 14 }}>Referral</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <NavMenus isStaffUser={true} isSuperadmin={isSuperadmin(user.email)} />
            <Link href="/calendar" className="today-btn">
              ← Calendar
            </Link>
          </div>
        </div>
      </div>
      <main>
        <ReferralShare link={code ? referralLink(code) : "https://www.cleancal.net"} />
        <div className="property-card" style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 18, margin: 0 }}>Referral wallet</h2>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 10px" }}>
            You earn $20 of CleanCal credit, once, for each business you refer that starts paying monthly. Credit
            exists only inside CleanCal: it is never paid out as cash, can&apos;t be withdrawn or transferred, and can
            only be used towards your own CleanCal subscription once billing starts.
          </p>
          {owner ? (
            <>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{money(balance)}</div>
              {(entries ?? []).map((e) => (
                <div key={e.id as string} style={{ fontSize: 13, marginTop: 6 }}>
                  {new Date(e.created_at as string).toLocaleDateString("en-AU")} · {e.note || e.kind} ·{" "}
                  {money(e.amount_cents as number)}
                </div>
              ))}
            </>
          ) : (
            <p style={{ fontSize: 13 }}>The wallet balance is visible to Owners.</p>
          )}
          <h3 style={{ fontSize: 15, margin: "16px 0 4px" }}>Your referrals ({rows.length})</h3>
          {rows.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>None yet.</p>
          ) : (
            rows.map((r) => (
              <div key={r.id} style={{ fontSize: 13, marginTop: 4 }}>
                {new Date(r.created_at).toLocaleDateString("en-AU")} ·{" "}
                {r.status === "paying" ? "Paying — credited" : "Signed up — waiting for first payment"}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
