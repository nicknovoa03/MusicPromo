// FlyerTemplates.jsx — 3 flyer template designs inspired by user references
// Designed to render at any aspect ratio (9:16 or 4:5)

// ──────────────────────────────────────────────────────────
// Shared: SVG noise/grain filter
// ──────────────────────────────────────────────────────────
function NoiseDefs({ id = 'flyer-grain' }) {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden>
      <defs>
        <filter id={id}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0"/>
          <feComposite in2="SourceGraphic" operator="in"/>
        </filter>
        <filter id={id + '-halftone'}>
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch"/>
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 0"/>
          <feComponentTransfer><feFuncA type="discrete" tableValues="0 0 0 0 1"/></feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}

// Watermark (small, like promo videos)
function Watermark({ dark = false }) {
  return (
    <div style={{
      position: 'absolute', bottom: 10, right: 10, zIndex: 10,
      fontFamily: 'Inter, sans-serif', fontSize: 8, fontWeight: 600,
      letterSpacing: '0.5px', textTransform: 'uppercase',
      color: dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)',
      padding: '3px 6px', borderRadius: 3,
      background: dark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.4)',
      backdropFilter: 'blur(4px)',
    }}>
      MusicPromo
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// TEMPLATE 1 — "HEAT" (inspired by DISCO at dusk / textured halftone)
// ──────────────────────────────────────────────────────────
function HeatTemplate({ data = {}, scale = 1, showWatermark = true }) {
  const d = {
    badge: 'HAPPY HOUR · 4-7PM',
    eyebrow: 'ROOFTOP DAY PARTY',
    title: 'DISCO',
    subtitle: 'at dusk',
    tagline: 'house / disco / grooves',
    lineup: [
      { time: '4PM', name: 'MARLEY MAC' },
      { time: '5PM', name: 'KIWI' },
      { time: '6PM', name: 'SHELZ' },
      { time: '7PM', name: 'DH(A)D' },
    ],
    footer: 'SAT APR 25  |  4PM-8PM  |  NEON GROTTO ROOFTOP',
    ...data,
  };
  const s = (n) => n * scale;
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 40%, #6a5a18 0%, #3a1a18 65%, #1a0808 100%)',
      fontFamily: 'Inter, sans-serif', color: '#fff',
    }}>
      {/* halftone texture overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.4) 1px, transparent 1.5px)',
        backgroundSize: '4px 4px', opacity: 0.6, mixBlendMode: 'multiply',
      }}/>
      {/* grain */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"200\"><filter id=\"n\"><feTurbulence baseFrequency=\"0.9\" numOctaves=\"2\"/></filter><rect width=\"200\" height=\"200\" filter=\"url(%23n)\" opacity=\"0.4\"/></svg>')",
        mixBlendMode: 'overlay', opacity: 0.5,
      }}/>
      {/* corner badge */}
      <div style={{
        position: 'absolute', top: s(14), right: s(-8),
        transform: 'rotate(8deg)', background: '#FFD936',
        padding: `${s(6)}px ${s(12)}px`, color: '#000',
        fontSize: s(9), fontWeight: 800, letterSpacing: '0.5px',
        fontStyle: 'italic',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>{d.badge}</div>

      {/* content */}
      <div style={{ padding: `${s(60)}px ${s(20)}px ${s(28)}px`, height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: s(10), fontWeight: 700, letterSpacing: s(3), color: '#FFD936', marginBottom: s(8) }}>
            {d.eyebrow}
          </div>
          <div style={{
            fontFamily: 'Anton, Inter, sans-serif',
            fontSize: s(72), fontWeight: 900, lineHeight: 0.85,
            letterSpacing: '-2px', textTransform: 'uppercase',
            textShadow: '2px 2px 0 rgba(0,0,0,0.2)',
          }}>{d.title}</div>
          <div style={{
            fontFamily: 'Caveat, cursive',
            fontSize: s(38), fontWeight: 700, fontStyle: 'italic',
            marginTop: s(-4), color: '#fff',
          }}>{d.subtitle}</div>
          <div style={{
            fontSize: s(11), fontWeight: 500, color: '#FFD936',
            marginTop: s(4), letterSpacing: '1px',
          }}>{d.tagline}</div>

          {/* lineup grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: `${s(14)}px ${s(12)}px`, marginTop: s(24),
          }}>
            {d.lineup.map((act, i) => (
              <div key={i}>
                <div style={{ fontSize: s(10), color: '#FFD936', fontWeight: 600, marginBottom: s(2) }}>{act.time}</div>
                <div style={{
                  fontFamily: 'Anton, sans-serif',
                  fontSize: s(20), fontWeight: 800, letterSpacing: '1px',
                }}>{act.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* footer */}
        <div style={{
          fontSize: s(9), letterSpacing: s(1.5), fontWeight: 600,
          textAlign: 'center', color: '#fff',
          paddingTop: s(12), borderTop: '1px solid rgba(255,217,54,0.3)',
        }}>{d.footer}</div>
      </div>
      {showWatermark && <Watermark dark={true} />}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// TEMPLATE 2 — "IRIDESCENT" (inspired by EUPHOR EASTER / holographic)
// ──────────────────────────────────────────────────────────
function IridescentTemplate({ data = {}, scale = 1, showWatermark = true }) {
  const d = {
    presenter: 'JAXX EVENTS & HIGHLAND PRESENT',
    titleA: 'EUPHOR',
    titleB: 'EASTER',
    subtitle: 'highland basement party',
    artists: 'kiwi  ×  FVLL3N 3GO',
    genres: 'HOUSE / TECHNO / DISCO / GHETTOTECH',
    age: '18+',
    date: 'SUNDAY APRIL 5',
    time: '8PM — LATE',
    venue: '404 COLORADO ST, AUSTIN, TX',
    ...data,
  };
  const s = (n) => n * scale;
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
      background: 'linear-gradient(135deg, #ffcce7 0%, #ffe09e 18%, #c6f0d4 35%, #b3d9ff 55%, #d6b3ff 75%, #ffc8d8 100%)',
      fontFamily: 'Inter, sans-serif', color: '#000',
    }}>
      {/* iridescent shimmer overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(45deg, rgba(255,200,255,0.4) 0%, rgba(200,255,255,0.3) 25%, rgba(255,255,200,0.3) 50%, rgba(255,200,200,0.4) 75%, rgba(200,200,255,0.4) 100%)',
        mixBlendMode: 'screen',
      }}/>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"200\"><filter id=\"n\"><feTurbulence baseFrequency=\"0.85\" numOctaves=\"3\"/></filter><rect width=\"200\" height=\"200\" filter=\"url(%23n)\" opacity=\"0.35\"/></svg>')",
        mixBlendMode: 'overlay', opacity: 0.6,
      }}/>

      <div style={{ padding: `${s(24)}px ${s(18)}px`, height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', position: 'relative' }}>
        {/* top corner badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: s(12) }}>
          <div style={{
            width: s(30), height: s(30), borderRadius: '50%', background: '#000',
            color: '#fff', fontSize: s(7), fontWeight: 800, display: 'flex',
            alignItems: 'center', justifyContent: 'center', textAlign: 'center', lineHeight: 1,
          }}>CALI<br/>POOL</div>
          <div style={{
            padding: `${s(4)}px ${s(8)}px`, borderRadius: s(12), border: '1.5px solid #000',
            fontSize: s(7), fontWeight: 800, letterSpacing: '0.5px',
          }}>JAXX EVENTS</div>
        </div>

        {/* presenter line */}
        <div style={{ textAlign: 'center', fontSize: s(9), fontWeight: 700, letterSpacing: s(1.5), marginTop: s(8) }}>
          {d.presenter}
        </div>

        {/* huge condensed title */}
        <div style={{ textAlign: 'center', marginTop: s(8), flex: 1 }}>
          <div style={{
            fontFamily: 'Bebas Neue, Anton, sans-serif',
            fontSize: s(68), fontWeight: 900, lineHeight: 0.88,
            letterSpacing: '-1px', color: '#000',
            filter: 'contrast(1.1)',
          }}>{d.titleA}</div>
          <div style={{
            fontFamily: 'Bebas Neue, Anton, sans-serif',
            fontSize: s(68), fontWeight: 900, lineHeight: 0.88,
            letterSpacing: '-1px', color: '#000',
            marginTop: s(-2),
          }}>{d.titleB}</div>

          <div style={{ fontSize: s(13), fontWeight: 500, marginTop: s(14), color: '#000' }}>
            {d.subtitle}
          </div>

          {/* artists pill */}
          <div style={{
            display: 'inline-block', marginTop: s(24),
            border: '2px solid #000', borderRadius: s(40),
            padding: `${s(8)}px ${s(20)}px`,
            fontFamily: 'Anton, sans-serif',
            fontSize: s(22), fontWeight: 800, letterSpacing: '0.5px',
          }}>{d.artists}</div>

          <div style={{ fontSize: s(9), fontWeight: 600, marginTop: s(12), letterSpacing: s(0.5) }}>
            {d.genres}
          </div>
        </div>

        {/* footer with details */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: s(9), fontWeight: 600, lineHeight: 1.4 }}>
          <div>
            <div style={{ fontSize: s(11), fontWeight: 800 }}>{d.age}</div>
            <div>{d.time}</div>
            <div>{d.date}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ width: s(22), height: s(22), background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto', marginBottom: s(4), fontSize: s(10), fontWeight: 900 }}>H</div>
            <div>{d.venue}</div>
          </div>
        </div>
      </div>
      {showWatermark && <Watermark dark={false} />}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// TEMPLATE 3 — "VINTAGE" (inspired by Thursday Night Fever / warm grainy)
// ──────────────────────────────────────────────────────────
function VintageTemplate({ data = {}, scale = 1, showWatermark = true }) {
  const d = {
    overline: 'thursday',
    titleA: 'NIGHT',
    titleB: 'FEVER',
    subtitle: 'sahara lounge dance party',
    djLabel: 'WITH DJs',
    djs: ['DH(A)D', 'KIWI'],
    date: 'THURS MAY 14',
    venue: 'SAHARA LOUNGE',
    time: '8PM - 12AM',
    ...data,
  };
  const s = (n) => n * scale;
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
      background: 'radial-gradient(ellipse at 30% 30%, #c89568 0%, #a8856a 30%, #888070 55%, #6a7560 80%, #4a5450 100%)',
      fontFamily: 'Inter, sans-serif', color: '#1a0e08',
    }}>
      {/* warm haze */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 70% 20%, rgba(255,160,80,0.4) 0%, transparent 50%)',
      }}/>
      {/* grain */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"200\"><filter id=\"n\"><feTurbulence baseFrequency=\"1.2\" numOctaves=\"3\"/></filter><rect width=\"200\" height=\"200\" filter=\"url(%23n)\" opacity=\"0.5\"/></svg>')",
        mixBlendMode: 'overlay', opacity: 0.7,
      }}/>

      <div style={{ padding: `${s(24)}px ${s(20)}px`, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', boxSizing: 'border-box' }}>
        {/* overline script */}
        <div style={{
          fontFamily: 'Pinyon Script, Allura, cursive',
          fontSize: s(58), fontWeight: 400, color: '#1a0e08',
          lineHeight: 0.9, transform: 'rotate(-3deg)',
          marginLeft: s(20), marginTop: s(20),
        }}>{d.overline}</div>

        {/* big bold title — overlapping */}
        <div style={{ marginTop: s(-12), flex: 1 }}>
          <div style={{
            fontFamily: 'Anton, sans-serif',
            fontSize: s(96), fontWeight: 900, lineHeight: 0.85,
            letterSpacing: '-2px', color: '#1a0e08',
            textAlign: 'left', marginLeft: s(-4),
          }}>{d.titleA}</div>
          <div style={{
            fontFamily: 'Anton, sans-serif',
            fontSize: s(96), fontWeight: 900, lineHeight: 0.85,
            letterSpacing: '-2px', color: '#1a0e08',
            marginTop: s(-12), marginLeft: s(-4),
          }}>{d.titleB}</div>

          {/* DJ pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: s(10),
            marginTop: s(20), padding: `${s(8)}px ${s(16)}px`,
            border: '2px solid #1a0e08', borderRadius: s(40),
            background: 'rgba(255,240,220,0.2)',
          }}>
            <div style={{ fontSize: s(8), fontWeight: 700, letterSpacing: '0.5px' }}>{d.djLabel}</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              {d.djs.map((dj, i) => (
                <div key={i} style={{ fontFamily: 'Anton, sans-serif', fontSize: s(13), fontWeight: 800, lineHeight: 1.1 }}>{dj}</div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: s(9), fontWeight: 600, marginTop: s(16), letterSpacing: s(1) }}>
            {d.subtitle.toUpperCase()}
          </div>
        </div>

        {/* footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: s(10), fontWeight: 700, letterSpacing: '0.5px' }}>
          <div>{d.date}</div>
          <div style={{ fontFamily: 'Pinyon Script, cursive', fontSize: s(20), fontWeight: 400 }}>{d.venue}</div>
          <div>{d.time}</div>
        </div>
      </div>
      {showWatermark && <Watermark dark={false} />}
    </div>
  );
}

Object.assign(window, { HeatTemplate, IridescentTemplate, VintageTemplate, NoiseDefs, Watermark });
