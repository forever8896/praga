// Screen 5 — Private message thread + Magnum Opus escrow panel

const THREAD_MESSAGES = [
  { from: 'lucia', mine: false, text: "Hello Kilian — my Favorit's bottom bracket is creaking. Saturday morning, by any chance?" },
  { from: 'kilian', mine: true, text: "Saturday is open. Bring it before noon. 350 Kč as posted." },
  { from: 'lucia', mine: false, text: "Wonderful. Funding the seal now." },
  { from: 'kilian', mine: true, text: "Received. I will start when the bell at the church strikes ten." },
];

function MagnumOpusDiagram({ state = 'nigredo', size = 'desktop' }) {
  const phases = [
    { state: 'nigredo', label: 'Funded', phase: 'Nigredo', emboss: 'crescent' },
    { state: 'albedo', label: 'In progress', phase: 'Albedo', emboss: 'crescent' },
    { state: 'citrinitas', label: 'Delivered', phase: 'Citrinitas', emboss: 'sun' },
    { state: 'rubedo', label: 'Released', phase: 'Rubedo', emboss: 'fleur' },
  ];
  const currentIdx = phases.findIndex(p => p.state === state);
  const isMobile = size === 'mobile';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 18 }}>
      {/* current state — large seal */}
      <div style={{ textAlign: 'center', padding: isMobile ? '14px 0 8px' : '20px 0 12px' }}>
        <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.35em', color: 'var(--vermilion)', marginBottom: 6 }}>The Magnum Opus</div>
        <div className="t-display" style={{ fontSize: isMobile ? 22 : 30, letterSpacing: '0.05em' }}>{phases[currentIdx].label}</div>
        <div className="t-italic" style={{ fontSize: isMobile ? 12 : 14, color: 'var(--ink-70)', marginTop: 4 }}>{phases[currentIdx].phase} · {currentIdx + 1} of 4</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <WaxSeal size={isMobile ? 110 : 160} state={state} rotate={[-8, -3, 5, -7][currentIdx]} emboss={phases[currentIdx].emboss} label={`${phases[currentIdx].label.toUpperCase()} · PRAGA ·`} />
      </div>

      {/* the 4-stage diagram (always visible — this IS the panel) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: isMobile ? 4 : 8, padding: isMobile ? '14px 8px' : '20px 12px', background: 'var(--bone)', border: '0.5px solid var(--gilded)', position: 'relative' }}>
        {/* connecting line */}
        <svg style={{ position: 'absolute', top: '38%', left: '8%', right: '8%', height: 1, width: '84%', pointerEvents: 'none' }} preserveAspectRatio="none" viewBox="0 0 100 1">
          <line x1="0" y1="0.5" x2="100" y2="0.5" stroke="var(--gilded)" strokeWidth="0.4" strokeDasharray="2 2" />
        </svg>
        {phases.map((p, i) => {
          const reached = i <= currentIdx;
          const active = i === currentIdx;
          return (
            <div key={p.state} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <WaxSeal size={isMobile ? 32 : 44} state={reached ? p.state : 'nigredo'} rotate={[-6, -2, 4, -5][i]} emboss={reached ? p.emboss : 'none'} style={{ opacity: reached ? 1 : 0.25 }} />
              <div className="t-display" style={{ fontSize: isMobile ? 9 : 10, letterSpacing: '0.18em', color: active ? 'var(--vermilion)' : 'var(--ink-70)', marginTop: isMobile ? 6 : 10, fontWeight: active ? 600 : 400 }}>{p.label.toUpperCase()}</div>
              <div className="t-italic" style={{ fontSize: isMobile ? 10 : 11, color: 'var(--ink-50)', marginTop: 2 }}>{p.phase}</div>
            </div>
          );
        })}
      </div>

      {/* receipt block */}
      <div style={{ padding: isMobile ? 12 : 16, background: 'var(--parchment)', border: '0.5px solid var(--gilded)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span className="t-display" style={{ fontSize: 10, letterSpacing: '0.3em', color: 'var(--ink-70)' }}>FOR THE WORK</span>
          <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-70)' }}>· #f0a3 ·</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="t-display" style={{ fontSize: isMobile ? 30 : 38, letterSpacing: '0.02em' }}>350</span>
          <span className="t-display" style={{ fontSize: 16, letterSpacing: '0.1em', color: 'var(--ink-70)' }}>Kč</span>
          <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-70)', marginLeft: 'auto' }}>≈ 12 USDC · sealed</span>
        </div>
        <div className="hr-gilded" style={{ margin: '10px 0' }} />
        <div className="t-italic" style={{ fontSize: isMobile ? 13 : 14, lineHeight: 1.5, color: 'var(--ink)' }}>
          {state === 'nigredo' && 'Lucia has funded the seal. The work has not yet begun.'}
          {state === 'albedo' && 'Kilian has begun the work. The seal whitens. Lucia will be told when the work is delivered.'}
          {state === 'citrinitas' && 'Kilian has delivered the work. Lucia has 24 hours to release the seal — or speak.'}
          {state === 'rubedo' && 'The seal is released. The work is complete. The receipt is in both ledgers.'}
        </div>
      </div>

      {/* action */}
      {state === 'nigredo' && (
        <button style={{ padding: isMobile ? 14 : 16, background: 'var(--ink)', color: 'var(--parchment)', border: 'none', fontFamily: 'var(--display)', fontSize: 12, letterSpacing: '0.3em', cursor: 'pointer' }}>BEGIN THE WORK</button>
      )}
      {state === 'albedo' && (
        <button style={{ padding: isMobile ? 14 : 16, background: 'var(--gilded)', color: 'var(--ink)', border: 'none', fontFamily: 'var(--display)', fontSize: 12, letterSpacing: '0.3em', cursor: 'pointer' }}>MARK AS DELIVERED</button>
      )}
      {state === 'citrinitas' && (
        <button style={{ padding: isMobile ? 14 : 16, background: 'var(--vermilion)', color: 'var(--parchment)', border: 'none', fontFamily: 'var(--display)', fontSize: 12, letterSpacing: '0.3em', cursor: 'pointer' }}>RELEASE THE SEAL</button>
      )}
      {state === 'rubedo' && (
        <button style={{ padding: isMobile ? 14 : 16, background: 'transparent', color: 'var(--ink-70)', border: '0.5px solid var(--gilded)', fontFamily: 'var(--display)', fontSize: 12, letterSpacing: '0.3em', cursor: 'pointer' }}>SEE THE RECEIPT</button>
      )}
      <div className="t-italic" style={{ fontSize: 12, color: 'var(--ink-70)', textAlign: 'center', marginTop: -4 }}>fee is sponsored · the seal is non-custodial</div>
    </div>
  );
}

