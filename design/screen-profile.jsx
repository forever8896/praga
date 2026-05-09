// Screen 3 — Profile / personal site (username.praga.eth.limo)
// The hero artifact. An illuminated manuscript leaf.

const KILIAN_BIO = `Born in Karlovy Vary, transplanted to Žižkov ten winters ago. I keep a small workshop above a butcher's on Krásova where I sharpen knives, fix bicycles, and occasionally repair an old radio if it deserves it. I am told I am patient. I prefer working before noon. The wax seal below this letter is my hand on the work.`;

const KILIAN_RECEIPTS = [
  { kind: 'forge', task: 'Repaired a Favorit, replaced bottom bracket', from: 'lucia.praga.eth', date: '04 may 2026', stars: 5 },
  { kind: 'forge', task: 'Three knives sharpened, balanced', from: 'pavla.praga.eth', date: '28 apr 2026', stars: 5 },
  { kind: 'alembic', task: 'Waited at the foreign-police for the morning', from: 'milena.praga.eth', date: '22 apr 2026', stars: 4 },
  { kind: 'forge', task: 'Hung shelves, sealed bath grout', from: 'tomas.praga.eth', date: '14 apr 2026', stars: 5 },
  { kind: 'forge', task: 'Old radio brought back to life', from: 'bohuslav.praga.eth', date: '02 apr 2026', stars: 5 },
  { kind: 'forge', task: 'Fixed a kitchen leak, neat work', from: 'radek.praga.eth', date: '24 mar 2026', stars: 4 },
];

function PortraitRoundel({ size = 220 }) {
  // Engraved-portrait placeholder — striped roundel with a silhouette.
  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'inline-block' }}>
      <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="3" height="3" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="3" stroke="var(--ink)" strokeWidth="0.6" opacity="0.55" />
          </pattern>
          <clipPath id="roundel">
            <circle cx="100" cy="100" r="95" />
          </clipPath>
        </defs>
        <circle cx="100" cy="100" r="98" fill="var(--bone)" stroke="var(--gilded)" strokeWidth="0.8" />
        <circle cx="100" cy="100" r="93" fill="none" stroke="var(--gilded)" strokeWidth="0.4" opacity="0.5" />
        <g clipPath="url(#roundel)">
          <rect x="0" y="0" width="200" height="200" fill="url(#hatch)" />
          {/* head + shoulders */}
          <ellipse cx="100" cy="80" rx="38" ry="44" fill="var(--bone)" stroke="var(--ink)" strokeWidth="1" />
          <path d="M 40 200 C 40 150, 60 130, 100 130 C 140 130, 160 150, 160 200 Z" fill="var(--bone)" stroke="var(--ink)" strokeWidth="1" />
          {/* hairlines for face */}
          <path d="M 80 70 C 84 66, 90 66, 92 70" stroke="var(--ink)" strokeWidth="0.8" fill="none" />
          <path d="M 108 70 C 112 66, 118 66, 120 70" stroke="var(--ink)" strokeWidth="0.8" fill="none" />
          <path d="M 90 92 C 95 96, 105 96, 110 92" stroke="var(--ink)" strokeWidth="0.8" fill="none" />
          <path d="M 100 78 L 100 88 L 96 90" stroke="var(--ink)" strokeWidth="0.8" fill="none" />
          {/* shoulders shading */}
          <path d="M 50 200 C 60 170, 80 160, 100 160" stroke="var(--ink)" strokeWidth="0.4" fill="none" opacity="0.5" />
          <path d="M 150 200 C 140 170, 120 160, 100 160" stroke="var(--ink)" strokeWidth="0.4" fill="none" opacity="0.5" />
        </g>
      </svg>
    </div>
  );
}

