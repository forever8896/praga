// Screen 8 — Wallet / earnings — the ledger

const LEDGER_ENTRIES = [
  { state: 'rubedo', label: 'Repaired a Favorit', from: 'lucia.praga.eth', kc: '+ 350', date: '04 may', em: 'fleur', kind: 'forge' },
  { state: 'rubedo', label: 'Three knives sharpened', from: 'pavla.praga.eth', kc: '+ 280', date: '28 apr', em: 'fleur', kind: 'forge' },
  { state: 'rubedo', label: 'A private gift arrived', from: '— sealed —', kc: '+ 200', date: '26 apr', em: 'fleur', kind: 'venus', stealth: true },
  { state: 'citrinitas', label: 'Foreign-police queue', from: 'milena.praga.eth', kc: '· 200 ·', date: '22 apr', em: 'sun', kind: 'alembic' },
  { state: 'rubedo', label: 'Hung shelves, sealed grout', from: 'tomas.praga.eth', kc: '+ 420', date: '14 apr', em: 'fleur', kind: 'forge' },
  { state: 'albedo', label: 'Old radio, in progress', from: 'jan.praga.eth', kc: '· 320 ·', date: '12 apr', em: 'crescent', kind: 'forge' },
];

function LedgerRow({ e, compact = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 12 : 16, padding: compact ? '14px 0' : '18px 0', borderBottom: '0.5px solid var(--gilded)' }}>
      <WaxSeal size={compact ? 40 : 50} state={e.state} rotate={(e.label.length % 12) - 6} emboss={e.em} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <AlchemicalSigil kind={e.kind} size={18} frame={false} />
          <span className="t-body" style={{ fontSize: compact ? 14 : 16, color: 'var(--ink)' }}>{e.label}</span>
          {e.stealth && <span className="t-display" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'var(--vermilion)', padding: '2px 6px', border: '0.5px solid var(--vermilion)' }}>SEALED</span>}
        </div>
        <div className="t-italic" style={{ fontSize: 12, color: 'var(--ink-70)' }}>from <span className="t-mono" style={{ fontSize: 11, fontStyle: 'normal' }}>{e.from}</span> · {e.date}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="t-display" style={{ fontSize: compact ? 16 : 19, letterSpacing: '0.04em', color: e.state === 'rubedo' ? 'var(--verdigris)' : 'var(--ink-70)' }}>{e.kc} Kč</div>
        <div className="t-mono" style={{ fontSize: 10, color: 'var(--ink-70)' }}>{e.state === 'rubedo' ? 'released' : e.state === 'citrinitas' ? 'awaiting release' : 'in progress'}</div>
      </div>
    </div>
  );
}

function ScannerLine() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bone)', border: '0.5px solid var(--gilded)' }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--ink-70)" strokeWidth="0.8">
        <circle cx="8" cy="8" r="6">
          <animate attributeName="r" values="2;6;2" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <circle cx="8" cy="8" r="2" fill="var(--ink-70)" />
      </svg>
      <span className="t-italic" style={{ fontSize: 13, color: 'var(--ink-70)' }}>scanning for private gifts…</span>
      <span className="t-mono" style={{ fontSize: 10, color: 'var(--ink-50)', marginLeft: 'auto' }}>last swept 3s ago</span>
    </div>
  );
}

function ScreenWalletMobile() {
  return (
    <div className="parchment-surface" style={{ width: '100%', minHeight: '100%', padding: '0 24px 28px' }}>
      <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="t-mono" style={{ fontSize: 13 }}>14:22</span>
        <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-70)' }}>· · ·</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <FleurDeLis size={20} />
        <span className="t-display" style={{ fontSize: 11, letterSpacing: '0.35em', color: 'var(--vermilion)' }}>THE LEDGER</span>
      </div>
      <div className="t-display" style={{ fontSize: 56, letterSpacing: '0.02em', lineHeight: 1, marginTop: 6 }}>4 270</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="t-display" style={{ fontSize: 18, letterSpacing: '0.1em', color: 'var(--ink-70)' }}>Kč</span>
        <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-70)' }}>≈ 152 USDC · earned this month</span>
      </div>
      <div className="hr-double" style={{ margin: '14px 0' }} />
      <ScannerLine />

      <div style={{ marginTop: 22 }}>
        <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--vermilion)', marginBottom: 4 }}>RECENT</div>
        <div className="t-display" style={{ fontSize: 22, letterSpacing: '0.05em', marginBottom: 6 }}>Sealed receipts</div>
        {LEDGER_ENTRIES.map((e, i) => <LedgerRow key={i} e={e} compact />)}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
        <button style={{ flex: 1, padding: 14, background: 'var(--ink)', color: 'var(--parchment)', border: 'none', fontFamily: 'var(--display)', fontSize: 11, letterSpacing: '0.3em' }}>WITHDRAW</button>
        <button style={{ flex: 1, padding: 14, background: 'transparent', color: 'var(--ink)', border: '0.5px solid var(--gilded)', fontFamily: 'var(--display)', fontSize: 11, letterSpacing: '0.3em' }}>EXPORT BOOK</button>
      </div>
    </div>
  );
}

