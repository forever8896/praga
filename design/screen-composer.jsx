// Screen 4 — Offer / Request composer

function ComposerCore({ size = 'mobile' }) {
  const isMobile = size === 'mobile';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 22 : 28 }}>
      {/* type toggle */}
      <div style={{ display: 'flex', gap: 0, border: '0.5px solid var(--gilded)' }}>
        {[['OFFER', true], ['REQUEST', false], ['GIFT', false]].map(([l, a]) => (
          <span key={l} style={{ flex: 1, textAlign: 'center', padding: '12px 0', background: a ? 'var(--ink)' : 'transparent', color: a ? 'var(--parchment)' : 'var(--ink-70)', fontFamily: 'var(--display)', fontSize: 11, letterSpacing: '0.3em', cursor: 'pointer', borderRight: l !== 'GIFT' ? '0.5px solid var(--gilded)' : 'none' }}>{l}</span>
        ))}
      </div>

      {/* title-as-display */}
      <div>
        <div className="t-mono" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--ink-70)', marginBottom: 10 }}>YOU OFFER —</div>
        <div className="t-display" style={{ fontSize: isMobile ? 30 : 56, letterSpacing: '0.04em', lineHeight: 1.05, color: 'var(--ink)', borderBottom: '0.5px solid var(--gilded)', paddingBottom: 12, minHeight: isMobile ? 80 : 130 }}>
          To fix your bicycle by<br />sundown
        </div>
        <div className="t-italic" style={{ fontSize: 13, color: 'var(--ink-70)', marginTop: 8 }}>set in display caps as you type</div>
      </div>

      {/* description */}
      <div>
        <div className="t-mono" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--ink-70)', marginBottom: 8 }}>SAY MORE —</div>
        <div className="t-italic" style={{ fontSize: isMobile ? 15 : 17, color: 'var(--ink)', padding: 14, background: 'var(--bone)', border: '0.5px solid var(--gilded)', lineHeight: 1.5 }}>
          Bring it past the church on Krásova; the door is the green one with the brass bell. I work best before noon. I keep tea on.
        </div>
      </div>

      {/* category */}
      <div>
        <div className="t-mono" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--ink-70)', marginBottom: 10 }}>UNDER WHICH SIGN —</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <CategoryChip kind="forge" label="REPAIR" active />
          <CategoryChip kind="mercury" label="LANGUAGE" />
          <CategoryChip kind="sulphur" label="COOK" />
          <CategoryChip kind="caduceus" label="RIDE" />
          <CategoryChip kind="saturn" label="TUTOR" />
          <CategoryChip kind="venus" label="GIFTS" />
          <CategoryChip kind="alembic" label="ERRANDS" />
        </div>
      </div>

      {/* price */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
        <div>
          <div className="t-mono" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--ink-70)', marginBottom: 10 }}>FOR THE WORK —</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, padding: '14px 18px', background: 'var(--bone)', border: '0.5px solid var(--gilded)' }}>
            <span className="t-display" style={{ fontSize: isMobile ? 36 : 48, letterSpacing: '0.02em', color: 'var(--ink)' }}>350</span>
            <span className="t-display" style={{ fontSize: 20, letterSpacing: '0.1em', color: 'var(--ink-70)' }}>Kč</span>
            <span className="t-mono" style={{ fontSize: 13, color: 'var(--ink-70)', marginLeft: 'auto' }}>≈ 12 USDC</span>
          </div>
        </div>
        <div>
          <div className="t-mono" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--ink-70)', marginBottom: 10 }}>WHERE —</div>
          <div style={{ padding: '14px 18px', background: 'var(--bone)', border: '0.5px solid var(--gilded)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="t-body" style={{ fontSize: 16 }}>Žižkov, near Krásova</span>
            <span className="t-italic" style={{ fontSize: 13, color: 'var(--ink-70)' }}>your workshop</span>
          </div>
        </div>
      </div>

      {/* privacy toggle — open seal vs sealed letter */}
      <div>
        <div className="t-mono" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--ink-70)', marginBottom: 10 }}>HOW IT IS RECEIVED —</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ padding: 16, background: 'transparent', border: '0.5px solid var(--gilded)', textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 48 48" style={{ margin: '0 auto', display: 'block' }} fill="none" stroke="var(--ink-50)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 8 14 L 24 26 L 40 14 L 40 38 L 8 38 Z" />
              <path d="M 8 14 L 40 14" />
            </svg>
            <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.25em', marginTop: 8 }}>OPEN</div>
            <div className="t-italic" style={{ fontSize: 12, color: 'var(--ink-70)', marginTop: 4 }}>visible on the square</div>
          </div>
          <div style={{ padding: 16, background: 'var(--ink)', color: 'var(--parchment)', textAlign: 'center', position: 'relative' }}>
            <WaxSeal size={48} state="rubedo" rotate={-8} emboss="fleur" style={{ margin: '0 auto' }} />
            <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.25em', marginTop: 8, color: 'var(--gilded)' }}>SEALED</div>
            <div className="t-italic" style={{ fontSize: 12, marginTop: 4, color: 'rgba(244,236,216,0.8)' }}>only those you invite</div>
          </div>
        </div>
      </div>

      {/* submit */}
      <button style={{ padding: '18px', background: 'var(--vermilion)', color: 'var(--parchment)', border: 'none', fontFamily: 'var(--display)', fontSize: 14, letterSpacing: '0.35em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <FleurDeLis size={18} stroke="var(--parchment)" />
        STAMP & POST
        <FleurDeLis size={18} stroke="var(--parchment)" />
      </button>
      <div className="t-italic" style={{ fontSize: 13, color: 'var(--ink-70)', textAlign: 'center' }}>posting fee is sponsored by Praga · you keep 100% of the work</div>
    </div>
  );
}

function ScreenComposerMobile() {
  return (
    <div className="parchment-surface" style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 44, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="t-mono" style={{ fontSize: 13 }}>14:22</span>
        <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-70)' }}>· · ·</span>
      </div>
      <div style={{ padding: '8px 24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="t-display" style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--ink-70)' }}>← BACK</span>
          <FleurDeLis size={20} />
          <span className="t-display" style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--vermilion)' }}>CLOSE ✕</span>
        </div>
        <div className="t-display" style={{ fontSize: 22, letterSpacing: '0.05em', textAlign: 'center', marginTop: 8, marginBottom: 22 }}>A new notice</div>
        <ComposerCore size="mobile" />
      </div>
    </div>
  );
}

