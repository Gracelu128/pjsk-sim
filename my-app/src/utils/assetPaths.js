// Returns true if s looks like "file.ext"
const hasExt = (s) => typeof s === "string" && /\.[a-z0-9]{2,5}$/i.test(s);

// Join with slashes (no double slashes)
const join = (...parts) => parts.filter(Boolean).join("/").replace(/\/+/g, "/");

// Builders return null when there's no valid filename
export const logoPath = (id, entry) => {
  const p = entry?.logo;                 // e.g., "logo/logo.webp"
  return hasExt(p) ? join("/gacha", `gacha_${id}`, p) : null;
};

// NEW: normalize a single path coming out of manifest.bg
const normalizeBgFile = (f) => {
  if (!hasExt(f)) return null;
  const s = String(f);

  // absolute or remote → pass through
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/")) return s;

  // card paths sometimes appear as "cards/123/..." (no leading slash)
  if (s.startsWith("cards/") || s.includes("/cards/")) return "/" + s;

  // otherwise it's a plain filename that lives under the gacha texture folder
  return s;
};

// UPDATED: bgPath now respects card/absolute paths for gacha 1-377
export const bgPath = (id, entry, idx = 0) => {
  const raw = entry?.bg?.[idx];
  const norm = normalizeBgFile(raw);
  if (!norm) return null;

  // if it's a card/absolute path, return it
  if (norm.startsWith("/") || norm.startsWith("http")) return norm;

  // else treat as a texture filename
  return join("/gacha", `gacha_${id}`, "screen/texture", norm);
};

export const overlayPath = (id, entry, idx = 0) => {
  const f = entry?.img?.[idx];
  return hasExt(f) ? join("/gacha", `gacha_${id}`, "screen/texture", f) : null;
};

export const bannerPath = (id, entry, idx = 0) => {
  const f = entry?.banner?.[idx];
  return hasExt(f) ? join("/gacha", `gacha_${id}`, "banner", f) : null;
};

export const uiPath = (filename) => (
  hasExt(filename) ? join("/UI", filename) : null
);

export const UI_FILES = {
  single_pull_button: "1_pull.webp",
  ten_pull_button: "10_pull.webp",
  paid_single_pull_button: "paid_1_pull.webp",
  paid_ten_pull_button: "paid_10_pull.webp",
  character_details_button: "character_details.webp",
  crystal_bar_button: "crystal_bar.webp",
  exchange_button: "exchange.webp",
  fake_date_bar: "fake_date_bar.webp",
  real_date_bar: "real_date_bar.webp",
  fake_gacha_sticker_bar_normal: "fake_gacha_sticker_bar_normal.webp",
  fake_gacha_sticker_bar_limited: "fake_gacha_sticker_bar_limited.webp",
  gacha_details_button: "gacha_details.webp",
  quote_bar: "quote_bar.webp",
  return_button: "return.webp",
  settings_button: "settings.webp",
  tabs_panel: "tabs_panel.webp",
  token_bar_birthday: "token_bar_birthday.webp",
  token_bar_normal: "token_bar_normal.webp",
  token_bar_limited: "token_bar_limited.webp",
};