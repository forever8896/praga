// Screen 10 — Praga Agent dashboard — the familiar

function FamiliarOwl({ size = 140 }) {
  // Line-engraved owl/familiar — simple, line-art only.
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" fill="none" stroke="var(--ink)" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="70" cy="70" r="62" stroke="var(--gilded)" strokeWidth="0.5" />
      <circle cx="70" cy="70" r="56" stroke="var(--gilded)" strokeWidth="0.3" opacity="0.5" />
      {/* head */}
      <ellipse cx="70" cy="58" rx="28" ry="26" />
      {/* feather tufts */}
      <path d="M 48 38 L 44 28 L 54 36" />
      <path d="M 92 38 L 96 28 L 86 36" />
      {/* eyes */}
      <circle cx="60" cy="56" r="9" />
      <circle cx="80" cy="56" r="9" />
      <circle cx="60" cy="56" r="3" fill="var(--ink)" />
      <circle cx="80" cy="56" r="3" fill="var(--ink)" />
      <circle cx="61" cy="55" r="0.8" fill="var(--parchment)" />
      <circle cx="81" cy="55" r="0.8" fill="var(--parchment)" />
      {/* beak */}
      <path d="M 70 64 L 67 70 L 73 70 Z" />
      {/* body / wings */}
      <path d="M 44 78 C 36 92, 40 112, 60 116 C 70 118, 80 118, 90 116 C 110 112, 114 92, 106 78" />
      {/* feathers — striped pattern */}
      {Array.from({ length: 5 }).map((_, i) => (
        <path key={i} d={`M ${50 + i * 8} 86 C ${52 + i * 8} 90, ${52 + i * 8} 96, ${50 + i * 8} 100`} opacity="0.6" />
      ))}
      {/* perch */}
      <line x1="50" y1="116" x2="90" y2="116" />
      <path d="M 62 116 L 62 122 M 78 116 L 78 122" />
      {/* small alchemical mark in chest */}
      <circle cx="70" cy="92" r="5" stroke="var(--vermilion)" />
      <circle cx="70" cy="92" r="1.5" fill="var(--vermilion)" />
    </svg>
  );
}

const AGENT_PERMISSIONS = [
  { allowed: true, label: 'May reply to messages under 50 Kč', detail: 'in your voice, drawn from your prior threads' },
  { allowed: true, label: 'May confirm appointments on the calendar', detail: 'never on Sundays · always copies you' },
  { allowed: true, label: 'May acknowledge a private gift', detail: 'with a one-line thank-you' },
  { allowed: false, label: 'May not move funds without approval', detail: 'every release of a seal is yours' },
  { allowed: false, label: 'May not post a new notice', detail: 'work begins from your hand only' },
  { allowed: false, label: 'May not break a seal in dispute', detail: 'humans speak when humans must' },
];

const AGENT_LOG = [
  { time: '14:08', text: 'Replied to lucia.praga.eth: confirmed Saturday 10am.', kind: 'msg' },
  { time: '11:42', text: 'Acknowledged a private gift of 200 Kč.', kind: 'gift' },
  { time: '09:17', text: 'Marked the foreign-police thread as awaiting Kilian.', kind: 'msg' },
  { time: '08:00', text: 'Swept inbox · 0 new sealed threads.', kind: 'sweep' },
];

function AgentCore({ size = 'desktop' }) {
  const isMobile = size === 'mobile';
  return (
    <>
      {/* familiar */}
      <Cartouche style={{ background: 'var(--bone)' }} padding={isMobile ? 20 : 32}>
        <div style={{ display: isMobile ? 'block' : 'flex', alignItems: 'center', gap: 32, textAlign: isMobile ? 'center' : 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <FamiliarOwl size={isMobile ? 120 : 180} />
          </div>
          <div style={{ flex: 1, marginTop: isMobile ? 16 : 0 }}>
            <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.35em', color: 'var(--vermilion)' }}>YOUR FAMILIAR</div>
            <div className="t-display" style={{ fontSize: isMobile ? 28 : 44, letterSpacing: '0.04em', marginTop: 4 }}>Strix the Patient</div>
            <div className="t-mono" style={{ fontSize: isMobile ? 12 : 14, color: 'var(--ink-70)', marginTop: 4 }}>agent.kilian.praga.eth</div>
            <div className="t-italic" style={{ fontSize: isMobile ? 14 : 16, color: 'var(--ink)', marginTop: 12, lineHeight: 1.55 }}>An optional delegate that watches your inbox and answers the simple things. Speaks softly, never moves your seal, copies you on everything.</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: isMobile ? 'center' : 'flex-start' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--verdigris)', color: 'var(--parchment)' }}>
                <span style={{ width: 6, height: 6, background: 'var(--parchment)', borderRadius: '50%' }} />
                <span className="t-display" style={{ fontSize: 9, letterSpacing: '0.3em' }}>AWAKE</span>
              </span>
              <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-70)', alignSelf: 'center' }}>last action 6 minutes ago</span>
            </div>
          </div>
        </div>
      </Cartouche>

      {/* permissions */}
      <div style={{ marginTop: isMobile ? 24 : 36 }}>
        <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--vermilion)' }}>SCOPED POWERS</div>
        <div className="t-display" style={{ fontSize: isMobile ? 22 : 30, letterSpacing: '0.05em', marginTop: 4, marginBottom: 14 }}>What Strix may do</div>
        <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {AGENT_PERMISSIONS.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 16px', background: 'var(--bone)', border: '0.5px solid var(--gilded)', marginBottom: isMobile ? 10 : 0, opacity: p.allowed ? 1 : 0.85 }}>
              <div style={{ flex: '0 0 auto', marginTop: 2 }}>
                {p.allowed ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--verdigris)" strokeWidth="1.4">
                    <path d="M 4 11 L 8 15 L 16 6" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--vermilion)" strokeWidth="1.4">
                    <line x1="5" y1="5" x2="15" y2="15" />
                    <line x1="15" y1="5" x2="5" y2="15" />
                  </svg>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div className="t-body" style={{ fontSize: 15, color: 'var(--ink)' }}>{p.label}</div>
                <div className="t-italic" style={{ fontSize: 13, color: 'var(--ink-70)', marginTop: 2 }}>{p.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* log */}
      <div style={{ marginTop: isMobile ? 24 : 36 }}>
        <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--vermilion)' }}>RECENT</div>
        <div className="t-display" style={{ fontSize: isMobile ? 22 : 30, letterSpacing: '0.05em', marginTop: 4, marginBottom: 12 }}>Strix's hand</div>
        <div style={{ borderTop: '0.5px solid var(--gilded)' }}>
          {AGENT_LOG.map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 0', borderBottom: '0.5px solid var(--gilded)' }}>
              <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-70)', flex: '0 0 56px' }}>{l.time}</span>
              <span className="t-italic" style={{ fontSize: 14, color: 'var(--ink-70)', lineHeight: 1.4, flex: 1, fontWeight: 300 }}>{l.text}</span>
              <span className="t-display" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'var(--ink-50)' }}>· paler ink ·</span>
            </div>
          ))}
        </div>
        <div className="t-italic" style={{ fontSize: 12, color: 'var(--ink-70)', marginTop: 8 }}>Strix's actions are written in a thinner, paler ink than yours — so you can tell hand from familiar at a glance.</div>
      </div>

      {/* revoke */}
      <div style={{ marginTop: isMobile ? 28 : 40, padding: 24, border: '0.5px solid var(--vermilion)', background: 'rgba(178,58,47,0.04)', display: isMobile ? 'block' : 'flex', alignItems: 'center', gap: 24 }}>
        <WaxSeal size={isMobile ? 70 : 90} state="broken" rotate={-7} emboss="none" />
        <div style={{ flex: 1, marginTop: isMobile ? 14 : 0 }}>
          <div className="t-display" style={{ fontSize: 12, letterSpacing: '0.3em', color: 'var(--vermilion)' }}>BREAK THE SEAL</div>
          <div className="t-display" style={{ fontSize: isMobile ? 20 : 26, letterSpacing: '0.04em', marginTop: 4 }}>Revoke everything</div>
          <div className="t-italic" style={{ fontSize: 14, color: 'var(--ink-70)', marginTop: 4, maxWidth: 460, lineHeight: 1.5 }}>Strix's powers are removed at once. The agent name remains, but it can do nothing until you reseal it.</div>
        </div>
        <button style={{ marginTop: isMobile ? 14 : 0, padding: '14px 22px', background: 'var(--vermilion)', color: 'var(--parchment)', border: 'none', fontFamily: 'var(--display)', fontSize: 12, letterSpacing: '0.3em', cursor: 'pointer' }}>BREAK THE SEAL</button>
      </div>
    </>
  );
}

function ScreenAgentMobile() {
  return (
    <div className="parchment-surface" style={{ width: '100%', minHeight: '100%', padding: '0 20px 28px' }}>
      <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="t-mono" style={{ fontSize: 13 }}>14:22</span>
        <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-70)' }}>· · ·</span>
      </div>
      <div style={{ marginBottom: 16 }}>
        <span className="t-display" style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--ink-70)' }}>← BACK</span>
      </div>
      <AgentCore size="mobile" />
    </div>
  );
}

function ScreenAgentDesktop() {
  return (
    <div className="parchment-surface" style={{ width: '100%', minHeight: '100%', padding: '32px 56px 56px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <FleurDeLis size={22} />
        <span className="t-display" style={{ fontSize: 14, letterSpacing: '0.4em' }}>PRAGA</span>
        <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-70)', marginLeft: 16 }}>/ familiar / agent.kilian.praga.eth</span>
      </div>
      <div className="hr-double" style={{ marginBottom: 32 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 56 }}>
        <div>
          <AgentCore size="desktop" />
        </div>
        <aside>
          <div className="t-italic" style={{ fontSize: 13, color: 'var(--ink-70)', lineHeight: 1.55 }}>"A familiar in the old sense — a small, scoped intelligence pinned to your name. It is not you, and it knows that."</div>
          <div style={{ marginTop: 28 }}>
            <Marginalia kind="astrolog" size={170} />
          </div>
          <div style={{ marginTop: 28 }}>
            <Marginalia kind="fleurSketch" size={170} />
          </div>
        </aside>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenAgentMobile, ScreenAgentDesktop, FamiliarOwl });
