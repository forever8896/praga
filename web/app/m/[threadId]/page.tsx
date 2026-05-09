// Screen 5 — Sealed thread between two ENS names. Wired to XMTP V3 / MLS.
// threadId is the recipient's pragueconnect.eth label (e.g., "kilian"). Server
// resolves it to an address; client opens the DM.
import { ThreadView } from "@/lib/thread-view";
import { getSubname } from "@/lib/namestone";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId: raw } = await params;
  const label = raw.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/\.pragueconnect\.eth$/, "");
  const record = await getSubname(env.namestoneDomain, label).catch(() => null);
  const peer = {
    label,
    ens: `${label}.${env.namestoneDomain}`,
    display: record?.text_records?.name ?? label.charAt(0).toUpperCase() + label.slice(1),
    address: record?.address ?? null,
    location: record?.text_records?.location ?? "",
    found: !!record,
    stealthMeta: record?.text_records?.["stealth-meta-address"] ?? "",
  };
  return <ThreadView peer={peer} />;
}