function ThreadColumn({ size = 'mobile' }) {
  const isMobile = size === 'mobile';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* thread header */}
      <div style={{ padding: isMobile ? '12px 20px' : '20px 28px', borderBottom: '0.5px solid var(--gilded)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <PortraitBadge name="lucia" size={isMobile ? 36 : 48} />
        <div style={{ flex: 1 }}>
          <div className="t-display" style={{ fontSize: isMobile ? 16 : 22, letterSpacing: '0.05em' }}>Lucia Bárová</div>
          <div className="t-mono" style={{ fontSize: 11, color: 'var(--ink-70)' }}>lucia.praga.eth</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--gilded)" strokeWidth="1">
            <rect x="3" y="6" width="8" height="6" />
            <path d="M 4.5 6 L 4.5 4 C 4.5 2.5, 5.5 1.5, 7 1.5 C 8.5 1.5, 9.5 2.5, 9.5 4 L 9.5 6" />
          </svg>
          <FleurDeLis size={12} />
          <span className="t-display" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'var(--vermilion)' }}>SEALED THREAD</span>
        </div>
      </div>

      {/* messages */}
      <div style={{ flex: 1, padding: isMobile ? '20px' : '28px', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
        <div className="t-italic" style={{ fontSize: 12, color: 'var(--ink-70)', textAlign: 'center', padding: '4px 0' }}>— Wednesday 6 May, opened by Lucia —</div>
        {THREAD_MESSAGES.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.mine ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '78%' }}>
              <div className="t-mono" style={{ fontSize: 10, color: 'var(--ink-70)', marginBottom: 4, textAlign: m.mine ? 'right' : 'left' }}>{m.from}.praga.eth</div>
              <div className="t-body" style={{ fontSize: isMobile ? 16 : 17, lineHeight: 1.4, padding: '10px 14px', background: m.mine ? 'var(--ink)' : 'var(--bone)', color: m.mine ? 'var(--parchment)' : 'var(--ink)', border: m.mine ? 'none' : '0.5px solid var(--gilded)' }}>{m.text}</div>
            </div>
          </div>
        ))}
      </div>

      {/* compose */}
      <div style={{ padding: isMobile ? '12px 20px 20px' : '20px 28px', borderTop: '0.5px solid var(--gilded)', display: 'flex', gap: 10, alignItems: 'center' }}>
        <input placeholder="write…" style={{ flex: 1, padding: '12px 16px', background: 'var(--bone)', border: '0.5px solid var(--gilded)', fontFamily: 'var(--body)', fontStyle: 'italic', fontSize: 15, outline: 'none' }} />
        <button style={{ padding: '12px 18px', background: 'var(--ink)', color: 'var(--parchment)', border: 'none', fontFamily: 'var(--display)', fontSize: 11, letterSpacing: '0.25em', cursor: 'pointer' }}>SEND</button>
      </div>
    </div>
  );
}

