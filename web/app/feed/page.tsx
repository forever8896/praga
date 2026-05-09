// Screen 2 — Discovery feed — the town square. Server fetches real offers
// from every pragueconnect.eth subname; the FeedView client component handles
// filtering and rendering.
import { loadFeed } from "@/lib/offers";
import { FeedView } from "@/lib/feed-view";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const offers = await loadFeed().catch(() => []);
  return <FeedView offers={offers} />;
}
