// Screen 1 — Landing / onboarding — Claim your name in Prague

function PragueSilhouette({ width = 1440, opacity = 0.18 }) {
  // Faint engraved Prague skyline — Charles Bridge silhouette and castle spires
  // as parchment marginalia, line-art only.
  return (
    <svg viewBox="0 0 1440 220" preserveAspectRatio="xMidYMax meet" style={{ width: '100%', height: 'auto', display: 'block', opacity }}>
      <g fill="none" stroke="var(--ink)" strokeWidth="0.8" strokeLinecap="round">
        {/* river — long undulating line */}
        <path d="M 0 200 C 200 196, 380 198, 540 200 C 700 202, 860 198, 1040 200 C 1220 202, 1340 198, 1440 200" />
        <path d="M 0 206 C 220 210, 480 206, 720 208 C 960 210, 1200 206, 1440 208" opacity="0.6" />
        {/* castle complex on the left third */}
        <path d="M 80 130 L 120 110 L 160 110 L 160 90 L 200 90 L 200 110 L 240 110 L 240 90 L 280 90 L 280 110 L 320 110 L 360 130 L 360 200 L 80 200 Z" />
        <line x1="180" y1="84" x2="180" y2="90" />
        <line x1="220" y1="80" x2="220" y2="90" />
        <line x1="260" y1="84" x2="260" y2="90" />
        {/* st vitus spires */}
        <path d="M 220 90 L 220 60 L 215 56 L 220 52 L 225 56 L 220 60" />
        <path d="M 240 90 L 240 50 L 234 44 L 240 38 L 246 44 L 240 50" />
        <path d="M 260 90 L 260 64 L 256 60 L 260 56 L 264 60 L 260 64" />
        {/* charles bridge — arches */}
        <path d="M 420 200 L 420 170 L 470 170 L 470 200 M 470 200 L 470 170 L 540 170 L 540 200 M 540 200 L 540 170 L 610 170 L 610 200 M 610 200 L 610 170 L 680 170 L 680 200 M 680 200 L 680 170 L 750 170 L 750 200 M 750 200 L 750 170 L 820 170 L 820 200 M 820 200 L 820 170 L 880 170 L 880 200" />
        <path d="M 420 170 C 444 158, 470 158, 470 170 M 470 170 C 504 158, 540 158, 540 170 M 540 170 C 574 158, 610 158, 610 170 M 610 170 C 644 158, 680 158, 680 170 M 680 170 C 714 158, 750 158, 750 170 M 750 170 C 784 158, 820 158, 820 170 M 820 170 C 850 158, 880 158, 880 170" />
        {/* bridge towers */}
        <path d="M 380 200 L 380 130 L 392 130 L 392 122 L 408 122 L 408 130 L 420 130 L 420 200 Z" />
        <path d="M 396 122 L 396 110 L 404 110 L 404 122" />
        <path d="M 880 200 L 880 130 L 892 130 L 892 122 L 908 122 L 908 130 L 920 130 L 920 200 Z" />
        <path d="M 896 122 L 896 110 L 904 110 L 904 122" />
        {/* old town towers / týn */}
        <path d="M 1000 200 L 1000 140 L 1040 140 L 1040 200" />
        <path d="M 1010 140 L 1010 110 L 1015 105 L 1010 100 L 1020 95 L 1030 100 L 1025 105 L 1030 110 L 1030 140" />
        <path d="M 1080 200 L 1080 130 L 1110 130 L 1110 200" />
        <path d="M 1085 130 L 1085 100 L 1090 96 L 1085 92 L 1095 88 L 1105 92 L 1100 96 L 1105 100 L 1105 130" />
        {/* astronomical-clock-ish tower (abstracted, not a recognizable detail) */}
        <path d="M 1180 200 L 1180 110 L 1220 110 L 1220 200 Z" />
        <path d="M 1188 110 L 1188 90 L 1212 90 L 1212 110" />
        <circle cx="1200" cy="150" r="10" />
        <line x1="1200" y1="150" x2="1200" y2="142" />
        <line x1="1200" y1="150" x2="1206" y2="153" />
        {/* small distant spires right */}
        <path d="M 1290 200 L 1290 160 L 1310 160 L 1310 200 M 1300 160 L 1300 140 L 1305 134 L 1300 130 L 1310 126 L 1320 130 L 1315 134 L 1320 140 L 1320 160 L 1340 160 L 1340 200" />
        {/* a few birds */}
        <path d="M 320 60 C 326 56, 332 56, 338 60" opacity="0.7" />
        <path d="M 380 80 C 386 76, 392 76, 398 80" opacity="0.7" />
        <path d="M 460 50 C 466 46, 472 46, 478 50" opacity="0.7" />
      </g>
    </svg>
  );
}