function PortraitBadge({ name, size = 36 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--bone)', border: '0.5px solid var(--gilded)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span className="t-display" style={{ fontSize: size * 0.35, letterSpacing: '0.02em', color: 'var(--ink)' }}>{name[0].toUpperCase()}</span>
    </div>
  );
}

function ScreenThreadMobile({ state = 'nigredo' }) {
  const sheetTitle = {
    nigredo: 'Tap to open the seal',
    albedo: 'The work is in progress',
    citrinitas: 'Released soon',
    rubedo: 'The seal is released',
  }[state];
  return (
    <div className="parchment-surface" style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 44, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="t-mono" style={{ fontSize: 13 }}>14:22</span>
        <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-70)' }}>· · ·</span>
      </div>
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <ThreadColumn size="mobile" />
        </div>
        {/* swipe-up sheet */}
        <div style={{ background: 'var(--parchment)', borderTop: '0.5px solid var(--gilded)', boxShadow: '0 -8px 24px rgba(15,14,12,0.06)', padding: '8px 20px 20px' }}>
          <div style={{ width: 40, height: 3, background: 'var(--ink-30)', margin: '4px auto 12px', borderRadius: 2 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <WaxSeal size={36} state={state} rotate={-6} emboss={state === 'rubedo' ? 'fleur' : state === 'citrinitas' ? 'sun' : 'crescent'} />
            <div style={{ flex: 1 }}>
              <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--vermilion)' }}>THE SEAL</div>
              <div className="t-italic" style={{ fontSize: 13, color: 'var(--ink-70)' }}>{sheetTitle}</div>
            </div>
            <span className="t-display" style={{ fontSize: 18, color: 'var(--ink-70)' }}>↑</span>
          </div>
          <MagnumOpusDiagram state={state} size="mobile" />
        </div>
      </div>
    </div>
  );
}

function ScreenThreadDesktop({ state = 'nigredo' }) {
  return (
    <div className="parchment-surface" style={{ width: '100%', minHeight: '100%' }}>
      <div style={{ padding: '20px 56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--gilded)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FleurDeLis size={22} />
          <span className="t-display" style={{ fontSize: 14, letterSpacing: '0.4em' }}>PRAGA</span>
          <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-70)', marginLeft: 16 }}>/ thread / lucia.praga.eth</span>
        </div>
        <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink)' }}>kilian.praga.eth</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 460px', minHeight: 'calc(100% - 60px)' }}>
        <div style={{ borderRight: '0.5px solid var(--gilded)', display: 'flex', flexDirection: 'column' }}>
          <ThreadColumn size="desktop" />
        </div>
        {/* permanent escrow cartouche */}
        <aside style={{ padding: 28, position: 'relative' }}>
          <Cartouche style={{ background: 'var(--bone)' }} padding={24}>
            <MagnumOpusDiagram state={state} size="desktop" />
          </Cartouche>
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Marginalia kind="alembicDiagram" size={120} style={{ margin: '0 auto' }} />
            <div className="t-italic" style={{ fontSize: 12, color: 'var(--ink-70)', marginTop: 8, lineHeight: 1.5, maxWidth: 340, margin: '8px auto 0' }}>The four phases of the Great Work — black, white, yellow, red — describe the change of substance. Here, the same four phases describe the change of trust.</div>
          </div>
        </aside>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenThreadMobile, ScreenThreadDesktop, MagnumOpusDiagram, ThreadColumn, PortraitBadge });
