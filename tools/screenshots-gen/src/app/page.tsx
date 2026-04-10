"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toPng } from "html-to-image";

// ─── Canvas dimensions (design at largest iPhone size) ───────────────────────
const W = 1320;
const H = 2868;

// ─── Export sizes ─────────────────────────────────────────────────────────────
const SIZES = [
  { label: '6.9"', w: 1320, h: 2868 },
  { label: '6.5"', w: 1284, h: 2778 },
  { label: '6.3"', w: 1206, h: 2622 },
  { label: '6.1"', w: 1125, h: 2436 },
] as const;

// ─── Phone mockup measurements ────────────────────────────────────────────────
const MK_W = 1022;
const MK_H = 2082;
const SC_L = (52 / MK_W) * 100;
const SC_T = (46 / MK_H) * 100;
const SC_W = (918 / MK_W) * 100;
const SC_H = (1990 / MK_H) * 100;
const SC_RX = (126 / 918) * 100;
const SC_RY = (126 / 1990) * 100;

// ─── Image paths ──────────────────────────────────────────────────────────────
const IMAGE_PATHS = [
  "/mockup.png",
  "/app-icon.png",
  "/screenshots/projects.png",
  "/screenshots/select-media.png",
  "/screenshots/editor.png",
  "/screenshots/template-controls.png",
  "/screenshots/profile.png",
  "/screenshots/share-card.png",
];

const imageCache: Record<string, string> = {};

async function preloadAllImages() {
  await Promise.all(
    IMAGE_PATHS.map(async (path) => {
      const resp = await fetch(path);
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      imageCache[path] = dataUrl;
    })
  );
}

function img(path: string): string {
  return imageCache[path] || path;
}

