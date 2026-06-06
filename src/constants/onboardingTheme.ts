/**
 * Hallmark · genre: playful · macrostructure: Step Sequence (F4) · theme: custom-tuned
 * paper: warm cream #FBFAF7 · accent: ink #11131A · display: Inter 700
 * pre-emit critique: P4 H5 E5 S5 R5 V4
 *
 * Onboarding-only palette — converge with tokens.ts later.
 */
export const onboardingTheme = {
  bg: "#FBFAF7",
  surface: "#FFFFFF",
  surfaceMuted: "#F2F0EA",
  text: "#11131A",
  textSecondary: "#6B6F7A",
  border: "rgba(17, 19, 26, 0.10)",
  borderStrong: "rgba(17, 19, 26, 0.16)",
  ctaFill: "#11131A",
  ctaOnFill: "#FFFFFF",
  accentLink: "#3A5DFF",
  accentSoft: "rgba(58, 93, 255, 0.10)",
  warning: "#FF6B6B",
  cardDark: "#0E1014",
  stripeBaseLight: "#F2F0EA",
  stripeAltLight: "#EAE7DF",
  stripeLineLight: "rgba(17, 19, 26, 0.07)",
  stripeBaseDark: "#23262F",
  stripeAltDark: "#1D2027",
  stripeLineDark: "rgba(255, 255, 255, 0.10)",
  shadow: {
    card: {
      shadowColor: "#11131A",
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 24,
      elevation: 4,
    },
    poster: {
      shadowColor: "#11131A",
      shadowOpacity: 0.2,
      shadowOffset: { width: 0, height: 18 },
      shadowRadius: 28,
      elevation: 10,
    },
    cta: {
      shadowColor: "#11131A",
      shadowOpacity: 0.14,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 14,
      elevation: 3,
    },
  },
} as const;