function ScreenWalletDesktop() {
  return (
    <div className="parchment-surface" style={{ width: '100%', minHeight: '100%', padding: '32px 56px 56px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <FleurDeLis size={22} />
        <span className="t-display" style={{ fontSize: 14, letterSpacing: '0.4em' }}>PRAGA</span>
        <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-70)', marginLeft: 16 }}>/ ledger / kilian.praga.eth</span>
      </div>
      <div className="hr-double" style={{ marginBottom: 32 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 56 }}>
        <div>
          <div className="t-display" style={{ fontSize: 12, letterSpacing: '0.4em', color: 'var(--vermilion)' }}>The leather-bound ledger</div>
          <div className="t-display" style={{ fontSize: 64, letterSpacing: '0.04em', lineHeight: 0.95, marginTop: 6 }}>The book of work</div>
          <div className="t-italic" style={{ fontSize: 17, color: 'var(--ink-70)', marginTop: 10, maxWidth: 540 }}>Each receipt below is a closed seal. The book is yours; we keep no copy that does not belong to you.</div>

          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
              <div>
                <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--ink-70)', marginBottom: 4 }}>EARNED THIS MONTH</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span className="t-display" style={{ fontSize: 80, letterSpacing: '0.02em' }}>4 270</span>
                  <span className="t-display" style={{ fontSize: 22, letterSpacing: '0.1em', color: 'var(--ink-70)' }}>Kč</span>
                </div>
                <div className="t-mono" style={{ fontSize: 13, color: 'var(--ink-70)', marginTop: 4 }}>≈ 152 USDC · 6 sealed · 2 in progress</div>
              </div>
            </div>
            <div className="hr-gilded" style={{ margin: '24px 0' }} />
            <ScannerLine />
          </div>

          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div className="t-display" style={{ fontSize: 28, letterSpacing: '0.05em' }}>Recent entries</div>
              <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-70)' }}>showing 6 of 28 · all time 31 480 Kč</span>
            </div>
            <div style={{ marginTop: 12 }}>
              {LEDGER_ENTRIES.map((e, i) => <LedgerRow key={i} e={e} />)}
            </div>
          </div>
        </div>

        <aside>
          <Cartouche style={{ background: 'var(--bone)' }} padding={24}>
            <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--vermilion)' }}>WITHDRAW</div>
            <div className="t-display" style={{ fontSize: 22, letterSpacing: '0.05em', marginTop: 4 }}>Send to your bank</div>
            <div className="t-italic" style={{ fontSize: 13, color: 'var(--ink-70)', marginTop: 6, marginBottom: 14, lineHeight: 1.5 }}>SEPA arrives in your account by next morning. A small portion of crypto can be kept as it is.</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '12px 14px', background: 'var(--parchment)', border: '0.5px solid var(--gilded)' }}>
              <span className="t-display" style={{ fontSize: 28 }}>4 270</span>
              <span className="t-display" style={{ fontSize: 13, color: 'var(--ink-70)' }}>Kč</span>
            </div>
            <button style={{ marginTop: 12, width: '100%', padding: 14, background: 'var(--ink)', color: 'var(--parchment)', border: 'none', fontFamily: 'var(--display)', fontSize: 12, letterSpacing: '0.3em' }}>WITHDRAW ALL</button>
          </Cartouche>

          <div style={{ marginTop: 28 }}>
            <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--vermilion)' }}>PRIVATE INBOX</div>
            <div className="t-display" style={{ fontSize: 22, letterSpacing: '0.05em', marginTop: 4 }}>Three sealed gifts</div>
            <div className="t-italic" style={{ fontSize: 13, color: 'var(--ink-70)', marginTop: 6, lineHeight: 1.5 }}>Gifts arrive without revealing the route they took. They are written into the ledger as they are found.</div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <WaxSeal size={50} state="rubedo" rotate={-6} emboss="fleur" />
              <WaxSeal size={50} state="rubedo" rotate={4} emboss="fleur" />
              <WaxSeal size={50} state="rubedo" rotate={-9} emboss="fleur" />
            </div>
          </div>

          <div style={{ marginTop: 32 }}>
            <Marginalia kind="chart" size={170} />
          </div>
        </aside>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenWalletMobile, ScreenWalletDesktop, ScannerLine });
