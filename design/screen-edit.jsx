// Screen 7 — Edit your seal — secret authenticated profile view
// Same illuminated layout as profile, but with edit affordances + subname shelves.

const SUBNAME_SHELVES = [
  { name: 'bio.kilian.praga.eth', kind: 'venus', label: 'BIO', desc: 'a paragraph in your hand', vis: 'public' },
  { name: 'skills.kilian.praga.eth', kind: 'forge', label: 'SKILLS', desc: 'four trades · prices · radius', vis: 'public' },
  { name: 'inbox.kilian.praga.eth', kind: 'mercury', label: 'INBOX', desc: 'sealed thread route · keys', vis: 'private' },
  { name: 'stealth.kilian.praga.eth', kind: 'alembic', label: 'GIFTS', desc: 'private route for received gifts', vis: 'private' },
  { name: 'agent.kilian.praga.eth', kind: 'saturn', label: 'FAMILIAR', desc: 'optional delegate · scoped powers', vis: 'private' },
  { name: 'wall.kilian.praga.eth', kind: 'caduceus', label: 'WALL', desc: 'sealed receipts · 28 entries', vis: 'public' },
];

function EditableField({ children, label }) {
  return (
    <div style={{ position: 'relative', padding: '6px 8px', borderLeft: '0.5px dashed var(--gilded)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="t-mono" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--gilded-soft)' }}>{label}</span>
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--gilded)' }}>
          <Quill size={14} />
          <span className="t-display" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'var(--gilded-soft)' }}>EDIT</span>
        </span>
      </div>
      {children}
    </div>
  );
}

function ShelfRow({ shelf }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '0.5px solid var(--gilded)' }}>
      <AlchemicalSigil kind={shelf.kind} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.25em' }}>{shelf.label}</div>
        <div className="t-mono" style={{ fontSize: 10, color: 'var(--ink-70)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shelf.name}</div>
        <div className="t-italic" style={{ fontSize: 12, color: 'var(--ink-70)', marginTop: 2 }}>{shelf.desc}</div>
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: shelf.vis === 'public' ? 'transparent' : 'var(--ink)', color: shelf.vis === 'public' ? 'var(--ink)' : 'var(--gilded)', border: '0.5px solid var(--gilded)' }}>
        <span className="t-display" style={{ fontSize: 9, letterSpacing: '0.25em' }}>{shelf.vis === 'public' ? 'OPEN' : 'SEALED'}</span>
      </div>
    </div>
  );
}

function EditBanner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', background: 'var(--ink)', color: 'var(--gilded)', border: '0.5px solid var(--gilded)' }}>
      <FleurDeLis size={18} stroke="var(--gilded)" />
      <div style={{ flex: 1 }}>
        <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--gilded)' }}>YOU ARE EDITING YOUR SEAL</div>
        <div className="t-italic" style={{ fontSize: 13, color: 'rgba(244,236,216,0.7)' }}>changes are saved when you press the wax · only you see this view</div>
      </div>
      <button style={{ padding: '8px 16px', background: 'var(--vermilion)', color: 'var(--parchment)', border: 'none', fontFamily: 'var(--display)', fontSize: 10, letterSpacing: '0.3em', cursor: 'pointer' }}>PRESS TO SAVE</button>
      <button style={{ padding: '8px 12px', background: 'transparent', color: 'var(--gilded)', border: '0.5px solid var(--gilded)', fontFamily: 'var(--display)', fontSize: 10, letterSpacing: '0.3em', cursor: 'pointer' }}>VIEW PUBLIC</button>
    </div>
  );
}

function ScreenEditMobile() {
  return (
    <div className="parchment-surface" style={{ width: '100%', minHeight: '100%', padding: '0 20px 32px' }}>
      <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="t-mono" style={{ fontSize: 13 }}>14:22</span>
        <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-70)' }}>· · ·</span>
      </div>
      <EditBanner />

      <div style={{ marginTop: 20 }}>
        <Cartouche padding={16}>
          <ProfileHeader size="mobile" />
          <div style={{ position: 'relative', textAlign: 'center', marginTop: 8 }}>
            <PortraitRoundel size={140} />
            <span style={{ position: 'absolute', right: '50%', top: 0, transform: 'translateX(80px)', display: 'inline-flex', gap: 4, alignItems: 'center', padding: '4px 8px', background: 'var(--parchment)', border: '0.5px solid var(--gilded)' }}>
              <Quill size={12} />
              <span className="t-display" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'var(--gilded-soft)' }}>EDIT</span>
            </span>
          </div>
        </Cartouche>
      </div>

      <div style={{ marginTop: 24 }}>
        <EditableField label="BIO · BIO.KILIAN.PRAGA.ETH">
          <div className="t-italic" style={{ fontSize: 15, lineHeight: 1.5 }}>Born in Karlovy Vary, transplanted to Žižkov ten winters ago. I keep a small workshop above a butcher's…</div>
        </EditableField>
      </div>

      <div style={{ marginTop: 28 }}>
        <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--vermilion)', marginBottom: 4 }}>The shelves</div>
        <div className="t-display" style={{ fontSize: 22, letterSpacing: '0.05em', marginBottom: 8 }}>Subname shelves</div>
        <div className="t-italic" style={{ fontSize: 13, color: 'var(--ink-70)', marginBottom: 12, lineHeight: 1.5 }}>Each shelf holds one kind of thing. Toggle a shelf sealed and only invited eyes can read it.</div>
        {SUBNAME_SHELVES.map((s, i) => <ShelfRow key={i} shelf={s} />)}
      </div>

      <div style={{ marginTop: 28 }}>
        <EditableField label="SKILLS · SKILLS.KILIAN.PRAGA.ETH">
          <div style={{ fontSize: 14 }}>Bicycles, knives, small electrics — from 200 Kč</div>
        </EditableField>
        <div style={{ height: 8 }} />
        <EditableField label="WALL · 28 SEALED RECEIPTS">
          <div className="t-italic" style={{ fontSize: 13, color: 'var(--ink-70)' }}>You cannot edit a sealed receipt — it follows the human.</div>
        </EditableField>
      </div>
    </div>
  );
}