function ScreenComposerDesktop() {
  return (
    <div className="parchment-surface" style={{ width: '100%', minHeight: '100%', padding: '32px 56px 56px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FleurDeLis size={22} />
          <span className="t-display" style={{ fontSize: 14, letterSpacing: '0.4em' }}>PRAGA</span>
          <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-70)', marginLeft: 16 }}>/ compose</span>
        </div>
        <span className="t-display" style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--ink-70)' }}>CLOSE ✕</span>
      </div>
      <div className="hr-double" style={{ margin: '20px 0 32px' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 56 }}>
        <div>
          <div className="t-display" style={{ fontSize: 12, letterSpacing: '0.4em', color: 'var(--vermilion)' }}>A new notice for the square</div>
          <div className="t-display" style={{ fontSize: 56, letterSpacing: '0.04em', lineHeight: 1, marginTop: 6, marginBottom: 36 }}>Compose</div>
          <ComposerCore size="desktop" />
        </div>
        <aside>
          <Cartouche style={{ background: 'var(--bone)' }} padding={24}>
            <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--vermilion)', marginBottom: 8 }}>PREVIEW</div>
            <div className="t-italic" style={{ fontSize: 13, color: 'var(--ink-70)', marginBottom: 14 }}>this is how the notice appears on the square</div>
            <div style={{ background: 'var(--parchment)', padding: 14, border: '0.5px solid var(--gilded)' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <AlchemicalSigil kind="forge" size={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="t-display" style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--vermilion)' }}>OFFER</span>
                    <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-70)' }}>· kilian.praga.eth</span>
                  </div>
                  <div className="t-body" style={{ fontSize: 15, marginTop: 4 }}>To fix your bicycle by sundown</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                    <span className="t-display" style={{ fontSize: 18 }}>350 Kč</span>
                    <span className="t-italic" style={{ fontSize: 12, color: 'var(--ink-70)' }}>Žižkov · 800m</span>
                  </div>
                </div>
              </div>
            </div>
          </Cartouche>
          <div style={{ marginTop: 32 }}>
            <Marginalia kind="alembicDiagram" size={170} />
          </div>
          <div className="t-italic" style={{ fontSize: 13, color: 'var(--ink-70)', marginTop: 16, lineHeight: 1.5 }}>A good notice is short, plain, and signs itself. The alchemy is the work, not the words.</div>
        </aside>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenComposerMobile, ScreenComposerDesktop });
