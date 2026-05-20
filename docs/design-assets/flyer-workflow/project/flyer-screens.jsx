// FlyerScreens.jsx — Each screen of the flyer workflow as an iOS app screen
// Light theme for browsing, dark theme for editing (per MusicPromo design system)

const tokens = {
  light: { bg: '#FFFFFF', surface: '#F5F5F5', surfaceMuted: '#EEEEEE', text: '#000', textSecondary: '#4A4A4A', border: '#D6D6D6' },
  dark: { bg: '#000000', surface: '#111111', surfaceMuted: '#1A1A1A', text: '#FFF', textSecondary: '#B3B3B3', border: '#2A2A2A' },
  font: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

// Striped placeholder for image slots
function PlaceholderImg({ label = 'photo', dark = false }) {
  const stroke = dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)';
  const bg = dark ? '#1A1A1A' : '#EEEEEE';
  const text = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
  return (
    <div style={{
      width: '100%', height: '100%', background: bg, position: 'relative',
      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <pattern id={`stripe-${label}`} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke={stroke} strokeWidth="2"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#stripe-${label})`}/>
      </svg>
      <div style={{
        position: 'relative', fontFamily: 'ui-monospace, "SF Mono", monospace',
        fontSize: 11, color: text, fontWeight: 500, letterSpacing: '0.5px',
      }}>{label}</div>
    </div>
  );
}

// ───────── 1. Create menu (light theme bottom sheet feel) ─────────
function ScreenCreateMenu() {
  const t = tokens.light;
  const options = [
    { title: 'Music Promo', desc: 'Photo + audio · 9:16 / 1:1', icon: '💿' },
    { title: 'Song Press Kit', desc: 'Carousel for press releases', icon: '📰' },
    { title: 'Show Flyer', desc: 'Event announcement · video or image', icon: '🎟️', highlight: true },
  ];
  return (
    <div style={{ height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', fontFamily: tokens.font, color: t.text }}>
      <div style={{ padding: '60px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ width: 40 }}/>
        <div style={{ fontSize: 17, fontWeight: 600 }}>Create</div>
        <button style={{ width: 40, height: 40, border: 'none', background: 'transparent', fontSize: 22, color: t.text }}>×</button>
      </div>
      <div style={{ padding: '32px 20px 0' }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 8 }}>What are you making?</div>
        <div style={{ fontSize: 16, color: t.textSecondary, marginBottom: 32 }}>Pick a format to get started.</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {options.map((o, i) => (
            <div key={i} style={{
              padding: 20, borderRadius: 20,
              background: o.highlight ? t.text : t.surface,
              color: o.highlight ? t.bg : t.text,
              display: 'flex', alignItems: 'center', gap: 16,
              border: o.highlight ? 'none' : `1px solid ${t.border}`,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 12,
                background: o.highlight ? 'rgba(255,255,255,0.12)' : t.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, flexShrink: 0,
              }}>{o.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 600 }}>{o.title}</div>
                <div style={{ fontSize: 13, opacity: o.highlight ? 0.7 : 1, color: o.highlight ? 'rgba(255,255,255,0.7)' : t.textSecondary, marginTop: 2 }}>{o.desc}</div>
              </div>
              <div style={{ fontSize: 18, opacity: 0.5 }}>›</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ───────── 2. Flyer picker — light theme, audio + photo + event info ─────────
function ScreenFlyerPicker() {
  const t = tokens.light;
  return (
    <div style={{ height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', fontFamily: tokens.font, color: t.text }}>
      {/* nav */}
      <div style={{ padding: '60px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button style={{ background: 'transparent', border: 'none', fontSize: 17, color: t.text, padding: 0 }}>Cancel</button>
        <div style={{ fontSize: 17, fontWeight: 600 }}>New Flyer</div>
        <button style={{ background: t.text, color: t.bg, border: 'none', borderRadius: 16, padding: '6px 14px', fontSize: 15, fontWeight: 600 }}>Next</button>
      </div>

      {/* scrollable form */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 40px' }}>
        {/* Audio card */}
        <div style={{
          background: t.surface, borderRadius: 20, padding: 20, marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, background: t.surfaceMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🎵</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Add Audio</div>
            <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 2 }}>Optional · 10–30 sec clip</div>
          </div>
          <div style={{ fontSize: 18, color: t.textSecondary }}>+</div>
        </div>

        {/* Photo card with placeholder */}
        <div style={{
          background: t.surface, borderRadius: 20, padding: 20, marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden' }}>
            <PlaceholderImg label="photo"/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Add Photo</div>
            <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 2 }}>Custom artwork · optional</div>
          </div>
          <div style={{ fontSize: 18, color: t.textSecondary }}>+</div>
        </div>

        {/* Event details section */}
        <div style={{ fontSize: 13, fontWeight: 600, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, padding: '0 4px' }}>Event Details</div>

        <div style={{ background: t.surface, borderRadius: 20, overflow: 'hidden' }}>
          {[
            { label: 'Event Name', value: 'Disco at Dusk', placeholder: 'Title of your show' },
            { label: 'Date', value: 'Sat, Apr 25', placeholder: 'Select date' },
            { label: 'Time', value: '4PM – 8PM', placeholder: 'Start and end' },
            { label: 'Venue', value: 'Neon Grotto Rooftop', placeholder: 'Where it\'s at' },
            { label: 'City', value: 'Austin, TX', placeholder: 'City, state' },
          ].map((f, i, arr) => (
            <div key={i} style={{
              padding: '14px 16px',
              borderBottom: i < arr.length - 1 ? `1px solid ${t.border}` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: t.text }}>{f.label}</div>
              <div style={{ fontSize: 15, color: f.value ? t.text : t.textSecondary, fontWeight: f.value ? 500 : 400 }}>
                {f.value || f.placeholder}
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 12, padding: '0 4px', lineHeight: 1.4 }}>
          You'll pick a template and customize colors, fonts, and layout on the next screen.
        </div>
      </div>
    </div>
  );
}

// ───────── 3. Flyer editor — dark theme, large preview + control sheet ─────────
function ScreenFlyerEditor({ TemplateComponent = HeatTemplate, templateLabel = 'Heat' }) {
  const t = tokens.dark;
  return (
    <div style={{ height: '100%', background: t.bg, fontFamily: tokens.font, color: t.text, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* nav */}
      <div style={{ padding: '60px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 5 }}>
        <button style={{ background: 'transparent', border: 'none', color: t.text, fontSize: 24, padding: 0, width: 40, textAlign: 'left' }}>×</button>
        <div style={{ fontSize: 14, fontWeight: 500, color: t.textSecondary }}>Disco at Dusk</div>
        <button style={{ background: t.text, color: t.bg, border: 'none', borderRadius: 16, padding: '6px 14px', fontSize: 15, fontWeight: 600 }}>Export</button>
      </div>

      {/* preview area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 24px 0', position: 'relative' }}>
        {/* aspect ratio badge */}
        <div style={{
          position: 'absolute', top: 0, right: 24,
          background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
          padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, letterSpacing: '0.5px',
        }}>9:16</div>

        <div style={{ width: 220, height: 391, borderRadius: 12, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
          <TemplateComponent scale={0.55}/>
        </div>
      </div>

      {/* bottom control sheet */}
      <div style={{
        background: t.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: '16px 0 28px', borderTop: `1px solid ${t.border}`,
      }}>
        {/* template rail */}
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Template</div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
            {[
              { name: 'Heat', active: templateLabel === 'Heat' },
              { name: 'Iridescent', active: templateLabel === 'Iridescent' },
              { name: 'Vintage', active: templateLabel === 'Vintage' },
            ].map((tpl, i) => (
              <div key={i} style={{
                padding: '8px 16px', borderRadius: 20,
                background: tpl.active ? t.text : t.surfaceMuted,
                color: tpl.active ? t.bg : t.text,
                fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                border: tpl.active ? 'none' : `1px solid ${t.border}`,
              }}>{tpl.name}</div>
            ))}
          </div>
        </div>

        {/* tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '12px 16px 0', borderTop: `1px solid ${t.border}`, marginTop: 4 }}>
          {['Text', 'Colors', 'Fonts', 'Photo', 'Audio'].map((tab, i) => (
            <div key={i} style={{
              flex: 1, padding: '10px 8px', textAlign: 'center', fontSize: 13, fontWeight: 600,
              color: i === 1 ? t.text : t.textSecondary,
              borderBottom: i === 1 ? `2px solid ${t.text}` : '2px solid transparent',
            }}>{tab}</div>
          ))}
        </div>

        {/* color picker content */}
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 10, letterSpacing: '0.5px' }}>BACKGROUND</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, overflowX: 'auto' }}>
            {[
              'linear-gradient(135deg, #6a5a18 0%, #3a1a18 65%, #1a0808 100%)',
              'linear-gradient(135deg, #ffcce7, #b3d9ff)',
              'linear-gradient(135deg, #c89568, #6a7560)',
              'linear-gradient(135deg, #FF6B35, #F7C59F)',
              'linear-gradient(135deg, #2E294E, #1B998B)',
              '#000000',
            ].map((bg, i) => (
              <div key={i} style={{
                width: 44, height: 44, borderRadius: '50%', background: bg, flexShrink: 0,
                border: i === 0 ? `3px solid ${t.text}` : `2px solid ${t.border}`,
                boxShadow: i === 0 ? '0 0 0 2px rgba(255,255,255,0.2)' : 'none',
              }}/>
            ))}
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 10, letterSpacing: '0.5px' }}>ACCENT</div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto' }}>
            {['#FFD936', '#FF6B6B', '#FFFFFF', '#A8E6CF', '#B3D9FF', '#D6B3FF'].map((c, i) => (
              <div key={i} style={{
                width: 44, height: 44, borderRadius: '50%', background: c, flexShrink: 0,
                border: i === 0 ? `3px solid ${t.text}` : `2px solid ${t.border}`,
                boxShadow: i === 0 ? '0 0 0 2px rgba(255,255,255,0.2)' : 'none',
              }}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────── 4. Editor — Text tab (showing inline editing) ─────────
function ScreenFlyerEditorText() {
  const t = tokens.dark;
  return (
    <div style={{ height: '100%', background: t.bg, fontFamily: tokens.font, color: t.text, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '60px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button style={{ background: 'transparent', border: 'none', color: t.text, fontSize: 24, padding: 0, width: 40, textAlign: 'left' }}>×</button>
        <div style={{ fontSize: 14, fontWeight: 500, color: t.textSecondary }}>Disco at Dusk</div>
        <button style={{ background: t.text, color: t.bg, border: 'none', borderRadius: 16, padding: '6px 14px', fontSize: 15, fontWeight: 600 }}>Export</button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 24px 0', position: 'relative' }}>
        <div style={{ width: 220, height: 391, borderRadius: 12, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', position: 'relative' }}>
          <HeatTemplate scale={0.55}/>
          {/* selection indicator on the title */}
          <div style={{
            position: 'absolute', top: 95, left: 30, right: 30, height: 60,
            border: '2px solid #FFD936', borderRadius: 4,
            background: 'rgba(255,217,54,0.12)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
          }}>
            <div style={{
              background: '#FFD936', color: '#000', fontSize: 10, fontWeight: 700,
              padding: '2px 6px', borderRadius: 2, marginBottom: -20,
            }}>Title</div>
          </div>
        </div>
      </div>

      <div style={{ background: t.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: '16px 0 28px', borderTop: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', gap: 4, padding: '0 16px 12px' }}>
          {['Text', 'Colors', 'Fonts', 'Photo', 'Audio'].map((tab, i) => (
            <div key={i} style={{
              flex: 1, padding: '10px 8px', textAlign: 'center', fontSize: 13, fontWeight: 600,
              color: i === 0 ? t.text : t.textSecondary,
              borderBottom: i === 0 ? `2px solid ${t.text}` : '2px solid transparent',
            }}>{tab}</div>
          ))}
        </div>

        <div style={{ padding: '8px 16px 0' }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary, letterSpacing: '0.5px', marginBottom: 6 }}>EYEBROW</div>
            <div style={{ background: t.surfaceMuted, borderRadius: 10, padding: '12px 14px', fontSize: 15, border: `1px solid ${t.border}` }}>
              ROOFTOP DAY PARTY
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary, letterSpacing: '0.5px', marginBottom: 6 }}>TITLE</div>
            <div style={{ background: t.surfaceMuted, borderRadius: 10, padding: '12px 14px', fontSize: 15, border: '2px solid #FFD936', color: t.text }}>
              DISCO<span style={{ background: '#FFD936', color: '#000', marginLeft: 2, width: 1, display: 'inline-block', height: 16, verticalAlign: 'middle' }}/>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary, letterSpacing: '0.5px', marginBottom: 6 }}>SUBTITLE</div>
            <div style={{ background: t.surfaceMuted, borderRadius: 10, padding: '12px 14px', fontSize: 15, border: `1px solid ${t.border}` }}>
              at dusk
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────── 5. Audio trim screen ─────────
function ScreenFlyerEditorAudio() {
  const t = tokens.dark;
  // mock waveform bars
  const bars = Array.from({ length: 60 }, (_, i) => 20 + Math.abs(Math.sin(i * 0.4)) * 60 + Math.random() * 20);
  return (
    <div style={{ height: '100%', background: t.bg, fontFamily: tokens.font, color: t.text, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '60px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button style={{ background: 'transparent', border: 'none', color: t.text, fontSize: 24, padding: 0, width: 40, textAlign: 'left' }}>×</button>
        <div style={{ fontSize: 14, fontWeight: 500, color: t.textSecondary }}>Disco at Dusk</div>
        <button style={{ background: t.text, color: t.bg, border: 'none', borderRadius: 16, padding: '6px 14px', fontSize: 15, fontWeight: 600 }}>Export</button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 24px 0' }}>
        <div style={{ width: 220, height: 391, borderRadius: 12, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
          <HeatTemplate scale={0.55}/>
        </div>
      </div>

      <div style={{ background: t.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: '16px 0 28px', borderTop: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', gap: 4, padding: '0 16px 16px' }}>
          {['Text', 'Colors', 'Fonts', 'Photo', 'Audio'].map((tab, i) => (
            <div key={i} style={{
              flex: 1, padding: '10px 8px', textAlign: 'center', fontSize: 13, fontWeight: 600,
              color: i === 4 ? t.text : t.textSecondary,
              borderBottom: i === 4 ? `2px solid ${t.text}` : '2px solid transparent',
            }}>{tab}</div>
          ))}
        </div>

        <div style={{ padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>floppy_disko_set.mp3</div>
              <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>0:08 selected of 4:22</div>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: t.text, color: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>▶</div>
          </div>

          {/* waveform */}
          <div style={{
            background: t.surfaceMuted, borderRadius: 10, padding: '14px 12px',
            display: 'flex', alignItems: 'center', gap: 2, height: 80, position: 'relative',
          }}>
            {bars.map((h, i) => (
              <div key={i} style={{
                flex: 1, height: `${h}%`,
                background: i >= 20 && i <= 35 ? t.text : t.border,
                borderRadius: 1,
              }}/>
            ))}
            {/* trim handles */}
            <div style={{ position: 'absolute', left: '33%', top: 0, bottom: 0, width: 3, background: '#FFD936', borderRadius: 2 }}/>
            <div style={{ position: 'absolute', left: '58%', top: 0, bottom: 0, width: 3, background: '#FFD936', borderRadius: 2 }}/>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: t.textSecondary, marginTop: 6, fontFamily: 'ui-monospace, monospace' }}>
            <span>1:24</span>
            <span style={{ color: '#FFD936', fontWeight: 600 }}>0:08 clip</span>
            <span>1:32</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────── 6. Export sheet ─────────
function ScreenFlyerExport() {
  const t = tokens.dark;
  return (
    <div style={{ height: '100%', background: t.bg, fontFamily: tokens.font, color: t.text, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '60px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button style={{ background: 'transparent', border: 'none', color: t.text, fontSize: 24, padding: 0, width: 40, textAlign: 'left' }}>×</button>
        <div style={{ fontSize: 17, fontWeight: 600 }}>Export</div>
        <div style={{ width: 40 }}/>
      </div>

      <div style={{ flex: 1, padding: '20px 20px 0', display: 'flex', flexDirection: 'column' }}>
        {/* preview */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{ width: 180, height: 320, borderRadius: 12, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
            <HeatTemplate scale={0.45}/>
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Format</div>

        {/* Video option */}
        <div style={{
          background: t.surface, borderRadius: 16, padding: 16, marginBottom: 10,
          border: `2px solid ${t.text}`, display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: t.surfaceMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎥</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Video · MP4</div>
            <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>With audio · 8 seconds · 9:16</div>
          </div>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: t.text, color: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>✓</div>
        </div>

        {/* Image option */}
        <div style={{
          background: t.surface, borderRadius: 16, padding: 16, marginBottom: 20,
          border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: t.surfaceMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🖼️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Image · PNG</div>
            <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>Static · 1080×1920 · print-ready</div>
          </div>
          <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${t.border}` }}/>
        </div>

        {/* aspect toggle */}
        <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Aspect Ratio</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <div style={{ flex: 1, padding: '12px 0', borderRadius: 10, background: t.text, color: t.bg, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>9:16 Story</div>
          <div style={{ flex: 1, padding: '12px 0', borderRadius: 10, background: t.surfaceMuted, color: t.text, textAlign: 'center', fontSize: 14, fontWeight: 600, border: `1px solid ${t.border}` }}>4:5 Post</div>
        </div>

        {/* CTAs */}
        <button style={{
          width: '100%', padding: '14px 0', borderRadius: 12,
          background: 'linear-gradient(90deg, #F58529 0%, #DD2A7B 50%, #8134AF 100%)',
          color: '#fff', border: 'none', fontSize: 16, fontWeight: 600, marginBottom: 8,
        }}>Share to Instagram</button>
        <button style={{
          width: '100%', padding: '14px 0', borderRadius: 12,
          background: 'transparent', color: t.text, border: `1.5px solid ${t.border}`,
          fontSize: 16, fontWeight: 600, marginBottom: 8,
        }}>Share to TikTok</button>
        <div style={{ fontSize: 12, color: t.textSecondary, textAlign: 'center', marginTop: 4 }}>Saved to your camera roll</div>
      </div>
    </div>
  );
}

Object.assign(window, {
  ScreenCreateMenu, ScreenFlyerPicker, ScreenFlyerEditor,
  ScreenFlyerEditorText, ScreenFlyerEditorAudio, ScreenFlyerExport,
  PlaceholderImg, tokens,
});