function ENSInscription({ value, size = 'lg' }) {
  const fontSize = size === 'lg' ? 56 : size === 'md' ? 36 : 26;
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'center',
      fontFamily: 'var(--mono)', fontSize, color: 'var(--ink)',
      letterSpacing: '-0.01em', fontWeight: 400,
    }}>
      <span style={{ borderBottom: '0.5px solid var(--gilded)', minWidth: 200, textAlign: 'right', paddingRight: 6, paddingBottom: 4, color: value ? 'var(--ink)' : 'var(--ink-30)' }}>{value || 'kilian'}</span>
      <span style={{ color: 'var(--ink-50)' }}>.praga.eth</span>
    </div>
  );
}

function ScreenOnboardingMobile() {
  return (
    <div className="parchment-surface" style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* status bar */}
      <div style={{ height: 44, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="t-mono" style={{ fontSize: 13 }}>14:22</span>
        <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-70)' }}>· · ·</span>
      </div>
      {/* content */}
      <div style={{ flex: 1, padding: '24px 32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ marginBottom: 8 }}><FleurDeLis size={40} /></div>
        <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.4em', color: 'var(--vermilion)', marginBottom: 4 }}>Praga</div>
        <div className="t-italic" style={{ fontSize: 13, color: 'var(--ink-70)' }}>est. anno mmxxvi · Praga</div>
        <div className="hr-double" style={{ width: 48, marginTop: 16, marginBottom: 28 }} />

        <div className="t-display" style={{ fontSize: 30, letterSpacing: '0.05em', lineHeight: 1.05, marginBottom: 14 }}>Claim your<br />name in Prague</div>
        <div className="t-italic" style={{ fontSize: 16, color: 'var(--ink-70)', lineHeight: 1.5, maxWidth: 280, marginBottom: 28 }}>The name is the seal. The seal is the person. Reputation will be yours, not ours.</div>

        <div style={{ marginBottom: 18 }}><ENSInscription value="kilian" size="md" /></div>
        <div className="t-mono" style={{ fontSize: 11, color: 'var(--verdigris)', letterSpacing: '0.06em', marginBottom: 28 }}>✓ available</div>

        <div style={{ width: '100%', maxWidth: 320 }}>
          <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.25em', color: 'var(--ink-70)', textAlign: 'left', marginBottom: 8 }}>or sign in</div>
          <input placeholder="you@somewhere.cz" style={{ width: '100%', padding: '14px 16px', background: 'var(--bone)', border: '0.5px solid var(--gilded)', fontFamily: 'var(--body)', fontSize: 16, color: 'var(--ink)', outline: 'none' }} />
          <button style={{ width: '100%', padding: '16px', marginTop: 12, background: 'var(--ink)', color: 'var(--parchment)', border: 'none', fontFamily: 'var(--display)', fontSize: 13, letterSpacing: '0.3em', cursor: 'pointer' }}>SEAL THE NAME</button>
          <div className="t-italic" style={{ fontSize: 12, color: 'var(--ink-70)', marginTop: 14, lineHeight: 1.5 }}>The fee for the first year is on us. Your account is created when you press the seal.</div>
        </div>
      </div>
      {/* skyline */}
      <div style={{ marginTop: 'auto' }}>
        <PragueSilhouette width={390} opacity={0.22} />
      </div>
    </div>
  );
}

function ScreenOnboardingDesktop() {
  return (
    <div className="parchment-surface" style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* top bar */}
      <div style={{ padding: '24px 56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FleurDeLis size={26} />
          <span className="t-display" style={{ fontSize: 14, letterSpacing: '0.4em' }}>PRAGA</span>
        </div>
        <div style={{ display: 'flex', gap: 36 }}>
          {['Manifesto', 'A guide for craftsmen', 'Sign in'].map(x => (
            <span key={x} className="t-italic" style={{ fontSize: 15, color: 'var(--ink-70)', cursor: 'pointer' }}>{x}</span>
          ))}
        </div>
      </div>
      <div className="hr-gilded" style={{ margin: '0 56px' }} />

      {/* hero */}
      <div style={{ flex: 1, padding: '48px 56px 0', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 80, alignItems: 'center' }}>
        <div>
          <div className="t-display" style={{ fontSize: 12, letterSpacing: '0.4em', color: 'var(--vermilion)', marginBottom: 12 }}>The town square · est. mmxxvi</div>
          <div className="t-display" style={{ fontSize: 84, letterSpacing: '0.04em', lineHeight: 0.98 }}>Claim your<br /><span style={{ fontStyle: 'italic', fontFamily: 'var(--body)', fontWeight: 500, textTransform: 'none', letterSpacing: '0.01em' }}>name </span>in Prague</div>
          <div className="t-italic" style={{ fontSize: 20, color: 'var(--ink-70)', marginTop: 20, lineHeight: 1.5, maxWidth: 520 }}>One name does the work of an account, a profile, a website and a sealed letterbox. The reputation you build with it is yours — it follows the human, not the platform.</div>
          <div style={{ marginTop: 36, display: 'flex', gap: 20, alignItems: 'center' }}>
            <FleurDeLis size={20} />
            <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-70)', letterSpacing: '0.1em' }}>NON-CUSTODIAL · END-TO-END SEALED · KČ FIRST</span>
          </div>
        </div>

        <Cartouche style={{ background: 'var(--bone)' }} padding={48}>
          <div className="t-display" style={{ fontSize: 12, letterSpacing: '0.3em', color: 'var(--vermilion)', textAlign: 'center', marginBottom: 18 }}>Inscription</div>
          <ENSInscription value="kilian" size="lg" />
          <div className="t-mono" style={{ fontSize: 12, color: 'var(--verdigris)', letterSpacing: '0.06em', textAlign: 'center', marginTop: 14 }}>✓ available · 1st year on us</div>
          <div className="hr-gilded" style={{ margin: '32px 0' }} />
          <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.25em', color: 'var(--ink-70)', marginBottom: 8 }}>SIGN IN</div>
          <input placeholder="you@somewhere.cz" style={{ width: '100%', padding: '16px 18px', background: 'var(--parchment)', border: '0.5px solid var(--gilded)', fontFamily: 'var(--body)', fontSize: 17, color: 'var(--ink)', outline: 'none' }} />
          <button style={{ width: '100%', padding: '18px', marginTop: 14, background: 'var(--ink)', color: 'var(--parchment)', border: 'none', fontFamily: 'var(--display)', fontSize: 14, letterSpacing: '0.3em', cursor: 'pointer' }}>SEAL THE NAME</button>
          <div className="t-italic" style={{ fontSize: 13, color: 'var(--ink-70)', marginTop: 16, textAlign: 'center', lineHeight: 1.5 }}>Your account opens when you press the seal. No further setup. No words you'd need to look up.</div>
        </Cartouche>
      </div>

      {/* skyline */}
      <div style={{ marginTop: 24 }}>
        <PragueSilhouette width={1440} opacity={0.2} />
      </div>
    </div>
  );
}

Object.assign(window, { ScreenOnboardingMobile, ScreenOnboardingDesktop, PragueSilhouette, ENSInscription });
