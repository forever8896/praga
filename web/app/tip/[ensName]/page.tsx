// Screen 9 — Sealed gift compose. Reads recipient's stealth meta-address from
// NameStone, derives a fresh stealth address client-side, and calls PragueConnectTip
// to atomically transfer + announce on Base Sepolia.
import { TipForm } from "@/lib/tip-form";
import { getSubname } from "@/lib/namestone";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function TipPage({
  params,
}: {
  params: Promise<{ ensName: string }>;
}) {
  const { ensName: rawName } = await params;
  const ens = rawName.includes(".") ? rawName : `${rawName}.pragueconnect.eth`;
  const label = ens.split(".")[0];
  const record = await getSubname(env.namestoneDomain, label).catch(() => null);
  const recipient = {
    ens,
    label,
    display: record?.text_records?.name ?? label.charAt(0).toUpperCase() + label.slice(1),
    address: record?.address ?? null,
    stealthMeta: record?.text_records?.["stealth-meta-address"] ?? "",
    location: record?.text_records?.location ?? "",
  };
  return <TipForm recipient={recipient} />;
}