function ScreenEditDesktop() {
  return (
    <div className="parchment-surface" style={{ width: '100%', minHeight: '100%', padding: '24px 48px 56px' }}>
      <EditBanner />

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 40, marginTop: 28 }}>
        {/* shelves sidebar */}
        <aside>
          <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--vermilion)' }}>The shelves</div>
          <div className="t-display" style={{ fontSize: 30, letterSpacing: '0.05em', marginTop: 4 }}>Subname shelves</div>
          <div className="t-italic" style={{ fontSize: 14, color: 'var(--ink-70)', marginTop: 8, marginBottom: 18, lineHeight: 1.55 }}>Your name has shelves under it. Each shelf holds one kind of thing — your bio, your skills, your sealed inbox. Toggle a shelf sealed and only invited eyes can read it.</div>
          {SUBNAME_SHELVES.map((s, i) => <ShelfRow key={i} shelf={s} />)}
          <button style={{ marginTop: 18, padding: '12px 18px', width: '100%', background: 'transparent', border: '0.5px solid var(--gilded)', fontFamily: 'var(--display)', fontSize: 11, letterSpacing: '0.3em', color: 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <span>+</span> ADD A SHELF
          </button>
          <div style={{ marginTop: 28 }}>
            <Marginalia kind="alembicDiagram" size={150} />
          </div>
        </aside>

        {/* page editor — same illuminated layout */}
        <div>
          <Cartouche padding={32}>
            <ProfileHeader size="desktop" />
            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 32, alignItems: 'flex-start', marginTop: 12 }}>
              <div style={{ position: 'relative' }}>
                <PortraitRoundel size={240} />
                <span style={{ position: 'absolute', top: 12, right: 12, display: 'inline-flex', gap: 4, alignItems: 'center', padding: '4px 8px', background: 'var(--parchment)', border: '0.5px solid var(--gilded)' }}>
                  <Quill size={12} />
                  <span className="t-display" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'var(--gilded-soft)' }}>REPLACE</span>
                </span>
              </div>
              <div>
                <EditableField label="BIO · BIO.KILIAN.PRAGA.ETH · OPEN">
                  <div className="t-italic" style={{ fontSize: 17, lineHeight: 1.6 }}>Born in Karlovy Vary, transplanted to Žižkov ten winters ago. I keep a small workshop above a butcher's on Krásova where I sharpen knives, fix bicycles, and occasionally repair an old radio if it deserves it. The wax seal below this letter is my hand on the work.</div>
                </EditableField>
              </div>
            </div>

            <div className="hr-gilded" style={{ margin: '32px 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
              <EditableField label="SKILLS · SKILLS.KILIAN.PRAGA.ETH · OPEN">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    ['Bicycles, knives, small electrics', 'from 200 Kč'],
                    ['Hanging shelves, simple plumbing', 'from 350 Kč'],
                    ['Standing in queues for you', '120 Kč / hr'],
                    ['Coffee on Saturday mornings', 'free · gift'],
                  ].map(([n, p], i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '0.5px solid var(--gilded)' }}>
                      <AlchemicalSigil kind={i === 3 ? 'venus' : i === 2 ? 'alembic' : 'forge'} size={28} />
                      <div style={{ flex: 1 }} className="t-body" >{n}</div>
                      <div className="t-display" style={{ fontSize: 11, letterSpacing: '0.15em', color: 'var(--ink-70)' }}>{p}</div>
                    </div>
                  ))}
                </div>
              </EditableField>
              <EditableField label="WALL · 28 SEALED RECEIPTS · OPEN">
                <div className="t-italic" style={{ fontSize: 13, color: 'var(--ink-70)', marginBottom: 8 }}>The wall is automatic — sealed receipts arrive here when work is released. They cannot be deleted; they belong to the human.</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Array.from({ length: 14 }).map((_, i) => (
                    <WaxSeal key={i} size={28} state="rubedo" rotate={(i * 13) % 14 - 7} emboss="fleur" />
                  ))}
                  <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-70)', alignSelf: 'center', marginLeft: 8 }}>+ 14 more</span>
                </div>
              </EditableField>
            </div>
          </Cartouche>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenEditMobile, ScreenEditDesktop });
