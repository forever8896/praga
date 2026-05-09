// Screen 9 — Stealth gift / private payment compose (web only)

function ScreenStealthDesktop() {
  return (
    <div style={{ width: '100%', minHeight: '100%', position: 'relative', background: '#1a1814' }}>
      {/* dim under-page (suggested profile beneath) */}
      <div className="parchment-surface" style={{ width: '100%', minHeight: '100%', padding: '32px 56px', filter: 'blur(2px) brightness(0.85)', opacity: 0.55 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <FleurDeLis size={28} />
          <div className="t-display" style={{ fontSize: 56, letterSpacing: '0.04em', marginTop: 8 }}>Kilian Praga</div>
          <div className="t-mono" style={{ fontSize: 14, color: 'var(--ink-70)', marginTop: 4 }}>kilian.praga.eth</div>
          <div className="hr-double" style={{ width: 120, margin: '14px auto' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <PortraitRoundel size={180} />
        </div>
      </div>

      {/* modal */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,14,12,0.55)' }}>
        <div className="parchment-surface" style={{ width: 540, position: 'relative', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
          <Cartouche padding={48}>
            <div style={{ position: 'absolute', top: 18, right: 18 }}>
              <span className="t-display" style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--ink-70)', cursor: 'pointer' }}>CLOSE ✕</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <FleurDeLis size={28} style={{ margin: '0 auto' }} />
              <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.4em', color: 'var(--vermilion)', marginTop: 12 }}>A PRIVATE GIFT</div>
              <div className="t-display" style={{ fontSize: 36, letterSpacing: '0.04em', marginTop: 8, lineHeight: 1.05 }}>Send a gift to<br /><span className="t-mono" style={{ textTransform: 'none', letterSpacing: '-0.01em', fontWeight: 400 }}>kilian.praga.eth</span></div>
              <div className="t-italic" style={{ fontSize: 14, color: 'var(--ink-70)', marginTop: 4 }}>— privately —</div>
            </div>

            <div className="hr-gilded" style={{ margin: '24px 0' }} />

            {/* amount */}
            <div className="t-mono" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--ink-70)', marginBottom: 8 }}>AMOUNT —</div>
            <div style={{ display: 'flex', alignItems: 'baseline', padding: '14px 18px', background: 'var(--bone)', border: '0.5px solid var(--gilded)' }}>
              <span className="t-display" style={{ fontSize: 48, letterSpacing: '0.02em', flex: 1 }}>200</span>
              <span className="t-display" style={{ fontSize: 22, letterSpacing: '0.1em', color: 'var(--ink-70)' }}>Kč</span>
            </div>
            <div className="t-mono" style={{ fontSize: 11, color: 'var(--ink-70)', marginTop: 4, textAlign: 'right' }}>≈ 7 USDC</div>

            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              {[100, 200, 500, 1000].map(v => (
                <span key={v} style={{ flex: 1, textAlign: 'center', padding: '8px 0', border: '0.5px solid var(--gilded)', fontFamily: 'var(--display)', fontSize: 11, letterSpacing: '0.2em', cursor: 'pointer', background: v === 200 ? 'var(--ink)' : 'transparent', color: v === 200 ? 'var(--parchment)' : 'var(--ink)' }}>{v} Kč</span>
              ))}
            </div>

            <div className="t-mono" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--ink-70)', marginTop: 20, marginBottom: 8 }}>A NOTE — OPTIONAL</div>
            <div style={{ padding: '12px 14px', background: 'var(--bone)', border: '0.5px solid var(--gilded)' }}>
              <div className="t-italic" style={{ fontSize: 15, color: 'var(--ink)' }}>For the radio you brought back. — A.</div>
            </div>

            <button style={{ width: '100%', marginTop: 24, padding: 18, background: 'var(--vermilion)', color: 'var(--parchment)', border: 'none', fontFamily: 'var(--display)', fontSize: 14, letterSpacing: '0.35em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
              <WaxSeal size={26} state="rubedo" rotate={-8} emboss="fleur" />
              PRESS THE SEAL · SEND
            </button>

            <div className="t-italic" style={{ fontSize: 13, color: 'var(--ink-70)', textAlign: 'center', marginTop: 18, lineHeight: 1.55, padding: '0 12px' }}>
              Your gift will reach Kilian without revealing the address it lands at. This is by design. His ledger will simply say
              <span className="t-mono" style={{ fontSize: 12, fontStyle: 'normal', color: 'var(--ink)' }}> "200 Kč received."</span>
            </div>
          </Cartouche>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenStealthDesktop });
