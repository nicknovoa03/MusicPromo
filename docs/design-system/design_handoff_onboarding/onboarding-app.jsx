// onboarding-app.jsx — wizard shell: header (back / progress / skip),
// step body with iOS push transition, sticky black-fill CTA, faux permission
// alert, finish state, + Tweaks. Persists place & profile to localStorage.

const { useState, useEffect, useRef } = React;

const STEPS = [
  { id: 'value',       Body: window.StepValue,      cta: 'Get started' },
  { id: 'flow',        Body: window.StepFlow,       cta: 'Continue' },
  { id: 'perm-photos', Body: window.StepPermPhotos, cta: 'Allow photo access', secondary: 'Not now',
    alert: { title: '“MusicPromo” Would Like to Access Your Photos', msg: 'This lets you pick a photo for your promo.', allow: 'Allow Access to All Photos' } },
  { id: 'perm-audio',  Body: window.StepPermAudio,  cta: 'Allow audio access', secondary: 'Not now',
    alert: { title: '“MusicPromo” Would Like to Access Apple Music', msg: 'This lets you pick a track for your promo.', allow: 'Allow Access' } },
  { id: 'profile',     Body: window.StepProfile,    cta: 'Continue', secondary: 'Skip for now',
    disabled: p => !(p.name && p.name.trim()) },
  { id: 'ready',       Body: window.StepReady,      cta: 'Make my first promo' },
];
const STEP_LABELS = ['Value', 'Flow', 'Photo access', 'Audio access', 'Artist card', 'Ready'];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "ctaColor": "#11131A",
  "progress": "counter",
  "showSkip": true,
  "jump": "— live —"
}/*EDITMODE-END*/;

// ---- header progress ------------------------------------------------------
function Progress({ index, total, style }) {
  if (style === 'counter') {
    return (
      <div style={{
        fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
        color: 'var(--fg)', letterSpacing: '0.02em',
      }}>
        {index + 1}<span style={{ color: 'var(--fg-secondary)', fontWeight: 500 }}> of {total}</span>
      </div>
    );
  }
  if (style === 'bar') {
    return (
      <div style={{ width: 132, height: 4, borderRadius: 999, background: 'var(--surface-muted)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${((index + 1) / total) * 100}%`, background: 'var(--fg)',
          borderRadius: 999, transition: 'width 300ms cubic-bezier(0.33,0,0.2,1)',
        }} />
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 5, width: i === index ? 18 : 5, borderRadius: 999,
          background: i === index ? 'var(--fg)' : 'rgba(17,19,26,0.22)',
          transition: 'width 260ms cubic-bezier(0.33,0,0.2,1), background 260ms ease',
        }} />
      ))}
    </div>
  );
}

// ---- faux iOS permission alert -------------------------------------------
function PermAlert({ data, onAllow, onDeny }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'rgba(0,0,0,0.28)', padding: 24,
      animation: 'mp-fade 180ms ease',
    }}>
      <div style={{
        width: 272, background: 'rgba(248,248,248,0.94)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)', borderRadius: 14, overflow: 'hidden', textAlign: 'center',
        animation: 'mp-pop 220ms cubic-bezier(0.2,0.9,0.3,1.1)',
      }}>
        <div style={{ padding: '19px 16px 16px' }}>
          <div style={{ fontFamily: '-apple-system, var(--font-ui)', fontSize: 17, fontWeight: 600, color: '#000', lineHeight: '22px' }}>{data.title}</div>
          <div style={{ fontFamily: '-apple-system, var(--font-ui)', fontSize: 13, color: '#000', lineHeight: '18px', marginTop: 4 }}>{data.msg}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <button onClick={onDeny} style={alertBtn(false)}>Don't Allow</button>
          <button onClick={onAllow} style={alertBtn(true)}>{data.allow}</button>
        </div>
      </div>
    </div>
  );
}
function alertBtn(bold) {
  return {
    borderTop: '0.5px solid rgba(60,60,67,0.29)', borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
    background: 'transparent', height: 44, cursor: 'pointer',
    fontFamily: '-apple-system, var(--font-ui)', fontSize: 17, color: '#0A84FF', fontWeight: bold ? 600 : 400,
  };
}

// ---- finish overlay -------------------------------------------------------
function FinishOverlay() {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 90, background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
      animation: 'mp-fade 220ms ease',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', background: 'var(--fg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'mp-pop 320ms cubic-bezier(0.2,0.9,0.3,1.1)',
      }}>
        <Icon name="Check" size={34} color="var(--bg)" strokeWidth={2.5} />
      </div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, color: 'var(--fg-secondary)' }}>Opening MusicPromo…</div>
    </div>
  );
}