// ─── Phone component ──────────────────────────────────────────────────────────
function Phone({
  src,
  alt,
  style,
  className = "",
}: {
  src: string;
  alt: string;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={`relative ${className}`}
      style={{ aspectRatio: `${MK_W}/${MK_H}`, ...style }}
    >
      <img
        src={img("/mockup.png")}
        alt=""
        style={{ display: "block", width: "100%", height: "100%" }}
        draggable={false}
      />
      <div
        className="absolute z-10 overflow-hidden"
        style={{
          left: `${SC_L}%`,
          top: `${SC_T}%`,
          width: `${SC_W}%`,
          height: `${SC_H}%`,
          borderRadius: `${SC_RX}% / ${SC_RY}%`,
        }}
      >
        <img
          src={img(src)}
          alt={alt}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top",
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}

// ─── Caption component ────────────────────────────────────────────────────────
function Caption({
  label,
  headline,
  sub,
  light = false,
  align = "center",
}: {
  label: string;
  headline: string;
  sub?: string;
  light?: boolean;
  align?: "center" | "left";
}) {
  const textColor = light ? "#000000" : "#FFFFFF";
  const mutedColor = light ? "#555555" : "#888888";

  return (
    <div style={{ textAlign: align }}>
      <div
        style={{
          fontSize: W * 0.028,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase" as const,
          color: mutedColor,
          marginBottom: W * 0.02,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: W * 0.092,
          fontWeight: 700,
          lineHeight: 0.95,
          color: textColor,
          fontFamily: "Inter, sans-serif",
          whiteSpace: "pre-line" as const,
        }}
        dangerouslySetInnerHTML={{ __html: headline }}
      />
      {sub && (
        <div
          style={{
            fontSize: W * 0.038,
            fontWeight: 400,
            color: mutedColor,
            marginTop: W * 0.025,
            lineHeight: 1.4,
            fontFamily: "Inter, sans-serif",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Glow decoration ──────────────────────────────────────────────────────────
function Glow({
  color,
  size,
  top,
  left,
  opacity = 0.25,
}: {
  color: string;
  size: number;
  top: string;
  left: string;
  opacity?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        filter: `blur(${size * 0.4}px)`,
        top,
        left,
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}

// ─── Slide 1: Hero – Projects feed ───────────────────────────────────────────
function Slide1() {
  return (
    <div
      style={{
        width: W,
        height: H,
        background: "#000000",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Background glows */}
      <Glow color="#6B21A8" size={900} top="-10%" left="-20%" opacity={0.3} />
      <Glow color="#1d4ed8" size={700} top="20%" left="50%" opacity={0.18} />

      {/* Top caption */}
      <div
        style={{
          position: "absolute",
          top: H * 0.08,
          left: W * 0.1,
          right: W * 0.1,
        }}
      >
        <Caption
          label="MusicPromo"
          headline={"Your music,\nalways\npromo-ready"}
        />
      </div>

      {/* App icon */}
      <div
        style={{
          position: "absolute",
          top: H * 0.07,
          right: W * 0.08,
          width: W * 0.13,
          height: W * 0.13,
          borderRadius: W * 0.03,
          overflow: "hidden",
        }}
      >
        <img
          src={img("/app-icon.png")}
          alt="MusicPromo icon"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          draggable={false}
        />
      </div>

      {/* Phone – centered, overflowing bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%) translateY(8%)",
          width: W * 0.84,
        }}
      >
        <Phone src="/screenshots/projects.png" alt="Projects screen" />
      </div>
    </div>
  );
}

// ─── Slide 2: Select Media ────────────────────────────────────────────────────
function Slide2() {
  return (
    <div
      style={{
        width: W,
        height: H,
        background: "#0a0a0a",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <Glow color="#7c3aed" size={600} top="5%" left="60%" opacity={0.2} />
      <Glow color="#0369a1" size={500} top="55%" left="-10%" opacity={0.15} />

      {/* Caption – top, centered */}
      <div
        style={{
          position: "absolute",
          top: H * 0.07,
          left: W * 0.1,
          right: W * 0.1,
          textAlign: "center",
        }}
      >
        <Caption
          label="Step 1"
          headline={"Pick a song\n& a photo"}
          sub={"MP3, WAV, M4A · Any photo\nfrom your library"}
          align="center"
        />
      </div>

      {/* Phone – starts below caption, centered, overflows bottom */}
      <div
        style={{
          position: "absolute",
          top: H * 0.27,
          left: "50%",
          transform: "translateX(-50%)",
          width: W * 0.82,
        }}
      >
        <Phone src="/screenshots/select-media.png" alt="Select media screen" />
      </div>
    </div>
  );
}

// ─── Slide 3: Editor – vinyl animation (CONTRAST slide) ──────────────────────
function Slide3() {
  return (
    <div
      style={{
        width: W,
        height: H,
        background: "linear-gradient(160deg, #1a0533 0%, #0f0020 40%, #000000 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <Glow color="#c026d3" size={900} top="-5%" left="10%" opacity={0.22} />
      <Glow color="#7c3aed" size={600} top="40%" left="60%" opacity={0.2} />

      {/* Caption top */}
      <div
        style={{
          position: "absolute",
          top: H * 0.07,
          left: W * 0.1,
          right: W * 0.1,
          textAlign: "center",
        }}
      >
        <Caption
          label="Create"
          headline={"Studio-quality\nin seconds"}
        />
      </div>

      {/* Phone – centered */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%) translateY(10%)",
          width: W * 0.82,
        }}
      >
        <Phone src="/screenshots/editor.png" alt="Editor screen" />
      </div>
    </div>
  );
}

// ─── Slide 4: Template Controls ───────────────────────────────────────────────
function Slide4() {
  return (
    <div
      style={{
        width: W,
        height: H,
        background: "#050505",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <Glow color="#1e40af" size={700} top="0%" left="40%" opacity={0.18} />
      <Glow color="#6d28d9" size={500} top="50%" left="-5%" opacity={0.15} />

      {/* Two phones layered */}
      {/* Back phone */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "-6%",
          width: W * 0.66,
          transform: "translateY(8%) rotate(-4deg)",
          opacity: 0.5,
        }}
      >
        <Phone src="/screenshots/editor.png" alt="Editor preview" />
      </div>

      {/* Front phone */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: "-4%",
          width: W * 0.82,
          transform: "translateY(6%)",
        }}
      >
        <Phone
          src="/screenshots/template-controls.png"
          alt="Template controls"
        />
      </div>

      {/* Caption top */}
      <div
        style={{
          position: "absolute",
          top: H * 0.07,
          left: W * 0.08,
          right: W * 0.08,
        }}
      >
        <Caption
          label="Customize"
          headline={"Make it\nyours"}
          sub={"Layout · Style · Motion\nBackdrop · Media"}
        />
      </div>
    </div>
  );
}

// ─── Slide 5: Profile ─────────────────────────────────────────────────────────
function Slide5() {
  return (
    <div
      style={{
        width: W,
        height: H,
        background: "#000000",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <Glow color="#065f46" size={700} top="0%" left="30%" opacity={0.2} />
      <Glow color="#1e3a5f" size={500} top="55%" left="60%" opacity={0.15} />

      {/* Caption – top, centered */}
      <div
        style={{
          position: "absolute",
          top: H * 0.07,
          left: W * 0.1,
          right: W * 0.1,
          textAlign: "center",
        }}
      >
        <Caption
          label="Your Profile"
          headline={"Artist profile,\nbuilt in"}
          sub={"Link Spotify, Instagram,\nTikTok & more"}
          align="center"
        />
      </div>

      {/* Phone – starts below caption, centered, overflows bottom */}
      <div
        style={{
          position: "absolute",
          top: H * 0.27,
          left: "50%",
          transform: "translateX(-50%)",
          width: W * 0.82,
        }}
      >
        <Phone src="/screenshots/profile.png" alt="Profile screen" />
      </div>
    </div>
  );
}

// ─── Slide 6: Share card ──────────────────────────────────────────────────────
function Slide6() {
  return (
    <div
      style={{
        width: W,
        height: H,
        background: "linear-gradient(180deg, #0a0a0a 0%, #000000 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <Glow color="#f59e0b" size={600} top="-5%" left="50%" opacity={0.12} />
      <Glow color="#ec4899" size={700} top="30%" left="-10%" opacity={0.12} />
      <Glow color="#8b5cf6" size={600} top="20%" left="70%" opacity={0.14} />

      {/* Caption */}
      <div
        style={{
          position: "absolute",
          top: H * 0.07,
          left: W * 0.1,
          right: W * 0.1,
          textAlign: "center",
        }}
      >
        <Caption
          label="Share"
          headline={"Share your\nsound\nanywhere"}
          sub={"Instagram · TikTok · Camera Roll"}
        />
      </div>

      {/* Phone – centered, slightly smaller to show card design */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%) translateY(9%)",
          width: W * 0.8,
        }}
      >
        <Phone src="/screenshots/share-card.png" alt="Share card" />
      </div>
    </div>
  );
}

// ─── Slide 7: Beta CTA – early access email signup ───────────────────────────
function Slide7() {
  return (
    <div
      style={{
        width: W,
        height: H,
        background: "linear-gradient(160deg, #0d0800 0%, #050300 50%, #000000 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Warm amber glows */}
      <Glow color="#d97706" size={900} top="-8%" left="10%" opacity={0.18} />
      <Glow color="#b45309" size={700} top="35%" left="55%" opacity={0.12} />
      <Glow color="#92400e" size={1000} top="65%" left="-15%" opacity={0.14} />

      {/* Subtle dot grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: `${W * 0.07}px ${W * 0.07}px`,
        }}
      />

      {/* Beta badge */}
      <div
        style={{
          position: "absolute",
          top: H * 0.09,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: W * 0.018,
          backgroundColor: "rgba(217,119,6,0.14)",
          border: "1.5px solid rgba(217,119,6,0.38)",
          borderRadius: W * 0.05,
          padding: `${H * 0.013}px ${W * 0.055}px`,
          whiteSpace: "nowrap",
        }}
      >
        {/* Pulsing dot */}
        <div
          style={{
            width: W * 0.022,
            height: W * 0.022,
            borderRadius: "50%",
            backgroundColor: "#d97706",
            boxShadow: `0 0 ${W * 0.018}px ${W * 0.01}px rgba(217,119,6,0.65)`,
          }}
        />
        <span
          style={{
            fontSize: W * 0.03,
            fontWeight: 700,
            color: "#d97706",
            letterSpacing: "0.13em",
            textTransform: "uppercase" as const,
          }}
        >
          Early Access
        </span>
      </div>

      {/* Main headline */}
      <div
        style={{
          position: "absolute",
          top: H * 0.2,
          left: W * 0.08,
          right: W * 0.08,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: W * 0.118,
            fontWeight: 800,
            lineHeight: 0.88,
            color: "#FFFFFF",
            letterSpacing: "-0.025em",
            whiteSpace: "pre-line" as const,
          }}
        >
          {"Be first\nto shape it"}
        </div>
        <div
          style={{
            fontSize: W * 0.043,
            fontWeight: 400,
            color: "rgba(255,255,255,0.42)",
            marginTop: H * 0.032,
            lineHeight: 1.45,
          }}
        >
          {"Join the beta. Help build the app\nmusicians actually want."}
        </div>
      </div>

      {/* Mock email form */}
      <div
        style={{
          position: "absolute",
          top: H * 0.53,
          left: W * 0.08,
          right: W * 0.08,
        }}
      >
        {/* Email input */}
        <div
          style={{
            height: H * 0.085,
            borderRadius: W * 0.038,
            border: "1.5px solid rgba(217,119,6,0.35)",
            backgroundColor: "rgba(255,255,255,0.04)",
            display: "flex",
            alignItems: "center",
            paddingLeft: W * 0.058,
            marginBottom: H * 0.022,
          }}
        >
          <span
            style={{
              fontSize: W * 0.042,
              color: "rgba(255,255,255,0.22)",
              fontWeight: 400,
            }}
          >
            your@email.com
          </span>
        </div>

        {/* CTA button */}
        <div
          style={{
            height: H * 0.085,
            borderRadius: W * 0.038,
            background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 ${H * 0.018}px ${H * 0.038}px rgba(217,119,6,0.38)`,
          }}
        >
          <span
            style={{
              fontSize: W * 0.05,
              fontWeight: 700,
              color: "#FFFFFF",
              letterSpacing: "0.005em",
            }}
          >
            Request Beta Access
          </span>
        </div>

        {/* Fine print */}
        <div style={{ textAlign: "center", marginTop: H * 0.022 }}>
          <span
            style={{
              fontSize: W * 0.03,
              color: "rgba(255,255,255,0.18)",
              fontWeight: 400,
            }}
          >
            Limited spots · No spam · Unsubscribe anytime
          </span>
        </div>
      </div>

      {/* Bottom wordmark */}
      <div
        style={{
          position: "absolute",
          bottom: H * 0.065,
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            fontSize: W * 0.034,
            fontWeight: 600,
            color: "rgba(255,255,255,0.14)",
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
          }}
        >
          MusicPromo
        </span>
      </div>
    </div>
  );
}

// ─── Slide registry ───────────────────────────────────────────────────────────
const SLIDES = [
  { id: "slide-1", label: "01 · Hero", Component: Slide1 },
  { id: "slide-2", label: "02 · Pick Media", Component: Slide2 },
  { id: "slide-3", label: "03 · Editor", Component: Slide3 },
  { id: "slide-4", label: "04 · Customize", Component: Slide4 },
  { id: "slide-5", label: "05 · Profile", Component: Slide5 },
  { id: "slide-6", label: "06 · Share", Component: Slide6 },
  { id: "slide-7", label: "07 · Beta CTA", Component: Slide7 },
];

// ─── Preview card ─────────────────────────────────────────────────────────────
function PreviewCard({
  slide,
  sizeIndex,
  onExportRef,
}: {
  slide: (typeof SLIDES)[number];
  sizeIndex: number;
  onExportRef: (el: HTMLDivElement | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setScale(el.clientWidth / W);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { Component } = slide;

  return (
    <div ref={containerRef} style={{ width: "100%", aspectRatio: `${W}/${H}`, overflow: "hidden", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: W,
          height: H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <Component />
      </div>
      {/* Offscreen export target */}
      <div
        ref={onExportRef}
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: SIZES[sizeIndex].w,
          height: SIZES[sizeIndex].h,
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            width: W,
            height: H,
            transform: `scale(${SIZES[sizeIndex].w / W})`,
            transformOrigin: "top left",
          }}
        >
          <Component />
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ScreenshotsPage() {
  const [ready, setReady] = useState(false);
  const [sizeIndex, setSizeIndex] = useState(0);
  const [exporting, setExporting] = useState<string | null>(null);

  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    preloadAllImages().then(() => setReady(true));
  }, []);

  const exportSlide = useCallback(
    async (index: number) => {
      const el = exportRefs.current[index];
      if (!el) return;
      const size = SIZES[sizeIndex];
      setExporting(SLIDES[index].label);

      el.style.left = "0px";
      el.style.opacity = "1";
      el.style.zIndex = "-1";

      try {
        const opts = {
          width: size.w,
          height: size.h,
          pixelRatio: 1,
          cacheBust: true,
        };
        await toPng(el, opts); // warm up
        const dataUrl = await toPng(el, opts);

        const a = document.createElement("a");
        const idx = String(index + 1).padStart(2, "0");
        a.download = `${idx}-${SLIDES[index].id}-${size.w}x${size.h}.png`;
        a.href = dataUrl;
        a.click();
      } finally {
        el.style.left = "-9999px";
        el.style.opacity = "";
        el.style.zIndex = "";
        setExporting(null);
      }
    },
    [sizeIndex]
  );

  const exportAll = useCallback(async () => {
    for (let i = 0; i < SLIDES.length; i++) {
      await exportSlide(i);
      await new Promise((r) => setTimeout(r, 350));
    }
  }, [exportSlide]);

  if (!ready) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#888",
          fontFamily: "Inter, sans-serif",
          fontSize: 16,
        }}
      >
        Loading images…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "Inter, sans-serif" }}>
      {/* Toolbar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "#111",
          borderBottom: "1px solid #222",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap" as const,
        }}
      >
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginRight: 8 }}>
          MusicPromo · Screenshots
        </span>

        {/* Size selector */}
        <div style={{ display: "flex", gap: 6 }}>
          {SIZES.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setSizeIndex(i)}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                border: "1px solid",
                borderColor: sizeIndex === i ? "#fff" : "#333",
                background: sizeIndex === i ? "#fff" : "transparent",
                color: sizeIndex === i ? "#000" : "#888",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <button
            onClick={exportAll}
            disabled={!!exporting}
            style={{
              padding: "6px 18px",
              borderRadius: 6,
              background: exporting ? "#333" : "#fff",
              color: exporting ? "#666" : "#000",
              fontWeight: 700,
              fontSize: 13,
              border: "none",
              cursor: exporting ? "not-allowed" : "pointer",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {exporting ? `Exporting ${exporting}…` : "Export All"}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 24,
          padding: 24,
        }}
      >
        {SLIDES.map((slide, i) => (
          <div key={slide.id}>
            <div
              style={{
                borderRadius: 12,
                overflow: "hidden",
                background: "#111",
                border: "1px solid #222",
                position: "relative",
              }}
            >
              <PreviewCard
                slide={slide}
                sizeIndex={sizeIndex}
                onExportRef={(el) => { exportRefs.current[i] = el; }}
              />
              {/* Export hover overlay */}
              <button
                onClick={() => exportSlide(i)}
                disabled={!!exporting}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.55)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0,
                  transition: "opacity 0.15s",
                  cursor: "pointer",
                  border: "none",
                  fontFamily: "Inter, sans-serif",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.opacity = "0";
                }}
              >
                <span
                  style={{
                    background: "#fff",
                    color: "#000",
                    fontWeight: 700,
                    fontSize: 14,
                    padding: "8px 20px",
                    borderRadius: 8,
                  }}
                >
                  Export PNG
                </span>
              </button>
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#666",
                fontSize: 12,
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              {slide.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
