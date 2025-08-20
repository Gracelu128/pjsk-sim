// Returns true if s looks like "file.ext"
const hasExt = (s) => typeof s === "string" && /\.[a-z0-9]{2,5}$/i.test(s);

// Join with slashes (no double slashes)
const join = (...parts) => parts.filter(Boolean).join("/").replace(/\/+/g, "/");

// Builders return null when there's no valid filename
export const logoPath = (id, entry) => {
  const p = entry?.logo;                 // e.g., "logo/logo.webp"
  return hasExt(p) ? join("/gacha", `gacha_${id}`, p) : null;
};

export const bgPath = (id, entry, idx = 0) => {
  const f = entry?.bg?.[idx];            // e.g., "bg_gacha546.webp"
  return hasExt(f) ? join("/gacha", `gacha_${id}`, "screen/texture", f) : null;
};

export const overlayPath = (id, entry, idx = 0) => {
  const f = entry?.img?.[idx];
  return hasExt(f) ? join("/gacha", `gacha_${id}`, "screen/texture", f) : null;
};

export const bannerPath = (id, entry, idx = 0) => {
  const f = entry?.banner?.[idx];
  return hasExt(f) ? join("/gacha", `gacha_${id}`, "banner", f) : null;
};