function StarRating({ rating = 5, size = 14 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 16 16">
          {i < rating ? (
            // filled alchemical glyph (small sun)
            <g>
              <circle cx="8" cy="8" r="3" fill="var(--vermilion)" />
              <circle cx="8" cy="8" r="5" fill="none" stroke="var(--vermilion)" strokeWidth="0.6" />
              {Array.from({ length: 8 }).map((_, j) => {
                const a = (j / 8) * Math.PI * 2;
                return <line key={j} x1={8 + Math.cos(a) * 5.5} y1={8 + Math.sin(a) * 5.5} x2={8 + Math.cos(a) * 7} y2={8 + Math.sin(a) * 7} stroke="var(--vermilion)" strokeWidth="0.6" />;
              })}
            </g>
          ) : (
            <circle cx="8" cy="8" r="5" fill="none" stroke="var(--ink-30)" strokeWidth="0.5" />
          )}
        </svg>
      ))}
    </span>
  );
}

function ReceiptStrip({ r }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 0', borderBottom: '0.5px solid var(--gilded)' }}>
      <WaxSeal size={48} state="rubedo" rotate={(r.task.length % 12) - 6} emboss="fleur" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="t-body" style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.35 }}>{r.task}</div>
        <div className="t-italic" style={{ fontSize: 13, color: 'var(--ink-70)', marginTop: 2 }}>for <span className="t-mono" style={{ fontSize: 12, fontStyle: 'normal' }}>{r.from}</span> · {r.date}</div>
      </div>
      <StarRating rating={r.stars} />
    </div>
  );
}

function ProfileHeader({ size = 'desktop' }) {
  const display = size === 'mobile' ? 36 : 96;
  const sub = size === 'mobile' ? 12 : 16;
  return (
    <div style={{ position: 'relative', textAlign: 'center', padding: size === 'mobile' ? '24px 0 12px' : '40px 0 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: size === 'mobile' ? 14 : 32 }}>
        <FleurDeLis size={size === 'mobile' ? 22 : 36} />
        <div className="t-display" style={{ fontSize: sub, letterSpacing: '0.4em', color: 'var(--vermilion)' }}>By the hand of</div>
        <FleurDeLis size={size === 'mobile' ? 22 : 36} />
      </div>
      <div className="t-display" style={{ fontSize: display, letterSpacing: '0.04em', lineHeight: 1, marginTop: size === 'mobile' ? 6 : 14 }}>Kilian Praga</div>
      <div className="t-mono" style={{ fontSize: size === 'mobile' ? 12 : 15, color: 'var(--ink-70)', marginTop: size === 'mobile' ? 6 : 12 }}>kilian.praga.eth</div>
      <div className="hr-double" style={{ width: size === 'mobile' ? 80 : 180, margin: size === 'mobile' ? '14px auto 0' : '20px auto 0' }} />
    </div>
  );
}

function ProfileSkillsCatalogue({ compact = false }) {
  const skills = [
    { kind: 'forge', name: 'Bicycles, knives, small electrics', price: 'from 200 Kč' },
    { kind: 'forge', name: 'Hanging shelves, simple plumbing', price: 'from 350 Kč' },
    { kind: 'alembic', name: 'Standing in queues for you', price: '120 Kč / hr' },
    { kind: 'venus', name: 'Coffee on Saturday mornings', price: 'free · gift' },
  ];
  return (
    <div>
      <div className="t-display" style={{ fontSize: 12, letterSpacing: '0.3em', color: 'var(--vermilion)', marginBottom: 4 }}>The catalogue</div>
      <div className="t-display" style={{ fontSize: compact ? 22 : 32, letterSpacing: '0.04em', marginBottom: 16 }}>Skills offered</div>
      {skills.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderTop: i === 0 ? '0.5px solid var(--gilded)' : 'none', borderBottom: '0.5px solid var(--gilded)' }}>
          <AlchemicalSigil kind={s.kind} size={compact ? 36 : 44} />
          <div style={{ flex: 1 }}>
            <div className="t-body" style={{ fontSize: compact ? 15 : 17, color: 'var(--ink)' }}>{s.name}</div>
          </div>
          <div className="t-display" style={{ fontSize: compact ? 13 : 15, letterSpacing: '0.15em', color: 'var(--ink-70)' }}>{s.price}</div>
        </div>
      ))}
    </div>
  );
}

