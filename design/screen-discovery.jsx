// Screen 2 — Discovery feed — the town square

const FEED_OFFERS = [
  { kind: 'forge', name: 'kilian', skill: 'I will fix your bicycle by sundown.', kc: 350, crypto: '12 USDC', dist: 'Žižkov · 800m', verified: true, type: 'OFFER' },
  { kind: 'mercury', name: 'lucia', skill: 'Czech ↔ English, an hour over coffee.', kc: 450, crypto: '16 USDC', dist: 'Vinohrady · 1.2km', verified: true, type: 'OFFER' },
  { kind: 'sulphur', name: 'bohuslav', skill: 'Sunday svíčková, two portions, hand-delivered.', kc: 280, crypto: '10 USDC', dist: 'Karlín · 600m', verified: false, type: 'OFFER' },
  { kind: 'caduceus', name: 'milena', skill: 'Ride to the airport, 6am Tuesday.', kc: 600, crypto: '22 USDC', dist: 'Holešovice · 2.0km', verified: true, type: 'REQUEST' },
  { kind: 'saturn', name: 'tomas', skill: 'Mathematics for your gymnázium child, weekly.', kc: 550, crypto: '20 USDC', dist: 'Smíchov · 1.5km', verified: true, type: 'OFFER' },
  { kind: 'venus', name: 'pavla', skill: 'Free piano — pick it up Saturday morning.', kc: 0, crypto: 'gift', dist: 'Vinohrady · 1.1km', verified: false, type: 'GIFT' },
  { kind: 'alembic', name: 'jirka', skill: "I'll wait at the foreign-police office for you.", kc: 200, crypto: '7 USDC', dist: 'Žižkov · 900m', verified: false, type: 'OFFER' },
  { kind: 'forge', name: 'radek', skill: 'Hung shelves, simple plumbing, sealed grout.', kc: 420, crypto: '15 USDC', dist: 'Karlín · 1.7km', verified: true, type: 'OFFER' },
];

function FilterChip({ kind, label, active = false }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '8px 14px',
      background: active ? 'var(--vermilion)' : 'var(--bone)',
      color: active ? 'var(--parchment)' : 'var(--ink)',
      border: '0.5px solid var(--gilded)',
      borderRadius: 999,
      fontFamily: 'var(--display)',
      fontSize: 11,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      cursor: 'pointer',
      flex: '0 0 auto',
    }}>
      {kind && <AlchemicalSigil kind={kind} size={16} frame={false} color={active ? 'var(--parchment)' : 'var(--ink)'} />}
      {label}
    </span>
  );
}

function OfferCard({ offer, compact = false }) {
  const typeColor = offer.type === 'GIFT' ? 'var(--verdigris)' : offer.type === 'REQUEST' ? 'var(--lapis)' : 'var(--vermilion)';
  return (
    <div style={{ position: 'relative', background: 'var(--parchment)' }}>
      <Cartouche style={{ background: 'transparent' }} padding={compact ? 18 : 22} tight={compact}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ flex: '0 0 auto' }}>
            <AlchemicalSigil kind={offer.kind} size={compact ? 44 : 52} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="t-display" style={{ fontSize: 10, letterSpacing: '0.3em', color: typeColor }}>{offer.type}</span>
              <span className="t-mono" style={{ fontSize: 10, color: 'var(--ink-50)' }}>·</span>
              <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink)' }}>{offer.name}.praga.eth</span>
              {offer.verified && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 6, height: 6, background: 'var(--vermilion)', borderRadius: '50%' }} />
                  <span className="t-display" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'var(--vermilion)' }}>SEALED</span>
                </span>
              )}
            </div>
            <div className="t-body" style={{ fontSize: compact ? 16 : 18, lineHeight: 1.35, color: 'var(--ink)', marginBottom: 12 }}>{offer.skill}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <span className="t-display" style={{ fontSize: compact ? 22 : 26, letterSpacing: '0.02em', color: 'var(--ink)' }}>
                  {offer.type === 'GIFT' ? 'Free' : `${offer.kc} Kč`}
                </span>
                <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-70)', marginLeft: 10 }}>{offer.crypto}</span>
              </div>
              <div className="t-italic" style={{ fontSize: 13, color: 'var(--ink-70)' }}>{offer.dist}</div>
            </div>
          </div>
        </div>
      </Cartouche>
    </div>
  );
}

