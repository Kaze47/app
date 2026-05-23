// Theme tokens (Performance Pro / Tactical Minimalism)
export const colors = {
  bg: "#0A0A0A",
  bgSecondary: "#141414",
  overlay: "rgba(10,10,10,0.85)",
  text: "#FFFFFF",
  textSecondary: "#A1A1AA",
  textMuted: "#52525B",
  voltBlue: "#007AFF",
  blaze: "#FF3B30",
  success: "#34C759",
  border: "#27272A",
  borderFocus: "#007AFF",
};

export const radii = {
  sm: 4,
  md: 8,
  lg: 16,
  pill: 9999,
};

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const SPORTS = [
  "Basketball",
  "Soccer",
  "Tennis",
  "Volleyball",
  "Cricket",
  "Badminton",
  "Running",
  "Cycling",
  "Esports",
  "Valorant",
  "League of Legends",
  "FIFA",
  "CS2",
  "Rocket League",
];

export const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "Pro"];

export function isGamingSport(sport?: string | null) {
  if (!sport) return false;
  const gaming = ["Esports", "Valorant", "League of Legends", "FIFA", "CS2", "Rocket League"];
  return gaming.includes(sport);
}