function ScreenProfileMobile() {
  return (
    <div className="parchment-surface" style={{ width: '100%', minHeight: '100%', padding: '0 24px 32px' }}>
      <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="t-mono" style={{ fontSize: 13 }}>14:22</span>
        <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-70)' }}>kilian.praga.eth.limo</span>
        <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-70)' }}>· · ·</span>
      </div>
      <Cartouche padding={20}>
        <ProfileHeader size="mobile" />
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <PortraitRoundel size={140} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <span className="t-display" style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--vermilion)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, background: 'var(--vermilion)', borderRadius: '50%' }} />
            VERIFIED HUMAN
          </span>
          <span className="t-display" style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--ink-70)' }}>· ŽIŽKOV ·</span>
        </div>
        <button style={{ marginTop: 18, padding: '12px 18px', background: 'var(--vermilion)', color: 'var(--parchment)', border: 'none', fontFamily: 'var(--display)', fontSize: 11, letterSpacing: '0.3em', display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', marginRight: 'auto', cursor: 'pointer' }}>
          <WaxSeal size={26} state="rubedo" rotate={-6} emboss="fleur" />
          SEND A PRIVATE GIFT
        </button>
      </Cartouche>

      <div style={{ marginTop: 24 }} className="dropcap">
        <div className="t-italic" style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--ink)' }}>{KILIAN_BIO}</div>
      </div>

      <div style={{ marginTop: 28 }}>
        <ProfileSkillsCatalogue compact />
      </div>

      <div style={{ marginTop: 28 }}>
        <div className="t-display" style={{ fontSize: 12, letterSpacing: '0.3em', color: 'var(--vermilion)', marginBottom: 4 }}>The wall</div>
        <div className="t-display" style={{ fontSize: 22, letterSpacing: '0.04em', marginBottom: 12 }}>Sealed receipts</div>
        {KILIAN_RECEIPTS.slice(0, 4).map((r, i) => <ReceiptStrip key={i} r={r} />)}
        <div className="t-italic" style={{ fontSize: 13, color: 'var(--ink-70)', textAlign: 'center', marginTop: 14 }}>+ 23 more sealed in the ledger</div>
      </div>

      <div style={{ marginTop: 28, padding: '20px 0', borderTop: '0.5px solid var(--gilded)', borderBottom: '0.5px solid var(--gilded)', textAlign: 'center' }}>
        <div className="t-cer" style={{ fontSize: 22, color: 'var(--ink)' }}>Verus Sigillum</div>
        <div className="t-italic" style={{ fontSize: 13, color: 'var(--ink-70)', marginTop: 6 }}>this site is sealed by Praga · the name belongs to the human</div>
        <FleurDeLis size={20} style={{ margin: '12px auto 0' }} />
      </div>
    </div>
  );
}

