// Screen 12 — Empty / error / loading vignettes

function VignetteFrame({ children, viewport }) {
  return (
    <div className="parchment-surface" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: viewport === 'mobile' ? 24 : 56 }}>
      <div style={{ textAlign: 'center', maxWidth: viewport === 'mobile' ? '100%' : 520 }}>{children}</div>
    </div>
  );
}

function ScreenStateEmpty({ viewport = 'mobile' }) {
  return (
    <VignetteFrame viewport={viewport}>
      <FleurDeLis size={36} style={{ margin: '0 auto' }} />
      <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.4em', color: 'var(--vermilion)', marginTop: 18 }}>THE TOWN SQUARE · TODAY</div>
      <div className="t-display" style={{ fontSize: viewport === 'mobile' ? 26 : 36, letterSpacing: '0.04em', lineHeight: 1.1, marginTop: 12 }}>No offers in your part of Prague yet</div>
      <div className="t-italic" style={{ fontSize: viewport === 'mobile' ? 16 : 18, color: 'var(--ink-70)', marginTop: 14, lineHeight: 1.5 }}>Be the first. The square fills as the day fills.</div>
      <div className="hr-gilded" style={{ width: 80, margin: '24px auto' }} />
      <button style={{ padding: '14px 24px', background: 'var(--ink)', color: 'var(--parchment)', border: 'none', fontFamily: 'var(--display)', fontSize: 12, letterSpacing: '0.3em', cursor: 'pointer' }}>POST THE FIRST NOTICE</button>
      <div style={{ marginTop: 24 }}>
        <Marginalia kind="constellation" size={120} style={{ margin: '0 auto', opacity: 0.5 }} />
      </div>
    </VignetteFrame>
  );
}

function ScreenStateError({ viewport = 'mobile' }) {
  return (
    <VignetteFrame viewport={viewport}>
      <WaxSeal size={viewport === 'mobile' ? 110 : 150} state="broken" rotate={-7} emboss="none" style={{ margin: '0 auto' }} />
      <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.4em', color: 'var(--vermilion)', marginTop: 22 }}>THE SEAL DID NOT SET</div>
      <div className="t-display" style={{ fontSize: viewport === 'mobile' ? 24 : 32, letterSpacing: '0.04em', lineHeight: 1.15, marginTop: 10 }}>Pečeť se nezatvrdila</div>
      <div className="t-italic" style={{ fontSize: viewport === 'mobile' ? 15 : 17, color: 'var(--ink)', marginTop: 14, lineHeight: 1.55 }}>The funds did not move. Nothing was lost. The line to Prague was busy for a moment.</div>
      <div className="t-italic" style={{ fontSize: viewport === 'mobile' ? 14 : 15, color: 'var(--ink-70)', marginTop: 8, lineHeight: 1.55 }}>Prostředky nebyly převedeny. Nic se neztratilo. Linka do Prahy byla na okamžik plná.</div>
      <div className="hr-gilded" style={{ width: 80, margin: '20px auto' }} />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button style={{ padding: '12px 20px', background: 'var(--ink)', color: 'var(--parchment)', border: 'none', fontFamily: 'var(--display)', fontSize: 11, letterSpacing: '0.3em', cursor: 'pointer' }}>TRY THE SEAL AGAIN</button>
        <button style={{ padding: '12px 20px', background: 'transparent', color: 'var(--ink)', border: '0.5px solid var(--gilded)', fontFamily: 'var(--display)', fontSize: 11, letterSpacing: '0.3em', cursor: 'pointer' }}>RETURN</button>
      </div>
    </VignetteFrame>
  );
}

function DrawingFleur({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke="var(--gilded)" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
      <style>{`
        @keyframes drawpath { from { stroke-dashoffset: var(--len); } to { stroke-dashoffset: 0; } }
        .lf-p { stroke-dasharray: var(--len); stroke-dashoffset: var(--len); animation: drawpath 2.4s linear infinite; }
      `}</style>
      <path className="lf-p" style={{ '--len': '70px' }} d="M50 14 C 50 30, 50 56, 50 72" />
      <path className="lf-p" style={{ '--len': '40px', animationDelay: '0.2s' }} d="M50 14 C 46 18, 46 22, 50 24 C 54 22, 54 18, 50 14 Z" />
      <path className="lf-p" style={{ '--len': '90px', animationDelay: '0.4s' }} d="M50 36 C 36 36, 24 44, 22 60 C 20 70, 28 74, 36 70 C 42 66, 46 56, 50 50" />
      <path className="lf-p" style={{ '--len': '90px', animationDelay: '0.4s' }} d="M50 36 C 64 36, 76 44, 78 60 C 80 70, 72 74, 64 70 C 58 66, 54 56, 50 50" />
      <path className="lf-p" style={{ '--len': '60px', animationDelay: '0.8s' }} d="M28 56 C 38 54, 62 54, 72 56" />
      <path className="lf-p" style={{ '--len': '50px', animationDelay: '1s' }} d="M32 72 C 40 78, 60 78, 68 72" />
      <path className="lf-p" style={{ '--len': '40px', animationDelay: '1.2s' }} d="M36 76 L 64 76" />
    </svg>
  );
}

function ScreenStateLoading({ viewport = 'mobile' }) {
  return (
    <VignetteFrame viewport={viewport}>
      <DrawingFleur size={viewport === 'mobile' ? 100 : 140} />
      <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.4em', color: 'var(--vermilion)', marginTop: 24 }}>SETTING THE SEAL</div>
      <div className="t-italic" style={{ fontSize: viewport === 'mobile' ? 16 : 19, color: 'var(--ink)', marginTop: 12, lineHeight: 1.55 }}>The wax is warming. The fleur is being drawn.</div>
      <div className="t-italic" style={{ fontSize: viewport === 'mobile' ? 13 : 14, color: 'var(--ink-70)', marginTop: 6 }}>this should take only a breath</div>
    </VignetteFrame>
  );
}

Object.assign(window, { ScreenStateEmpty, ScreenStateError, ScreenStateLoading });
