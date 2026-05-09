// Screen 10 — The Familiar. Real ENSIP-25 agent-registration form on the
// user's `<label>.pragueconnect.eth` subname. The signed-in human delegates a
// scoped authority (read-feed, post-offer, accept-work) to an agent
// address by writing the attestation to the `agent-registration` text
// record. ERC-8004 Identity Registry registration is scoped post-hackathon.
import { AgentForm } from "@/lib/agent-form";

export default function AgentPage() {
  return <AgentForm />;
}
