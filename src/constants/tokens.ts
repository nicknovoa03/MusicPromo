export const colors = {
  light: {
    background: "#FFFFFF",
    surface: "#F5F5F5",
    surfaceMuted: "#EEEEEE",
    text: "#000000",
    textSecondary: "#4A4A4A",
    border: "#D6D6D6",
  },
  dark: {
    background: "#000000",
    surface: "#111111",
    surfaceMuted: "#1A1A1A",
    text: "#FFFFFF",
    textSecondary: "#B3B3B3",
    border: "#2A2A2A",
  },
  accent: {
    primary: "#FFFFFF",
    primaryMuted: "#E8E8E8",
    fab: "#000000",
    fabIcon: "#FFFFFF",
    onPrimary: "#000000",
    success: "#FFFFFF",
    error: "#FFFFFF",
    warning: "#FFFFFF",
  },
  overlay: {
    light: "rgba(255,255,255,0.82)",
    lightStrong: "rgba(255,255,255,0.92)",
    darkSoft: "rgba(0,0,0,0.26)",
    dark: "rgba(0,0,0,0.62)",
  },
  brand: {
    tintSoft: "rgba(255,255,255,0.07)",
    tint: "rgba(255,255,255,0.12)",
    tintStrong: "rgba(255,255,255,0.18)",
  },
  instagram: {
    start: "#F58529",
    mid: "#DD2A7B",
    end: "#8134AF",
  },
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: "700" as const },
  h2: { fontSize: 22, fontWeight: "600" as const },
  body: { fontSize: 16, fontWeight: "400" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
  button: { fontSize: 17, fontWeight: "600" as const },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  full: 9999,
} as const;