// ---- main -----------------------------------------------------------------
function Onboarding() {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const saved = (() => { try { return JSON.parse(localStorage.getItem('mp_onb') || '{}'); } catch (e) { return {}; } })();
  const [step, setStep] = useState(saved.step || 0);
  const [dir, setDir] = useState(1);
  const [alert, setAlert] = useState(null);
  const [finished, setFinished] = useState(false);
  const [profile, setProfile] = useState(saved.profile || { name: '', bio: '', handles: {}, photo: false, banner: false });

  // tweak-driven jump (review aid)
  useEffect(() => {
    if (t.jump && t.jump !== '— live —') {
      const idx = STEP_LABELS.indexOf(t.jump);
      if (idx >= 0 && idx !== step) { setDir(idx > step ? 1 : -1); setStep(idx); }
    }
  }, [t.jump]);

  useEffect(() => {
    localStorage.setItem('mp_onb', JSON.stringify({ step, profile }));
  }, [step, profile]);

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const ctaDisabled = typeof cur.disabled === 'function' ? cur.disabled(profile) : false;
  const go = (next) => { setDir(next > step ? 1 : -1); setStep(Math.max(0, Math.min(STEPS.length - 1, next))); };
  const setProfileField = (patch) => setProfile(p => ({ ...p, ...patch }));

  const primary = () => {
    if (cur.alert) { setAlert(cur.alert); return; }
    if (isLast) { finish(); return; }
    go(step + 1);
  };
  const finish = () => {
    setFinished(true);
    setTimeout(() => { setFinished(false); localStorage.removeItem('mp_onb'); setProfile({ name: '', bio: '', handles: {}, photo: false, banner: false }); setDir(-1); setStep(0); }, 1700);
  };
  const skip = () => go(STEPS.length - 1);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      {/* header */}
      <div style={{
        paddingTop: 56, paddingBottom: 8, flexShrink: 0,
        display: 'grid', gridTemplateColumns: '40px 1fr 40px', alignItems: 'center',
        padding: '56px 16px 8px', columnGap: 8,
      }}>
        <div style={{ justifySelf: 'start' }}>
          {step > 0 && !finished ? (
            <button onClick={() => go(step - 1)} className="press" style={iconBtn}>
              <Icon name="ChevronLeft" size={22} color="var(--fg)" strokeWidth={2.25} />
            </button>
          ) : <div style={{ width: 36 }} />}
        </div>
        <div style={{ justifySelf: 'center' }}>
          <Progress index={step} total={STEPS.length} style={t.progress} />
        </div>
        <div style={{ justifySelf: 'end' }}>
          {t.showSkip && !isLast && !finished ? (
            <button onClick={skip} style={{
              border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px 2px',
              fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--fg-secondary)',
            }}>Skip</button>
          ) : <div style={{ width: 36 }} />}
        </div>
      </div>

      {/* scrolling body, animated per step */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
        <div key={step} style={{
          minHeight: '100%', paddingBottom: 12,
          animation: `mp-${dir > 0 ? 'in-right' : 'in-left'} 300ms cubic-bezier(0.32,0.08,0.24,1)`,
        }}>
          <cur.Body s={profile} set={setProfileField} t={t} />
        </div>
      </div>

      {/* sticky footer CTA */}
      <div style={{
        flexShrink: 0, padding: '12px 24px calc(24px + env(safe-area-inset-bottom))',
        background: 'linear-gradient(to top, var(--bg) 72%, rgba(251,250,247,0))',
      }}>
        {cur.secondary && (
          <button onClick={() => go(step + 1)} style={{
            display: 'block', width: '100%', border: 'none', background: 'transparent', cursor: 'pointer',
            padding: '4px 0 12px', fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--fg-secondary)',
          }}>{cur.secondary}</button>
        )}
        <button onClick={primary} disabled={ctaDisabled} className="press" style={{
          width: '100%', height: 54, borderRadius: 'var(--radius-md)', border: 'none',
          cursor: ctaDisabled ? 'not-allowed' : 'pointer', opacity: ctaDisabled ? 0.32 : 1,
          background: t.ctaColor, color: '#fff',
          fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {cur.cta}
          {isLast && <Icon name="ArrowRight" size={18} color="#fff" strokeWidth={2.25} />}
        </button>
      </div>

      {alert && (
        <PermAlert data={alert}
          onAllow={() => { setAlert(null); go(step + 1); }}
          onDeny={() => { setAlert(null); go(step + 1); }} />
      )}
      {finished && <FinishOverlay />}

      <TweaksPanel>
        <TweakSection label="Primary CTA" />
        <TweakColor label="Fill" value={t.ctaColor} options={['#11131A', '#3A5DFF']}
          onChange={v => setTweak('ctaColor', v)} />
        <TweakSection label="Header" />
        <TweakRadio label="Progress" value={t.progress} options={['counter', 'dots', 'bar']}
          onChange={v => setTweak('progress', v)} />
        <TweakToggle label="Show Skip" value={t.showSkip} onChange={v => setTweak('showSkip', v)} />
        <TweakSection label="Review" />
        <TweakSelect label="Jump to step" value={t.jump} options={['— live —', ...STEP_LABELS]}
          onChange={v => setTweak('jump', v)} />
      </TweaksPanel>
    </div>
  );
}

const iconBtn = {
  width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--surface)',
  boxShadow: '0 0 0 1px var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

window.Onboarding = Onboarding;
