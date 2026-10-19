import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSuperadmin } from "@/lib/superadmin";
import { REFERRAL_CREDIT_CENTS } from "@/lib/referral";

async function awardCredit(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isSuperadmin(user.email)) redirect("/calendar");
  const referredId = String(formData.get("referred") ?? "");
  if (!referredId) return;
  const { error } = await createServiceClient().rpc("award_referral_credit", {
    p_referred_org_id: referredId,
    p_amount_cents: REFERRAL_CREDIT_CENTS,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/referrals");
}

export default async function AdminReferralsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isSuperadmin(user.email)) redirect("/calendar");

  const service = createServiceClient();
  const [{ data: referrals }, { data: orgs }] = await Promise.all([
    service.from("referrals").select("*").order("created_at", { ascending: false }),
    service.from("organizations").select("id, name"),
  ]);
  const name = new Map((orgs ?? []).map((o) => [o.id as string, o.name as string]));

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22 }}>Referral credits</h1>
      <p style={{ fontSize: 13, color: "var(--muted)" }}>
        Mark a referred business as paying to credit ${(REFERRAL_CREDIT_CENTS / 100).toFixed(0)} to the referrer&apos;s
        wallet. Each referral can only be credited once.
      </p>
      {(referrals ?? []).length === 0 ? <p>No referrals yet.</p> : null}
      {(referrals ?? []).map((r) => (
        <div key={r.id as string} className="property-card" style={{ marginBottom: 8 }}>
          <div>
            <strong>{name.get(r.referred_org_id as string) ?? "Unknown"}</strong> referred by{" "}
            {name.get(r.referrer_org_id as string) ?? "Unknown"}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            Signed up {new Date(r.created_at as string).toLocaleDateString("en-AU")} ·{" "}
            {r.status === "paying" ? "Paying — credited" : "Waiting for first payment"}
          </div>
          {r.status === "signed_up" ? (
            <form action={awardCredit} style={{ marginTop: 8 }}>
              <input type="hidden" name="referred" value={r.referred_org_id as string} />
              <button type="submit" className="btn btn-secondary">
                Mark paying &amp; credit ${(REFERRAL_CREDIT_CENTS / 100).toFixed(0)}
              </button>
            </form>
          ) : null}
        </div>
      ))}
    </main>
  );
}
