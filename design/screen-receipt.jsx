// Screen 6 — Reputation receipt / completed task — a formal patent

function ReceiptBody({ size = 'desktop' }) {
  const isMobile = size === 'mobile';
  return (
    <div style={{ position: 'relative', textAlign: 'center', padding: isMobile ? '28px 24px' : '64px 80px' }}>
      <div style={{ position: 'absolute', top: isMobile ? 18 : 36, left: isMobile ? 18 : 40 }}>
        <FleurDeLis size={isMobile ? 24 : 36} />
      </div>
      <div style={{ position: 'absolute', top: isMobile ? 18 : 36, right: isMobile ? 18 : 40 }}>
        <FleurDeLis size={isMobile ? 24 : 36} />
      </div>

      <div className="t-display" style={{ fontSize: isMobile ? 11 : 14, letterSpacing: '0.45em', color: 'var(--vermilion)', marginTop: isMobile ? 12 : 20 }}>By this receipt</div>
      <div className="hr-double" style={{ width: isMobile ? 60 : 120, margin: isMobile ? '12px auto' : '20px auto' }} />

      <div className="t-cer" style={{ fontSize: isMobile ? 28 : 56, color: 'var(--ink)', lineHeight: 1, marginTop: isMobile ? 8 : 16 }}>Patent of Completion</div>

      <div className="t-italic" style={{ fontSize: isMobile ? 14 : 19, lineHeight: 1.7, marginTop: isMobile ? 18 : 28, color: 'var(--ink)', maxWidth: isMobile ? 'auto' : 720, margin: isMobile ? '18px auto 0' : '28px auto 0' }}>
        Be it known to all who pass through the square that&nbsp;
        <span className="t-display" style={{ fontSize: isMobile ? 14 : 19, letterSpacing: '0.06em' }}>Kilian Praga</span>
        <span className="t-mono" style={{ fontSize: isMobile ? 12 : 15 }}> · kilian.praga.eth</span>
        &nbsp;has, on the {isMobile ? <br /> : null}
        fourth day of May, in the year two thousand and twenty-six, completed the work of
      </div>
      <div className="t-display" style={{ fontSize: isMobile ? 18 : 30, letterSpacing: '0.04em', marginTop: isMobile ? 14 : 22, lineHeight: 1.2 }}>“Repaired a Favorit, replaced bottom bracket”</div>
      <div className="t-italic" style={{ fontSize: isMobile ? 13 : 17, color: 'var(--ink-70)', marginTop: isMobile ? 8 : 14 }}>
        for <span className="t-display" style={{ fontSize: isMobile ? 13 : 17, letterSpacing: '0.06em' }}>Lucia Bárová</span>
        <span className="t-mono" style={{ fontSize: isMobile ? 11 : 14 }}> · lucia.praga.eth</span>
      </div>

      {/* stars (sigil-stars) */}
      <div style={{ marginTop: isMobile ? 22 : 36, display: 'flex', justifyContent: 'center', gap: isMobile ? 10 : 16 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} width={isMobile ? 24 : 36} height={isMobile ? 24 : 36} viewBox="0 0 36 36">
            <g>
              <circle cx="18" cy="18" r="6.5" fill="var(--vermilion)" />
              <circle cx="18" cy="18" r="11" fill="none" stroke="var(--vermilion)" strokeWidth="1" />
              {Array.from({ length: 8 }).map((_, j) => {
                const a = (j / 8) * Math.PI * 2;
                return <line key={j} x1={18 + Math.cos(a) * 12} y1={18 + Math.sin(a) * 12} x2={18 + Math.cos(a) * 16} y2={18 + Math.sin(a) * 16} stroke="var(--vermilion)" strokeWidth="1" />;
              })}
            </g>
          </svg>
        ))}
      </div>
      <div className="t-italic" style={{ fontSize: isMobile ? 12 : 14, color: 'var(--ink-70)', marginTop: isMobile ? 6 : 12 }}>"clean work, neat to the last bolt — patient with my questions"</div>

      {/* the seal */}
      <div style={{ marginTop: isMobile ? 28 : 44, display: 'flex', justifyContent: 'center' }}>
        <WaxSeal size={isMobile ? 130 : 200} state="rubedo" rotate={-7} emboss="fleur" label="SEALED · BY KILIAN PRAGA · MMXXVI ·" />
      </div>

      {/* attestation hash as inscription */}
      <div className="hr-gilded" style={{ marginTop: isMobile ? 28 : 44, width: '70%', margin: isMobile ? '28px auto 0' : '44px auto 0' }} />
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <span className="t-display" style={{ fontSize: 10, letterSpacing: '0.35em', color: 'var(--ink-70)' }}>ATTESTATION INSCRIPTION</span>
        <span className="t-mono" style={{ fontSize: isMobile ? 10 : 12, color: 'var(--ink)', letterSpacing: '0.05em' }}>0x9af3 · 4ed1 · b21c · 7708 · sealed at 14:22 CET</span>
      </div>

      <div style={{ marginTop: isMobile ? 18 : 28, display: 'flex', justifyContent: 'center', gap: 14 }}>
        <FleurDeLis size={isMobile ? 14 : 18} />
        <span className="t-cer" style={{ fontSize: isMobile ? 13 : 18 }}>Verus Sigillum</span>
        <FleurDeLis size={isMobile ? 14 : 18} />
      </div>
    </div>
  );
}

function ScreenReceiptMobile() {
  return (
    <div className="parchment-surface" style={{ width: '100%', minHeight: '100%', padding: 16 }}>
      <Cartouche padding={0}>
        <ReceiptBody size="mobile" />
      </Cartouche>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button style={{ flex: 1, padding: '14px', background: 'var(--ink)', color: 'var(--parchment)', border: 'none', fontFamily: 'var(--display)', fontSize: 11, letterSpacing: '0.3em' }}>SHARE THE SEAL</button>
        <button style={{ flex: 1, padding: '14px', background: 'transparent', color: 'var(--ink)', border: '0.5px solid var(--gilded)', fontFamily: 'var(--display)', fontSize: 11, letterSpacing: '0.3em' }}>SAVE TO FRAME</button>
      </div>
    </div>
  );
}

function ScreenReceiptDesktop() {
  return (
    <div className="parchment-surface" style={{ width: '100%', minHeight: '100%', padding: '40px 56px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span className="t-display" style={{ fontSize: 12, letterSpacing: '0.3em', color: 'var(--ink-70)' }}>← BACK TO LEDGER</span>
        <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-70)' }}>receipt · #f0a3 · 04 may 2026</span>
        <span className="t-display" style={{ fontSize: 12, letterSpacing: '0.3em', color: 'var(--ink-70)' }}>SHARE · SAVE TO FRAME</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 180px', gap: 32, alignItems: 'flex-start' }}>
        <aside style={{ paddingTop: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
          <Marginalia kind="constellation" size={150} />
          <div className="t-italic" style={{ fontSize: 12, color: 'var(--ink-70)', textAlign: 'center', lineHeight: 1.5, maxWidth: 150 }}>frame this receipt — it follows the human</div>
        </aside>

        <div style={{ background: 'var(--bone)', position: 'relative' }}>
          <Cartouche padding={0}>
            <ReceiptBody size="desktop" />
          </Cartouche>
        </div>

        <aside style={{ paddingTop: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
          <Marginalia kind="astrolog" size={150} />
          <Marginalia kind="fleurSketch" size={150} />
        </aside>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenReceiptMobile, ScreenReceiptDesktop });
