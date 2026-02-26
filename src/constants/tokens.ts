export const colors = {
  light: {
    background: "#FFFFFF",
    surface: "#F5F5F5",
    text: "#1A1A1A",
    textSecondary: "#8E8E93",
    border: "#E5E5EA",
  },
  dark: {
    background: "#000000",
    surface: "#1C1C1E",
    text: "#FFFFFF",
    textSecondary: "#ABABAB",
    border: "#2C2C2E",
  },
  accent: {
    primary: "#5856D6",
    fab: "#000000",
    fabIcon: "#FFFFFF",
    success: "#34C759",
    error: "#FF3B30",
    warning: "#FF9500",
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
