// The Letterbox — every sealed thread the signed-in user is part of, in
// one place, with live updates as new letters arrive. Reachable from the
// navbar at all times so messaging is never hidden.
import { InboxView } from "@/lib/inbox-view";

export const dynamic = "force-dynamic";

export default function LetterboxPage() {
  return <InboxView />;
}
