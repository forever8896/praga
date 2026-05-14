// Screen — /g/[label]
//
// A sealed room. Lives at <label>.pragueconnect.eth as a subname with a
// pc.group=1 marker. The actual chat is XMTP V3 MLS — the resolver only
// carries the room's metadata + the conversation id.
//
// If the subname doesn't exist OR exists but isn't a group, we 404 to a
// gentle "no such room" rather than leaking that a non-group subname
// exists at the same slug. Group-vs-person disambiguation happens in
// app/[ensName]/page.tsx (redirects group subnames to /g/<label>).
import { notFound } from "next/navigation";
import { getSubname } from "@/lib/resolver";
import { env } from "@/lib/env";
import { decodeGroup } from "@/lib/group";
import { GroupView } from "@/lib/group-view";

export const dynamic = "force-dynamic";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ label: string }>;
}) {
  const { label: rawLabel } = await params;
  const label = (rawLabel ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!label) notFound();

  const record = await getSubname(env.namestoneDomain, label).catch(() => null);
  if (!record) notFound();

  const group = decodeGroup({
    name: record.name,
    domain: record.domain,
    address: record.address,
    text_records: record.text_records ?? null,
  });
  if (!group) notFound();

  return <GroupView group={group} />;
}
