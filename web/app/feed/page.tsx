// Screen 2 — Discovery feed — the town square. Server fetches real offers
// from every pragueconnect.eth subname; the FeedView client component handles
// filtering and rendering.
import { loadFeed } from "@/lib/offers";
import { FeedView } from "@/lib/feed-view";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const { offers, people } = await loadFeed().catch(() => ({ offers: [], people: [] }));
  return <FeedView offers={offers} people={people} />;
}
