export const colors = {
  background: "#ffffff",
  shell: "#fbfcfb",
  surface: "#f7f9f7",
  surfaceStrong: "#edf4f1",
  text: "#14201d",
  mutedText: "#5f6e68",
  border: "#dce6e0",
  accent: "#247b6a",
  accentDark: "#115548",
  accentSoft: "#dceee8",
  blue: "#1f4f75",
  blueSoft: "#e3edf5",
  coral: "#bf624d",
  coralSoft: "#f8e4de",
  gold: "#9b7228",
  goldSoft: "#f3ead8",
  focus: "#0f766e"
} as const;

export const radii = {
  sm: 6,
  md: 8,
  lg: 12
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 40
} as const;

export const typography = {
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  monoFamily:
    '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, ui-monospace, monospace',
  weights: {
    regular: "400",
    medium: "500",
    semibold: "650",
    bold: "750"
  }
} as const;

export const typeScale = {
  hero: 34,
  heroLarge: 38,
  title: 22,
  section: 18,
  body: 15,
  small: 13,
  label: 12
} as const;

export const shadows = {
  panel: "0 18px 60px rgba(23, 33, 29, 0.08)",
  soft: "0 10px 30px rgba(23, 33, 29, 0.06)"
} as const;
