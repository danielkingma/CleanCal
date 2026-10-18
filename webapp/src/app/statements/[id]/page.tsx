import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStatementsAccess } from "@/lib/statements-access";
import StatementDocument from "@/components/StatementDocument";
import StatementShare from "@/components/StatementShare";
import PrintButton from "@/components/PrintButton";
import { fyLabelFromDates, type StatementSnapshot } from "@/lib/statements";

function periodText(start: string, end: string): string {
  if (start.slice(0, 7) === end.slice(0, 7)) {
    return new Date(`${start}T00:00:00`).toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  }
  return fyLabelFromDates(start, end);
}

export default async function SavedStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getStatementsAccess(supabase);
  if (!access) redirect("/login");
  if (!access.allowed) redirect("/calendar");

  const { data: row } = await supabase
    .from("owner_statements")
    .select("id, property_owner_id, period_start, share_token, share_enabled, snapshot, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!row) notFound();
  const { data: owner } = await supabase.from("property_owners").select("name, email").eq("id", row.property_owner_id).maybeSingle();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "www.cleancal.net";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const snapshot = row.snapshot as StatementSnapshot;
  const periodLabel = periodText(row.period_start as string, snapshot.period_end);

  return (
    <div className="stmt-public" style={{ flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div className="no-print" style={{ width: "100%", maxWidth: 820, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Link href={`/statements?owner=${row.property_owner_id}${snapshot.period_end.slice(0, 7) === String(row.period_start).slice(0, 7) ? `&month=${String(row.period_start).slice(0, 7)}` : ""}`}>← Statements</Link>
        <PrintButton />
        <span style={{ color: "var(--muted)", fontSize: 13 }}>
          Saved {new Date(row.updated_at as string).toLocaleDateString("en-AU")} — a frozen copy; later changes don&apos;t alter it.
        </span>
      </div>
      <StatementDocument s={snapshot} />
      <StatementShare
        id={row.id as string}
        token={row.share_token as string}
        enabled={Boolean(row.share_enabled)}
        clientEmail={(owner?.email as string) ?? ""}
        clientName={(owner?.name as string) ?? ""}
        periodLabel={periodLabel}
        origin={`${proto}://${host}`}
      />
    </div>
  );
}
