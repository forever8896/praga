// Swarm integration — render a user's profile as static HTML, upload to a
// Bee node, encode the resulting bzz reference as an ENS contenthash, write
// it back to NameStone. Result: `<name>.pragueconnect.eth.limo` resolves to a real
// Swarm-served personal site.
//
// Requires SWARM_BEE_URL + SWARM_POSTAGE_BATCH_ID env vars (the postage
// batch is the "stamp" — at the hackathon, mentors hand out gift codes).
//
// ENSIP-7 contenthash encoding for Swarm references is fixed prefix +
// 32-byte content reference:
//   0xe40101fa011b20 || <32-byte-ref>
// Where:
//   0xe401 — swarm-ns multicodec
//   0x01   — CIDv1
//   0xfa01 — swarm-manifest codec
//   0x1b20 — multihash header: keccak256 (0x1b), 32 bytes (0x20)
import type { NameStoneRecord } from "./namestone";
import { CROPS_SEAL_SVG } from "./ornaments";

const SWARM_CONTENTHASH_PREFIX = "e40101fa011b20";

export function bzzToContenthash(ref: string): `0x${string}` {
  const clean = ref.replace(/^0x/, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(clean)) {
    throw new Error("invalid bzz reference");
  }
  return `0x${SWARM_CONTENTHASH_PREFIX}${clean}` as `0x${string}`;
}

export function isSwarmConfigured(): boolean {
  return !!process.env.SWARM_BEE_URL && !!process.env.SWARM_POSTAGE_BATCH_ID;
}

interface UploadResult {
  reference: string;
  contenthash: `0x${string}`;
}

