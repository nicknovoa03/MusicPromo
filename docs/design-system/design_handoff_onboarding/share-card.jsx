// share-card.jsx
// ShareCardPreview — the dark, editorial "artist card" export artifact that the
// Profile setup step previews live. Always dark (the export artifact theme), even
// though the onboarding chrome around it is light. Mirrors the EPK Bio slide:
// circular avatar (or default silhouette), artist name in display sans, bio in UI
// sans, social-icon row.  Also exports StripeFill + Avatar helpers reused by steps.

// Subtly-striped placeholder for user-supplied imagery (no hand-drawn art).
function StripeFill({ radius = 0, label, dark = false, style = {} }) {
  const line = dark ? 'rgba(255,255,255,0.10)' : 'rgba(17,19,26,0.07)';
  const base = dark ? '#23262F' : '#F2F0EA';
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: radius,
      background: `repeating-linear-gradient(-45deg, ${base} 0 7px, ${dark ? '#1d2027' : '#EAE7DF'} 7px 14px)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', ...style,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `repeating-linear-gradient(-45deg, transparent 0 13px, ${line} 13px 14px)`,
      }} />
      {label && (
        <span style={{
          position: 'relative', fontFamily: 'var(--font-mono)', fontSize: 10,
          letterSpacing: '0.04em', color: dark ? 'rgba(255,255,255,0.55)' : '#6B6F7A',
          textTransform: 'lowercase', padding: '2px 6px',
          background: dark ? 'rgba(14,16,20,0.55)' : 'rgba(255,255,255,0.6)', borderRadius: 4,
        }}>{label}</span>
      )}
    </div>
  );
}

// Avatar — circular. Renders the user's photo when present, else a striped slot
// (the "add a photo" affordance in the form) or the default grey silhouette.
function Avatar({ size = 72, photo = false, silhouette = false, addable = false, dark = true }) {
  const ring = dark ? 'rgba(255,255,255,0.14)' : 'var(--border)';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', position: 'relative',
      overflow: 'hidden', flexShrink: 0,
      boxShadow: `inset 0 0 0 1px ${ring}`,
      background: silhouette ? (dark ? '#23262F' : '#E7E4DC') : 'transparent',
    }}>
      {photo
        ? <StripeFill radius={size} dark={dark} />
        : silhouette
          ? <div style={{ position: 'absolute', left: '50%', top: '54%', transform: 'translate(-50%,-50%)' }}>
              <Icon name="User" size={Math.round(size * 0.52)}
                color={dark ? 'rgba(255,255,255,0.32)' : 'rgba(17,19,26,0.30)'}
                fill={dark ? 'rgba(255,255,255,0.32)' : 'rgba(17,19,26,0.30)'} strokeWidth={1.5} />
            </div>
          : (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 3,
              background: dark ? '#23262F' : 'var(--surface-muted)',
              border: addable ? `1.5px dashed ${dark ? 'rgba(255,255,255,0.28)' : 'rgba(17,19,26,0.22)'}` : 'none',
              borderRadius: '50%',
            }}>
              <Icon name="Camera" size={Math.round(size * 0.32)}
                color={dark ? 'rgba(255,255,255,0.6)' : '#6B6F7A'} strokeWidth={1.75} />
            </div>
          )}
    </div>
  );
}

// Small filled social glyph chips, matching the EPK bio slide social row.
function SocialRow({ handles = [], dark = true }) {
  const filled = handles
    .map(h => (typeof h === 'string' ? { platform: '', value: h } : h))
    .filter(h => h && h.value && String(h.value).trim());
  if (filled.length === 0) return null;
  const icon = { instagram: 'Instagram', tiktok: 'Music', soundcloud: 'Cloud', spotify: 'Cloud' };
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      {filled.map((h, i) => (
        <div key={i} style={{
          width: 26, height: 26, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: dark ? 'rgba(255,255,255,0.10)' : 'var(--surface-muted)',
        }}>
          <Icon name={icon[h.platform] || 'AtSign'} size={14} color={dark ? '#fff' : 'var(--fg)'} strokeWidth={1.9} />
        </div>
      ))}
    </div>
  );
}

// The artist card — dark, designed at a native 360px width and scaled down to
// `width`. Anatomy (top → bottom): banner + gradient · avatar+name row ·
// bio · socials/songs columns · promo grid (or empty state) · logo footer.
function ShareCardPreview({
  name = '', bio = '', handles = [], songs = [], promos = [], photo = false,
  banner = false, width = 360, emptyPromos = 'Your promos will show here',
}) {
  const k = width / 360;                       // scale factor from native 360
  const px = (n) => Math.round(n * k);
  const displayName = (name && name.trim()) || 'Your name';
  const isPlaceholderName = !(name && name.trim());
  const hasBio = !!(bio && bio.trim());
  const socials = handles.filter(h => h && (typeof h === 'string' ? h.trim() : h.value && String(h.value).trim()));

  const colLabel = {
    fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: px(10), letterSpacing: '0.16em',
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)', margin: 0,
  };
  const colEmpty = {
    fontFamily: 'var(--font-ui)', fontSize: px(12), color: 'rgba(255,255,255,0.32)',
    marginTop: px(7), lineHeight: 1.3,
  };

  return (
    <div style={{
      width, borderRadius: px(20), background: '#0E1014', position: 'relative',
      overflow: 'hidden', flexShrink: 0,
      boxShadow: '0 18px 40px rgba(17,19,26,0.20), 0 0 0 1px rgba(17,19,26,0.06)',
    }}>
      {/* 1 · banner (16:9) + gradient overlay */}
      <div style={{ position: 'relative', width: '100%', height: px(360 * 9 / 16) }}>
        {banner
          ? <StripeFill dark />
          : <StripeFill dark label="banner" />}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(14,16,20,0) 40%, rgba(14,16,20,0.85) 100%)',
        }} />
      </div>

      {/* 2 · avatar (left) + name (right), avatar overlapping the banner */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: px(14),
        padding: `0 ${px(20)}px`, marginTop: px(-40),
      }}>
        <div style={{ borderRadius: '50%', boxShadow: `0 0 0 ${px(3)}px #0E1014`, flexShrink: 0 }}>
          <Avatar size={px(76)} photo={photo} silhouette={!photo} dark />
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingBottom: px(6) }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: px(28), lineHeight: 1.04, letterSpacing: '-0.02em',
            color: isPlaceholderName ? 'rgba(255,255,255,0.40)' : '#fff',
            textWrap: 'balance', wordBreak: 'break-word',
          }}>{displayName}</div>
        </div>
      </div>

      {/* 3 · bio */}
      {hasBio && (
        <div style={{
          padding: `${px(12)}px ${px(20)}px 0`,
          fontFamily: 'var(--font-ui)', fontWeight: 400, fontSize: px(14), lineHeight: 1.45,
          color: 'rgba(255,255,255,0.66)',
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{bio.trim()}</div>
      )}

      {/* 4 · two columns — socials / songs */}
      <div style={{ display: 'flex', gap: px(16), padding: `${px(18)}px ${px(20)}px 0` }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={colLabel}>Socials</p>
          {socials.length
            ? <div style={{ marginTop: px(9) }}><SocialRow handles={handles} dark /></div>
            : <div style={colEmpty}>—</div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={colLabel}>Songs</p>
          {songs.length
            ? <div style={colEmpty}>{songs.length} linked</div>
            : <div style={colEmpty}>—</div>}
        </div>
      </div>

      {/* 5 · music promos grid (3 thumbs) or empty state */}
      <div style={{ padding: `${px(18)}px ${px(20)}px 0` }}>
        <p style={colLabel}>Music Promos</p>
        {promos.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: px(7), marginTop: px(9) }}>
            {promos.slice(0, 3).map((_, i) => (
              <div key={i} style={{ position: 'relative', aspectRatio: '9 / 16', borderRadius: px(8), overflow: 'hidden' }}>
                <StripeFill dark radius={px(8)} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            marginTop: px(9), height: px(86), borderRadius: px(10),
            border: '1px dashed rgba(255,255,255,0.16)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-ui)', fontSize: px(13), color: 'rgba(255,255,255,0.34)',
          }}>{emptyPromos}</div>
        )}
      </div>

      {/* 6 · logo footer */}
      <div style={{
        marginTop: px(18), padding: `${px(14)}px ${px(20)}px`,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: px(7),
      }}>
        <span style={{ width: px(6), height: px(6), borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
        <span style={{
          fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: px(11), letterSpacing: '0.18em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)',
        }}>MusicPromo</span>
      </div>
    </div>
  );
}

Object.assign(window, { StripeFill, Avatar, SocialRow, ShareCardPreview });