function ScreenProfileDesktop({ width = 1440 }) {
  const showFullMargin = width >= 1800;
  const marginCol = showFullMargin ? 280 : 200;
  return (
    <div className="parchment-surface" style={{ width: '100%', minHeight: '100%', padding: '32px 56px 56px' }}>
      {/* browser-style chrome with site URL */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-70)' }}>kilian.praga.eth.limo</span>
        <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-50)', letterSpacing: '0.15em' }}>PRAGA · A SEALED PERSONAL SITE</span>
      </div>
      <div className="hr-double" style={{ marginBottom: 24 }} />

      <div style={{ display: 'grid', gridTemplateColumns: `${marginCol}px 1fr ${marginCol}px`, gap: showFullMargin ? 56 : 36 }}>
        {/* left marginalia */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 36, alignItems: 'center', paddingTop: 80 }}>
          <Marginalia kind="astrolog" size={showFullMargin ? 200 : 150} />
          <div className="t-italic" style={{ fontSize: 12, color: 'var(--ink-70)', textAlign: 'center', maxWidth: 180, lineHeight: 1.5 }}>"Two trades fit in one pair of hands, three with patience."</div>
          <Marginalia kind="alembicDiagram" size={showFullMargin ? 200 : 150} />
          {showFullMargin && <Marginalia kind="squaredcircle" size={200} />}
          <FleurDeLis size={showFullMargin ? 36 : 28} />
        </aside>

        {/* center */}
        <div>
          <ProfileHeader size="desktop" />

          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 36, alignItems: 'flex-start', marginTop: 12 }}>
            <div>
              <PortraitRoundel size={260} />
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: -28, position: 'relative', zIndex: 1 }}>
                <WaxSeal size={70} state="rubedo" rotate={-9} emboss="fleur" label="VERIFIED HUMAN ·" />
              </div>
            </div>
            <div>
              <div className="t-italic" style={{ fontSize: 19, lineHeight: 1.6, color: 'var(--ink)' }} >
                <span style={{ fontFamily: 'var(--display)', fontSize: 88, lineHeight: 0.85, float: 'left', padding: '0.04em 0.14em 0 0', color: 'var(--vermilion)', fontWeight: 600 }}>B</span>
                {KILIAN_BIO.slice(1)}
              </div>
              <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'var(--bone)', border: '0.5px solid var(--gilded)' }}>
                <WaxSeal size={50} state="rubedo" rotate={-7} emboss="fleur" />
                <div style={{ flex: 1 }}>
                  <div className="t-display" style={{ fontSize: 12, letterSpacing: '0.3em', color: 'var(--vermilion)' }}>SEND A PRIVATE GIFT</div>
                  <div className="t-italic" style={{ fontSize: 14, color: 'var(--ink-70)', marginTop: 2 }}>your gift will reach Kilian without revealing the address it lands at — by design</div>
                </div>
                <button style={{ padding: '12px 22px', background: 'var(--vermilion)', color: 'var(--parchment)', border: 'none', fontFamily: 'var(--display)', fontSize: 12, letterSpacing: '0.3em', cursor: 'pointer' }}>PRESS THE SEAL</button>
              </div>
            </div>
          </div>

          <div className="hr-gilded" style={{ margin: '40px 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56 }}>
            <ProfileSkillsCatalogue />
            <div>
              <div className="t-display" style={{ fontSize: 12, letterSpacing: '0.3em', color: 'var(--vermilion)', marginBottom: 4 }}>The wall · 28 sealed</div>
              <div className="t-display" style={{ fontSize: 32, letterSpacing: '0.04em', marginBottom: 16 }}>Sealed receipts</div>
              {KILIAN_RECEIPTS.map((r, i) => <ReceiptStrip key={i} r={r} />)}
            </div>
          </div>

          <div style={{ marginTop: 48, padding: '24px 0', borderTop: '0.5px solid var(--gilded)', borderBottom: '0.5px solid var(--gilded)', textAlign: 'center' }}>
            <div className="t-cer" style={{ fontSize: 36, color: 'var(--ink)' }}>Verus Sigillum</div>
            <div className="t-italic" style={{ fontSize: 14, color: 'var(--ink-70)', marginTop: 8 }}>this site is sealed by Praga · the name belongs to the human · reputation travels with the name</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 16 }}>
              <FleurDeLis size={22} />
              <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-50)' }}>kilian.praga.eth · attested · {showFullMargin ? '0x9af3…b21c' : 'sealed'}</span>
              <FleurDeLis size={22} />
            </div>
          </div>
        </div>

        {/* right marginalia */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 36, alignItems: 'center', paddingTop: 80 }}>
          <Marginalia kind="pragueMap" size={showFullMargin ? 200 : 150} />
          <div className="t-italic" style={{ fontSize: 12, color: 'var(--ink-70)', textAlign: 'center', maxWidth: 180, lineHeight: 1.5 }}>workshop above the butcher's<br />Krásova · Žižkov</div>
          <Marginalia kind="constellation" size={showFullMargin ? 200 : 150} />
          {showFullMargin && <Marginalia kind="chart" size={200} />}
          <FleurDeLis size={showFullMargin ? 36 : 28} />
        </aside>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenProfileMobile, ScreenProfileDesktop, PortraitRoundel, ReceiptStrip, ProfileSkillsCatalogue, ProfileHeader, StarRating });
