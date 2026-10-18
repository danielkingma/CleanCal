import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StatementsView, { type SavedStatement } from "@/components/StatementsView";
import { getStatementsAccess } from "@/lib/statements-access";
import { isSuperadmin } from "@/lib/superadmin";
import { currentFY, periodRange } from "@/lib/statements";
import type { PropertyOwner } from "@/lib/types";
import { loadStatement } from "./data";

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export default async function StatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string; month?: string }>;
}) {
  const supabase = await createClient();
  const access = await getStatementsAccess(supabase);
  if (!access) redirect("/login");
  if (!access.allowed) redirect("/calendar");
  const sp = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: owners } = await supabase.from("property_owners").select("id, name, email, phone, notes").order("name");
  const ownerList = (owners ?? []) as PropertyOwner[];
  const ownerId = ownerList.find((o) => o.id === sp.owner)?.id ?? ownerList[0]?.id ?? "";
  const month = periodRange(sp.month ?? "") ? (sp.month as string) : currentMonth();
  const range = periodRange(month)!;

  const loaded = ownerId ? await loadStatement(supabase, ownerId, range.start, range.end) : null;
  const { data: saved } = ownerId
    ? await supabase
        .from("owner_statements")
        .select("id, period_start, period_end, share_enabled, updated_at")
        .eq("property_owner_id", ownerId)
        .order("period_start", { ascending: false })
    : { data: [] };

  return (
    <StatementsView
      owners={ownerList}
      ownerId={ownerId}
      month={month}
      currentFY={currentFY(new Date().toISOString().slice(0, 10))}
      snapshot={loaded?.snapshot ?? null}
      expenses={loaded?.expenses ?? []}
      properties={loaded?.properties ?? []}
      saved={(saved ?? []) as SavedStatement[]}
      isSuperadmin={isSuperadmin(user?.email)}
    />
  );
}