export async function uploadHtmlToSwarm(html: string, fileName = "index.html"): Promise<UploadResult> {
  const beeUrl = process.env.SWARM_BEE_URL;
  const stamp = process.env.SWARM_POSTAGE_BATCH_ID;
  if (!beeUrl || !stamp) {
    throw new Error("swarm-not-configured");
  }
  const url = new URL(`${beeUrl.replace(/\/$/, "")}/bzz`);
  url.searchParams.set("name", fileName);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Swarm-Postage-Batch-Id": stamp,
      "Swarm-Index-Document": "index.html",
    },
    body: html,
  });
  if (!res.ok) {
    throw new Error(`bee ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { reference?: string };
  if (!data.reference) {
    throw new Error("bee returned no reference");
  }
  return {
    reference: data.reference,
    contenthash: bzzToContenthash(data.reference),
  };
}

/** Render a user's NameStone record as a self-contained HTML page suitable
 *  for serving from `<name>.pragueconnect.eth.limo`. No JS, no external assets — just
 *  inline CSS so the page works on any *.eth.limo gateway. */
export function renderProfileHtml(record: NameStoneRecord): string {
  const tr = record.text_records ?? {};
  const ens = `${record.name}.${record.domain}`;
  const display = escapeHtml(tr.name ?? record.name.charAt(0).toUpperCase() + record.name.slice(1));
  const bio = escapeHtml(tr.description ?? "");
  const location = escapeHtml(tr.location ?? "Praha");
  const stealth = tr["stealth-meta-address"] ?? "";
  const sealedBy = tr["sealed-by"] ?? "";
  const skills = parseSkills(tr.skills);
  const offers = parseOffers(tr.offers);
  const hasStealth = stealth.startsWith("st:eth:");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${display} · ${ens}</title>
<meta name="description" content="${bio.slice(0, 160) || `${display} · sealed by PragueConnect`}">
<meta property="og:title" content="${display} · ${ens}">
<meta property="og:description" content="${bio.slice(0, 160) || "by the hand of"}">
<style>
  :root {
    --parchment: #F4ECD8;
    --bone: #EFE5CB;
    --ink: #1F1A12;
    --ink-70: rgba(31,26,18,0.70);
    --ink-50: rgba(31,26,18,0.50);
    --ink-30: rgba(31,26,18,0.30);
    --vermilion: #B23A2F;
    --gilded: #B79F4E;
    --gilded-soft: #BFA963;
    --verdigris: #527260;
  }
  * { box-sizing: border-box }
  html,body { margin:0; padding:0; background: var(--parchment); color: var(--ink); }
  body {
    font-family: 'EB Garamond', Garamond, Georgia, serif;
    font-size: 17px; line-height: 1.55;
    background-image: radial-gradient(rgba(31,26,18,0.06) 1px, transparent 1px);
    background-size: 4px 4px;
  }
  .wrap { max-width: 720px; margin: 0 auto; padding: 32px 24px 64px; }
  .center { text-align: center; }
  .display { font-family: 'Cormorant Garamond', Garamond, Georgia, serif; }
  .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 14px; }
  .italic { font-style: italic; }
  .vermilion { color: var(--vermilion); }
  .ink70 { color: var(--ink-70); }
  .gilded { color: var(--gilded-soft); }
  .kicker { font-family: 'Cormorant Garamond', serif; font-size: 11px; letter-spacing: 0.4em; color: var(--vermilion); text-transform: uppercase; }
  .name { font-family: 'Cormorant Garamond', serif; font-size: 56px; letter-spacing: 0.04em; line-height: 1; margin: 8px 0 6px; }
  .ens { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--ink-70); }
  .hr { border: none; border-top: 0.5px solid var(--gilded); margin: 28px 0; }
  .hr-double { border: none; height: 5px; border-top: 0.5px solid var(--gilded); border-bottom: 0.5px solid var(--gilded); width: 80px; margin: 12px auto; }
  .cartouche { border: 0.5px solid var(--gilded); padding: 24px; background: var(--bone); position: relative; }
  .row { display: flex; justify-content: space-between; align-items: baseline; padding: 10px 0; border-bottom: 0.5px solid var(--gilded); gap: 12px; }
  .row:last-child { border-bottom: none; }
  .badge { display: inline-block; padding: 2px 8px; font-family: 'Cormorant Garamond'; font-size: 10px; letter-spacing: 0.25em; color: var(--vermilion); border: 0.5px solid var(--vermilion); border-radius: 0; }
  .muted { color: var(--ink-50); font-size: 12px; letter-spacing: 0.15em; font-family: 'JetBrains Mono', monospace; }
  .priv { padding: 12px 14px; background: var(--bone); border: 0.5px solid var(--gilded); margin-top: 18px; font-style: italic; color: var(--ink-70); font-size: 14px; line-height: 1.55; }
  a { color: var(--vermilion); }
  .fleur { display: block; margin: 0 auto 8px; }
  @media (max-width: 600px) { .name { font-size: 38px; } body { font-size: 16px; } }
</style>
</head>
<body>
<div class="wrap">
  <header class="center">
    <svg class="fleur" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#B79F4E" stroke-width="0.8" stroke-linecap="round">
      <path d="M12 2 L12 22 M5 8 Q5 12 12 12 Q19 12 19 8 M8 6 Q12 4 16 6"/>
    </svg>
    <div class="kicker">By the hand of</div>
    <h1 class="name">${display}</h1>
    <div class="ens">${ens}</div>
    <div class="hr-double"></div>
    <div class="muted">VERIFIED HUMAN · ${escapeHtml(location.toUpperCase())}</div>
  </header>

  ${bio ? `<p class="italic" style="margin-top:24px; font-size:18px; line-height:1.65">${bio}</p>` : ""}

  ${
    skills.length
      ? `<div class="hr"></div>
         <div class="kicker">The catalogue</div>
         <h2 class="display" style="font-size:22px; letter-spacing:0.04em; margin: 4px 0 12px">Skills offered</h2>
         <div>${skills
           .map(
             (s) => `<div class="row">
                <span>${escapeHtml(s.name)}</span>
                <span class="ink70 italic">${escapeHtml(s.price)}</span>
              </div>`,
           )
           .join("")}</div>`
      : ""
  }

  ${
    offers.length
      ? `<div class="hr"></div>
         <div class="kicker">On the square</div>
         <h2 class="display" style="font-size:22px; letter-spacing:0.04em; margin: 4px 0 12px">Posted by ${display}</h2>
         <div>${offers
           .map(
             (o) => `<div class="row">
                <span><span class="badge">${o.type}</span> &nbsp; ${escapeHtml(o.title)}</span>
                <span class="ink70 italic">${o.kc > 0 ? o.kc + " Kč" : "free"}</span>
              </div>`,
           )
           .join("")}</div>`
      : ""
  }

  <div class="hr"></div>
  <div class="cartouche center">
    <div class="kicker">Verus Sigillum</div>
    <p class="italic ink70" style="margin: 8px 0">this site is sealed by PragueConnect · the name belongs to the human</p>
    <div class="muted" style="margin-top: 8px">${ens} · ${record.address.slice(0, 6)}…${record.address.slice(-4)}</div>
    ${
      sealedBy
        ? `<p class="italic ink70" style="margin-top:10px; font-size:13px">sealed by <a href="https://pragueconnect-azure.vercel.app/${escapeHtml(sealedBy)}" style="font-family:'JetBrains Mono', monospace; font-size:12px; color:var(--ink-70); text-decoration:none; border-bottom:0.5px dotted var(--gilded)">${escapeHtml(sealedBy)}</a></p>`
        : ""
    }
    ${
      hasStealth
        ? `<p class="italic ink70" style="margin-top:14px; font-size:13px">A private-gift route is sealed under this name — gifts can be sent without revealing the address they land at.</p>`
        : ""
    }
  </div>

  <p class="muted center" style="margin-top: 24px">served from Swarm · resolved via ENS · <a href="https://pragueconnect-azure.vercel.app/${ens}">interactive view ↗</a></p>

  <!-- inheritance pull-tab — visible to anyone who isn't this site's owner -->
  <div style="position: sticky; bottom: 12px; margin-top: 36px; display:flex; justify-content:center;">
    <div style="background: var(--bone); border: 0.5px solid var(--gilded); padding: 14px 16px; display:flex; align-items:center; gap:12px; max-width: 540px; width: 100%; box-shadow: 0 -10px 24px -10px rgba(31,26,18,0.18)">
      <svg width="22" height="22" viewBox="0 0 40 40" fill="none" stroke="#B79F4E" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" style="flex:0 0 auto"><path d="M20 4 C 20 12, 20 22, 20 28"/><path d="M20 4 C 18.5 6, 18.5 8, 20 9 C 21.5 8, 21.5 6, 20 4 Z"/><path d="M20 14 C 14 14, 9 18, 8 24 C 7 28, 10 30, 13 28 C 15.5 26.5, 17 22, 20 20"/><path d="M20 14 C 26 14, 31 18, 32 24 C 33 28, 30 30, 27 28 C 24.5 26.5, 23 22, 20 20"/><path d="M11 22 C 15 21, 25 21, 29 22"/><path d="M14 28 C 16 30, 24 30, 26 28"/></svg>
      <div style="flex:1; min-width:0">
        <div style="font-family: 'Cormorant Garamond', serif; font-size: 10px; letter-spacing: 0.35em; color: var(--vermilion); text-transform: uppercase">AN INVITATION</div>
        <div style="font-style: italic; font-size: 14px; line-height: 1.45; color: var(--ink); margin-top: 2px">You were led to this seal by <strong style="font-style:normal">${escapeHtml(display.split(" ")[0])}</strong>.</div>
      </div>
      <a href="https://pragueconnect-azure.vercel.app/?invitedBy=${encodeURIComponent(record.name)}" style="flex:0 0 auto; padding: 10px 14px; background: var(--ink); color: var(--parchment); font-family: 'Cormorant Garamond', serif; font-size: 10px; letter-spacing: 0.3em; text-decoration: none; white-space: nowrap">INSCRIBE MY NAME</a>
    </div>
  </div>

  <div style="margin-top: 36px; padding-top: 20px; border-top: 0.5px solid var(--gilded); display:flex; justify-content:center; align-items:center; gap:12px;">
    <a href="https://pragueconnect-azure.vercel.app/crops" style="line-height:0; display:inline-flex" aria-label="censorship-resistant · open-source · private · secure">${CROPS_SEAL_SVG(28)}</a>
    <span class="italic ink70" style="font-size:12px; letter-spacing:0.04em">sealed by your own hand · forkable · MIT</span>
  </div>
</div>
</body>
</html>`;
}

interface ParsedSkill { name: string; price: string }
function parseSkills(raw: string | undefined): ParsedSkill[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((s) => s && typeof s === "object" && typeof s.name === "string")
      .map((s: { name: string; price?: string }) => ({ name: s.name, price: s.price ?? "" }))
      .slice(0, 12);
  } catch {
    return [];
  }
}

interface ParsedOffer { title: string; type: string; kc: number }
function parseOffers(raw: string | undefined): ParsedOffer[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((o) => o && typeof o === "object" && typeof o.title === "string")
      .map((o: { title: string; type?: string; kc?: number }) => ({
        title: o.title,
        type: typeof o.type === "string" ? o.type : "OFFER",
        kc: typeof o.kc === "number" ? o.kc : 0,
      }))
      .slice(0, 8);
  } catch {
    return [];
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
