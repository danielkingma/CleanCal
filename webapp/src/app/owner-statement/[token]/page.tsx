import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import StatementDocument from "@/components/StatementDocument";
import PrintButton from "@/components/PrintButton";
import type { StatementSnapshot } from "@/lib/statements";

export const metadata: Metadata = {
  title: "Owner statement",
  robots: { index: false, follow: false },
};

// Private owner link. No sign-in: the unguessable token stands in for
// auth (same idea as the iCal export links), and it only ever shows one
// frozen statement, and only while the manager has the link switched on.
export default async function OwnerStatementPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();
  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from("owner_statements")
    .select("snapshot, share_enabled")
    .eq("share_token", token)
    .maybeSingle();
  if (!row || !row.share_enabled) notFound();

  return (
    <div className="stmt-public" style={{ flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div className="no-print">
        <PrintButton />
      </div>
      <StatementDocument s={row.snapshot as StatementSnapshot} />
    </div>
  );
}
