// onboarding-steps.jsx
// The six step bodies (scrollable content only — the shell owns header + footer CTA).
// Each receives shared profile state `s`, updater `set`, and tweak object `t`.

// ---- shared little pieces -------------------------------------------------
function Eyebrow({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700,
      letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-secondary)',
    }}>{children}</div>
  );
}

function StepHead({ eyebrow, title, body }) {
  return (
    <div style={{ padding: '4px 24px 0' }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 style={{
        margin: '12px 0 0', fontFamily: 'var(--font-ui)', fontWeight: 700,
        fontSize: 27, lineHeight: '32px', letterSpacing: '-0.02em', color: 'var(--fg)',
        textWrap: 'balance',
      }}>{title}</h1>
      {body && (
        <p style={{
          margin: '12px 0 0', fontFamily: 'var(--font-ui)', fontWeight: 400,
          fontSize: 15, lineHeight: '22px', color: 'var(--fg-secondary)', textWrap: 'pretty',
        }}>{body}</p>
      )}
    </div>
  );
}

function PermTile({ icon }) {
  return (
    <div style={{
      margin: '32px 24px 0', height: 188, borderRadius: 'var(--radius-lg)',
      background: 'var(--surface)', border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
    }}>
      <div style={{
        width: 96, height: 96, borderRadius: 'var(--radius-lg)', background: 'var(--surface-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={46} color="var(--fg)" strokeWidth={1.75} />
      </div>
    </div>
  );
}

function HelperNote({ children }) {
  return (
    <div style={{
      margin: '16px 24px 0', display: 'flex', gap: 8, alignItems: 'flex-start',
      fontFamily: 'var(--font-ui)', fontSize: 13, lineHeight: '18px', color: 'var(--fg-secondary)',
    }}>
      <Icon name="Lock" size={15} color="var(--fg-secondary)" strokeWidth={1.75} style={{ marginTop: 1 }} />
      <span>{children}</span>
    </div>
  );
}

// ---- 1. value -------------------------------------------------------------
function StepValue() {
  return (
    <div>
      <StepHead
        eyebrow="Fast start"
        title="Turn one photo and one track into a promo in seconds"
        body="Drop in a photo, add an audio clip, and MusicPromo builds a vertical promo video. No editor to fight."
      />
      <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 24px 8px' }}>
        <div style={{
          width: 176, height: 312, borderRadius: 22, position: 'relative', overflow: 'hidden',
          boxShadow: '0 18px 40px rgba(17,19,26,0.18), 0 0 0 1px rgba(17,19,26,0.06)',
        }}>
          <StripeFill radius={22} dark />
          {/* corner format tag */}
          <div style={{
            position: 'absolute', top: 12, right: 12, fontFamily: 'var(--font-mono)', fontSize: 10,
            letterSpacing: '0.04em', color: 'rgba(255,255,255,0.6)', padding: '2px 6px',
            background: 'rgba(14,16,20,0.5)', borderRadius: 4,
          }}>9:16</div>
          {/* play affordance + bottom artist tag, editorial */}
          <div style={{
            position: 'absolute', left: '50%', top: '42%', transform: 'translate(-50%,-50%)',
            width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="Play" size={22} color="#0E1014" fill="#0E1014" style={{ marginLeft: 3 }} />
          </div>
          <div style={{
            position: 'absolute', left: 14, right: 14, bottom: 14, display: 'flex',
            alignItems: 'center', gap: 8,
          }}>
            <Avatar size={28} silhouette dark />
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15,
              letterSpacing: '-0.01em', color: '#fff',
            }}>Your name</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- 2. flow --------------------------------------------------------------
function FlowRow({ n, icon, title, body, last }) {
  return (
    <div style={{
      display: 'flex', gap: 14, alignItems: 'center', padding: '16px 0',
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 'var(--radius-md)', flexShrink: 0,
        background: 'var(--surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <Icon name={icon} size={22} color="var(--fg)" strokeWidth={1.9} />
        <div style={{
          position: 'absolute', top: -5, left: -5, width: 18, height: 18, borderRadius: '50%',
          background: 'var(--fg)', color: 'var(--bg)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700,
        }}>{n}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>{title}</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, lineHeight: '18px', color: 'var(--fg-secondary)', marginTop: 2 }}>{body}</div>
      </div>
    </div>
  );
}

function StepFlow() {
  return (
    <div>
      <StepHead eyebrow="Simple flow" title="Three steps, then you're done" />
      <div style={{ margin: '24px 24px 0', padding: '0 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
        <FlowRow n={1} icon="Image" title="Pick a photo" body="Choose any shot from your library." />
        <FlowRow n={2} icon="Music" title="Pick a track" body="Add an audio clip and trim the loop." />
        <FlowRow n={3} icon="Share2" title="Share it" body="Post it, or save to your Camera Roll." last />
      </div>
    </div>
  );
}

// ---- 3 + 4. permission primers -------------------------------------------
function StepPermPhotos() {
  return (
    <div>
      <StepHead
        eyebrow="Photo access"
        title="Allow access to your photos"
        body="MusicPromo opens your library so you can pick the image for your promo. You choose what to use."
      />
      <PermTile icon="Images" />
      <HelperNote>Nothing leaves your phone until you share. You can change this later in Settings.</HelperNote>
    </div>
  );
}

function StepPermAudio() {
  return (
    <div>
      <StepHead
        eyebrow="Audio access"
        title="Allow access to your audio"
        body="Pick a track from your music library and trim it to the perfect loop."
      />
      <PermTile icon="Music" />
      <HelperNote>We only read the clip you choose. You can change this later in Settings.</HelperNote>
    </div>
  );
}

// ---- 5. profile setup (interactive) --------------------------------------
function Field({ label, children, counter }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
        <label style={{
          fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: 'var(--fg-secondary)',
        }}>{label}</label>
        {counter}
      </div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', background: 'var(--surface)',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
  padding: '13px 14px', fontFamily: 'var(--font-ui)', fontSize: 16, color: 'var(--fg)',
  outline: 'none', WebkitAppearance: 'none',
};

const linkBtnStyle = {
  border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
  fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--accent-primary)',
};

function StepProfile({ s, set }) {
  const BIO_MAX = 280;
  const remaining = BIO_MAX - (s.bio || '').length;
  const PREVIEW_SCALE = 0.55;

  return (
    <div>
      {/* title / subtitle / guest helper */}
      <div style={{ padding: '4px 24px 0' }}>
        <h1 style={{
          margin: 0, fontFamily: 'var(--font-ui)', fontWeight: 700,
          fontSize: 27, lineHeight: '32px', letterSpacing: '-0.02em', color: 'var(--fg)', textWrap: 'balance',
        }}>Set up your artist card</h1>
        <p style={{
          margin: '10px 0 0', fontFamily: 'var(--font-ui)', fontSize: 15, lineHeight: '22px',
          color: 'var(--fg-secondary)', textWrap: 'pretty',
        }}>This shows on every promo you share. You can change it later.</p>
        <div style={{
          marginTop: 12, display: 'flex', gap: 8, alignItems: 'center',
          fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--fg-secondary)',
        }}>
          <Icon name="UserRound" size={15} color="var(--fg-secondary)" strokeWidth={1.75} />
          <span>Sign in to link an existing Music Promo.</span>
        </div>
      </div>

      {/* hero banner (16:9) + overlapping avatar — the edit surface */}
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{ position: 'relative' }}>
          <button onClick={() => set({ banner: !s.banner })} className="press"
            style={{
              display: 'block', width: '100%', aspectRatio: '16 / 9', borderRadius: 'var(--radius-lg)',
              overflow: 'hidden', position: 'relative', padding: 0, cursor: 'pointer',
              border: '1px solid var(--border)', background: 'var(--surface-muted)',
            }}>
            <StripeFill label={s.banner ? null : 'banner'} />
            <span style={{
              position: 'absolute', right: 10, bottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 30, padding: '0 12px', borderRadius: 'var(--radius-full)',
              background: 'rgba(14,16,20,0.62)', color: '#fff',
              fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600,
            }}>
              <Icon name="Image" size={14} color="#fff" strokeWidth={2} />
              {s.banner ? 'Change banner' : 'Add banner'}
            </span>
          </button>
          {/* avatar overlapping banner bottom-left */}
          <button onClick={() => set({ photo: !s.photo })} className="press"
            style={{
              position: 'absolute', left: 16, bottom: -30, padding: 0, border: 'none',
              background: 'transparent', cursor: 'pointer', borderRadius: '50%',
            }}>
            <div style={{ borderRadius: '50%', boxShadow: '0 0 0 3px var(--bg)' }}>
              <Avatar size={78} photo={s.photo} addable={!s.photo} dark={false} />
            </div>
          </button>
        </div>
        {/* avatar caption, clears the overlap */}
        <div style={{ marginTop: 9, marginLeft: 106, minHeight: 26, display: 'flex', alignItems: 'center' }}>
          <button onClick={() => set({ photo: !s.photo })} style={linkBtnStyle}>
            {s.photo ? 'Change photo' : 'Add photo'}
          </button>
        </div>

        {/* name (required) */}
        <Field
          label="Artist name"
          counter={<span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--fg-secondary)' }}>Required</span>}>
          <input
            style={inputStyle}
            value={s.name}
            placeholder="e.g. Midnight Drive"
            aria-required="true"
            onChange={e => set({ name: e.target.value })} />
        </Field>

        {/* bio (optional, 280) */}
        <Field
          label="Bio"
          counter={
            <span style={{
              fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500,
              color: remaining < 30 ? 'var(--warning)' : 'var(--fg-secondary)',
            }}>{remaining} left</span>
          }>
          <textarea
            style={{ ...inputStyle, minHeight: 84, resize: 'none', lineHeight: '21px' }}
            value={s.bio}
            maxLength={BIO_MAX}
            placeholder="What's your sound? A line or two about you."
            onChange={e => set({ bio: e.target.value })} />
        </Field>
      </div>

      {/* live ShareCardPreview at previewScale ~0.55 */}
      <div style={{ padding: '24px 24px 4px' }}>
        <div style={{ marginBottom: 12 }}><Eyebrow>Preview</Eyebrow></div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ShareCardPreview
            width={Math.round(360 * PREVIEW_SCALE)}
            name={s.name} bio={s.bio} photo={s.photo} banner={s.banner}
            handles={[]} songs={[]} promos={[]}
            emptyPromos="Your promos will show here" />
        </div>
      </div>
    </div>
  );
}

// ---- 6. ready -------------------------------------------------------------
function StepReady() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '8px 24px 0' }}>
      <div style={{
        marginTop: 24, width: 88, height: 88, borderRadius: '50%',
        background: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="Check" size={46} color="var(--bg)" strokeWidth={2.5} />
      </div>
      <div style={{ marginTop: 28 }}>
        <Eyebrow>You are set</Eyebrow>
      </div>
      <h1 style={{
        margin: '12px 0 0', fontFamily: 'var(--font-ui)', fontWeight: 700,
        fontSize: 27, lineHeight: '32px', letterSpacing: '-0.02em', color: 'var(--fg)', textWrap: 'balance',
      }}>You're ready to make your first promo</h1>
      <p style={{
        margin: '12px 0 0', fontFamily: 'var(--font-ui)', fontSize: 15, lineHeight: '22px',
        color: 'var(--fg-secondary)', maxWidth: 300, textWrap: 'pretty',
      }}>Tap the plus on Home anytime to start. Your first promo takes about a minute.</p>
    </div>
  );
}

Object.assign(window, {
  StepValue, StepFlow, StepPermPhotos, StepPermAudio, StepProfile, StepReady,
});