function ScreenDiscoveryMobile() {
  return (
    <div className="parchment-surface" style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* status bar */}
      <div style={{ height: 44, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="t-mono" style={{ fontSize: 13 }}>14:22</span>
        <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-70)' }}>· · ·</span>
      </div>
      {/* masthead */}
      <div style={{ padding: '8px 24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div className="t-display" style={{ fontSize: 10, letterSpacing: '0.35em', color: 'var(--vermilion)' }}>The town square</div>
            <div className="t-display" style={{ fontSize: 30, letterSpacing: '0.04em', lineHeight: 1 }}>Praga, Ⅴ.viii</div>
          </div>
          <FleurDeLis size={26} />
        </div>
        <div className="hr-gilded" style={{ marginTop: 10 }} />
        {/* search */}
        <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input placeholder="seek a craftsman, a favor…" style={{ flex: 1, padding: '12px 14px', background: 'var(--bone)', border: '0.5px solid var(--gilded)', fontFamily: 'var(--body)', fontStyle: 'italic', fontSize: 15, color: 'var(--ink)', outline: 'none' }} />
        </div>
        {/* filter chips */}
        <div style={{ display: 'flex', gap: 6, marginTop: 14, overflowX: 'auto', paddingBottom: 4 }}>
          <FilterChip label="ALL" active />
          <FilterChip kind="forge" label="REPAIR" />
          <FilterChip kind="mercury" label="LANGUAGE" />
          <FilterChip kind="sulphur" label="COOK" />
          <FilterChip kind="caduceus" label="RIDE" />
          <FilterChip kind="venus" label="GIFTS" />
        </div>
      </div>
      {/* feed */}
      <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {FEED_OFFERS.slice(0, 6).map((o, i) => (
          <OfferCard key={i} offer={o} compact />
        ))}
      </div>
      {/* tab bar */}
      <div style={{ marginTop: 'auto', padding: '14px 24px 28px', borderTop: '0.5px solid var(--gilded)', background: 'var(--bone)', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        {[['mercury', 'square', true], ['venus', 'gifts', false], ['alembic', 'compose', false], ['saturn', 'thread', false], ['forge', 'ledger', false]].map(([k, l, a]) => (
          <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: a ? 1 : 0.55 }}>
            <AlchemicalSigil kind={k} size={28} frame={false} />
            <span className="t-display" style={{ fontSize: 9, letterSpacing: '0.25em' }}>{l.toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenDiscoveryDesktop() {
  return (
    <div className="parchment-surface" style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* nav */}
      <div style={{ padding: '24px 56px', display: 'flex', alignItems: 'center', gap: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FleurDeLis size={22} />
          <span className="t-display" style={{ fontSize: 14, letterSpacing: '0.4em' }}>PRAGA</span>
        </div>
        <div style={{ display: 'flex', gap: 28 }}>
          {[['Square', true], ['Compose', false], ['Threads', false], ['Ledger', false]].map(([l, a]) => (
            <span key={l} className="t-display" style={{ fontSize: 12, letterSpacing: '0.3em', color: a ? 'var(--ink)' : 'var(--ink-50)', borderBottom: a ? '0.5px solid var(--gilded)' : 'none', paddingBottom: 4, cursor: 'pointer' }}>{l}</span>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <input placeholder="seek a craftsman…" style={{ width: 280, padding: '10px 14px', background: 'var(--bone)', border: '0.5px solid var(--gilded)', fontFamily: 'var(--body)', fontStyle: 'italic', fontSize: 14, outline: 'none' }} />
          <span className="t-mono" style={{ fontSize: 13, color: 'var(--ink)' }}>kilian.praga.eth</span>
          <WaxSeal size={36} state="rubedo" rotate={-10} emboss="fleur" />
        </div>
      </div>
      <div className="hr-gilded" style={{ margin: '0 56px' }} />

      {/* main */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 220px', gap: 32, padding: '32px 56px 64px' }}>
        {/* left margin */}
        <aside>
          <Marginalia kind="constellation" size={170} />
          <div className="hr-gilded" style={{ margin: '24px 0' }} />
          <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.25em', color: 'var(--ink-70)', marginBottom: 12 }}>NEIGHBOURHOOD</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[['Žižkov', 24, true], ['Vinohrady', 18, false], ['Karlín', 12, false], ['Smíchov', 9, false], ['Holešovice', 7, false]].map(([n, c, a]) => (
              <div key={n} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span className="t-body" style={{ fontSize: 15, color: a ? 'var(--ink)' : 'var(--ink-70)', textDecoration: a ? 'underline' : 'none', textDecorationColor: 'var(--gilded)', textUnderlineOffset: 4 }}>{n}</span>
                <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-70)' }}>{c}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* center column */}
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div className="t-display" style={{ fontSize: 12, letterSpacing: '0.4em', color: 'var(--vermilion)' }}>The town square · Žižkov</div>
              <div className="t-display" style={{ fontSize: 56, letterSpacing: '0.04em', lineHeight: 1 }}>Today's notices</div>
            </div>
            <div className="t-italic" style={{ fontSize: 14, color: 'var(--ink-70)' }}>posted in the last six hours · {FEED_OFFERS.length} hands at work</div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            <FilterChip label="ALL" active />
            <FilterChip kind="forge" label="REPAIR" />
            <FilterChip kind="mercury" label="LANGUAGE" />
            <FilterChip kind="sulphur" label="COOK" />
            <FilterChip kind="caduceus" label="RIDE" />
            <FilterChip kind="saturn" label="TUTOR" />
            <FilterChip kind="venus" label="GIFTS" />
            <FilterChip kind="alembic" label="ERRANDS" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {FEED_OFFERS.map((o, i) => <OfferCard key={i} offer={o} />)}
          </div>
        </div>

        {/* right margin */}
        <aside>
          <Cartouche style={{ background: 'var(--bone)' }} padding={20} tight>
            <div className="t-display" style={{ fontSize: 10, letterSpacing: '0.3em', color: 'var(--vermilion)', marginBottom: 8 }}>YOUR SEAL</div>
            <div className="t-display" style={{ fontSize: 18, letterSpacing: '0.05em' }}>Kilian P.</div>
            <div className="t-mono" style={{ fontSize: 11, color: 'var(--ink-70)', marginTop: 2 }}>kilian.praga.eth</div>
            <div className="hr-gilded" style={{ margin: '12px 0' }} />
            <div className="t-italic" style={{ fontSize: 13, color: 'var(--ink-70)', lineHeight: 1.4 }}>3 sealed receipts · 1 thread waiting · scanning for private gifts</div>
          </Cartouche>
          <div style={{ marginTop: 24 }}>
            <Marginalia kind="pragueMap" size={170} />
          </div>
          <div className="t-italic" style={{ fontSize: 12, color: 'var(--ink-70)', marginTop: 12, lineHeight: 1.5 }}>Notices nearer the bridge tend to fill first. Žižkov-side moves slower but the work is good.</div>
        </aside>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenDiscoveryMobile, ScreenDiscoveryDesktop, OfferCard, FilterChip });
