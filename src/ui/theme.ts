export const THEME = {
  primary: "#06b6d4",
  primaryLight: "#22d3ee",
  secondary: "#f59e0b",
  secondaryLight: "#fbbf24",
  success: "#10b981",
  successLight: "#34d399",
  error: "#ef4444",
  errorLight: "#f87171",
  warning: "#eab308",
  warningLight: "#facc15",
  info: "#3b82f6",
  infoLight: "#60a5fa",
  purple: "#8b5cf6",
  pink: "#ec4899",
  text: "#f1f5f9",
  textDim: "#94a3b8",
  muted: "#64748b",
  mutedDim: "#475569",
  bg: "#000000",
  bgDark: "#0a0a0a",
  bgSecondary: "#0c0c0c",
  border: "#1e293b",
  borderLight: "#334155",
  borderDim: "#0f172a",
  highlight: "#1e293b",
  highlightSecondary: "#0f172a",
} as const;

// Extended gradient colors for decorative elements
export const GRADIENTS = {
  cyan: ["#0891b2", "#06b6d4", "#22d3ee", "#67e8f9"],
  sunset: ["#be123c", "#e11d48", "#f43f5e", "#fb7185"],
  ocean: ["#0369a1", "#0284c7", "#0ea5e9", "#38bdf8"],
  forest: ["#047857", "#059669", "#10b981", "#34d399"],
} as const;

// Combined palette for multi-gradient cycling effects (cyan + ocean only)
export const ALL_GRADIENTS = [
  ...GRADIENTS.cyan,
  ...GRADIENTS.ocean,
] as const;

// Border style presets
export const BORDER_STYLES = {
  none: undefined,
  single: "single" as const,
  double: "double" as const,
  round: "round" as const,
  bold: "bold" as const,
  dashed: undefined, // Ink doesn't have dashed, but placeholder for future
} as const;
