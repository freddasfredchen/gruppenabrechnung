export const SK_SESSION = "vapp_session";

export const APP_PW_HASH   = "f0e4c2f76c58916ec258f246851bea091d14d4247a2fc3e18694461b1816e13b";
export const LIST_ADM_HASH = "f0e4c2f76c58916ec258f246851bea091d14d4247a2fc3e18694461b1816e13b";
export const VORSTAND_HASH = "4e88ad68f7544c6222016bf1a55fca46e081c7d0bece9767613b017143ddc2d5";

export const BRAND         = "var(--brand)";
export const BRAND_LT      = "var(--brand-lt)";
export const SILVER        = "#B0AEA8";
export const COLORS_AVATAR = ["#7F77DD","#1D9E75","#D85A30","#378ADD","#D4537E","#BA7517","#639922","#E24B4A"];
export const GROUP_ICONS   = ["♟","⚽","🎲","🍕","✈️","🎮","🏋️","🎵","🎯","💼"];
export const GROUP_COLORS  = [BRAND, BRAND_LT, "#1D6B8C","#1D9E75","#7F77DD","#BA7517"];

export const VORSTAND_USER = { id:"vorstand", name:"Vorstand", pwHash: VORSTAND_HASH, isVorstand: true };

export const CATEGORIES = [
  { id: "food",      label: "Essen",        icon: "🍕", color: "#E67E22" },
  { id: "transport", label: "Transport",    icon: "🚗", color: "#3498DB" },
  { id: "lodging",   label: "Unterkunft",   icon: "🏠", color: "#9B59B6" },
  { id: "activity",  label: "Aktivitäten",  icon: "🎭", color: "#1ABC9C" },
  { id: "shopping",  label: "Einkauf",      icon: "🛒", color: "#E74C3C" },
  { id: "other",     label: "Sonstiges",    icon: "📦", color: "#95A5A6" },
];

export async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
export function initials(name) { return name.trim().split(" ").map(w=>w[0]?.toUpperCase()||"").join("").slice(0,2)||"?"; }
export function fmt(n) { return n.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})+" €"; }
export function avatarColor(name) { return COLORS_AVATAR[name.charCodeAt(0)%COLORS_AVATAR.length]; }
