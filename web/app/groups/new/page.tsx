// Screen — Group composer. Each "room" is its own pragueconnect.eth
// subname carrying a pc.group=1 marker plus an XMTP MLS group id.
import { GroupComposeForm } from "@/lib/group-compose-form";

export const dynamic = "force-dynamic";

export default function NewGroupPage() {
  return <GroupComposeForm />;
}
