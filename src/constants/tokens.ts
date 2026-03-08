export const colors = {
  light: {
    background: "#FFFFFF",
    surface: "#F3FAF4",
    surfaceMuted: "#EAF5EC",
    text: "#102317",
    textSecondary: "#5D7064",
    border: "#D6E6DA",
  },
  dark: {
    background: "#000000",
    surface: "#18191C",
    surfaceMuted: "#23252A",
    text: "#F8F9FB",
    textSecondary: "#B6BBC4",
    border: "#343943",
  },
  accent: {
    primary: "#1E9C53",
    primaryMuted: "#DDF4E5",
    fab: "#000000",
    fabIcon: "#FFFFFF",
    onPrimary: "#FFFFFF",
    success: "#34C759",
    error: "#FF3B30",
    warning: "#FF9500",
  },
  overlay: {
    light: "rgba(255,255,255,0.82)",
    lightStrong: "rgba(255,255,255,0.92)",
    darkSoft: "rgba(0,0,0,0.26)",
    dark: "rgba(0,0,0,0.62)",
  },
  brand: {
    tintSoft: "rgba(30,156,83,0.07)",
    tint: "rgba(30,156,83,0.12)",
    tintStrong: "rgba(30,156,83,0.18)",
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
